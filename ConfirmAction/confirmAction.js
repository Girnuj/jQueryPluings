/**
 * @fileoverview Plugin nativo para confirmar acciones sensibles o destructivas.
 * @module ConfirmAction
 * @version 1.0
 * @since 2026
 * @author Samuel Montenegro
 * @license MIT
 * @copyright (c) 2026 Samuel Montenegro
 */
(function () {
    'use strict';

    /**
     * Selector declarativo de elementos con confirmacion.
     * @type {string}
     */
    const SELECTOR_SUBJECT = '[data-confirm-action]'
        /**
         * Registro de instancias por elemento.
         * @type {WeakMap<HTMLElement, ConfirmAction>}
         */
        , INSTANCES = new WeakMap()
        /**
         * Nodos removidos pendientes de limpieza diferida.
         * @type {Set<Element>}
         */
        , PENDING_REMOVALS = new Set();

    /**
     * Defaults de configuracion de ConfirmAction.
     * @type {Object}
     */
    const CONFIRM_ACTION_DEFAULTS = Object.freeze({
        message: 'Estas seguro de continuar?',
        title: '',
        enabled: true,
        dialogSelector: '',
        confirmAdapter: null,
        preConfirm: null,
        confirmText: 'Confirmar',
        cancelText: 'Cancelar',
        denyText: '',
        confirmClass: '',
        cancelClass: '',
        denyClass: '',
        loadingClass: 'is-loading',
        allowEscape: true,
        allowOutsideClick: true,
        focusConfirm: true,
        beforeConfirm: function () { },
        onConfirm: function () { },
        onCancel: function () { },
        onDeny: function () { },
    });

    /**
     * Convierte valores de dataset/atributos a booleano tolerante.
     *
     * @param {unknown} value Valor crudo a normalizar.
     * @returns {boolean|undefined} `undefined` cuando no se puede inferir un booleano valido.
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
     * Obtiene todos los elementos objetivo dentro de un root dado.
     *
     * @param {ParentNode|Element|Document} [root=document] Nodo raiz para la busqueda.
     * @returns {Element[]} Coleccion de elementos que cumplen el selector del plugin.
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
     * Lee y normaliza opciones declarativas desde atributos data-ca-*.
     *
     * @param {HTMLElement} element Elemento sujeto del plugin.
     * @returns {Partial<ConfirmActionOptions>} Opciones parseadas desde dataset.
     */
    const getOptionsFromData = (element) => {
        const options = {}
            , enabled = parseBoolean(element.dataset.caEnabled);

        const setTrimmedOption = (key, value, transform) => {
            if (typeof value !== 'string') return;
            const trimmedValue = value.trim();
            if (!trimmedValue) return;
            options[key] = typeof transform === 'function' ? transform(trimmedValue) : trimmedValue;
        };

        const allowEscape = parseBoolean(element.dataset.caAllowEscape)
            , allowOutsideClick = parseBoolean(element.dataset.caAllowOutsideClick)
            , focusConfirm = parseBoolean(element.dataset.caFocusConfirm);

        setTrimmedOption('message', element.dataset.caMessage);
        setTrimmedOption('title', element.dataset.caTitle);
        setTrimmedOption('dialogSelector', element.dataset.caDialog);
        setTrimmedOption('confirmText', element.dataset.caConfirmText);
        setTrimmedOption('cancelText', element.dataset.caCancelText);
        setTrimmedOption('denyText', element.dataset.caDenyText);
        setTrimmedOption('confirmClass', element.dataset.caConfirmClass);
        setTrimmedOption('cancelClass', element.dataset.caCancelClass);
        setTrimmedOption('denyClass', element.dataset.caDenyClass);
        setTrimmedOption('loadingClass', element.dataset.caLoadingClass);

        allowEscape !== undefined && (options.allowEscape = allowEscape);
        allowOutsideClick !== undefined && (options.allowOutsideClick = allowOutsideClick);
        focusConfirm !== undefined && (options.focusConfirm = focusConfirm);
        enabled !== undefined && (options.enabled = enabled);

        return options;
    };

    /**
     * Estructura estandar del contexto de confirmacion emitido en hooks y eventos.
     * @typedef {Object} ConfirmActionDetail
     * @property {HTMLElement} element Elemento asociado a la accion.
     * @property {'click'|'submit'} actionType Tipo de accion confirmada.
     * @property {string} title Titulo de confirmacion.
     * @property {string} content Mensaje principal sin formato adicional.
     * @property {string} message Mensaje final mostrado al usuario.
     * @property {'confirm'|'cancel'|'deny'} decision Resultado final de la confirmacion.
     * @property {Event} originalEvent Evento original que disparo la confirmacion.
     */

    /**
     * Contrato de opciones publicas para configurar el comportamiento de confirmacion.
     * @typedef {Object} ConfirmActionOptions
     * @property {string} [message='Estas seguro de continuar?'] Mensaje principal del prompt.
     * @property {string} [title=''] Titulo opcional del prompt.
     * @property {boolean} [enabled=true] Activa o desactiva la confirmacion.
     * @property {string} [dialogSelector=''] Selector CSS de contenedor/dialog custom.
     * @property {(detail: ConfirmActionDetail, element: HTMLElement) => (boolean|'confirm'|'cancel'|'deny'|Promise<boolean|'confirm'|'cancel'|'deny'>)} [confirmAdapter] Adapter custom sync/async para resolver confirmacion.
     * @property {(detail: ConfirmActionDetail, element: HTMLElement) => (boolean|'confirm'|'cancel'|'deny'|Promise<boolean|'confirm'|'cancel'|'deny'>)} [preConfirm] Hook async previo a confirmar.
     * @property {string} [confirmText='Confirmar'] Texto del boton confirmar.
     * @property {string} [cancelText='Cancelar'] Texto del boton cancelar.
     * @property {string} [denyText=''] Texto del boton deny (si existe).
     * @property {string} [confirmClass=''] Clase CSS adicional para confirmar.
     * @property {string} [cancelClass=''] Clase CSS adicional para cancelar.
     * @property {string} [denyClass=''] Clase CSS adicional para deny.
     * @property {string} [loadingClass='is-loading'] Clase aplicada mientras `preConfirm` esta en ejecucion.
     * @property {boolean} [allowEscape=true] Permite cerrar con Escape.
     * @property {boolean} [allowOutsideClick=true] Permite cerrar haciendo click fuera del dialog custom.
     * @property {boolean} [focusConfirm=true] Enfoca el boton confirmar al abrir dialog custom.
     * @property {(detail: ConfirmActionDetail, element: HTMLElement) => void} [beforeConfirm] Hook previo a la confirmacion.
     * @property {(detail: ConfirmActionDetail, element: HTMLElement) => void} [onConfirm] Hook cuando el usuario confirma.
     * @property {(detail: ConfirmActionDetail, element: HTMLElement) => void} [onCancel] Hook cuando el usuario cancela.
     * @property {(detail: ConfirmActionDetail, element: HTMLElement) => void} [onDeny] Hook cuando el usuario selecciona deny.
     */

    /**
     * Controla confirmaciones para acciones sensibles en elementos con `data-confirm-action`.
     *
     * Flujo general:
     * 1. Construye un detalle normalizado de la accion (`ConfirmActionDetail`).
     * 2. Ejecuta `beforeConfirm` y emite `before.plugin.confirmAction` (cancelable).
     * 3. Resuelve la decision por `confirmAdapter`, `dialogSelector` o `window.confirm`.
     * 4. Emite eventos finales segun decision (`confirmed`, `cancelled`, `denied`).
     *
     * @fires before.plugin.confirmAction
     * @fires confirmed.plugin.confirmAction
     * @fires cancelled.plugin.confirmAction
     * @fires denied.plugin.confirmAction
     */
    class ConfirmAction {
        /**
         * Crea una instancia del controlador de confirmacion para el elemento indicado.
         * @param {HTMLElement} element Elemento objetivo (boton, link o formulario).
         * @param {ConfirmActionOptions} options Configuracion de instancia.
         */
        constructor(element, options) {
            this.subject = element;
            this.options = { ...CONFIRM_ACTION_DEFAULTS, ...options };
            this.isBound = false;
            this.skipNextClick = false;
            this.skipNextSubmit = false;
            this.handleClick = this.handleClick.bind(this);
            this.handleSubmitCapture = this.handleSubmitCapture.bind(this);
        }

        /**
         * Obtiene el titulo efectivo para el prompt.
         *
         * @returns {string} Titulo saneado (sin espacios al inicio/fin).
         */
        getTitleText() {
            return String(this.options.title || '').trim();
        }

        /**
         * Obtiene el mensaje principal efectivo de confirmacion.
         *
         * @returns {string} Mensaje saneado o el default del plugin cuando viene vacio.
         */
        getMessageText() {
            return String(this.options.message || '').trim() || CONFIRM_ACTION_DEFAULTS.message;
        }

        /**
         * Construye el texto final mostrado al usuario.
         *
         * Si existe titulo, se concatena en dos lineas con el mensaje.
         *
         * @returns {string} Prompt completo para adapters/dialogs/fallback nativo.
         */
        buildPromptMessage() {
            const title = this.getTitleText()
                , message = this.getMessageText();

            if (!title) return message;
            return title + '\n\n' + message;
        }

        /**
         * Construye un detalle canonico de la accion a confirmar.
         *
         * @param {'click'|'submit'} actionType Tipo de interaccion original.
         * @param {Event} originalEvent Evento que disparo el flujo.
         * @param {'confirm'|'cancel'|'deny'} [decision='cancel'] Estado inicial de decision.
         * @returns {ConfirmActionDetail}
         */
        buildDetail(actionType, originalEvent, decision = 'cancel') {
            return {
                element: this.subject,
                actionType,
                title: this.getTitleText(),
                content: this.getMessageText(),
                message: this.buildPromptMessage(),
                decision,
                originalEvent,
            };
        }

        /**
         * Normaliza distintos valores de confirmacion a una decision canonica.
         *
         * @param {unknown} value Valor emitido por adapter/dialog/preConfirm.
         * @returns {'confirm'|'cancel'|'deny'}
         */
        normalizeDecision(value) {
            if (value === true || value === 'confirm') return 'confirm';
            if (value === 'deny') return 'deny';
            return 'cancel';
        }

        /**
         * Indica si la confirmacion esta activa para la instancia.
         *
         * @returns {boolean}
         */
        isEnabled() {
            return this.options.enabled !== false;
        }

        /**
         * Ejecuta hook previo y emite evento cancelable antes de confirmar.
         *
         * @param {ConfirmActionDetail} detail
         * @returns {boolean} `false` cuando algun listener cancela el evento.
         */
        dispatchBefore(detail) {
            this.options.beforeConfirm && this.options.beforeConfirm(detail, this.subject);
            const evt = new CustomEvent('before.plugin.confirmAction', {
                cancelable: true,
                detail,
            });

            return this.subject.dispatchEvent(evt);
        }

        /**
         * Notifica una confirmacion aceptada.
         *
         * @param {ConfirmActionDetail} detail
         * @returns {void}
         */
        dispatchConfirmed(detail) {
            this.options.onConfirm && this.options.onConfirm(detail, this.subject);
            this.subject.dispatchEvent(new CustomEvent('confirmed.plugin.confirmAction', {
                detail,
            }));
        }

        /**
         * Notifica una confirmacion cancelada por el usuario.
         *
         * @param {ConfirmActionDetail} detail
         * @returns {void}
         */
        dispatchCancelled(detail) {
            this.options.onCancel && this.options.onCancel(detail, this.subject);
            this.subject.dispatchEvent(new CustomEvent('cancelled.plugin.confirmAction', {
                detail,
            }));
        }

        /**
         * Emite hooks y evento cuando el flujo termina en decision deny.
         *
         * @param {ConfirmActionDetail} detail
         * @returns {void}
         */
        dispatchDenied(detail) {
            this.options.onDeny && this.options.onDeny(detail, this.subject);
            this.subject.dispatchEvent(new CustomEvent('denied.plugin.confirmAction', {
                detail,
            }));
        }

        /**
         * Aplica clases CSS (tokenizadas por espacios) sobre un boton destino.
         *
         * @param {Element|null} button Elemento destino.
         * @param {string} className Cadena con clases separadas por espacio.
         * @returns {void}
         */
        applyButtonClass(button, className) {
            if (!(button instanceof HTMLElement)) return;
            if (!className || typeof className !== 'string') return;
            className.trim().split(/\s+/).filter(Boolean).forEach((token) => {
                button.classList.add(token);
            });
        }

        /**
         * Ejecuta el hook `preConfirm` y gestiona estado visual de carga.
         *
         * @param {ConfirmActionDetail} detail Contexto de la accion en curso.
         * @param {Element|null} loadingTarget Boton/elemento que recibira la clase de loading.
         * @returns {Promise<'confirm'|'cancel'|'deny'>}
         */
        async runPreConfirm(detail, loadingTarget) {
            if (typeof this.options.preConfirm !== 'function') return 'confirm';

            const loadingClass = typeof this.options.loadingClass === 'string' && this.options.loadingClass.trim()
                ? this.options.loadingClass.trim()
                : CONFIRM_ACTION_DEFAULTS.loadingClass;

            if (loadingTarget instanceof HTMLElement) {
                loadingTarget.classList.add(loadingClass);
                if ('disabled' in loadingTarget) {
                    loadingTarget.disabled = true;
                }
            }

            try {
                const result = this.options.preConfirm(detail, this.subject)
                    , resolved = result instanceof Promise ? await result : result;
                return this.normalizeDecision(resolved === undefined ? true : resolved);
            } catch (_error) {
                return 'cancel';
            } finally {
                if (loadingTarget instanceof HTMLElement) {
                    loadingTarget.classList.remove(loadingClass);
                    if ('disabled' in loadingTarget) {
                        loadingTarget.disabled = false;
                    }
                }
            }
        }

        /**
         * Intenta resolver la decision usando el adapter custom.
         *
         * @param {ConfirmActionDetail} detail
         * @returns {Promise<'confirm'|'cancel'|'deny'|null>} `null` cuando no hay adapter.
         */
        async resolveByAdapter(detail) {
            if (typeof this.options.confirmAdapter !== 'function') return null;

            const result = this.options.confirmAdapter(detail, this.subject)
                , resolved = result instanceof Promise ? await result : result;

            return this.normalizeDecision(resolved);
        }

        /**
         * Intenta resolver la decision con un dialog HTML personalizado.
         *
         * Requiere al menos botones `[data-ca-confirm]` y `[data-ca-cancel]`.
         *
         * @param {ConfirmActionDetail} detail
         * @returns {Promise<'confirm'|'cancel'|'deny'|null>} `null` cuando el dialog no aplica.
         */
        async resolveByDialog(detail) {
            const selector = typeof this.options.dialogSelector === 'string'
                ? this.options.dialogSelector.trim()
                : '';

            if (!selector) return null;

            let dialog = null;
            try {
                dialog = document.querySelector(selector);
            } catch (_error) {
                dialog = null;
            }

            if (!(dialog instanceof HTMLElement)) {
                return null;
            }

            const confirmButton = dialog.querySelector('[data-ca-confirm]')
                , cancelButton = dialog.querySelector('[data-ca-cancel]')
                , denyButton = dialog.querySelector('[data-ca-deny]')
                , titleTarget = dialog.querySelector('[data-ca-dialog-title]')
                , messageTarget = dialog.querySelector('[data-ca-dialog-message]');

            if (!(confirmButton instanceof HTMLElement) || !(cancelButton instanceof HTMLElement)) {
                return null;
            }

            confirmButton.textContent = String(this.options.confirmText || CONFIRM_ACTION_DEFAULTS.confirmText);
            cancelButton.textContent = String(this.options.cancelText || CONFIRM_ACTION_DEFAULTS.cancelText);
            this.applyButtonClass(confirmButton, this.options.confirmClass);
            this.applyButtonClass(cancelButton, this.options.cancelClass);

            const denyText = String(this.options.denyText || '').trim();
            if (denyButton instanceof HTMLElement) {
                if (denyText) {
                    denyButton.textContent = denyText;
                    denyButton.removeAttribute('hidden');
                    this.applyButtonClass(denyButton, this.options.denyClass);
                } else {
                    denyButton.setAttribute('hidden', '');
                }
            }

            titleTarget && (titleTarget.textContent = detail.title || 'Confirmar accion');
            messageTarget && (messageTarget.textContent = detail.content);

            return new Promise((resolve) => {
                let isDone = false
                    , isProcessing = false;
                const wasHidden = dialog.hasAttribute('hidden')
                    , isNativeDialog = dialog instanceof HTMLDialogElement
                    , listeners = [];

                const allowEscape = this.options.allowEscape !== false
                    , allowOutsideClick = this.options.allowOutsideClick !== false;

                const addManagedListener = (target, eventName, handler, options) => {
                    target.addEventListener(eventName, handler, options);
                    listeners.push([target, eventName, handler, options]);
                };

                const cleanup = () => {
                    listeners.forEach(([target, eventName, handler, options]) => {
                        target.removeEventListener(eventName, handler, options);
                    });
                    listeners.length = 0;

                    if (isNativeDialog) {
                        dialog.open && dialog.close();
                    } else {
                        dialog.classList.remove('is-open');
                        if (wasHidden) {
                            dialog.setAttribute('hidden', '');
                        }
                    }
                };

                const done = (value) => {
                    if (isDone) return;
                    isDone = true;
                    cleanup();
                    resolve(this.normalizeDecision(value));
                };

                const onConfirm = async () => {
                    if (isProcessing) return;
                    isProcessing = true;

                    const preDecision = await this.runPreConfirm({ ...detail, decision: 'confirm' }, confirmButton);
                    isProcessing = false;

                    if (preDecision === 'confirm') {
                        done('confirm');
                    } else if (preDecision === 'deny') {
                        done('deny');
                    }
                }
                    , onCancel = () => done(false)
                    , onDeny = () => done('deny')
                    , onDialogCancel = (evt) => {
                        evt.preventDefault();
                        allowEscape && done(false);
                    }
                    , onDialogClose = () => {
                        done(false);
                    }
                    , onKeyDown = (evt) => {
                        if (evt.key !== 'Escape') return;
                        evt.preventDefault();
                        allowEscape && done(false);
                    }
                    , onOutsideClick = (evt) => {
                        if (allowOutsideClick && evt.target === dialog) {
                            done(false);
                        }
                    };

                addManagedListener(confirmButton, 'click', onConfirm);
                addManagedListener(cancelButton, 'click', onCancel);
                if (denyButton instanceof HTMLElement && denyText) {
                    addManagedListener(denyButton, 'click', onDeny);
                }

                if (isNativeDialog) {
                    addManagedListener(dialog, 'cancel', onDialogCancel);
                    addManagedListener(dialog, 'close', onDialogClose);
                    if (!dialog.open) {
                        dialog.showModal();
                    }
                    this.options.focusConfirm !== false && confirmButton.focus();
                } else {
                    dialog.removeAttribute('hidden');
                    dialog.classList.add('is-open');
                    addManagedListener(dialog, 'keydown', onKeyDown);
                    addManagedListener(dialog, 'click', onOutsideClick);
                    this.options.focusConfirm !== false && confirmButton.focus();
                }
            });
        }

        /**
         * Resuelve la decision final siguiendo el orden de prioridad configurado.
         *
         * Orden:
         * 1) `confirmAdapter`
         * 2) `dialogSelector`
         * 3) `window.confirm` (fallback)
         *
         * @param {ConfirmActionDetail} detail
         * @returns {Promise<'confirm'|'cancel'|'deny'>}
         */
        async resolveConfirmation(detail) {
            try {
                const adapterResult = await this.resolveByAdapter(detail);
                if (adapterResult !== null) return adapterResult;

                const dialogResult = await this.resolveByDialog(detail);
                if (dialogResult !== null) return dialogResult;
            } catch (_error) {
                // Fallback seguro a confirm nativo cuando un adapter/dialog custom falla.
            }

            const nativeDecision = this.normalizeDecision(window.confirm(detail.message))
                , preDecision = nativeDecision === 'confirm'
                    ? await this.runPreConfirm({ ...detail, decision: 'confirm' }, null)
                    : nativeDecision;

            return preDecision === 'confirm' || preDecision === 'deny' ? preDecision : 'cancel';
        }

        /**
         * Orquesta el flujo completo de confirmacion para una accion.
         *
         * @param {'click'|'submit'} actionType
         * @param {Event} originalEvent
         * @returns {Promise<boolean>} `true` solo cuando la decision final es `confirm`.
         */
        async askConfirmation(actionType, originalEvent) {
            if (!this.isEnabled()) return true;

            const detail = this.buildDetail(actionType, originalEvent);
            if (!this.dispatchBefore(detail)) return false;

            const decision = await this.resolveConfirmation(detail)
                , finalDetail = { ...detail, decision };

            if (decision === 'confirm') {
                this.dispatchConfirmed(finalDetail);
                return true;
            }

            if (decision === 'deny') {
                this.dispatchDenied(finalDetail);
                return false;
            }

            this.dispatchCancelled(finalDetail);
            return false;
        }

        /**
         * Handler para elementos no-form (boton/link).
         * @param {MouseEvent} evt
         * @returns {Promise<void>}
         */
        async handleClick(evt) {
            if (!(this.subject instanceof HTMLElement)) return;
            if (this.subject instanceof HTMLFormElement) return;

            if (this.skipNextClick) {
                this.skipNextClick = false;
                return;
            }

            if (this.subject.hasAttribute('disabled') || this.subject.getAttribute('aria-disabled') === 'true') {
                return;
            }

            evt.preventDefault();
            evt.stopImmediatePropagation();

            const confirmed = await this.askConfirmation('click', evt);
            if (!confirmed) return;

            this.skipNextClick = true;
            this.subject.click();
        }

        /**
         * Handler de submit en captura para formularios.
         * @param {SubmitEvent} evt
         * @returns {Promise<void>}
         */
        async handleSubmitCapture(evt) {
            if (!(this.subject instanceof HTMLFormElement)) return;

            if (this.skipNextSubmit) {
                this.skipNextSubmit = false;
                return;
            }

            evt.preventDefault();
            evt.stopImmediatePropagation();

            const submitter = evt.submitter instanceof HTMLElement ? evt.submitter : null
                , confirmed = await this.askConfirmation('submit', evt);

            if (!confirmed) return;

            this.skipNextSubmit = true;

            if (typeof this.subject.requestSubmit === 'function') {
                this.subject.requestSubmit(submitter || undefined);
                return;
            }

            this.subject.submit();
        }

        /**
         * Registra listeners segun tipo de elemento.
         * @returns {void}
         */
        bind() {
            if (this.isBound) return;

            this.applyListeners('addEventListener');

            this.isBound = true;
        }

        /**
         * Remueve listeners de la instancia.
         * @returns {void}
         */
        unbind() {
            if (!this.isBound) return;

            this.applyListeners('removeEventListener');

            this.isBound = false;
        }

        /**
         * Define listeners activos de la instancia segun tipo de subject.
         * @returns {Array<[string, EventListenerOrEventListenerObject, (boolean|undefined)]>}
         */
        getListeners() {
            if (this.subject instanceof HTMLFormElement) {
                return [['submit', this.handleSubmitCapture, true]];
            }

            return [['click', this.handleClick]];
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
         * Destruye la instancia y limpia registro interno.
         * @returns {void}
         */
        destroy() {
            this.unbind();
            INSTANCES.delete(this.subject);
        }

        /**
         * Inicializa o reutiliza una instancia para el elemento dado.
         * @param {HTMLElement} element
         * @param {ConfirmActionOptions} [options={}]
         * @returns {ConfirmAction}
         */
        static init(element, options = {}) {
            if (!(element instanceof HTMLElement)) {
                throw new Error('Error: ConfirmAction.init requiere un HTMLElement.');
            }

            const currentInstance = INSTANCES.get(element);
            if (currentInstance) return currentInstance;

            const mergedOptions = { ...getOptionsFromData(element), ...options }
                , instance = new ConfirmAction(element, mergedOptions);

            INSTANCES.set(element, instance);
            instance.bind();
            return instance;
        }

        /**
         * Recupera la instancia asociada a un elemento.
         *
         * @param {HTMLElement} element
         * @returns {ConfirmAction|null}
         */
        static getInstance(element) {
            if (!(element instanceof HTMLElement)) return null;
            return INSTANCES.get(element) || null;
        }

        /**
         * Destruye la instancia asociada al elemento si existe.
         *
         * @param {HTMLElement} element
         * @returns {void}
         */
        static destroy(element) {
            if (!(element instanceof HTMLElement)) return;
            const instance = INSTANCES.get(element);
            if (!instance) return;
            instance.destroy();
        }

        /**
         * Inicializa todos los sujetos encontrados bajo un root.
         *
         * @param {ParentNode|Element|Document} [root=document]
         * @returns {ConfirmAction[]}
         */
        static initAll(root = document) {
            return getSubjects(root).map((subject) => ConfirmAction.init(subject));
        }

        /**
         * Destruye todas las instancias encontradas bajo un root.
         *
         * @param {ParentNode|Element|Document} [root=document]
         * @returns {void}
         */
        static destroyAll(root = document) {
            getSubjects(root).forEach((subject) => ConfirmAction.destroy(subject));
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
     * Procesa nodos removidos en microtarea para destruir instancias huérfanas.
     * @returns {void}
     */
    const flushPendingRemovals = () => {
        PENDING_REMOVALS.forEach((node) => {
            if (!node.isConnected) {
                ConfirmAction.destroyAll(node);
            }
            PENDING_REMOVALS.delete(node);
        });
    };

    /**
     * Agenda la validacion diferida de nodos removidos.
     * @param {Node} node Nodo removido del DOM.
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
    // Handler para mutaciones DOM relacionadas con ConfirmAction
    const confirmActionDomHandler = (mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (!(node instanceof Element)) return;
                PENDING_REMOVALS.delete(node);
                ConfirmAction.initAll(node);
            });
            mutation.removedNodes.forEach((node) => {
                if (!(node instanceof Element)) return;
                scheduleRemovalCheck(node);
            });
        });
    };

    const bootstrap = () => {
        ConfirmAction.initAll(document);
        // Usar ObserverDispatcher para registrar el handler solo sobre el root adecuado
        window.Plugins.ObserverDispatcher.register('confirm-action', confirmActionDomHandler);
    };
    
    document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', bootstrap, { once: true })
    : bootstrap();

    window.Plugins.ConfirmAction = ConfirmAction;
})();
