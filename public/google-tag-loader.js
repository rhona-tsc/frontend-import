/* Consent defaults and gtag's event queue are established in index.html.
 * Usercentrics owns consent updates; this loader never grants permission.
 * Keep both existing destinations and all queued events, without making the
 * Google download compete with the first opportunity to paint public content.
 */
(function () {
  var scheduled = false;
  var loaded = false;
  function loadGoogle() {
    if (loaded) return;
    loaded = true;
    if (document.getElementById('google-tag-script')) return;
    var script = document.createElement('script');
    script.id = 'google-tag-script';
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=AW-17648722186';
    document.head.appendChild(script);
  }
  function afterPaint() {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        if (window.requestIdleCallback) {
          window.requestIdleCallback(loadGoogle, { timeout: 1500 });
        } else {
          window.setTimeout(loadGoogle, 0);
        }
      });
    });
  }
  if (document.readyState === 'complete') afterPaint();
  else window.addEventListener('load', afterPaint, { once: true });
  // A stalled image or widget must not hold the event queue indefinitely.
  window.setTimeout(afterPaint, 4000);
}());
