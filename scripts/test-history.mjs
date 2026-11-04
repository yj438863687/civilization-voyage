import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const requireWeb = createRequire(join(root, 'apps/web/package.json'));
const { build } = requireWeb('esbuild');
const temp = mkdtempSync(join(tmpdir(), 'voyage-history-'));
const outfile = join(temp, 'history.cjs');
await build({ absWorkingDir: join(root, 'apps/web'), stdin: { contents: ['history', 'encounters', 'stories', 'world.config', 'progression'].map(name => `export * from './src/world/${name}';`).join('\n'), resolveDir: join(root, 'apps/web') }, outfile, bundle: true, platform: 'node', format: 'cjs', logLevel: 'silent' });
const require = createRequire(import.meta.url);
const game = require(outfile);
const media = JSON.parse(readFileSync(join(root, 'apps/web/src/world/historyMedia.json'), 'utf8'));
const memory = new Map();
global.localStorage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value) };
assert.equal(Object.keys(game.HISTORY_ROUTES).length, 8);
for (const [id, route] of Object.entries(game.HISTORY_ROUTES)) {
  const [era, lane] = id.split('-');
  const moments = [...route.islands, route.crisis];
  assert.equal(route.region, lane === 'near' ? '中国' : '世界');
  assert(moments.every((scene, index) => !index || scene.order >= moments[index - 1].order), `${id}: 年代不能倒流`);
  assert(route.ending.order >= route.crisis.order, `${id}: 终点不能在事件之前`);
  assert.equal(game.storyFor(era, lane).figure.name, route.ending.name);
  const world = game.worldFor(era);
  assert.equal(world.lanes.find(item => item.id === lane).name, lane === 'near' ? '内海 · 中国' : '外海 · 世界');
  for (const scene of moments) {
    assert(scene.paragraphs.length >= 2);
    assert(media[scene.image], `${scene.id}: 没有图片资料`);
    assert(existsSync(join(root, 'apps/web/public', media[scene.image].src)), `${scene.id}: 缺失本地图片`);
    assert(media[scene.image].license);
    assert(scene.source.url.startsWith('https://'));
    assert.equal(scene.options.length, 2);
    if (route.islands.includes(scene)) {
      assert.equal(game.encounterFor(scene.id).history, scene);
      assert.equal(world.fragments.find(item => item.id === scene.id).title, scene.title);
    }
  }
  const first = moments[0], second = moments[1];
  const firstOut = game.historyOutcome(first, 1, {});
  const secondOut = game.historyOutcome(second, 1, firstOut.set);
  assert.equal(secondOut.supply, second.options[1].supply + 3, `${id}: 前站合作应改变后站结算`);
  assert.equal(game.historyOutcome(second, 1, {}).supply, second.options[1].supply);
  assert(game.previousDecision(second, firstOut.set).includes(first.options[1].label));
  const state = { ...firstOut.set, ...secondOut.set, ...game.historyOutcome(route.crisis, 0, {}).set };
  const recap = game.routeRecap(route, state).join(' ');
  assert(recap.includes(first.options[1].text) && recap.includes(second.options[1].text) && recap.includes(route.crisis.options[0].text));
}
const dispatch = game.HISTORY_ROUTES['C-far'].islands[0];
const mixed = game.historyOutcome(dispatch, 1, {}, [0, 2]);
assert(mixed.text.includes(dispatch.items[0]) && mixed.text.includes(dispatch.items[2]));
assert(!mixed.text.includes('两封急用电报'));
assert.equal(mixed.trust, 2);
assert.equal(game.cooperationBonus(dispatch, {}), 0);
assert.equal(game.cooperationBonus(game.HISTORY_ROUTES['C-far'].islands[1], { 'history:C-relay': 'care' }), 3);
assert(game.routeRecap(game.HISTORY_ROUTES['C-far'], mixed.set).join(' ').includes(mixed.text));
const fresh = game.freshStats();
assert.equal(fresh.shipLevel, 0);
assert.equal(fresh.crewLevel, 0);
const upgraded = game.upgradeShip(fresh);
assert.equal(upgraded.shipLevel, 1);
assert.equal(upgraded.supply, 62);
assert.equal(fresh.supply, 80, '升级不能原地修改旧状态');
assert.equal(game.upgradeShip({ ...fresh, supply: 32 }).shipLevel, 0, '必须留足 15 份口粮');
assert.equal(game.upgradeShip({ ...fresh, supply: 33 }).shipLevel, 1);
assert.equal(game.upgradeCrew(fresh), fresh, '人心不够不能换装');
assert.equal(game.upgradeCrew({ ...fresh, trust: 55 }).crewLevel, 1);
assert.equal(game.upgradeCrew({ ...fresh, trust: 55 }).trust, 55, '换装不消耗信任');
const applied = game.applyOutcome({ ...upgraded, crewLevel: 2 }, { supply: -4, trust: 3, text: 'test' }, 'test', 'A', 'test');
assert.equal(applied.shipLevel, 1);
assert.equal(applied.crewLevel, 2);
memory.set('cv.stats.v1', JSON.stringify({ supply: 55, trust: 65 }));
assert.equal(game.loadStats().shipLevel, 0, '旧存档应补齐新字段');
memory.set('cv.stats.v1', JSON.stringify({ supply: 55, trust: 65, shipLevel: 99, crewLevel: -1 }));
assert.equal(game.loadStats().shipLevel, 0);
assert.equal(game.loadStats().crewLevel, 0);
console.log('通过：8 条年代链、24 个故事场景、图文来源、选择回响、回顾、升级边界与旧存档迁移。');
