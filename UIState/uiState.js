/**
 * @fileoverview Plugin nativo para previsualizar estados de UI en componentes.
 * @version 1.0
 * @since 2026
 * @author Samuel Montenegro
 * @module UIState
 */
(function () {
    'use strict';

    const SELECTOR_SUBJECT = '[data-ui-state-host]'
        , SELECTOR_TRIGGER = '[data-ui-state-trigger]'
        , STATE_ATTRIBUTE = 'data-ui-state-current'
        , INSTANCES = new WeakMap()
        , PENDING_REMOVALS = new Set();

    const UI_STATE_DEFAULTS = Object.freeze({
        baseState: 'default',
        classPrefix: 'is-state-',
        stateClassMap: {},
        disableOnStates: ['loading', 'disabled'],
        interactiveSelector: 'button, a, input, select, textarea',
        templates: {},
        beforeChange: function () { },
        afterChange: function () { },
        afterRestore: function () { },
    });

    const parseList = (value) => {
        if (!value || typeof value !== 'string') return [];
        return value
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean);
    };

    const parseClassTokens = (value) => {
        if (!value || typeof value !== 'string') return [];
        return value
            .trim()
            .split(/\s+/)
            .map((item) => item.trim())
            .filter(Boolean);
    };

    const getSubjects = (root = document) => {
        const subjects = [];

        if (root.nodeType === 1 && root.matches(SELECTOR_SUBJECT)) {
            subjects.push(root);
        }

        if (typeof root.querySelectorAll === 'function') {
            subjects.push(...root.querySelectorAll(SELECTOR_SUBJECT));
        }

        return subjects;
    };

    const flushPendingRemovals = () => {
        PENDING_REMOVALS.forEach((node) => {
            if (!node.isConnected) {
                UIState.destroyAll(node);
            }
            PENDING_REMOVALS.delete(node);
        });
    };

    const scheduleRemovalCheck = (node) => {
        PENDING_REMOVALS.add(node);
        queueMicrotask(flushPendingRemovals);
    };

    const interpolateTemplate = (html, payload) => {
        if (!html || typeof html !== 'string') return '';
        if (!payload || typeof payload !== 'object') return html;

        return html.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, function (_match, key) {
            return payload[key] == null ? '' : String(payload[key]);
        });
    };

    const getOptionsFromData = (element) => {
        const options = {}
            , stateClassMap = {};

        if (typeof element.dataset.uiStateBase === 'string' && element.dataset.uiStateBase.trim()) {
            options.baseState = element.dataset.uiStateBase.trim();
        }

        if (typeof element.dataset.uiStateClassPrefix === 'string' && element.dataset.uiStateClassPrefix.trim()) {
            options.classPrefix = element.dataset.uiStateClassPrefix.trim();
        }

        if (typeof element.dataset.uiStateDisableOn === 'string' && element.dataset.uiStateDisableOn.trim()) {
            options.disableOnStates = parseList(element.dataset.uiStateDisableOn);
        }

        if (typeof element.dataset.uiStateInteractiveSelector === 'string' && element.dataset.uiStateInteractiveSelector.trim()) {
            options.interactiveSelector = element.dataset.uiStateInteractiveSelector.trim();
        }

        Object.keys(element.dataset).forEach((dataKey) => {
            if (!dataKey.startsWith('uiStateClass') || dataKey === 'uiStateClassPrefix') return;

            const stateKey = dataKey.slice('uiStateClass'.length)
                , stateName = stateKey ? stateKey.charAt(0).toLowerCase() + stateKey.slice(1) : ''
                , classValue = element.dataset[dataKey];

            if (!stateName || typeof classValue !== 'string' || !classValue.trim()) return;
            stateClassMap[stateName] = classValue.trim();
        });

        if (Object.keys(stateClassMap).length > 0) {
            options.stateClassMap = stateClassMap;
        }

        return options;
    };

    /**
     * Controlador de estados visuales para un componente de UI.
     *
     * Flujo principal:
     * - Captura HTML base del host en el primer cambio.
     * - Resuelve template/clase para el estado solicitado.
     * - Actualiza interactividad interna en estados configurados.
     * - Emite eventos para extensibilidad externa.
     *
     * @class UIState
     */
    class UIState {
        /**
         * @param {HTMLElement} element Componente que recibira cambios de estado.
         * @param {Object} options Opciones de inicializacion.
         * @param {string} [options.baseState='default'] Estado base para restauracion.
         * @param {string} [options.classPrefix='is-state-'] Prefijo para clases por estado.
         * @param {Object<string,string>} [options.stateClassMap={}] Mapa opcional estado->clase(s), admite multiples clases separadas por espacio.
         * @param {string[]} [options.disableOnStates=['loading','disabled']] Estados que deshabilitan controles internos.
         * @param {string} [options.interactiveSelector='button, a, input, select, textarea'] Selector de nodos interactivos.
         * @param {Object<string,string|Function>} [options.templates={}] Templates por estado.
         * @param {Function} [options.beforeChange] Hook previo al cambio de estado.
         * @param {Function} [options.afterChange] Hook posterior al cambio de estado.
         * @param {Function} [options.afterRestore] Hook posterior a restauracion.
         */
        constructor(element, options) {
            this.subject = element;
            this.options = {
                ...UI_STATE_DEFAULTS,
                ...options,
                stateClassMap: {
                    ...UI_STATE_DEFAULTS.stateClassMap,
                    ...(options && options.stateClassMap ? options.stateClassMap : {}),
                },
                templates: {
                    ...UI_STATE_DEFAULTS.templates,
                    ...(options && options.templates ? options.templates : {}),
                },
            };
            this.baseHtml = null;
            this.currentState = this.options.baseState;
            this.appliedClasses = new Set();
        }

        /**
         * Guarda el HTML inicial del host para poder restaurarlo luego.
         * @returns {void}
         */
        ensureBaseHtml() {
            if (this.baseHtml === null) {
                this.baseHtml = this.subject.innerHTML;
            }
        }

        /**
         * Habilita o deshabilita elementos interactivos segun el estado actual.
         * @param {boolean} disabled Indica si los controles deben quedar bloqueados.
         * @returns {void}
         */
        setInteractiveDisabled(disabled) {
            const nodes = this.subject.querySelectorAll(this.options.interactiveSelector);
            nodes.forEach((node) => {
                if (node instanceof HTMLButtonElement || node instanceof HTMLInputElement || node instanceof HTMLSelectElement || node instanceof HTMLTextAreaElement) {
                    node.disabled = disabled;
                    return;
                }

                if (node instanceof HTMLAnchorElement) {
                    if (disabled) {
                        node.setAttribute('aria-disabled', 'true');
                        node.tabIndex = -1;
                    } else {
                        node.removeAttribute('aria-disabled');
                        node.removeAttribute('tabindex');
                    }
                }
            });
        }

        /**
         * Limpia las clases aplicadas por estados previos.
         * @returns {void}
         */
        clearStateClasses() {
            this.appliedClasses.forEach((className) => {
                this.subject.classList.remove(className);
            });
            this.appliedClasses.clear();
        }

        /**
         * Resuelve clase(s) CSS del estado solicitado.
         * @param {string} state Estado objetivo.
         * @returns {string}
         */
        resolveClassForState(state) {
            if (this.options.stateClassMap && this.options.stateClassMap[state]) {
                return this.options.stateClassMap[state];
            }
            return this.options.classPrefix + state;
        }

        /**
         * Busca template configurado por atributo data para un estado.
         * @param {string} state Estado objetivo.
         * @returns {string}
         */
        resolveTemplateFromSelector(state) {
            const dataKey = 'uiTemplate' + state.charAt(0).toUpperCase() + state.slice(1)
                , selector = this.subject.dataset[dataKey];

            if (!selector) return '';

            const templateNode = document.querySelector(selector);
            if (!templateNode) return '';

            if (templateNode instanceof HTMLTemplateElement) {
                return templateNode.innerHTML;
            }

            return templateNode.innerHTML;
        }

        /**
         * Resuelve HTML final a renderizar para un estado.
         * Prioridad: options.templates -> data-ui-template-* -> payload.html.
         * @param {string} state Estado objetivo.
         * @param {Object} payload Datos de interpolacion.
         * @returns {string}
         */
        resolveTemplate(state, payload) {
            const configuredTemplate = this.options.templates[state];
            if (typeof configuredTemplate === 'function') {
                return interpolateTemplate(String(configuredTemplate(payload, this.subject) || ''), payload);
            }

            if (typeof configuredTemplate === 'string' && configuredTemplate) {
                return interpolateTemplate(configuredTemplate, payload);
            }

            const htmlFromSelector = this.resolveTemplateFromSelector(state);
            if (htmlFromSelector) {
                return interpolateTemplate(htmlFromSelector, payload);
            }

            if (payload && typeof payload.html === 'string') {
                return interpolateTemplate(payload.html, payload);
            }

            return '';
        }

        /**
         * Cambia el estado visual del componente y opcionalmente renderiza template.
         * @param {string} state Estado objetivo.
         * @param {Object} [payload={}] Datos opcionales para template/evento.
         * @returns {boolean}
         */
        setState(state, payload = {}) {
            if (typeof state !== 'string' || !state.trim()) return false;

            const nextState = state.trim()
                , previousState = this.currentState
                , detail = {
                    state: nextState,
                    previousState,
                    payload,
                    element: this.subject,
                }
                , beforeEvent = new CustomEvent('before.plugin.uiState', {
                    cancelable: true,
                    detail,
                });

            this.options.beforeChange && this.options.beforeChange(detail);
            if (!this.subject.dispatchEvent(beforeEvent)) {
                return false;
            }

            this.ensureBaseHtml();

            const html = this.resolveTemplate(nextState, payload);
            if (html) {
                this.subject.innerHTML = html;
            }

            this.clearStateClasses();
            const className = this.resolveClassForState(nextState);
            if (className) {
                const classTokens = parseClassTokens(className);
                if (classTokens.length > 0) {
                    this.subject.classList.add(...classTokens);
                    classTokens.forEach((token) => this.appliedClasses.add(token));
                }
            }

            const mustDisable = Array.isArray(this.options.disableOnStates) && this.options.disableOnStates.includes(nextState);
            this.setInteractiveDisabled(mustDisable);

            this.currentState = nextState;
            this.subject.setAttribute(STATE_ATTRIBUTE, nextState);

            this.options.afterChange && this.options.afterChange(detail);
            this.subject.dispatchEvent(new CustomEvent('changed.plugin.uiState', {
                detail,
            }));

            return true;
        }

        /**
         * Restaura HTML y estado base del componente.
         * @returns {void}
         */
        restore() {
            const detail = {
                previousState: this.currentState,
                state: this.options.baseState,
                element: this.subject,
            };

            if (this.baseHtml !== null) {
                this.subject.innerHTML = this.baseHtml;
            }

            this.clearStateClasses();
            this.setInteractiveDisabled(false);

            this.currentState = this.options.baseState;
            this.subject.setAttribute(STATE_ATTRIBUTE, this.currentState);

            this.options.afterRestore && this.options.afterRestore(detail);
            this.subject.dispatchEvent(new CustomEvent('restored.plugin.uiState', {
                detail,
            }));
        }

        /**
         * Destruye la instancia y limpia su registro interno.
         * @returns {void}
         */
        destroy() {
            this.restore();
            INSTANCES.delete(this.subject);
        }

        /**
         * Inicializa o reutiliza una instancia de UIState para un host.
         * @param {HTMLElement} element Elemento host.
         * @param {Object} [options={}] Opciones de inicializacion.
         * @returns {UIState}
         */
        static init(element, options = {}) {
            if (!(element instanceof HTMLElement)) {
                throw new Error('Error: UIState.init requiere un HTMLElement.');
            }

            const currentInstance = INSTANCES.get(element);
            if (currentInstance) return currentInstance;

            const mergedOptions = { ...getOptionsFromData(element), ...options }
                , instance = new UIState(element, mergedOptions);

            INSTANCES.set(element, instance);
            element.setAttribute(STATE_ATTRIBUTE, instance.currentState);
            return instance;
        }

        /**
         * Obtiene la instancia asociada a un host.
         * @param {HTMLElement} element Elemento host.
         * @returns {UIState|null}
         */
        static getInstance(element) {
            if (!(element instanceof HTMLElement)) return null;
            return INSTANCES.get(element) || null;
        }

        /**
         * Destruye la instancia asociada a un host.
         * @param {HTMLElement} element Elemento host.
         * @returns {boolean}
         */
        static destroy(element) {
            const instance = UIState.getInstance(element);
            if (!instance) return false;
            instance.destroy();
            return true;
        }

        /**
         * Inicializa todas las coincidencias dentro de un contenedor.
         * @param {ParentNode|Element|Document} [root=document] Raiz de busqueda.
         * @param {Object} [options={}] Opciones compartidas.
         * @returns {UIState[]}
         */
        static initAll(root = document, options = {}) {
            return getSubjects(root).map((element) => UIState.init(element, options));
        }

        /**
         * Destruye todas las instancias encontradas dentro de un contenedor.
         * @param {ParentNode|Element|Document} [root=document] Raiz de busqueda.
         * @returns {number}
         */
        static destroyAll(root = document) {
            return getSubjects(root).reduce((destroyedCount, element) => {
                return UIState.destroy(element) ? destroyedCount + 1 : destroyedCount;
            }, 0);
        }
    }

    const onTriggerClick = (evt) => {
        const trigger = evt.target.closest(SELECTOR_TRIGGER);
        if (!(trigger instanceof HTMLElement)) return;

        const targetSelector = trigger.getAttribute('data-ui-state-target')
            , nextState = trigger.getAttribute('data-ui-state') || '';

        if (!targetSelector || !nextState) return;

        const host = document.querySelector(targetSelector);
        if (!(host instanceof HTMLElement)) return;

        evt.preventDefault();

        const instance = UIState.init(host)
            , payload = {
                message: trigger.getAttribute('data-ui-state-message') || '',
                html: trigger.getAttribute('data-ui-state-html') || '',
                trigger,
            }
            , normalized = nextState.trim().toLowerCase();

        if (['restore', 'default', 'base', 'initial'].includes(normalized)) {
            instance.restore();
            return;
        }

        instance.setState(nextState, payload);
    };

    const startAutoInit = () => {
        UIState.initAll(document);

        document.addEventListener('click', onTriggerClick);

        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType !== 1) return;
                    PENDING_REMOVALS.delete(node);
                    UIState.initAll(node);
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

    window.UIState = UIState;
})();
