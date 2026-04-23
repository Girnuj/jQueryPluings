/**
 * @fileoverview Plugin nativo para previsualizar videos de YouTube a partir de una URL ingresada.
 * @module VideoUrlPreview
 * @version 3.0
 * @since 2026
 * @author Samuel Montenegro
 * @license MIT
 * @copyright (c) 2026 Samuel Montenegro
 */
(function () {
	'use strict';

	// ─── Constantes ──────────────────────────────────────────────────────────────

	/**
	 * Selector declarativo de inputs para preview de video.
	 * @type {string}
	 */
	const SELECTOR_ROLE = 'input[data-role="video-preview"], input[data-video-preview-target-frame]'
		/**
		 * Defaults de configuracion de VideoUrlPreview.
		 * @type {Object}
		 */
		, VIDEO_URL_PREVIEW_DEFAULTS = Object.freeze({
			targetItemSelector: '',
		})
		/**
		 * Registro de instancias por input.
		 * @type {WeakMap<HTMLInputElement, VideoUrlPreview>}
		 */
		, INSTANCES = new WeakMap()
		/**
		 * Nodos removidos pendientes de limpieza diferida.
		 * @type {Set<Element>}
		 */
		, PENDING_REMOVALS = new Set();

	// ─── Helpers de validación ────────────────────────────────────────────────────

	/**
	 * Resuelve el iframe destino desde selector CSS.
	 * @param {string} selector Selector configurado.
	 * @returns {HTMLIFrameElement|null}
	 */
	const getTargetElement = (selector) => selector ? document.querySelector(selector) : null;

	/**
	 * Limpia src del iframe objetivo.
	 * @param {HTMLIFrameElement|null} target Iframe de preview.
	 * @returns {void}
	 */
	const clearFrame = (target) => {
		if (target) {
			target.removeAttribute('src');
		}
	};

	/**
	 * Valida selector target y construye opciones efectivas.
	 * @param {HTMLInputElement} element Input trigger.
	 * @param {Object} [options={}] Overrides por API.
	 * @returns {Object}
	 */
	const getValidatedOptions = (element, options = {}) => {
		const targetItemSelector = options.targetItemSelector || element.dataset.videoPreviewTargetFrame;

		if (!targetItemSelector) {
			throw new Error("Error: No se especificó el selector 'data-video-preview-target-frame'.");
		}

		const target = getTargetElement(targetItemSelector);
		if (!target) {
			console.warn(`Warning: No se encontró ningún elemento para el selector '${targetItemSelector}'.`);
			return { ...options, targetItemSelector };
		}

		if (target.tagName !== 'IFRAME') {
			throw new Error("Error: El selector 'data-video-preview-target-frame' no apunta a un elemento <iframe>.");
		}

		return { ...options, targetItemSelector };
	};

	/**
	 * Obtiene inputs compatibles dentro de un root.
	 * @param {ParentNode|Element|Document} [root=document] Nodo raiz.
	 * @returns {HTMLInputElement[]}
	 */
	const getSubjects = (root = document) => {
		const subjects = [];

		if (root.nodeType === 1 && root.matches(SELECTOR_ROLE)) {
			subjects.push(root);
		}

		if (typeof root.querySelectorAll === 'function') {
			subjects.push(...root.querySelectorAll(SELECTOR_ROLE));
		}

		return subjects;
	};

	// ─── Typedef ──────────────────────────────────────────────────────────────────

	/**
	 * Opciones publicas de VideoUrlPreview.
	 * @typedef {Object} VideoUrlPreviewOptions
	 * @property {string} targetItemSelector Selector del iframe destino.
	 */

	// ─── Clase Principal ───────────────────────────────────────────────────────────

	/**
	 * Clase principal del plugin VideoUrlPreview.
	 * Permite previsualizar un video de YouTube en un iframe a partir de una URL ingresada.
	 *
	 * Flujo:
	 * 1. Escucha `input`/`change` del campo de URL.
	 * 2. Extrae ID de YouTube cuando la URL es válida.
	 * 3. Actualiza `src` del iframe destino o limpia vista previa.
	 * @class VideoUrlPreview
	 */
	class VideoUrlPreview {
		/**
		 * Crea una instancia de VideoUrlPreview.
		 * @param {HTMLInputElement} element - Input de texto sobre el que se inicializa.
		 * @param {VideoUrlPreviewOptions} options - Opciones de configuración del plugin.
		 */
		constructor(element, options) {
			this.subject = element;
			this.options = { ...VIDEO_URL_PREVIEW_DEFAULTS, ...options };
			this.target = getTargetElement(this.options.targetItemSelector);
			this.isBound = false;
			this.handleInput = this.handleInput.bind(this);
			this.handleChange = this.handleChange.bind(this);
		}

		/**
		 * Extrae el ID de YouTube de una URL válida.
		 * @param {string} url - URL del video de YouTube.
		 * @returns {string|null} ID del video o null si no es válido.
		 */
		getYouTubeId(url) {
			if (!url || typeof url !== 'string') return null;
			const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/
				, match = url.match(regExp);
			return (match && match[2] && match[2].length === 11) ? match[2] : null;
		}

		/**
		 * Vincula los eventos del input.
		 * @returns {void}
		 */
		bind() {
			if (this.isBound) return;
			this.applyListeners('addEventListener');
			this.isBound = true;
			this.updatePreview(this.subject.value, true);
		}

		/**
		 * Desvincula los eventos del input.
		 * @returns {void}
		 */
		unbind() {
			if (!this.isBound) return;
			this.applyListeners('removeEventListener');
			this.isBound = false;
		}

		/**
		 * Devuelve la lista de listeners del plugin.
		 * @returns {Array<[string, Function]>}
		 */
		getListeners() {
			return [
				['input', this.handleInput],
				['change', this.handleChange]
			];
		}

		/**
		 * Aplica addEventListener/removeEventListener en lote.
		 * @param {'addEventListener'|'removeEventListener'} method - Metodo del EventTarget a ejecutar.
		 * @returns {void}
		 */
		applyListeners(method) {
			this.getListeners().forEach(([eventName, handler]) => {
				this.subject[method](eventName, handler);
			});
		}

		/**
		 * Desmonta la instancia y libera sus listeners.
		 * @param {{clearPreview?: boolean}} [options] - Configuración del desmontaje.
		 * @param {boolean} [options.clearPreview=false] - Indica si debe limpiar el iframe actual.
		 * @returns {void}
		 */
		destroy(options = {}) {
			if (!this.isBound) return;
			const { clearPreview = false } = options;

			this.unbind();
			INSTANCES.delete(this.subject);

			if (clearPreview) {
				this.clearPreview();
			}
		}

		/**
		 * Limpia la vista previa actual.
		 * @returns {void}
		 */
		clearPreview() {
			clearFrame(this.target);
		}

		/**
		 * Actualiza la previsualización.
		 * @param {string} inputValue - Valor actual del input.
		 * @param {boolean} clearOnInvalid - Si debe limpiar cuando el valor es inválido.
		 * @returns {void}
		 */
		updatePreview(inputValue, clearOnInvalid = false) {
			const value = `${inputValue || ''}`.trim()
				, videoId = this.getYouTubeId(value);

			if (!this.target) return;

			if (videoId) {
				this.target.src = `//www.youtube.com/embed/${videoId}`;
				return;
			}

			if (clearOnInvalid || !value) {
				this.clearPreview();
			}
		}

		/**
		 * Maneja el evento input.
		 * @param {Event} evt - Evento input.
		 * @returns {void}
		 */
		handleInput(evt) {
			this.updatePreview(evt.target.value, false);
		}

		/**
		 * Maneja el evento change.
		 * @param {Event} evt - Evento change.
		 * @returns {void}
		 */
		handleChange(evt) {
			this.updatePreview(evt.target.value, true);
		}

		// ── API estática ────────────────────────────────────────────────────────

		/**
		 * Inicializa (o reutiliza) una instancia del plugin.
		 * @param {HTMLInputElement} element Input objetivo.
		 * @param {Partial<VideoUrlPreviewOptions>} [options={}] Opciones de inicialización.
		 * @returns {VideoUrlPreview}
		 */
		static init(element, options = {}) {
			if (!(element instanceof HTMLInputElement)) {
				throw new Error('Error: VideoUrlPreview.init requiere un <input>.');
			}

			const currentInstance = INSTANCES.get(element);
			if (currentInstance) return currentInstance;	

			const validatedOptions = getValidatedOptions(element, options)
				, instance = new VideoUrlPreview(element, validatedOptions);

			INSTANCES.set(element, instance);
			instance.bind();
			return instance;
		}

		/**
		 * Obtiene la instancia asociada a un input.
		 * @param {HTMLInputElement} element Input objetivo.
		 * @returns {VideoUrlPreview|null}
		 */
		static getInstance(element) {
			if (!(element instanceof HTMLInputElement)) return null;	
			return INSTANCES.get(element) || null;
		}

		/**
		 * Destruye la instancia asociada a un input.
		 * @param {HTMLInputElement} element Input objetivo.
		 * @param {{clearPreview?: boolean}} [options={}] Opciones de destrucción.
		 * @returns {boolean}
		 */
		static destroy(element, options = {}) {
			const instance = VideoUrlPreview.getInstance(element);
			if (!instance) return false;	
			instance.destroy(options);
			return true;
		}

		/**
		 * Inicializa todas las coincidencias dentro de un root.
		 * @param {ParentNode|Element|Document} [root=document] Nodo raiz.
		 * @returns {VideoUrlPreview[]}
		 */
		static initAll(root = document) {
			return getSubjects(root).map((element) => VideoUrlPreview.init(element));
		}

		/**
		 * Destruye todas las instancias encontradas dentro de un root.
		 * @param {ParentNode|Element|Document} [root=document] Nodo raiz.
		 * @param {{clearPreview?: boolean}} [options={}] Opciones de destrucción.
		 * @returns {number}
		 */
		static destroyAll(root = document, options = {}) {
			return getSubjects(root).reduce((destroyedCount, element) => {
				return VideoUrlPreview.destroy(element, options) ? destroyedCount + 1 : destroyedCount;
			}, 0);
		}
	}

	// ─── ObserverDispatcher ───────────────────────────────────────────────────────

   	/**
     * ObserverDispatcher avanzado: permite a cada plugin observar solo el root que le corresponde,
     * evitando múltiples MutationObserver redundantes y respetando la configuración global.
     */
    if (!window.Plugins) window.Plugins = {};
    if (!window.Plugins.ObserverDispatcher) {
        window.Plugins.ObserverDispatcher = (function() {
            // Mapa: rootElement => { observer, handlers[] }
            const roots = new WeakMap();

            /**
             * Obtiene el root adecuado para un plugin según la prioridad documentada.
             * @param {string} pluginKey Ej: 'form-request'
             * @returns {Element}
             */
            function resolveRoot(pluginKey) {
                // 1. data-pp-observe-root-{plugin}
                const attr = 'data-pp-observe-root-' + pluginKey
                    , specific = document.querySelector('[' + attr + ']');
                if (specific) return specific;

                // 2. data-pp-observe-root en <html>
                const html = document.documentElement
                    , selector = html.getAttribute('data-pp-observe-root');
                if (selector) {
                    try {
                        const el = document.querySelector(selector);
                        if (el) return el;
                    } catch (_) {}
                }

                // 3. Fallback seguro
                return document.body || html;
            }

            /**
             * Registra un handler para un plugin sobre el root adecuado.
             * @param {string} pluginKey
             * @param {function} handler
             */
            function register(pluginKey, handler) {
                const html = document.documentElement
                    , observeGlobal = (html.getAttribute('data-pp-observe-global') || '').trim().toLowerCase();
                if (["false", "0", "off", "no"].includes(observeGlobal)) return; // Observación global desactivada

                const root = resolveRoot(pluginKey);
                let entry = roots.get(root);
                if (!entry) {
                    entry = { handlers: [], observer: null };
                    entry.observer = new MutationObserver((mutations) => {
                        entry.handlers.forEach(fn => {
                            try { fn(mutations); } catch (e) {}
                        });
                    });
                    entry.observer.observe(root, { childList: true, subtree: true });
                    roots.set(root, entry);
                }
                entry.handlers.push(handler);
            }

            return { register };
        })();
    }

	// ─── Gestión de remociones diferidas ─────────────────────────────────────────

    /**
     * Limpia instancias cuyos nodos fueron removidos del DOM.
     * @returns {void}
     */
    const flushPendingRemovals = () => {
        PENDING_REMOVALS.forEach((node) => {
            if (!node.isConnected) {
                VideoUrlPreview.destroyAll(node);
            }
            PENDING_REMOVALS.delete(node);
        });
    };

    /**
     * Agenda chequeo diferido para evitar destroy en reubicaciones temporales.
     * @param {Element} node Nodo removido en mutacion.
     * @returns {void}
     */
    const scheduleRemovalCheck = (node) => {
        PENDING_REMOVALS.add(node);
        queueMicrotask(flushPendingRemovals);
    };

	// ─── Handler de mutaciones DOM ────────────────────────────────────────────────

    const videoUrlPreviewDomHandler = (mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType !== 1) return;
                PENDING_REMOVALS.delete(node);
                VideoUrlPreview.initAll(node);
            });
            mutation.removedNodes.forEach((node) => {
                if (node.nodeType !== 1) return;
                scheduleRemovalCheck(node);
            });
        });
    };

	// ─── Auto-init ────────────────────────────────────────────────────────────────
	
    const startAutoInit = () => {
        VideoUrlPreview.initAll(document);
        // Usar ObserverDispatcher para registrar el handler solo sobre el root adecuado
        window.Plugins.ObserverDispatcher.register('video-url-preview', videoUrlPreviewDomHandler);
    };

	document.readyState === 'loading'
		? document.addEventListener('DOMContentLoaded', startAutoInit, { once: true })
		: startAutoInit();

	window.Plugins.VideoUrlPreview = VideoUrlPreview;
})();
