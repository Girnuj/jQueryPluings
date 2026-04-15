/**
 * @fileoverview Plugin nativo para previsualizar videos de YouTube a partir de una URL ingresada.
 * @version 3.0
 * @since 2026
 * @author Samuel Montenegro
 * @module VideoUrlPreview
 */
(function () {
	'use strict';

	const SELECTOR_ROLE = 'input[data-role="video-preview"], input[data-video-preview-target-frame]'
		, VIDEO_URL_PREVIEW_DEFAULTS = Object.freeze({
			targetItemSelector: '',
		})
		, INSTANCES = new WeakMap()
		, PENDING_REMOVALS = new Set();

	const getTargetElement = (selector) => selector ? document.querySelector(selector) : null;

	const clearFrame = (target) => {
		if (target) {
			target.removeAttribute('src');
		}
	};

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

	const flushPendingRemovals = () => {
		PENDING_REMOVALS.forEach((node) => {
			if (!node.isConnected) {
				VideoUrlPreview.destroyAll(node);
			}
			PENDING_REMOVALS.delete(node);
		});
	};

	const scheduleRemovalCheck = (node) => {
		PENDING_REMOVALS.add(node);
		queueMicrotask(flushPendingRemovals);
	};

	/**
	 * Clase principal del plugin VideoUrlPreview.
	 * Permite previsualizar un video de YouTube en un iframe a partir de una URL ingresada.
	 * @class VideoUrlPreview
	 */
	class VideoUrlPreview {
		/**
		 * Crea una instancia de VideoUrlPreview.
		 * @param {HTMLInputElement} element - Input de texto sobre el que se inicializa.
		 * @param {Object} options - Opciones de configuración del plugin.
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
		 */
		bind() {
			if (this.isBound) return;
			this.subject.addEventListener('input', this.handleInput);
			this.subject.addEventListener('change', this.handleChange);
			this.isBound = true;
			this.updatePreview(this.subject.value, true);
		}

		/**
		 * Desmonta la instancia y libera sus listeners.
		 * @param {Object} [options] - Configuración del desmontaje.
		 * @param {boolean} [options.clearPreview=false] - Indica si debe limpiar el iframe actual.
		 */
		destroy(options = {}) {
			if (!this.isBound) return;
			const { clearPreview = false } = options;

			this.subject.removeEventListener('input', this.handleInput);
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
			clearFrame(this.target);
		}

		/**
		 * Actualiza la previsualización.
		 * @param {string} inputValue - Valor actual del input.
		 * @param {boolean} clearOnInvalid - Si debe limpiar cuando el valor es inválido.
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
		 */
		handleInput(evt) {
			this.updatePreview(evt.target.value, false);
		}

		/**
		 * Maneja el evento change.
		 * @param {Event} evt - Evento change.
		 */
		handleChange(evt) {
			this.updatePreview(evt.target.value, true);
		}

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

		static getInstance(element) {
			if (!(element instanceof HTMLInputElement)) return null;	
			return INSTANCES.get(element) || null;
		}

		static destroy(element, options = {}) {
			const instance = VideoUrlPreview.getInstance(element);
			if (!instance) return false;	
			instance.destroy(options);
			return true;
		}

		static initAll(root = document) {
			return getSubjects(root).map((element) => VideoUrlPreview.init(element));
		}

		static destroyAll(root = document, options = {}) {
			return getSubjects(root).reduce((destroyedCount, element) => {
				return VideoUrlPreview.destroy(element, options) ? destroyedCount + 1 : destroyedCount;
			}, 0);
		}
	}

	const startAutoInit = () => {
		VideoUrlPreview.initAll(document);

		const observer = new MutationObserver((mutations) => {
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
		});

		observer.observe(document.body, { childList: true, subtree: true });
	};

	document.readyState === 'loading'
		? document.addEventListener('DOMContentLoaded', startAutoInit, { once: true })
		: startAutoInit();

	window.VideoUrlPreview = VideoUrlPreview;
})();