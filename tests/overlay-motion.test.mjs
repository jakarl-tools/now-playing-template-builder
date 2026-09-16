// Run with: node --test tests/overlay-motion.test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('../src/lib/overlayMotion.js', import.meta.url), 'utf8');

/*
 * The deck's own paint — the full-card background and the drop shadow riding on
 * it. It travels with the content, but it is never clip-revealed: a clip cuts
 * the element's box-shadow to its border box, and a shadow lives outside that
 * box, so a reveal would show the shadow in slices and then snap it on when the
 * fill was released.
 */
const travelsLike = (a, b) =>
  JSON.stringify(a.map((frame) => frame.transform)) === JSON.stringify(b.map((frame) => frame.transform));
const unclipped = (frames) => frames.every((frame) => frame.clipPath === 'none');
const fadesIn = (frames) => frames.map((frame) => frame.opacity).join() === '0,1';

function fixture({ staged = false, reduced = false, unsupported = false, effect = 'slide', direction = 'left', withBackdrop = true, panel = false, outside = false } = {}) {
  const calls = [];
  const phases = [];
  const node = (name) => {
    const classes = new Set();
    const attributes = new Set();
    /*
     * Returned as-is so `contains` always reads the node's *current*
     * descendants. The fixture nests the content by assigning
     * `composition.descendants = items`, so a closure over a private array
     * would keep seeing the empty original and report everything as outside.
     */
    const self = {
      name,
      descendants: [],
      /*
       * Mirrors Element.contains, which the runtime uses to tell content inside
       * the animated card from content outside it (the "above" NOW PLAYING
       * title rendered as a sibling of #np-composition).
       */
      contains(target) {
        return self.descendants.some((child) => child === target || child.contains(target));
      },
      classList: {
        add(value) { classes.add(value); },
        remove(value) { classes.delete(value); },
        contains(value) { return classes.has(value); },
        toggle(value, on) {
          if (on) classes.add(value);
          else classes.delete(value);
        },
      },
      setAttribute(name) { attributes.add(name); },
      hasAttribute(name) { return attributes.has(name); },
      getClientRects() { return classes.has('np-hide') ? [] : [{}]; },
      animate(keyframes, options) {
        let resolve;
        let reject;
        const finished = new Promise((yes, no) => { resolve = yes; reject = no; });
        const animation = {
          finished,
          finish() { resolve(); },
          cancel() { animation.cancelled = true; reject(new Error('cancelled')); },
          cancelled: false,
        };
        calls.push({ name, keyframes, options, animation });
        return animation;
      },
    };
    return self;
  };

  const root = node('root');
  const composition = node('composition');
  const backdrop = node('backdrop');
  const items = [node('artwork'), node('title'), node('optional'), node('bpm')];
  items[2].classList.add('np-hide');
  composition.descendants = items;
  // The "above the card" live row: a sibling of the composition, so outside it.
  const aboveLive = node('above-live');
  const rootChildren = outside ? items.concat([aboveLive]) : items;
  // Mirrors the generated markup: the backdrop only exists while the full-card
  // background is on, and the composition carries np-panel in that same case.
  backdrop.setAttribute('data-np-motion-backdrop', '');
  if (panel) composition.classList.add('np-panel');
  root.classList.add('is-hidden');
  root.querySelectorAll = () => rootChildren;
  root.querySelector = () => withBackdrop ? backdrop : null;
  if (unsupported) composition.animate = undefined;
  const settings = {
    entrance: { effect, direction, sequence: staged ? 'staggered' : 'together', duration: 400, stagger: 90 },
    exit: { effect, direction: 'right', sequence: staged ? 'staggered' : 'together', duration: 300, stagger: 60 },
  };
  const context = vm.createContext({
    document: { getElementById: (id) => id === 'np-root' ? root : composition },
    window: {
      matchMedia: () => ({ matches: reduced }),
      getComputedStyle: () => ({ opacity: '0.5', transform: 'translate3d(-24px,0px,0)', filter: 'none', clipPath: 'inset(0% 20% 0% 0%)' }),
    },
  });
  vm.runInContext(source, context);
  const controller = context.npCreateMotionController(settings, (phase) => phases.push(phase));
  return { controller, root, calls, phases, settings };
}

