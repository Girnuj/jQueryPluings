/**
 * @fileoverview Plugin nativo para paginacion incremental con boton "ver mas" o infinite scroll.
 * @module InfinitePager
 * @version 1.0
 * @since 2026
 * @author Samuel Montenegro
 * @license MIT
 * @copyright (c) 2026 Samuel Montenegro
 */
(function () {
    'use strict';

    /**
     * Selector declarativo de triggers para paginacion incremental.
     * @type {string}
     */
    const SELECTOR_SUBJECT = '[data-role="infinite-pager"]'
        /**
         * Registro de instancias por trigger.
         * @type {WeakMap<HTMLElement, InfinitePager>}
         */
        , INSTANCES = new WeakMap()
        /**
         * Nodos removidos pendientes de limpieza diferida.
         * @type {Set<Element>}
         */
        , PENDING_REMOVALS = new Set();

    /**
     * Defaults del plugin InfinitePager.
     * @type {Object}
     */
    const INFINITE_PAGER_DEFAULTS = Object.freeze({
        endpoint: '',
        method: 'GET',
        headers: null,
        mode: 'button',
        targetSelector: '',
        sentinelSelector: '',
        initialPage: 1,
        pageSize: 10,
        pageParam: 'page',
        pageSizeParam: 'pageSize',
        responseMode: 'auto',
        htmlPath: 'html',
        itemsPath: 'items',
        hasMorePath: 'hasMore',
        nextPagePath: 'nextPage',
        rootMargin: '300px 0px',
        threshold: 0,
        autoLoadOnInit: undefined,
        stopOnEmpty: true,
        sameOrigin: true,
        credentials: 'same-origin',
        loadingClass: 'is-loading',
        disabledClass: 'is-disabled',
        renderItem: null,
        beforeRequest: function () { },
        onSuccess: function () { },
        onError: function () { },
        onComplete: function () { },
        onEnd: function () { },
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
     * Convierte valores numericos con fallback.
     * @param {unknown} value Valor crudo.
     * @param {number} [fallback=0] Valor por defecto.
     * @returns {number}
     */
    const parseNumber = (value, fallback = 0) => {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : fallback;
    };

    /**
     * Parsea un JSON de objeto plano para opciones de headers/params.
     *
     * @param {string|undefined|null} value Cadena JSON candidata.
     * @returns {Object<string, string>|null} Objeto normalizado o `null` si no aplica.
     */
    const parseJsonObject = (value) => {
        if (!value || typeof value !== 'string') return null;

        try {
            const parsed = JSON.parse(value);
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;

            const entries = Object.entries(parsed)
                .map(([key, val]) => [String(key || '').trim(), String(val == null ? '' : val)])
                .filter(([key]) => key.length > 0);

            return entries.length > 0 ? Object.fromEntries(entries) : null;
        } catch (_error) {
            return null;
        }
    };

    const normalizeMethod = (value) => {
        const method = String(value || '').trim().toUpperCase() || INFINITE_PAGER_DEFAULTS.method;
        if (!['GET', 'POST'].includes(method)) {
            throw new Error("Error: 'method' solo permite 'GET' o 'POST'.");
        }
        return method;
    };

    /**
     * Normaliza modo de activacion del pager (`button` o `scroll`).
     * @param {unknown} value Valor configurado.
     * @returns {'button'|'scroll'}
     */
    const normalizeMode = (value) => {
        const mode = String(value || '').trim().toLowerCase() || INFINITE_PAGER_DEFAULTS.mode;
        if (!['button', 'scroll'].includes(mode)) {
            throw new Error("Error: 'mode' solo permite 'button' o 'scroll'.");
        }
        return mode;
    };

    /**
     * Normaliza modo de parseo de respuesta remota.
     * @param {unknown} value Valor configurado.
     * @returns {'auto'|'html'|'json'}
     */
    const normalizeResponseMode = (value) => {
        const mode = String(value || '').trim().toLowerCase() || INFINITE_PAGER_DEFAULTS.responseMode;
        if (!['auto', 'html', 'json'].includes(mode)) {
            throw new Error("Error: 'responseMode' solo permite 'auto', 'html' o 'json'.");
        }
        return mode;
    };

    /**
     * Resuelve valores por path anidado (ej: `data.items`).
     * @param {Object<string, any>} obj Objeto base.
     * @param {string} path Ruta separada por punto.
     * @returns {*}
     */
    const resolvePath = (obj, path) => {
        if (!obj || typeof obj !== 'object') return undefined;
        if (!path || typeof path !== 'string') return undefined;

        return path.split('.').reduce((accumulator, segment) => {
            if (accumulator == null) return undefined;
            return accumulator[segment];
        }, obj);
    };

    /**
     * Escapa HTML para render seguro de valores dinamicos.
     * @param {unknown} value Valor de entrada.
     * @returns {string}
     */
    const escapeHtml = (value) => {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    };

    /**
     * Obtiene triggers compatibles dentro de un root.
     * @param {ParentNode|Element|Document} [root=document] Nodo raiz de busqueda.
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
     * Lee opciones declarativas del paginador desde `data-pager-*` y aliases legacy.
     *
     * @param {HTMLElement} element Elemento sujeto del plugin.
     * @returns {Object} Opciones parciales para construir la instancia.
     */
    const getOptionsFromData = (element) => {
        const getDataValue = (pagerKey, legacyKey) => {
            const pagerValue = element.dataset[pagerKey];
            if (pagerValue !== undefined) return pagerValue;
            return legacyKey ? element.dataset[legacyKey] : undefined;
        };

        /**
         * Asigna una opcion string solo cuando contiene valor util.
         *
         * @param {string} key Clave destino en `options`.
         * @param {string|undefined} value Valor crudo a validar.
         * @param {Function} [transform] Transformador opcional del valor final.
         * @returns {void}
         */
        const setTrimmedOption = (key, value, transform) => {
            if (typeof value !== 'string') return;
            const trimmedValue = value.trim();
            if (!trimmedValue) return;
            options[key] = typeof transform === 'function' ? transform(trimmedValue) : trimmedValue;
        };

        const endpoint = getDataValue('pagerEndpoint', 'ipEndpoint')
            , targetSelector = getDataValue('pagerTarget', 'ipTarget')
            , sentinelSelector = getDataValue('pagerSentinel', 'ipSentinel')
            , pageParam = getDataValue('pagerPageParam', 'ipPageParam')
            , pageSizeParam = getDataValue('pagerPageSizeParam', 'ipPageSizeParam')
            , htmlPath = getDataValue('pagerHtmlPath', 'ipHtmlPath')
            , itemsPath = getDataValue('pagerItemsPath', 'ipItemsPath')
            , hasMorePath = getDataValue('pagerHasMorePath', 'ipHasMorePath')
            , nextPagePath = getDataValue('pagerNextPagePath', 'ipNextPagePath')
            , rootMargin = getDataValue('pagerRootMargin', 'ipRootMargin')
            , credentials = getDataValue('pagerCredentials', 'ipCredentials')
            , loadingClass = getDataValue('pagerLoadingClass', 'ipLoadingClass')
            , disabledClass = getDataValue('pagerDisabledClass', 'ipDisabledClass')
            , initialPage = getDataValue('pagerInitialPage', 'ipInitialPage')
            , pageSize = getDataValue('pagerPageSize', 'ipPageSize')
            , threshold = getDataValue('pagerThreshold', 'ipThreshold')
            , sameOriginRaw = getDataValue('pagerSameOrigin', 'ipSameOrigin')
            , stopOnEmptyRaw = getDataValue('pagerStopOnEmpty', 'ipStopOnEmpty')
            , autoLoadOnInitRaw = getDataValue('pagerAutoLoad', 'ipAutoLoad')
            , method = getDataValue('pagerMethod', 'ipMethod')
            , mode = getDataValue('pagerMode', 'ipMode')
            , responseMode = getDataValue('pagerResponseMode', 'ipResponseMode')
            , headers = parseJsonObject(getDataValue('pagerHeadersJson', 'ipHeadersJson'));

        const options = {}
            , sameOrigin = parseBoolean(sameOriginRaw)
            , stopOnEmpty = parseBoolean(stopOnEmptyRaw)
            , autoLoadOnInit = parseBoolean(autoLoadOnInitRaw);

        setTrimmedOption('endpoint', endpoint);
        setTrimmedOption('targetSelector', targetSelector);
        setTrimmedOption('sentinelSelector', sentinelSelector);
        setTrimmedOption('pageParam', pageParam);
        setTrimmedOption('pageSizeParam', pageSizeParam);
        setTrimmedOption('htmlPath', htmlPath);
        setTrimmedOption('itemsPath', itemsPath);
        setTrimmedOption('hasMorePath', hasMorePath);
        setTrimmedOption('nextPagePath', nextPagePath);
        setTrimmedOption('rootMargin', rootMargin);
        setTrimmedOption('credentials', credentials);
        setTrimmedOption('loadingClass', loadingClass);
        setTrimmedOption('disabledClass', disabledClass);

        headers && (options.headers = headers);
        initialPage !== undefined && (options.initialPage = Math.max(1, Math.floor(parseNumber(initialPage, INFINITE_PAGER_DEFAULTS.initialPage))));
        pageSize !== undefined && (options.pageSize = Math.max(1, Math.floor(parseNumber(pageSize, INFINITE_PAGER_DEFAULTS.pageSize))));
        threshold !== undefined && (options.threshold = Math.max(0, parseNumber(threshold, INFINITE_PAGER_DEFAULTS.threshold)));

        method && (options.method = method);
        mode && (options.mode = mode);
        responseMode && (options.responseMode = responseMode);
        sameOrigin !== undefined && (options.sameOrigin = sameOrigin);
        stopOnEmpty !== undefined && (options.stopOnEmpty = stopOnEmpty);
        autoLoadOnInit !== undefined && (options.autoLoadOnInit = autoLoadOnInit);

        return options;
    };

    const getValidatedOptions = (element, options = {}) => {
        const mergedOptions = { ...INFINITE_PAGER_DEFAULTS, ...getOptionsFromData(element), ...options };

        if (!mergedOptions.endpoint) {
            throw new Error("Error: No se especifico la URL 'data-pager-endpoint'.");
        }

        if (!mergedOptions.targetSelector) {
            throw new Error("Error: No se especifico el selector 'data-pager-target'.");
        }

        mergedOptions.method = normalizeMethod(mergedOptions.method);
        mergedOptions.mode = normalizeMode(mergedOptions.mode);
        mergedOptions.responseMode = normalizeResponseMode(mergedOptions.responseMode);
        mergedOptions.initialPage = Math.max(1, Math.floor(parseNumber(mergedOptions.initialPage, INFINITE_PAGER_DEFAULTS.initialPage)));
        mergedOptions.pageSize = Math.max(1, Math.floor(parseNumber(mergedOptions.pageSize, INFINITE_PAGER_DEFAULTS.pageSize)));
        mergedOptions.threshold = Math.max(0, parseNumber(mergedOptions.threshold, INFINITE_PAGER_DEFAULTS.threshold));

        if (mergedOptions.autoLoadOnInit === undefined) {
            mergedOptions.autoLoadOnInit = mergedOptions.mode === 'scroll';
        }

        return mergedOptions;
    };

    /**
     * Plugin para cargar paginas incrementalmente en listados remotos.
     *
     * Flujo resumido:
     * 1. Construye URL con pagina actual y tamano de pagina.
     * 2. Emite `before.plugin.infinitePager` (cancelable).
     * 3. Consume endpoint y renderiza HTML/JSON segun `responseMode`.
     * 4. Actualiza paginacion interna y emite eventos de ciclo (`success`, `complete`, `end`, `error`).
     *
     * @class InfinitePager
     * @fires before.plugin.infinitePager
     * @fires success.plugin.infinitePager
     * @fires complete.plugin.infinitePager
     * @fires end.plugin.infinitePager
     * @fires error.plugin.infinitePager
     */
    class InfinitePager {
        /**
         * Crea una instancia para controlar la carga incremental del listado remoto.
         * @param {HTMLElement} element Trigger principal del plugin.
         * @param {Object} options Opciones de configuración validadas de la instancia.
         */
        constructor(element, options) {
            this.subject = element;
            this.options = { ...INFINITE_PAGER_DEFAULTS, ...options };
            this.target = this.resolveTarget();
            this.sentinel = this.resolveSentinel();
            this.observer = null;
            this.abortController = null;
            this.isBound = false;
            this.isLoading = false;
            this.hasMore = true;
            this.currentPage = this.options.initialPage - 1;
            this.nextPage = this.options.initialPage;
            this.handleClick = this.handleClick.bind(this);
            this.handleIntersect = this.handleIntersect.bind(this);
        }

        /**
         * Resuelve el contenedor de resultados.
         * @returns {HTMLElement}
         */
        resolveTarget() {
            let target = null;

            try {
                target = document.querySelector(this.options.targetSelector);
            } catch (_error) {
                target = null;
            }

            if (!(target instanceof HTMLElement)) {
                throw new Error(`Error: No se encontro el target '${this.options.targetSelector}'.`);
            }

            return target;
        }

        /**
         * Resuelve o crea sentinel para modo scroll.
         * @returns {HTMLElement|null}
         */
        resolveSentinel() {
            if (this.options.mode !== 'scroll') return null;

            if (this.options.sentinelSelector) {
                try {
                    const externalSentinel = document.querySelector(this.options.sentinelSelector);
                    if (externalSentinel instanceof HTMLElement) {
                        return externalSentinel;
                    }
                } catch (_error) {
                    return null;
                }
            }

            const generatedSentinel = document.createElement('div');
            generatedSentinel.setAttribute('data-ip-generated-sentinel', '');
            generatedSentinel.setAttribute('aria-hidden', 'true');
            generatedSentinel.style.cssText = 'height:1px;width:100%;';
            this.target.insertAdjacentElement('afterend', generatedSentinel);
            return generatedSentinel;
        }

        /**
         * Construye URL final con parametros de paginacion.
         * @param {number} page Numero de pagina solicitada.
         * @returns {string}
         */
        buildUrl(page) {
            const endpoint = new URL(this.options.endpoint, window.location.href);

            if (this.options.sameOrigin && endpoint.origin !== window.location.origin) {
                throw new Error('Error: URL de otro origen bloqueada por sameOrigin.');
            }

            endpoint.searchParams.set(this.options.pageParam, String(page));
            endpoint.searchParams.set(this.options.pageSizeParam, String(this.options.pageSize));

            return endpoint.toString();
        }

        /**
         * Actualiza estado visual de carga.
         * @param {boolean} isLoading Estado de carga.
         * @returns {void}
         */
        setLoadingState(isLoading) {
            this.subject.classList.toggle(this.options.loadingClass, isLoading);
            this.target.classList.toggle(this.options.loadingClass, isLoading);

            if (this.options.mode === 'button') {
                this.subject.classList.toggle(this.options.disabledClass, isLoading || !this.hasMore);
                if ('disabled' in this.subject) {
                    this.subject.disabled = isLoading || !this.hasMore;
                }
            }

            this.subject.setAttribute('aria-busy', String(isLoading));
            this.target.setAttribute('aria-busy', String(isLoading));
        }

        /**
         * Extrae payload de respuesta segun responseMode.
         * @param {Response} response Respuesta fetch.
         * @returns {Promise<{isJson:boolean, json:any, html:string}>}
         */
        async readPayload(response) {
            if (this.options.responseMode === 'html') {
                return {
                    isJson: false,
                    json: null,
                    html: await response.text().catch(() => ''),
                };
            }

            if (this.options.responseMode === 'json') {
                return {
                    isJson: true,
                    json: await response.json().catch(() => null),
                    html: '',
                };
            }

            const contentType = (response.headers.get('Content-Type') || '').toLowerCase()
                , isJson = contentType.includes('json');

            if (isJson) {
                return {
                    isJson: true,
                    json: await response.json().catch(() => null),
                    html: '',
                };
            }

            return {
                isJson: false,
                json: null,
                html: await response.text().catch(() => ''),
            };
        }

        /**
         * Convierte payload recibido en HTML renderizable y metadatos de paginacion.
         * @param {{isJson:boolean, json:any, html:string}} payload Payload normalizado.
         * @returns {{html:string, hasMore:(boolean|undefined), nextPage:(number|undefined)}}
         */
        resolveRenderData(payload) {
            if (!payload.isJson) {
                return {
                    html: String(payload.html || ''),
                    hasMore: undefined,
                    nextPage: undefined,
                };
            }

            const json = payload.json || {}
                , hasMoreRaw = resolvePath(json, this.options.hasMorePath)
                , nextPageRaw = resolvePath(json, this.options.nextPagePath)
                , htmlRaw = resolvePath(json, this.options.htmlPath)
                , itemsRaw = resolvePath(json, this.options.itemsPath);

            let html = '';

            if (typeof htmlRaw === 'string') {
                html = htmlRaw;
            } else if (Array.isArray(itemsRaw)) {
                if (typeof this.options.renderItem === 'function') {
                    html = itemsRaw.map((item, index) => this.options.renderItem(item, index, this.subject)).join('');
                } else {
                    html = itemsRaw.map((item) => `<pre data-ip-fallback-item>${escapeHtml(JSON.stringify(item, null, 2))}</pre>`).join('');
                }
            }

            return {
                html,
                hasMore: typeof hasMoreRaw === 'boolean' ? hasMoreRaw : undefined,
                nextPage: Number.isFinite(Number(nextPageRaw)) ? Number(nextPageRaw) : undefined,
            };
        }

        /**
         * Inserta HTML en target y retorna cantidad aproximada de nodos agregados.
         * @param {string} html HTML a insertar.
         * @returns {number}
         */
        appendHtml(html) {
            if (!html) return 0;

            const template = document.createElement('template');
            template.innerHTML = html;
            const nodes = Array.from(template.content.childNodes);

            this.target.append(...nodes);
            return nodes.length;
        }

        /**
         * Ejecuta carga de la siguiente pagina si el estado lo permite.
         *
         * No inicia una nueva solicitud cuando ya hay una activa o cuando no hay mas paginas.
         *
         * @param {Event|null} [triggerEvent=null] Evento disparador opcional.
         * @returns {Promise<boolean>} `true` cuando se agrega contenido nuevo al target.
         */
        async loadNext(triggerEvent = null) {
            if (this.isLoading || !this.hasMore) return false;

            const requestPage = this.nextPage
                , requestUrl = this.buildUrl(requestPage)
                , detail = {
                    page: requestPage,
                    url: requestUrl,
                    target: this.target,
                    trigger: this.subject,
                    originalEvent: triggerEvent,
                }
                , beforeEvent = new CustomEvent('before.plugin.infinitePager', {
                    cancelable: true,
                    detail,
                });

            this.options.beforeRequest && this.options.beforeRequest(detail, this.subject);
            if (!this.subject.dispatchEvent(beforeEvent)) {
                return false;
            }

            this.isLoading = true;
            this.setLoadingState(true);

            let appendedCount = 0;

            try {
                this.abortController = new AbortController();

                const response = await fetch(requestUrl, {
                    method: this.options.method,
                    headers: this.options.headers || undefined,
                    credentials: this.options.credentials,
                    signal: this.abortController.signal,
                });

                if (!response.ok) {
                    throw new Error(`Error: InfinitePager recibio estado HTTP ${response.status}.`);
                }

                const payload = await this.readPayload(response)
                    , renderData = this.resolveRenderData(payload);

                appendedCount = this.appendHtml(renderData.html);
                this.currentPage = requestPage;
                this.nextPage = renderData.nextPage || (requestPage + 1);

                if (renderData.hasMore === true || renderData.hasMore === false) {
                    this.hasMore = renderData.hasMore;
                } else if (this.options.stopOnEmpty && appendedCount === 0) {
                    this.hasMore = false;
                }

                const successDetail = {
                    ...detail,
                    page: requestPage,
                    nextPage: this.nextPage,
                    appendedCount,
                    hasMore: this.hasMore,
                    response,
                    payload: payload.isJson ? payload.json : renderData.html,
                };

                this.options.onSuccess && this.options.onSuccess(successDetail, this.subject);
                this.subject.dispatchEvent(new CustomEvent('success.plugin.infinitePager', {
                    detail: successDetail,
                }));

                if (!this.hasMore) {
                    this.options.onEnd && this.options.onEnd(successDetail, this.subject);
                    this.subject.dispatchEvent(new CustomEvent('end.plugin.infinitePager', {
                        detail: successDetail,
                    }));
                }

                return appendedCount > 0;
            } catch (error) {
                if (error instanceof DOMException && error.name === 'AbortError') {
                    return false;
                }

                const errorDetail = {
                    ...detail,
                    page: requestPage,
                    error,
                };

                this.options.onError && this.options.onError(errorDetail, this.subject);
                this.subject.dispatchEvent(new CustomEvent('error.plugin.infinitePager', {
                    detail: errorDetail,
                }));

                return false;
            } finally {
                this.abortController = null;
                this.isLoading = false;
                this.setLoadingState(false);

                const completeDetail = {
                    ...detail,
                    page: requestPage,
                    appendedCount,
                    hasMore: this.hasMore,
                };

                this.options.onComplete && this.options.onComplete(completeDetail, this.subject);
                this.subject.dispatchEvent(new CustomEvent('complete.plugin.infinitePager', {
                    detail: completeDetail,
                }));
            }
        }

        /**
         * Reinicia estado interno de paginacion.
         * @param {Object} [options={}] Opciones del reset.
         * @param {boolean} [options.clearTarget=false] Si limpia contenido target.
         * @returns {void}
         */
        reset(options = {}) {
            const { clearTarget = false } = options;

            this.currentPage = this.options.initialPage - 1;
            this.nextPage = this.options.initialPage;
            this.hasMore = true;

            if (clearTarget) {
                this.target.innerHTML = '';
            }

            this.setLoadingState(false);
        }

        /**
         * Handler click para modo button.
         * @param {MouseEvent} event Evento click.
         * @returns {void}
         */
        handleClick(event) {
            event.preventDefault();
            this.loadNext(event);
        }

        /**
         * Handler de IntersectionObserver para modo scroll.
         * @param {IntersectionObserverEntry[]} entries Entradas observadas.
         * @returns {void}
         */
        handleIntersect(entries) {
            const hasIntersection = entries.some((entry) => entry.isIntersecting);
            if (!hasIntersection) return;
            this.loadNext();
        }

        /**
         * Crea observer para modo scroll.
         * @returns {void}
         */
        bindObserver() {
            if (this.options.mode !== 'scroll' || !(this.sentinel instanceof HTMLElement)) return;

            this.observer = new IntersectionObserver(this.handleIntersect, {
                root: null,
                rootMargin: this.options.rootMargin,
                threshold: this.options.threshold,
            });

            this.observer.observe(this.sentinel);
        }

        /**
         * Remueve observer activo.
         * @returns {void}
         */
        unbindObserver() {
            if (!(this.observer instanceof IntersectionObserver)) return;
            this.observer.disconnect();
            this.observer = null;
        }

        /**
         * Define listeners activos de la instancia.
         * @returns {Array<[string, EventListenerOrEventListenerObject, (boolean|undefined)]>}
         */
        getListeners() {
            if (this.options.mode === 'button') {
                return [['click', this.handleClick]];
            }

            return [];
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
         * Vincula listeners/observer de la instancia.
         * @returns {void}
         */
        bind() {
            if (this.isBound) return;

            this.applyListeners('addEventListener');
            this.bindObserver();
            this.isBound = true;
            this.setLoadingState(false);

            if (this.options.autoLoadOnInit === true) {
                this.loadNext();
            }
        }

        /**
         * Desvincula listeners/observer y cancela request en curso.
         * @returns {void}
         */
        unbind() {
            if (!this.isBound) return;

            this.applyListeners('removeEventListener');
            this.unbindObserver();

            if (this.abortController instanceof AbortController) {
                this.abortController.abort();
                this.abortController = null;
            }

            this.isBound = false;
            this.isLoading = false;
            this.setLoadingState(false);
        }

        /**
         * Destruye instancia y libera referencias internas.
         * @returns {void}
         */
        destroy() {
            this.unbind();

            if (this.sentinel instanceof HTMLElement && this.sentinel.hasAttribute('data-ip-generated-sentinel')) {
                this.sentinel.remove();
            }

            INSTANCES.delete(this.subject);
        }

        /**
         * Inicializa una instancia sobre un elemento sujeto.
         * @param {HTMLElement} element Elemento a inicializar.
         * @param {Object} [options={}] Opciones de sobreescritura.
         * @returns {InfinitePager}
         */
        static init(element, options = {}) {
            if (!(element instanceof HTMLElement)) {
                throw new Error('Error: InfinitePager.init requiere un HTMLElement.');
            }

            const currentInstance = INSTANCES.get(element);
            if (currentInstance) return currentInstance;

            const validatedOptions = getValidatedOptions(element, options)
                , instance = new InfinitePager(element, validatedOptions);

            INSTANCES.set(element, instance);
            instance.bind();
            return instance;
        }

        /**
         * Retorna la instancia asociada a un elemento.
         * @param {HTMLElement} element Elemento sujeto.
         * @returns {InfinitePager|null}
         */
        static getInstance(element) {
            if (!(element instanceof HTMLElement)) return null;
            return INSTANCES.get(element) || null;
        }

        /**
         * Destruye la instancia asociada a un elemento.
         * @param {HTMLElement} element Elemento sujeto.
         * @returns {boolean}
         */
        static destroy(element) {
            const instance = InfinitePager.getInstance(element);
            if (!instance) return false;

            instance.destroy();
            return true;
        }

        /**
         * Inicializa todas las instancias dentro de una raiz.
         * @param {Document|Element|ParentNode} [root=document] Nodo raiz de busqueda.
         * @param {Object} [options={}] Opciones compartidas.
         * @returns {InfinitePager[]}
         */
        static initAll(root = document, options = {}) {
            return getSubjects(root).map((element) => InfinitePager.init(element, options));
        }

        /**
         * Destruye todas las instancias dentro de una raiz.
         * @param {Document|Element|ParentNode} [root=document] Nodo raiz de busqueda.
         * @returns {number}
         */
        static destroyAll(root = document) {
            return getSubjects(root).reduce((destroyedCount, element) => {
                return InfinitePager.destroy(element) ? destroyedCount + 1 : destroyedCount;
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
                InfinitePager.destroyAll(node);
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
    const infinitePagerDomHandler = (mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType !== 1) return;
                PENDING_REMOVALS.delete(node);
                InfinitePager.initAll(node);
            });
            mutation.removedNodes.forEach((node) => {
                if (node.nodeType !== 1) return;
                scheduleRemovalCheck(node);
            });
        });
    };

    const startAutoInit = () => {
        InfinitePager.initAll(document);
        // Usar ObserverDispatcher para registrar el handler solo sobre el root adecuado
        window.Plugins.ObserverDispatcher.register('infinite-pager', infinitePagerDomHandler);
    };

    document.readyState === 'loading'
        ? document.addEventListener('DOMContentLoaded', startAutoInit, { once: true })
        : startAutoInit();

    window.Plugins.InfinitePager = InfinitePager;
})();
