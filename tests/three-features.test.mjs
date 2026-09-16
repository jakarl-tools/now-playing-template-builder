import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import test from 'node:test';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const project = fileURLToPath(new URL('../', import.meta.url));
const modules = new Map();

function loadModule(filename) {
  if (modules.has(filename)) return modules.get(filename).exports;
  const module = { exports: {} };
  modules.set(filename, module);
  const code = ts.transpileModule(readFileSync(filename, 'utf8'), {
    fileName: filename,
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
  }).outputText;
  vm.runInNewContext(code, {
    module, exports: module.exports,
    require(specifier) {
      const target = path.resolve(path.dirname(filename), specifier.replace(/\?raw$/, ''));
      if (specifier.endsWith('?raw')) return { default: readFileSync(target, 'utf8') };
      return loadModule(path.extname(target) ? target : target + '.ts');
    },
  }, { filename });
  return module.exports;
}

const { defaultState } = loadModule(path.join(project, 'src/data/presets.ts'));
const { bodyHtml, fullTemplateHtml } = loadModule(path.join(project, 'src/lib/makeTemplate.ts'));
const state = (patch = {}) => ({ ...structuredClone(defaultState), ...patch });

test('combined title+artist, previous track and border pulse are wired end to end', () => {
  const base = state({
    showCardBackground: true, cardPulse: true,
    combineTitleArtist: true, showPrevious: true,
    shownFields: { title: true, artist: true, label: true, bpm: true, key: true },
    fieldOrder: ['title', 'artist', 'label', 'bpm', 'key'],
  });

  const html = bodyHtml(base);
  assert.ok(html.includes('id="np-combined"'), 'combined wrapper when adjacent');
  assert.ok(html.includes('np-combined-sep'));
  assert.ok(html.includes('id="np-prev"'));
  assert.ok(html.includes('np-panel np-pulse'));

  const nonAdjacent = bodyHtml(state({ ...base, fieldOrder: ['title', 'label', 'artist'] }));
  assert.ok(!nonAdjacent.includes('np-combined'), 'no combine when not adjacent');

  const off = bodyHtml(state({ combineTitleArtist: false, showPrevious: false, cardPulse: false }));
  assert.ok(!off.includes('np-combined') && !off.includes('np-prev') && !off.includes('np-pulse'));

  const full = fullTemplateHtml(base, { mock: true });
  assert.ok(full.includes('function npSyncCombined'));
  assert.ok(full.includes('function npSyncPrevious'));
  assert.ok(full.includes('npPreviousTrack = npRenderedTrack'));
  assert.ok(full.includes('@keyframes np-pulse-spin'));
  assert.ok(full.includes('@property --np-pulse-angle'));
  assert.ok(full.includes('Aurora Lane'));
});

test('pulse direction toggles the sweep', () => {
  const cw = bodyHtml(state({ showCardBackground: true, cardPulse: true, cardPulseDirection: 'cw' }));
  assert.ok(cw.includes('np-panel np-pulse"') || cw.includes('np-panel np-pulse '));
  assert.ok(!cw.includes('np-pulse--ccw'));
  const ccw = bodyHtml(state({ showCardBackground: true, cardPulse: true, cardPulseDirection: 'ccw' }));
  assert.ok(ccw.includes('np-pulse--ccw'));
  assert.ok(fullTemplateHtml(state({ cardPulse: true, cardPulseDirection: 'ccw', showCardBackground: true }))
    .includes('.np-panel.np-pulse--ccw::before{animation-direction:reverse}'));
});

