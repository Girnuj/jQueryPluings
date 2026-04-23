/**
 * @fileoverview Plugin nativo para agregar validaciones extendidas por data-* en formularios.
 * @module FormValidate
 * @version 2.1
 * @since 2026
 * @author Samuel Montenegro
 * @license MIT
 * @copyright (c) 2026 Samuel Montenegro
 */
(function () {
    'use strict';

    /**
     * Selector declarativo de formularios con validacion extendida.
     * @type {string}
     */
    const SELECTOR_SUBJECT = 'form[data-form-validate]'

        /**
         * Registro de instancias por formulario.
         * @type {WeakMap<HTMLFormElement, FormValidate>}
         */
        , INSTANCES = new WeakMap()

        /**
         * Nodos removidos pendientes de limpieza diferida.
         * @type {Set<Element>}
         */
        , PENDING_REMOVALS = new Set()

        /**
         * Reglas custom registradas globalmente.
         * @type {Map<string, Function>}
         */
        , CUSTOM_RULES = new Map();

    /**
     * Mapa declarativo de atributos de regla => metodo validador de instancia.
     * Centraliza el registro de reglas
     * @type {Array<{attr: string, method: string}>}
     */
    const RULE_DEFINITIONS = [
        { attr: 'data-fv-required-if',  method: 'validateRequiredIf'  },
        { attr: 'data-fv-required-any', method: 'validateRequiredAny' },
        { attr: 'data-fv-equals',       method: 'validateEquals'      },
        { attr: 'data-fv-number-range', method: 'validateNumberRange' },
        { attr: 'data-fv-no-whitespace',method: 'validateNoWhitespace'},
        { attr: 'data-fv-min-checked',  method: 'validateMinChecked'  },
        { attr: 'data-fv-max-files',    method: 'validateFileRules'   },
        { attr: 'data-fv-file-max-mb',  method: 'validateFileRules'   },
        { attr: 'data-fv-file-types',   method: 'validateFileRules'   },
        { attr: 'data-fv-custom',       method: 'validateCustomRules' },
    ];

    /**
     * Atributos de regla unicos usados para deteccion rapida en isRuleHost.
     * @type {string[]}
     */
    const RULE_ATTRS = Array.from(new Set(RULE_DEFINITIONS.map(def => def.attr)));

    /**
     * Metodos de validacion unicos derivados de RULE_DEFINITIONS (en orden de ejecucion).
     * Los metodos de archivo se agrupan bajo un unico 'validateFileRules'.
     * @type {string[]}
     */
    const RULE_METHODS = Array.from(new Set(RULE_DEFINITIONS.map(def => def.method)));

    /**
     * Defaults de configuracion de FormValidate.
     * @type {Object}
     */
    const FORM_VALIDATE_DEFAULTS = Object.freeze({
        invalidClass: 'is-invalid',
        validClass: 'is-valid',
        summarySelector: '[data-form-validate-summary]',
        focusFirstInvalid: true,
        validateOnInput: true,
        validateOnBlur: true,
        customRules: null,
        beforeValidate: function () { },
        afterValidate: function () { },
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
     * Convierte valor numerico con fallback seguro.
     * @param {unknown} value Valor crudo.
     * @param {number} [fallback=0] Valor de respaldo.
     * @returns {number}
     */
    const parseNumber = (value, fallback = 0) => {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : fallback;
    };

    /**
     * Convierte una cadena CSV en una lista de tokens limpios.
     *
     * @param {string|undefined|null} value Valor crudo separado por comas.
     * @returns {string[]} Lista de valores no vacios.
     */
    const splitCsv = (value) => {
        if (!value || typeof value !== 'string') return [];
        return value
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean);
    };

    /**
     * Divide una cadena de clases separadas por espacios en un array de tokens limpios.
     * @param {string|undefined|null} value Cadena de clases.
     * @returns {string[]} Array de clases no vacías.
     */
    const splitClassTokens = (value) => {
        if (!value || typeof value !== 'string') return [];
        return value
            .trim()
            .split(/\s+/)
            .map((item) => item.trim())
            .filter(Boolean);
    };

    /**
     * Convierte identificadores a formato kebab-case para atributos data-*.
     * @param {string} value Cadena de entrada.
     * @returns {string}
     */
    const toKebabCase = (value) => {
        return String(value || '')
            .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
            .replace(/[_\s]+/g, '-')
            .toLowerCase()
            .trim();
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
     * Extrae opciones declarativas (`data-form-validate-*`) desde el formulario.
     *
     * @param {HTMLFormElement} element Formulario sujeto del plugin.
     * @returns {Object} Opciones parciales para mezclar con defaults.
     */
    const getOptionsFromData = (element) => {
        const options = {}
            , focusFirstInvalid = parseBoolean(element.dataset.formValidateFocusFirst)
            , validateOnInput = parseBoolean(element.dataset.formValidateOnInput)
            , validateOnBlur = parseBoolean(element.dataset.formValidateOnBlur);

        const setTrimmedOption = (key, value, transform) => {
            if (typeof value !== 'string') return;
            const trimmedValue = value.trim();
            if (!trimmedValue) return;
            options[key] = typeof transform === 'function' ? transform(trimmedValue) : trimmedValue;
        };

        setTrimmedOption('invalidClass', element.dataset.formValidateInvalidClass);
        setTrimmedOption('validClass', element.dataset.formValidateValidClass);
        setTrimmedOption('summarySelector', element.dataset.formValidateSummarySelector);

        focusFirstInvalid !== undefined && (options.focusFirstInvalid = focusFirstInvalid);
        validateOnInput !== undefined && (options.validateOnInput = validateOnInput);
        validateOnBlur !== undefined && (options.validateOnBlur = validateOnBlur);

        return options;
    };

    const isSupportedField = (field) => {
        return field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement;
    };

    /**
     * Determina si un campo define reglas extendidas de validacion por data attributes.
     * Derivado dinamicamente de RULE_ATTRS para evitar mantenimiento duplicado.
     *
     * @param {Element} field Campo candidato.
     * @returns {boolean} `true` cuando el campo tiene al menos una regla declarada.
     */
    const isRuleHost = (field) => {
        if (!isSupportedField(field)) return false;
        if (field.disabled) return false;
        return RULE_ATTRS.some(attr => field.hasAttribute(attr));
    };

    /**
     * Normaliza el valor de un campo de formulario a string, considerando checkboxes y radios.
     *
     * NOTA: Para checkboxes, devuelve `field.value` cuando esta marcado (o 'on' si no tiene value),
     * y cadena vacia cuando no lo esta. Si usas `data-fv-required-if` apuntando a un checkbox,
     * el valor esperado debe coincidir con `field.value` del checkbox (por defecto 'on').
     *
     * @param {HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement} field Campo a normalizar.
     * @returns {string}
     */
    const normalizeFieldValue = (field) => {
        if (field instanceof HTMLInputElement && (field.type === 'checkbox' || field.type === 'radio')) {
            return field.checked ? (field.value || 'on') : '';
        }
        return String(field.value || '').trim();
    };

    /**
     * Determina si un campo tiene un valor relevante para validación.
     * @param {HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement} field Campo a evaluar.
     * @returns {boolean}
     */
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

    /**
     * Busca un campo de referencia en el formulario o en el documento según selector.
     * @param {HTMLFormElement} form Formulario base.
     * @param {string} selector Selector CSS del campo de referencia.
     * @returns {HTMLElement|null}
     */
    const resolveReferenceField = (form, selector) => {
        if (!selector || typeof selector !== 'string') return null;

        try {
            return form.querySelector(selector) || document.querySelector(selector);
        } catch (_error) {
            return null;
        }
    };

    /**
     * Extrae el selector de referencia de una regla required-if.
     * @param {string} rawRule Regla cruda (selector:valor).
     * @returns {string} Selector de referencia.
     */
    const parseRequiredIfReferenceSelector = (rawRule) => {
        if (!rawRule || typeof rawRule !== 'string') return '';
        const separatorIndex = rawRule.indexOf(':');
        if (separatorIndex <= 0) return '';
        return rawRule.slice(0, separatorIndex).trim();
    };

    /**
     * Parsea una regla de rango numérico (min:max) a objeto.
     * @param {string} rawRange Cadena cruda min:max.
     * @returns {{hasRule: boolean, min: number|null, max: number|null}}
     */
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

    /**
     * Verifica si un archivo cumple con un tipo aceptado (por extensión o MIME).
     *
     * NOTA: La validacion se basa en `file.name` (extension) y `file.type` (MIME reportado
     * por el navegador). Ambos valores son controlados por el cliente y pueden ser falsificados
     * renombrando el archivo. Esta validacion es una primera capa de UX, no una garantia de
     * seguridad. Siempre validar el tipo de archivo en el servidor.
     *
     * @param {File} file Archivo a validar.
     * @param {string} token Token de tipo aceptado (ej: .jpg, image/*).
     * @returns {boolean}
     */
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
     * Genera un ID unico para nodos de mensaje sin ID propio.
     * @returns {string}
     */
    const generateMessageId = () => 'fv-msg-' + Math.random().toString(36).slice(2);

    /**
     * Opciones publicas para configurar reglas, clases y estrategia de validacion.
     * @typedef {Object} FormValidateOptions
     * @property {string} [invalidClass='is-invalid'] Clase CSS global para campos invalidos.
     * @property {string} [validClass='is-valid'] Clase CSS global para campos validos.
     * @property {string} [summarySelector='[data-form-validate-summary]'] Selector para resumen global de errores.
     * @property {boolean} [focusFirstInvalid=true] Enfoca el primer campo invalido en submit.
     * @property {boolean} [validateOnInput=true] Revalida durante eventos input.
     * @property {boolean} [validateOnBlur=true] Revalida durante eventos blur.
     * @property {Object<string, Function>|null} [customRules=null] Reglas custom por instancia ({ nombreRegla: fn }).
     * @property {(form: HTMLFormElement) => void} [beforeValidate] Hook antes de validar.
     * @property {(errors: ValidationError[], form: HTMLFormElement) => void} [afterValidate] Hook despues de validar.
     */

    /**
     * Resultado tipado para un campo que no supera la validacion.
     * @typedef {Object} ValidationError
     * @property {false} valid Indica error de validacion.
     * @property {HTMLElement} field Campo que fallo la regla.
     * @property {string} rule Regla que produjo el error.
     * @property {string} message Mensaje final de error para UI.
     */

    /**
     * Resultado tipado para un campo que supera la validacion.
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
     *
     * @fires before.plugin.formValidate
     * @fires valid.plugin.formValidate
     * @fires invalid.plugin.formValidate
     */
    class FormValidate {
        /**
         * Crea una instancia de validacion para el formulario objetivo.
         * @param {HTMLFormElement} element Formulario objetivo a validar.
         * @param {FormValidateOptions} options Opciones de configuración validadas de la instancia.
         */
        constructor(element, options) {
            this.subject = element;
            this.options = { ...FORM_VALIDATE_DEFAULTS, ...options };
            this.isBound = false;
            /** @type {ValidationError[]} Cache de errores del ultimo validateForm. */
            this._lastErrors = [];
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
            // 1. Prioridad: asp-validation-summary="ModelOnly" o "All" (Razor/.NET) solo dentro del formulario
            let summary = this.subject.querySelector('[asp-validation-summary="ModelOnly"]')
                || this.subject.querySelector('[asp-validation-summary="All"]')
                || this.subject.querySelector('[asp-validation-summary]');
            if (summary) return summary;

            // 2. Fallback: summarySelector del plugin (data-fv-message-for tiene prioridad sobre asp-validation-for)
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
         * Prioridad: data-fv-message-target > data-fv-message-for > asp-validation-for.
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

            // 1. data-fv-message-for (plugin nativo — prioridad sobre asp-validation-for)
            let target = this.subject.querySelector('[data-fv-message-for="' + CSS.escape(key) + '"]');
            if (target) return target;

            // 2. asp-validation-for (Razor/.NET — fallback)
            target = this.subject.querySelector('[asp-validation-for="' + CSS.escape(key) + '"]');
            if (target) return target;

            return null;
        }

        /**
         * Asegura que el nodo de mensaje tenga un ID y lo vincula al campo via aria-describedby.
         * @param {HTMLElement} field Campo objetivo.
         * @param {HTMLElement} messageTarget Nodo de mensaje.
         * @returns {void}
         */
        linkAriaDescribedBy(field, messageTarget) {
            if (!messageTarget.id) {
                messageTarget.id = generateMessageId();
            }
            field.setAttribute('aria-describedby', messageTarget.id);
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
            field.removeAttribute('aria-describedby');
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
            field.removeAttribute('aria-describedby');
            field.setCustomValidity('');

            const messageTarget = this.getMessageTarget(field);
            if (messageTarget) {
                messageTarget.textContent = '';
                messageTarget.hidden = true;
            }
        }

        /**
         * Aplica estado visual de error y mensaje en el campo.
         * Vincula aria-describedby al nodo de mensaje para accesibilidad.
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
                this.linkAriaDescribedBy(field, messageTarget);
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
            const d = detail || {};
            switch (rule) {
                case 'requiredIf':
                    return 'Este campo es obligatorio para la condicion configurada.';
                case 'requiredAny':
                    return 'Debes completar este campo o al menos uno de los campos relacionados.';
                case 'equals':
                    return 'Este campo debe coincidir con el campo relacionado.';
                case 'numberRange':
                    if (d.min != null && d.max != null) {
                        return 'Este campo debe estar entre ' + d.min + ' y ' + d.max + '.';
                    }
                    if (d.min != null) {
                        return 'Este campo debe ser mayor o igual a ' + d.min + '.';
                    }
                    if (d.max != null) {
                        return 'Este campo debe ser menor o igual a ' + d.max + '.';
                    }
                    return 'Este campo debe tener un valor numerico valido.';
                case 'noWhitespace':
                    return 'Este campo no permite espacios en blanco.';
                case 'minChecked':
                    return 'Selecciona al menos ' + (d.min ?? '?') + ' opcion(es).';
                case 'maxFiles':
                    return 'Solo puedes adjuntar hasta ' + (d.max ?? '?') + ' archivo(s).';
                case 'fileMaxMb':
                    return 'El tamano maximo por archivo es ' + (d.maxMb ?? '?') + ' MB.';
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
         * Obtiene una regla custom por nombre, priorizando opciones de instancia.
         * @param {string} ruleName Nombre de regla.
         * @returns {Function|null}
         */
        getCustomRule(ruleName) {
            const localRules = this.options.customRules;

            if (localRules && typeof localRules === 'object' && typeof localRules[ruleName] === 'function') {
                return localRules[ruleName];
            }

            return FormValidate.getCustomRule(ruleName);
        }

        /**
         * Resuelve mensaje final para una regla custom.
         * @param {HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement} field Campo evaluado.
         * @param {string} ruleName Nombre de regla custom.
         * @param {Object} [detail={}] Datos auxiliares para componer mensaje dinamico.
         * @returns {string}
         */
        resolveCustomMessage(field, ruleName, detail) {
            const specificAttr = 'data-fv-message-custom-' + toKebabCase(ruleName)
                , specific = field.getAttribute(specificAttr)
                , generic = field.dataset.fvMessageCustom;

            if (specific && specific.trim()) return specific.trim();
            if (generic && generic.trim()) return generic.trim();
            return 'Este campo no cumple la validacion personalizada.';
        }

        /**
         * Ejecuta reglas personalizadas declaradas en `data-fv-custom`.
         * @param {HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement} field Campo evaluado.
         * @returns {{valid: true} | {valid: false, rule: string, message: string, detail: Object}}
         */
        validateCustomRules(field) {
            const customRuleNames = splitCsv(field.dataset.fvCustom);
            if (customRuleNames.length === 0) return { valid: true };

            for (let index = 0; index < customRuleNames.length; index += 1) {
                const ruleName = customRuleNames[index]
                    , customRule = this.getCustomRule(ruleName);

                if (typeof customRule !== 'function') continue;

                const context = {
                    field,
                    form: this.subject,
                    value: field.value,
                    normalizeFieldValue: normalizeFieldValue,
                    hasMeaningfulValue: hasMeaningfulValue,
                    resolveReferenceField: (selector) => resolveReferenceField(this.subject, selector),
                    splitCsv: splitCsv,
                    parseBoolean: parseBoolean,
                    parseNumber: parseNumber,
                };

                let output;
                try {
                    output = customRule(context);
                } catch (_error) {
                    return {
                        valid: false,
                        rule: 'custom:' + ruleName,
                        message: this.resolveCustomMessage(field, ruleName, {}),
                        detail: {},
                    };
                }

                if (output === true || output === undefined || output === null) {
                    continue;
                }

                if (output === false) {
                    return {
                        valid: false,
                        rule: 'custom:' + ruleName,
                        message: this.resolveCustomMessage(field, ruleName, {}),
                        detail: {},
                    };
                }

                if (typeof output === 'string') {
                    return {
                        valid: false,
                        rule: 'custom:' + ruleName,
                        message: output.trim() || this.resolveCustomMessage(field, ruleName, {}),
                        detail: {},
                    };
                }

                if (output && typeof output === 'object') {
                    if (output.valid === false) {
                        const detail = output.detail && typeof output.detail === 'object' ? output.detail : {};
                        return {
                            valid: false,
                            rule: 'custom:' + ruleName,
                            // detail se pasa a resolveCustomMessage para interpolacion futura
                            message: String(output.message || this.resolveCustomMessage(field, ruleName, detail)).trim(),
                            detail,
                        };
                    }

                    if (output.valid === true) {
                        continue;
                    }
                }
            }

            return { valid: true };
        }

        /**
         * Valida regla condicional required-if.
         *
         * NOTA: El valor esperado debe coincidir con el valor normalizado del campo de referencia.
         * Para checkboxes, el valor es `field.value` cuando esta marcado (por defecto 'on').
         * Ejemplo: data-fv-required-if="#miCheck:on"
         *
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
         *
         * NOTA: Para evitar errores duplicados en el resumen cuando varios checkboxes del
         * mismo grupo comparten esta regla, validateForm deduplica errores por campo-regla
         * antes de alimentar el summary. Asegurate de que solo el primer checkbox del grupo
         * tenga el nodo de mensaje asociado, o usa data-fv-message-target para controlarlo.
         *
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
         *
         * ADVERTENCIA DE SEGURIDAD: La validacion de tipo de archivo (`data-fv-file-types`)
         * se basa en la extension del nombre y el MIME type reportado por el navegador.
         * Ambos pueden ser manipulados por el cliente. Esta validacion es solo una capa de
         * experiencia de usuario. Siempre validar el contenido real del archivo en el servidor.
         *
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
         * Los metodos ejecutados se derivan de RULE_METHODS, garantizando
         * consistencia con RULE_DEFINITIONS sin mantenimiento adicional.
         *
         * @param {HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement} field Campo evaluado.
         * @returns {ValidationSuccess|ValidationError}
         */
        validateField(field) {
            this.clearPresentation(field);

            for (let index = 0; index < RULE_METHODS.length; index += 1) {
                const method = RULE_METHODS[index];
                if (typeof this[method] !== 'function') continue;

                const result = this[method](field);
                if (!result.valid) {
                    const isCustomRule = String(result.rule || '').startsWith('custom:')
                        , message = result.message
                            || (isCustomRule
                                ? this.resolveCustomMessage(field, String(result.rule || '').slice('custom:'.length), result.detail || {})
                                : this.resolveMessage(field, result.rule, result.detail || {}));
                    this.markInvalid(field, message);
                    return {
                        valid: false,
                        field,
                        rule: result.rule,
                        message,
                    };
                }
            }

            hasMeaningfulValue(field)
               ? this.markValid(field)
               : this.clearPresentation(field);

            return {
                valid: true,
                field,
                rule: null,
                message: '',
            };
        }

        /**
         * Renderiza o limpia resumen global de errores.
         * Inicializa role="alert" en el summary la primera vez para que los lectores
         * de pantalla anuncien los errores automaticamente al actualizarse.
         *
         * Para grupos de checkboxes con data-fv-min-checked, se deduplica por nombre
         * de campo para evitar mensajes repetidos en el resumen.
         *
         * @param {ValidationError[]} errors Lista de errores acumulados.
         * @returns {void}
         */
        updateSummary(errors) {
            const summary = this.summaryElement;
            if (!summary) return;

            // Garantiza anuncio automatico por screen readers
            if (!summary.getAttribute('role')) {
                summary.setAttribute('role', 'alert');
            }
            if (!summary.getAttribute('aria-live')) {
                summary.setAttribute('aria-live', 'polite');
            }

            if (!errors || errors.length === 0) {
                summary.textContent = '';
                summary.hidden = true;
                return;
            }

            // Deduplica errores de grupos checkbox (mismo nombre + misma regla)
            const seen = new Set()
                , deduped = errors.filter((item) => {
                    if (item.rule !== 'minChecked') return true;
                    const groupKey = 'minChecked:' + (item.field.getAttribute('name') || '');
                    if (seen.has(groupKey)) return false;
                    seen.add(groupKey);
                    return true;
                });

            const uniqueMessages = Array.from(new Set(deduped.map((item) => item.message).filter(Boolean)));
            summary.innerHTML = '<ul><li>' + uniqueMessages.join('</li><li>') + '</li></ul>';
            summary.hidden = false;
        }

        /**
         * Valida todos los campos del formulario y emite eventos de ciclo.
         * Almacena el resultado en `_lastErrors` para consulta posterior via `getErrors()`.
         *
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

            this._lastErrors = errors;
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
         * Retorna los errores del ultimo `validateForm` sin re-validar ni aplicar efectos visuales.
         * Util para consultar el estado actual desde codigo externo.
         * @returns {ValidationError[]} Copia del array de errores (inmutable externamente).
         */
        getErrors() {
            return this._lastErrors.slice();
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
                evt.stopPropagation();
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
         * Define listeners activos de la instancia.
         * @returns {Array<[string, EventListenerOrEventListenerObject, (boolean|undefined)]>}
         */
        getListeners() {
            return [
                ['submit', this.handleSubmitCapture, true],
                ['before.plugin.formRequest', this.handleBeforeFormRequest],
                ['input', this.handleInput, true],
                ['blur', this.handleBlur, true],
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
         * Limpia recursos visuales y elimina la instancia del registro.
         * @returns {void}
         */
        destroy() {
            this.unbind();
            this.collectFields().forEach((field) => {
                this.clearPresentation(field);
            });
            this.updateSummary([]);
            this._lastErrors = [];
            INSTANCES.delete(this.subject);
        }

        /**
         * Inicializa o reutiliza la instancia asociada al formulario.
         * @param {HTMLFormElement} element Formulario objetivo.
         * @param {FormValidateOptions} [options={}] Opciones de configuración de la instancia.
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

        /**
         * Registra una regla custom global reutilizable por cualquier instancia.
         * Emite console.warn si se sobreescribe una regla ya existente.
         * @param {string} ruleName Nombre de la regla (usar en `data-fv-custom`).
         * @param {Function} validator Funcion de validacion custom.
         * @returns {void}
         */
        static registerCustomRule(ruleName, validator) {
            const normalizedName = String(ruleName || '').trim();
            if (!normalizedName) {
                throw new Error('Error: registerCustomRule requiere un nombre de regla valido.');
            }

            if (typeof validator !== 'function') {
                throw new Error('Error: registerCustomRule requiere una funcion validator.');
            }

            if (CUSTOM_RULES.has(normalizedName)) {
                console.warn(
                    '[FormValidate] registerCustomRule: la regla "' + normalizedName + '" ya existe y sera sobreescrita.'
                );
            }

            CUSTOM_RULES.set(normalizedName, validator);
        }

        /**
         * Obtiene una regla custom global por nombre.
         * @param {string} ruleName Nombre de la regla.
         * @returns {Function|null}
         */
        static getCustomRule(ruleName) {
            const normalizedName = String(ruleName || '').trim();
            if (!normalizedName) return null;
            return CUSTOM_RULES.get(normalizedName) || null;
        }

        /**
         * Verifica si existe una regla custom global registrada.
         * @param {string} ruleName Nombre de la regla.
         * @returns {boolean}
         */
        static hasCustomRule(ruleName) {
            const normalizedName = String(ruleName || '').trim();
            if (!normalizedName) return false;
            return CUSTOM_RULES.has(normalizedName);
        }

        /**
         * Elimina una regla custom global registrada.
         * @param {string} ruleName Nombre de la regla.
         * @returns {boolean} `true` cuando elimina una regla existente.
         */
        static unregisterCustomRule(ruleName) {
            const normalizedName = String(ruleName || '').trim();
            if (!normalizedName) return false;
            return CUSTOM_RULES.delete(normalizedName);
        }

        /**
         * Lista los nombres de reglas custom globales registradas.
         * @returns {string[]}
         */
        static listCustomRules() {
            return Array.from(CUSTOM_RULES.keys());
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
                const attr = 'data-pp-observe-root-' + pluginKey
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
     * Limpia instancias asociadas a nodos removidos del DOM.
     * @returns {void}
     */
    const flushPendingRemovals = () => {
        PENDING_REMOVALS.forEach((node) => {
            if (!node.isConnected) {
                FormValidate.destroyAll(node);
            }
            PENDING_REMOVALS.delete(node);
        });
    };

    /**
     * Agenda chequeo diferido para destruccion segura.
     * @param {Element} node Nodo removido por mutacion.
     * @returns {void}
     */
    const scheduleRemovalCheck = (node) => {
        PENDING_REMOVALS.add(node);
        queueMicrotask(flushPendingRemovals);
    };

    /**
     * Inicializa automaticamente las instancias del plugin y observa cambios en el DOM.
     * @returns {void}
     */
    // Handler para mutaciones DOM relacionadas con FormValidate
    const formValidateDomHandler = (mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (!(node instanceof Element)) return;
                PENDING_REMOVALS.delete(node);
                FormValidate.initAll(node);
            });
            mutation.removedNodes.forEach((node) => {
                if (!(node instanceof Element)) return;
                scheduleRemovalCheck(node);
            });
        });
    };

    const bootstrap = () => {
        FormValidate.initAll(document);
        // Usar ObserverDispatcher para registrar el handler solo sobre el root adecuado
        window.Plugins.ObserverDispatcher.register('form-validate', formValidateDomHandler);
    };

    document.readyState === 'loading'
        ? document.addEventListener('DOMContentLoaded', bootstrap, { once: true })
        : bootstrap();

    window.Plugins.FormValidate = FormValidate;
})();