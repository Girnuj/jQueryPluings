/**
 * @fileoverview Plugin nativo para mover elementos HTML dentro de una lista o colección.
 * @version 3.0
 * @since 2026
 * @author Samuel Montenegro
 * @module ItemMover
 */
(function () {
	'use strict';

	const SELECTOR_ROLE = '[data-role="move-item"]'
		, ITEM_MOVER_DEFAULTS = Object.freeze({
			targetItemSelector: '',
			direction: 'next', // 'next' o 'previous'
		})
		, INSTANCES = new WeakMap()
		, PENDING_REMOVALS = new Set();

	const isValidDirection = (direction) => ['next', 'previous'].includes(direction);

	const getOptionsFromData = (element) => {
		return {
			targetItemSelector: element.dataset.moveTarget || '', // data-move-target
			direction: element.dataset.moveDirection || 'next', // data-move-direction
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
				ItemMover.destroyAll(node);
			}

			PENDING_REMOVALS.delete(node);
		});
	};

	const scheduleRemovalCheck = (node) => {
		PENDING_REMOVALS.add(node);
		queueMicrotask(flushPendingRemovals);
	};

	/**
	 * Clase principal del plugin ItemMover.
	 * Permite mover elementos HTML dentro de una lista, hacia adelante o atrás.
	 * @class ItemMover
	 */
	class ItemMover {
		/**
		 * Crea una instancia de ItemMover.
		 * @param {HTMLElement} element - Elemento sobre el que se inicializa el plugin.
		 * @param {Object} options - Opciones de configuración del plugin.
		 */
		constructor(element, options) {
			this.subject = element;
			this.options = { ...ITEM_MOVER_DEFAULTS, ...options };
			this.isBound = false;
			this.handleClick = this.handleClick.bind(this);
		}

		/**
		 * Intercambia dos elementos en el DOM.
		 * @param {HTMLElement} firstElement - Primer elemento.
		 * @param {HTMLElement} secondElement - Segundo elemento.
		 */
		swapElements(firstElement, secondElement) {
			if (!firstElement || !secondElement) return;
			if (firstElement === secondElement) return;

			const firstParent = firstElement.parentNode
				, firstNextSibling = firstElement.nextSibling
				, secondParent = secondElement.parentNode
				, secondNextSibling = secondElement.nextSibling;

			if (!firstParent || !secondParent) return;
			
			firstParent.insertBefore(secondElement, firstNextSibling);
			secondParent.insertBefore(firstElement, secondNextSibling);
		}

		/**
		 * Obtiene el elemento objetivo sobre el que opera el movimiento.
		 * @returns {HTMLElement|null}
		 */
		getTargetElement() {
			if (!this.options.targetItemSelector) return null;
			return this.subject.closest(this.options.targetItemSelector);
		}

		/**
		 * Obtiene el elemento adyacente según la dirección configurada.
		 * @param {HTMLElement} target - Elemento actual.
		 * @returns {HTMLElement|null}
		 */
		getAdjacentElement(target) {
			if (!target || !isValidDirection(this.options.direction)) return null;
			
			return this.options.direction === 'previous'
				? target.previousElementSibling
				: target.nextElementSibling;
		}

		/**
		 * Vincula el evento de clic al elemento para moverlo.
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
		 * Maneja el evento click para mover el elemento configurado.
		 * @param {MouseEvent} evt - Evento click.
		 */
		handleClick(evt) {
			evt.preventDefault();

			const target = this.getTargetElement()
				, adjacent = this.getAdjacentElement(target);

			if (!target || !adjacent) return;

			this.swapElements(target, adjacent);
		}

		static init(element, options = {}) {
			if (!(element instanceof HTMLElement)) {
				throw new Error('Error: ItemMover.init requiere un HTMLElement.');
			}

			const currentInstance = INSTANCES.get(element);
			if (currentInstance) return currentInstance;
			
			const mergedOptions = { ...getOptionsFromData(element), ...options };

			if (!mergedOptions.targetItemSelector) {
				throw new Error("Error: No se especificó 'data-move-target' o 'targetItemSelector'.");
			}

			if (!isValidDirection(mergedOptions.direction)) {
				throw new Error("Error: 'direction' solo permite 'next' o 'previous'.");
			}

			const instance = new ItemMover(element, mergedOptions);
			INSTANCES.set(element, instance);
			instance.bind();
			return instance;
		}

		static getInstance(element) {
			if (!(element instanceof HTMLElement)) return null;	
			return INSTANCES.get(element) || null;
		}

		static destroy(element) {
			const instance = ItemMover.getInstance(element);
			if (!instance) return false;
			instance.destroy();
			return true;
		}

		static initAll(root = document, options = {}) {
			return getSubjects(root).map((element) => ItemMover.init(element, options));
		}

		static destroyAll(root = document) {
			return getSubjects(root).reduce((destroyedCount, element) => {
				return ItemMover.destroy(element) ? destroyedCount + 1 : destroyedCount;
			}, 0);
		}
	}

	const startAutoInit = () => {
		ItemMover.initAll(document);

		const observer = new MutationObserver((mutations) => {
			mutations.forEach((mutation) => {
				mutation.addedNodes.forEach((node) => {
					if (node.nodeType !== 1) return;
					PENDING_REMOVALS.delete(node);
					ItemMover.initAll(node);
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

	window.ItemMover = ItemMover;
})();