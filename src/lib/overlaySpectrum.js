/* Decorative wave spectrum. Bars keep a fixed pitch and the count adapts to
 * the row width so the gap never stretches; the CSS seats the end bars on
 * the row edges, so the wave always spans the full width. The wave itself
 * is the sine + flutter approach in:
 * https://gist.github.com/karlp-svg/00fb9e16e2064a02e662aac72f69efff
 * This is not an audio analyser. Embedded only when the spectrum is enabled.
 */
function npCreateSpectrum(options) {
  var container = document.getElementById('np-spectrum');
  if (!container) return { setVisible: function () {}, destroy: function () {} };
  /* Fixed geometry: the pitch must match the CSS (.np-spectrum-bar 4px + gap 3px). */
  var BAR = 4, GAP = 3, PITCH = BAR + GAP;
  var MIN_BARS = 8, MAX_BARS = 200;
  var bars = [].slice.call(container.querySelectorAll('.np-spectrum-bar'));
  var speed = Number(options && options.speed);
  speed = isFinite(speed) && speed > 0 ? Math.max(0.5, Math.min(2, speed)) : 1;
  var reduced = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var visible = false;
  var destroyed = false;
  var frame = null;
  var previousTime = null;
  var phase = 0;

  function draw(flutter) {
    for (var i = 0; i < bars.length; i++) {
      var wave = Math.sin(i * 0.15 + phase) * Math.cos(i * 0.05 - phase * 0.5);
      var noise = flutter ? Math.random() * 0.3 : 0.15;
      var level = 0.1 + Math.min(1, Math.abs(wave + noise)) * 0.9;
      bars[i].style.transform = 'scaleY(' + level.toFixed(4) + ')';
    }
  }

  /* How many fixed-pitch bars fit the row right now. Unmeasurable layouts
   * keep the current count; the row's min-width bounds the smallest real one. */
  function targetCount() {
    var width = 0;
    try { width = container.clientWidth; } catch (error) { width = 0; }
    if (!isFinite(width) || width <= 0) return bars.length;
    var count = Math.floor((width + GAP) / PITCH);
    return Math.max(MIN_BARS, Math.min(MAX_BARS, count));
  }

  /* Add or remove bars so the row is filled edge-to-edge at the fixed pitch, then re-seat
   * the static levels so freshly added bars are never left unstyled. The wave
   * is index-based and the pitch is fixed, so existing bars keep their phase
   * across rebuilds and the pattern stays put while the row resizes. */
  function rebuild() {
    var count = targetCount();
    if (count === bars.length) return;
    while (bars.length > count) container.removeChild(bars.pop());
    while (bars.length < count) {
      var bar = document.createElement('span');
      bar.className = 'np-spectrum-bar';
      container.appendChild(bar);
      bars.push(bar);
    }
    draw(false);
  }

  var observer = null;
  if (window.ResizeObserver) {
    observer = new window.ResizeObserver(function () { rebuild(); });
    observer.observe(container);
  } else {
    window.addEventListener('resize', rebuild);
  }

  function canRun() {
    return visible && !destroyed && !document.hidden && !(reduced && reduced.matches);
  }

  function tick(time) {
    frame = null;
    if (!canRun()) { previousTime = null; return; }
    if (previousTime !== null) phase += Math.min(100, Math.max(0, time - previousTime)) * 0.004 * speed;
    previousTime = time;
    draw(true);
    frame = window.requestAnimationFrame(tick);
  }

  function sync() {
    if (canRun()) {
      if (frame === null) frame = window.requestAnimationFrame(tick);
    } else {
      if (frame !== null) window.cancelAnimationFrame(frame);
      frame = null;
      previousTime = null;
      if (reduced && reduced.matches) draw(false);
    }
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    sync();
    document.removeEventListener('visibilitychange', sync);
    window.removeEventListener('pagehide', destroy);
    if (reduced && reduced.removeEventListener) reduced.removeEventListener('change', sync);
    else if (reduced && reduced.removeListener) reduced.removeListener(sync);
    if (observer) observer.disconnect();
    else window.removeEventListener('resize', rebuild);
  }

  /* Match the real row width before the first paint; the observer keeps it
   * matched from then on. */
  rebuild();
  draw(false);
  document.addEventListener('visibilitychange', sync);
  window.addEventListener('pagehide', destroy);
  if (reduced && reduced.addEventListener) reduced.addEventListener('change', sync);
  else if (reduced && reduced.addListener) reduced.addListener(sync);

  return {
    setVisible: function (on) { visible = !!on; sync(); },
    destroy: destroy
  };
}