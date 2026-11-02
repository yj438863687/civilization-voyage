import test from 'node:test';
import assert from 'node:assert/strict';
import { DRAFT_KEY, newDraft } from '../model.js';
import { scenario, finished } from './helpers.mjs';

let sequence = 0;
async function boot(raw = null) {
  const listeners = {}, windowListeners = {}, nodes = new Map();
  class Node {
    constructor() { this.dataset = {}; this.open = false; this.hidden = false; this.innerHTML = ''; this.textContent = ''; }
    setAttribute() {} focus() {} append() {} remove() {} click() {}
    insertAdjacentHTML(where, text) { this.innerHTML += text; }
    replaceChildren() { this.innerHTML = ''; }
    querySelector() { return new Node(); }
    showModal() { this.open = true; }
    close() { this.open = false; }
  }
  const node = id => { if (!nodes.has(id)) nodes.set(id, new Node()); return nodes.get(id); };
  const storage = { raw, failWrite: false, failRemove: false,
    getItem(key) { assert.equal(key, DRAFT_KEY); return this.raw; },
    setItem(key, value) { assert.equal(key, DRAFT_KEY); if(this.failWrite) throw new Error('quota'); this.raw = value; },
    removeItem(key) { assert.equal(key, DRAFT_KEY); if(this.failRemove) throw new Error('denied'); this.raw = null; }
  };
  Object.assign(globalThis, {
    document: { querySelector: node, createElement: () => new Node(), body: new Node(), addEventListener: (name, fn) => {listeners[name] = fn;} },
    window: { addEventListener: (name, fn) => {windowListeners[name] = fn;}, scrollTo() {} },
    localStorage: storage, fetch: async () => ({ok: true, json: async () => structuredClone(scenario)}),
    HTMLInputElement: Node, location: {reload() {}}
  });
  await import(new URL(`../app.js?case=${++sequence}`, import.meta.url));
  await new Promise(resolve => setImmediate(resolve));
  return { storage, node, input(value) { listeners.input({target: {dataset: {field: 'goal'}, value}}); },
    click(id, action) { const button = new Node(); button.id = id; button.dataset.action = action; listeners.click({target: {closest: () => button}}); },
    external(raw) { storage.raw = raw; windowListeners.storage({key: DRAFT_KEY, newValue: raw}); }
  };
}

test('bad JSON recovery preserves the raw draft and confirmed reset creates a clean draft', async () => {
  const raw = '{broken'; const a = await boot(raw);
  assert.match(a.node('#main').innerHTML, /草稿不是完整的 JSON/);
  assert.equal(a.storage.raw, raw);
  a.click('reset'); a.click('cancel-reset'); assert.equal(a.storage.raw, raw);
  a.click('reset'); a.click('confirm-reset');
  assert.equal(a.storage.raw, null);
  assert.match(a.node('#main').innerHTML, /你的优先目标/);
});

test('wrong field and incompatible schema are surfaced without rewriting storage', async () => {
  for (const mutate of [d => { d.form.reason = []; }, d => {d.schemaVersion = 99;}]) {
    const d = newDraft(scenario); mutate(d); const raw = JSON.stringify(d); const a = await boot(raw);
    assert.match(a.node('#main').innerHTML, /这份草稿暂时无法恢复/);
    assert.equal(a.storage.raw, raw);
  }
});

test('null records show the actionable integrity error, not an internal JavaScript error', async () => {
  const d = finished(); d.planRecords[0] = null;
  const a = await boot(JSON.stringify(d));
  assert.match(a.node('#main').innerHTML, /草稿的数据或记录关联不完整/);
  assert.doesNotMatch(a.node('#main').innerHTML, /Cannot read properties/);
});

test('memory-only reset never deletes a newer draft written by another tab', async () => {
  const initial = JSON.stringify(newDraft(scenario)); const a = await boot(initial);
  a.storage.failWrite = true; a.input('本页未保存的修改。');
  assert.equal(a.node('#save-state').textContent, '仅本页暂存');
  const latest = newDraft(scenario); latest.goal = '另一页面已保存的新内容。';
  const latestRaw = JSON.stringify(latest); a.external(latestRaw);
  a.storage.failWrite = false; a.click('reset'); a.click('confirm-reset');
  assert.equal(a.storage.raw, latestRaw);
  assert.match(a.node('#main').innerHTML, /另一页面更新了交接簿/);
});

test('normal concurrent update locks the old tab before it can overwrite storage', async () => {
  const a = await boot(JSON.stringify(newDraft(scenario)));
  const latest = newDraft(scenario); latest.goal = '另一页面版本'; const latestRaw = JSON.stringify(latest);
  a.external(latestRaw); a.input('旧页修改');
  assert.equal(a.storage.raw, latestRaw);
  assert.match(a.node('#main').innerHTML, /另一页面更新了交接簿/);
});

test('a failed delete keeps the original data and explains the retry', async () => {
  const raw = '{broken'; const a = await boot(raw); a.storage.failRemove = true;
  a.click('reset'); a.click('confirm-reset');
  assert.equal(a.storage.raw, raw);
  assert.match(a.node('#storage-note').textContent, /未能清除本机草稿/);
});
