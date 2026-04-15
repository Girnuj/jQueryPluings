/**
 * @fileoverview Plugin nativo para remover elementos HTML de una lista o colección.
 * @version 3.0
 * @since 2025
 * @module ItemRemover
 */
(function () {
	'use strict';

	const SELECTOR_ROLE = '[data-role="remove-item"]'
		, ITEM_REMOVER_DEFAULTS = Object.freeze({
			targetItemSelector: '[data-remove-item="item"]',
		})
		, INSTANCES = new WeakMap()
		, PENDING_REMOVALS = new Set();

	const getOptionsFromData = (element) => {
		const targetItemSelector = element.dataset.removeTarget;

		if (!targetItemSelector) return {};
		return {
			targetItemSelector, // data-remove-target
		};
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
				ItemRemover.destroyAll(node);
			}
			PENDING_REMOVALS.delete(node);
		});
	};

	const scheduleRemovalCheck = (node) => {
		PENDING_REMOVALS.add(node);
		queueMicrotask(flushPendingRemovals);
	};

	/**
	 * Clase principal del plugin ItemRemover.
	 * @class ItemRemover
	 */
	class ItemRemover {
		/**
		 * Crea una instancia de ItemRemover.
		 * @param {HTMLElement} element - Elemento sobre el que se inicializa el plugin.
		 * @param {Object} options - Opciones de configuración del plugin.
		 */
		constructor(element, options) {
			this.subject = element;
			this.options = { ...ITEM_REMOVER_DEFAULTS, ...options };
			this.isBound = false;
			this.handleClick = this.handleClick.bind(this);
		}

		/**
		 * Obtiene el elemento objetivo que será eliminado.
		 * @returns {HTMLElement|null}
		 */
		getTargetElement() {
			if (!this.options.targetItemSelector) return null;
			return this.subject.closest(this.options.targetItemSelector);
		}

		/**
		 * Vincula el evento de clic al elemento a remover.
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
		 * Maneja el evento click para remover el elemento configurado.
		 * @param {MouseEvent} evt - Evento click.
		 */
		handleClick(evt) {
			evt.preventDefault();
			const target = this.getTargetElement();
			if (!target) return;
			target.remove();
		}

		static init(element, options = {}) {
			if (!(element instanceof HTMLElement)) {
				throw new Error('Error: ItemRemover.init requiere un HTMLElement.');
			}

			const currentInstance = INSTANCES.get(element);
			if (currentInstance) {
				return currentInstance;
			}

			const mergedOptions = { ...getOptionsFromData(element), ...options }
				, instance = new ItemRemover(element, mergedOptions);
			INSTANCES.set(element, instance);
			instance.bind();
			return instance;
		}

		static getInstance(element) {
			if (!(element instanceof HTMLElement)) return null;	
			return INSTANCES.get(element) || null;
		}

		static destroy(element) {
			const instance = ItemRemover.getInstance(element);
			if (!instance) return false;
			instance.destroy();
			return true;
		}

		static initAll(root = document, options = {}) {
			return getSubjects(root).map((element) => ItemRemover.init(element, options));
		}

		static destroyAll(root = document) {
			return getSubjects(root).reduce((destroyedCount, element) => {
				return ItemRemover.destroy(element) ? destroyedCount + 1 : destroyedCount;
			}, 0);
		}
	}

	const startAutoInit = () => {
		ItemRemover.initAll(document);

		const observer = new MutationObserver((mutations) => {
			mutations.forEach((mutation) => {
				mutation.addedNodes.forEach((node) => {
					if (node.nodeType !== 1) return;
					PENDING_REMOVALS.delete(node);
					ItemRemover.initAll(node);
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

	window.ItemRemover = ItemRemover;
})();