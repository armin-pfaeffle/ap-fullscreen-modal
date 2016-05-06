/**
* @license ap-fullscreen-modal.js v0.5.2
* Updated: 06.05.2016
* {DESCRIPTION}
* Copyright (c) 2016 armin pfaeffle
* Released under the MIT license
* http://armin-pfaeffle.de/licenses/mit
*/

;(function($) {

	var datakey = '__apfm__';
	var cssPrefix = 'apfm-';
	var eventNamespace = 'apfm';
	var triggerEventPrefix = 'apfm';
	var containerCounter = 0;


	/**
	 * Makes the first character of str uppercase and returns that string.
	 */
	function ucfirst(str) {
		str += ''; // ensure that str is a string
		var c = str.charAt(0).toUpperCase();
		return c + str.substr(1);
	}

	/**
	 * Adds ucfirst() method to String class. Makes the first character
	 * of str uppercase and returns that string.
	 */
	if (!String.prototype.ucfirst) {
		String.prototype.ucfirst = function() {
			return ucfirst(this);
		};
	}


	/**
	 * Constructor for ApFullscreenModal plugin.
	 */
	function ApFullscreenModal(element, options) {
		// Do not remake the plugin
		var data = $(element).data(datakey);
		if (data) {
			return data;
		}

		this.settings = $.extend({}, ApFullscreenModal.defaultSettings, options);
		this.$content = $(element);
		this._init();

		// Save the instance
		this.$content.data(datakey, this);
	}

	/**
	 * ApFullscreenModal class.
	 */
	ApFullscreenModal.prototype = {

		_init: function() {
			this.opened = false;

			this._addContainer();
			this._applyContent();
			this._updateHeadCss();
			this._bind();

			if (this.settings.autoOpen) {
				this.open();
			}
		},


		_addContainer: function() {
			this.$container = $(ApFullscreenModal.template);
			this.$container
				.appendTo($('body'))
				.attr('id', cssPrefix + 'container-' + (containerCounter++) )
				.css('background-color', this.settings.backgroundColor);

			this.$wrapper = this.$container.find('.' + cssPrefix + 'wrapper');

			this.$closeButton = this.$container.find('.' + cssPrefix + 'close-button');
			if (!this.settings.showCloseButton) {
				this.$closeButton.hide();
			}
		},


		_removeContainer: function() {
			this.$container.remove();
		},


		_applyContent: function() {
			// Insert a placeholder at the original position of the DOM element, so we can move it back where
			// it was before moving it to fullscreen wrapper
			this.$placeholder = $('<div></div>', { 'class': cssPrefix + 'placeholder' });
			this.$content.after(this.$placeholder);
			this.$content.appendTo(this.$wrapper);
			this.$content.attr('tabIndex', -1);
		},


		_resetContent: function() {
			this.$placeholder.insertAfter(this.$placeholder);
			this.$placeholder.remove();
			this.$placeholder = undefined;
			this.$content.removeAttr('tabIndex');
		},


		_updateHeadCss: function() {
			this._removeHeadCss();

			var containerId = this.$container.attr('id');
			var duration = (parseInt(this.settings.animationDuration) / 1000).toFixed(3) + 's';

			var css = "#" + containerId + " {\n";
			$.each(['-webkit-', '-moz-', '-ms-', '-o-', ''], function(index, prefix) {
				css += "\t" + prefix + "transition: " + prefix + "transform " + duration + ", opacity " + duration + ";\n";
			});
			css += "}\n";

			this.headCssStyle = $("<style type='text/css'>\n" + css + "\n</style>").appendTo('head');
			this._trigger('updateHeadCss', [css]);
		},


		_removeHeadCss: function() {
			if (this.headCssStyle) {
				this.headCssStyle.remove();
				this.headCssStyle = null;

				this._trigger('removeHeadCss');
			}
		},


		_bind: function() {
			var self = this;

			if (this.settings.openSelector) {
				$(this.settings.openSelector).on('click.' + eventNamespace, function() {
					self.open($(this));
					return false;
				});
			}

			if (this.settings.closeSelector) {
				this.$container.on('click.' + eventNamespace, this.settings.closeSelector, function() {
					self.close();
					return false;
				});
			}

			this.$content
				.on('keydown.' + eventNamespace, function(evt) {

					// Deactivate every shortcut when element is closed
					if (!self.opened) {
						return;
					}

					if (evt.keyCode == 27) { // backspace or escape
						self.close();
						evt.preventDefault();
					}
				});
		},


		_unbind: function() {
			this.$content.find(this.settings.openSelector).on('click.' + eventNamespace);
			this.$content.find(this.settings.closeSelector).on('click.' + eventNamespace);
			this.$content.off('keydown.' + eventNamespace);
		},


		_trigger: function(eventType, args) {
			var optionName = 'on' + eventType.ucfirst(),
				f = this.settings[optionName];
			if (typeof f == 'function') {
				f.apply(this.$content, args);
			}
			eventType = triggerEventPrefix + eventType.ucfirst();
			this.$content.trigger(eventType, args);
		},


		_triggerHandler: function(eventType, args) {
			var optionName = 'on' + eventType.ucfirst(),
				f = this.settings[optionName],
				callbackResult = undefined,
				result;
			if (typeof f == 'function') {
				callbackResult = f.apply(this.$content, args);
			}
			eventType = triggerEventPrefix + eventType.ucfirst();
			result = ((result = this.$content.triggerHandler(eventType, args)) !== undefined ? result : callbackResult);
			return result;
		},


		open: function() {
			var self = this;

			if (this.opened) {
				return;
			}

			if (this._triggerHandler('beforeOpen') !== false) {
				this.opened = true;

				$('html').addClass(cssPrefix + 'open');
				this.$container
					.scrollTop(-1000)
					.addClass(cssPrefix + 'open ' + cssPrefix + 'opening');
				this.$content.focus();

				setTimeout(function() {
					self.$container.removeClass(cssPrefix + 'opening');
				}, this.settings.animationDuration);

				this._trigger('open');
			}
		},


		close: function() {
			var self = this;
			if (this.opened) {
				if (this._triggerHandler('beforeClose') !== false) {
					this.$container.addClass(cssPrefix + 'closing').removeClass(cssPrefix + 'open');
					setTimeout(function() {
						self.$container.removeClass(cssPrefix + 'closing');
						$('html').removeClass(cssPrefix + 'open');
						self.opened = false;
					}, this.settings.animationDuration);


					this._trigger('close');
				}
			}
		},


		isOpen: function() {
			return this.opened;
		},


		option: function(key, value) {
			if (!key) {
				// Return copy of current settings
				return $.extend({}, this.settings);
			}
			else {
				var options;
				if (typeof key == 'string') {
					if (arguments.length === 1) {
						// Return specific value of settings
						return (this.settings[key] !== undefined ? this.settings[key] : null);
					}
					options = {};
					options[key] = value;
				} else {
					options = key;
				}
				this._setOptions(options);
			}
		},


		_setOptions: function(options) {
			for (key in options) {
				var value = options[key];

				// Disable/modify plugin before we apply new settings
				// TODO

				// Apply option
				this.settings[key] = value;

				// Disable/modify plugin before we apply new settings
				// TODO
			}
		},


		destroy: function() {
			this._trigger('destroy');

			if (this.opened) {
				this.close();
			}
			this._unbind();
			this._removeHeadCss();
			this._resetContent();
			this._removeContainer();

			this.$elements.each(function() {
				$(this).removeData(datakey);
			});
		}
	};


	$.fn.apFullscreenModal = function( options ) {
		if (typeof options === 'string') {
			var instance, method, result, returnValues = [];
			var params = Array.prototype.slice.call(arguments, 1);
			this.each(function() {
				instance = $(this).data(datakey);
				if (!instance) {
					returnValues.push(undefined);
				}
				// Ignore private methods
				else if ((typeof (method = instance[options]) === 'function') && (options.charAt(0) !== '_')) {
					var result = method.apply(instance, params);
					if (result !== undefined) {
						returnValues.push(result);
					}
				}
			});
			// Return an array of values for the jQuery instances
			// Or the value itself if there is only one
			// Or keep chaining
			return returnValues.length ? (returnValues.length === 1 ? returnValues[0] : returnValues) : this;
		}
		return this.each(function() {
			new ApFullscreenModal(this, options);
		});
	};


	ApFullscreenModal.defaultSettings = {
		backgroundColor: '#fff',
		openSelector: undefined,
		autoOpen: false,
		closeSelector: '.close-modal',
		showCloseButton: true,
		animationDuration: 200
	};


	ApFullscreenModal.template =
		'<div class="' + cssPrefix + 'container">' +
			'<div class="' + cssPrefix + 'wrapper ' + cssPrefix +'clearfix">' +
				'<div class="' + cssPrefix + 'close-button close-modal"></div>' +
			'</div>' +
		'</div>';

}(jQuery));
