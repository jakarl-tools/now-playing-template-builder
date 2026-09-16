/* Embedded verbatim into the standalone theme; no imports or dependencies. */
function npCreateMotionController(config, notify) {
  var root = document.getElementById('np-root');
  var composition = document.getElementById('np-composition');
  var phase = 'hidden';
  var generation = 0;
  var running = [];
  var pending = Promise.resolve(true);
  var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');

  function report(next) {
    phase = next;
    if (root) root.setAttribute('data-motion-state', next);
    if (notify) notify(next);
  }

  function cancelRunning() {
    running.forEach(function (entry) { entry.animation.cancel(); });
    running = [];
  }

  /*
   * Slide effects are reveals sized by the element itself, so no distance is
   * configured. Translating 100% of the element's own size while clipping the
   * very edge it travels from makes those two cancel: the clip edge stays put
   * in the page while the content emerges through it, growing as it arrives.
   */
  function revealClip(direction) {
    return direction === 'top' ? 'inset(100% 0% 0% 0%)'
      : direction === 'bottom' ? 'inset(0% 0% 100% 0%)'
      : direction === 'left' ? 'inset(0% 0% 0% 100%)'
      : 'inset(0% 100% 0% 0%)';
  }

  function revealShift(direction) {
    var x = direction === 'left' ? '-100%' : direction === 'right' ? '100%' : '0';
    var y = direction === 'top' ? '-100%' : direction === 'bottom' ? '100%' : '0';
    return 'translate3d(' + x + ',' + y + ',0)';
  }

  /*
   * The deck's own paint: the full-card background plus the drop shadow riding
   * on it. #np-composition carries np-panel only while that background is
   * switched on; with staging the background is a bare backdrop node instead.
   */
  function deckSurface(node) {
    return node.classList.contains('np-panel') ||
      node.hasAttribute('data-np-motion-backdrop');
  }

  /*
   * Both ends of an effect. Slide-only holds full opacity so the reveal alone
   * brings items in; every other effect also fades.
   *
   * `surface` marks the deck's own paint. A surface is never clip-revealed:
   * clip-path clips an element's painting, box-shadow included, and a shadow
   * lives outside the border box, so a reveal shows it in slices and then
   * snaps it on the instant the animation releases its fill. The deck travels
   * and fades as one solid piece instead, which also means it fades in
   * slide-only mode — travelling alone would leave it sitting on screen.
   *
   * Content items keep the clip reveal, which is sized by the element itself:
   * translating 100% of its own size while clipping the very edge it travels
   * from makes the two cancel, so content emerges through a clip edge that
   * stays put in the page.
   *
   * All surfaces share these frames. The staged backdrop is an empty sibling
   * of the content, so transforming it does not transform the content twice.
   */
  function motionFrames(settings, surface) {
    var effect = settings.effect;
    var visible = { opacity: 1, transform: 'none', filter: 'none', clipPath: 'none' };
    var hidden = {
      opacity: effect === 'slideOnly' && !surface ? 1 : 0,
      transform: 'none',
      filter: 'none',
      clipPath: 'none'
    };

    if (effect === 'slide' || effect === 'slideOnly') {
      if (!surface) {
        hidden.clipPath = revealClip(settings.direction);
        // clip-path only interpolates between matching shape functions.
        visible.clipPath = 'inset(0% 0% 0% 0%)';
      }
      hidden.transform = revealShift(settings.direction);
    } else if (effect === 'scale') {
      hidden.transform = 'scale(0.86)';
    } else if (effect === 'blur') {
      hidden.filter = 'blur(10px)';
      hidden.transform = 'scale(1.02)';
    } else if (effect === 'flip') {
      var axis = settings.direction === 'left' || settings.direction === 'right' ? 'Y' : 'X';
      var sign = settings.direction === 'left' || settings.direction === 'top' ? -1 : 1;
      hidden.transform = 'perspective(900px) rotate' + axis + '(' + sign * 70 + 'deg)';
    }

    return { hidden: hidden, visible: visible };
  }

  function visibleItems() {
    return Array.prototype.slice.call(root.querySelectorAll('[data-np-motion]')).filter(function (node) {
      return !node.classList.contains('np-hide') && node.getClientRects().length > 0;
    });
  }

  /*
   * Content that lives outside the card — the "above" NOW PLAYING title — is not
   * inside #np-composition, so whole-overlay motion has to reach it explicitly,
   * or it would sit still while the card moved and then pop into view. Staged
   * mode already finds it through visibleItems(); this closes the gap for "all
   * together". Nothing else renders outside the composition, so it stays inert.
   */
  function outsideItems() {
    return visibleItems().filter(function (node) {
      return !composition.contains(node);
    });
  }

  function transition(show, restart) {
    if (!root || !composition) return Promise.resolve(false);
    if (!restart && (show ? phase === 'visible' || phase === 'entering' : phase === 'hidden' || phase === 'exiting')) {
      return pending;
    }

    var settings = show ? config.entrance : config.exit;
    var staged = settings.sequence === 'staggered';
    var interruptedItems = running.some(function (entry) { return entry.node !== composition; });
    var perItem = staged || (!restart && interruptedItems);
    var nodes = perItem ? visibleItems() : [composition].concat(outsideItems());
    if (staged && !show) nodes.reverse();
    var entries = nodes.map(function (node, index) {
      return { node: node, delay: staged ? index * settings.stagger : 0, surface: deckSurface(node) };
    });
    var backdrop = perItem ? root.querySelector('[data-np-motion-backdrop]') : null;
    if (backdrop) {
      // Enter with the first item and leave with the last. Together mode moves
      // only the composition, which already includes this backdrop.
      entries.push({
        node: backdrop,
        delay: show || !staged ? 0 : Math.max(0, nodes.length - 1) * settings.stagger,
        surface: true
      });
    }

    var reveals = settings.effect === 'slide' || settings.effect === 'slideOnly';
    // Transfer an interrupted whole-overlay transform to individual items without a jump.
    var wholeInterrupted = !restart && running.some(function (entry) { return entry.node === composition; });
    var wholeStyle = wholeInterrupted ? window.getComputedStyle(composition) : null;
    var snapshots = entries.map(function (entry) {
      var surface = entry.surface;
      var interrupted = running.some(function (active) { return active.node === entry.node; });
      if (restart || (!interrupted && !wholeStyle)) return null;
      var style = interrupted ? window.getComputedStyle(entry.node) : wholeStyle;
      var clip = style.clipPath || style.webkitClipPath || 'none';
      return {
        opacity: style.opacity,
        transform: style.transform,
        filter: style.filter || 'none',
        // A surface keeps the deck's own clip-free paint. For content, a
        // resolved 'none' cannot interpolate against an inset target shape.
        clipPath: surface ? 'none' : clip === 'none' && reveals ? 'inset(0% 0% 0% 0%)' : clip
      };
    });

    var ticket = ++generation;
    cancelRunning();
    root.classList.remove('is-hidden');

    if (settings.effect === 'none' || (reducedMotion && reducedMotion.matches) || !composition.animate || !entries.length) {
      root.classList.toggle('is-hidden', !show);
      report(show ? 'visible' : 'hidden');
      pending = Promise.resolve(true);
      return pending;
    }

    report(show ? 'entering' : 'exiting');
    var waits = [];
    try {
      entries.forEach(function (entry, index) {
        var ends = motionFrames(settings, entry.surface);
        var from = snapshots[index] || (show ? ends.hidden : ends.visible);
        var to = show ? ends.visible : ends.hidden;
        var animation = entry.node.animate([from, to], {
          duration: settings.duration,
          delay: entry.delay,
          easing: show ? 'cubic-bezier(0.22, 1, 0.36, 1)' : 'cubic-bezier(0.4, 0, 1, 1)',
          fill: 'both'
        });
        running.push({ node: entry.node, animation: animation });
        // Cancellation is expected when the host sends show/hide or new tracks rapidly.
        waits.push(animation.finished.then(function () { return true; }, function () { return false; }));
      });
    } catch (error) {
      root.classList.toggle('is-hidden', !show);
      cancelRunning();
      report(show ? 'visible' : 'hidden');
      pending = Promise.resolve(true);
      return pending;
    }

    pending = Promise.all(waits).then(function () {
      if (ticket !== generation) return false;
      // Hide the root before releasing exit fill styles to prevent a final-frame flash.
      root.classList.toggle('is-hidden', !show);
      cancelRunning();
      report(show ? 'visible' : 'hidden');
      return true;
    });
    return pending;
  }

  return {
    show: function (restart) { return transition(true, !!restart); },
    hide: function () { return transition(false, false); },
    state: function () { return phase; },
    isHidden: function () { return phase === 'hidden'; },
    reset: function () {
      generation += 1;
      cancelRunning();
      if (root) root.classList.add('is-hidden');
      report('hidden');
      pending = Promise.resolve(true);
    }
  };
}