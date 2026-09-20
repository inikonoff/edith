import { DATA_ATTR } from '@edith/mapper';

export const PREVIEW_BRIDGE_SCRIPT = `(function () {
  var ATTR = ${JSON.stringify(DATA_ATTR)};
  var trackedId = null;

  function send(payload) {
    payload.source = 'edith-preview';
    window.parent.postMessage(payload, '*');
  }

  function visibleRectOf(el) {
    var r = el.getBoundingClientRect();
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var top = Math.max(r.top, 0);
    var left = Math.max(r.left, 0);
    var right = Math.min(r.right, vw);
    var bottom = Math.min(r.bottom, vh);
    if (right <= left || bottom <= top) return null;
    return { top: top, left: left, width: right - left, height: bottom - top };
  }

  function reportTracked() {
    if (!trackedId) {
      send({ type: 'edith:rect', id: null, rect: null });
      return;
    }
    var el = document.querySelector('[' + ATTR + '="' + trackedId + '"]');
    send({ type: 'edith:rect', id: trackedId, rect: el ? visibleRectOf(el) : null });
  }

  // Native scroll events can fire far faster than once per frame — coalesce
  // bursts (inertial scrolling, resize drags) into at most one report per
  // animation frame instead of a postMessage + parent re-render on every tick.
  var scrollReportScheduled = false;
  function scheduleScrollReport() {
    if (scrollReportScheduled) return;
    scrollReportScheduled = true;
    requestAnimationFrame(function () {
      scrollReportScheduled = false;
      send({ type: 'edith:scroll', x: window.scrollX, y: window.scrollY });
      reportTracked();
    });
  }

  function isExternalHref(href) {
    if (!href) return false;
    return /^(https?:|mailto:|tel:)/i.test(href.trim());
  }

  document.addEventListener(
    'click',
    function (event) {
      var link = event.target && event.target.closest ? event.target.closest('a[href]') : null;
      if (link && !isExternalHref(link.getAttribute('href') || '')) {
        event.preventDefault();
      }

      var target = event.target && event.target.closest ? event.target.closest('[' + ATTR + ']') : null;
      if (!target) return;
      var classNames = typeof target.className === 'string'
        ? target.className.split(/\\s+/).filter(Boolean)
        : [];
      trackedId = target.getAttribute(ATTR);
      send({
        type: 'edith:element-click',
        id: trackedId,
        tagName: target.tagName.toLowerCase(),
        elementId: target.id || undefined,
        classNames: classNames,
        rect: visibleRectOf(target),
      });
    },
    true,
  );

  window.addEventListener(
    'error',
    function (event) {
      var el = event.target;
      if (el && el !== window && el.tagName) {
        send({
          type: 'edith:resource-error',
          tagName: el.tagName.toLowerCase(),
          src: el.src || el.href || '',
        });
        return;
      }
      send({ type: 'edith:error', message: event.message || String(event.error || 'Unknown error') });
    },
    true,
  );

  window.addEventListener('unhandledrejection', function (event) {
    send({ type: 'edith:error', message: 'Unhandled promise rejection: ' + String(event.reason) });
  });

  window.addEventListener('scroll', function () { scheduleScrollReport(); }, true);
  window.addEventListener('resize', function () { scheduleScrollReport(); });

  window.addEventListener('message', function (event) {
    var data = event.data;
    if (!data || data.source === 'edith-preview') return;
    if (data.type === 'edith:query-rect') {
      trackedId = data.id || null;
      var el = trackedId ? document.querySelector('[' + ATTR + '="' + trackedId + '"]') : null;
      if (el && data.scroll) {
        try {
          el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        } catch (err) {
          el.scrollIntoView(true);
        }
      }
      reportTracked();
    } else if (data.type === 'edith:clear-rect') {
      trackedId = null;
      send({ type: 'edith:rect', id: null, rect: null });
    } else if (data.type === 'edith:set-scroll') {
      window.scrollTo(data.x || 0, data.y || 0);
      reportTracked();
    } else if (data.type === 'edith:replace-css') {
      var files = data.files || [];
      for (var i = 0; i < files.length; i++) {
        var file = files[i];
        var style = document.querySelector('style[data-edith-src="' + file.path + '"]');
        if (style) style.textContent = file.content || '';
      }
      reportTracked();
    }
  });
})();`;
