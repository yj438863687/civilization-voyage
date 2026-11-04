import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(root, 'apps/web/package.json'));
const { chromium } = require(process.env.VOYAGE_PLAYWRIGHT_MODULE ?? 'playwright');
const browser = await chromium.launch({ headless: true, ...(process.env.VOYAGE_BROWSER_EXECUTABLE ? { executablePath: process.env.VOYAGE_BROWSER_EXECUTABLE } : {}) });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [], review = join(root, '.impeccable/review'); mkdirSync(review, { recursive: true });
page.on('pageerror', error => errors.push(error.message));
await page.addInitScript(() => {
  window.__soundProbe = { contexts: [], starts: [] };
  const Native = window.AudioContext;
  window.AudioContext = class extends Native {
    constructor(options) {
      super(options);
      const analyser = this.createAnalyser(); analyser.fftSize = 2048; analyser.connect(this.destination);
      window.__soundProbe.contexts.push({ context: this, analyser });
      const gain = this.createGain.bind(this);
      this.createGain = () => {
        const node = gain(), connect = node.connect.bind(node);
        node.connect = (...args) => args[0] === this.destination ? connect(analyser) : connect(...args);
        return node;
      };
      const oscillator = this.createOscillator.bind(this);
      this.createOscillator = () => {
        const node = oscillator(), start = node.start.bind(node), setFrequency = node.frequency.setValueAtTime.bind(node.frequency);
        let frequency = 440;
        node.frequency.setValueAtTime = (value, time) => { frequency = value; return setFrequency(value, time); };
        node.start = when => { window.__soundProbe.starts.push({ when, frequency, outputAt: performance.now() + (when - this.currentTime + this.baseLatency) * 1000 }); start(when); };
        return node;
      };
    }
  };
});
const base = (process.env.VOYAGE_TEST_URL ?? 'http://127.0.0.1:5175') + '/tests/history.html';
async function start(route, step = 0) { await page.goto(`${base}?route=${route}&step=${step}`); await page.getByRole('button', { name: /进入故事/ }).click(); }
async function cue(name) { await page.waitForFunction(name => document.querySelector('.challenge-feedback')?.getAttribute('data-cue') === name, name); }
try {
  await start('C-far');
  assert.equal(await page.evaluate(() => window.__soundProbe.contexts.length), 0, 'No audio context before a game gesture');
  await page.getByRole('button', { name: '短点 ·', exact: true }).click(); await cue('dot');
  await page.waitForFunction(() => document.querySelector('.telegraph-light').getAnimations()[0]?.startTime !== null);
  const timing = await page.evaluate(() => {
    const lamp = document.querySelector('.telegraph-light'), animation = lamp.getAnimations()[0];
    const sound = window.__soundProbe.starts.at(-1);
    return { sound: sound.outputAt, visual: animation.startTime + animation.effect.getTiming().delay, duration: animation.effect.getTiming().duration, frequency: sound.frequency };
  });
  assert.equal(timing.duration, 90); assert.equal(timing.frequency, 620);
  assert(Math.abs(timing.visual - timing.sound) < 80, `Audio/visual drift: ${timing.visual - timing.sound}ms`);
  await page.getByRole('button', { name: '长划 —', exact: true }).click(); await cue('dash');
  await page.waitForFunction(() => { const { analyser } = window.__soundProbe.contexts[0]; const data = new Float32Array(analyser.fftSize); analyser.getFloatTimeDomainData(data); return data.some(value => Math.abs(value) > .00001); }, null, { timeout: 1000, polling: 'raf' });
  assert.equal(await page.locator('.telegraph-light').evaluate(element => element.getAnimations()[0].effect.getTiming().duration), 270);
  assert.equal(await page.locator('.morse-tape').innerText(), '.-', 'Feedback must not remount or reset the game');
  assert(await page.getByRole('button', { name: '短点 ·', exact: true }).isDisabled(), 'A sounding Morse beat cannot overlap the next beat');
  await page.screenshot({ path: join(review, 'feedback-telegraph.png') });
  await page.getByRole('button', { name: '声音已开' }).click();
  const before = await page.evaluate(() => window.__soundProbe.starts.length);
  await page.getByRole('button', { name: '短点 ·', exact: true }).click(); await cue('dot');
  assert.equal(await page.evaluate(() => window.__soundProbe.starts.length), before, 'Mute must suppress actual audio nodes');
  assert.equal(await page.locator('.challenge-feedback').getAttribute('data-audio'), 'muted');
  await page.reload(); await page.getByRole('button', { name: /进入故事/ }).click(); assert(await page.getByRole('button', { name: '声音已关' }).isVisible());
  await page.getByRole('button', { name: '声音已关' }).click();
  await start('B-far');
  for (const name of ['加煤', '加煤', '带动机器']) await page.getByRole('button', { name, exact: true }).click();
  await cue('work'); assert((await page.locator('.engine-gauges').innerText()).includes('做功 2/8'));
  assert(await page.locator('.flywheel').evaluate(element => element.getAnimations().length > 0));
  await page.getByRole('button', { name: '泄压', exact: true }).click(); await cue('steam');
  assert(await page.locator('.steam-plume').evaluate(element => element.getAnimations().length > 0));
  await page.screenshot({ path: join(review, 'feedback-engine.png') });
  await page.getByRole('button', { name: '记录试机' }).click();
  assert(await page.locator('.challenge-trial').evaluate(element => document.activeElement === element));
  await page.getByRole('button', { name: '带着这个结果做决定' }).click();
  await page.waitForFunction(() => window.__soundProbe.contexts.every(({ context }) => context.state === 'closed'));
  await start('A-near');
  for (const [cell, count] of Object.entries({ 7: 1, 8: 1, 9: 1, 10: 1, 11: 1, 12: 3, 18: 1, 19: 1 })) for (let i = 0; i < count; i++) await page.getByRole('button', { name: new RegExp(`^渠段 ${Number(cell) + 1}，`) }).click();
  await page.getByRole('button', { name: '试放水', exact: true }).click(); await cue('water');
  assert.equal(await page.locator('.canal-grid .has-water').count(), 9); assert((await page.getByRole('status').innerText()).includes('2/2'));
  await page.screenshot({ path: join(review, 'feedback-water.png') });
  await page.setViewportSize({ width: 390, height: 844 }); await start('B-far');
  await page.getByRole('button', { name: '加煤', exact: true }).click(); await cue('coal');
  assert(await page.locator('.history-island').evaluate(element => element.scrollWidth <= element.clientWidth + 1));
  await page.screenshot({ path: join(review, 'feedback-mobile.png') });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: '加煤', exact: true }).click(); await cue('coal');
  assert.equal(await page.locator('.machine-flame').evaluate(element => element.getAnimations().length), 0);
  assert.deepEqual(errors, []);
  console.log(`通过：真实音频波形、短/长拍90/270ms、音画起点差${Math.round(Math.abs(timing.visual - timing.sound))}ms、连拍防重叠、静音持久化、离场停声、机件/水流、手机与减弱动态。`);
} finally { await browser.close(); }
