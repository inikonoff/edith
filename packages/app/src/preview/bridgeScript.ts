import { DATA_ATTR } from '@edith/mapper';

// Injected into every Preview document. Runs inside the sandboxed iframe and
// talks to the parent exclusively through postMessage (spec §17) — it never
// has a reference to anything in Edith's own window. Kept as plain ES5-ish
// JS text (not bundled/transpiled) since it's inlined into user srcdoc HTML
// as-is, outside our own build pipeline.
export const PREVIEW_BRIDGE_SCRIPT = `(function () {
  var ATTR = ${JSON.stringify(DATA_ATTR)};

  function send(payload) {
    payload.source = 'edith-preview';
    window.parent.postMessage(payload, '*');
  }

  function rectOf(el) {
    var r = el.getBoundingClientRect();
    return { top: r.top, left: r.left, width: r.width, height: r.height };
  }

  document.addEventListener(
    'click',
    function (event) {
      var target = event.target && event.target.closest ? event.target.closest('[' + ATTR + ']') : null;
      if (!target) return;
      var classNames = typeof target.className === 'string'
        ? target.className.split(/\\s+/).filter(Boolean)
        : [];
      send({
        type: 'edith:element-click',
        id: target.getAttribute(ATTR),
        tagName: target.tagName.toLowerCase(),
        elementId: target.id || undefined,
        classNames: classNames,
        rect: rectOf(target),
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

  window.addEventListener('message', function (event) {
    var data = event.data;
    if (!data || data.source === 'edith-preview' || data.type !== 'edith:query-rect') return;
    var el = document.querySelector('[' + ATTR + '="' + data.id + '"]');
    send({ type: 'edith:rect', id: data.id, rect: el ? rectOf(el) : null });
  });
})();`;
