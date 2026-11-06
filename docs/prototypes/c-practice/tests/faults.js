import { DRAFT_KEY, newDraft } from '../model.js';
const s = await (await fetch('../scenario.json')).json();
const frame = document.querySelector('iframe'), status = document.querySelector('#status');
const isolated = location.hostname === '127.0.0.1' && location.port === '8766';
let latestRaw;
for (const button of document.querySelectorAll('button')) button.disabled = !isolated;
document.querySelector('#start').onclick = () => {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(newDraft(s)));
  frame.src = './fault-frame.html';
  status.textContent = '正在载入真实 app.js。';
};
document.querySelector('#fail').onclick = () => {
  frame.contentWindow.postMessage({type: 'test-fail-writes'}, location.origin);
};
window.addEventListener('message', event => {
  if (event.origin === location.origin && event.source === frame.contentWindow && event.data?.type === 'test-status') status.textContent = event.data.message;
});
document.querySelector('#external').onclick = () => {
  const latest = newDraft(s); latest.goal = '另一页面已保存的新内容，应在冲突时保留。';
  latestRaw = JSON.stringify(latest); localStorage.setItem(DRAFT_KEY, latestRaw);
  status.textContent = '另一页面已写入新草稿；请在下方应用确认重置，再核对。';
};
document.querySelector('#verify').onclick = () => {
  status.textContent = localStorage.getItem(DRAFT_KEY) === latestRaw ? 'PASS：另一页面新草稿仍完整保留。' : 'FAIL：另一页面新草稿已被删除或覆盖。';
};
