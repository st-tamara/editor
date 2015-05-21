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
  $.Redactor.modules = ['build', 'core', 'code', 'keydown', 'selection', 'caret', 'utils', 'clean', 'autosave', 'tidy', 'buffer',
  'paragraphize'];

  $.Redactor.opts = {
    direction: 'ltr',
    visual: true,
    tabindex: false,
    minHeight: false,
    maxHeight: false,
    linebreaks: false,

    replaceDivs:true,
    paragraphize: true,
    enterKey: true,
    cleanSpaces: true,
    linkNofollow: false,

    autosave: false, 
    autosaveName: false,
    autosaveInterval: 60, 
    autosaveOnChange: false,
    autosaveFields: false,

    deniedTags: ['script', 'style'],
    allowedTags: false, 

    removeComments: false,
    replaceTags: [
      ['strike', 'del']
    ],
    replaceStyles: [
            ['font-weight:\\s?bold', "strong"],
            ['font-style:\\s?italic', "em"],
            ['text-decoration:\\s?underline', "u"],
            ['text-decoration:\\s?line-through', 'del']
        ],
        removeDataAttr: false,

    removeAttr: false,
    allowedAttr: false,

    removeWithoutAttr: ['span'],
    removeEmpty: ['p'],

    buffer:[],

    emptyHtml: '<p>&#x200b;</p>',
    invisibleSpace: '&#x200b;',
    blockLevelElements: ['PRE', 'UL', 'OL', 'LI'],

    inlineTags:     ['strong', 'b', 'u', 'em', 'i', 'code', 'del', 'ins', 'samp', 'kbd', 'sup', 'sub', 'mark', 'var', 'cite', 'small']
  };

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

      this.reIsBlock = new RegExp('^(' + this.opts.blockLevelElements.join('|' ) + ')$', 'i');

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

        createContainerBox: function() {
          this.$box = $('<div class="redactor-box" />');
        },

        isTextarea: function() {
          return (this.$element[0].tagName === 'TEXTAREA');
        },

        loadContent: function() {
          var func = (this.build.isTextarea()) ? 'val' : 'html';
          this.content = $.trim(this.$element[func]());
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

        loadEditor: function() {
          var func = (this.build.isTextarea()) ? 'fromTextarea' : 'fromElement';
          this.build[func]();
        },

        enableEditor: function() {
          this.$editor.attr({ 'contenteditable': true, 'dir': this.opts.direction });
        },

        setCodeAndCall: function() {
          this.code.set(this.content);
          this.build.setOptions();
          this.build.callEditor();

          if (this.opts.visual) return;
          // setTimeout($.proxy(this.code.showCode, this), 200);
        },

        setOptions: function() {

          $(this.$textarea).attr('dir', this.opts.direction);
          if (this.opts.linebreaks) this.$editor.addClass('redactor-linebreaks');
          if (this.opts.tabindex) this.$editor.attr('tabindex', this.opts.tabindex);
          if (this.opts.minHeight) this.$editor.css('minHeight', this.opts.minHeight);
          if (this.opts.maxHeight) this.$editor.css('maxHeight', this.opts.maxHeight);

        },

        callEditor: function() {
          this.build.setEvents();
        },

        setEvents: function() {
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

    keydown: function() {
      return {
        init: function(e) {
          if (this.rtePaste) return;

          var key = e.which;
          var arrow = (key >= 37 && key <= 40);

          if (key == this.keyCode.ENTER) {
            var stop = this.core.setCallback('enter', e);
            if (stop === false) {
              this.keydown.pre = this.utils.isTag(this.keydown.current, 'pre');
              this.keydown.blockquote = this.utils.isTag(this.keydown.current, 'blockquote');
              this.keydown.figcaption = this.utils.isTag(this.keydown.current, 'figcaption');

              this.shortcuts.init(e, key);

              this.keydown.checkEvents(arrow, key);
              this.keydown.setupBuffer(e, key);
              this.keydown.addArrowsEvent(arrow);
              this.keydown.setupSelectAll(e, key);

              var keydownStop = this.core.setCallback('keydown', e);

              if (keydownStop === false) {
                e.preventDefault();
                return false;
              }
              if (this.opts.enterKey && key === this.keyCode.DOWN) {
                this.keydown.onArrowDown();
              }
              if (!this.opts.enterKey && key === this.keyCode.ENTER) {
                e.preventDefault();
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
            // абзацы
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
          this.code.sync();  
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
        }
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
        addRange: function() {
          try {
            this.sel.removeAllRanges();
          } catch (e) {}
          this.sel.addRange(this.range);
        },
      }
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
      }
    },
    utils: function() {
      return {
        isBlock: function(block) {
          block = block[0] || block;

          return block && this.utils.isBlockTag(block.tagName);
        },
        isBlockTag: function(tag) {
          if (typeof tag == 'undefined') return false;

          return this.reIsBlock.test(tag);
        },
        createSpaceElement: function() {
          var space = document.createElement('span');
          space.className = 'redactor-invisible-space';
          space.innerHTML = this.opts.invisibleSpace;

          return space;
        }
      }
    },
    code: function() {
      return {
        set: function(html) {
          html = $.trim(html.toString());
          html = this.clean.onSet(html);
          this.$editor.html(html);
          this.code.sync();

          if (html !== '') this.placeholder.remove();

          setTimeout($.proxy(this.buffer.add, this), 15);
          if (this.start === false) this.observe.load();
        },
        sync: function (){
          setTimeout($.proxy(this.code.startSync, this), 10);
        },
        startSync: function() {
          var html = this.$editor.html();
 
          if (this.code.syncCode && this.code.syncCode == html) {
            return;
          }

          // сохранение
          this.code.syncCode = html;

          html = this.core.setCallback('syncBefore', html);

          html = this.clean.onSync(html);

          this.$textarea.val(html);

          this.core.setCallback('sync', html);

          if (this.start === false) {
            this.core.setCallback('change', html);
          }

          this.start = false;

          if (this.autosave.html == false) {
            this.autosave.html = this.code.get();
          }

          //автосохранение
          this.autosave.onChange();
          this.autosave.enable();
        },   
      }
    },
    clean: function() {
      return {
        onSet: function(html) {
          html = this.clean.savePreCode(html);

          html = html.replace(/<script(.*?[^>]?)>([\w\W]*?)<\/script>/gi, '<pre class="redactor-script-tag" style="display: none;" $1>$2</pre>');

          html = html.replace(/\$/g, '&#36;');

          html = html.replace(/<a href="(.*?[^>]?)®(.*?[^>]?)">/gi, '<a href="$1&reg$2">');

          if (this.opts.replaceDivs) html = this.clean.replaceDivs(html);
          if (this.opts.linebreaks)  html = this.clean.replaceParagraphsToBr(html);

          html = this.clean.saveFormTags(html);

          var $div = $('<div>');
          $div.html(html);
          var fonts = $div.find('font[style]');
          if (fonts.length !== 0) {
            fonts.replaceWith(function() {
              var $el = $(this);
              var $span = $('<span>').attr('style', $el.attr('style'));
              return $span.append($el.contents());
            });

            html = $div.html();
          }
          $div.remove();

          html = html.replace(/<font(.*?[^<])>/gi, '');
          html = html.replace(/<\/font>/gi, '');

          html = this.tidy.load(html);

          if (this.opts.paragraphize) html = this.paragraphize.load(html);

          html = this.clean.setVerified(html);

          html = this.clean.convertInline(html);

          return html;
        },
        onSync: function(html) {
          // удаление пробелов
          html = html.replace(/[\u200B-\u200D\uFEFF]/g, '');
          html = html.replace(/&#x200b;/gi, '');

          if (this.opts.cleanSpaces) {
            html = html.replace(/&nbsp;/gi, ' ');
          }

          if (html.search(/^<p>(||\s||<br\s?\/?>||&nbsp;)<\/p>$/i) != -1) {
            return '';
          }

          html = html.replace(/<pre class="redactor-script-tag" style="display: none;"(.*?[^>]?)>([\w\W]*?)<\/pre>/gi, '<script$1>$2</script>');

          var chars = {
            '\u2122': '&trade;',
            '\u00a9': '&copy;',
            '\u2026': '&hellip;',
            '\u2014': '&mdash;',
            '\u2010': '&dash;'
          };

          $.each(chars, function(i,s) {
            html = html.replace(new RegExp(i, 'g'), s);
          });

          html = html.replace(new RegExp('<br\\s?/?></li>', 'gi'), '</li>');
          html = html.replace(new RegExp('</li><br\\s?/?>', 'gi'), '</li>');

          html = html.replace(/<div(.*?[^>]) data-tagblock="redactor"(.*?[^>])>/gi, '<div$1$2>');
          html = html.replace(/<(.*?) data-verified="redactor"(.*?[^>])>/gi, '<$1$2>');
          html = html.replace(/<span(.*?[^>])\srel="(.*?[^>])"(.*?[^>])>/gi, '<span$1$3>');
          html = html.replace(/<img(.*?[^>])\srel="(.*?[^>])"(.*?[^>])>/gi, '<img$1$3>');
          html = html.replace(/<img(.*?[^>])\sstyle="" (.*?[^>])>'/gi, '<img$1 $2>');
          html = html.replace(/<img(.*?[^>])\sstyle (.*?[^>])>'/gi, '<img$1 $2>');
          html = html.replace(/<span class="redactor-invisible-space">(.*?)<\/span>/gi, '$1');
          html = html.replace(/ data-save-url="(.*?[^>])"/gi, '');

          html = html.replace(/<span(.*?)id="redactor-image-box"(.*?[^>])>([\w\W]*?)<img(.*?)><\/span>/gi, '$3<img$4>');
          html = html.replace(/<span(.*?)id="redactor-image-resizer"(.*?[^>])>(.*?)<\/span>/gi, '');
          html = html.replace(/<span(.*?)id="redactor-image-editter"(.*?[^>])>(.*?)<\/span>/gi, '');

          html = html.replace(/<font(.*?[^<])>/gi, '');
          html = html.replace(/<\/font>/gi, '');

          html = this.tidy.load(html);

          if (this.opts.linkNofollow) {
            html = html.replace(/<a(.*?)rel="nofollow"(.*?[^>])>/gi, '<a$1$2>');
            html = html.replace(/<a(.*?[^>])>/gi, '<a$1 rel="nofollow">');
          }

          html = html.replace(/\sdata-redactor-(tag|class|style)="(.*?[^>])"/gi, '');
          html = html.replace(new RegExp('<(.*?) data-verified="redactor"(.*?[^>])>', 'gi'), '<$1$2>');
          html = html.replace(new RegExp('<(.*?) data-verified="redactor">', 'gi'), '<$1>');

          return html;
        },

        savePreCode: function(html) {
          html = this.clean.savePreFormatting(html);
          html = this.clean.saveCodeFormatting(html);

          return html;
        },

        savePreFormatting: function(html) {
          var pre = html.match(/<pre(.*?)>([\w\W]*?)<\/pre>/gi);
          if (pre !== null) {
            $.each(pre, $.proxy(function(i,s) {
              var arr = s.match(/<pre(.*?)>([\w\W]*?)<\/pre>/i);

              arr[2] = arr[2].replace(/<br\s?\/?>/g, '\n');
              arr[2] = arr[2].replace(/&nbsp;/g, ' ');

              if (this.opts.preSpaces) {
                arr[2] = arr[2].replace(/\t/g, Array(this.opts.preSpaces + 1).join(' '));
              }

              arr[2] = this.clean.encodeEntities(arr[2]);

              arr[2] = arr[2].replace(/\$/g, '&#36;');

              html = html.replace(s, '<pre' + arr[1] + '>' + arr[2] + '</pre>');
            }, this));
          }

          return html;
        },

        saveCodeFormatting: function(html) {
          var code = html.match(/<code(.*?[^>])>(.*?)<\/code>/gi);
          if (code !== null) {
            $.each(code, $.proxy(function(i,s) {
              var arr = s.match(/<code(.*?[^>])>(.*?)<\/code>/i);

              arr[2] = arr[2].replace(/&nbsp;/g, ' ');
              arr[2] = this.clean.encodeEntities(arr[2]);

              arr[2] = arr[2].replace(/\$/g, '&#36;');

              html = html.replace(s, '<code' + arr[1] + '>' + arr[2] + '</code>');
            }, this));
          }
          return html;
        },
        saveFormTags: function(html) {
          return html.replace(/<form(.*?)>([\w\W]*?)<\/form>/gi, '<section$1 rel="redactor-form-tag">$2</section>');
        },
        setVerified: function(html) {
          html = html.replace(new RegExp('<img(.*?[^>])>', 'gi'), '<img$1 data-verified="redactor">');
          html = html.replace(new RegExp('<span(.*?[^>])>', 'gi'), '<span$1 data-verified="redactor">');

          var matches = html.match(new RegExp('<(span|img)(.*?)style="(.*?)"(.*?[^>])>', 'gi'));

          if (matches) {
            var len = matches.length;
            for (var i = 0; i < len; i++) {
              try {
                var newTag = matches[i].replace(/style="(.*?)"/i, 'style="$1" rel="$1"');
                html = html.replace(matches[i], newTag);
              }
              catch (e) {}
            }
          }

          return html;
        },
        convertInline: function(html) {
          var $div = $('<div />').html(html);

          var tags = this.opts.inlineTags;
          tags.push('span');

          $div.find(tags.join(',')).each(function() {
            var $el = $(this);
            var tag = this.tagName.toLowerCase();
            $el.attr('data-redactor-tag', tag);

            if (tag == 'span') {
              if ($el.attr('style')) $el.attr('data-redactor-style', $el.attr('style'));
              else if ($el.attr('class')) $el.attr('data-redactor-class', $el.attr('class'));
            }

          });

          html = $div.html();
          $div.remove();

          return html;
        },
        replaceDivs: function(html) {
          if (this.opts.linebreaks) {
            html = html.replace(/<div><br\s?\/?><\/div>/gi, '<br />');
            html = html.replace(/<div(.*?)>([\w\W]*?)<\/div>/gi, '$2<br />');
          }
          else {
            html = html.replace(/<div(.*?)>([\w\W]*?)<\/div>/gi, '<p$1>$2</p>');
          }

          html = html.replace(/<div(.*?[^>])>/gi, '');
          html = html.replace(/<\/div>/gi, '');

          return html;
        },
        replaceDivsToBr: function(html) {
          html = html.replace(/<div\s(.*?)>/gi, '<p>');
          html = html.replace(/<div><br\s?\/?><\/div>/gi, '<br /><br />');
          html = html.replace(/<div>([\w\W]*?)<\/div>/gi, '$1<br /><br />');

          return html;
        }
      }
    },
    autosave: function() {
      return {
        enable: function() {
          if (!this.opts.autosave) return;
          this.autosave.name = (this.opts.autosaveName) ? this.opts.autosaveName : this.$textarea.attr('name');

          if (this.opts.autosaveOnChange) return;
          this.autosaveInterval = setInterval(this.autosave.load, this.opts.autosaveInterval * 1000);
        },
        onChange: function() {
          if (!this.opts.autosaveOnChange) return;
          this.autosave.load();
        }
      }
    },
    tidy: function() {
      return {
        load: function(html, options) {
          this.tidy.settings = {
            deniedTags: this.opts.deniedTags,
            allowedTags: this.opts.allowedTags,
            removeComments: this.opts.removeComments,
            replaceTags: this.opts.replaceTags,
            replaceStyles: this.opts.replaceStyles,
            removeDataAttr: this.opts.removeDataAttr,
            removeAttr: this.opts.removeAttr,
            allowedAttr: this.opts.allowedAttr,
            removeWithoutAttr: this.opts.removeWithoutAttr,
            removeEmpty: this.opts.removeEmpty
          };

          $.extend(this.tidy.settings, options);

          html = this.tidy.removeComments(html);

          // контейнер
          this.tidy.$div = $('<div />').append(html);

          // очистка
          this.tidy.replaceTags();
          this.tidy.replaceStyles();
          this.tidy.removeTags();

          this.tidy.removeAttr();
          this.tidy.removeEmpty();
          this.tidy.removeParagraphsInLists();
          this.tidy.removeDataAttr();
          this.tidy.removeWithoutAttr();

          html = this.tidy.$div.html();
          this.tidy.$div.remove();

          return html;
        },
        removeComments: function(html) {
          if (!this.tidy.settings.removeComments) return html;
          return html.replace(/<!--[\s\S]*?-->/gi, '');
        },
        replaceTags: function(html) {
          if (!this.tidy.settings.replaceTags) return html;

          var len = this.tidy.settings.replaceTags.length;
          var replacement = [], rTags = [];
          for (var i = 0; i < len; i++) {
            rTags.push(this.tidy.settings.replaceTags[i][1]);
            replacement.push(this.tidy.settings.replaceTags[i][0]);
          }

          this.tidy.$div.find(replacement.join(',')).each($.proxy(function(n,s) {
            var tag = rTags[n];
            $(s).replaceWith(function() {
              var replaced = $('<' + tag + ' />').append($(this).contents());

              for (var i = 0; i < this.attributes.length; i++) {
                replaced.attr(this.attributes[i].name, this.attributes[i].value);
              }

              return replaced;
            });

          }, this));

          return html;
        },
        replaceStyles: function() {
          if (!this.tidy.settings.replaceStyles) return;

          var len = this.tidy.settings.replaceStyles.length;
          this.tidy.$div.find('span').each($.proxy(function(n,s) {
            var $el = $(s);
            var style = $el.attr('style');
            for (var i = 0; i < len; i++) {
              if (style && style.match(new RegExp('^' + this.tidy.settings.replaceStyles[i][0], 'i'))) {
                var tagName = this.tidy.settings.replaceStyles[i][1];
                $el.replaceWith(function() {
                  var tag = document.createElement(tagName);
                  return $(tag).append($(this).contents());
                });
              }
            }
          }, this));
        },
        removeTags: function() {
          if (!this.tidy.settings.deniedTags && this.tidy.settings.allowedTags) {
            this.tidy.$div.find('*').not(this.tidy.settings.allowedTags.join(',')).each(function(i, s) {
              if (s.innerHTML === '') $(s).remove();
              else $(s).contents().unwrap();
            });
          }

          if (this.tidy.settings.deniedTags) {
            this.tidy.$div.find(this.tidy.settings.deniedTags.join(',')).each(function(i, s) {
              if (s.innerHTML === '') $(s).remove();
              else $(s).contents().unwrap();
            });
          }
        },
        removeAttr: function() {
          var len;
          if (!this.tidy.settings.removeAttr && this.tidy.settings.allowedAttr) {

            var allowedAttrTags = [], allowedAttrData = [];
            len = this.tidy.settings.allowedAttr.length;
            for (var i = 0; i < len; i++) {
              allowedAttrTags.push(this.tidy.settings.allowedAttr[i][0]);
              allowedAttrData.push(this.tidy.settings.allowedAttr[i][1]);
            }


            this.tidy.$div.find('*').each($.proxy(function(n,s) {
              var $el = $(s);
              var pos = $.inArray($el[0].tagName.toLowerCase(), allowedAttrTags);
              var attributesRemove = this.tidy.removeAttrGetRemoves(pos, allowedAttrData, $el);

              if (attributesRemove) {
                $.each(attributesRemove, function(z,f) {
                  $el.removeAttr(f);
                });
              }
            }, this));
          }

          if (this.tidy.settings.removeAttr) {
            len = this.tidy.settings.removeAttr.length;
            for (var i = 0; i < len; i++) {
              var attrs = this.tidy.settings.removeAttr[i][1];
              if ($.isArray(attrs)) attrs = attrs.join(' ');
              this.tidy.$div.find(this.tidy.settings.removeAttr[i][0]).removeAttr(attrs);
            }
          }

        },
        removeEmpty: function() {
          if (!this.tidy.settings.removeEmpty) return;

          this.tidy.$div.find(this.tidy.settings.removeEmpty.join(',')).each(function() {
            var $el = $(this);
            var text = $el.text();
            text = text.replace(/[\u200B-\u200D\uFEFF]/g, '');
            text = text.replace(/&nbsp;/gi, '');
            text = text.replace(/\s/g, '');

                if (text === '' && $el.children().length === 0) {
                  $el.remove();
                }
          });
        },
        removeParagraphsInLists: function() {
          this.tidy.$div.find('li p').contents().unwrap();
        },
        removeDataAttr: function() {
          if (!this.tidy.settings.removeDataAttr) return;

          var tags = this.tidy.settings.removeDataAttr;
          if ($.isArray(this.tidy.settings.removeDataAttr)) tags = this.tidy.settings.removeDataAttr.join(',');

          this.tidy.removeAttrs(this.tidy.$div.find(tags), '^(data-)');

        },
        removeWithoutAttr: function() {
          if (!this.tidy.settings.removeWithoutAttr) return;

          this.tidy.$div.find(this.tidy.settings.removeWithoutAttr.join(',')).each(function() {
            if (this.attributes.length === 0) {
              $(this).contents().unwrap();
            }
          });
        },
      }
    },
    buffer: function() {
      return {
        add: function() {
          this.opts.buffer.push(this.$editor.html());
        }
      }
    },
    paragraphize: function() {
      return {
        load: function(html) {
          if (this.opts.linebreaks) return html;
          if (html === '' || html === '<p></p>') return this.opts.emptyHtml;

          this.paragraphize.blocks = ['table', 'div', 'pre', 'form', 'ul', 'ol', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'dl', 'blockquote', 'figcaption',
          'address', 'section', 'header', 'footer', 'aside', 'article', 'object', 'style', 'script', 'iframe', 'select', 'input', 'textarea',
          'button', 'option', 'map', 'area', 'math', 'hr', 'fieldset', 'legend', 'hgroup', 'nav', 'figure', 'details', 'menu', 'summary', 'p'];

          html = html + "\n";

          this.paragraphize.safes = [];
          this.paragraphize.z = 0;

          html = html.replace(/(<br\s?\/?>){1,}\n?<\/blockquote>/gi, '</blockquote>');

          html = this.paragraphize.getSafes(html);
          html = this.paragraphize.getSafesComments(html);
          html = this.paragraphize.replaceBreaksToNewLines(html);
          html = this.paragraphize.replaceBreaksToParagraphs(html);
          html = this.paragraphize.clear(html);
          html = this.paragraphize.restoreSafes(html);

          html = html.replace(new RegExp('<br\\s?/?>\n?<(' + this.paragraphize.blocks.join('|') + ')(.*?[^>])>', 'gi'), '<p><br /></p>\n<$1$2>');

          return $.trim(html);
        }
      }
    }

  };

  Redactor.prototype.init.prototype = Redactor.prototype;
});
