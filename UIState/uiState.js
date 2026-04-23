/**
 * @fileoverview Plugin nativo para previsualizar estados de UI en componentes.
 * @module UIState
 * @version 1.0
 * @since 2026
 * @author Samuel Montenegro
 * @license MIT
 * @copyright (c) 2026 Samuel Montenegro
 */
(function () {
    'use strict';

    // ─── Constantes ──────────────────────────────────────────────────────────────

    const SELECTOR_SUBJECT = '[data-ui-state-host]'
        , SELECTOR_TRIGGER = '[data-ui-state-trigger]'
        , STATE_ATTRIBUTE = 'data-ui-state-current'
        /**
         * Registro de instancias por host.
         * @type {WeakMap<HTMLElement, UIState>}
         */
        , INSTANCES = new WeakMap()
        /**
         * Nodos removidos pendientes de limpieza diferida.
         * @type {Set<Element>}
         */
        , PENDING_REMOVALS = new Set();

    /**
     * Defaults de configuracion para UIState.
     * @type {Object}
     */
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

    // ─── Helpers ────────────────────────────────────────────────────

    /**
     * Parsea lista CSV en arreglo de tokens no vacios.
     * @param {string|undefined|null} value Cadena fuente.
     * @returns {string[]}
     */
    const parseList = (value) => {
        if (!value || typeof value !== 'string') return [];
        return value
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean);
    };

    /**
     * Parsea clases CSS separadas por espacio.
     * @param {string|undefined|null} value Cadena de clases.
     * @returns {string[]}
     */
    const parseClassTokens = (value) => {
        if (!value || typeof value !== 'string') return [];
        return value
            .trim()
            .split(/\s+/)
            .map((item) => item.trim())
            .filter(Boolean);
    };

    /**
     * Obtiene hosts compatibles dentro de un root.
     * @param {ParentNode|Element|Document} [root=document] Nodo raiz.
     * @returns {HTMLElement[]}
     */
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

    /**
     * Reemplaza placeholders `{{key}}` dentro de una plantilla HTML.
     *
     * @param {string} html Plantilla fuente.
     * @param {Object<string, *>} payload Datos para interpolar.
     * @returns {string} HTML final interpolado.
     */
    const interpolateTemplate = (html, payload) => {
        if (!html || typeof html !== 'string') return '';
        if (!payload || typeof payload !== 'object') return html;

        return html.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, function (_match, key) {
            return payload[key] == null ? '' : String(payload[key]);
        });
    };

    /**
     * Lee opciones declarativas (`data-ui-state-*`) del host.
     * @param {HTMLElement} element Host del componente.
     * @returns {Object}
     */
    const getOptionsFromData = (element) => {
        const options = {}
            , stateClassMap = {};

        /**
         * Asigna opcion de texto si el valor existe y no esta vacio.
         *
         * @param {string} key Clave destino en `options`.
         * @param {string|undefined} value Valor crudo desde dataset.
         * @param {Function} [transform] Transformador opcional.
         * @returns {void}
         */
        const setTrimmedOption = (key, value, transform) => {
            if (typeof value !== 'string') return;
            const trimmedValue = value.trim();
            if (!trimmedValue) return;
            options[key] = typeof transform === 'function' ? transform(trimmedValue) : trimmedValue;
        };

        setTrimmedOption('baseState', element.dataset.uiStateBase);
        setTrimmedOption('classPrefix', element.dataset.uiStateClassPrefix);
        setTrimmedOption('disableOnStates', element.dataset.uiStateDisableOn, parseList);
        setTrimmedOption('interactiveSelector', element.dataset.uiStateInteractiveSelector);

        Object.keys(element.dataset).forEach((dataKey) => {
            if (!dataKey.startsWith('uiStateClass') || dataKey === 'uiStateClassPrefix') return;

            const stateKey = dataKey.slice('uiStateClass'.length)
                , stateName = stateKey ? stateKey.charAt(0).toLowerCase() + stateKey.slice(1) : ''
                , classValue = element.dataset[dataKey];

            if (!stateName || typeof classValue !== 'string' || !classValue.trim()) return;
            stateClassMap[stateName] = classValue.trim();
        });

        Object.keys(stateClassMap).length > 0 && (options.stateClassMap = stateClassMap);

        return options;
    };

    // ─── Typedef ──────────────────────────────────────────────────────────────────

    /**
     * Opciones publicas de UIState.
     * @typedef {Object} UIStateOptions
     * @property {string} [baseState='default'] Estado base de restauracion.
     * @property {string} [classPrefix='is-state-'] Prefijo de clases por estado.
     * @property {Object<string,string>} [stateClassMap={}] Mapa estado->clase(s).
     * @property {string[]} [disableOnStates=['loading','disabled']] Estados que bloquean controles interactivos.
     * @property {string} [interactiveSelector='button, a, input, select, textarea'] Selector de nodos interactivos.
     * @property {Object<string,(string|Function)>} [templates={}] Templates por estado.
     * @property {(detail:Object)=>void} [beforeChange] Hook previo al cambio.
     * @property {(detail:Object)=>void} [afterChange] Hook posterior al cambio.
     * @property {(detail:Object)=>void} [afterRestore] Hook posterior a restauracion.
     */

    // ─── Clase principal ──────────────────────────────────────────────────────────

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
     * @fires before.plugin.uiState
     * @fires changed.plugin.uiState
     * @fires restored.plugin.uiState
     */
    class UIState {
        /**
         * Crea una instancia para administrar transiciones de estado visual en un componente.
         * @param {HTMLElement} element Componente que recibira cambios de estado.
         * @param {UIStateOptions} options Opciones de configuración de la instancia.
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
         *
         * El cambio puede ser cancelado por listeners de `before.plugin.uiState`.
         *
         * @param {string} state Estado objetivo.
         * @param {Object} [payload={}] Datos opcionales para template/evento.
         * @returns {boolean} `true` cuando el estado se aplica; `false` si se cancela o es invalido.
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
         * Tambien limpia clases de estado y re-habilita interaccion interna.
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

        // ── API estática ────────────────────────────────────────────────────────

        /**
         * Inicializa o reutiliza una instancia de UIState para un host.
         * @param {HTMLElement} element Elemento host.
         * @param {Object} [options={}] Opciones de configuración de la instancia.
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

    /**
     * Delega cambios de estado declarativos desde triggers `data-ui-state-trigger`.
     * @param {MouseEvent} evt Evento click delegado.
     * @returns {void}
     */
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
 
	// ─── ObserverDispatcher ───────────────────────────────────────────────────────

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

            return { register, resolveRoot };
        })();
    }

    // ─── Gestión de remociones diferidas ─────────────────────────────────────────

    /**
     * Limpia instancias cuyos nodos fueron removidos del DOM.
     * @returns {void}
     */
    const flushPendingRemovals = () => {
        PENDING_REMOVALS.forEach((node) => {
            if (!node.isConnected) {
                UIState.destroyAll(node);
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

    // ─── Handler de mutaciones DOM ────────────────────────────────────────────────

    const uiStateDomHandler = (mutations) => {
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
    };

	// ─── Auto-init ────────────────────────────────────────────────────────────────

    const startAutoInit = () => {
        const root = window.Plugins.ObserverDispatcher.resolveRoot('ui-state');  
        UIState.initAll(root);
        root.addEventListener('click', onTriggerClick);
        // Usar ObserverDispatcher para registrar el handler solo sobre el root adecuado
        window.Plugins.ObserverDispatcher.register('ui-state', uiStateDomHandler);
    };

    document.readyState === 'loading'
        ? document.addEventListener('DOMContentLoaded', startAutoInit, { once: true })
        : startAutoInit();

    window.Plugins.UIState = UIState;
})();