for (const [direction, transform, clip] of [
  ['left', 'translate3d(-100%,0,0)', 'inset(0% 0% 0% 100%)'],
  ['right', 'translate3d(100%,0,0)', 'inset(0% 100% 0% 0%)'],
  ['top', 'translate3d(0,-100%,0)', 'inset(100% 0% 0% 0%)'],
  ['bottom', 'translate3d(0,100%,0)', 'inset(0% 0% 100% 0%)'],
]) {
  test(`together entrance from ${direction}`, async () => {
    const f = fixture({ direction });
    const shown = f.controller.show();
    assert.equal(f.calls.length, 1);
    assert.equal(f.calls[0].name, 'composition');
    assert.equal(f.calls[0].keyframes[0].transform, transform);
    assert.equal(f.calls[0].keyframes[0].clipPath, clip, 'clips the edge it travels from');
    assert.equal(f.calls[0].keyframes[1].clipPath, 'inset(0% 0% 0% 0%)');
    assert.equal(f.calls[0].keyframes[0].opacity, 0);
    assert.equal(f.calls[0].options.fill, 'both');
    assert.equal(f.controller.state(), 'entering');
    f.calls[0].animation.finish();
    assert.equal(await shown, true);
    assert.equal(f.controller.state(), 'visible');
    assert.equal(f.root.classList.contains('is-hidden'), false);
    assert.equal(f.calls[0].animation.cancelled, true, 'completed fill effect is released');
  });
}

test('staging skips absent fields and exits in reverse order', async () => {
  const f = fixture({ staged: true });
  const shown = f.controller.show();
  assert.deepEqual(f.calls.map((call) => [call.name, call.options.delay]), [
    ['artwork', 0], ['title', 90], ['bpm', 180], ['backdrop', 0],
  ]);
  assert.deepEqual(f.calls[3].keyframes.map((frame) => frame.transform), f.calls[0].keyframes.map((frame) => frame.transform), 'background travels exactly like the content');
  assert.ok(unclipped(f.calls[3].keyframes), 'the deck is never clip-revealed, so its shadow is never sliced');
  assert.ok(fadesIn(f.calls[3].keyframes), 'hide the deck by fading it, since no clip can');
  f.calls.forEach((call) => call.animation.finish());
  await shown;

  const hidden = f.controller.hide();
  const exiting = f.calls.slice(4);
  assert.deepEqual(exiting.map((call) => [call.name, call.options.delay]), [
    ['bpm', 0], ['title', 60], ['artwork', 120], ['backdrop', 120],
  ]);
  assert.ok(travelsLike(exiting[3].keyframes, exiting[2].keyframes), 'background exits with the last item using the same direction');
  assert.equal(exiting[3].options.delay, exiting[2].options.delay, 'background leaves with the last item');
  exiting[0].animation.finish();
  await Promise.resolve();
  assert.equal(f.root.classList.contains('is-hidden'), false, 'keep the root visible until every exit completes');
  exiting.forEach((call) => call.animation.finish());
  await hidden;
  assert.equal(f.controller.state(), 'hidden');
  assert.equal(f.root.classList.contains('is-hidden'), true);
});

test('repeated show does not restart an active entrance', async () => {
  const f = fixture();
  const shown = f.controller.show();
  assert.equal(f.controller.show(), shown);
  assert.equal(f.calls.length, 1);
  f.calls[0].animation.finish();
  await shown;
  await f.controller.show();
  assert.equal(f.calls.length, 1);
});

test('rapid hide then show cannot leave a stale hidden state', async () => {
  const f = fixture();
  const first = f.controller.show();
  const hidden = f.controller.hide();
  const latest = f.controller.show();
  f.calls.at(-1).animation.finish();
  assert.equal(await first, false);
  assert.equal(await hidden, false);
  assert.equal(await latest, true);
  assert.equal(f.controller.state(), 'visible');
  assert.equal(f.root.classList.contains('is-hidden'), false);
});

test('entrance and exit can use different sequences', async () => {
  const f = fixture({ staged: true });
  f.settings.exit.sequence = 'together';
  const shown = f.controller.show();
  f.calls.forEach((call) => call.animation.finish());
  await shown;
  const hidden = f.controller.hide();
  assert.equal(f.calls.at(-1).name, 'composition');
  assert.equal(f.calls.at(-1).keyframes[1].transform, 'translate3d(100%,0,0)');
  f.calls.at(-1).animation.finish();
  await hidden;
  assert.equal(f.controller.state(), 'hidden');
});

test('fade does not translate items', async () => {
  const f = fixture({ effect: 'fade' });
  const shown = f.controller.show();
  assert.equal(f.calls[0].keyframes[0].transform, 'none');
  f.calls[0].animation.finish();
  await shown;
});

