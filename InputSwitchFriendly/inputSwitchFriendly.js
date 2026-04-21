/**
 * @fileoverview Plugin nativo para mostrar etiquetas amigables en switches de entrada.
 * @module InputSwitchFriendly
 * @version 3.0
 * @since 2026
 * @author Samuel Montenegro
 * @license MIT
 * @copyright (c) 2026 Samuel Montenegro
 */
(function () {
	'use strict';

	/**
	 * Selector declarativo de switches amigables.
	 * @type {string}
	 */
	const SELECTOR_ROLE = '[data-role="friendly-switch"]'
		/**
		 * Defaults de configuracion de InputSwitchFriendly.
		 * @type {Object}
		 */
		, INPUT_SWITCH_FRIENDLY_DEFAULTS = Object.freeze({
			targetSelector: null,
			checkedDisplay: '',
			uncheckedDisplay: '',
		})
		/**
		 * Registro de instancias por input.
		 * @type {WeakMap<HTMLInputElement, InputSwitchFriendly>}
		 */
		, INSTANCES = new WeakMap()
		/**
		 * Nodos removidos pendientes de limpieza diferida.
		 * @type {Set<Element>}
		 */
		, PENDING_REMOVALS = new Set();

	/**
	 * Lee opciones declarativas `data-friendly-switch-*` desde el input.
	 * @param {HTMLInputElement} element Input trigger.
	 * @returns {{checkedDisplay:string|undefined,uncheckedDisplay:string|undefined,targetSelector:string|undefined}}
	 */
	const getOptionsFromData = (element) => {
		const checkedDisplay = element.dataset.friendlySwitchChecked
			, uncheckedDisplay = element.dataset.friendlySwitchUnchecked
			, targetSelector = element.dataset.friendlySwitchTarget;

		return {
			checkedDisplay,
			uncheckedDisplay,
			targetSelector,
		};
	};

	/**
	 * Obtiene triggers compatibles dentro de un root.
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

	/**
	 * Opciones publicas de InputSwitchFriendly.
	 * @typedef {Object} InputSwitchFriendlyOptions
	 * @property {string|null} [targetSelector=null] Selector del nodo destino para texto.
	 * @property {string} [checkedDisplay=''] Texto cuando el switch esta activo.
	 * @property {string} [uncheckedDisplay=''] Texto cuando el switch esta inactivo.
	 */

	/**
	 * Gestiona la sincronizacion entre un switch y un texto objetivo amigable.
	 *
	 * Flujo:
	 * 1. Resuelve el target (label o selector custom).
	 * 2. Escucha cambios del input.
	 * 3. Actualiza el texto segun estado checked/unchecked.
	 * @class InputSwitchFriendly
	 */
	class InputSwitchFriendly {
		/**
		 * Crea una instancia para un input tipo checkbox/switch.
		 * @param {HTMLInputElement} element - Input que dispara los cambios.
		 * @param {InputSwitchFriendlyOptions} options - Configuracion fusionada del plugin.
		 */
		constructor(element, options) {
			this.subject = element;
			this.options = { ...INPUT_SWITCH_FRIENDLY_DEFAULTS, ...options };
			this.target = this.resolveTarget();
			this.isBound = false;
			this.handleChange = this.handleChange.bind(this);
		}

		/**
		 * Resuelve el elemento destino donde se mostrara el texto de estado.
		 * @returns {HTMLElement|null}
		 */
		resolveTarget() {
			const id = this.subject.id
				, selector = this.options.targetSelector && this.options.targetSelector !== ''
					? this.options.targetSelector
					: id
						? `label[for="${id}"]`
						: null;

			if (!selector) return null;
			return document.querySelector(selector);
		}

		/**
		 * Actualiza el texto del objetivo segun el estado checked del input.
		 * @returns {void}
		 */
		updateTargetText() {
			if (!this.target) return;
			const isChecked = this.subject.checked
				, displayText = isChecked ? this.options.checkedDisplay : this.options.uncheckedDisplay;
			this.target.textContent = displayText;
		}

		/**
		 * Vincula listeners e inicializa el primer render del texto.
		 * @returns {void}
		 */
		bind() {
			if (this.isBound) return;
			if (this.options.checkedDisplay === '' || this.options.uncheckedDisplay === '') return;

			this.subject.addEventListener('change', this.handleChange);
			this.isBound = true;
			this.updateTargetText();
		}

		/**
		 * Desmonta la instancia y libera listeners registrados.
		 * @returns {void}
		 */
		destroy() {
			if (!this.isBound) return;
			this.subject.removeEventListener('change', this.handleChange);
			this.isBound = false;
			INSTANCES.delete(this.subject);
		}

		/**
		 * Handler del evento change del input.
		 * @returns {void}
		 */
		handleChange() {
			this.updateTargetText();
		}

		/**
		 * Inicializa una instancia sobre un input concreto.
		 * @param {HTMLElement} element - Elemento a inicializar.
		 * @param {InputSwitchFriendlyOptions} [options={}] - Opciones para sobreescribir data-attributes.
		 * @returns {InputSwitchFriendly}
		 */
		static init(element, options = {}) {
			if (!(element instanceof HTMLInputElement)) {
				throw new Error('Error: InputSwitchFriendly.init requiere un <input>.');
			}

			const currentInstance = INSTANCES.get(element);
			if (currentInstance) return currentInstance;

			const mergedOptions = { ...getOptionsFromData(element), ...options }
				, instance = new InputSwitchFriendly(element, mergedOptions);

			INSTANCES.set(element, instance);
			instance.bind();
			return instance;
		}

		/**
		 * Devuelve la instancia asociada a un input.
		 * @param {HTMLElement} element - Elemento a consultar.
		 * @returns {InputSwitchFriendly|null}
		 */
		static getInstance(element) {
			if (!(element instanceof HTMLInputElement)) return null;
			return INSTANCES.get(element) || null;
		}

		/**
		 * Destruye una instancia asociada a un input.
		 * @param {HTMLElement} element - Elemento a desmontar.
		 * @returns {boolean}
		 */
		static destroy(element) {
			const instance = InputSwitchFriendly.getInstance(element);
			if (!instance) return false;
			instance.destroy();
			return true;
		}

		/**
		 * Inicializa todas las coincidencias dentro de un contenedor.
		 * @param {ParentNode|Element|Document} [root=document] - Raiz donde buscar.
		 * @param {InputSwitchFriendlyOptions} [options={}] - Opciones compartidas para cada instancia.
		 * @returns {InputSwitchFriendly[]}
		 */
		static initAll(root = document, options = {}) {
			return getSubjects(root).map((element) => InputSwitchFriendly.init(element, options));
		}

		/**
		 * Destruye todas las instancias encontradas en un contenedor.
		 * @param {ParentNode|Element|Document} [root=document] - Raiz donde buscar.
		 * @returns {number}
		 */
		static destroyAll(root = document) {
			return getSubjects(root).reduce((destroyedCount, element) => {
				return InputSwitchFriendly.destroy(element) ? destroyedCount + 1 : destroyedCount;
			}, 0);
		}
	}

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

    /**
     * Limpia instancias cuyos nodos fueron removidos del DOM.
     * @returns {void}
     */
    const flushPendingRemovals = () => {
        PENDING_REMOVALS.forEach((node) => {
            if (!node.isConnected) {
                InputSwitchFriendly.destroyAll(node);
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

    // Handler para mutaciones DOM (alta/baja de formularios)
    const inputSwitchFriendlyDomHandler = (mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType !== 1) return;
                PENDING_REMOVALS.delete(node);
                InputSwitchFriendly.initAll(node);
            });
            mutation.removedNodes.forEach((node) => {
                if (node.nodeType !== 1) return;
                scheduleRemovalCheck(node);
            });
        });
    };

    const startAutoInit = () => {
        InputSwitchFriendly.initAll(document);
        // Usar ObserverDispatcher para registrar el handler solo sobre el root adecuado
        window.Plugins.ObserverDispatcher.register('input-switch-friendly', inputSwitchFriendlyDomHandler);
    };

	document.readyState === 'loading'
		? document.addEventListener('DOMContentLoaded', startAutoInit, { once: true })
		: startAutoInit();

	window.Plugins.InputSwitchFriendly = InputSwitchFriendly;
})();
