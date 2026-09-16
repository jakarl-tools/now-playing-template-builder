// Run with: node --test tests/spectrum.test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('../src/lib/overlaySpectrum.js', import.meta.url), 'utf8');

function fixture({ speed = 1, reducedMotion = false, missing = false } = {}) {
  const frames = new Map();
  const documentEvents = new Map();
  const windowEvents = new Map();
  const mediaEvents = new Map();
  const bars = Array.from({ length: 40 }, () => ({ style: {} }));
  let nextFrame = 0;
  const media = {
    matches: reducedMotion,
    addEventListener: (name, handler) => mediaEvents.set(name, handler),
    removeEventListener: (name) => mediaEvents.delete(name),
  };
  const document = {
    hidden: false,
    getElementById: () => missing ? null : { querySelectorAll: () => bars },
    addEventListener: (name, handler) => documentEvents.set(name, handler),
    removeEventListener: (name) => documentEvents.delete(name),
  };
  const window = {
    matchMedia: () => media,
    requestAnimationFrame(handler) {
      const id = ++nextFrame;
      frames.set(id, handler);
      return id;
    },
    cancelAnimationFrame: (id) => frames.delete(id),
    addEventListener: (name, handler) => windowEvents.set(name, handler),
    removeEventListener: (name) => windowEvents.delete(name),
  };
  const deterministicMath = Object.create(Math);
  deterministicMath.random = () => 0.5;
  const sandbox = vm.createContext({ document, window, Math: deterministicMath });
  vm.runInContext(source, sandbox);
  const controller = sandbox.npCreateSpectrum({ speed });
  return {
    controller, bars, frames, document, documentEvents, windowEvents, media, mediaEvents,
    step(time) {
      const current = [...frames.values()];
      frames.clear();
      current.forEach((handler) => handler(time));
    },
  };
}

const levels = (bars) => bars.map((bar) => Number(bar.style.transform.slice(7, -1)));

test('initial spectrum is static and only starts when the overlay becomes visible', () => {
  const f = fixture();
  assert.equal(f.frames.size, 0);
  assert.equal(f.bars.length, 40);
  assert.ok(levels(f.bars).every((level) => level >= 0.1 && level <= 1));
  f.controller.setVisible(true);
  assert.equal(f.frames.size, 1);
  f.step(0);
  const before = levels(f.bars);
  f.step(100);
  assert.notDeepEqual(levels(f.bars), before);
  assert.ok(levels(f.bars).every((level) => level >= 0.1 && level <= 1));
  assert.equal(f.frames.size, 1);
});

test('repeated show calls do not start duplicate animation loops', () => {
  const f = fixture();
  f.controller.setVisible(true);
  f.controller.setVisible(true);
  f.controller.setVisible(true);
  assert.equal(f.frames.size, 1);
  f.step(0);
  f.controller.setVisible(true);
  assert.equal(f.frames.size, 1);
});

test('hide freezes the spectrum and show resumes it without a time jump', () => {
  const f = fixture();
  f.controller.setVisible(true);
  f.step(0);
  f.step(100);
  const before = levels(f.bars);
  f.controller.setVisible(false);
  assert.equal(f.frames.size, 0);
  f.step(50000);
  assert.deepEqual(levels(f.bars), before);
  f.controller.setVisible(true);
  f.step(50100);
  assert.deepEqual(levels(f.bars), before, 'reset the frame timestamp after pausing');
});

test('document visibility pauses the loop independently of overlay visibility', () => {
  const f = fixture();
  f.controller.setVisible(true);
  f.document.hidden = true;
  f.documentEvents.get('visibilitychange')();
  assert.equal(f.frames.size, 0);
  f.document.hidden = false;
  f.documentEvents.get('visibilitychange')();
  assert.equal(f.frames.size, 1);
});

test('reduced motion shows a static spectrum and responds to preference changes', () => {
  const f = fixture({ reducedMotion: true });
  f.controller.setVisible(true);
  assert.equal(f.frames.size, 0);
  assert.ok(levels(f.bars).every((level) => Number.isFinite(level)));
  f.media.matches = false;
  f.mediaEvents.get('change')();
  assert.equal(f.frames.size, 1);
  f.media.matches = true;
  f.mediaEvents.get('change')();
  assert.equal(f.frames.size, 0);
});

test('speed controls the phase advance of the example sine function', () => {
  for (const speed of [0.5, 1, 2]) {
    const f = fixture({ speed });
    f.controller.setVisible(true);
    f.step(0);
    f.step(100);
    const phase = 100 * 0.004 * speed;
    const expected = 0.1 + Math.min(1, Math.abs(Math.sin(phase) * Math.cos(-phase * 0.5) + 0.15)) * 0.9;
    assert.equal(levels(f.bars)[0], Number(expected.toFixed(4)));
  }
});

test('page teardown cancels the animation frame and removes its listeners', () => {
  const f = fixture();
  f.controller.setVisible(true);
  f.windowEvents.get('pagehide')();
  assert.equal(f.frames.size, 0);
  assert.equal(f.documentEvents.size, 0);
  assert.equal(f.windowEvents.size, 0);
  assert.equal(f.mediaEvents.size, 0);
  f.controller.setVisible(true);
  assert.equal(f.frames.size, 0);
});

test('no spectrum node is a safe no-op', () => {
  const f = fixture({ missing: true });
  assert.doesNotThrow(() => {
    f.controller.setVisible(true);
    f.controller.setVisible(false);
    f.controller.destroy();
  });
  assert.equal(f.frames.size, 0);
});