/**
 * @fileoverview Plugin nativo para previsualizar imagenes al subir archivos.
 * @version 3.0
 * @since 2026
 * @author Samuel Montenegro
 * @module ImgUploadPreview
 */
(function () {
	'use strict';

	const SELECTOR_IMG_UPLOAD = 'input[data-img-upload="input"], input[data-img-upload-preview-target]'
		, IMG_UPLOAD_PREVIEW_DEFAULTS = Object.freeze({
			targetItemSelector: '',
			allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
			maxFileSize: 2 * 1024 * 1024, //2MB
		})
		, INSTANCES = new WeakMap()
		, PENDING_REMOVALS = new Set();

	const getTargetElement = (selector) => selector ? document.querySelector(selector) : null;

	const clearImage = (target) => {
		if (target) {
			target.removeAttribute('src');
		}
	};

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

	const flushPendingRemovals = () => {
		PENDING_REMOVALS.forEach((node) => {
			if (!node.isConnected) {
				ImgUploadPreview.destroyAll(node);
			}
			PENDING_REMOVALS.delete(node);
		});
	};

	const scheduleRemovalCheck = (node) => {
		PENDING_REMOVALS.add(node);
		queueMicrotask(flushPendingRemovals);
	};

	/**
	 * Clase principal del plugin ImgUploadPreview.
	 * @class ImgUploadPreview
	 */
	class ImgUploadPreview {
		/**
		 * Crea una instancia de ImgUploadPreview.
		 * @param {HTMLInputElement} element - Input file sobre el que se inicializa.
		 * @param {Object} options - Opciones de configuración del plugin.
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
		 */
		bind() {
			if (this.isBound) return;
			this.subject.addEventListener('change', this.handleChange);
			this.isBound = true;
		}

		/**
		 * Desmonta la instancia y libera sus listeners.
		 * @param {Object} [options] - Configuración del desmontaje.
		 * @param {boolean} [options.clearPreview=false] - Indica si debe limpiar la imagen actual.
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
		 */
		clearPreview() {
			clearImage(this.target);
		}

		/**
		 * Maneja el cambio de archivo en el input.
		 * @param {Event} evt - Evento change del input.
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

		static getInstance(element) {
			if (!(element instanceof HTMLInputElement)) return null;
			return INSTANCES.get(element) || null;
		}

		static destroy(element, options = {}) {
			const instance = ImgUploadPreview.getInstance(element);
			if (!instance) return false;
			instance.destroy(options);
			return true;
		}

		static initAll(root = document) {
			return getSubjects(root).map((element) => ImgUploadPreview.init(element));
		}

		static destroyAll(root = document, options = {}) {
			return getSubjects(root).reduce((destroyedCount, element) => {
				return ImgUploadPreview.destroy(element, options) ? destroyedCount + 1 : destroyedCount;
			}, 0);
		}
	}

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

		observer.observe(document.body, { childList: true, subtree: true });
	};

	document.readyState === 'loading' 
		? document.addEventListener('DOMContentLoaded', startAutoInit, { once: true })
	 	: startAutoInit();
	
	window.ImgUploadPreview = ImgUploadPreview;
})();