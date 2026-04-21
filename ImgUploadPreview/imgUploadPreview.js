/**
 * @fileoverview Plugin nativo para previsualizar imagenes al subir archivos.
 * @module ImgUploadPreview
 * @version 3.0
 * @since 2026
 * @author Samuel Montenegro
 * @license MIT
 * @copyright (c) 2026 Samuel Montenegro
 */
(function () {
	'use strict';

	/**
	 * Selector declarativo de inputs con preview de imagen.
	 * @type {string}
	 */
	const SELECTOR_IMG_UPLOAD = 'input[data-img-upload="input"], input[data-img-upload-preview-target]'
		/**
		 * Defaults de configuracion para ImgUploadPreview.
		 * @type {Object}
		 */
		, IMG_UPLOAD_PREVIEW_DEFAULTS = Object.freeze({
			targetItemSelector: '',
			allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
			maxFileSize: 2 * 1024 * 1024, //2MB
		})
		/**
		 * Registro de instancias por input file.
		 * @type {WeakMap<HTMLInputElement, ImgUploadPreview>}
		 */
		, INSTANCES = new WeakMap()
		/**
		 * Nodos removidos pendientes de limpieza diferida.
		 * @type {Set<Element>}
		 */
		, PENDING_REMOVALS = new Set();

	/**
	 * Resuelve elemento target a partir de selector CSS.
	 * @param {string} selector Selector CSS.
	 * @returns {HTMLImageElement|null}
	 */
	const getTargetElement = (selector) => selector ? document.querySelector(selector) : null;

	/**
	 * Limpia la imagen actual del target.
	 * @param {HTMLImageElement|null} target Elemento img destino.
	 * @returns {void}
	 */
	const clearImage = (target) => {
		if (target) {
			target.removeAttribute('src');
		}
	};

	/**
	 * Valida selector target y retorna opciones efectivas de la instancia.
	 * @param {HTMLInputElement} element Input file trigger.
	 * @param {Object} [options={}] Overrides por API.
	 * @returns {Object}
	 */
	const getValidatedOptions = (element, options = {}) => {
		const targetItemSelector = options.targetItemSelector || element.dataset.imgUploadPreviewTarget;

		if (!targetItemSelector) {
			throw new Error("Error: No se especificó el selector 'data-img-upload-preview-target'.");
		}

		const target = getTargetElement(targetItemSelector);
		if (!target) {
			console.warn(`Warning: No se encontró ningún elemento para el selector '${targetItemSelector}'.`);
			return { ...options, targetItemSelector };
		}

		if (target.tagName !== 'IMG') {
			throw new Error("Error: El selector 'data-img-upload-preview-target' no apunta a un elemento <img>.");
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

		if (root.nodeType === 1 && root.matches(SELECTOR_IMG_UPLOAD)) {
			subjects.push(root);
		}

		if (typeof root.querySelectorAll === 'function') {
			subjects.push(...root.querySelectorAll(SELECTOR_IMG_UPLOAD));
		}

		return subjects;
	};

	/**
	 * Limpia instancias asociadas a nodos removidos del DOM.
	 * @returns {void}
	 */
	const flushPendingRemovals = () => {
		PENDING_REMOVALS.forEach((node) => {
			if (!node.isConnected) {
				ImgUploadPreview.destroyAll(node);
			}
			PENDING_REMOVALS.delete(node);
		});
	};

	/**
	 * Agenda chequeo diferido para destruccion segura de instancias.
	 * @param {Element} node Nodo removido en mutacion.
	 * @returns {void}
	 */
	const scheduleRemovalCheck = (node) => {
		PENDING_REMOVALS.add(node);
		queueMicrotask(flushPendingRemovals);
	};

	/**
	 * Opciones publicas de ImgUploadPreview.
	 * @typedef {Object} ImgUploadPreviewOptions
	 * @property {string} targetItemSelector Selector del elemento <img> destino.
	 * @property {string[]} [allowedMimeTypes=['image/jpeg','image/png','image/webp','image/gif']] MIME types permitidos.
	 * @property {number} [maxFileSize=2097152] Tamano maximo permitido en bytes.
	 */

	/**
	 * Clase principal del plugin ImgUploadPreview.
	 *
	 * Flujo:
	 * 1. Escucha cambios de archivo en el input.
	 * 2. Valida tipo MIME y tamaño máximo.
	 * 3. Renderiza previsualización en el `<img>` target.
	 * @class ImgUploadPreview
	 */
	class ImgUploadPreview {
		/**
		 * Crea una instancia de ImgUploadPreview.
		 * @param {HTMLInputElement} element - Input file sobre el que se inicializa.
		 * @param {ImgUploadPreviewOptions} options - Opciones de configuración del plugin.
		 */
		constructor(element, options) {
			this.subject = element;
			this.options = { ...IMG_UPLOAD_PREVIEW_DEFAULTS, ...options };
			this.target = getTargetElement(this.options.targetItemSelector);
			this.isBound = false;
			this.handleChange = this.handleChange.bind(this);
		}

		/**
		 * Vincula el evento de cambio al input para mostrar la previsualización.
		 * @returns {void}
		 */
		bind() {
			if (this.isBound) return;
			this.subject.addEventListener('change', this.handleChange);
			this.isBound = true;
		}

		/**
		 * Desmonta la instancia y libera sus listeners.
		 * @param {{clearPreview?: boolean}} [options] - Configuración del desmontaje.
		 * @param {boolean} [options.clearPreview=false] - Indica si debe limpiar la imagen actual.
		 * @returns {void}
		 */
		destroy(options = {}) {
			if (!this.isBound) return;
			const { clearPreview = false } = options;

			this.subject.removeEventListener('change', this.handleChange);
			this.isBound = false;
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
			clearImage(this.target);
		}

		/**
		 * Maneja el cambio de archivo en el input.
		 * @param {Event} evt - Evento change del input.
		 * @returns {void}
		 */
		handleChange(evt) {
			const input = evt.target
				, file = input.files && input.files[0];

			if (!file) {
				this.clearPreview();
				return;
			}

			const { allowedMimeTypes, maxFileSize } = this.options
				, isAllowedType = allowedMimeTypes.includes(file.type)
				, isAllowedSize = file.size <= maxFileSize;

			if (!isAllowedType) {
				console.warn(`Formato no permitido: ${file.type || 'desconocido'}.`);
				this.clearPreview();
				input.value = '';
				return;
			}

			if (!isAllowedSize) {
				console.warn(`Archivo demasiado grande. Maximo: ${Math.round(maxFileSize / 1024 / 1024)} MB.`);
				this.clearPreview();
				input.value = '';
				return;
			}

			if (!this.target) return;

			const reader = new FileReader();
			reader.onload = (e) => {
				this.target.src = e.target.result;
			};
			reader.readAsDataURL(file);
		}

		/**
		 * Inicializa (o reutiliza) una instancia del plugin.
		 * @param {HTMLInputElement} element Input file objetivo.
		 * @param {Partial<ImgUploadPreviewOptions>} [options={}] Opciones de inicialización.
		 * @returns {ImgUploadPreview}
		 */
		static init(element, options = {}) {
			if (!(element instanceof HTMLInputElement)) {
				throw new Error('Error: ImgUploadPreview.init requiere un <input>.');
			}

			const currentInstance = INSTANCES.get(element);
			if (currentInstance) return currentInstance;

			const validatedOptions = getValidatedOptions(element, options)
				, instance = new ImgUploadPreview(element, validatedOptions);
			INSTANCES.set(element, instance);
			instance.bind();
			return instance;
		}

		/**
		 * Obtiene la instancia asociada a un input file.
		 * @param {HTMLInputElement} element Input file objetivo.
		 * @returns {ImgUploadPreview|null}
		 */
		static getInstance(element) {
			if (!(element instanceof HTMLInputElement)) return null;
			return INSTANCES.get(element) || null;
		}

		/**
		 * Destruye la instancia asociada a un input file.
		 * @param {HTMLInputElement} element Input file objetivo.
		 * @param {{clearPreview?: boolean}} [options={}] Opciones de destrucción.
		 * @returns {boolean}
		 */
		static destroy(element, options = {}) {
			const instance = ImgUploadPreview.getInstance(element);
			if (!instance) return false;
			instance.destroy(options);
			return true;
		}

		/**
		 * Inicializa todas las coincidencias dentro de un root.
		 * @param {ParentNode|Element|Document} [root=document] Nodo raiz.
		 * @returns {ImgUploadPreview[]}
		 */
		static initAll(root = document) {
			return getSubjects(root).map((element) => ImgUploadPreview.init(element));
		}

		/**
		 * Destruye todas las instancias encontradas dentro de un root.
		 * @param {ParentNode|Element|Document} [root=document] Nodo raiz.
		 * @param {{clearPreview?: boolean}} [options={}] Opciones de destrucción.
		 * @returns {number}
		 */
		static destroyAll(root = document, options = {}) {
			return getSubjects(root).reduce((destroyedCount, element) => {
				return ImgUploadPreview.destroy(element, options) ? destroyedCount + 1 : destroyedCount;
			}, 0);
		}
	}

	/**
	 * Inicializa automaticamente instancias y observa cambios del DOM.
	 *
	 * @returns {void}
	 */
	const startAutoInit = () => {
		ImgUploadPreview.initAll(document);

		const observer = new MutationObserver((mutations) => {
			mutations.forEach((mutation) => {
				mutation.addedNodes.forEach((node) => {
					if (node.nodeType !== 1) return;
					PENDING_REMOVALS.delete(node);
					ImgUploadPreview.initAll(node);
				});

				mutation.removedNodes.forEach((node) => {
					if (node.nodeType !== 1) return;
					scheduleRemovalCheck(node);
				});
			});
		});

		const observeGlobal = (document.documentElement.getAttribute('data-pp-observe-global') || '').trim().toLowerCase();
		if (!['false', '0', 'off', 'no'].includes(observeGlobal)) {
			const observeRootSelector = (document.documentElement.getAttribute('data-pp-observe-root') || '').trim();
			const observeRootElement = document.querySelector('[data-pp-observe-root-img-upload-preview]');
			let observeRoot = observeRootElement || document.body || document.documentElement;

			if (observeRootSelector && !observeRootElement) {
				try {
					observeRoot = document.querySelector(observeRootSelector) || observeRoot;
				} catch (_error) {
					observeRoot = document.body || document.documentElement;
				}
			}

			observer.observe(observeRoot, { childList: true, subtree: true });
		}
	};

	document.readyState === 'loading' 
		? document.addEventListener('DOMContentLoaded', startAutoInit, { once: true })
	 	: startAutoInit();
	
	window.Plugins.ImgUploadPreview = ImgUploadPreview;
})();
