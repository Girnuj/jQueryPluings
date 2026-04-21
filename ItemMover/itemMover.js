/**
 * @fileoverview Plugin nativo para mover elementos HTML dentro de una lista o colección.
 * @module ItemMover
 * @version 3.0
 * @since 2026
 * @author Samuel Montenegro
 * @license MIT
 * @copyright (c) 2026 Samuel Montenegro
 */
(function () {
	'use strict';

	/**
	 * Selector declarativo de triggers de movimiento.
	 * @type {string}
	 */
	const SELECTOR_ROLE = '[data-role="move-item"]'
		/**
		 * Defaults de configuracion para ItemMover.
		 * @type {Object}
		 */
		, ITEM_MOVER_DEFAULTS = Object.freeze({
			targetItemSelector: '',
			direction: 'next', // 'next' o 'previous'
		})
		/**
		 * Registro de instancias por trigger.
		 * @type {WeakMap<HTMLElement, ItemMover>}
		 */
		, INSTANCES = new WeakMap()
		/**
		 * Nodos removidos pendientes de limpieza diferida.
		 * @type {Set<Element>}
		 */
		, PENDING_REMOVALS = new Set();

	/**
	 * Valida direccion de movimiento soportada por el plugin.
	 * @param {string} direction Direccion solicitada.
	 * @returns {boolean}
	 */
	const isValidDirection = (direction) => ['next', 'previous'].includes(direction);

	/**
	 * Lee opciones declarativas desde dataset (`data-move-*`).
	 * @param {HTMLElement} element Trigger.
	 * @returns {{targetItemSelector:string,direction:string}}
	 */
	const getOptionsFromData = (element) => {
		return {
			targetItemSelector: element.dataset.moveTarget || '', // data-move-target
			direction: element.dataset.moveDirection || 'next', // data-move-direction
		};
	};

	/**
	 * Obtiene triggers compatibles en un root.
	 * @param {ParentNode|Element|Document} [root=document] Nodo raiz.
	 * @returns {HTMLElement[]}
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
	 * Opciones publicas de ItemMover.
	 * @typedef {Object} ItemMoverOptions
	 * @property {string} targetItemSelector Selector del item contenedor a mover.
	 * @property {'next'|'previous'} [direction='next'] Direccion del intercambio.
	 */

	/**
	 * Clase principal del plugin ItemMover.
	 * Permite mover elementos HTML dentro de una lista, hacia adelante o atrás.
	 *
	 * Flujo:
	 * 1. Resuelve elemento target vía `data-move-target`.
	 * 2. Obtiene elemento adyacente según dirección configurada.
	 * 3. Intercambia ambos nodos en el DOM.
	 * @class ItemMover
	 */
	class ItemMover {
		/**
		 * Crea una instancia de ItemMover.
		 * @param {HTMLElement} element - Elemento sobre el que se inicializa el plugin.
		 * @param {ItemMoverOptions} options - Opciones de configuración del plugin.
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
		 * @returns {void}
		 */
		bind() {
			if (this.isBound) return;
			this.subject.addEventListener('click', this.handleClick);
			this.isBound = true;
		}

		/**
		 * Desmonta la instancia y libera sus listeners.
		 * @returns {void}
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
		 * @returns {void}
		 */
		handleClick(evt) {
			evt.preventDefault();

			const target = this.getTargetElement()
				, adjacent = this.getAdjacentElement(target);

			if (!target || !adjacent) return;

			this.swapElements(target, adjacent);
		}

		/**
		 * Inicializa (o reutiliza) una instancia del plugin.
		 * @param {HTMLElement} element Elemento trigger.
		 * @param {ItemMoverOptions} [options={}] Opciones de inicialización.
		 * @returns {ItemMover}
		 */
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

		/**
		 * Obtiene la instancia asociada a un trigger.
		 * @param {HTMLElement} element Elemento trigger.
		 * @returns {ItemMover|null}
		 */
		static getInstance(element) {
			if (!(element instanceof HTMLElement)) return null;	
			return INSTANCES.get(element) || null;
		}

		/**
		 * Destruye la instancia asociada a un trigger.
		 * @param {HTMLElement} element Elemento trigger.
		 * @returns {boolean}
		 */
		static destroy(element) {
			const instance = ItemMover.getInstance(element);
			if (!instance) return false;
			instance.destroy();
			return true;
		}

		/**
		 * Inicializa todas las coincidencias dentro de un root.
		 * @param {ParentNode|Element|Document} [root=document] Nodo raiz.
		 * @param {ItemMoverOptions} [options={}] Opciones compartidas.
		 * @returns {ItemMover[]}
		 */
		static initAll(root = document, options = {}) {
			return getSubjects(root).map((element) => ItemMover.init(element, options));
		}

		/**
		 * Destruye todas las instancias encontradas dentro de un root.
		 * @param {ParentNode|Element|Document} [root=document] Nodo raiz.
		 * @returns {number}
		 */
		static destroyAll(root = document) {
			return getSubjects(root).reduce((destroyedCount, element) => {
				return ItemMover.destroy(element) ? destroyedCount + 1 : destroyedCount;
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
                ItemMover.destroyAll(node);
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

    // Handler para mutaciones DOM (agregado/remoción de triggers)
    const itemMoverDomHandler = (mutations) => {
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
    };

    const startAutoInit = () => {
        ItemMover.initAll(document);
        // Usar ObserverDispatcher para registrar el handler solo sobre el root adecuado
        window.Plugins.ObserverDispatcher.register('item-mover', itemMoverDomHandler);
    };

	document.readyState === 'loading'
		? document.addEventListener('DOMContentLoaded', startAutoInit, { once: true })
		: startAutoInit();

	window.Plugins.ItemMover = ItemMover;
})();
