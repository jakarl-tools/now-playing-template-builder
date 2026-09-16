/* Decorative 40-bar wave driven by a sine + flutter model.
 * This is not an audio analyser. Embedded only when the spectrum is enabled.
 */
function npCreateSpectrum(options) {
  var container = document.getElementById('np-spectrum');
  if (!container) return { setVisible: function () {}, destroy: function () {} };
  var bars = container.querySelectorAll('.np-spectrum-bar');
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
  }

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