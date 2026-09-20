import { DATA_ATTR } from '@edith/mapper';

// Injected into every Preview document. Runs inside the sandboxed iframe and
// talks to the parent exclusively through postMessage (spec §17).
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

  document.addEventListener(
    'click',
    function (event) {
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

  window.addEventListener('scroll', function () { reportTracked(); }, true);
  window.addEventListener('resize', function () { reportTracked(); });

  window.addEventListener('message', function (event) {
    var data = event.data;
    if (!data || data.source === 'edith-preview') return;
    if (data.type === 'edith:query-rect') {
      trackedId = data.id || null;
      reportTracked();
    } else if (data.type === 'edith:clear-rect') {
      trackedId = null;
      send({ type: 'edith:rect', id: null, rect: null });
    }
  });
})();`;
