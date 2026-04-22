/**
 * @fileoverview Plugin nativo para transformar un modal en un formulario por pasos.
 * @module ModalSteps
 * @version 3.0
 * @since 2026
 * @author Samuel Montenegro
 * @license MIT
 * @copyright (c) 2026 Samuel Montenegro
 */
(function () {
    'use strict';

    const CLASS_NAME_LOADING = 'm-loading'
        , ATTR_DIALOG_SRC = 'data-dialog-src'
        , SELECTOR_SUBJECT = '[role="dialog"][data-dialog="steps"],dialog[data-dialog="steps"]'
        , SELECTOR_DIALOG_STEP_TARGET = '[data-dialog="main"]'
        , EVENT_HIDDEN_NATIVE = 'hidden.plugin.modalStep'
        , EVENT_SHOWN_NATIVE = 'shown.plugin.modalStep'
        /**
         * Registro de instancias por modal.
         * @type {WeakMap<HTMLElement, ModalSteps>}
         */
        , INSTANCES = new WeakMap()
        /**
         * Nodos removidos pendientes de limpieza diferida.
         * @type {Set<Element>}
         */
        , PENDING_REMOVALS = new Set();

    /**
     * Defaults de configuracion de ModalSteps.
     * @type {Object}
     */
    const STEPS_DIALOG_DEFAULTS = Object.freeze({
        reloadOnNoContent: true,
        strictSameOrigin: true,
        allowedSubmitMethods: ['GET', 'POST'],
        jsonResponseHandler: function () { },
        after201: function () { },
        after204: function () { },
    });

    /**
     * Normaliza valores declarativos a booleanos.
     * @param {unknown} value Valor fuente.
     * @returns {boolean|undefined}
     */
    const parseBoolean = (value) => {
        if (value === undefined) return undefined;
        if (typeof value === 'boolean') return value;
        const normalized = String(value).trim().toLowerCase();
        if (['', 'true', '1', 'yes', 'on'].includes(normalized)) return true;
        if (['false', '0', 'no', 'off'].includes(normalized)) return false;
        return undefined;
    };

    /**
     * Convierte HTML/string/nodos a una lista de nodos renderizables.
     * @param {string|Node|NodeList|Array<Node>|unknown} html Fuente de contenido.
     * @returns {Node[]}
     */
    const toElements = (html) => {
        if (!html) return [];
        if (typeof html === 'string') {
            const template = document.createElement('template');
            template.innerHTML = html;
            return Array.from(template.content.childNodes);
        }
        if (html instanceof Node) return [html];
        if (html instanceof NodeList || Array.isArray(html)) return Array.from(html);
        return [];
    };

    /**
     * Parsea body de respuesta en modo JSON o texto.
     * @param {Response} response Respuesta fetch.
     * @returns {Promise<{isJson:boolean,data:any,text:string}>}
     */
    const parseResponseBody = async (response) => {
        const contentType = response.headers.get('Content-Type') || ''
            , isJson = contentType.toLowerCase().includes('json');

        if (isJson) {
            const data = await response.json().catch(() => null);
            return { isJson, data, text: '' };
        }

        const text = await response.text().catch(() => '');
        return { isJson, data: null, text };
    };

    /**
     * Normaliza metodo HTTP en mayusculas.
     * @param {unknown} value Metodo fuente.
     * @param {string} [fallback='POST'] Metodo fallback.
     * @returns {string}
     */
    const normalizeMethod = (value, fallback = 'POST') => {
        const method = String(value || fallback).trim().toUpperCase();
        return method || fallback;
    };

    /**
     * Resuelve metodos HTTP permitidos para submit de pasos.
     *
    * @param {Object} options Opciones de configuración de la instancia.
     * @returns {string[]} Lista normalizada de metodos permitidos.
     */
    const getAllowedMethods = (options) => {
        if (!options || !Array.isArray(options.allowedSubmitMethods)) return ['GET', 'POST'];
        const normalized = options.allowedSubmitMethods
            .map((method) => normalizeMethod(method, ''))
            .filter(Boolean);
        return normalized.length > 0 ? normalized : ['GET', 'POST'];
    };

    const toSafeUrl = (rawUrl, strictSameOrigin) => {
        const url = new URL(rawUrl, window.location.href)
            , protocol = url.protocol.toLowerCase();

        if (!['http:', 'https:'].includes(protocol)) {
            throw new Error('Error: protocolo de URL no soportado para ModalSteps.');
        }

        if (strictSameOrigin && url.origin !== window.location.origin) {
            throw new Error('Error: URL de otro origen bloqueada por strictSameOrigin.');
        }

        return url;
    };

    /**
     * Convierte payload arbitrario a FormData utilizable por fetch.
     * @param {FormData|Object<string,any>|unknown} value Valor fuente.
     * @param {HTMLFormElement} form Formulario fallback.
     * @returns {FormData}
     */
    const toFormData = (value, form) => {
        if (value instanceof FormData) return value;
        if (value && typeof value === 'object') {
            const plainObject = Object.getPrototypeOf(value) === Object.prototype;
            if (plainObject) {
                const data = new FormData();
                Object.keys(value).forEach((key) => {
                    const raw = value[key];
                    if (Array.isArray(raw)) {
                        raw.forEach((item) => data.append(key, item == null ? '' : String(item)));
                        return;
                    }
                    data.append(key, raw == null ? '' : String(raw));
                });
                return data;
            }
        }
        return new FormData(form);
    };

    /**
     * Construye request final desde un formulario de step.
     * @param {HTMLFormElement} form Formulario del step actual.
     * @param {(function(HTMLFormElement):(FormData|Object<string,any>))|null} submitDataGetter Builder custom opcional.
     * @param {Object} options Opciones de instancia.
     * @returns {{action:string,requestInit:RequestInit}}
     */
    const buildRequestFromForm = (form, submitDataGetter, options) => {
        const action = form.getAttribute('action') || window.location.href
            , method = normalizeMethod(form.getAttribute('method') || 'POST')
            , rawData = typeof submitDataGetter === 'function'
                ? submitDataGetter(form)
                : new FormData(form)
            , formData = toFormData(rawData, form)
            , allowedMethods = getAllowedMethods(options)
            , safeMethod = allowedMethods.includes(method) ? method : 'POST'
            , safeActionUrl = toSafeUrl(action, options && options.strictSameOrigin !== false)
            , isGetMethod = safeMethod === 'GET';

        if (!isGetMethod) {
            return {
                action: safeActionUrl.toString(),
                requestInit: {
                    method: safeMethod,
                    body: formData,
                    credentials: 'same-origin',
                },
            };
        }

        const targetUrl = new URL(safeActionUrl.toString())
            , params = new URLSearchParams(targetUrl.search);

        for (const [key, value] of formData.entries()) {
            params.append(key, typeof value === 'string' ? value : value.name || '');
        }

        targetUrl.search = params.toString();

        return {
            action: targetUrl.toString(),
            requestInit: {
                method: 'GET',
                credentials: 'same-origin',
            },
        };
    };

    /**
     * Extrae config de step request desde el detail de un evento custom.
     * @param {Event} evt Evento fuente.
     * @returns {{url:string,requestInit:RequestInit}|null}
     */
    const parseStepRequestFromEvent = (evt) => {
        const detail = evt && evt.detail ? evt.detail : null;
        if (!detail) return null;

        if (typeof detail.stepUrl === 'string' && detail.stepUrl.trim()) {
            return {
                url: detail.stepUrl,
                requestInit: { method: 'GET', credentials: 'same-origin' },
            };
        }

        if (detail.stepRequest && typeof detail.stepRequest === 'object') {
            if (typeof detail.stepRequest.url !== 'string' || !detail.stepRequest.url.trim()) {
                return null;
            }
            const init = detail.stepRequest.requestInit && typeof detail.stepRequest.requestInit === 'object'
                ? { ...detail.stepRequest.requestInit }
                : {};
            return {
                url: detail.stepRequest.url,
                requestInit: {
                    credentials: 'same-origin',
                    ...init,
                },
            };
        }

        return null;
    };

    /**
     * Obtiene modales de pasos compatibles dentro de un root.
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
     * Extrae opciones declarativas (`data-dialog-*`) para el modal de pasos.
     *
     * @param {HTMLElement} element Contenedor del plugin.
     * @returns {Object} Opciones parciales obtenidas desde dataset.
     */
    const getOptionsFromData = (element) => {
        const reloadOnNoContent = parseBoolean(element.dataset.dialogReloadOnNoContent)
            , options = {};

        reloadOnNoContent !== undefined && (options.reloadOnNoContent = reloadOnNoContent);

        return options;
    };

    /**
     * Gestiona un modal de pasos con carga remota de HTML y submit via fetch.
     *
     * Flujo resumido:
     * 1. Al mostrarse el modal, obtiene y renderiza el primer paso.
     * 2. Intercepta submit de formularios internos para cargar el siguiente paso.
     * 3. Maneja respuestas por estado HTTP (200/201/204/400/418/fallback).
     * 4. Al ocultarse, limpia contenido temporal del contenedor de pasos.
     *
     * @class ModalSteps
     */
    class ModalSteps {
        /**
         * Crea una instancia del plugin sobre un modal.
         * @param {HTMLElement} element Elemento modal sujeto.
         * @param {Object} options Opciones de configuración de la instancia.
         */
        constructor(element, options) {
            this.subject = element;
            this.stepsTarget = element.querySelector(SELECTOR_DIALOG_STEP_TARGET);
            this.options = { ...STEPS_DIALOG_DEFAULTS, ...options };
            this.submitDataGetter = null;
            this.getFirstStepRequest = null;
            this.isBound = false;
            this.handleSubmit = this.handleSubmit.bind(this);
            this.handleHidden = this.handleHidden.bind(this);
            this.handleShown = this.handleShown.bind(this);
        }

        /**
         * Reemplaza el contenido del contenedor principal de pasos.
         * @param {string|Node|NodeList|Array<Node>} html HTML o nodos a inyectar.
         * @returns {void}
         */
        replaceContent(html) {
            if (!this.stepsTarget) return;
            const nodes = toElements(html);
            this.stepsTarget.replaceChildren(...nodes);
        }

        /**
         * Delega el manejo de respuestas JSON al callback configurado.
         * @param {*} data Datos JSON recibidos.
         * @param {number} status Codigo HTTP asociado.
         * @returns {void}
         */
        handleJson(data, status) {
            this.options.jsonResponseHandler && this.options.jsonResponseHandler(data, status, this.subject);
        }

        /**
         * Procesa y renderiza una respuesta HTML en el modal.
         * @param {string|Node|NodeList|Array<Node>} html HTML o nodos a procesar.
         * @returns {void}
         */
        handleHtml(html) {
            if (!html) return;
            this.replaceContent(html);
            this.focusFirstField();
        }

        /**
         * Enfoca el primer control interactivo del paso actual.
         * @returns {void}
         */
        focusFirstField() {
            if (!this.stepsTarget) return;
            const firstField = this.stepsTarget.querySelector('input:not([type="hidden"]), select, textarea, button');
            if (firstField instanceof HTMLElement) {
                firstField.focus();
            }
        }

        /**
         * Activa o desactiva estado de carga visual y bloqueo de botones.
         * @param {HTMLElement[]} buttons Botones a actualizar.
         * @param {boolean} isLoading Estado de carga.
         * @returns {void}
         */
        setLoadingState(buttons, isLoading) {
            buttons.forEach((btn) => {
                btn.disabled = isLoading;
                btn.classList.toggle(CLASS_NAME_LOADING, isLoading);
            });
            if (this.stepsTarget) {
                this.stepsTarget.classList.toggle(CLASS_NAME_LOADING, isLoading);
            }
        }

        /**
         * Solicita el HTML de un step remoto y lo renderiza en el modal.
         *
         * @param {string} url URL del step a cargar.
         * @param {RequestInit} [requestInit={}] Configuracion fetch opcional.
         * @returns {Promise<void>}
         */
        async requestAndRenderHtml(url, requestInit = {}) {
            const safeUrl = toSafeUrl(url, this.options.strictSameOrigin !== false)
                , method = normalizeMethod(requestInit.method || 'GET', 'GET')
                , fetchInit = {
                    credentials: 'same-origin',
                    ...requestInit,
                    method,
                };

            if (method === 'GET' || method === 'HEAD') {
                delete fetchInit.body;
            }

            const response = await fetch(safeUrl.toString(), fetchInit);

            const body = await parseResponseBody(response);
            if (response.ok) {
                this.handleHtml(body.text);
                return;
            }

            if (response.status === 400 && !body.isJson) {
                this.handleHtml(body.text);
                return;
            }

            if (response.status === 418) {
                const nextLocation = response.headers.get('Location');
                if (nextLocation) {
                    window.location.href = nextLocation;
                }
                return;
            }

            this.hideModal();
        }

        /**
         * Cierra el modal usando API de Modal si existe, o fallback nativo/manual.
         * @returns {void}
         */
        hideModal() {
            const modalApi = window.Modal && typeof window.Modal.getInstance === 'function'
                ? window.Modal.getInstance(this.subject)
                : null;

            if (modalApi && typeof modalApi.hide === 'function') {
                modalApi.hide();
                return;
            }

            if (this.subject.tagName === 'DIALOG' && typeof this.subject.close === 'function') {
                this.subject.close();
                return;
            }

            this.subject.classList.remove('modal-opened');
            this.subject.removeAttribute('aria-modal');
            this.subject.setAttribute('aria-hidden', 'true');
        }

        /**
         * Maneja el submit del formulario de steps usando fetch.
         * @param {SubmitEvent} evt Evento submit capturado.
         * @returns {Promise<void>}
         */
        async handleSubmit(evt) {
            const form = evt.target;
            if (!(form instanceof HTMLFormElement)) return;
            if (!this.subject.contains(form)) return;

            if (typeof form.reportValidity === 'function' && !form.reportValidity()) {
                return;
            }

            evt.preventDefault();

            const submitButtons = Array.from(this.subject.querySelectorAll('[type="submit"]'));
            this.setLoadingState(submitButtons, true);

            const request = buildRequestFromForm(form, this.submitDataGetter, this.options);

            try {
                const response = await fetch(request.action, request.requestInit);
                const body = await parseResponseBody(response);

                this.setLoadingState(submitButtons, false);

                if (response.status === 200) {
                    body.isJson ? this.handleJson(body.data, 200) : this.handleHtml(body.text);
                    return;
                }

                if (response.status === 201) {
                    if (!body.isJson && body.text.length === 0 && this.options.reloadOnNoContent) {
                        window.location.reload();
                    } else if (body.isJson) {
                        this.handleJson(body.data, 201);
                    }
                    this.options.after201 && this.options.after201(body.isJson ? body.data : body.text, response, this.subject);
                    return;
                }

                if (response.status === 204) {
                    if (this.options.reloadOnNoContent) {
                        window.location.reload();
                    }
                    this.options.after204 && this.options.after204(response, this.subject);
                    return;
                }

                if (response.status === 400) {
                    submitButtons.forEach((btn) => { btn.disabled = false; });
                    body.isJson ? this.handleJson(body.data, 400) : this.handleHtml(body.text);
                    return;
                }

                if (response.status === 418) {
                    const nextLocation = response.headers.get('Location');
                    if (nextLocation) {
                        window.location.href = nextLocation;
                    }
                    return;
                }

                submitButtons.forEach((btn) => { btn.disabled = false; });
                this.hideModal();
            } catch (_error) {
                this.setLoadingState(submitButtons, false);
                submitButtons.forEach((btn) => { btn.disabled = false; });
                this.hideModal();
            }
        }

        /**
         * Maneja el evento de apertura del modal y resuelve carga del primer step.
         *
         * Soporta tres fuentes para el primer paso: callback, detalle del evento o `data-dialog-src`.
         *
         * @param {Event|CustomEvent} evt Evento de apertura del modal.
         * @returns {Promise<void>}
         */
        async handleShown(evt) {
            const relatedTarget = evt && evt.detail && evt.detail.relatedTarget
                ? evt.detail.relatedTarget
                : evt.relatedTarget || null;
            const opener = relatedTarget instanceof HTMLElement ? relatedTarget : null;
            const src = opener ? opener.getAttribute(ATTR_DIALOG_SRC) : null;
            const requestFromEvent = parseStepRequestFromEvent(evt);

            if (!src && !requestFromEvent && typeof this.getFirstStepRequest !== 'function') {
                return;
            }

            const openerButtons = opener ? [opener] : [];
            this.setLoadingState(openerButtons, true);

            if (this.subject.getAttribute('aria-hidden') !== 'false') {
                this.subject.setAttribute('aria-hidden', 'false');
            }

            try {
                if (typeof this.getFirstStepRequest === 'function') {
                    const result = await this.getFirstStepRequest();
                    this.setLoadingState(openerButtons, false);

                    if (typeof result === 'string' || result instanceof Node || result instanceof NodeList || Array.isArray(result)) {
                        this.handleHtml(result);
                        return;
                    }

                    if (result instanceof Response) {
                        const body = await parseResponseBody(result);
                        if (result.ok && !body.isJson) {
                            this.handleHtml(body.text);
                            return;
                        }
                        if (result.status === 400 && !body.isJson) {
                            this.handleHtml(body.text);
                            return;
                        }
                        if (result.status === 418) {
                            const nextLocation = result.headers.get('Location');
                            if (nextLocation) {
                                window.location.href = nextLocation;
                            }
                            return;
                        }
                        this.hideModal();
                        return;
                    }

                    return;
                }

                if (requestFromEvent) {
                    await this.requestAndRenderHtml(requestFromEvent.url, requestFromEvent.requestInit);
                    this.setLoadingState(openerButtons, false);
                    return;
                }

                await this.requestAndRenderHtml(src, {
                    method: 'GET',
                    credentials: 'same-origin',
                });
                this.setLoadingState(openerButtons, false);
            } catch (_error) {
                this.setLoadingState(openerButtons, false);
                this.hideModal();
            }
        }

        /**
         * Limpia el contenido de steps cuando el modal se oculta.
         * @returns {void}
         */
        handleHidden() {
            if (this.stepsTarget) {
                this.stepsTarget.replaceChildren();
            }
        }

        /**
         * Vincula listeners principales del plugin.
         * @param {Function|null} [getFirstStepRequest=null] Callback opcional para cargar el primer step.
         * @returns {void}
         */
        bind(getFirstStepRequest = null) {
            if (typeof getFirstStepRequest === 'function') {
                this.getFirstStepRequest = getFirstStepRequest;
            }

            if (this.isBound) return;

            this.applyListeners('addEventListener');
            this.isBound = true;
        }

        /**
         * Desvincula listeners principales del plugin.
         * @returns {void}
         */
        unbind() {
            if (!this.isBound) return;

            this.applyListeners('removeEventListener');
            this.isBound = false;
        }

        /**
         * Define listeners activos de la instancia.
         * @returns {Array<[string, EventListenerOrEventListenerObject, (boolean|undefined)]>}
         */
        getListeners() {
            return [
                [EVENT_HIDDEN_NATIVE, this.handleHidden],
                ['close', this.handleHidden],
                [EVENT_SHOWN_NATIVE, this.handleShown],
                ['submit', this.handleSubmit],
            ];
        }

        /**
         * Aplica add/remove de listeners en lote.
         * @param {'addEventListener'|'removeEventListener'} method Metodo de EventTarget.
         * @returns {void}
         */
        applyListeners(method) {
            this.getListeners().forEach(([eventName, handler, useCapture]) => {
                this.subject[method](eventName, handler, useCapture);
            });
        }

        /**
         * Carga contenido HTML manualmente en el step target.
         * @param {string|Node|NodeList|Array<Node>} html HTML o nodos a inyectar.
         * @param {Function} [submitDataGetter] Callback opcional para construir datos del submit.
         * @returns {void}
         */
        load(html, submitDataGetter) {
            this.submitDataGetter = typeof submitDataGetter === 'function' ? submitDataGetter : null;
            this.handleHtml(html);
        }

        /**
         * Destruye la instancia actual y libera recursos.
         * @returns {void}
         */
        destroy() {
            this.unbind();
            INSTANCES.delete(this.subject);
        }

        /**
         * Inicializa (o reutiliza) una instancia para un modal.
         * @param {HTMLElement} element Elemento modal.
         * @param {Object} [options={}] Opciones de configuración de la instancia.
         * @returns {ModalSteps}
         */
        static init(element, options = {}) {
            if (!(element instanceof HTMLElement)) {
                throw new Error('Error: ModalSteps.init requiere un HTMLElement.');
            }

            const currentInstance = INSTANCES.get(element);
            if (currentInstance) return currentInstance;

            const mergedOptions = { ...getOptionsFromData(element), ...options }
                , instance = new ModalSteps(element, mergedOptions);

            INSTANCES.set(element, instance);
            instance.bind();
            return instance;
        }

        /**
         * Obtiene la instancia asociada a un modal.
         * @param {HTMLElement} element Elemento modal.
         * @returns {ModalSteps|null}
         */
        static getInstance(element) {
            if (!(element instanceof HTMLElement)) return null;
            return INSTANCES.get(element) || null;
        }

        /**
         * Destruye la instancia asociada a un modal.
         * @param {HTMLElement} element Elemento modal.
         * @returns {boolean}
         */
        static destroy(element) {
            const instance = ModalSteps.getInstance(element);
            if (!instance) return false;
            instance.destroy();
            return true;
        }

        /**
         * Inicializa todas las coincidencias dentro de un contenedor.
         * @param {ParentNode|Element|Document} [root=document] Raiz de busqueda.
         * @param {Object} [options={}] Opciones compartidas.
         * @returns {ModalSteps[]}
         */
        static initAll(root = document, options = {}) {
            return getSubjects(root).map((element) => ModalSteps.init(element, options));
        }

        /**
         * Destruye todas las instancias encontradas dentro de un contenedor.
         * @param {ParentNode|Element|Document} [root=document] Raiz de busqueda.
         * @returns {number}
         */
        static destroyAll(root = document) {
            return getSubjects(root).reduce((destroyedCount, element) => {
                return ModalSteps.destroy(element) ? destroyedCount + 1 : destroyedCount;
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
                ModalSteps.destroyAll(node);
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

    // Handler para mutaciones DOM (alta/baja de modales)
    const modalStepsDomHandler = (mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType !== 1) return;
                PENDING_REMOVALS.delete(node);
                ModalSteps.initAll(node);
            });
            mutation.removedNodes.forEach((node) => {
                if (node.nodeType !== 1) return;
                scheduleRemovalCheck(node);
            });
        });
    };

    const startAutoInit = () => {
        ModalSteps.initAll(document);
        // Usar ObserverDispatcher para registrar el handler solo sobre el root adecuado
        window.Plugins.ObserverDispatcher.register('modal-steps', modalStepsDomHandler);
    };

    document.readyState === 'loading'
        ? document.addEventListener('DOMContentLoaded', startAutoInit, { once: true })
        : startAutoInit();

    window.Plugins.ModalSteps = ModalSteps;
})();
