/**
 * @fileoverview Plugin nativo para mostrar etiquetas amigables en switches de entrada.
 * @version 3.0
 * @since 2026
 * @author Samuel Montenegro
 * @module InputSwitchFriendly
 */
(function () {
	'use strict';

	const SELECTOR_ROLE = '[data-role="friendly-switch"]'
		, INPUT_SWITCH_FRIENDLY_DEFAULTS = Object.freeze({
			targetSelector: null,
			checkedDisplay: '',
			uncheckedDisplay: '',
		})
		, INSTANCES = new WeakMap()
		, PENDING_REMOVALS = new Set();

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
				InputSwitchFriendly.destroyAll(node);
			}
			PENDING_REMOVALS.delete(node);
		});
	};

	const scheduleRemovalCheck = (node) => {
		PENDING_REMOVALS.add(node);
		queueMicrotask(flushPendingRemovals);
	};

	/**
	 * Gestiona la sincronizacion entre un switch y un texto objetivo amigable.
	 * @class InputSwitchFriendly
	 */
	class InputSwitchFriendly {
		/**
		 * Crea una instancia para un input tipo checkbox/switch.
		 * @param {HTMLInputElement} element - Input que dispara los cambios.
		 * @param {Object} options - Configuracion fusionada del plugin.
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
		 * @param {Object} [options={}] - Opciones para sobreescribir data-attributes.
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
		 * @param {Object} [options={}] - Opciones compartidas para cada instancia.
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

	const startAutoInit = () => {
		InputSwitchFriendly.initAll(document);

		const observer = new MutationObserver((mutations) => {
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
		});

		observer.observe(document.body, { childList: true, subtree: true });
	};

	document.readyState === 'loading'
		? document.addEventListener('DOMContentLoaded', startAutoInit, { once: true })
		: startAutoInit();

	window.InputSwitchFriendly = InputSwitchFriendly;
})();