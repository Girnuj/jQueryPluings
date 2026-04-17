/**
 * @fileoverview Plugin nativo para confirmar acciones sensibles o destructivas.
 * @version 1.0
 * @since 2026
 * @author Samuel Montenegro
 * @module ConfirmAction
 */
(function () {
    'use strict';

    const SELECTOR_SUBJECT = '[data-confirm-action]'
        , INSTANCES = new WeakMap()
        , PENDING_REMOVALS = new Set();

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

    const parseBoolean = (value) => {
        if (value === undefined) return undefined;
        if (typeof value === 'boolean') return value;

        const normalized = String(value).trim().toLowerCase();
        if (['', 'true', '1', 'yes', 'on'].includes(normalized)) return true;
        if (['false', '0', 'no', 'off'].includes(normalized)) return false;
        return undefined;
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
                ConfirmAction.destroyAll(node);
            }
            PENDING_REMOVALS.delete(node);
        });
    };

    const scheduleRemovalCheck = (node) => {
        PENDING_REMOVALS.add(node);
        queueMicrotask(flushPendingRemovals);
    };

    const getOptionsFromData = (element) => {
        const options = {}
            , enabled = parseBoolean(element.dataset.caEnabled);

        if (typeof element.dataset.caMessage === 'string' && element.dataset.caMessage.trim()) {
            options.message = element.dataset.caMessage.trim();
        }

        if (typeof element.dataset.caTitle === 'string' && element.dataset.caTitle.trim()) {
            options.title = element.dataset.caTitle.trim();
        }

        if (typeof element.dataset.caDialog === 'string' && element.dataset.caDialog.trim()) {
            options.dialogSelector = element.dataset.caDialog.trim();
        }

        if (typeof element.dataset.caConfirmText === 'string' && element.dataset.caConfirmText.trim()) {
            options.confirmText = element.dataset.caConfirmText.trim();
        }

        if (typeof element.dataset.caCancelText === 'string' && element.dataset.caCancelText.trim()) {
            options.cancelText = element.dataset.caCancelText.trim();
        }

        if (typeof element.dataset.caDenyText === 'string' && element.dataset.caDenyText.trim()) {
            options.denyText = element.dataset.caDenyText.trim();
        }

        if (typeof element.dataset.caConfirmClass === 'string' && element.dataset.caConfirmClass.trim()) {
            options.confirmClass = element.dataset.caConfirmClass.trim();
        }

        if (typeof element.dataset.caCancelClass === 'string' && element.dataset.caCancelClass.trim()) {
            options.cancelClass = element.dataset.caCancelClass.trim();
        }

        if (typeof element.dataset.caDenyClass === 'string' && element.dataset.caDenyClass.trim()) {
            options.denyClass = element.dataset.caDenyClass.trim();
        }

        if (typeof element.dataset.caLoadingClass === 'string' && element.dataset.caLoadingClass.trim()) {
            options.loadingClass = element.dataset.caLoadingClass.trim();
        }

        const allowEscape = parseBoolean(element.dataset.caAllowEscape)
            , allowOutsideClick = parseBoolean(element.dataset.caAllowOutsideClick)
            , focusConfirm = parseBoolean(element.dataset.caFocusConfirm);

        if (allowEscape !== undefined) {
            options.allowEscape = allowEscape;
        }

        if (allowOutsideClick !== undefined) {
            options.allowOutsideClick = allowOutsideClick;
        }

        if (focusConfirm !== undefined) {
            options.focusConfirm = focusConfirm;
        }

        if (enabled !== undefined) {
            options.enabled = enabled;
        }

        return options;
    };

    /**
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
     * Soporta 3 modos de resolucion:
     * - Adapter custom (`confirmAdapter`).
     * - Contenedor/dialog personalizado (`dialogSelector`).
     * - Fallback nativo con `window.confirm`.
     */
    class ConfirmAction {
        /**
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
         * @returns {string}
         */
        getTitleText() {
            return String(this.options.title || '').trim();
        }

        /**
         * @returns {string}
         */
        getMessageText() {
            return String(this.options.message || '').trim() || CONFIRM_ACTION_DEFAULTS.message;
        }

        /**
         * @returns {string}
         */
        buildPromptMessage() {
            const title = this.getTitleText()
                , message = this.getMessageText();

            if (!title) return message;
            return title + '\n\n' + message;
        }

        /**
         * @param {'click'|'submit'} actionType
         * @param {Event} originalEvent
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

        normalizeDecision(value) {
            if (value === true || value === 'confirm') return 'confirm';
            if (value === 'deny') return 'deny';
            return 'cancel';
        }

        /**
         * @returns {boolean}
         */
        isEnabled() {
            return this.options.enabled !== false;
        }

        /**
         * @param {ConfirmActionDetail} detail
         * @returns {boolean}
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
         * @param {ConfirmActionDetail} detail
         * @returns {void}
         */
        dispatchCancelled(detail) {
            this.options.onCancel && this.options.onCancel(detail, this.subject);
            this.subject.dispatchEvent(new CustomEvent('cancelled.plugin.confirmAction', {
                detail,
            }));
        }

        dispatchDenied(detail) {
            this.options.onDeny && this.options.onDeny(detail, this.subject);
            this.subject.dispatchEvent(new CustomEvent('denied.plugin.confirmAction', {
                detail,
            }));
        }

        applyButtonClass(button, className) {
            if (!(button instanceof HTMLElement)) return;
            if (!className || typeof className !== 'string') return;
            className.trim().split(/\s+/).filter(Boolean).forEach((token) => {
                button.classList.add(token);
            });
        }

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
         * @param {ConfirmActionDetail} detail
         * @returns {Promise<boolean|null>}
         */
        async resolveByAdapter(detail) {
            if (typeof this.options.confirmAdapter !== 'function') return null;

            const result = this.options.confirmAdapter(detail, this.subject)
                , resolved = result instanceof Promise ? await result : result;

            return this.normalizeDecision(resolved);
        }

        /**
         * @param {ConfirmActionDetail} detail
         * @returns {Promise<boolean|null>}
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

            if (titleTarget) {
                titleTarget.textContent = detail.title || 'Confirmar accion';
            }

            if (messageTarget) {
                messageTarget.textContent = detail.content;
            }

            return new Promise((resolve) => {
                let isDone = false;
                let isProcessing = false;
                const wasHidden = dialog.hasAttribute('hidden')
                    , isNativeDialog = dialog instanceof HTMLDialogElement;

                const allowEscape = this.options.allowEscape !== false
                    , allowOutsideClick = this.options.allowOutsideClick !== false;

                const cleanup = () => {
                    confirmButton.removeEventListener('click', onConfirm);
                    cancelButton.removeEventListener('click', onCancel);
                    if (denyButton instanceof HTMLElement) {
                        denyButton.removeEventListener('click', onDeny);
                    }

                    if (isNativeDialog) {
                        dialog.removeEventListener('cancel', onDialogCancel);
                        dialog.removeEventListener('close', onDialogClose);
                        if (dialog.open) {
                            dialog.close();
                        }
                    } else {
                        dialog.removeEventListener('keydown', onKeyDown);
                        dialog.removeEventListener('click', onOutsideClick);
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
                        if (allowEscape) {
                            done(false);
                        }
                    }
                    , onDialogClose = () => {
                        done(false);
                    }
                    , onKeyDown = (evt) => {
                        if (evt.key === 'Escape') {
                            evt.preventDefault();
                            if (allowEscape) {
                                done(false);
                            }
                        }
                    }
                    , onOutsideClick = (evt) => {
                        if (!allowOutsideClick) return;
                        if (evt.target === dialog) {
                            done(false);
                        }
                    };

                confirmButton.addEventListener('click', onConfirm);
                cancelButton.addEventListener('click', onCancel);
                if (denyButton instanceof HTMLElement && denyText) {
                    denyButton.addEventListener('click', onDeny);
                }

                if (isNativeDialog) {
                    dialog.addEventListener('cancel', onDialogCancel);
                    dialog.addEventListener('close', onDialogClose);
                    if (!dialog.open) {
                        dialog.showModal();
                    }
                    if (this.options.focusConfirm !== false) {
                        confirmButton.focus();
                    }
                } else {
                    dialog.removeAttribute('hidden');
                    dialog.classList.add('is-open');
                    dialog.addEventListener('keydown', onKeyDown);
                    dialog.addEventListener('click', onOutsideClick);
                    if (this.options.focusConfirm !== false) {
                        confirmButton.focus();
                    }
                }
            });
        }

        /**
         * @param {ConfirmActionDetail} detail
         * @returns {Promise<boolean>}
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
         * @param {'click'|'submit'} actionType
         * @param {Event} originalEvent
         * @returns {Promise<boolean>}
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
                if (submitter) {
                    this.subject.requestSubmit(submitter);
                } else {
                    this.subject.requestSubmit();
                }
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

            if (this.subject instanceof HTMLFormElement) {
                this.subject.addEventListener('submit', this.handleSubmitCapture, true);
            } else {
                this.subject.addEventListener('click', this.handleClick);
            }

            this.isBound = true;
        }

        /**
         * Remueve listeners de la instancia.
         * @returns {void}
         */
        unbind() {
            if (!this.isBound) return;

            if (this.subject instanceof HTMLFormElement) {
                this.subject.removeEventListener('submit', this.handleSubmitCapture, true);
            } else {
                this.subject.removeEventListener('click', this.handleClick);
            }

            this.isBound = false;
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
         * @param {HTMLElement} element
         * @returns {ConfirmAction|null}
         */
        static getInstance(element) {
            if (!(element instanceof HTMLElement)) return null;
            return INSTANCES.get(element) || null;
        }

        /**
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
         * @param {ParentNode|Element|Document} [root=document]
         * @returns {ConfirmAction[]}
         */
        static initAll(root = document) {
            return getSubjects(root).map((subject) => ConfirmAction.init(subject));
        }

        /**
         * @param {ParentNode|Element|Document} [root=document]
         * @returns {void}
         */
        static destroyAll(root = document) {
            getSubjects(root).forEach((subject) => ConfirmAction.destroy(subject));
        }
    }

    window.ConfirmAction = ConfirmAction;

    const bootstrap = () => {
        ConfirmAction.initAll(document);
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
    } else {
        bootstrap();
    }

    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (!(node instanceof Element)) return;
                ConfirmAction.initAll(node);
            });

            mutation.removedNodes.forEach((node) => {
                if (!(node instanceof Element)) return;
                scheduleRemovalCheck(node);
            });
        });
    });

    const observeGlobal = (document.documentElement.getAttribute('data-pp-observe-global') || '').trim().toLowerCase();
    if (!['false', '0', 'off', 'no'].includes(observeGlobal)) {
        const observeRootSelector = (document.documentElement.getAttribute('data-pp-observe-root') || '').trim()
            , observeRootElement = document.querySelector('[data-pp-observe-root-confirm-action]');
        let observeRoot = observeRootElement || document.body || document.documentElement;

        if (observeRootSelector && !observeRootElement) {
            try {
                observeRoot = document.querySelector(observeRootSelector) || observeRoot;
            } catch (_error) {
                observeRoot = document.body || document.documentElement;
            }
        }

        observer.observe(observeRoot, {
            childList: true,
            subtree: true,
        });
    }
})();
