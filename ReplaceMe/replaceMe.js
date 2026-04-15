/**
 * @fileoverview Plugin nativo para reemplazar un elemento por HTML remoto al hacer clic.
 * @version 3.0
 * @since 2026
 * @author Samuel Montenegro
 * @module ReplaceMe
 */
(function () {
	'use strict';

	const SELECTOR_REPLACE_ME = '[data-role="replace-me"]'
		, REPLACE_ME_DEFAULTS = Object.freeze({
			replaceSourceUrl: '',
			requestMethod: 'POST',
		})
		, INSTANCES = new WeakMap()
		, PENDING_REMOVALS = new Set();

	const getValidatedRequestMethod = (value) => {
		const requestMethod = `${value || ''}`.trim().toUpperCase() || REPLACE_ME_DEFAULTS.requestMethod;

		if (!['GET', 'POST'].includes(requestMethod)) {
			throw new Error("Error: 'requestMethod' solo permite 'GET' o 'POST'.");
		}
		return requestMethod;
	};

	const getOptionsFromData = (element) => {
		const replaceSourceUrl = element.dataset.replaceMeSrc
			, requestMethod = element.dataset.replaceMeMethod;

		if (!replaceSourceUrl && !requestMethod) return {};	
		return {
			replaceSourceUrl, // data-replace-me-src
			requestMethod, // data-replace-me-method
		};
	};

	const getValidatedOptions = (element, options = {}) => {
		const mergedOptions = { ...REPLACE_ME_DEFAULTS, ...getOptionsFromData(element), ...options }
			, { replaceSourceUrl } = mergedOptions;

		if (!replaceSourceUrl) {
			throw new Error("Error: No se especificó la URL 'data-replace-me-src'.");
		}
		mergedOptions.requestMethod = getValidatedRequestMethod(mergedOptions.requestMethod);
		return mergedOptions;
	};

	const getSubjects = (root = document) => {
		const subjects = [];
		if (root.nodeType === 1 && root.matches(SELECTOR_REPLACE_ME)) {
			subjects.push(root);
		}

		if (typeof root.querySelectorAll === 'function') {
			subjects.push(...root.querySelectorAll(SELECTOR_REPLACE_ME));
		}
		return subjects;
	};

	const flushPendingRemovals = () => {
		PENDING_REMOVALS.forEach((node) => {
			if (!node.isConnected) {
				ReplaceMe.destroyAll(node);
			}
			PENDING_REMOVALS.delete(node);
		});
	};

	const scheduleRemovalCheck = (node) => {
		PENDING_REMOVALS.add(node);
		queueMicrotask(flushPendingRemovals);
	};

	/**
	 * Clase principal del plugin ReplaceMe.
	 * @class ReplaceMe
	 */
	class ReplaceMe {
		/**
		 * Crea una instancia de ReplaceMe.
		 * @param {HTMLElement} element - Elemento sobre el que se inicializa el plugin.
		 * @param {Object} options - Opciones de configuración del plugin.
		 */
		constructor(element, options) {
			this.subject = element;
			this.options = { ...REPLACE_ME_DEFAULTS, ...options };
			this.isBound = false;
			this.handleClick = this.handleClick.bind(this);
		}

		/**
		 * Vincula el evento click al elemento para reemplazarlo por HTML remoto.
		 */
		bind() {
			if (this.isBound) return;
			this.subject.addEventListener('click', this.handleClick);
			this.isBound = true;
		}

		/**
		 * Desmonta la instancia y libera sus listeners.
		 */
		destroy() {
			if (!this.isBound) return;
			this.subject.removeEventListener('click', this.handleClick);
			this.isBound = false;
			INSTANCES.delete(this.subject);
		}

		/**
		 * Maneja el click para descargar y reemplazar HTML.
		 * @param {MouseEvent} evt - Evento click.
		 */
		async handleClick(evt) {
			evt.preventDefault();

			const preCursor = this.subject.style.cursor;
			this.subject.style.cursor = 'wait';

			try {
				const response = await fetch(this.options.replaceSourceUrl, {
					method: this.options.requestMethod,
					credentials: 'same-origin',
				});

				if (!response.ok) {
					throw new Error(`HTTP ${response.status}`);
				}

				const html = await response.text();
				this.subject.outerHTML = html;
			} catch (_error) {
				if ('disabled' in this.subject) {
					this.subject.disabled = true;
				}
			} finally {
				this.subject.style.cursor = preCursor;
			}
		}

		static init(element, options = {}) {
			if (!(element instanceof HTMLElement)) {
				throw new Error('Error: ReplaceMe.init requiere un HTMLElement.');
			}

			const currentInstance = INSTANCES.get(element);
			if (currentInstance) {
				return currentInstance;
			}

			const validatedOptions = getValidatedOptions(element, options)
				, instance = new ReplaceMe(element, validatedOptions);

			INSTANCES.set(element, instance);
			instance.bind();
			return instance;
		}

		static getInstance(element) {
			if (!(element instanceof HTMLElement)) 	return null;
			return INSTANCES.get(element) || null;
		}

		static destroy(element) {
			const instance = ReplaceMe.getInstance(element);
			if (!instance) return false;
			instance.destroy();
			return true;
		}

		static initAll(root = document, options = {}) {
			return getSubjects(root).map((element) => ReplaceMe.init(element, options));
		}

		static destroyAll(root = document) {
			return getSubjects(root).reduce((destroyedCount, element) => {
				return ReplaceMe.destroy(element) ? destroyedCount + 1 : destroyedCount;
			}, 0);
		}
	}

	const startAutoInit = () => {
		ReplaceMe.initAll(document);

		const observer = new MutationObserver((mutations) => {
			mutations.forEach((mutation) => {
				mutation.addedNodes.forEach((node) => {
					if (node.nodeType !== 1) return;
					PENDING_REMOVALS.delete(node);
					ReplaceMe.initAll(node);
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

	window.ReplaceMe = ReplaceMe;
})();