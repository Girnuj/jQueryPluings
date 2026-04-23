/**
 * @fileoverview Plugin nativo para reemplazar un elemento por HTML o JSON remoto al hacer clic.
 * @module ReplaceMe
 * @version 3.3
 * @since 2026
 * @author Samuel Montenegro
 * @license MIT
 * @copyright (c) 2026 Samuel Montenegro
 */
(function () {
	'use strict';

	// ─── Constantes ──────────────────────────────────────────────────────────────

	/** @type {string} Selector declarativo de triggers ReplaceMe. */
	const SELECTOR_REPLACE_ME = '[data-role="replace-me"]'

		/** @type {Object} Defaults de configuración para ReplaceMe. */
		, REPLACE_ME_DEFAULTS = Object.freeze({
			replaceSourceUrl: '',
			requestMethod: 'POST',
			responseMode: 'html',   // 'html' | 'json'
			jsonHtmlKey: 'html',   // clave del HTML dentro del JSON
			jsonRedirectKey: 'redirect',
			targetSelector: null,     // selector del nodo a reemplazar (null = el trigger mismo)
		})

		/** @type {WeakMap<HTMLElement, ReplaceMe>} Registro de instancias por trigger. */
		, INSTANCES = new WeakMap()

		/** @type {Set<Element>} Nodos removidos pendientes de limpieza diferida. */
		, PENDING_REMOVALS = new Set()

		/** @type {string[]} Métodos HTTP permitidos. */
		, ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']

		/** @type {string[]} Modos de respuesta permitidos. */
		, ALLOWED_MODES = ['html', 'json'];

	// ─── Helpers de validación ────────────────────────────────────────────────────

	/**
	 * Normaliza y valida el método HTTP.
	 * @param {unknown} value
	 * @returns {string}
	 */
	const getValidatedRequestMethod = (value) => {
		const method = `${value || ''}`.trim().toUpperCase() || REPLACE_ME_DEFAULTS.requestMethod;
		if (!ALLOWED_METHODS.includes(method)) {
			throw new Error(`ReplaceMe: 'requestMethod' debe ser uno de: ${ALLOWED_METHODS.join(', ')}.`);
		}
		return method;
	};

	/**
	 * Normaliza y valida el modo de respuesta.
	 * @param {unknown} value
	 * @returns {'html'|'json'}
	 */
	const getValidatedResponseMode = (value) => {
		const mode = `${value || ''}`.trim().toLowerCase() || REPLACE_ME_DEFAULTS.responseMode;
		if (!ALLOWED_MODES.includes(mode)) {
			throw new Error(`ReplaceMe: 'responseMode' debe ser 'html' o 'json'.`);
		}
		return mode;
	};

	/**
	 * Lee opciones declarativas desde dataset (`data-replace-me-*`).
	 * @param {HTMLElement} element
	 * @returns {Object}
	 */
	const getOptionsFromData = (element) => {
		const {
			replaceMeSrc: replaceSourceUrl,
			replaceMeMethod: requestMethod,
			replaceMeMode: responseMode,
			replaceMeTarget: targetSelector,
			replaceMeJsonHtml: jsonHtmlKey,
			replaceMeJsonRedirect: jsonRedirectKey,
		} = element.dataset;

		const opts = {};
		if (replaceSourceUrl !== undefined) opts.replaceSourceUrl = replaceSourceUrl;
		if (requestMethod !== undefined) opts.requestMethod = requestMethod;
		if (responseMode !== undefined) opts.responseMode = responseMode;
		if (targetSelector !== undefined) opts.targetSelector = targetSelector;
		if (jsonHtmlKey !== undefined) opts.jsonHtmlKey = jsonHtmlKey;
		if (jsonRedirectKey !== undefined) opts.jsonRedirectKey = jsonRedirectKey;
		return opts;
	};

	/**
	 * Mezcla y valida las opciones efectivas de la instancia.
	 * @param {HTMLElement} element
	 * @param {Object} [options={}]
	 * @returns {Object}
	 */
	const getValidatedOptions = (element, options = {}) => {
		const merged = { ...REPLACE_ME_DEFAULTS, ...getOptionsFromData(element), ...options };

		if (!merged.replaceSourceUrl) {
			throw new Error("ReplaceMe: Falta el atributo 'data-replace-me-src'.");
		}
		merged.requestMethod = getValidatedRequestMethod(merged.requestMethod);
		merged.responseMode = getValidatedResponseMode(merged.responseMode);
		return merged;
	};

	/**
	 * Obtiene triggers compatibles dentro de un root.
	 * @param {ParentNode|Element|Document} [root=document]
	 * @returns {HTMLElement[]}
	 */
	const getSubjects = (root = document) => {
		const subjects = [];
		if (root.nodeType === 1 && root.matches(SELECTOR_REPLACE_ME)) subjects.push(root);
		if (typeof root.querySelectorAll === 'function') {
			subjects.push(...root.querySelectorAll(SELECTOR_REPLACE_ME));
		}
		return subjects;
	};

	/**
	 * Emite un CustomEvent con bubbles y cancelable.
	 * @param {HTMLElement} element Nodo desde el que se emite.
	 * @param {string} name Nombre del evento.
	 * @param {Object} [detail={}]
	 * @param {boolean} [cancelable=false]
	 * @returns {boolean} false si fue cancelado.
	 */
	const emit = (element, name, detail = {}, cancelable = false) => {
		const event = new CustomEvent(name, { bubbles: true, cancelable, detail });
		return element.dispatchEvent(event);
	};

	// ─── Typedef ──────────────────────────────────────────────────────────────────

	/**
	 * @typedef {Object} ReplaceMeOptions
	 * @property {string}          replaceSourceUrl  URL del endpoint.
	 * @property {string}          [requestMethod='POST']   Método HTTP.
	 * @property {'html'|'json'}   [responseMode='html']    Modo de respuesta.
	 * @property {string|null}     [targetSelector=null]    Selector del nodo destino.
	 * @property {string}          [jsonHtmlKey='html']     Clave HTML dentro del JSON.
	 * @property {string}          [jsonRedirectKey='redirect'] Clave de redirección en JSON.
	 */

	// ─── Clase principal ──────────────────────────────────────────────────────────

	/**
	 * Plugin ReplaceMe.
	 *
	 * Flujo:
	 * 1. Intercepta el click en el trigger.
	 * 2. Emite `replace-me:before` (cancelable).
	 * 3. Hace fetch al endpoint en modo HTML o JSON.
	 * 4. Resuelve el nodo destino (targetSelector o el propio trigger).
	 * 5. Destruye la instancia y reemplaza el nodo destino con el HTML recibido.
	 * 6. Emite `replace-me:success` o `replace-me:error` según corresponda.
	 * 7. Emite `replace-me:after` siempre.
	 *
	 * @class ReplaceMe
	 */
	class ReplaceMe {

		/**
		 * @param {HTMLElement} element
		 * @param {ReplaceMeOptions} options — ya validadas.
		 */
		constructor(element, options) {
			this.subject = element;
			this.options = options;
			this.isBound = false;
			this.isPending = false;
			this._handleClick = this._handleClick.bind(this);
		}

		/**
		 * Vincula el listener de click.
		 * @returns {void}
		 */
		bind() {
			if (this.isBound) return;
			this.subject.addEventListener('click', this._handleClick);
			this.isBound = true;
		}

		/**
		 * Desmonta la instancia y libera su listener.
		 * @returns {void}
		 */
		destroy() {
			if (!this.isBound) return;
			this.subject.removeEventListener('click', this._handleClick);
			this.isBound = false;
			INSTANCES.delete(this.subject);
		}

		/**
		 * Devuelve el elemento que será reemplazado.
		 * Prioridad: targetSelector (relativo al documento) → trigger mismo.
		 * @returns {HTMLElement}
		 */
		_resolveTarget() {
			const { targetSelector } = this.options;
			if (!targetSelector) return this.subject;

			const target = document.querySelector(targetSelector);
			if (!target) {
				throw new Error(`ReplaceMe: No se encontró el target '${targetSelector}'.`);
			}
			return target;
		}

		// ── Fetch y parsing ─────────────────────────────────────────────────────

		/**
		 * Realiza el fetch y devuelve el HTML a inyectar.
		 * Soporta modo 'html' y modo 'json'.
		 * @returns {Promise<{html: string, raw: string|Object}>}
		 */
		async _fetchContent() {
			const { replaceSourceUrl, requestMethod, responseMode, jsonHtmlKey, jsonRedirectKey } = this.options;

			const response = await fetch(replaceSourceUrl, {
				method: requestMethod,
				credentials: 'same-origin',
				headers: responseMode === 'json' ? { 'Accept': 'application/json' } : {},
			});

			if (!response.ok) {
				throw new Error(`ReplaceMe: HTTP ${response.status} en '${replaceSourceUrl}'.`);
			}

			// ── Modo HTML ──────────────────────────────────────────────────────
			if (responseMode === 'html') {
				const html = await response.text();
				return { html, raw: html };
			}

			// ── Modo JSON ──────────────────────────────────────────────────────
			let data;
			try {
				data = await response.json();
			} catch (_) {
				throw new Error('ReplaceMe: La respuesta no es JSON válido.');
			}

			// Redirección declarativa
			const redirectUrl = data[jsonRedirectKey];
			if (redirectUrl && typeof redirectUrl === 'string') {
				window.location.href = redirectUrl;
				// Retornar null indica que no hay nada que inyectar (navegamos afuera)
				return { html: null, raw: data };
			}

			const html = data[jsonHtmlKey];
			if (typeof html !== 'string') {
				throw new Error(
					`ReplaceMe: La clave '${jsonHtmlKey}' no existe o no es string en la respuesta JSON.`
				);
			}
			return { html, raw: data };
		}

		// ── Handler principal ───────────────────────────────────────────────────

		/**
		 * Maneja el click: previene doble envío, emite eventos y ejecuta el reemplazo.
		 * @param {MouseEvent} evt
		 * @returns {Promise<void>}
		 */
		async _handleClick(evt) {
			evt.preventDefault();

			// Guardia anti doble-click
			if (this.isPending) return;

			let target;
			try {
				target = this._resolveTarget();
			} catch (error) {
				emit(this.subject, 'replace-me:error', { trigger: this.subject, target: null, error });
				emit(this.subject, 'replace-me:after', { trigger: this.subject, target: null });
				return;
			}

			// Evento cancelable: permite abortar desde el exterior
			const allowed = emit(
				this.subject,
				'replace-me:before',
				{ trigger: this.subject, target, options: { ...this.options } },
				true
			);
			if (!allowed) return;

			// Marcar como pendiente y aplicar cursor de espera
			this.isPending = true;
			const preCursor = this.subject.style.cursor;
			this.subject.style.cursor = 'wait';
			if ('disabled' in this.subject) this.subject.disabled = true;

			try {
				const { html, raw } = await this._fetchContent();

				// Si hubo redirección no hay nada más que hacer
				if (html === null) return;

				// Destruir ANTES de tocar el DOM para evitar referencias huérfanas
				const triggerIsTarget = target === this.subject;
				if (triggerIsTarget) this.destroy();

				target.outerHTML = html;

				emit(
					triggerIsTarget ? document : this.subject,
					'replace-me:success',
					{ trigger: this.subject, target, html, raw }
				);

			} catch (error) {
				emit(this.subject, 'replace-me:error', { trigger: this.subject, target, error });

			} finally {
				// Restaurar estado solo si el trigger sigue en el DOM
				if (this.subject.isConnected) {
					this.isPending = false;
					this.subject.style.cursor = preCursor;
					if ('disabled' in this.subject) this.subject.disabled = false;
				}

				emit(
					this.subject.isConnected ? this.subject : document,
					'replace-me:after',
					{ trigger: this.subject, target }
				);
			}
		}

		// ── API estática ────────────────────────────────────────────────────────

		/**
		 * Inicializa (o reutiliza) una instancia del plugin.
		 * @param {HTMLElement} element
		 * @param {ReplaceMeOptions} [options={}]
		 * @returns {ReplaceMe}
		 */
		static init(element, options = {}) {
			if (!(element instanceof HTMLElement)) {
				throw new Error('ReplaceMe.init: Se requiere un HTMLElement.');
			}

			const existing = INSTANCES.get(element);
			if (existing) return existing;

			const validatedOptions = getValidatedOptions(element, options);
			const instance = new ReplaceMe(element, validatedOptions);

			INSTANCES.set(element, instance);
			instance.bind();
			return instance;
		}

		/**
		 * Obtiene la instancia asociada a un elemento.
		 * @param {HTMLElement} element
		 * @returns {ReplaceMe|null}
		 */
		static getInstance(element) {
			if (!(element instanceof HTMLElement)) return null;
			return INSTANCES.get(element) ?? null;
		}

		/**
		 * Destruye la instancia asociada a un elemento.
		 * @param {HTMLElement} element
		 * @returns {boolean}
		 */
		static destroy(element) {
			const instance = ReplaceMe.getInstance(element);
			if (!instance) return false;
			instance.destroy();
			return true;
		}

		/**
		 * Inicializa todos los triggers dentro de un root.
		 * @param {ParentNode|Element|Document} [root=document]
		 * @param {ReplaceMeOptions} [options={}]
		 * @returns {ReplaceMe[]}
		 */
		static initAll(root = document, options = {}) {
			return getSubjects(root).map((el) => ReplaceMe.init(el, options));
		}

		/**
		 * Destruye todas las instancias dentro de un root.
		 * @param {ParentNode|Element|Document} [root=document]
		 * @returns {number} Cantidad de instancias destruidas.
		 */
		static destroyAll(root = document) {
			return getSubjects(root).reduce((count, el) => {
				return ReplaceMe.destroy(el) ? count + 1 : count;
			}, 0);
		}
	}

	// ─── ObserverDispatcher ───────────────────────────────────────────────────────

	/**
	 * ObserverDispatcher: un único MutationObserver por root compartido entre plugins,
	 * con soporte para desactivación global mediante `data-pp-observe-global="false"`.
	 */
	if (!window.Plugins) window.Plugins = {};
	if (!window.Plugins.ObserverDispatcher) {
		window.Plugins.ObserverDispatcher = (function () {
			const roots = new WeakMap();

			function resolveRoot(pluginKey) {
				const attr = 'data-pp-observe-root-' + pluginKey;
				const specific = document.querySelector('[' + attr + ']');
				if (specific) return specific;

				const html = document.documentElement;
				const selector = html.getAttribute('data-pp-observe-root');
				if (selector) {
					try {
						const el = document.querySelector(selector);
						if (el) return el;
					} catch (_) { }
				}
				return document.body || html;
			}

			function register(pluginKey, handler) {
				const html = document.documentElement;
				const observeGlobal = (html.getAttribute('data-pp-observe-global') || '').trim().toLowerCase();
				if (['false', '0', 'off', 'no'].includes(observeGlobal)) return;

				const root = resolveRoot(pluginKey);
				let entry = roots.get(root);
				if (!entry) {
					entry = { handlers: [], observer: null };
					entry.observer = new MutationObserver((mutations) => {
						entry.handlers.forEach((fn) => { try { fn(mutations); } catch (_) { } });
					});
					entry.observer.observe(root, { childList: true, subtree: true });
					roots.set(root, entry);
				}
				entry.handlers.push(handler);
			}

			return { register };
		})();
	}

	// ─── Gestión de remociones diferidas ─────────────────────────────────────────

	const flushPendingRemovals = () => {
		PENDING_REMOVALS.forEach((node) => {
			if (!node.isConnected) ReplaceMe.destroyAll(node);
			PENDING_REMOVALS.delete(node);
		});
	};

	const scheduleRemovalCheck = (node) => {
		PENDING_REMOVALS.add(node);
		queueMicrotask(flushPendingRemovals);
	};

	// ─── Handler de mutaciones DOM ────────────────────────────────────────────────

	const replaceMeDomHandler = (mutations) => {
		mutations.forEach((mutation) => {
			mutation.addedNodes.forEach((node) => {
				if (node.nodeType !== 1) return;
				PENDING_REMOVALS.delete(node);
				ReplaceMe.initAll(node);
			});
			mutation.removedNodes.forEach((node) => {
				if (node.nodeType !== 1) return;
				scheduleRemovalCheck(node);
			});
		});
	};

	// ─── Auto-init ────────────────────────────────────────────────────────────────

	const startAutoInit = () => {
		ReplaceMe.initAll(document);
		window.Plugins.ObserverDispatcher.register('replace-me', replaceMeDomHandler);
	};

	document.readyState === 'loading'
		? document.addEventListener('DOMContentLoaded', startAutoInit, { once: true })
		: startAutoInit();

	window.Plugins.ReplaceMe = ReplaceMe;
})();