(function() {
  var SOURCES = window.TEXT_VARIABLES.sources;
  window.Lazyload.js(SOURCES.jquery, function() {
    $(function() {
      var $this ,$scroll;
      var $articleContent = $('.js-article-content');
      var hasSidebar = $('.js-page-root').hasClass('layout--page--sidebar');
      var scroll = hasSidebar ? '.js-page-main' : 'html, body';
      $scroll = $(scroll);

      $articleContent.find('.highlight').each(function() {
        $this = $(this);
        $this.attr('data-lang', $this.find('code').attr('data-lang'));
      });
      $articleContent.find('h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]').each(function() {
        $this = $(this);
        $this.append($('<a class="anchor d-print-none" aria-hidden="true"></a>').html('<i class="fas fa-anchor"></i>'));
      });
      $articleContent.on('click', '.anchor', function() {
        $scroll.scrollToAnchor('#' + $(this).parent().attr('id'), 400);
      });

      $articleContent.find('.highlight').each(function() {
        var $block = $(this);
        if ($block.find('.code-copy-btn').length) return;
        var $btn = $('<button class="code-copy-btn d-print-none" title="复制代码"><i class="fas fa-copy"></i></button>');
        $block.css('position', 'relative').append($btn);
      });
      $articleContent.on('click', '.code-copy-btn', function(e) {
        e.stopPropagation();
        var $btn = $(this);
        var code = $btn.siblings('pre').find('code').text() || $btn.parent().find('code').text();
        navigator.clipboard.writeText(code).then(function() {
          $btn.html('<i class="fas fa-check"></i>');
          setTimeout(function() { $btn.html('<i class="fas fa-copy"></i>'); }, 2000);
        });
      });
    });
  });
})();
