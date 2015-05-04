$(function() {

/*  if (!Function.prototype.bind) {
    Function.prototype.bind = function(scope) {
      var fn = this;
      return function() {
        return fn.apply(scope);
      };
    };
  }*/
  var uuid = 0;
  $.fn.redactor = function() {

    var val = [];
    var args = Array.prototype.slice.call(arguments, 1);

    this.each(function() {
      $.data(this, 'redactor', {});
      $.data(this, 'redactor', Redactor(this));
    });
    if (val.length === 0) return this;
    else if (val.length === 1) return val[0];
    else return val;
  };

  function Redactor(el) {
    return new Redactor.prototype.init(el);
  }

  $.Redactor = Redactor;

  // Модули редактора
  $.Redactor.modules = ['keydown'];
  Redactor.fn = $.Redactor.prototype = {
    // Инициализация
    init: function(el) {
      this.$element = $(el);
      this.uuid = uuid++;

      this.rtePaste = false;
      this.$pasteBox = false;

      // this.loadOptions(options);
      this.loadModules(); // Вызов функции loadModules

      // this.formatting = {};
      // this.core.setCallback('start');
      // this.start = true;
      // this.build.run();
      
    },

    getModuleMethods: function(object) {
      return Object.getOwnPropertyNames(object).filter(function(property) {
        return typeof object[property] == 'function';
      });
    },

    // Загрузка модулей редактора
    loadModules: function() {
      var len = $.Redactor.modules.length;
      for (var i = 0; i < len; i++) {
        this.bindModuleMethods($.Redactor.modules[i]);
      }
    },

    bindModuleMethods: function(module) {
      if (typeof this[module] == 'undefined') return;

      // init module
      this[module] = this[module]();

      var methods = this.getModuleMethods(this[module]);
      var len = methods.length;

      // bind methods
      for (var z = 0; z < len; z++) {
        this[module][methods[z]] = this[module][methods[z]].bind(this);
      }
    }

/*    build: function() {
      return {
        run: function() {
          this.build.createContainerBox();
          this.build.loadContent;
        },

        isTextarea: function() {
          return(this.$el[0].tagname === 'TEXTAREA');
        },

        createContainerBox: function() {
          this.$box = $('<div class="redactor-box" />');
        },

        loadContent: function() {
          var func = (this.build.isTextarea()) ? 'val' : 'html';
          this.content = $.trim(this.$element[func]());
        }
      };
    },*/

/*    setCallback: function(type, e, data) {
      var callback = this.opts[type + 'Callback'];
        if ($.isFunction(callback)) {
            return (typeof data == 'undefined') ? callback.call(this, e) : callback.call(this, e, data);
          }
        else {
          return (typeof data == 'undefined') ? e : data;
        }
    },*/

    // отслеживание нажатия клавиш
/*    keydown: function() {
      return {
        init: function(e) {
          if (this.rtePaste) return;

          var key = e.which;
          var arrow = (key >= 37 && key <= 40);

          this.keydown.ctrl = e.ctrlKey || e.metaKey;
          this.keydown.current = this.selection.getCurrent();
          this.keydown.parent = this.selection.getParent();
          this.keydown.block = this.selection.getBlock();

        }
      };
    },
*/
/*    selection: function() {
      return {
        get: function() {
          this.sel = document.getSelection();
          if (document.getSelection && this.sel.getRangeAt && this.sel.rangeCount) {
            this.range = this.sel.getRangeAt(0);
          }
          else {
            this.range = document.createRange();
          }
        },

        getCurrent: function() {
          var el = false;
          this.selection.get();

          if (this.sel && this.sel.rangeCount > 0) {
            el = this.sel.getRangeAt(0).startContainer;
          }
          return this.utils.isRedactorParent(el);
        },

        getParent: function(elem) {
          elem = elem || this.selection.getCurrent();
          if (elem) {
            return this.utils.isRedactorParent($(elem).parent()[0]);
          }
          return false;
        },

        getBlock: function(node) {
          node = node || this.selection.getCurrent();
          while (node) {
            if (this.utils.isBlockTag(node.tagName)) {
              return ($(node).hasClass('redactor-editor')) ? false : node;
            }
            node = node.parentNode;
          }
        }
      }
    },*/
    
/*    utils: function() {
      return {
        isRedactorParent: function(el) {
          if (!el) {
            return false;
          }
          if ($(el).parents('.redactor-editor').length === 0 || $(el).hasClass('redactor-editor')) {
            return false;
          }
          return el;
        }
      };
    }*/
    
  };
  
});