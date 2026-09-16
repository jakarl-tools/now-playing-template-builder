// Run with: node --test tests/theme-appearance.test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const project = fileURLToPath(new URL('../', import.meta.url));
const modules = new Map();

// Load the actual TS generator, including its Vite raw runtime import, in Node.
function loadModule(filename) {
  if (modules.has(filename)) return modules.get(filename).exports;
  const module = { exports: {} };
  modules.set(filename, module);
  const code = ts.transpileModule(readFileSync(filename, 'utf8'), {
    fileName: filename,
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
  }).outputText;
  vm.runInNewContext(code, {
    module,
    exports: module.exports,
    require(specifier) {
      const target = path.resolve(path.dirname(filename), specifier.replace(/\?raw$/, ''));
      if (specifier.endsWith('?raw')) return { default: readFileSync(target, 'utf8') };
      return loadModule(path.extname(target) ? target : target + '.ts');
    },
  }, { filename });
  return module.exports;
}

const { defaultState } = loadModule(path.join(project, 'src/data/presets.ts'));
const { bodyHtml, fullTemplateHtml, resolveCssVars, cssText } = loadModule(path.join(project, 'src/lib/makeTemplate.ts'));
const state = (patch = {}) => ({ ...structuredClone(defaultState), ...patch });

for (const position of ['left', 'right']) {
  test(`accent divider sits between ${position} artwork and text`, () => {
    const html = bodyHtml(state({ showArtwork: true, showArtworkDivider: true, artPosition: position }));
    assert.equal((html.match(/class="np-artwork-divider"/g) || []).length, 1);
    assert.ok(html.indexOf('class="np-dock') < html.indexOf('class="np-artwork-divider"'));
    assert.ok(html.indexOf('class="np-artwork-divider"') < html.indexOf('class="np-txt'));
    assert.match(html, /class="np-artwork-divider" data-np-motion/);
    if (position === 'right') assert.match(html, /class="np-row rev/);
    assert.match(cssText(), /\.np-artwork-divider\{[^}]*background:var\(--np-accent\)/);
  });
}

test('divider is omitted when disabled, without artwork, or in stacked layouts', () => {
  for (const patch of [
    { showArtworkDivider: false },
    { showArtworkDivider: true, showArtwork: false },
    { showArtworkDivider: true, artPosition: 'top' },
    { showArtworkDivider: true, artPosition: 'bottom' },
  ]) {
    assert.ok(!bodyHtml(state(patch)).includes('class="np-artwork-divider"'));
  }
});

for (const [shape, radius] of [['square', '0px'], ['rounded', '14px'], ['circle', '50%']]) {
  test(`artwork ${shape} clips to ${radius} in both presentations`, () => {
    for (const style of ['sleeve', 'vinyl']) {
      const options = state({ artworkShape: shape, artStyle: style });
      assert.equal(resolveCssVars(options)['--np-radii'], radius);
      assert.equal((bodyHtml(options).match(/id="artwork"/g) || []).length, 1);
    }
    assert.match(cssText(), /#cover,\.np-art\{[^}]*border-radius:var\(--np-radii,14px\)/);
    assert.match(cssText(), /\.np-sleeve\{[^}]*border-radius:var\(--np-radii,14px\)/);
  });

  test(`divider corners follow artwork ${shape}`, () => {
    const options = state({ artworkShape: shape });
    assert.equal(
      resolveCssVars(options)['--np-divider-radius'],
      shape === 'square' ? '0px' : '999px'
    );
  });
}

test('surface border and shadow colours use independent alpha and dimensions', () => {
  const configured = {
    borderEnabled: true, borderColor: '#336699', borderOpacity: 40, borderWidth: 3,
    shadowEnabled: true, shadowColor: '#123456', shadowOpacity: 25, shadowDistance: 12, shadowBlur: 28, shadowAngle: 45,
  };
  const fields = { card: 'cardEffects', title: 'titleBgEffects', artist: 'artistBgEffects' };
  for (const [surface, field] of Object.entries(fields)) {
    const vars = resolveCssVars(state({ [field]: configured, cardOpacity: 0, titleBgOpacity: 0, artistBgOpacity: 0 }));
    assert.equal(vars[`--np-${surface}-border`], '3px solid rgba(51,102,153,0.4)');
    // 45° → sin(45°)=cos(45°)≈0.7071, so 12px distance splits into 8.49/8.49.
    assert.equal(vars[`--np-${surface}-shadow`], '8.49px 8.49px 28px rgba(18,52,86,0.25)');
    const disabled = resolveCssVars(state({ [field]: { ...configured, borderEnabled: false, shadowEnabled: false } }));
    assert.equal(disabled[`--np-${surface}-border`], '0px solid transparent');
    assert.equal(disabled[`--np-${surface}-shadow`], 'none');
    const transparent = resolveCssVars(state({ [field]: { ...configured, borderOpacity: 0, shadowOpacity: 0 } }));
    assert.equal(transparent[`--np-${surface}-border`], '3px solid rgba(51,102,153,0)');
    assert.equal(transparent[`--np-${surface}-shadow`], '8.49px 8.49px 28px rgba(18,52,86,0)');
  }
});

test('shadow angle steers the offset; 0° is straight down, 90° is straight right', () => {
  const fields = { card: 'cardEffects', title: 'titleBgEffects', artist: 'artistBgEffects' };
  for (const [surface, field] of Object.entries(fields)) {
    const down = resolveCssVars(state({ [field]: { shadowEnabled: true, shadowColor: '#000000', shadowOpacity: 30, shadowDistance: 20, shadowBlur: 10, shadowAngle: 0 } }));
    assert.equal(down[`--np-${surface}-shadow`], '0px 20px 10px rgba(0,0,0,0.3)');
    const right = resolveCssVars(state({ [field]: { shadowEnabled: true, shadowColor: '#000000', shadowOpacity: 30, shadowDistance: 20, shadowBlur: 10, shadowAngle: 90 } }));
    assert.equal(right[`--np-${surface}-shadow`], '20px 0px 10px rgba(0,0,0,0.3)');
    const up = resolveCssVars(state({ [field]: { shadowEnabled: true, shadowColor: '#000000', shadowOpacity: 30, shadowDistance: 20, shadowBlur: 10, shadowAngle: 180 } }));
    assert.equal(up[`--np-${surface}-shadow`], '0px -20px 10px rgba(0,0,0,0.3)');
  }
});

test('old drafts fall back to the rounded artwork and a down-right default shadow', () => {
  const vars = resolveCssVars(state({ cardEffects: undefined, titleBgEffects: undefined, artistBgEffects: undefined, artworkShape: undefined }));
  // 45° at the card distance/opacity from the defaults → down & right.
  assert.equal(vars['--np-card-shadow'], '11.31px 11.31px 50px rgba(0,0,0,0.18)');
  assert.equal(vars['--np-title-shadow'], 'none');
  assert.equal(vars['--np-artist-shadow'], 'none');
  assert.equal(vars['--np-radii'], '14px');
});

test('star ratings retain their shared row and binding with or without chip padding', () => {
  for (const chip of [true, false]) {
    const html = bodyHtml(state({
      ratingStyle: 'stars',
      showArtwork: false,
      shownFields: { title: true, rating: true, bpm: true },
      fieldOrder: ['title', 'rating', 'bpm'],
      chipFields: { rating: chip, bpm: true },
    }));
    assert.equal((html.match(/id="np-rating"/g) || []).length, 1);
    assert.ok(html.includes(`class="np-rating${chip ? ' np-chip' : ''}"`));
    assert.ok(html.indexOf('class="np-inline"') < html.indexOf('id="np-rating"'));
    assert.match(html, /id="np-rating" data-np-motion role="img"/);
    assert.match(html, /<span class="np-stars" aria-hidden="true">/);
    assert.equal((html.match(/class="np-stars-base"/g) || []).length, 1);
    assert.equal((html.match(/class="np-stars-fill-inner"/g) || []).length, 1);
  }
});

test('numeric rating remains number-first in chip and text modes', () => {
  for (const chip of [true, false]) {
    const html = bodyHtml(state({ ratingStyle: 'numeric', shownFields: { rating: true }, fieldOrder: ['rating'], chipFields: { rating: chip } }));
    const item = html.slice(html.indexOf('id="np-rating"'));
    assert.ok(item.indexOf('data-np-text') < item.indexOf('<svg'));
  }
});

test('exported runtime fills fractional stars inside the inner strip and clears missing ratings', () => {
  const fill = { style: {} };
  const attributes = {};
  const classes = new Set();
  const rating = {
    querySelector: () => fill,
    classList: { toggle(name, on) { if (on) classes.add(name); else classes.delete(name); } },
    setAttribute(name, value) { attributes[name] = value; },
  };
  const html = fullTemplateHtml(state({ ratingStyle: 'stars' }));
  const script = html.match(/<script>\s*([\s\S]*?)<\/script>/)[1];
  const sandbox = vm.createContext({
    document: { getElementById: (id) => id === 'np-rating' ? rating : null },
    window: {},
  });
  vm.runInContext(script, sandbox);
  sandbox.npSetRating('np-rating', 4.5);
  assert.equal(fill.style.width, 'calc(4.5 * var(--np-star-size) + 4 * var(--np-star-gap))');
  assert.equal(attributes['aria-label'], 'Rated 4.5 out of 5');
  assert.ok(!classes.has('np-hide'));
  sandbox.npSetRating('np-rating', 0.5);
  assert.equal(fill.style.width, 'calc(0.5 * var(--np-star-size) + 0 * var(--np-star-gap))');
  sandbox.npSetRating('np-rating', undefined);
  assert.equal(fill.style.width, '0%');
  assert.ok(classes.has('np-hide'));
});

test('spectrum is off by default and the export contains no animation loop for it', () => {
  assert.equal(defaultState.showSpectrum, false);
  const html = fullTemplateHtml(state());
  assert.ok(!html.includes('id="np-spectrum"'));
  assert.ok(!html.includes('function npCreateSpectrum'));
});

test('the default animation slides in and the exit retraces that entrance', () => {
  const { animation } = defaultState;
  assert.equal(animation.entrance.effect, 'slideOnly');
  assert.equal(animation.exitMode, 'reverse');

  // "reverse" is resolved at build time, so the shipped theme carries a concrete
  // exit that mirrors the entrance and never mentions the mode itself.
  const html = fullTemplateHtml(state());
  const baked = JSON.parse(/var npMotionSettings = (\{.*?\});/.exec(html)[1]);
  assert.equal(baked.entrance.effect, 'slideOnly');
  assert.deepEqual(baked.exit, baked.entrance);
  assert.ok(!html.includes('exitMode'), 'the runtime never sees the reverse mode');

  // The stored custom exit survives for a switch back to "custom".
  assert.equal(animation.exit.effect, 'fade');
});

test('spectrum renders forty bars after the text with or without artwork', () => {
  for (const showArtwork of [true, false]) {
    for (const artStyle of ['sleeve', 'vinyl']) {
      const html = bodyHtml(state({ showSpectrum: true, showArtwork, artStyle }));
      assert.equal((html.match(/class="np-spectrum-bar"/g) || []).length, 40);
      assert.equal((html.match(/id="np-spectrum"/g) || []).length, 1);
      assert.match(html, /class="np-spectrum-row" data-np-motion aria-hidden="true"/);
      assert.ok(html.indexOf('id="np-spectrum"') > html.indexOf('id="np-key"'));
      if (showArtwork) assert.equal((html.match(/id="artwork"/g) || []).length, 1);
      if (showArtwork && artStyle === 'vinyl') assert.match(html, /id="np-vinyl"/);
    }
  }
});

test('spectrum gradient follows the accent colour and height setting', () => {
  const pink = resolveCssVars(state({ showSpectrum: true, accentColor: '#ff5c9b', spectrumHeight: 46 }));
  assert.equal(pink['--np-spectrum-low'], '#802e4e');
  assert.equal(pink['--np-spectrum-high'], '#ffa0c5');
  assert.equal(pink['--np-spectrum-height'], '46px');
  const cyan = resolveCssVars(state({ showSpectrum: true, accentColor: '#5ce1e6' }));
  assert.equal(cyan['--np-spectrum-low'], '#2e7173');
  assert.equal(cyan['--np-spectrum-high'], '#a0eef1');
  assert.match(cssText(), /linear-gradient\(to top,var\(--np-spectrum-low\),var\(--np-accent\) 55%,var\(--np-spectrum-high\)\)/);
});

test('spectrum style swaps baseline growth for a centred mirror', () => {
  assert.equal(defaultState.spectrumStyle, 'bottom');

  const bottom = bodyHtml(state({ showSpectrum: true, spectrumStyle: 'bottom' }));
  assert.match(bottom, /class="np-spectrum" id="np-spectrum"/);
  assert.ok(!bottom.includes('np-spectrum-center'));

  const centre = bodyHtml(state({ showSpectrum: true, spectrumStyle: 'center' }));
  assert.match(centre, /class="np-spectrum np-spectrum-center" id="np-spectrum"/);
  assert.equal((centre.match(/class="np-spectrum-bar"/g) || []).length, 40);

  // The style is presentation only: the shared runtime is untouched.
  const html = fullTemplateHtml(state({ showSpectrum: true, spectrumStyle: 'center', spectrumSpeed: 1.5 }));
  assert.match(html, /npCreateSpectrum\(\{ speed: 1.5 \}\)/);
  assert.equal((html.match(/function npCreateSpectrum/g) || []).length, 1);

  const css = cssText();
  assert.match(css, /\.np-spectrum\{[^}]*align-items:flex-end/);
  assert.match(css, /\.np-spectrum-bar\{[^}]*transform-origin:center bottom/);
  assert.match(css, /\.np-spectrum-center\{align-items:center\}/);
  assert.match(css, /\.np-spectrum-center \.np-spectrum-bar\{[^}]*transform-origin:center center/);
  // Mirrored gradient: highlighted tips, shaded at the axis.
  assert.match(css, /\.np-spectrum-center \.np-spectrum-bar\{[^}]*linear-gradient\(to top,var\(--np-spectrum-high\),var\(--np-accent\) 42%,var\(--np-spectrum-low\) 50%,var\(--np-accent\) 58%,var\(--np-spectrum-high\)\)/);
});

test('spectrum runtime is embedded for preview and export without extra script requests', () => {
  for (const mock of [true, false]) {
    const html = fullTemplateHtml(state({ showSpectrum: true, spectrumSpeed: 1.5 }), { mock });
    assert.match(html, /npCreateSpectrum\(\{ speed: 1.5 \}\)/);
    assert.match(html, /npSpectrum.setVisible\(phase !== 'hidden'\)/);
    assert.match(html, /npCreateMotionController\(npMotionSettings, npSpectrumMotionState\)/);
    assert.ok(!/<script\s+src=/.test(html));
    assert.equal(html.includes('onTrackUpdate({"id":"mock-1"'), mock);
  }
});

test('NOW PLAYING sits in the card or above it as its own title', () => {
  assert.equal(defaultState.livePlacement, 'nested');

  // Nested keeps the original shape: the indicator is the first line of the
  // card's text block, so the card's background and padding wrap it.
  const nested = bodyHtml(state({ showBar: true, livePlacement: 'nested' }));
  assert.match(nested, /class="np-live" data-np-motion/);
  assert.ok(!nested.includes('np-vec--above'));
  assert.ok(!nested.includes('np-live--above'));
  assert.ok(nested.indexOf('NOW PLAYING') > nested.indexOf('class="np-txt"'),
    'the indicator lives inside the text block');

  // Above lifts it out of the card: a sibling of #np-composition inside #np-root,
  // so the panel no longer contains it.
  const above = bodyHtml(state({ showBar: true, livePlacement: 'above' }));
  assert.match(above, /class="np-vec np-vec--above is-hidden" id="np-root"/);
  assert.match(above, /class="np-live np-live--above" data-np-motion/);
  assert.ok(above.indexOf('NOW PLAYING') < above.indexOf('id="np-composition"'),
    'the separate title is rendered before the card');
  assert.ok(above.indexOf('NOW PLAYING') < above.indexOf('class="np-txt"'),
    'and outside the card text block');
  assert.equal((above.match(/NOW PLAYING/g) || []).length, 1, 'rendered once, never duplicated');

  // Switching the bar off removes it in either placement.
  for (const livePlacement of ['nested', 'above']) {
    const off = bodyHtml(state({ showBar: false, livePlacement }));
    assert.ok(!off.includes('np-live'), `no indicator once the bar is off (${livePlacement})`);
    assert.ok(!off.includes('np-vec--above'), `no stacking once the bar is off (${livePlacement})`);
  }

  const css = cssText();
  // The root stacks in column mode; the alignment classes carry over to the
  // cross axis, where .ctr/.end express the same edge horizontally in row mode.
  assert.match(css, /\.np-vec\.np-vec--above\{flex-direction:column;justify-content:center;align-items:flex-start/);
  assert.match(css, /\.np-vec\.np-vec--above\.ctr\{align-items:center\}/);
  assert.match(css, /\.np-vec\.np-vec--above\.end\{align-items:flex-end\}/);
  // The root's gap supplies the spacing, so the in-card bottom margin is dropped.
  assert.match(css, /\.np-live--above\{margin-bottom:0\}/);

  const right = bodyHtml(state({ showBar: true, livePlacement: 'above', align: 'right' }));
  assert.match(right, /class="np-vec end np-vec--above is-hidden" id="np-root"/,
    'the stacked title follows the text alignment');
});