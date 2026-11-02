import { DRAFT_KEY } from '../model.js';
if (location.hostname !== '127.0.0.1' || location.port !== '8766') throw new Error('只允许隔离测试地址。');
const html = await (await fetch('../index.html')).text();
const page = new DOMParser().parseFromString(html, 'text/html');
page.querySelectorAll('script').forEach(script => script.remove());
document.body.replaceChildren(...page.body.childNodes);
const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = new URL('../port.css', import.meta.url); document.head.append(css);
// Boot the production controller and markup; inject a failing storage boundary only in this frame.
const setItem = Storage.prototype.setItem;
let failWrites = false;
Storage.prototype.setItem = function (key, value) {
  if (failWrites && key === DRAFT_KEY) throw new DOMException('Injected test quota failure', 'QuotaExceededError');
  return setItem.call(this, key, value);
};
window.addEventListener('message', event => {
  if (event.origin === location.origin && event.source === parent && event.data?.type === 'test-fail-writes') {
    failWrites = true;
    parent.postMessage({type: 'test-status', message: '已注入保存失败；请编辑下方目标，使应用进入仅本页暂存。'}, location.origin);
  }
});
history.replaceState(null, '', new URL('../', import.meta.url));
await import('../app.js');
parent.postMessage({type: 'test-status', message: '真实应用已载入，可开始保存失败测试。'}, location.origin);
