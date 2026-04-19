/**
 * @fileoverview Plugin nativo para enviar formularios con fetch usando atributos data-*.
 * @version 1.0
 * @since 2026
 * @author Samuel Montenegro
 * @module FormRequest
 */

(function () {
    'use strict';

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
     * Clase CSS aplicada al formulario durante loading.
     * @type {string}
     */
    const CLASS_NAME_LOADING = 'is-loading'
        /**
         * Clase CSS para marcar campos con error.
         * @type {string}
         */
        , CLASS_NAME_FIELD_ERROR = 'has-error'
        /**
         * Clase CSS para contenedores de mensaje de error por campo.
         * @type {string}
         */
        , CLASS_NAME_ERROR_MESSAGE = 'form-error-message'
        /**
         * Selector declarativo de formularios gestionados por el plugin.
         * @type {string}
         */
        , SELECTOR_SUBJECT = 'form[data-form-request]'
        /**
         * Registro de instancias activas por formulario.
         * @type {WeakMap<HTMLFormElement, FormRequest>}
         */
        , INSTANCES = new WeakMap()
        /**
         * Nodos removidos pendientes de limpieza diferida.
         * @type {Set<Element>}
         */
        , PENDING_REMOVALS = new Set();

    /**
     * Defaults de configuracion de FormRequest.
     * @type {Object}
     */
    const FORM_REQUEST_DEFAULTS = Object.freeze({
        sameOrigin: true,
        allowedMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        retryOnStatuses: [408, 429, 500, 502, 503, 504],
        responseType: 'auto',
        loadingClass: CLASS_NAME_LOADING,
        resetOnSuccess: false,
        preventConcurrent: true,
        timeoutMs: 15000,
        retryCount: 0,
        retryDelayMs: 300,
        debounceGetMs: 0,
        credentials: 'same-origin',
        headers: null,
        csrfMetaName: 'csrf-token',
        csrfHeaderName: 'X-CSRF-Token',
        csrfToken: '',
        beforeSend: function () { },
        onSuccess: function () { },
        onError: function () { },
        onComplete: function () { },
    });

    /**
     * Normaliza valores declarativos a booleanos.
     * @param {unknown} value Valor crudo.
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
     * Normaliza metodos HTTP en mayusculas.
     * @param {unknown} value Metodo fuente.
     * @param {string} [fallback='POST'] Metodo fallback.
     * @returns {string}
     */
    const normalizeMethod = (value, fallback = 'POST') => {
        const method = String(value || fallback).trim().toUpperCase();
        return method || fallback;
    };

    /**
     * Convierte una lista CSV de metodos HTTP en una lista normalizada en mayusculas.
     *
     * @param {string|undefined|null} value Valor crudo proveniente de `data-form-allowed-methods`.
     * @returns {string[]|null} Metodos validos o `null` si no hay datos utilizables.
     */
    const parseAllowedMethods = (value) => {
        if (!value || typeof value !== 'string') return null;
        const methods = value
            .split(',')
            .map((item) => normalizeMethod(item, ''))
            .filter(Boolean);
        return methods.length > 0 ? methods : null;
    };

    const parseNumber = (value, fallback = 0) => {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : fallback;
    };

    /**
     * Parsea una lista CSV de codigos HTTP y filtra valores fuera de rango.
     *
     * @param {string|undefined|null} value Valor crudo con codigos separados por coma.
     * @returns {number[]|null} Codigos HTTP entre 100 y 599, o `null` si no hay codigos validos.
     */
    const parseStatusCodes = (value) => {
        if (!value || typeof value !== 'string') return null;
        const codes = value
            .split(',')
            .map((item) => parseInt(item.trim(), 10))
            .filter((item) => Number.isInteger(item) && item >= 100 && item <= 599);
        return codes.length > 0 ? codes : null;
    };

    const parseHeadersFromJson = (value) => {
        if (!value || typeof value !== 'string') return null;

        try {
            const parsed = JSON.parse(value)
                , isObject = parsed && typeof parsed === 'object' && !Array.isArray(parsed);

            if (!isObject) return null;

            const entries = Object.entries(parsed)
                .map(([key, headerValue]) => [String(key || '').trim(), String(headerValue ?? '').trim()])
                .filter(([key]) => key.length > 0);

            return entries.length > 0 ? Object.fromEntries(entries) : null;
        } catch (_error) {
            return null;
        }
    };

    /**
     * Espera asincrona utilitaria para debounce/reintentos.
     * @param {number} ms Milisegundos.
     * @returns {Promise<void>}
     */
    const wait = (ms) => {
        return new Promise((resolve) => {
            setTimeout(resolve, ms);
        });
    };

    /**
     * Valida URL y restringe origen segun politica sameOrigin.
     * @param {string} rawUrl URL declarada en el formulario.
     * @param {boolean} strictSameOrigin Rechaza origen externo cuando es true.
     * @returns {URL}
     */
    const toSafeUrl = (rawUrl, strictSameOrigin) => {
        const url = new URL(rawUrl, window.location.href)
            , protocol = url.protocol.toLowerCase();

        if (!['http:', 'https:'].includes(protocol)) {
            throw new Error('Error: protocolo de URL no soportado para FormRequest.');
        }

        if (strictSameOrigin && url.origin !== window.location.origin) {
            throw new Error('Error: URL de otro origen bloqueada por sameOrigin.');
        }

        return url;
    };

    /**
     * Parsea cuerpo de respuesta en modo JSON o texto.
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
     * Obtiene formularios compatibles en un root.
     * @param {ParentNode|Element|Document} [root=document] Nodo raiz de busqueda.
     * @returns {HTMLFormElement[]}
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
     * Limpia instancias cuyos nodos fueron removidos del DOM.
     * @returns {void}
     */
    const flushPendingRemovals = () => {
        PENDING_REMOVALS.forEach((node) => {
            if (!node.isConnected) {
                FormRequest.destroyAll(node);
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

    /**
     * Extrae opciones declarativas (`data-form-*`) desde un formulario.
     *
     * @param {HTMLFormElement} element Formulario sujeto del plugin.
     * @returns {Object} Objeto parcial de opciones listo para mezclar con defaults.
     */
    const getOptionsFromData = (element) => {
        const resetOnSuccess = parseBoolean(element.dataset.formResetOnSuccess)
            , sameOrigin = parseBoolean(element.dataset.formSameOrigin)
            , preventConcurrent = parseBoolean(element.dataset.formPreventConcurrent)
            , allowedMethods = parseAllowedMethods(element.dataset.formAllowedMethods)
            , retryOnStatuses = parseStatusCodes(element.dataset.formRetryStatuses)
            , options = {};

        const setTrimmedOption = (key, value, transform) => {
            if (typeof value !== 'string') return;
            const trimmedValue = value.trim();
            if (!trimmedValue) return;
            options[key] = typeof transform === 'function' ? transform(trimmedValue) : trimmedValue;
        };

        setTrimmedOption('responseType', element.dataset.formResponse, (value) => value.toLowerCase());
        setTrimmedOption('loadingClass', element.dataset.formLoadingClass);
        setTrimmedOption('credentials', element.dataset.formCredentials);
        setTrimmedOption('csrfMetaName', element.dataset.formCsrfMeta);
        setTrimmedOption('csrfHeaderName', element.dataset.formCsrfHeader);
        setTrimmedOption('csrfToken', element.dataset.formCsrfToken);

        if (typeof element.dataset.formHeaders === 'string' && element.dataset.formHeaders.trim()) {
            const parsedHeaders = parseHeadersFromJson(element.dataset.formHeaders.trim());
            parsedHeaders
                ? options.headers = parsedHeaders
                : console.warn('FormRequest: data-form-headers tiene un JSON invalido y sera ignorado.', element);
        }

        resetOnSuccess !== undefined && (options.resetOnSuccess = resetOnSuccess);
        sameOrigin !== undefined && (options.sameOrigin = sameOrigin);
        preventConcurrent !== undefined && (options.preventConcurrent = preventConcurrent);
        allowedMethods && (options.allowedMethods = allowedMethods);
        retryOnStatuses && (options.retryOnStatuses = retryOnStatuses);

        element.dataset.formTimeout !== undefined && (options.timeoutMs = Math.max(0, parseNumber(element.dataset.formTimeout, FORM_REQUEST_DEFAULTS.timeoutMs)));
        element.dataset.formRetryCount !== undefined && (options.retryCount = Math.max(0, Math.floor(parseNumber(element.dataset.formRetryCount, FORM_REQUEST_DEFAULTS.retryCount))));
        element.dataset.formRetryDelay !== undefined && (options.retryDelayMs = Math.max(0, parseNumber(element.dataset.formRetryDelay, FORM_REQUEST_DEFAULTS.retryDelayMs)));
        element.dataset.formDebounceGet !== undefined && (options.debounceGetMs = Math.max(0, parseNumber(element.dataset.formDebounceGet, FORM_REQUEST_DEFAULTS.debounceGetMs)));

        return options;
    };

    /**
     * Controlador principal para envio de formularios por `fetch`.
     *
     * Flujo resumido:
     * 1. Intercepta el submit del formulario.
     * 2. Construye el request seguro (metodo, URL, headers, CSRF).
     * 3. Ejecuta `beforeSend` y emite `before.plugin.formRequest` (cancelable).
     * 4. Ejecuta la solicitud con timeout/reintentos opcionales.
     * 5. Renderiza respuesta y emite eventos finales (`success` o `error`, luego `complete`).
     *
     * @class FormRequest
     * @fires before.plugin.formRequest
     * @fires success.plugin.formRequest
     * @fires error.plugin.formRequest
     * @fires complete.plugin.formRequest
     */
    class FormRequest {
        /**
         * Crea una instancia para interceptar y enviar el formulario via fetch.
         * @param {HTMLFormElement} element Formulario a controlar.
         * @param {Object} options Opciones de configuración de la instancia.
         * @param {boolean} [options.sameOrigin=true] Restringe requests a mismo origen.
         * @param {string[]} [options.allowedMethods] Metodos HTTP permitidos.
         * @param {'auto'|'html'|'json'} [options.responseType='auto'] Tipo de respuesta esperado.
         * @param {string} [options.loadingClass='is-loading'] Clase visual aplicada durante carga.
         * @param {boolean} [options.resetOnSuccess=false] Reinicia el form en respuestas exitosas.
         * @param {boolean} [options.preventConcurrent=true] Aborta request previa antes de enviar una nueva.
         * @param {number} [options.timeoutMs=15000] Timeout por solicitud en milisegundos.
         * @param {number} [options.retryCount=0] Cantidad de reintentos ante fallas transitorias.
         * @param {number} [options.retryDelayMs=300] Espera entre reintentos en milisegundos.
         * @param {number[]} [options.retryOnStatuses] Estados HTTP que habilitan reintento.
         * @param {number} [options.debounceGetMs=0] Debounce para envios GET en milisegundos.
         * @param {'same-origin'|'include'|'omit'} [options.credentials='same-origin'] Politica de credenciales para fetch.
         * @param {Object<string,string>} [options.headers] Headers personalizados para la solicitud.
         * @param {string} [options.csrfMetaName='csrf-token'] Nombre del meta tag con token CSRF.
         * @param {string} [options.csrfHeaderName='X-CSRF-Token'] Header HTTP para enviar CSRF.
         * @param {string} [options.csrfToken=''] Token CSRF explicito (prioritario sobre meta).
         * @param {Function} [options.beforeSend] Hook antes de fetch.
         * @param {Function} [options.onSuccess] Hook en respuesta exitosa.
         * @param {Function} [options.onError] Hook en respuesta de error o excepcion.
         * @param {Function} [options.onComplete] Hook al finalizar el ciclo.
         */
        constructor(element, options) {
            this.subject = element;
            this.options = { ...FORM_REQUEST_DEFAULTS, ...options };
            this.abortController = null;
            this.isBound = false;
            this.debounceTimer = null;
            this.handleSubmit = this.handleSubmit.bind(this);
        }

        /**
         * Resuelve el contenedor de salida configurado en `data-form-target`.
         *
         * @returns {Element|null} Elemento destino para render HTML, o `null` si no hay selector.
         */
        get targetElement() {
            const selector = this.subject.getAttribute('data-form-target');
            if (!selector) return null;
            return document.querySelector(selector);
        }

        /**
         * Actualiza estado de carga del formulario y de sus botones submit.
         *
         * @param {boolean} isLoading Indica si el formulario esta procesando una solicitud.
         * @returns {void}
         */
        setLoadingState(isLoading) {
            const submitButtons = Array.from(this.subject.querySelectorAll('[type="submit"]'));
            submitButtons.forEach((button) => {
                button.disabled = isLoading;
            });

            this.subject.classList.toggle(this.options.loadingClass || CLASS_NAME_LOADING, isLoading);
        }

        /**
         * Elimina marcas y mensajes de validacion previos del lado cliente/servidor.
         *
         * @returns {void}
         */
        clearFieldErrors() {
            Array.from(this.subject.elements).forEach((field) => {
                if (!(field instanceof HTMLElement)) return;
                field.classList.remove(CLASS_NAME_FIELD_ERROR);
                field.removeAttribute('aria-invalid');
                const name = field.getAttribute('name');
                if (!name) return;
                const message = this.subject.querySelector('.' + CLASS_NAME_ERROR_MESSAGE + '[data-error-for="' + CSS.escape(name) + '"]');
                if (message) {
                    message.remove();
                }
            });
        }

        /**
         * Aplica errores por campo en base a un mapa de errores del backend.
         *
         * @param {Object<string, string|string[]>} errors Objeto de errores por nombre de campo.
         * @returns {void}
         */
        applyFieldErrors(errors) {
            if (!errors || typeof errors !== 'object') return;

            Object.keys(errors).forEach((fieldName) => {
                const field = this.subject.querySelector('[name="' + CSS.escape(fieldName) + '"]');
                if (!(field instanceof HTMLElement)) return;

                const value = errors[fieldName]
                    , text = Array.isArray(value) ? String(value[0] || '') : String(value || '');
                if (!text) return;

                field.classList.add(CLASS_NAME_FIELD_ERROR);
                field.setAttribute('aria-invalid', 'true');

                const message = document.createElement('small');
                message.className = CLASS_NAME_ERROR_MESSAGE;
                message.setAttribute('data-error-for', fieldName);
                message.textContent = text;
                field.insertAdjacentElement('afterend', message);
            });
        }

        /**
         * Renderiza HTML de respuesta en el target configurado.
         *
         * @param {string} text Contenido HTML a inyectar.
         * @returns {void}
         */
        renderHtml(text) {
            const target = this.targetElement;
            if (!target || !text) return;
            target.innerHTML = text;
        }

        /**
         * Gestiona una respuesta exitosa en modo JSON.
         *
         * @param {*} data Cuerpo parseado de la respuesta.
         * @param {Response} response Objeto de respuesta fetch.
         * @returns {void}
         */
        handleJsonSuccess(data, response) {
            if (data && typeof data === 'object' && data.html && typeof data.html === 'string') {
                this.renderHtml(data.html);
            }

            this.options.onSuccess && this.options.onSuccess(data, response, this.subject);
            this.subject.dispatchEvent(new CustomEvent('success.plugin.formRequest', {
                detail: { data, response, form: this.subject },
            }));
        }

        /**
         * Gestiona una respuesta exitosa en modo HTML/text.
         *
         * @param {string} text Cuerpo de respuesta.
         * @param {Response} response Objeto de respuesta fetch.
         * @returns {void}
         */
        handleHtmlSuccess(text, response) {
            this.renderHtml(text);
            this.options.onSuccess && this.options.onSuccess(text, response, this.subject);
            this.subject.dispatchEvent(new CustomEvent('success.plugin.formRequest', {
                detail: { data: text, response, form: this.subject },
            }));
        }

        /**
         * Construye el request final a partir del formulario y la configuracion activa.
         *
         * @param {HTMLFormElement} form Formulario origen.
         * @returns {{method:string,url:string,requestInit:RequestInit}}
         */
        buildRequest(form) {
            const action = form.getAttribute('action') || window.location.href
                , strictSameOrigin = this.options.sameOrigin !== false
                , safeUrl = toSafeUrl(action, strictSameOrigin)
                , methodFromData = form.getAttribute('data-form-method') || this.subject.getAttribute('data-form-method')
                , rawMethod = normalizeMethod(methodFromData || form.getAttribute('method') || 'POST')
                , allowedMethods = Array.isArray(this.options.allowedMethods) ? this.options.allowedMethods.map((item) => normalizeMethod(item, '')) : FORM_REQUEST_DEFAULTS.allowedMethods
                , safeMethod = allowedMethods.includes(rawMethod) ? rawMethod : 'POST'
                , formData = new FormData(form);

            if (safeMethod === 'GET') {
                const params = new URLSearchParams(safeUrl.search);
                for (const [key, value] of formData.entries()) {
                    params.append(key, typeof value === 'string' ? value : value.name || '');
                }

                safeUrl.search = params.toString();
                return {
                    method: 'GET',
                    url: safeUrl.toString(),
                    requestInit: {
                        method: 'GET',
                        credentials: this.options.credentials,
                    },
                };
            }

            return {
                method: safeMethod,
                url: safeUrl.toString(),
                requestInit: {
                    method: safeMethod,
                    body: formData,
                    credentials: this.options.credentials,
                },
            };
        }

        /**
         * Resuelve token CSRF desde opcion explicita o meta tag.
         *
         * @returns {string} Token CSRF o cadena vacia si no existe.
         */
        getCsrfToken() {
            if (typeof this.options.csrfToken === 'string' && this.options.csrfToken.trim()) {
                return this.options.csrfToken.trim();
            }

            const metaName = typeof this.options.csrfMetaName === 'string' && this.options.csrfMetaName.trim()
                ? this.options.csrfMetaName.trim()
                : FORM_REQUEST_DEFAULTS.csrfMetaName
                , meta = document.querySelector('meta[name="' + CSS.escape(metaName) + '"]');

            return meta ? String(meta.getAttribute('content') || '').trim() : '';
        }

        /**
         * Inyecta header CSRF en requests no seguros (no GET/HEAD).
         *
         * @param {{method:string,url:string,requestInit:RequestInit}} request Request mutable.
         * @returns {void}
         */
        applySecurityHeaders(request) {
            const method = normalizeMethod(request.method, 'POST');
            if (method === 'GET' || method === 'HEAD') return;

            const token = this.getCsrfToken();
            if (!token) return;

            const headerName = typeof this.options.csrfHeaderName === 'string' && this.options.csrfHeaderName.trim()
                ? this.options.csrfHeaderName.trim()
                : FORM_REQUEST_DEFAULTS.csrfHeaderName
                , headers = new Headers(request.requestInit.headers || {});

            if (!headers.has(headerName)) {
                headers.set(headerName, token);
            }

            request.requestInit.headers = headers;
        }

        /**
         * Combina headers personalizados en el request actual.
         *
         * @param {{method:string,url:string,requestInit:RequestInit}} request Request mutable.
         * @returns {void}
         */
        applyCustomHeaders(request) {
            const customHeaders = this.options && this.options.headers && typeof this.options.headers === 'object'
                ? this.options.headers
                : null;

            if (!customHeaders) return;

            const headers = new Headers(request.requestInit.headers || {});

            Object.entries(customHeaders).forEach(([key, value]) => {
                const headerName = String(key || '').trim();
                if (!headerName) return;
                headers.set(headerName, String(value ?? ''));
            });

            request.requestInit.headers = headers;
        }

        /**
         * Ejecuta fetch con estrategia de timeout y reintento.
         *
         * @param {{method:string,url:string,requestInit:RequestInit}} request Request preconstruido.
         * @returns {Promise<Response>}
         */
        async runRequest(request) {
            const retryCount = Math.max(0, Math.floor(parseNumber(this.options.retryCount, 0)))
                , retryDelayMs = Math.max(0, parseNumber(this.options.retryDelayMs, 0))
                , retryStatuses = Array.isArray(this.options.retryOnStatuses)
                    ? this.options.retryOnStatuses
                    : FORM_REQUEST_DEFAULTS.retryOnStatuses
                , timeoutMs = Math.max(0, parseNumber(this.options.timeoutMs, 0));

            let attempt = 0;

            while (attempt <= retryCount) {
                const timeoutController = new AbortController()
                    , currentRequestInit = { ...request.requestInit, signal: timeoutController.signal }
                    , abortForwarder = () => timeoutController.abort();

                let timeoutId = null;
                this.abortController.signal.addEventListener('abort', abortForwarder, { once: true });

                try {
                    if (timeoutMs > 0) {
                        timeoutId = setTimeout(() => {
                            timeoutController.abort();
                        }, timeoutMs);
                    }

                    const response = await fetch(request.url, currentRequestInit);

                    if (attempt < retryCount && retryStatuses.includes(response.status)) {
                        attempt += 1;
                        if (retryDelayMs > 0) {
                            await wait(retryDelayMs);
                        }
                        continue;
                    }

                    return response;
                } catch (error) {
                    if (this.abortController.signal.aborted) {
                        throw error;
                    }

                    if (attempt >= retryCount) {
                        throw error;
                    }

                    attempt += 1;
                    if (retryDelayMs > 0) {
                        await wait(retryDelayMs);
                    }
                } finally {
                    if (timeoutId !== null) {
                        clearTimeout(timeoutId);
                    }
                    this.abortController.signal.removeEventListener('abort', abortForwarder);
                }
            }

            throw new Error('Error: no fue posible completar la solicitud.');
        }

        /**
         * Aplica debounce opcional a solicitudes GET.
         *
         * @param {string} method Metodo HTTP solicitado.
         * @returns {Promise<void>}
         */
        waitForDebounce(method) {
            const debounceMs = Math.max(0, parseNumber(this.options.debounceGetMs, 0));
            if (method !== 'GET' || debounceMs === 0) return Promise.resolve();

            if (this.debounceTimer) {
                clearTimeout(this.debounceTimer);
                this.debounceTimer = null;
            }

            return new Promise((resolve) => {
                this.debounceTimer = setTimeout(() => {
                    this.debounceTimer = null;
                    resolve();
                }, debounceMs);
            });
        }

        /**
         * Notifica error por hook y evento publico.
         *
         * @param {*} data Datos de error (respuesta parseada o null).
         * @param {Response|null} response Respuesta HTTP asociada.
         * @param {Error|null} error Error capturado en excepciones de red/runtime.
         * @returns {void}
         */
        notifyError(data, response, error) {
            this.options.onError && this.options.onError(data, response, error, this.subject);
            this.subject.dispatchEvent(new CustomEvent('error.plugin.formRequest', {
                detail: { data, response, error, form: this.subject },
            }));
        }

        /**
         * Handler principal de submit del formulario controlado.
         *
         * @param {SubmitEvent} evt Evento submit.
         * @returns {Promise<void>}
         */
        async handleSubmit(evt) {
            const form = evt.target;
            if (!(form instanceof HTMLFormElement)) return;
            if (form !== this.subject) return;

            if (typeof form.reportValidity === 'function' && !form.reportValidity()) return;
            
            evt.preventDefault();
            this.clearFieldErrors();

            const request = this.buildRequest(form);
            this.applyCustomHeaders(request);
            this.applySecurityHeaders(request);

            const beforeEvent = new CustomEvent('before.plugin.formRequest', {
                cancelable: true,
                detail: {
                    url: request.url,
                    requestInit: request.requestInit,
                    form: this.subject,
                },
            });

            this.options.beforeSend && this.options.beforeSend(request.url, request.requestInit, this.subject);
            if (!this.subject.dispatchEvent(beforeEvent)) {
                return;
            }

            if (this.options.preventConcurrent && this.abortController instanceof AbortController) {
                this.abortController.abort();
            }

            this.abortController = new AbortController();

            this.setLoadingState(true);

            try {
                await this.waitForDebounce(request.method);
                if (this.abortController.signal.aborted) {
                    throw new DOMException('Aborted', 'AbortError');
                }

                const response = await this.runRequest(request)
                    , body = await parseResponseBody(response)
                    , forceResponseType = this.options.responseType === 'json' || this.options.responseType === 'html'
                        ? this.options.responseType
                        : null
                    , shouldUseJson = forceResponseType
                        ? forceResponseType === 'json'
                        : body.isJson;

                if (response.ok) {
                    shouldUseJson
                        ? this.handleJsonSuccess(body.data, response)
                        : this.handleHtmlSuccess(body.text, response);

                    if (this.options.resetOnSuccess) {
                        this.subject.reset();
                    }
                } else {
                    if (shouldUseJson && body.data && typeof body.data === 'object' && body.data.errors) {
                        this.applyFieldErrors(body.data.errors);
                    } else if (!shouldUseJson && body.text) {
                        this.renderHtml(body.text);
                    }

                    this.notifyError(body.data || body.text, response, null);
                }
            } catch (error) {
                if (!(error instanceof DOMException && error.name === 'AbortError')) {
                    this.notifyError(null, null, error);
                }
            } finally {
                this.setLoadingState(false);
                this.options.onComplete && this.options.onComplete(this.subject);
                this.subject.dispatchEvent(new CustomEvent('complete.plugin.formRequest', {
                    detail: { form: this.subject },
                }));
            }
        }

        /**
         * Vincula listeners del plugin sobre el formulario.
         * @returns {void}
         */
        bind() {
            if (this.isBound) return;
            this.applyListeners('addEventListener');
            this.isBound = true;
        }

        /**
         * Desvincula listeners previamente registrados.
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
         * Libera recursos de la instancia y la elimina del registro interno.
         * @returns {void}
         */
        destroy() {
            if (this.debounceTimer) {
                clearTimeout(this.debounceTimer);
                this.debounceTimer = null;
            }
            if (this.abortController instanceof AbortController) {
                this.abortController.abort();
                this.abortController = null;
            }
            this.unbind();
            INSTANCES.delete(this.subject);
        }

        /**
         * Inicializa o reutiliza una instancia para un formulario.
         * @param {HTMLFormElement} element Formulario objetivo.
         * @param {Object} [options={}] Opciones de configuración de la instancia.
         * @returns {FormRequest}
         */
        static init(element, options = {}) {
            if (!(element instanceof HTMLFormElement)) {
                throw new Error('Error: FormRequest.init requiere un HTMLFormElement.');
            }

            const currentInstance = INSTANCES.get(element);
            if (currentInstance) return currentInstance;

            const mergedOptions = { ...getOptionsFromData(element), ...options }
                , instance = new FormRequest(element, mergedOptions);

            INSTANCES.set(element, instance);
            instance.bind();
            return instance;
        }

        /**
         * Obtiene la instancia asociada a un formulario.
         * @param {HTMLFormElement} element Formulario objetivo.
         * @returns {FormRequest|null}
         */
        static getInstance(element) {
            if (!(element instanceof HTMLFormElement)) return null;
            return INSTANCES.get(element) || null;
        }

        /**
         * Destruye la instancia asociada a un formulario.
         * @param {HTMLFormElement} element Formulario objetivo.
         * @returns {boolean}
         */
        static destroy(element) {
            const instance = FormRequest.getInstance(element);
            if (!instance) return false;
            instance.destroy();
            return true;
        }

        /**
         * Inicializa todas las coincidencias dentro de un contenedor.
         * @param {ParentNode|Element|Document} [root=document] Raiz de busqueda.
         * @param {Object} [options={}] Opciones compartidas para todas las instancias.
         * @returns {FormRequest[]}
         */
        static initAll(root = document, options = {}) {
            return getSubjects(root).map((element) => FormRequest.init(element, options));
        }

        /**
         * Destruye todas las instancias dentro de un contenedor.
         * @param {ParentNode|Element|Document} [root=document] Raiz de busqueda.
         * @returns {number}
         */
        static destroyAll(root = document) {
            return getSubjects(root).reduce((destroyedCount, element) => {
                return FormRequest.destroy(element) ? destroyedCount + 1 : destroyedCount;
            }, 0);
        }
    }


    // Handler para mutaciones DOM (alta/baja de formularios)
    const formRequestDomHandler = (mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType !== 1) return;
                PENDING_REMOVALS.delete(node);
                FormRequest.initAll(node);
            });
            mutation.removedNodes.forEach((node) => {
                if (node.nodeType !== 1) return;
                scheduleRemovalCheck(node);
            });
        });
    };

    const startAutoInit = () => {
        FormRequest.initAll(document);
        // Usar ObserverDispatcher para registrar el handler solo sobre el root adecuado
        window.Plugins.ObserverDispatcher.register('form-request', formRequestDomHandler);
    };

    document.readyState === 'loading'
        ? document.addEventListener('DOMContentLoaded', startAutoInit, { once: true })
        : startAutoInit();

    window.Plugins = window.Plugins || {};
    window.Plugins.FormRequest = FormRequest;
})();