test('slide only travels without fading', async () => {
  const f = fixture({ effect: 'slideOnly', direction: 'bottom' });
  const shown = f.controller.show();
  const [hidden, visible] = f.calls[0].keyframes;
  assert.equal(hidden.opacity, 1, 'stays fully opaque while travelling');
  assert.equal(hidden.transform, 'translate3d(0,100%,0)');
  assert.equal(hidden.clipPath, 'inset(0% 0% 100% 0%)', 'reveal is sized by the element itself');
  assert.equal(visible.transform, 'none');
  f.calls[0].animation.finish();
  await shown;
});

test('scale and blur animate without a direction', async () => {
  const scaled = fixture({ effect: 'scale' });
  scaled.controller.show();
  assert.equal(scaled.calls[0].keyframes[0].transform, 'scale(0.86)');

  const blurred = fixture({ effect: 'blur' });
  blurred.controller.show();
  assert.equal(blurred.calls[0].keyframes[0].filter, 'blur(10px)');
  assert.equal(blurred.calls[0].keyframes[1].filter, 'none');
});

test('flip rotates about the axis implied by the direction', () => {
  const vertical = fixture({ effect: 'flip', direction: 'bottom' });
  vertical.controller.show();
  assert.match(vertical.calls[0].keyframes[0].transform, /rotateX\(70deg\)/);

  const horizontal = fixture({ effect: 'flip', direction: 'left' });
  horizontal.controller.show();
  assert.match(horizontal.calls[0].keyframes[0].transform, /rotateY\(-70deg\)/);
});

test('reverse-entrance exit retraces the entrance exactly', async () => {
  // The generator sets exit := entrance for "reverse" mode; the retrace comes
  // from the exit keyframes running visible→hidden, i.e. the entrance mirrored.
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  for (const [effect, direction] of [['slideOnly', 'bottom'], ['flip', 'top'], ['scale', 'left']]) {
    const f = fixture({ effect, direction });
    f.settings.exit = { ...f.settings.entrance };
    const shown = f.controller.show();
    const enter = f.calls[0].keyframes;
    f.calls[0].animation.finish();
    await shown;
    f.controller.hide();
    const exit = f.calls[1].keyframes;
    assert.ok(same(enter[0], exit[1]) && same(enter[1], exit[0]), `${effect} exit mirrors entrance`);
    assert.equal(f.calls[1].options.duration, f.settings.entrance.duration, `${effect} keeps timing`);
  }
  // Direction is a hidden *position*: a bottom entrance must sink back down,
  // not continue upward through the top.
  const f = fixture({ effect: 'slideOnly', direction: 'bottom' });
  f.settings.exit = { ...f.settings.entrance };
  const shown = f.controller.show();
  f.calls[0].animation.finish();
  await shown;
  f.controller.hide();
  assert.equal(f.calls[1].keyframes[1].transform, 'translate3d(0,100%,0)');
});

for (const effect of ['fade', 'slide', 'slideOnly', 'scale', 'blur', 'flip']) {
  for (const direction of ['left', 'right', 'top', 'bottom']) {
    test(`staged ${effect} ${direction}: background matches content in and out`, async () => {
      const f = fixture({ staged: true, effect, direction });
      f.settings.exit.direction = direction;
      const shown = f.controller.show();
      const incoming = f.calls.slice();
      const backgroundIn = incoming.find((call) => call.name === 'backdrop');
      const reveals = effect === 'slide' || effect === 'slideOnly';
      if (reveals) {
        assert.ok(travelsLike(backgroundIn.keyframes, incoming[0].keyframes), 'background travels with the content');
        assert.ok(unclipped(backgroundIn.keyframes), 'background carries no reveal mask');
      } else {
        assert.deepEqual(backgroundIn.keyframes, incoming[0].keyframes);
      }
      assert.equal(backgroundIn.options.duration, incoming[0].options.duration);
      assert.equal(backgroundIn.options.easing, incoming[0].options.easing);
      assert.equal(backgroundIn.options.delay, 0);
      assert.equal(incoming.filter((call) => call.name === 'backdrop').length, 1);
      assert.ok(!incoming.some((call) => call.name === 'composition'), 'do not transform the content parent during staging');
      incoming.forEach((call) => call.animation.finish());
      assert.equal(await shown, true);

      const hidden = f.controller.hide();
      const outgoing = f.calls.slice(incoming.length);
      const backgroundOut = outgoing.find((call) => call.name === 'backdrop');
      const lastItem = outgoing.filter((call) => call.name !== 'backdrop').at(-1);
      assert.ok(travelsLike(backgroundOut.keyframes, lastItem.keyframes), 'background travels with the last item');
      if (reveals) assert.ok(unclipped(backgroundOut.keyframes), 'background leaves without a reveal mask');
      else assert.deepEqual(backgroundOut.keyframes, lastItem.keyframes);
      assert.equal(backgroundOut.options.duration, lastItem.options.duration);
      assert.equal(backgroundOut.options.easing, lastItem.options.easing);
      assert.equal(backgroundOut.options.delay, lastItem.options.delay);
      if (effect === 'slideOnly') {
        assert.ok(
          incoming.filter((call) => call.name !== 'backdrop').every((call) => call.keyframes.every((frame) => frame.opacity === 1)),
          'slide only must not fade the content',
        );
        assert.ok(fadesIn(backgroundIn.keyframes), 'with no clip to hide it, the deck fades instead of travelling alone');
      }
      outgoing.forEach((call) => call.animation.finish());
      assert.equal(await hidden, true);
      assert.ok(f.calls.every((call) => call.animation.cancelled), 'release all background and content fill styles');
    });
  }
}

