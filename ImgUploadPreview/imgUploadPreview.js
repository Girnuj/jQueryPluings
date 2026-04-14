/**
 * @fileoverview Plugin jQuery para previsualizar imagenes al subir archivos.
 * @version 2.0
 * @since 2025
 * @module ImgUploadPreview
 */
(function ($) {
	'use strict';

	const PLUGIN_NAME = 'imgUploadPreview'
		, INSTANCE_KEY = `plugin.${PLUGIN_NAME}`
		, SELECTOR_IMG_UPLOAD = 'input[data-img-upload="input"], input[data-img-upload-preview-target]'
		, IMG_UPLOAD_PREVIEW_DEFAULTS = Object.freeze({
			targetItemSelector: '',
			allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
			maxFileSize: 2 * 1024 * 1024, //2MB
		});

	/**
	 * Clase principal del plugin ImgUploadPreview.
	 * @class ImgUploadPreview
	 */
	class ImgUploadPreview {
		/**
		 * Crea una instancia de ImgUploadPreview.
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
			this.options = { ...IMG_UPLOAD_PREVIEW_DEFAULTS, ...options };

			/**
			 * Elemento objetivo donde se mostrará la previsualización.
			 * @type {jQuery}
			 */
			this.$target = $(this.options.targetItemSelector);
		}

		/**
		 * Vincula el evento de cambio al input para mostrar la previsualización.
		 */
		bind() {
			this.$subject.on('change', (evt) => {
				const input = evt.target
					, file = input.files && input.files[0];

				if (!file) {
					this.$target.removeAttr('src');
					return;
				}

				const { allowedMimeTypes, maxFileSize } = this.options
					, isAllowedType = allowedMimeTypes.includes(file.type)
					, isAllowedSize = file.size <= maxFileSize;

				if (!isAllowedType) {
					console.warn(`Formato no permitido: ${file.type || 'desconocido'}.`);
					this.$target.removeAttr('src');
					input.value = '';
					return;
				}

				if (!isAllowedSize) {
					console.warn(`Archivo demasiado grande. Maximo: ${Math.round(maxFileSize / 1024 / 1024)} MB.`);
					this.$target.removeAttr('src');
					input.value = '';
					return;
				}

				const reader = new FileReader();
				reader.onload = (e) => {
					this.$target.attr('src', e.target.result);
				};
				reader.readAsDataURL(file);
			});
		}
	}

	/**
	 * Definición del plugin jQuery.
	 * @param {Object|string} option - Opciones o método a ejecutar.
	 * @returns {jQuery}
	 */
	function Plugin(option) {
		option = option || {};
		/**
		 * Obtiene y valida las opciones requeridas para el plugin ImgUploadPreview.
		 * Extrae el selector objetivo desde los atributos data-* o desde las opciones,
		 * y valida que exista y apunte a un elemento <img>.
		 * @param {jQuery} $this - Elemento jQuery sobre el que se inicializa el plugin.
		 * @returns {Object} Opciones validadas con targetItemSelector.
		 * @throws {Error} Si el selector no está especificado o no apunta a un <img>.
		 */
		const getValidatedOptions = ($this, option) => {
			const { imgUploadPreviewTarget } = $this.data()
				, targetItemSelector = option.targetItemSelector || imgUploadPreviewTarget; //data-img-upload-preview-target
			
			if (!targetItemSelector) {
				throw new Error("Error: No se especificó el selector 'data-img-upload-preview-target'.");
			}

			const $target = $(targetItemSelector);
			if (!$target.length) {
				console.warn(`Warning: No se encontró ningún elemento para el selector '${targetItemSelector}'.`);
				return option;
			}

			if ($target.prop('tagName') !== 'IMG') {
				throw new Error("Error: El selector 'data-img-upload-preview-target' no apunta a un elemento <img>.");
			}

			return { targetItemSelector, ...option };
		};

		return this.each((_, element) => {
			const $this = $(element)
				, funcInstance = $this.data(INSTANCE_KEY);
			if (!funcInstance) {
				const options = getValidatedOptions($this, option)
					, instance = new ImgUploadPreview(element, options);
				$this.data(INSTANCE_KEY, instance);
				instance.bind();
			}
		});
	}

	// Almacena la referencia anterior del plugin para evitar conflictos.
	const OLD = $.fn[PLUGIN_NAME];

	// Asigna el plugin a jQuery.
	$.fn[PLUGIN_NAME] = Plugin;
	$.fn[PLUGIN_NAME].Constructor = ImgUploadPreview;

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
		$(SELECTOR_IMG_UPLOAD, root)[PLUGIN_NAME](null);
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

})(window.jQuery);