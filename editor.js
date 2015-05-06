$(function() {
  'use strict';

  $.fn.redactor = function() {
    this.each(function() {
      $.data(this, 'redactor', Redactor(this));
    });
  };

  function Redactor(el) {
    return new Redactor.prototype.init(el);
  }

  $.Redactor = Redactor;

  // Список модулей, которые будут подгружены к основному объекту редактора.
  $.Redactor.modules = ['build', 'core'];

  $.Redactor.opts = {};

  Redactor.fn = $.Redactor.prototype = {
    // Инициализация
    init: function(el) {
      this.$element = $(el);

      // Обработка параметров.
      this.loadOptions();

      // Подгрузка модулей.
      this.loadModules();

      // Запуск метода «run» из модуля «build».
      this.build.run();
    },

    // Обработка параметров.
    loadOptions: function() {
      this.opts = $.extend(
        {},
        $.extend(true, {}, $.Redactor.opts)
      );
    },
    // Получение методов, определённых внутри модуля.
    getModuleMethods: function(object) {
      return Object.getOwnPropertyNames(object).filter(function(property) {
        return typeof object[property] == 'function';
      });
    },
    // Загрузка модулей.
    loadModules: function() {
      var len = $.Redactor.modules.length;
      for (var i = 0; i < len; i++) {
        this.bindModuleMethods($.Redactor.modules[i]);
      }
    },
    // Прикрепление методов из модуля к нашему основному объекту.
    bindModuleMethods: function(module) {
      if (typeof this[module] == 'undefined') return;

      this[module] = this[module]();

      var methods = this.getModuleMethods(this[module]);
      var len = methods.length;

      for (var z = 0; z < len; z++) {
        this[module][methods[z]] = this[module][methods[z]].bind(this);
      }
    },

    // Собственно, сами модули.

    // Модуль, который отвечает за визуальное создание редактора.
    build: function() {
      return {
        run: function() {
          // ПРОДОЛЖАТЬ ЗДЕСЬ

          //this.build.createContainerBox();
          //this.build.loadContent();
          //this.build.loadEditor();
          //this.build.enableEditor();
          //this.build.setCodeAndCall();
        }
      }
    },

    // Модуль, который позволяет создавать собственные обработчики событий и прикрепляться к ним.
    // (Пока что не используется.)
    core:  function() {
      return {
        setCallback: function(type, e, data) {
          var callback = this.opts[type + 'Callback'];
          if ($.isFunction(callback)) {
            return (typeof data == 'undefined') ? callback.call(this, e) : callback.call(this, e, data);
          } else {
            return (typeof data == 'undefined') ? e : data;
          }
        }
      }
    }
  };

  Redactor.prototype.init.prototype = Redactor.prototype;
});
