/**
 * @fileoverview Plugin nativo para guardar y restaurar borradores de formularios en localStorage/sessionStorage.
 * @module FormDraft
 * @version 1.0
 * @since 2026
 * @author Samuel Montenegro
 * @license MIT
 * @copyright (c) 2026 Samuel Montenegro
 */
(function () {
    'use strict';

    /**
     * Selector declarativo de formularios con persistencia de borrador.
     * @type {string}
     */
    const SELECTOR_SUBJECT = 'form[data-form-draft]'
        /**
         * Registro de instancias por formulario.
         * @type {WeakMap<HTMLFormElement, FormDraft>}
         */
        , INSTANCES = new WeakMap()
        /**
         * Nodos removidos pendientes de limpieza diferida.
         * @type {Set<Element>}
         */
        , PENDING_REMOVALS = new Set();

    /**
     * Defaults de configuracion para guardado/restauracion de borradores.
     * @type {Object}
     */
    const FORM_DRAFT_DEFAULTS = Object.freeze({
        storage: 'local',
        keyPrefix: 'formDraft',
        key: '',
        debounceMs: 350,
        saveOnInput: true,
        saveOnChange: true,
        saveOnBlur: false,
        restoreOnInit: true,
        clearOnSubmit: false,
        clearOnFormRequestSuccess: true,
        includeSelector: '',
        excludeSelector: '[data-fd-ignore], [type="password"], [type="file"]',
        maxAgeMs: 0,
        onBeforeSave: function () { },
        onSaved: function () { },
        onRestored: function () { },
        onCleared: function () { },
        onError: function () { },
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
     * Convierte valores a numero con fallback seguro.
     * @param {unknown} value Valor fuente.
     * @param {number} [fallback=0] Valor por defecto.
     * @returns {number}
     */
    const parseNumber = (value, fallback = 0) => {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : fallback;
    };

    /**
     * Normaliza el backend de almacenamiento permitido por el plugin.
     *
     * @param {string|undefined|null} value Valor crudo (`local` o `session`).
     * @returns {'local'|'session'} Nombre de storage seguro.
     */
    const normalizeStorageName = (value) => {
        const normalized = String(value || '').trim().toLowerCase();
        return normalized === 'session' ? 'session' : 'local';
    };

    /**
     * Obtiene storage disponible de forma segura.
     * @param {'local'|'session'} storageName Nombre de backend.
     * @returns {Storage|null}
     */
    const getStorageSafe = (storageName) => {
        try {
            if (storageName === 'session') {
                return window.sessionStorage;
            }
            return window.localStorage;
        } catch (_error) {
            return null;
        }
    };

    /**
     * Verifica si el campo pertenece a tipos soportados por serializacion.
     * @param {Element} field Campo a evaluar.
     * @returns {boolean}
     */
    const isSupportedField = (field) => {
        return field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement;
    };

    /**
     * Indica si un input debe omitirse del ciclo de guardado/restauracion.
     *
     * @param {Element} field Campo a evaluar.
     * @returns {boolean} `true` para tipos no persistibles (submit, button, reset, image).
     */
    const isSkippableType = (field) => {
        if (!(field instanceof HTMLInputElement)) return false;
        const type = String(field.type || '').toLowerCase();
        return ['submit', 'button', 'reset', 'image'].includes(type);
    };

    /**
     * Obtiene formularios compatibles dentro de un root.
     * @param {ParentNode|Element|Document} [root=document] Nodo raiz.
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
     * Lee opciones declarativas (`data-fd-*`) desde el formulario.
     *
     * @param {HTMLFormElement} element Formulario sujeto.
     * @returns {Object} Opciones parciales para inicializar la instancia.
     */
    const getOptionsFromData = (element) => {
        const options = {}
            , saveOnInput = parseBoolean(element.dataset.fdSaveOnInput)
            , saveOnChange = parseBoolean(element.dataset.fdSaveOnChange)
            , saveOnBlur = parseBoolean(element.dataset.fdSaveOnBlur)
            , restoreOnInit = parseBoolean(element.dataset.fdRestoreOnInit)
            , clearOnSubmit = parseBoolean(element.dataset.fdClearOnSubmit)
            , clearOnFormRequestSuccess = parseBoolean(element.dataset.fdClearOnFormRequestSuccess);

        const setTrimmedOption = (key, value, transform) => {
            if (typeof value !== 'string') return;
            const trimmedValue = value.trim();
            if (!trimmedValue) return;
            options[key] = typeof transform === 'function' ? transform(trimmedValue) : trimmedValue;
        };

        setTrimmedOption('storage', element.dataset.fdStorage, normalizeStorageName);
        setTrimmedOption('keyPrefix', element.dataset.fdKeyPrefix);
        setTrimmedOption('key', element.dataset.fdKey);
        setTrimmedOption('includeSelector', element.dataset.fdInclude);
        setTrimmedOption('excludeSelector', element.dataset.fdExclude);

        element.dataset.fdDebounce !== undefined && (options.debounceMs = Math.max(0, parseNumber(element.dataset.fdDebounce, FORM_DRAFT_DEFAULTS.debounceMs)));
        element.dataset.fdMaxAge !== undefined && (options.maxAgeMs = Math.max(0, parseNumber(element.dataset.fdMaxAge, FORM_DRAFT_DEFAULTS.maxAgeMs)));

        saveOnInput !== undefined && (options.saveOnInput = saveOnInput);
        saveOnChange !== undefined && (options.saveOnChange = saveOnChange);
        saveOnBlur !== undefined && (options.saveOnBlur = saveOnBlur);
        restoreOnInit !== undefined && (options.restoreOnInit = restoreOnInit);
        clearOnSubmit !== undefined && (options.clearOnSubmit = clearOnSubmit);
        clearOnFormRequestSuccess !== undefined && (options.clearOnFormRequestSuccess = clearOnFormRequestSuccess);

        return options;
    };

    const readJsonSafe = (value) => {
        if (!value || typeof value !== 'string') return null;

        try {
            const parsed = JSON.parse(value);
            return parsed && typeof parsed === 'object' ? parsed : null;
        } catch (_error) {
            return null;
        }
    };

    /**
     * Opciones publicas para controlar guardado, restauracion y limpieza de borradores.
     * @typedef {Object} FormDraftOptions
     * @property {'local'|'session'} [storage='local'] Motor de persistencia para borradores.
     * @property {string} [keyPrefix='formDraft'] Prefijo usado al generar la clave automaticamente.
     * @property {string} [key=''] Clave explicita para el borrador (si existe, tiene prioridad).
     * @property {number} [debounceMs=350] Debounce en ms para guardado reactivo.
     * @property {boolean} [saveOnInput=true] Guarda borrador durante eventos input.
     * @property {boolean} [saveOnChange=true] Guarda borrador durante eventos change.
     * @property {boolean} [saveOnBlur=false] Guarda borrador durante eventos blur.
     * @property {boolean} [restoreOnInit=true] Restaura borrador al inicializar la instancia.
     * @property {boolean} [clearOnSubmit=false] Limpia borrador al submit nativo del formulario.
     * @property {boolean} [clearOnFormRequestSuccess=true] Limpia borrador en success.plugin.formRequest.
     * @property {string} [includeSelector=''] Selector de campos permitidos (whitelist).
     * @property {string} [excludeSelector='[data-fd-ignore], [type="password"], [type="file"]'] Selector de campos ignorados.
     * @property {number} [maxAgeMs=0] Edad maxima del borrador en ms (0 desactiva expiracion).
     * @property {(draft:Object, form:HTMLFormElement)=>void} [onBeforeSave] Hook previo al guardado.
     * @property {(draft:Object, form:HTMLFormElement)=>void} [onSaved] Hook al guardar.
     * @property {(draft:Object, form:HTMLFormElement)=>void} [onRestored] Hook al restaurar.
     * @property {(form:HTMLFormElement)=>void} [onCleared] Hook al limpiar.
     * @property {(error:Error, form:HTMLFormElement)=>void} [onError] Hook de error.
     */

    /**
     * Plugin para persistir borradores de formularios en storage del navegador.
     *
     * Responsabilidades principales:
     * - Capturar cambios de campos y guardarlos con debounce.
     * - Restaurar valores en una visita posterior.
     * - Limpiar borrador por submit o por exito de FormRequest.
     * - Exponer eventos y API publica para integracion manual.
     *
     * @fires before.plugin.formDraft
     * @fires saved.plugin.formDraft
     * @fires restored.plugin.formDraft
     * @fires cleared.plugin.formDraft
     * @fires error.plugin.formDraft
     */
    class FormDraft {
        /**
         * Crea una instancia para persistir estado del formulario en storage.
         * @param {HTMLFormElement} element Formulario que sera observado.
         * @param {FormDraftOptions} options Opciones de configuracion de la instancia.
         */
        constructor(element, options) {
            this.subject = element;
            this.options = { ...FORM_DRAFT_DEFAULTS, ...options };
            this.isBound = false;
            this.saveTimer = null;
            this.handleInput = this.handleInput.bind(this);
            this.handleChange = this.handleChange.bind(this);
            this.handleBlur = this.handleBlur.bind(this);
            this.handleSubmit = this.handleSubmit.bind(this);
            this.handleFormRequestSuccess = this.handleFormRequestSuccess.bind(this);
        }

        /**
         * Nombre normalizado del storage seleccionado.
         * @returns {'local'|'session'}
         */
        get storageName() {
            return normalizeStorageName(this.options.storage);
        }

        /**
         * Instancia de Storage segura (`localStorage` o `sessionStorage`).
         * @returns {Storage|null}
         */
        get storage() {
            return getStorageSafe(this.storageName);
        }

        /**
         * Clave final usada para persistir el borrador del formulario.
         * @returns {string}
         */
        get storageKey() {
            if (this.options.key) return this.options.key;

            const formId = this.subject.getAttribute('id') || ''
                , formName = this.subject.getAttribute('name') || ''
                , formAction = this.subject.getAttribute('action') || ''
                , path = window.location.pathname || '/';

            return [this.options.keyPrefix, path, formId, formName, formAction]
                .map((item) => String(item || '').trim())
                .filter(Boolean)
                .join('::');
        }

        /**
         * Determina si un campo debe participar en serializacion/restauracion.
         * @param {HTMLElement} field Campo candidato.
         * @returns {boolean}
         */
        shouldTrackField(field) {
            if (!isSupportedField(field)) return false;
            if (!field.name) return false;
            if (field.disabled) return false;
            if (isSkippableType(field)) return false;

            if (this.options.includeSelector) {
                try {
                    if (!field.matches(this.options.includeSelector)) return false;
                } catch (_error) {
                    return false;
                }
            }

            if (this.options.excludeSelector) {
                try {
                    if (field.matches(this.options.excludeSelector)) return false;
                } catch (_error) {
                    return false;
                }
            }

            return true;
        }

        /**
         * Obtiene los campos elegibles del formulario para el borrador.
         * @returns {Array<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>}
         */
        collectTrackableFields() {
            return Array.from(this.subject.elements).filter((field) => this.shouldTrackField(field));
        }

        /**
         * Agrupa campos por atributo name.
         * @param {Array<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>} fields Lista de campos.
         * @returns {Map<string, Array<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>>}
         */
        getGroupsByName(fields) {
            const groups = new Map();

            fields.forEach((field) => {
                const name = field.name;
                if (!groups.has(name)) {
                    groups.set(name, []);
                }
                groups.get(name).push(field);
            });

            return groups;
        }

        /**
         * Serializa los valores actuales del formulario en un objeto plano.
         * @returns {Object<string, any>}
         */
        serializeValues() {
            const fields = this.collectTrackableFields()
                , groups = this.getGroupsByName(fields)
                , values = {};

            groups.forEach((nodes, name) => {
                const first = nodes[0];

                if (first instanceof HTMLInputElement && first.type === 'radio') {
                    const checked = nodes.find((node) => node.checked);
                    values[name] = checked ? checked.value : null;
                    return;
                }

                if (first instanceof HTMLInputElement && first.type === 'checkbox') {
                    if (nodes.length > 1) {
                        values[name] = nodes.filter((node) => node.checked).map((node) => node.value);
                        return;
                    }

                    values[name] = Boolean(first.checked);
                    return;
                }

                if (first instanceof HTMLSelectElement && first.multiple) {
                    values[name] = Array.from(first.selectedOptions).map((option) => option.value);
                    return;
                }

                values[name] = String(first.value || '');
            });

            return values;
        }

        /**
         * Construye la estructura de borrador que se persiste en storage.
         * @returns {{version:number, savedAt:number, values:Object<string, any>}}
         */
        buildDraft() {
            return {
                version: 1,
                savedAt: Date.now(),
                values: this.serializeValues(),
            };
        }

        /**
         * Aplica un valor restaurado en el campo correspondiente.
         * @param {HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement} field Campo destino.
         * @param {any} value Valor a restaurar.
         * @param {Map<string, Array<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>>} allNodesByName Grupos por name.
         * @returns {void}
         */
        setFieldValue(field, value, allNodesByName) {
            if (field instanceof HTMLInputElement && field.type === 'radio') {
                const group = allNodesByName.get(field.name) || [field];
                group.forEach((node) => {
                    node.checked = value != null && String(node.value) === String(value);
                });
                return;
            }

            if (field instanceof HTMLInputElement && field.type === 'checkbox') {
                const group = allNodesByName.get(field.name) || [field];

                if (group.length > 1) {
                    const asArray = Array.isArray(value) ? value.map((item) => String(item)) : [];
                    group.forEach((node) => {
                        node.checked = asArray.includes(String(node.value));
                    });
                    return;
                }

                field.checked = Boolean(value);
                return;
            }

            if (field instanceof HTMLSelectElement && field.multiple) {
                const asArray = Array.isArray(value) ? value.map((item) => String(item)) : [];
                Array.from(field.options).forEach((option) => {
                    option.selected = asArray.includes(String(option.value));
                });
                return;
            }

            field.value = value == null ? '' : String(value);
        }

        /**
         * Emite hook y evento de error centralizado del plugin.
         * @param {Error} error Error capturado.
         * @returns {void}
         */
        emitError(error) {
            this.options.onError && this.options.onError(error, this.subject);
            this.subject.dispatchEvent(new CustomEvent('error.plugin.formDraft', {
                detail: {
                    error,
                    key: this.storageKey,
                    form: this.subject,
                },
            }));
        }

        /**
         * Guarda inmediatamente el borrador actual en storage.
         * @returns {boolean} `true` cuando se guarda correctamente.
         */
        saveNow() {
            const storage = this.storage;
            if (!storage) return false;

            const draft = this.buildDraft()
                , beforeEvent = new CustomEvent('before.plugin.formDraft', {
                    cancelable: true,
                    detail: {
                        draft,
                        key: this.storageKey,
                        form: this.subject,
                    },
                });

            this.options.onBeforeSave && this.options.onBeforeSave(draft, this.subject);
            if (!this.subject.dispatchEvent(beforeEvent)) {
                return false;
            }

            try {
                storage.setItem(this.storageKey, JSON.stringify(draft));
            } catch (error) {
                this.emitError(error);
                return false;
            }

            this.options.onSaved && this.options.onSaved(draft, this.subject);
            this.subject.dispatchEvent(new CustomEvent('saved.plugin.formDraft', {
                detail: {
                    draft,
                    key: this.storageKey,
                    form: this.subject,
                },
            }));

            return true;
        }

        /**
         * Programa guardado con debounce segun configuracion.
         * @returns {void}
         */
        scheduleSave() {
            const debounceMs = Math.max(0, parseNumber(this.options.debounceMs, 0));
            if (debounceMs === 0) {
                this.saveNow();
                return;
            }

            if (this.saveTimer) {
                clearTimeout(this.saveTimer);
            }

            this.saveTimer = window.setTimeout(() => {
                this.saveNow();
                this.saveTimer = null;
            }, debounceMs);
        }

        /**
         * Restaura valores desde storage al formulario actual.
         * @returns {boolean} `true` cuando restaura un borrador valido.
         */
        restoreNow() {
            const storage = this.storage;
            if (!storage) return false;

            const raw = storage.getItem(this.storageKey)
                , parsed = readJsonSafe(raw);

            if (!parsed || !parsed.values || typeof parsed.values !== 'object') {
                return false;
            }

            const maxAgeMs = Math.max(0, parseNumber(this.options.maxAgeMs, 0))
                , savedAt = Number(parsed.savedAt || 0)
                , isExpired = maxAgeMs > 0 && savedAt > 0 && (Date.now() - savedAt) > maxAgeMs;

            if (isExpired) {
                storage.removeItem(this.storageKey);
                return false;
            }

            const fields = this.collectTrackableFields()
                , groups = this.getGroupsByName(fields)
                , restoredValues = parsed.values;

            fields.forEach((field) => {
                const name = field.name;
                if (!(name in restoredValues)) return;
                this.setFieldValue(field, restoredValues[name], groups);
            });

            this.options.onRestored && this.options.onRestored(parsed, this.subject);
            this.subject.dispatchEvent(new CustomEvent('restored.plugin.formDraft', {
                detail: {
                    draft: parsed,
                    key: this.storageKey,
                    form: this.subject,
                },
            }));

            return true;
        }

        /**
         * Elimina el borrador persistido del formulario actual.
         * @returns {boolean} `true` cuando elimina correctamente la clave.
         */
        clearDraft() {
            const storage = this.storage;
            if (!storage) return false;

            try {
                storage.removeItem(this.storageKey);
            } catch (error) {
                this.emitError(error);
                return false;
            }

            this.options.onCleared && this.options.onCleared(this.subject);
            this.subject.dispatchEvent(new CustomEvent('cleared.plugin.formDraft', {
                detail: {
                    key: this.storageKey,
                    form: this.subject,
                },
            }));

            return true;
        }

        /**
         * Handler input para guardado reactivo.
         * @param {Event} evt Evento input.
         * @returns {void}
         */
        handleInput(evt) {
            const field = evt.target;
            if (!this.shouldTrackField(field)) return;
            this.scheduleSave();
        }

        /**
         * Handler change para guardado reactivo.
         * @param {Event} evt Evento change.
         * @returns {void}
         */
        handleChange(evt) {
            const field = evt.target;
            if (!this.shouldTrackField(field)) return;
            this.scheduleSave();
        }

        /**
         * Handler blur para guardado reactivo.
         * @param {Event} evt Evento blur.
         * @returns {void}
         */
        handleBlur(evt) {
            const field = evt.target;
            if (!this.shouldTrackField(field)) return;
            this.scheduleSave();
        }

        /**
         * Handler submit del formulario para guardar o limpiar borrador.
         * @returns {void}
         */
        handleSubmit() {
            if (this.options.clearOnSubmit === true) {
                this.clearDraft();
            } else {
                this.saveNow();
            }
        }

        /**
         * Handler del exito de FormRequest para limpiar borrador automaticamente.
         * @returns {void}
         */
        handleFormRequestSuccess() {
            if (this.options.clearOnFormRequestSuccess !== true) return;
            this.clearDraft();
        }

        /**
         * Define listeners activos de la instancia segun configuracion actual.
         * @returns {Array<[string, EventListenerOrEventListenerObject, (boolean|undefined)]>}
         */
        getListeners() {
            return [
                [this.options.saveOnInput === true ? 'input' : '', this.handleInput, true],
                [this.options.saveOnChange === true ? 'change' : '', this.handleChange, true],
                [this.options.saveOnBlur === true ? 'blur' : '', this.handleBlur, true],
                ['submit', this.handleSubmit],
                ['success.plugin.formRequest', this.handleFormRequestSuccess],
            ].filter(([eventName]) => Boolean(eventName));
        }

        /**
         * Aplica add/remove de listeners en lote.
         * @param {'addEventListener'|'removeEventListener'} method Metodo de registro en EventTarget.
         * @returns {void}
         */
        applyListeners(method) {
            this.getListeners().forEach(([eventName, handler, useCapture]) => {
                this.subject[method](eventName, handler, useCapture);
            });
        }

        /**
         * Vincula listeners segun configuracion de la instancia.
         * @returns {void}
         */
        bind() {
            if (this.isBound) return;

            this.applyListeners('addEventListener');
            this.isBound = true;
        }

        /**
         * Desvincula listeners y limpia timers internos.
         * @returns {void}
         */
        unbind() {
            if (!this.isBound) return;

            this.applyListeners('removeEventListener');

            if (this.saveTimer) {
                clearTimeout(this.saveTimer);
                this.saveTimer = null;
            }

            this.isBound = false;
        }

        /**
         * Destruye la instancia actual y libera su referencia interna.
         * @returns {void}
         */
        destroy() {
            this.unbind();
            INSTANCES.delete(this.subject);
        }

        /**
         * Crea o reutiliza una instancia para un formulario.
         * @param {HTMLFormElement} element Formulario objetivo.
         * @param {FormDraftOptions} [options={}] Opciones de configuración de la instancia.
         * @returns {FormDraft}
         */
        static init(element, options = {}) {
            if (!(element instanceof HTMLFormElement)) {
                throw new Error('Error: FormDraft.init requiere un HTMLFormElement.');
            }

            const currentInstance = INSTANCES.get(element);
            if (currentInstance) return currentInstance;

            const mergedOptions = { ...getOptionsFromData(element), ...options }
                , instance = new FormDraft(element, mergedOptions);

            INSTANCES.set(element, instance);
            instance.bind();

            if (instance.options.restoreOnInit === true) {
                instance.restoreNow();
            }

            return instance;
        }

        /**
         * Devuelve instancia registrada para un formulario.
         * @param {HTMLFormElement} element Formulario objetivo.
         * @returns {FormDraft|null}
         */
        static getInstance(element) {
            if (!(element instanceof HTMLFormElement)) return null;
            return INSTANCES.get(element) || null;
        }

        /**
         * Destruye instancia registrada para un formulario.
         * @param {HTMLFormElement} element Formulario objetivo.
         * @returns {void}
         */
        static destroy(element) {
            if (!(element instanceof HTMLFormElement)) return;
            const instance = INSTANCES.get(element);
            if (!instance) return;
            instance.destroy();
        }

        /**
         * Inicializa todas las coincidencias en un nodo raiz.
         * @param {Document|Element|ParentNode} [root=document] Nodo raiz de busqueda.
         * @returns {FormDraft[]}
         */
        static initAll(root = document) {
            return getSubjects(root).map((subject) => FormDraft.init(subject));
        }

        /**
         * Destruye todas las coincidencias dentro de un nodo raiz.
         * @param {Document|Element|ParentNode} [root=document] Nodo raiz de busqueda.
         * @returns {void}
         */
        static destroyAll(root = document) {
            getSubjects(root).forEach((subject) => FormDraft.destroy(subject));
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
             * @param {string} pluginKey Ej: 'form-validate'
             * @returns {Element}
             */
            function resolveRoot(pluginKey) {
                // 1. data-pp-observe-root-{plugin}
                const attr = `data-pp-observe-root-${pluginKey}`
                    , specific = document.querySelector(`[${attr}]`);
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
     * Limpia instancias asociadas a formularios removidos del DOM.
     * @returns {void}
     */
    const flushPendingRemovals = () => {
        PENDING_REMOVALS.forEach((node) => {
            if (!node.isConnected) {
                FormDraft.destroyAll(node);
            }
            PENDING_REMOVALS.delete(node);
        });
    };

    /**
     * Agenda verificacion diferida de remocion de nodos.
     * @param {Element} node Nodo removido en mutacion.
     * @returns {void}
     */
    const scheduleRemovalCheck = (node) => {
        PENDING_REMOVALS.add(node);
        queueMicrotask(flushPendingRemovals);
    };

    /**
     * Inicializa automáticamente las instancias del plugin y observa cambios en el DOM.
     * @returns {void}
     */
    // Handler para mutaciones DOM relacionadas con FormDraft
    const formDraftDomHandler = (mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (!(node instanceof Element)) return;
                PENDING_REMOVALS.delete(node);
                FormDraft.initAll(node);
            });
            mutation.removedNodes.forEach((node) => {
                if (!(node instanceof Element)) return;
                scheduleRemovalCheck(node);
            });
        });
    };

    const bootstrap = () => {
        FormDraft.initAll(document);
        // Usar ObserverDispatcher para registrar el handler solo sobre el root adecuado
        window.Plugins.ObserverDispatcher.register('form-draft', formDraftDomHandler);
    };

    document.readyState === 'loading'
        ? document.addEventListener('DOMContentLoaded', bootstrap, { once: true })
        : bootstrap();

    window.Plugins.FormDraft = FormDraft;
})();
