/**
 * @fileoverview Plugin nativo para enviar formularios con fetch usando atributos data-*.
 * @version 1.0
 * @since 2026
 * @author Samuel Montenegro
 * @module FormRequest
 */
(function () {
    'use strict';

    const CLASS_NAME_LOADING = 'is-loading'
        , CLASS_NAME_FIELD_ERROR = 'has-error'
        , CLASS_NAME_ERROR_MESSAGE = 'form-error-message'
        , SELECTOR_SUBJECT = 'form[data-form-request]'
        , INSTANCES = new WeakMap()
        , PENDING_REMOVALS = new Set();

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
        csrfMetaName: 'csrf-token',
        csrfHeaderName: 'X-CSRF-Token',
        csrfToken: '',
        beforeSend: function () { },
        onSuccess: function () { },
        onError: function () { },
        onComplete: function () { },
    });

    const parseBoolean = (value) => {
        if (value === undefined) return undefined;
        if (typeof value === 'boolean') return value;
        const normalized = String(value).trim().toLowerCase();
        if (['', 'true', '1', 'yes', 'on'].includes(normalized)) return true;
        if (['false', '0', 'no', 'off'].includes(normalized)) return false;
        return undefined;
    };

    const normalizeMethod = (value, fallback = 'POST') => {
        const method = String(value || fallback).trim().toUpperCase();
        return method || fallback;
    };

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

    const parseStatusCodes = (value) => {
        if (!value || typeof value !== 'string') return null;
        const codes = value
            .split(',')
            .map((item) => parseInt(item.trim(), 10))
            .filter((item) => Number.isInteger(item) && item >= 100 && item <= 599);
        return codes.length > 0 ? codes : null;
    };

    const wait = (ms) => {
        return new Promise((resolve) => {
            setTimeout(resolve, ms);
        });
    };

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
                FormRequest.destroyAll(node);
            }
            PENDING_REMOVALS.delete(node);
        });
    };

    const scheduleRemovalCheck = (node) => {
        PENDING_REMOVALS.add(node);
        queueMicrotask(flushPendingRemovals);
    };

    const getOptionsFromData = (element) => {
        const resetOnSuccess = parseBoolean(element.dataset.formResetOnSuccess)
            , sameOrigin = parseBoolean(element.dataset.formSameOrigin)
            , preventConcurrent = parseBoolean(element.dataset.formPreventConcurrent)
            , allowedMethods = parseAllowedMethods(element.dataset.formAllowedMethods)
            , retryOnStatuses = parseStatusCodes(element.dataset.formRetryStatuses)
            , options = {};

        if (typeof element.dataset.formResponse === 'string' && element.dataset.formResponse.trim()) {
            options.responseType = element.dataset.formResponse.trim().toLowerCase();
        }

        if (typeof element.dataset.formLoadingClass === 'string' && element.dataset.formLoadingClass.trim()) {
            options.loadingClass = element.dataset.formLoadingClass.trim();
        }

        if (typeof element.dataset.formCredentials === 'string' && element.dataset.formCredentials.trim()) {
            options.credentials = element.dataset.formCredentials.trim();
        }

        if (typeof element.dataset.formCsrfMeta === 'string' && element.dataset.formCsrfMeta.trim()) {
            options.csrfMetaName = element.dataset.formCsrfMeta.trim();
        }

        if (typeof element.dataset.formCsrfHeader === 'string' && element.dataset.formCsrfHeader.trim()) {
            options.csrfHeaderName = element.dataset.formCsrfHeader.trim();
        }

        if (typeof element.dataset.formCsrfToken === 'string' && element.dataset.formCsrfToken.trim()) {
            options.csrfToken = element.dataset.formCsrfToken.trim();
        }

        if (resetOnSuccess !== undefined) {
            options.resetOnSuccess = resetOnSuccess;
        }

        if (sameOrigin !== undefined) {
            options.sameOrigin = sameOrigin;
        }

        if (preventConcurrent !== undefined) {
            options.preventConcurrent = preventConcurrent;
        }

        if (allowedMethods) {
            options.allowedMethods = allowedMethods;
        }

        if (retryOnStatuses) {
            options.retryOnStatuses = retryOnStatuses;
        }

        if (element.dataset.formTimeout !== undefined) {
            options.timeoutMs = Math.max(0, parseNumber(element.dataset.formTimeout, FORM_REQUEST_DEFAULTS.timeoutMs));
        }

        if (element.dataset.formRetryCount !== undefined) {
            options.retryCount = Math.max(0, Math.floor(parseNumber(element.dataset.formRetryCount, FORM_REQUEST_DEFAULTS.retryCount)));
        }

        if (element.dataset.formRetryDelay !== undefined) {
            options.retryDelayMs = Math.max(0, parseNumber(element.dataset.formRetryDelay, FORM_REQUEST_DEFAULTS.retryDelayMs));
        }

        if (element.dataset.formDebounceGet !== undefined) {
            options.debounceGetMs = Math.max(0, parseNumber(element.dataset.formDebounceGet, FORM_REQUEST_DEFAULTS.debounceGetMs));
        }

        return options;
    };

    /**
     * Controlador principal para envio de formularios por `fetch`.
     *
     * Responsabilidades:
     * - Interceptar submit del formulario.
     * - Construir y ejecutar la solicitud HTTP segun configuracion/data-attributes.
     * - Gestionar render de respuesta HTML/JSON.
     * - Emitir eventos de ciclo de vida (`before`, `success`, `error`, `complete`).
     *
     * @class FormRequest
     */
    class FormRequest {
        /**
         * @param {HTMLFormElement} element Formulario a controlar.
         * @param {Object} options Opciones de inicializacion.
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
         * Resuelve el elemento destino configurado en `data-form-target`.
         * @returns {Element|null}
         */
        get targetElement() {
            const selector = this.subject.getAttribute('data-form-target');
            if (!selector) return null;
            return document.querySelector(selector);
        }

        setLoadingState(isLoading) {
            const submitButtons = Array.from(this.subject.querySelectorAll('[type="submit"]'));
            submitButtons.forEach((button) => {
                button.disabled = isLoading;
            });

            this.subject.classList.toggle(this.options.loadingClass || CLASS_NAME_LOADING, isLoading);
        }

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

        renderHtml(text) {
            const target = this.targetElement;
            if (!target || !text) return;
            target.innerHTML = text;
        }

        handleJsonSuccess(data, response) {
            if (data && typeof data === 'object' && data.html && typeof data.html === 'string') {
                this.renderHtml(data.html);
            }

            this.options.onSuccess && this.options.onSuccess(data, response, this.subject);
            this.subject.dispatchEvent(new CustomEvent('success.plugin.formRequest', {
                detail: { data, response, form: this.subject },
            }));
        }

        handleHtmlSuccess(text, response) {
            this.renderHtml(text);
            this.options.onSuccess && this.options.onSuccess(text, response, this.subject);
            this.subject.dispatchEvent(new CustomEvent('success.plugin.formRequest', {
                detail: { data: text, response, form: this.subject },
            }));
        }

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

        notifyError(data, response, error) {
            this.options.onError && this.options.onError(data, response, error, this.subject);
            this.subject.dispatchEvent(new CustomEvent('error.plugin.formRequest', {
                detail: { data, response, error, form: this.subject },
            }));
        }

        async handleSubmit(evt) {
            const form = evt.target;
            if (!(form instanceof HTMLFormElement)) return;
            if (form !== this.subject) return;

            if (typeof form.reportValidity === 'function' && !form.reportValidity()) return;
            
            evt.preventDefault();
            this.clearFieldErrors();

            const request = this.buildRequest(form);
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
                    if (shouldUseJson) {
                        this.handleJsonSuccess(body.data, response);
                    } else {
                        this.handleHtmlSuccess(body.text, response);
                    }

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
            this.subject.addEventListener('submit', this.handleSubmit);
            this.isBound = true;
        }

        /**
         * Desvincula listeners previamente registrados.
         * @returns {void}
         */
        unbind() {
            if (!this.isBound) return;
            this.subject.removeEventListener('submit', this.handleSubmit);
            this.isBound = false;
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
         * @param {Object} [options={}] Opciones de inicializacion.
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

    const startAutoInit = () => {
        FormRequest.initAll(document);

        const observer = new MutationObserver((mutations) => {
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
        });

        observer.observe(document.body, { childList: true, subtree: true });
    };

    document.readyState === 'loading'
        ? document.addEventListener('DOMContentLoaded', startAutoInit, { once: true })
        : startAutoInit();

    window.FormRequest = FormRequest;
})();
