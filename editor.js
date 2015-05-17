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
  $.Redactor.modules = ['build', 'core', 'keydown', 'selection', 'caret', 'utils'];

  $.Redactor.opts = {};

  Redactor.fn = $.Redactor.prototype = {
    
    keyCode: {
      ENTER: 13
    },

    // Инициализация
    init: function(el) {
      this.$element = $(el);
      this.rtePaste = false;
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

          this.build.createContainerBox();
          this.build.loadContent();
          this.build.loadEditor();
          this.build.enableEditor();
          this.build.setCodeAndCall();

        },

        createContainerBox: function()
        {
          this.$box = $('<div class="redactor-box" />');
        },

        isTextarea: function() {
          return (this.$element[0].tagName === 'TEXTAREA');
        },

        loadContent: function() {
          var func = (this.build.isTextarea()) ? 'val' : 'html';
          this.content = $.trim(this.$element[func]());
        },

        loadEditor: function() {
          var func = (this.build.isTextarea()) ? 'fromTextarea' : 'fromElement';
          this.build[func]();
        },

        fromTextarea: function() {
          this.$editor = $('<div />');
          this.$textarea = this.$element;
          this.$box.insertAfter(this.$element).append(this.$editor).append(this.$element);
          this.$editor.addClass('redactor-editor');

          this.$element.hide();
        },

        fromElement: function() {
          this.$editor = this.$element;
          this.build.createTextarea();
          this.$box.insertAfter(this.$editor).append(this.$editor).append(this.$textarea);
          this.$editor.addClass('redactor-editor');
          this.$textarea.hide();
        },

        enableEditor: function()
        {
          this.$editor.attr({ 'contenteditable': true, 'dir': this.opts.direction });
        },

        setCodeAndCall: function() {
          // set code
          // this.code.set(this.content);
          // this.build.setOptions();
          this.build.callEditor();
          // code mode
          if (this.opts.visual) return;
          // setTimeout($.proxy(this.code.showCode, this), 200);
        },

        callEditor: function() {

          this.build.setEvents();

        },

        setEvents: function() {
          // drop
          this.$editor.on('drop.redactor', $.proxy(function(e) {
            e = e.originalEvent || e;

            if (window.FormData === undefined || !e.dataTransfer) return true;

            if (e.dataTransfer.files.length === 0) {
              return this.build.setEventDrop(e);
            }
            else {
              this.build.setEventDropUpload(e);
            }

            setTimeout(this.clean.clearUnverified, 1);
            this.core.setCallback('drop', e);

          }, this));


          // клик
          this.$editor.on('click.redactor', $.proxy(function(e) {
            var event = this.core.getEvent();
            var type = (event == 'click' || event == 'arrow') ? false : 'click';

            this.core.addEvent(type);
            // this.utils.disableSelectAll();
            this.core.setCallback('click', e);

          }, this));

          this.$editor.on('keydown.redactor', $.proxy(this.keydown.init, this));
        }
      };
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
        },

        addEvent: function(name) {
          this.core.event = name;
        },

        getEvent: function() {
          return this.core.event;
        }
      };
    },
    // обработка события нажатая клавиша
    keydown: function() {
      return {
        init: function(e) {
          var key = e.which;
          var arrow = (key >= 37 && key <= 40);
          // this.keydown.ctrl = e.ctrlKey || e.metaKey;
          // this.keydown.current = this.selection.getCurrent();
          // this.keydown.parent = this.selection.getParent();
          // this.keydown.block = this.selection.getBlock();

          if (key == this.keyCode.ENTER && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
            var stop = this.core.setCallback('enter', e);
            if (stop === false) {
              this.keydown.pre = this.utils.isTag(this.keydown.current, 'pre');
              this.keydown.blockquote = this.utils.isTag(this.keydown.current, 'blockquote');
              this.keydown.figcaption = this.utils.isTag(this.keydown.current, 'figcaption');

              // shortcuts setup
              this.shortcuts.init(e, key);

              this.keydown.checkEvents(arrow, key);
              this.keydown.setupBuffer(e, key);
              this.keydown.addArrowsEvent(arrow);
              this.keydown.setupSelectAll(e, key);

              // callback
              var keydownStop = this.core.setCallback('keydown', e);
              if (keydownStop === false) {
                e.preventDefault();
                return false;
              }

          // down
              if (this.opts.enterKey && key === this.keyCode.DOWN) {
                this.keydown.onArrowDown();
              }

              // turn off enter key
              if (!this.opts.enterKey && key === this.keyCode.ENTER) {
                e.preventDefault();
                // remove selected
                if (!this.range.collapsed) this.range.deleteContents();
                return;
              }
              e.preventDefault();
              return false;
            }

            if (this.keydown.blockquote && this.keydown.exitFromBlockquote(e) === true) {
              return false;
            }

            var current, $next;
            if (this.keydown.pre) {
              return this.keydown.insertNewLine(e);
            }
            else if (this.keydown.blockquote || this.keydown.figcaption) {
              current = this.selection.getCurrent();
              $next = $(current).next();

              if ($next.length !== 0 && $next[0].tagName == 'BR') {
                return this.keydown.insertBreakLine(e);
              }
              else if (this.utils.isEndOfElement() && (current && current != 'SPAN')) {
                return this.keydown.insertDblBreakLine(e);
              }
              else {
                return this.keydown.insertBreakLine(e);
              }
            }
            else if (this.opts.linebreaks && !this.keydown.block) {
              current = this.selection.getCurrent();
              $next = $(this.keydown.current).next();



              if ($next.length !== 0 && $next[0].tagName == 'BR') {
                return this.keydown.insertBreakLine(e);
              }
              else if (current !== false && $(current).hasClass('redactor-invisible-space')) {
                this.caret.setAfter(current);
                $(current).contents().unwrap();

                return this.keydown.insertDblBreakLine(e);
              }
              else {
                if (this.utils.isEndOfEditor()) {
                  return this.keydown.insertDblBreakLine(e);
                }
                else if ($next.length === 0 && current === false && typeof $next.context != 'undefined') {
                  return this.keydown.insertBreakLine(e);
                }

                return this.keydown.insertBreakLine(e);
              }
            }
            else if (this.opts.linebreaks && this.keydown.block) {
              setTimeout($.proxy(this.keydown.replaceDivToBreakLine, this), 1);
            }
            // paragraphs
            else if (!this.opts.linebreaks && this.keydown.block) {
              if (this.keydown.block.tagName !== 'LI') {
                setTimeout($.proxy(this.keydown.replaceDivToParagraph, this), 1);
              }
              else {
                current = this.selection.getCurrent();
                var $parent = $(current).closest('li', this.$editor[0]);
                var $list = $parent.closest('ul,ol', this.$editor[0]);

                if ($parent.length !== 0 && this.utils.isEmpty($parent.html()) && $list.next().length === 0 && this.utils.isEmpty($list.find("li").last().html())) {
                  $list.find("li").last().remove();

                  var node = $(this.opts.emptyHtml);
                  $list.after(node);
                  this.caret.setStart(node);

                  return false;
                }
              }
            }
            else if (!this.opts.linebreaks && !this.keydown.block) {
              return this.keydown.insertParagraph(e);
            }
          }
        },
        insertParagraph: function(e) {
          e.preventDefault();
          this.selection.get();
          var p = document.createElement('p');
          p.innerHTML = this.opts.invisibleSpace;
          this.range.deleteContents();
          this.range.insertNode(p);
          this.caret.setStart(p);
          this.code.sync();
          return false;
          },
      };
    },

    caret: function() {
      return {
        setStart: function(node) {
          if (!this.utils.isBlock(node)) {
            var space = this.utils.createSpaceElement();

            $(node).prepend(space);
            this.caret.setEnd(space);
          }
          else {
            this.caret.set(node, 0, node, 0);
          }
        },
        setEnd: function(node) {
          this.caret.set(node, 1, node, 1);
        },
        set: function(orgn, orgo, focn, foco) {
          // focus
          orgn = orgn[0] || orgn;
          focn = focn[0] || focn;

          if (this.utils.isBlockTag(orgn.tagName) && orgn.innerHTML === '') {
            orgn.innerHTML = this.opts.invisibleSpace;
          }

          if (orgn.tagName == 'BR' && this.opts.linebreaks === false) {
            var parent = $(this.opts.emptyHtml)[0];
            $(orgn).replaceWith(parent);
            orgn = parent;
            focn = orgn;
          }

          this.selection.get();

          try {
            this.range.setStart(orgn, orgo);
            this.range.setEnd(focn, foco);
          }
          catch (e) {}

          this.selection.addRange();
        },
      };
    },

    selection: function() {
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
            return this.utils.isRedactorParent($(elem).parent()[0]); //this.utils.isRedactorParent...
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

          return false;
        },
        addRange: function() {
          try {
            this.sel.removeAllRanges();
          } catch (e) {}
          this.sel.addRange(this.range);
        }

      };
    },

    utils: function() {
        return {
          isRedactorParent: function(el) {
            if (!el) {
              return false;
            }
            if ($(el).parents('.redactor-editor').length === 0 || $(el).hasClass('redactor-editor')) {
              return false;
            }
            return el;
          },

          isBlockTag: function(tag) {
            if (typeof tag == 'undefined') return false;

            // return this.reIsBlock.test(tag);
          },

          isBlock: function(block) {
            block = block[0] || block;
            return block && this.utils.isBlockTag(block.tagName);
        },
        createSpaceElement: function() {
          var space = document.createElement('span');
          space.className = 'redactor-invisible-space';
          space.innerHTML = this.opts.invisibleSpace;

          return space;
        }
      };
    }
  };

  Redactor.prototype.init.prototype = Redactor.prototype;
});
