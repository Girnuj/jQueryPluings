/**
 * @fileoverview Plugin nativo para agregar validaciones extendidas por data-* en formularios.
 * @version 1.0
 * @since 2026
 * @author Samuel Montenegro
 * @module FormValidate
 */
(function () {
    'use strict';

    const SELECTOR_SUBJECT = 'form[data-form-validate]'
        , INSTANCES = new WeakMap()
        , PENDING_REMOVALS = new Set();

    const FORM_VALIDATE_DEFAULTS = Object.freeze({
        invalidClass: 'is-invalid',
        validClass: 'is-valid',
        summarySelector: '[data-form-validate-summary]',
        focusFirstInvalid: true,
        validateOnInput: true,
        validateOnBlur: true,
        beforeValidate: function () { },
        afterValidate: function () { },
    });

    const parseBoolean = (value) => {
        if (value === undefined) return undefined;
        if (typeof value === 'boolean') return value;
        const normalized = String(value).trim().toLowerCase();
        if (['', 'true', '1', 'yes', 'on'].includes(normalized)) return true;
        if (['false', '0', 'no', 'off'].includes(normalized)) return false;
        return undefined;
    };

    const parseNumber = (value, fallback = 0) => {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : fallback;
    };

    const splitCsv = (value) => {
        if (!value || typeof value !== 'string') return [];
        return value
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean);
    };

    const splitClassTokens = (value) => {
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
                FormValidate.destroyAll(node);
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
            , focusFirstInvalid = parseBoolean(element.dataset.formValidateFocusFirst)
            , validateOnInput = parseBoolean(element.dataset.formValidateOnInput)
            , validateOnBlur = parseBoolean(element.dataset.formValidateOnBlur);

        if (typeof element.dataset.formValidateInvalidClass === 'string' && element.dataset.formValidateInvalidClass.trim()) {
            options.invalidClass = element.dataset.formValidateInvalidClass.trim();
        }

        if (typeof element.dataset.formValidateValidClass === 'string' && element.dataset.formValidateValidClass.trim()) {
            options.validClass = element.dataset.formValidateValidClass.trim();
        }

        if (typeof element.dataset.formValidateSummarySelector === 'string' && element.dataset.formValidateSummarySelector.trim()) {
            options.summarySelector = element.dataset.formValidateSummarySelector.trim();
        }

        if (focusFirstInvalid !== undefined) {
            options.focusFirstInvalid = focusFirstInvalid;
        }

        if (validateOnInput !== undefined) {
            options.validateOnInput = validateOnInput;
        }

        if (validateOnBlur !== undefined) {
            options.validateOnBlur = validateOnBlur;
        }

        return options;
    };

    const isSupportedField = (field) => {
        return field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement;
    };

    const isRuleHost = (field) => {
        if (!isSupportedField(field)) return false;
        if (field.disabled) return false;

        return field.hasAttribute('data-fv-equals')
            || field.hasAttribute('data-fv-required-if')
            || field.hasAttribute('data-fv-required-any')
            || field.hasAttribute('data-fv-number-range')
            || field.hasAttribute('data-fv-no-whitespace')
            || field.hasAttribute('data-fv-min-checked')
            || field.hasAttribute('data-fv-max-files')
            || field.hasAttribute('data-fv-file-max-mb')
            || field.hasAttribute('data-fv-file-types');
    };

    const normalizeFieldValue = (field) => {
        if (field instanceof HTMLInputElement && (field.type === 'checkbox' || field.type === 'radio')) {
            return field.checked ? (field.value || 'on') : '';
        }
        return String(field.value || '').trim();
    };

    const hasMeaningfulValue = (field) => {
        if (field instanceof HTMLInputElement) {
            if (field.type === 'checkbox' || field.type === 'radio') {
                return field.checked;
            }

            if (field.type === 'file') {
                return Array.from(field.files || []).length > 0;
            }
        }

        return normalizeFieldValue(field) !== '';
    };

    const resolveReferenceField = (form, selector) => {
        if (!selector || typeof selector !== 'string') return null;

        try {
            return form.querySelector(selector) || document.querySelector(selector);
        } catch (_error) {
            return null;
        }
    };

    const parseRequiredIfReferenceSelector = (rawRule) => {
        if (!rawRule || typeof rawRule !== 'string') return '';
        const separatorIndex = rawRule.indexOf(':');
        if (separatorIndex <= 0) return '';
        return rawRule.slice(0, separatorIndex).trim();
    };

    const parseNumberRange = (rawRange) => {
        if (!rawRange || typeof rawRange !== 'string') {
            return { hasRule: false, min: null, max: null };
        }

        const separatorIndex = rawRange.indexOf(':');
        if (separatorIndex < 0) {
            return { hasRule: false, min: null, max: null };
        }

        const minRaw = rawRange.slice(0, separatorIndex).trim()
            , maxRaw = rawRange.slice(separatorIndex + 1).trim()
            , min = minRaw === '' ? null : Number(minRaw)
            , max = maxRaw === '' ? null : Number(maxRaw)
            , hasMin = min !== null && Number.isFinite(min)
            , hasMax = max !== null && Number.isFinite(max);

        if (!hasMin && !hasMax) {
            return { hasRule: false, min: null, max: null };
        }

        return {
            hasRule: true,
            min: hasMin ? min : null,
            max: hasMax ? max : null,
        };
    };

    const fileMatchesAcceptedType = (file, token) => {
        if (!file || !token) return false;

        const normalizedToken = token.trim().toLowerCase();
        if (!normalizedToken) return false;

        if (normalizedToken.startsWith('.')) {
            return file.name.toLowerCase().endsWith(normalizedToken);
        }

        if (normalizedToken.endsWith('/*')) {
            const major = normalizedToken.slice(0, -2);
            return file.type.toLowerCase().startsWith(major + '/');
        }

        return file.type.toLowerCase() === normalizedToken;
    };

    /**
     * @typedef {Object} FormValidateOptions
     * @property {string} [invalidClass='is-invalid'] Clase CSS global para campos invalidos.
     * @property {string} [validClass='is-valid'] Clase CSS global para campos validos.
     * @property {string} [summarySelector='[data-form-validate-summary]'] Selector para resumen global de errores.
     * @property {boolean} [focusFirstInvalid=true] Enfoca el primer campo invalido en submit.
     * @property {boolean} [validateOnInput=true] Revalida durante eventos input.
     * @property {boolean} [validateOnBlur=true] Revalida durante eventos blur.
     * @property {(form: HTMLFormElement) => void} [beforeValidate] Hook antes de validar.
     * @property {(errors: ValidationError[], form: HTMLFormElement) => void} [afterValidate] Hook despues de validar.
     */

    /**
     * @typedef {Object} ValidationError
     * @property {false} valid Indica error de validacion.
     * @property {HTMLElement} field Campo que fallo la regla.
     * @property {string} rule Regla que produjo el error.
     * @property {string} message Mensaje final de error para UI.
     */

    /**
     * @typedef {Object} ValidationSuccess
     * @property {true} valid Indica validacion exitosa.
     * @property {HTMLElement} field Campo validado.
     * @property {null} rule No aplica regla de error.
     * @property {string} message Cadena vacia para estado valido.
     */

    /**
     * Controlador principal de validaciones extendidas declaradas por atributos data-*.
     *
     * Responsabilidades:
     * - Resolver reglas por campo y sus mensajes asociados.
     * - Sincronizar clases visuales/ARIA por estado valido o invalido.
     * - Integrarse con submit nativo y con el evento `before.plugin.formRequest`.
     * - Exponer API publica estatica para inicializacion y destruccion.
     */
    class FormValidate {
        /**
         * @param {HTMLFormElement} element Formulario objetivo a validar.
         * @param {FormValidateOptions} options Opciones de configuracion fusionadas.
         */
        constructor(element, options) {
            this.subject = element;
            this.options = { ...FORM_VALIDATE_DEFAULTS, ...options };
            this.isBound = false;
            this.handleSubmitCapture = this.handleSubmitCapture.bind(this);
            this.handleBeforeFormRequest = this.handleBeforeFormRequest.bind(this);
            this.handleInput = this.handleInput.bind(this);
            this.handleBlur = this.handleBlur.bind(this);
        }

        /**
         * Obtiene el contenedor del resumen de errores.
         * @returns {HTMLElement|null}
         */
        get summaryElement() {
            const selector = this.options.summarySelector;
            if (!selector || typeof selector !== 'string') return null;

            try {
                return this.subject.querySelector(selector) || document.querySelector(selector);
            } catch (_error) {
                return null;
            }
        }

        /**
         * Recupera los campos del formulario que contienen reglas del plugin.
         * @returns {Array<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>}
         */
        collectFields() {
            return Array.from(this.subject.elements).filter((field) => isRuleHost(field));
        }

        /**
         * Busca campos que dependen del campo fuente en reglas cruzadas.
         * @param {HTMLElement} sourceField Campo que disparo el cambio.
         * @returns {Array<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>}
         */
        collectDependentFields(sourceField) {
            if (!isSupportedField(sourceField)) return [];

            return this.collectFields().filter((candidate) => {
                if (candidate === sourceField) return false;

                const equalsSelector = candidate.dataset.fvEquals
                    , requiredIfSelector = parseRequiredIfReferenceSelector(candidate.dataset.fvRequiredIf)
                    , requiredAnySelectors = splitCsv(candidate.dataset.fvRequiredAny)
                    , equalsReference = equalsSelector ? resolveReferenceField(this.subject, equalsSelector) : null
                    , requiredIfReference = requiredIfSelector ? resolveReferenceField(this.subject, requiredIfSelector) : null
                    , requiredAnyReferences = requiredAnySelectors
                        .map((selector) => resolveReferenceField(this.subject, selector))
                        .filter((node) => isSupportedField(node));

                return equalsReference === sourceField
                    || requiredIfReference === sourceField
                    || requiredAnyReferences.includes(sourceField);
            });
        }

        /**
         * Genera una clave de referencia para mensajes por campo.
         * @param {HTMLElement} field Campo objetivo.
         * @returns {string}
         */
        getFieldKey(field) {
            return field.getAttribute('name') || field.getAttribute('id') || field.type || 'field';
        }

        /**
         * Resuelve clases de invalido (globales + especificas por campo).
         * @param {HTMLElement} field Campo objetivo.
         * @returns {string[]}
         */
        getInvalidClassTokens(field) {
            const scopedTokens = splitClassTokens(field.dataset.fvInvalidClass);
            return Array.from(new Set([this.options.invalidClass, ...scopedTokens].filter(Boolean)));
        }

        /**
         * Resuelve clases de valido (globales + especificas por campo).
         * @param {HTMLElement} field Campo objetivo.
         * @returns {string[]}
         */
        getValidClassTokens(field) {
            const scopedTokens = splitClassTokens(field.dataset.fvValidClass);
            return Array.from(new Set([this.options.validClass, ...scopedTokens].filter(Boolean)));
        }

        /**
         * Obtiene el nodo donde se mostrara el mensaje del campo.
         * @param {HTMLElement} field Campo objetivo.
         * @returns {HTMLElement|null}
         */
        getMessageTarget(field) {
            const explicitSelector = field.dataset.fvMessageTarget;
            if (explicitSelector) {
                try {
                    return this.subject.querySelector(explicitSelector) || document.querySelector(explicitSelector);
                } catch (_error) {
                    return null;
                }
            }

            const key = this.getFieldKey(field);
            return this.subject.querySelector('[data-fv-message-for="' + CSS.escape(key) + '"]');
        }

        /**
         * Limpia estado visual y semantico de un campo.
         * @param {HTMLElement} field Campo objetivo.
         * @returns {void}
         */
        clearPresentation(field) {
            this.getInvalidClassTokens(field).forEach((className) => field.classList.remove(className));
            this.getValidClassTokens(field).forEach((className) => field.classList.remove(className));
            field.removeAttribute('aria-invalid');
            field.setCustomValidity('');

            const messageTarget = this.getMessageTarget(field);
            if (messageTarget) {
                messageTarget.textContent = '';
                messageTarget.hidden = true;
            }
        }

        /**
         * Aplica estado visual de validacion exitosa en el campo.
         * @param {HTMLElement} field Campo objetivo.
         * @returns {void}
         */
        markValid(field) {
            this.getInvalidClassTokens(field).forEach((className) => field.classList.remove(className));
            this.getValidClassTokens(field).forEach((className) => field.classList.add(className));
            field.removeAttribute('aria-invalid');
            field.setCustomValidity('');

            const messageTarget = this.getMessageTarget(field);
            if (messageTarget) {
                messageTarget.textContent = '';
                messageTarget.hidden = true;
            }
        }

        /**
         * Aplica estado visual de error y mensaje en el campo.
         * @param {HTMLElement} field Campo objetivo.
         * @param {string} message Mensaje final de error.
         * @returns {void}
         */
        markInvalid(field, message) {
            const resolvedMessage = String(message || 'Campo invalido.');
            this.getInvalidClassTokens(field).forEach((className) => field.classList.add(className));
            this.getValidClassTokens(field).forEach((className) => field.classList.remove(className));
            field.setAttribute('aria-invalid', 'true');
            field.setCustomValidity(resolvedMessage);

            const messageTarget = this.getMessageTarget(field);
            if (messageTarget) {
                messageTarget.textContent = resolvedMessage;
                messageTarget.hidden = false;
            }
        }

        /**
         * Obtiene mensaje por defecto para una regla.
         * @param {string} rule Nombre interno de la regla.
         * @param {Object} [detail={}] Datos auxiliares de la regla.
         * @returns {string}
         */
        getDefaultMessage(rule, detail) {
            switch (rule) {
                case 'requiredIf':
                    return 'Este campo es obligatorio para la condicion configurada.';
                case 'requiredAny':
                    return 'Debes completar este campo o al menos uno de los campos relacionados.';
                case 'equals':
                    return 'Este campo debe coincidir con el campo relacionado.';
                case 'numberRange':
                    if (detail && detail.min != null && detail.max != null) {
                        return 'Este campo debe estar entre ' + detail.min + ' y ' + detail.max + '.';
                    }
                    if (detail && detail.min != null) {
                        return 'Este campo debe ser mayor o igual a ' + detail.min + '.';
                    }
                    if (detail && detail.max != null) {
                        return 'Este campo debe ser menor o igual a ' + detail.max + '.';
                    }
                    return 'Este campo debe tener un valor numerico valido.';
                case 'noWhitespace':
                    return 'Este campo no permite espacios en blanco.';
                case 'minChecked':
                    return 'Selecciona al menos ' + detail.min + ' opcion(es).';
                case 'maxFiles':
                    return 'Solo puedes adjuntar hasta ' + detail.max + ' archivo(s).';
                case 'fileMaxMb':
                    return 'El tamano maximo por archivo es ' + detail.maxMb + ' MB.';
                case 'fileTypes':
                    return 'Tipo de archivo no permitido.';
                default:
                    return 'Campo invalido.';
            }
        }

        /**
         * Resuelve mensaje final para una regla (especifico, generico o default).
         * @param {HTMLElement} field Campo objetivo.
         * @param {string} rule Nombre interno de la regla.
         * @param {Object} [detail={}] Datos auxiliares para componer mensaje.
         * @returns {string}
         */
        resolveMessage(field, rule, detail) {
            const map = {
                requiredIf: 'fvMessageRequiredIf',
                requiredAny: 'fvMessageRequiredAny',
                equals: 'fvMessageEquals',
                numberRange: 'fvMessageNumberRange',
                noWhitespace: 'fvMessageNoWhitespace',
                minChecked: 'fvMessageMinChecked',
                maxFiles: 'fvMessageMaxFiles',
                fileMaxMb: 'fvMessageFileMaxMb',
                fileTypes: 'fvMessageFileTypes',
            };

            const key = map[rule]
                , specific = key ? field.dataset[key] : ''
                , generic = field.dataset.fvMessage;

            if (specific && specific.trim()) return specific.trim();
            if (generic && generic.trim()) return generic.trim();
            return this.getDefaultMessage(rule, detail);
        }

        /**
         * Valida regla condicional required-if.
         * @param {HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement} field Campo evaluado.
         * @returns {{valid: true} | {valid: false, rule: 'requiredIf', detail: Object}}
         */
        validateRequiredIf(field) {
            const raw = field.dataset.fvRequiredIf;
            if (!raw || typeof raw !== 'string') return { valid: true };

            const separatorIndex = raw.indexOf(':');
            if (separatorIndex <= 0) return { valid: true };

            const referenceSelector = raw.slice(0, separatorIndex).trim()
                , expectedValue = raw.slice(separatorIndex + 1).trim()
                , referenceField = resolveReferenceField(this.subject, referenceSelector);

            if (!referenceField || !isSupportedField(referenceField)) return { valid: true };

            const currentValue = normalizeFieldValue(referenceField)
                , shouldRequire = currentValue === expectedValue
                , isEmpty = normalizeFieldValue(field) === '';

            if (shouldRequire && isEmpty) {
                return { valid: false, rule: 'requiredIf', detail: {} };
            }

            return { valid: true };
        }

        /**
         * Valida regla equals contra un campo de referencia.
         * @param {HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement} field Campo evaluado.
         * @returns {{valid: true} | {valid: false, rule: 'equals', detail: Object}}
         */
        validateEquals(field) {
            const selector = field.dataset.fvEquals
                , referenceField = resolveReferenceField(this.subject, selector);

            if (!selector || !referenceField || !isSupportedField(referenceField)) {
                return { valid: true };
            }

            if (normalizeFieldValue(field) !== normalizeFieldValue(referenceField)) {
                return { valid: false, rule: 'equals', detail: {} };
            }

            return { valid: true };
        }

        /**
         * Valida regla required-any (al menos un campo con valor).
         * @param {HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement} field Campo evaluado.
         * @returns {{valid: true} | {valid: false, rule: 'requiredAny', detail: Object}}
         */
        validateRequiredAny(field) {
            const selectors = splitCsv(field.dataset.fvRequiredAny);
            if (selectors.length === 0) return { valid: true };

            const references = selectors
                .map((selector) => resolveReferenceField(this.subject, selector))
                .filter((node) => isSupportedField(node));

            if (references.length === 0) return { valid: true };

            const hasAnyValue = references.some((reference) => normalizeFieldValue(reference) !== '');
            if (!hasAnyValue) {
                return { valid: false, rule: 'requiredAny', detail: {} };
            }

            return { valid: true };
        }

        /**
         * Valida regla number-range para valores numericos.
         * @param {HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement} field Campo evaluado.
         * @returns {{valid: true} | {valid: false, rule: 'numberRange', detail: {min: number|null, max: number|null}}}
         */
        validateNumberRange(field) {
            const parsed = parseNumberRange(field.dataset.fvNumberRange);
            if (!parsed.hasRule) return { valid: true };

            const rawValue = String(field.value || '').trim();
            if (rawValue === '') return { valid: true };

            const numericValue = Number(rawValue)
                , detail = { min: parsed.min, max: parsed.max };

            if (!Number.isFinite(numericValue)) {
                return { valid: false, rule: 'numberRange', detail };
            }

            if (parsed.min != null && numericValue < parsed.min) {
                return { valid: false, rule: 'numberRange', detail };
            }

            if (parsed.max != null && numericValue > parsed.max) {
                return { valid: false, rule: 'numberRange', detail };
            }

            return { valid: true };
        }

        /**
         * Valida regla no-whitespace.
         * @param {HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement} field Campo evaluado.
         * @returns {{valid: true} | {valid: false, rule: 'noWhitespace', detail: Object}}
         */
        validateNoWhitespace(field) {
            const enabled = parseBoolean(field.dataset.fvNoWhitespace);
            if (enabled !== true) return { valid: true };

            const value = String(field.value || '');
            if (value && /\s/.test(value)) {
                return { valid: false, rule: 'noWhitespace', detail: {} };
            }

            return { valid: true };
        }

        /**
         * Valida regla min-checked sobre grupos de checkboxes por nombre.
         * @param {HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement} field Campo evaluado.
         * @returns {{valid: true} | {valid: false, rule: 'minChecked', detail: {min: number}}}
         */
        validateMinChecked(field) {
            if (!(field instanceof HTMLInputElement) || field.type !== 'checkbox') {
                return { valid: true };
            }

            const raw = field.dataset.fvMinChecked;
            if (raw === undefined) return { valid: true };

            const min = Math.max(0, Math.floor(parseNumber(raw, 0)));
            if (min === 0) return { valid: true };

            const fieldName = field.getAttribute('name');
            if (!fieldName) return { valid: true };

            const selector = 'input[type="checkbox"][name="' + CSS.escape(fieldName) + '"]'
                , checkboxes = Array.from(this.subject.querySelectorAll(selector)).filter((item) => !item.disabled)
                , checkedCount = checkboxes.filter((item) => item.checked).length;

            if (checkedCount < min) {
                return { valid: false, rule: 'minChecked', detail: { min } };
            }

            return { valid: true };
        }

        /**
         * Valida reglas asociadas a inputs de tipo file.
         * @param {HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement} field Campo evaluado.
         * @returns {{valid: true} | {valid: false, rule: 'maxFiles'|'fileMaxMb'|'fileTypes', detail: Object}}
         */
        validateFileRules(field) {
            if (!(field instanceof HTMLInputElement) || field.type !== 'file') {
                return { valid: true };
            }

            const files = Array.from(field.files || []);

            if (field.dataset.fvMaxFiles !== undefined) {
                const max = Math.max(0, Math.floor(parseNumber(field.dataset.fvMaxFiles, 0)));
                if (max > 0 && files.length > max) {
                    return { valid: false, rule: 'maxFiles', detail: { max } };
                }
            }

            if (field.dataset.fvFileMaxMb !== undefined) {
                const maxMb = Math.max(0, parseNumber(field.dataset.fvFileMaxMb, 0));
                if (maxMb > 0) {
                    const maxBytes = maxMb * 1024 * 1024
                        , oversized = files.find((file) => file.size > maxBytes);

                    if (oversized) {
                        return { valid: false, rule: 'fileMaxMb', detail: { maxMb } };
                    }
                }
            }

            if (field.dataset.fvFileTypes) {
                const accepted = splitCsv(field.dataset.fvFileTypes);
                if (accepted.length > 0) {
                    const invalid = files.find((file) => !accepted.some((token) => fileMatchesAcceptedType(file, token)));
                    if (invalid) {
                        return { valid: false, rule: 'fileTypes', detail: {} };
                    }
                }
            }

            return { valid: true };
        }

        /**
         * Ejecuta validaciones para un campo y aplica su estado visual.
         * @param {HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement} field Campo evaluado.
         * @returns {ValidationSuccess|ValidationError}
         */
        validateField(field) {
            this.clearPresentation(field);

            const validators = [
                () => this.validateRequiredIf(field),
                () => this.validateRequiredAny(field),
                () => this.validateEquals(field),
                () => this.validateNumberRange(field),
                () => this.validateNoWhitespace(field),
                () => this.validateMinChecked(field),
                () => this.validateFileRules(field),
            ];

            for (let index = 0; index < validators.length; index += 1) {
                const result = validators[index]();
                if (!result.valid) {
                    const message = this.resolveMessage(field, result.rule, result.detail || {});
                    this.markInvalid(field, message);
                    return {
                        valid: false,
                        field,
                        rule: result.rule,
                        message,
                    };
                }
            }

            if (hasMeaningfulValue(field)) {
                this.markValid(field);
            } else {
                this.clearPresentation(field);
            }

            return {
                valid: true,
                field,
                rule: null,
                message: '',
            };
        }

        /**
         * Renderiza o limpia resumen global de errores.
         * @param {ValidationError[]} errors Lista de errores acumulados.
         * @returns {void}
         */
        updateSummary(errors) {
            const summary = this.summaryElement;
            if (!summary) return;

            if (!errors || errors.length === 0) {
                summary.textContent = '';
                summary.hidden = true;
                return;
            }

            const uniqueMessages = Array.from(new Set(errors.map((item) => item.message).filter(Boolean)));
            summary.innerHTML = '<ul><li>' + uniqueMessages.join('</li><li>') + '</li></ul>';
            summary.hidden = false;
        }

        /**
         * Valida todos los campos del formulario y emite eventos de ciclo.
         * @param {{emitEvents?: boolean, focusFirst?: boolean}} [config={}] Configuracion de ejecucion.
         * @returns {boolean} `true` cuando el formulario no tiene errores.
         */
        validateForm(config = {}) {
            const emitEvents = config.emitEvents !== false
                , focusFirst = config.focusFirst === true;

            const beforeEvent = new CustomEvent('before.plugin.formValidate', {
                cancelable: true,
                detail: {
                    form: this.subject,
                },
            });

            if (emitEvents) {
                this.options.beforeValidate && this.options.beforeValidate(this.subject);
                if (!this.subject.dispatchEvent(beforeEvent)) {
                    return true;
                }
            }

            const fields = this.collectFields()
                , errors = [];

            fields.forEach((field) => {
                const result = this.validateField(field);
                if (!result.valid) {
                    errors.push(result);
                }
            });

            this.updateSummary(errors);

            if (errors.length > 0 && focusFirst) {
                errors[0].field.focus();
            }

            if (emitEvents) {
                this.options.afterValidate && this.options.afterValidate(errors, this.subject);
                if (errors.length > 0) {
                    this.subject.dispatchEvent(new CustomEvent('invalid.plugin.formValidate', {
                        detail: {
                            form: this.subject,
                            errors,
                        },
                    }));
                } else {
                    this.subject.dispatchEvent(new CustomEvent('valid.plugin.formValidate', {
                        detail: {
                            form: this.subject,
                        },
                    }));
                }
            }

            return errors.length === 0;
        }

        /**
         * Handler de submit en captura para bloquear envio cuando hay errores.
         * @param {SubmitEvent} evt Evento submit.
         * @returns {void}
         */
        handleSubmitCapture(evt) {
            const form = evt.target;
            if (!(form instanceof HTMLFormElement)) return;
            if (form !== this.subject) return;

            const isValid = this.validateForm({
                emitEvents: true,
                focusFirst: this.options.focusFirstInvalid,
            });

            if (!isValid) {
                evt.preventDefault();
            }
        }

        /**
         * Handler de integracion con FormRequest en `before.plugin.formRequest`.
         * @param {CustomEvent} evt Evento custom emitido por FormRequest.
         * @returns {void}
         */
        handleBeforeFormRequest(evt) {
            if (evt.target !== this.subject) return;

            const isValid = this.validateForm({
                emitEvents: true,
                focusFirst: this.options.focusFirstInvalid,
            });

            if (!isValid) {
                evt.preventDefault();
            }
        }

        /**
         * Handler de input para revalidacion reactiva.
         * @param {Event} evt Evento input.
         * @returns {void}
         */
        handleInput(evt) {
            if (this.options.validateOnInput !== true) return;
            const field = evt.target;
            if (!isSupportedField(field)) return;

            const hasOwnRules = isRuleHost(field)
                , hasDependents = this.collectDependentFields(field).length > 0;

            if (!hasOwnRules && !hasDependents) return;

            this.validateForm({
                emitEvents: false,
                focusFirst: false,
            });
        }

        /**
         * Handler de blur para revalidacion reactiva.
         * @param {FocusEvent} evt Evento blur.
         * @returns {void}
         */
        handleBlur(evt) {
            if (this.options.validateOnBlur !== true) return;
            const field = evt.target;
            if (!isSupportedField(field)) return;

            const hasOwnRules = isRuleHost(field)
                , hasDependents = this.collectDependentFields(field).length > 0;

            if (!hasOwnRules && !hasDependents) return;

            this.validateForm({
                emitEvents: false,
                focusFirst: false,
            });
        }

        /**
         * Registra listeners de la instancia sobre el formulario.
         * @returns {void}
         */
        bind() {
            if (this.isBound) return;

            this.subject.addEventListener('submit', this.handleSubmitCapture, true);
            this.subject.addEventListener('before.plugin.formRequest', this.handleBeforeFormRequest);
            this.subject.addEventListener('input', this.handleInput, true);
            this.subject.addEventListener('blur', this.handleBlur, true);
            this.isBound = true;
        }

        /**
         * Remueve listeners de la instancia.
         * @returns {void}
         */
        unbind() {
            if (!this.isBound) return;

            this.subject.removeEventListener('submit', this.handleSubmitCapture, true);
            this.subject.removeEventListener('before.plugin.formRequest', this.handleBeforeFormRequest);
            this.subject.removeEventListener('input', this.handleInput, true);
            this.subject.removeEventListener('blur', this.handleBlur, true);
            this.isBound = false;
        }

        /**
         * Limpia recursos visuales y elimina la instancia del registro.
         * @returns {void}
         */
        destroy() {
            this.unbind();
            this.collectFields().forEach((field) => {
                this.clearPresentation(field);
            });
            this.updateSummary([]);
            INSTANCES.delete(this.subject);
        }

        /**
         * Inicializa o reutiliza la instancia asociada al formulario.
         * @param {HTMLFormElement} element Formulario objetivo.
         * @param {FormValidateOptions} [options={}] Opciones de inicializacion.
         * @returns {FormValidate}
         */
        static init(element, options = {}) {
            if (!(element instanceof HTMLFormElement)) {
                throw new Error('Error: FormValidate.init requiere un HTMLFormElement.');
            }

            const currentInstance = INSTANCES.get(element);
            if (currentInstance) return currentInstance;

            const mergedOptions = { ...getOptionsFromData(element), ...options }
                , instance = new FormValidate(element, mergedOptions);

            INSTANCES.set(element, instance);
            instance.bind();
            return instance;
        }

        /**
         * Obtiene la instancia registrada para un formulario.
         * @param {HTMLFormElement} element Formulario objetivo.
         * @returns {FormValidate|null}
         */
        static getInstance(element) {
            if (!(element instanceof HTMLFormElement)) return null;
            return INSTANCES.get(element) || null;
        }

        /**
         * Destruye la instancia asociada a un formulario.
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
         * Inicializa todos los formularios compatibles dentro de un contenedor.
         * @param {ParentNode|Element|Document} [root=document] Nodo raiz de busqueda.
         * @returns {FormValidate[]}
         */
        static initAll(root = document) {
            return getSubjects(root).map((subject) => FormValidate.init(subject));
        }

        /**
         * Destruye todas las instancias compatibles dentro de un contenedor.
         * @param {ParentNode|Element|Document} [root=document] Nodo raiz de busqueda.
         * @returns {void}
         */
        static destroyAll(root = document) {
            getSubjects(root).forEach((subject) => FormValidate.destroy(subject));
        }
    }

    window.FormValidate = FormValidate;

    const bootstrap = () => {
        FormValidate.initAll(document);
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
                FormValidate.initAll(node);
            });

            mutation.removedNodes.forEach((node) => {
                if (!(node instanceof Element)) return;
                scheduleRemovalCheck(node);
            });
        });
    });

    observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
    });
})();
