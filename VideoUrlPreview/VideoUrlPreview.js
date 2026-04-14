/**
 * @fileoverview Plugin jQuery para previsualizar videos de YouTube a partir de una URL ingresada.
 * @version 2.0
 * @since 2026
 * @module VideoUrlPreview
 */
+function ($) {
	'use strict';

	const PLUGIN_NAME = 'videoUrlPreview'
		, INSTANCE_KEY = `plugin.${PLUGIN_NAME}`
		, SELECTOR_ROLE = 'input[data-role="video-preview"], input[data-video-preview-target-frame]';

	/**
	 * Clase principal del plugin VideoUrlPreview.
	 * Permite previsualizar un video de YouTube en un iframe a partir de una URL ingresada.
	 * @class VideoUrlPreview
	 */
	class VideoUrlPreview {
		/**
		 * Opciones predeterminadas del plugin.
		 * @type {Object}
		 */
		static DEFAULTS = {
			targetItemSelector: '',
		};

		/**
		 * Crea una instancia de VideoUrlPreview.
		 * @param {HTMLElement} element - Elemento sobre el que se inicializa el plugin.
		 * @param {Object} options - Opciones de configuración del plugin.
		 */
		constructor(element, options) {
			/**
			 * Elemento HTML que activa el plugin.
			 * @type {jQuery}
			 */
			this.$subject = $(element);

			/**
			 * Opciones del plugin.
			 * @type {Object}
			 */
			this.options = { ...VideoUrlPreview.DEFAULTS, ...options };

			/**
			 * Elemento objetivo donde se mostrará la previsualización (iframe).
			 * @type {jQuery|null}
			 */
			this.$target = this.options.targetItemSelector ? $(this.options.targetItemSelector) : null;
		}

		/**
		 * Extrae el ID de YouTube de una URL válida.
		 * @param {string} url - URL del video de YouTube.
		 * @returns {string|null} ID del video o null si no es válido.
		 * @private
		 */
		_getYouTubeId(url) {
			if (!url || typeof url !== 'string') return null;
			const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/
			, match = url.match(regExp);
			return (match && match[2] && match[2].length === 11) ? match[2] : null;
		}

		/**
		 * Vincula el evento de cambio al input para actualizar o eliminar la previsualización.
		 * Si el input está vacío o la URL no es válida, elimina la previsualización anterior.
		 */
		bind() {
			const updatePreview = (inputValue, clearOnInvalid = false) => {
				const value = `${inputValue || ''}`.trim()
					, videoId = this._getYouTubeId(value);
				if (this.$target && this.$target.length) {
					if (videoId) {
						this.$target.attr('src', `//www.youtube.com/embed/${videoId}`);
						return;
					}

					if (clearOnInvalid || !value) {
						this.$target.removeAttr('src');
					}
				}
			};

			// En input solo actualiza si la URL ya es valida (no limpia durante tipeo parcial).
			this.$subject.on('input', (e) => {
				updatePreview(e.target.value, false);
			});

			// En change (blur/Enter), si queda invalido, limpia la previsualizacion.
			this.$subject.on('change', (e) => {
				updatePreview(e.target.value, true);
			});

			// Si el input ya tiene valor al inicializar, renderiza la previsualizacion.
			updatePreview(this.$subject.val(), true);
		}
	}

	/**
	 * Definición del plugin jQuery con validación de selector objetivo (<iframe>).
	 * @param {Object|string|null} option - Opciones o método a ejecutar.
	 * @returns {jQuery}
	 */
	function Plugin(option) {
		option = option || {};
		/**
		 * Obtiene y valida las opciones requeridas para el plugin VideoUrlPreview.
		 * Extrae el selector objetivo desde los atributos data-* o desde las opciones,
		 * y valida que exista y apunte a un elemento <iframe>.
		 * @param {jQuery} $this - Elemento jQuery sobre el que se inicializa el plugin.
		 * @returns {Object} Opciones validadas con targetItemSelector.
		 * @throws {Error} Si el selector no está especificado o no apunta a un <iframe>.
		 */
		const getValidatedOptions = ($this, option) => {
			const { videoPreviewTargetFrame } = $this.data()
				, targetItemSelector = option.targetItemSelector || videoPreviewTargetFrame; //data-video-preview-target-frame
			if (!targetItemSelector) {
				throw new Error("Error: No se especificó el selector 'data-video-preview-target-frame'.");
			}
			const $target = $(targetItemSelector);
			if (!$target.length) {
				console.warn(`Warning: No se encontró ningún elemento para el selector '${targetItemSelector}'.`);
				return option;
			}
			if ($target.prop('tagName') !== 'IFRAME') {
				throw new Error("Error: El selector 'data-video-preview-target-frame' no apunta a un elemento <iframe>");
			}
			return { targetItemSelector, ...option };
		};

		return this.each((_, element) => {
			const $this = $(element)
				, funcInstance = $this.data(INSTANCE_KEY);
			if (!funcInstance) {
				const options = getValidatedOptions($this, option)
					, instance = new VideoUrlPreview(element, options);
				$this.data(INSTANCE_KEY, instance);
				instance.bind();
			}
		});
	}

	// Almacena la referencia anterior del plugin para evitar conflictos.
	const OLD = $.fn[PLUGIN_NAME];

	// Asigna el plugin a jQuery.
	$.fn[PLUGIN_NAME] = Plugin;
	$.fn[PLUGIN_NAME].Constructor = VideoUrlPreview;

	/**
	 * Evita conflictos con otros plugins que usen el mismo nombre.
	 * @returns {jQuery}
	 */
	$.fn[PLUGIN_NAME].noConflict = function () {
		$.fn[PLUGIN_NAME] = OLD;
		return this;
	};

	/**
	 * Inicializa el plugin dentro de un contenedor raíz.
	 * @param {HTMLElement|Document} [root=document] - Nodo raíz para buscar inputs.
	 */
	const initializeIn = (root = document) => {
		$(SELECTOR_ROLE, root)[PLUGIN_NAME](null);
	};

	// Inicialización automática al cargar el DOM.
	$(() => {
		initializeIn(document);
	});

	// Inicialización automática cuando se agregan nodos dinámicamente al DOM.
	const observer = new MutationObserver((mutations) => {
		mutations.forEach((mutation) => {
			mutation.addedNodes.forEach((node) => {
				if (node.nodeType !== 1) return;
				initializeIn(node);
			});
		});
	});
	observer.observe(document.body, { childList: true, subtree: true });

}(window.jQuery);