test('all-together background is animated once through the composition', async () => {
  const f = fixture({ effect: 'slideOnly', direction: 'bottom' });
  const shown = f.controller.show();
  assert.deepEqual(f.calls.map((call) => call.name), ['composition']);
  f.calls[0].animation.finish();
  await shown;
  const hidden = f.controller.hide();
  assert.deepEqual(f.calls.map((call) => call.name), ['composition', 'composition']);
  f.calls[1].animation.finish();
  await hidden;
});

test('the deck never clip-reveals, so its drop shadow cannot be sliced or pop', async () => {
  // clip-path clips an element's painting, box-shadow included, and a shadow
  // lives outside the border box. A reveal would show the shadow in slices and
  // snap it on the moment the animation released its fill.
  const staged = fixture({ staged: true, effect: 'slide', direction: 'bottom' });
  const shown = staged.controller.show();
  const deck = staged.calls.find((call) => call.name === 'backdrop');
  assert.ok(unclipped(deck.keyframes), 'staged backdrop keeps its shadow whole');
  // Compared as JSON: the frames were built inside the vm realm, so their
  // Object.prototype is not this realm's.
  assert.equal(
    JSON.stringify(deck.keyframes[1]),
    JSON.stringify({ opacity: 1, transform: 'none', filter: 'none', clipPath: 'none' }),
    "the resting frame equals the deck's own style, so releasing the fill cannot pop the shadow",
  );
  assert.equal(deck.keyframes[0].transform, 'translate3d(0,100%,0)', 'the deck still travels per the direction');
  staged.calls.forEach((call) => call.animation.finish());
  await shown;

  const count = staged.calls.length;
  const hidden = staged.controller.hide();
  const leaving = staged.calls.slice(count);
  assert.deepEqual(leaving.map((call) => call.name), ['bpm', 'title', 'artwork', 'backdrop']);
  const deckOut = leaving.find((call) => call.name === 'backdrop');
  assert.ok(unclipped(deckOut.keyframes), 'the deck leaves with its shadow intact');
  leaving.forEach((call) => call.animation.finish());
  await hidden;

  // With the full-card background on, the composition *is* the deck (np-panel),
  // so the whole card travels as one unclipped piece: content, background and
  // shadow all arrive together.
  const deckLike = fixture({ effect: 'slide', direction: 'bottom', panel: true });
  const shownTogether = deckLike.controller.show();
  assert.deepEqual(deckLike.calls.map((call) => call.name), ['composition']);
  assert.ok(unclipped(deckLike.calls[0].keyframes), 'the full card keeps its shadow whole');
  deckLike.calls[0].animation.finish();
  await shownTogether;

  // Without it the composition is bare content, so the reveal still applies.
  const bare = fixture({ effect: 'slide', direction: 'bottom' });
  const shownBare = bare.controller.show();
  assert.equal(bare.calls[0].keyframes[0].clipPath, 'inset(0% 0% 100% 0%)', 'content still emerges through a clip edge');
  assert.equal(bare.calls[0].keyframes[1].clipPath, 'inset(0% 0% 0% 0%)');
  bare.calls[0].animation.finish();
  await shownBare;
});