test('combined line unifies artist type and drops the accent dash', () => {
  const html = bodyHtml(state({
    combineTitleArtist: true, artistDash: true,
    shownFields: { title: true, artist: true },
    fieldOrder: ['title', 'artist'],
  }));
  assert.ok(html.includes('np-artist-row is-combined'), 'artist flagged combined');
  assert.ok(!/np-artist-row[^>]*>\s*<span class="np-mark"/.test(html), 'no accent dash in combined line');

  // standalone artist keeps the dash
  const solo = bodyHtml(state({ combineTitleArtist: false, artistDash: true, shownFields: { artist: true }, fieldOrder: ['artist'] }));
  assert.ok(solo.includes('class="np-mark"'), 'dash retained outside combined line');

  // artist style is driven by CSS variables
  const upper = fullTemplateHtml(state({ artistVariant: 'uppercase' }));
  assert.ok(upper.includes('--np-artist-case: uppercase'));
  assert.ok(upper.includes('--np-artist-spacing: .12em'));
  const italic = fullTemplateHtml(state({ artistVariant: 'italic' }));
  assert.ok(italic.includes('--np-artist-style: italic'));
  const combinedCss = fullTemplateHtml(state({ combineTitleArtist: true }));
  assert.ok(combinedCss.includes('.np-combined .np-artist-row h2{font-size:var(--np-title,44px);font-weight:900'));
});

test('previous track mirrors the current title/artist order', () => {
  const tuneHtml = (html) => {
    const start = html.indexOf('id="np-prev-tune"');
    return html.slice(start, start + 240);
  };

  // title leads the card → previous reads "Title — Artist"
  const titleFirst = tuneHtml(bodyHtml(state({
    showPrevious: true,
    shownFields: { title: true, artist: true },
    fieldOrder: ['title', 'artist'],
  })));
  assert.ok(titleFirst.indexOf('data-np-prev-title') < titleFirst.indexOf('data-np-prev-artist'),
    'title side sits first when title leads the card');
  assert.ok(titleFirst.indexOf('np-prev-sep') > titleFirst.indexOf('data-np-prev-title'),
    'separator sits after the first side');
  assert.ok(titleFirst.indexOf('np-prev-sep') < titleFirst.indexOf('data-np-prev-artist'),
    'separator sits before the second side');

  // artist leads the card → previous reads "Artist — Title"
  const artistFirst = tuneHtml(bodyHtml(state({
    showPrevious: true,
    shownFields: { title: true, artist: true },
    fieldOrder: ['artist', 'title'],
  })));
  assert.ok(artistFirst.indexOf('data-np-prev-artist') < artistFirst.indexOf('data-np-prev-title'),
    'artist side sits first when artist leads the card');

  // non-adjacent arrangement still mirrors the arranged relative order
  const separated = tuneHtml(bodyHtml(state({
    showPrevious: true,
    shownFields: { title: true, artist: true },
    fieldOrder: ['title', 'label', 'artist'],
  })));
  assert.ok(separated.indexOf('data-np-prev-title') < separated.indexOf('data-np-prev-artist'),
    'title still leads the previous line when it leads a separated card');
});

test('the element carrying the drop shadow is the one the runtime never clip-reveals', () => {
  // The runtime skips the slide reveal for any node marked np-panel or
  // data-np-motion-backdrop, because clip-path would cut the box-shadow to the
  // card's border box — the shadow would slide in in slices and snap on when
  // the fill was released. The markup and the shipped runtime must agree.
  const on = state({ showCardBackground: true });
  const html = bodyHtml(on);
  assert.ok(html.includes('<div class="np-panel-backdrop" data-np-motion-backdrop'), 'the backdrop paints the card');
  assert.ok(/class="[^"]*np-panel[^"]*" id="np-composition"/.test(html),
    'the composition holding that backdrop is marked np-panel');

  const css = fullTemplateHtml(on);
  assert.ok(/\.np-panel-backdrop\{[^}]*box-shadow:var\(--np-card-shadow/.test(css),
    'the drop shadow rides on the backdrop element');
  const rule = css.slice(css.indexOf('function deckSurface'), css.indexOf('function deckSurface') + 240);
  assert.ok(rule.includes("classList.contains('np-panel')"), 'runtime recognises the painted composition');
  assert.ok(rule.includes("hasAttribute('data-np-motion-backdrop')"), 'runtime recognises the staged backdrop');

  const off = bodyHtml(state({ showCardBackground: false }));
  assert.ok(!off.includes('data-np-motion-backdrop'), 'no backdrop once the full-card background is off');
  assert.ok(!/class="[^"]*np-panel[^"]*" id="np-composition"/.test(off), 'bare content keeps the clip reveal');
});
