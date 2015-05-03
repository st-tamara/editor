$(function() {
  $.fn.redactor = function() {
    this.each(function() {
      // $.data(this, 'redactor', {});
      $.data(this, 'redactor', Redactor(this));
    });
  };

  function Redactor(el) {
    return new Redactor.prototype.init(el);
  }

  $.Redactor = Redactor;

  Redactor.fn = $.Redactor.prototype = {
    init: function(el) {
      // this.core.setCallback('start');
      this.start = true;
      this.build.run();
      // var btn = $('<button>Make bold text</button>')[0];
      // btn.addEventListener('click', function() { alert('Text is bold') }, false);
      // $(el).before(btn);
      // el.addEventListener('click', function() { alert('YA KNOPKO!'); }, false);
    },
    build: function() {
      return {
        run: function() {
          this.build.createContainerBox();
        },
        isTextarea: function() {
          return(this.$el[0].tagname === 'TEXTAREA');
        },
        createContainerBox: function() {
          this.$box = $('<div class="redactor-box" />');
        },
      }
    },
    /*setCallback: function(type, e, data) {
      var callback = this.opts[type + 'Callback'];
        if ($.isFunction(callback)) {
            return (typeof data == 'undefined') ? callback.call(this, e) : callback.call(this, e, data);
          }
        else {
          return (typeof data == 'undefined') ? e : data;
        }
    }*/
    
  };
});