test('staged reverse-entrance mirrors the background as well as the items', async () => {
  const f = fixture({ staged: true, effect: 'slideOnly', direction: 'bottom' });
  f.settings.exit = { ...f.settings.entrance };
  const shown = f.controller.show();
  const backgroundIn = f.calls.find((call) => call.name === 'backdrop');
  const count = f.calls.length;
  f.calls.forEach((call) => call.animation.finish());
  await shown;
  const hidden = f.controller.hide();
  const outgoing = f.calls.slice(count);
  const backgroundOut = outgoing.find((call) => call.name === 'backdrop');
  assert.equal(
    JSON.stringify(backgroundOut.keyframes),
    JSON.stringify([...backgroundIn.keyframes].reverse()),
  );
  assert.equal(backgroundOut.options.duration, backgroundIn.options.duration);
  assert.equal(backgroundOut.options.delay, 2 * f.settings.entrance.stagger);
  outgoing.forEach((call) => call.animation.finish());
  await hidden;
});

test('rapid staged hide/show cancels obsolete background effects', async () => {
  const f = fixture({ staged: true, effect: 'slideOnly', direction: 'bottom' });
  const first = f.controller.show();
  const hidden = f.controller.hide();
  const count = f.calls.length;
  const latest = f.controller.show();
  f.calls.slice(count).forEach((call) => call.animation.finish());
  assert.equal(await first, false);
  assert.equal(await hidden, false);
  assert.equal(await latest, true);
  assert.equal(f.controller.state(), 'visible');
  assert.ok(f.calls.every((call) => call.animation.cancelled));
});

test('staging still works with the full-card background switched off', async () => {
  const f = fixture({ staged: true, withBackdrop: false });
  const shown = f.controller.show();
  assert.deepEqual(f.calls.map((call) => call.name), ['artwork', 'title', 'bpm']);
  f.calls.forEach((call) => call.animation.finish());
  await shown;
  assert.equal(f.controller.state(), 'visible');
});

for (const options of [{ effect: 'none' }, { reduced: true }, { unsupported: true }]) {
  test(`instant visibility when ${JSON.stringify(options)}`, async () => {
    const f = fixture(options);
    await f.controller.show();
    assert.equal(f.controller.state(), 'visible');
    await f.controller.hide();
    assert.equal(f.controller.state(), 'hidden');
    assert.equal(f.calls.length, 0);
  });
}

test('reset cancels unfinished effects and leaves a clean hidden overlay', async () => {
  const f = fixture({ staged: true });
  const shown = f.controller.show();
  f.controller.reset();
  assert.equal(await shown, false);
  assert.equal(f.controller.state(), 'hidden');
  assert.ok(f.calls.every((call) => call.animation.cancelled));
});

test('the separate above-card title animates with the card, never left to pop', async () => {
  // The "above" NOW PLAYING title is a sibling of #np-composition, so in
  // "all together" mode a transform on the composition alone would miss it: it
  // would sit still while the card moved, then pop in when the fill released.
  const f = fixture({ effect: 'slideOnly', direction: 'left', outside: true });
  const shown = f.controller.show();
  assert.deepEqual(f.calls.map((call) => call.name), ['composition', 'above-live'],
    'the outside title is animated alongside the card');
  assert.deepEqual(f.calls[1].keyframes, f.calls[0].keyframes,
    'it travels and reveals exactly like the card, so nothing pops');
  assert.equal(f.calls[1].options.duration, f.calls[0].options.duration);
  assert.equal(f.calls[1].options.delay, f.calls[0].options.delay);
  f.calls.forEach((call) => call.animation.finish());
  await shown;

  const hidden = f.controller.hide();
  const exiting = f.calls.slice(2);
  assert.deepEqual(exiting.map((call) => call.name), ['composition', 'above-live'],
    'and it leaves with the card too');
  assert.deepEqual(exiting[1].keyframes, exiting[0].keyframes);
  exiting.forEach((call) => call.animation.finish());
  await hidden;
  assert.equal(f.controller.state(), 'hidden');
});

test('a title nested in the card adds nothing to the animation', async () => {
  // The default placement keeps the indicator inside the composition, so it is
  // carried by the card's own animation and must not be animated twice.
  const f = fixture({ effect: 'slideOnly', direction: 'left' });
  const shown = f.controller.show();
  assert.deepEqual(f.calls.map((call) => call.name), ['composition']);
  f.calls[0].animation.finish();
  await shown;
});