/**
 * @fileoverview Plugin nativo para selects dependientes (parent-child) con carga dinamica via fetch.
 * @version 3.0
 * @since 2026
 * @author Samuel Montenegro
 * @module ChildSelect
 */
(function () {
	'use strict';

	const SELECTOR_PARENT = '[data-role="parent-select"]'
		, CHILD_SELECT_DEFAULTS = Object.freeze({
			childSelectSelector: '',
			childrenUrl: '',
			valuePropertyName: 'Key',
			textPropertyName: 'Value',
			groupTextPropertyName: null,
			groupOptionsPropertyName: null,
			grouped: false,
			emptyValueText: '-------',
			autoSelectWhenSingle: true,
			disableWhenEmpty: false,
			loadingClass: 'loading',
			retainChildValue: true,
			responseObjectToChildProperty: null,
			getDisplay: function (dataObj) {
				return dataObj ? dataObj[this.textPropertyName] : '';
			},
			getGroupDisplay: function (dataObj) {
				return dataObj ? dataObj[this.groupTextPropertyName] : '';
			},
			getParamsForChildren: function (parentValue) {
				return { id: parentValue };
			},
			getOptionEnabled: function () {
				return true;
			},
			getOptionSelected: function () {
				return false;
			}
		})
		, INSTANCES = new WeakMap()
		, PENDING_REMOVALS = new Set();

	const parseBoolean = (value) => {
		if (value === true) return true;
		if (value === false) return false;
		if (typeof value === 'string') {
			return value.trim().toLowerCase() === 'true';
		}
		return false;
	};

	const getSubjects = (root = document) => {
		const subjects = [];

		if (root.nodeType === 1 && root.matches(SELECTOR_PARENT)) {
			subjects.push(root);
		}

		if (typeof root.querySelectorAll === 'function') {
			subjects.push(...root.querySelectorAll(SELECTOR_PARENT));
		}

		return subjects;
	};

	const getTargetElement = (selector) => selector ? document.querySelector(selector) : null;

	const triggerChange = (element) => {
		element.dispatchEvent(new Event('change', { bubbles: true }));
	};

	const getSelectCurrentValue = (selectElement) => {
		if (selectElement.multiple) {
			const selectedValues = Array.from(selectElement.selectedOptions).map((option) => option.value);
			return selectedValues.length ? selectedValues : null;
		}
		return selectElement.value || null;
	};

	const setSelectValue = (selectElement, value) => {
		if (selectElement.multiple) {
			const values = Array.isArray(value) ? value.map(String) : [];
			Array.from(selectElement.options).forEach((option) => {
				option.selected = values.includes(option.value);
			});
			return;
		}
		selectElement.value = value != null ? String(value) : '';
	};

	const getOptionsFromData = (element) => {
		const {
			childSelect,
			childrenUrl,
			valueProperty,
			textProperty,
			groupOptionsProperty,
			groupTextProperty,
			grouped,
			emptyText,
			autoSelectSingle,
			disableWhenEmpty,
			loadingClass
		} = element.dataset;

		const dataOptions = {};
		if (childSelect) dataOptions.childSelectSelector = childSelect;
		if (childrenUrl) dataOptions.childrenUrl = childrenUrl;
		if (valueProperty) dataOptions.valuePropertyName = valueProperty;
		if (textProperty) dataOptions.textPropertyName = textProperty;
		if (groupOptionsProperty) dataOptions.groupOptionsPropertyName = groupOptionsProperty;
		if (groupTextProperty) dataOptions.groupTextPropertyName = groupTextProperty;
		if (grouped) dataOptions.grouped = grouped;
		if (emptyText) dataOptions.emptyValueText = emptyText;
		if (autoSelectSingle) dataOptions.autoSelectWhenSingle = autoSelectSingle;
		if (disableWhenEmpty) dataOptions.disableWhenEmpty = disableWhenEmpty;
		if (loadingClass) dataOptions.loadingClass = loadingClass;
		return dataOptions;
	};

	const getValidatedOptions = (element, options = {}) => {
		const mergedOptions = { ...getOptionsFromData(element), ...options };

		if (!mergedOptions.childSelectSelector) {
			throw new Error("Error: No se especifico el selector 'data-child-select'.");
		}

		const target = getTargetElement(mergedOptions.childSelectSelector);
		if (!target) {
			console.warn(`Warning: No se encontro ningun elemento para el selector '${mergedOptions.childSelectSelector}'.`);
		}

		if (!mergedOptions.childrenUrl) {
			throw new Error("Error: No se especifico la URL 'data-children-url'.");
		}

		mergedOptions.autoSelectWhenSingle = parseBoolean(mergedOptions.autoSelectWhenSingle);
		mergedOptions.disableWhenEmpty = parseBoolean(mergedOptions.disableWhenEmpty);
		mergedOptions.grouped = parseBoolean(mergedOptions.grouped);
		mergedOptions.retainChildValue = mergedOptions.retainChildValue === undefined
			? true
			: parseBoolean(mergedOptions.retainChildValue);

		return mergedOptions;
	};

	const flushPendingRemovals = () => {
		PENDING_REMOVALS.forEach((node) => {
			if (!node.isConnected) {
				ChildSelect.destroyAll(node);
			}
			PENDING_REMOVALS.delete(node);
		});
	};

	const scheduleRemovalCheck = (node) => {
		PENDING_REMOVALS.add(node);
		queueMicrotask(flushPendingRemovals);
	};

	/**
	 * Maneja la relacion parent-child entre selects con carga remota de opciones.
	 * @class ChildSelect
	 */
	class ChildSelect {
		/**
		 * Crea una instancia del plugin para un select padre.
		 * @param {HTMLSelectElement} element - Select padre que dispara la carga.
		 * @param {Object} options - Opciones de configuracion finales.
		 */
		constructor(element, options) {
			this.subject = element;
			this.options = { ...CHILD_SELECT_DEFAULTS, ...options };
			this.target = getTargetElement(this.options.childSelectSelector);
			this.isBound = false;
			this.handleParentChange = this.handleParentChange.bind(this);
			this.handleChildChange = this.handleChildChange.bind(this);
		}

		/**
		 * Construye la opcion vacia reutilizable del select hijo.
		 * @returns {HTMLOptionElement|null}
		 */
		getEmptyValueOption() {
			const txt = this.options.emptyValueText;
			if (!txt) return null;
			if (this._cachedEmptyText === txt && this._cachedEmptyOption) {
				return this._cachedEmptyOption.cloneNode(true);
			}

			const option = document.createElement('option');
			option.value = '';
			option.textContent = txt;
			option.setAttribute('data-empty', 'true');

			this._cachedEmptyText = txt;
			this._cachedEmptyOption = option;
			return option.cloneNode(true);
		}

		/**
		 * Limpia el select hijo, agrega opcion vacia y dispara change.
		 * @returns {void}
		 */
		clearTarget() {
			if (!this.target) return;

			const emptyOpt = this.getEmptyValueOption();
			this.target.innerHTML = '';
			if (emptyOpt) this.target.appendChild(emptyOpt);

			if (this.target.multiple) {
				setSelectValue(this.target, []);
			} else {
				setSelectValue(this.target, '');
			}

			triggerChange(this.target);
		}

		setResponseProperty(data) {
			if (!this.target) return;
			if (typeof this.options.responseObjectToChildProperty !== 'string') return;
			if (!this.options.responseObjectToChildProperty) return;

			this.target.dataset[this.options.responseObjectToChildProperty] = JSON.stringify(data);
		}

		addLoadingClass() {
			if (!this.target || !this.options.loadingClass) return;
			this.target.classList.add(this.options.loadingClass);
		}

		removeLoadingClass() {
			if (!this.target || !this.options.loadingClass) return;
			this.target.classList.remove(this.options.loadingClass);
		}

		isSameValue(childValue, currentValue) {
			if (Array.isArray(childValue) && Array.isArray(currentValue)) {
				return childValue.some((value) => currentValue.includes(String(value)));
			}
			return String(childValue) === String(currentValue);
		}

		/**
		 * Genera opciones (planas o agrupadas) para el select hijo.
		 * @param {Array|Object} children - Respuesta normalizada del endpoint.
		 * @param {string|string[]|null} previousValue - Valor previo para retencion.
		 * @returns {{fragment: DocumentFragment, valueContained: boolean, valueSelected: *}}
		 */
		buildOptions(children, previousValue) {
			let valueContained = false
				, valueSelected = null;

			const fragment = document.createDocumentFragment();

			if (!this.options.grouped) {
				(children || []).forEach((child) => {
					const v = child[this.options.valuePropertyName]
						, selected = this.options.getOptionSelected(child)
						, enabled = this.options.getOptionEnabled(child)
						, option = document.createElement('option');

					option.value = v != null ? String(v) : '';
					option.textContent = this.options.getDisplay.call(this.options, child);
					if (!enabled) option.disabled = true;
					if (selected) valueSelected = v;
					fragment.appendChild(option);

					if (previousValue != null) {
						valueContained = valueContained || this.isSameValue(v, previousValue);
					}
				});

				return { fragment, valueContained, valueSelected };
			}

			const groups = new Map();
			if (this.options.groupOptionsPropertyName === null || this.options.groupTextPropertyName === null) {
				Object.keys(children || {}).forEach((key) => {
					groups.set(key, children[key] || []);
				});
			} else {
				(children || []).forEach((item) => {
					groups.set(item[this.options.groupTextPropertyName] || '', item[this.options.groupOptionsPropertyName] || []);
				});
			}

			for (const [groupName, groupChildren] of groups.entries()) {
				const optgroup = document.createElement('optgroup');
				optgroup.label = groupName || '';

				(groupChildren || []).forEach((child) => {
					const v = child[this.options.valuePropertyName]
						, selected = this.options.getOptionSelected(child)
						, enabled = this.options.getOptionEnabled(child)
						, option = document.createElement('option');

					option.value = v != null ? String(v) : '';
					option.textContent = this.options.getDisplay.call(this.options, child);
					if (!enabled) option.disabled = true;
					if (selected) valueSelected = v;
					optgroup.appendChild(option);

					if (previousValue != null) {
						valueContained = valueContained || this.isSameValue(v, previousValue);
					}
				});

				fragment.appendChild(optgroup);
			}

			return { fragment, valueContained, valueSelected };
		}

		/**
		 * Solicita opciones hijas para el valor seleccionado del padre.
		 * @param {string} parentValue - Valor actual del select padre.
		 * @returns {Promise<Array|Object>}
		 */
		async fetchChildren(parentValue) {
			const params = this.options.getParamsForChildren(parentValue) || {}
				, url = new URL(this.options.childrenUrl, window.location.href);

			Object.entries(params).forEach(([key, value]) => {
				if (value === undefined || value === null) return;
				url.searchParams.set(key, value);
			});

			const response = await fetch(url.toString(), {
				method: 'GET',
				headers: {
					'Accept': 'application/json'
				}
			});

			if (!response.ok) {
				throw new Error(`Error al obtener hijos (${response.status}).`);
			}

			return response.json();
		}

		/**
		 * Maneja el cambio del select padre, descarga datos y actualiza el hijo.
		 * @returns {Promise<void>}
		 */
		async handleParentChange() {
			if (!this.target) return;

			const parentValue = this.subject.value
				, currentChildValue = getSelectCurrentValue(this.target)
				, previousValue = currentChildValue || this.target.dataset.childselectPreValue || null;

			if (previousValue) {
				this.target.dataset.childselectPreValue = Array.isArray(previousValue)
					? JSON.stringify(previousValue)
					: String(previousValue);
			}

			if (!parentValue) {
				this.clearTarget();
				if (this.options.disableWhenEmpty) this.target.disabled = true;
				return;
			}

			this.addLoadingClass();

			try {
				const children = await this.fetchChildren(parentValue);
				this.clearTarget();

				const hasChildren = Array.isArray(children)
					? children.length > 0
					: Boolean(children && Object.keys(children).length);

				if (!hasChildren) {
					if (this.options.disableWhenEmpty) this.target.disabled = true;
					this.setResponseProperty(null);
					return;
				}

				this.setResponseProperty(children);
				this.target.disabled = false;

				const { fragment, valueContained, valueSelected } = this.buildOptions(children, previousValue);
				this.target.appendChild(fragment);

				if (this.options.autoSelectWhenSingle && Array.isArray(children) && children.length === 1) {
					setSelectValue(this.target, children[0][this.options.valuePropertyName]);
					triggerChange(this.target);
					return;
				}

				if (this.options.retainChildValue && valueContained && previousValue != null) {
					setSelectValue(this.target, previousValue);
					triggerChange(this.target);
					return;
				}

				if (!this.options.retainChildValue && valueSelected != null) {
					setSelectValue(this.target, valueSelected);
					triggerChange(this.target);
				}
			} catch (error) {
				console.warn(error && error.message ? error.message : 'Error al cargar children para ChildSelect.');
			} finally {
				this.removeLoadingClass();
			}
		}

		/**
		 * Persiste el ultimo valor del hijo para intentar retenerlo.
		 * @returns {void}
		 */
		handleChildChange() {
			if (!this.target) return;
			const childValue = getSelectCurrentValue(this.target);
			if (!childValue) return;
			this.target.dataset.childselectPreValue = Array.isArray(childValue)
				? JSON.stringify(childValue)
				: String(childValue);
		}

		/**
		 * Registra listeners para sincronizar parent y child.
		 * @returns {void}
		 */
		bind() {
			if (this.isBound || !this.target) return;
			this.subject.addEventListener('change', this.handleParentChange);
			this.target.addEventListener('change', this.handleChildChange);
			this.isBound = true;
		}

		/**
		 * Elimina listeners y desmonta la instancia actual.
		 * @returns {void}
		 */
		destroy() {
			if (!this.isBound) return;
			this.subject.removeEventListener('change', this.handleParentChange);
			if (this.target) {
				this.target.removeEventListener('change', this.handleChildChange);
			}
			this.isBound = false;
			INSTANCES.delete(this.subject);
		}

		/**
		 * Inicializa una instancia en un select padre.
		 * @param {HTMLElement} element - Select padre a inicializar.
		 * @param {Object} [options={}] - Opciones que sobreescriben data-*.
		 * @returns {ChildSelect}
		 */
		static init(element, options = {}) {
			if (!(element instanceof HTMLSelectElement)) {
				throw new Error('Error: ChildSelect.init requiere un <select> padre.');
			}

			const currentInstance = INSTANCES.get(element);
			if (currentInstance) return currentInstance;

			const validatedOptions = getValidatedOptions(element, options)
				, instance = new ChildSelect(element, validatedOptions);

			INSTANCES.set(element, instance);
			instance.bind();
			return instance;
		}

		/**
		 * Obtiene la instancia asociada a un select padre.
		 * @param {HTMLElement} element - Select padre.
		 * @returns {ChildSelect|null}
		 */
		static getInstance(element) {
			if (!(element instanceof HTMLSelectElement)) return null;
			return INSTANCES.get(element) || null;
		}

		/**
		 * Destruye la instancia de un select padre.
		 * @param {HTMLElement} element - Select padre.
		 * @returns {boolean}
		 */
		static destroy(element) {
			const instance = ChildSelect.getInstance(element);
			if (!instance) return false;
			instance.destroy();
			return true;
		}

		/**
		 * Inicializa todos los selects padre dentro de una raiz.
		 * @param {ParentNode|Element|Document} [root=document] - Nodo raiz de busqueda.
		 * @param {Object} [options={}] - Opciones compartidas.
		 * @returns {ChildSelect[]}
		 */
		static initAll(root = document, options = {}) {
			return getSubjects(root).map((element) => ChildSelect.init(element, options));
		}

		/**
		 * Destruye todas las instancias encontradas en una raiz.
		 * @param {ParentNode|Element|Document} [root=document] - Nodo raiz de busqueda.
		 * @returns {number}
		 */
		static destroyAll(root = document) {
			return getSubjects(root).reduce((destroyedCount, element) => {
				return ChildSelect.destroy(element) ? destroyedCount + 1 : destroyedCount;
			}, 0);
		}
	}

	const startAutoInit = () => {
		ChildSelect.initAll(document);

		const observer = new MutationObserver((mutations) => {
			mutations.forEach((mutation) => {
				mutation.addedNodes.forEach((node) => {
					if (node.nodeType !== 1) return;
					PENDING_REMOVALS.delete(node);
					ChildSelect.initAll(node);
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

	window.ChildSelect = ChildSelect;
})();