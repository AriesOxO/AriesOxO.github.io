(function() {
  /* --- GitHub 版本号自动获取 --- */
  var versionEl = document.querySelector('.js-project-version');
  if (versionEl) {
    var repo = versionEl.getAttribute('data-repo') || '';
    var match = repo.match(/github\.com\/([^\/]+\/[^\/]+)/);
    if (match) {
      fetch('https://api.github.com/repos/' + match[1] + '/releases/latest')
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (data.tag_name) {
            versionEl.textContent = data.tag_name;
            versionEl.style.display = 'inline-block';
          }
        })
        .catch(function() {});
    }
  }

  /* --- 右侧子目录：从 H3 生成 --- */
  var tocList = document.querySelector('.js-doc-toc-list');
  var content = document.querySelector('.js-article-content');
  if (tocList && content) {
    var h3s = content.querySelectorAll('h3');
    h3s.forEach(function(h3) {
      var li = document.createElement('li');
      li.className = 'doc-toc-list__item';
      var a = document.createElement('a');
      a.href = '#' + h3.id;
      a.textContent = h3.textContent.replace(/^#\s*/, '');
      li.appendChild(a);
      tocList.appendChild(li);
    });

    // 右侧 TOC 高亮
    var h3Array = Array.prototype.slice.call(h3s);
    var tocLinks = tocList.querySelectorAll('a');
    function updateTocActive() {
      var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      var current = null;
      for (var i = h3Array.length - 1; i >= 0; i--) {
        if (h3Array[i].offsetTop - 120 <= scrollTop) {
          current = h3Array[i].id;
          break;
        }
      }
      tocLinks.forEach(function(link) {
        if (link.getAttribute('href') === '#' + current) {
          link.parentElement.classList.add('doc-toc-list__item--active');
        } else {
          link.parentElement.classList.remove('doc-toc-list__item--active');
        }
      });
    }
    window.addEventListener('scroll', window.throttle(updateTocActive, 100));
    updateTocActive();
  }

  /* --- 左侧文档导航：从 H2 自动生成（如果 front matter 未定义 nav） --- */
  var navList = document.querySelector('.js-doc-nav-list');
  if (!navList || !content) return;

  var h2s = content.querySelectorAll('h2');
  // 如果 nav 列表为空（front matter 未定义），自动从 H2 生成
  if (navList.children.length === 0 && h2s.length > 0) {
    h2s.forEach(function(h2) {
      var li = document.createElement('li');
      li.className = 'doc-nav-list__item';
      var a = document.createElement('a');
      a.href = '#' + h2.id;
      a.innerHTML = '<span>' + h2.textContent.replace(/^#\s*/, '') + '</span>';
      li.appendChild(a);
      navList.appendChild(li);
    });
  }

  // front matter 定义了 nav 的情况：匹配 data-section 到 H2 的 id
  var navLinks = navList.querySelectorAll('a[data-section]');
  navLinks.forEach(function(link) {
    var sectionTitle = link.getAttribute('data-section');
    for (var i = 0; i < h2s.length; i++) {
      if (h2s[i].textContent.replace(/^#\s*/, '').trim() === sectionTitle.trim()) {
        link.href = '#' + h2s[i].id;
        break;
      }
    }
  });

  /* --- 左导航高亮当前章节 --- */
  var allNavLinks = navList.querySelectorAll('a');
  var h2Array = Array.prototype.slice.call(h2s);

  function updateActiveNav() {
    var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    var current = null;
    for (var i = h2Array.length - 1; i >= 0; i--) {
      if (h2Array[i].offsetTop - 100 <= scrollTop) {
        current = h2Array[i].id;
        break;
      }
    }
    allNavLinks.forEach(function(link) {
      var href = link.getAttribute('href');
      if (href === '#' + current) {
        link.parentElement.classList.add('doc-nav-list__item--active');
      } else {
        link.parentElement.classList.remove('doc-nav-list__item--active');
      }
    });
  }

  window.addEventListener('scroll', window.throttle(updateActiveNav, 100));
  updateActiveNav();

  /* --- 移动端导航切换 --- */
  var toggleBtn = document.querySelector('.js-doc-nav-toggle');
  var nav = document.querySelector('.js-doc-nav');
  if (toggleBtn && nav) {
    toggleBtn.addEventListener('click', function() {
      nav.classList.toggle('project-doc__nav--open');
    });
    // 点击导航项后关闭
    nav.addEventListener('click', function(e) {
      if (e.target.closest('a')) {
        nav.classList.remove('project-doc__nav--open');
      }
    });
  }
})();
