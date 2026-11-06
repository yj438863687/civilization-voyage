import { bearers, effects, issues } from "./model.js";
import { harbor } from "./harbor.js";

export const esc = x => String(x ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"}[c]));
const tick = flag => flag ? " checked" : "";
const label = { revise:"修改一次安排", keep:"保持原安排", insufficient:"证据不足" };
const stepNames = ["问题与材料", "制定安排", "影响预览", "成果与反思"];
const stepOf = { materials:0, plan:1, revise:1, preview:2, v2preview:2, reflect:3, final:3 };

export function steps(d) {
  const active = stepOf[d.stage];
  return stepNames.map((name, i) => {
    const available = i === 0 || i === active || (i === 1 && d.planRecords.length) || (i === 2 && d.planRecords.length);
    return `<button type="button" data-nav="${i}" ${active === i ? 'aria-current="step"' : ""} ${available ? "" : "disabled"}><span class="step-no">0${i+1}</span><span>${name}</span></button>`;
  }).join("");
}

const eyebrow = text => `<div class="eyebrow">${text}</div>`;
const primary = (action, text) => `<button type="button" class="primary" data-action="${action}">${text}<span aria-hidden="true"> →</span></button>`;
const secondary = (action, text) => `<button type="button" class="secondary" data-action="${action}">${text}</button>`;
const hint = text => `<p class="hint">${text}</p>`;
const alerts = '<div class="errors" data-errors role="alert" tabindex="-1" hidden></div>';
const pageHead = (kicker, title, text) => `<header class="page-head">${eyebrow(kicker)}<h1>${title}</h1><p>${text}</p></header>`;
const noteText = text => `<span class="user-text">${esc(text)}</span>`;
const field = (key, name, value, placeholder, rows = 2) => `<label class="field"><span>${name}</span><textarea data-field="${key}" name="${key}" rows="${rows}" placeholder="${placeholder}">${esc(value)}</textarea></label>`;
const tags = (s, ids) => ids.map(id => `<span class="tag">${esc(id)} · ${esc(s.materials[id].title)}</span>`).join("");
const arrival = e => e.deliveryDelay ? `迟 ${e.deliveryDelay} 格` : "按窗口到港";
const reliefWork = e => e.reliefCrewCalled ? "接手本轮工作" : "未调用";
const bearerName = r => r.bearer === "其他" ? r.otherBearer : r.bearer;
const getObs = (d, r) => d.maintenanceObservations.find(o => o.planRecordId === r.id);
const ruleNumber = (v, unit) => `<b>${v}</b> ${unit}`;

export function materialCards(s, ids, editable = true) {
  return `<div class="materials">${Object.entries(s.materials).map(([id, m]) => `<article class="material ${ids.includes(id) ? "chosen" : ""}" data-card="${id}">
    <div class="card-top"><span class="card-id">${id}</span><span>${m.type}</span></div>
    <h3>${m.title}</h3><p>${m.content}</p>
    <details class="source"><summary>出处与局限</summary><dl><dt>出处</dt><dd>${m.source}</dd><dt>可支持的判断</dt><dd>${m.support}</dd><dt>使用局限</dt><dd>${m.limit}</dd></dl></details>
    ${editable ? `<label class="cite"><input type="checkbox" name="material" value="${id}" aria-label="引用 ${id} ${m.title}"${tick(ids.includes(id))}><span class="off">加入我的依据</span><span class="on">已加入依据</span></label>` : `<div class="citation-status">${ids.includes(id) ? "✓ 此版已引用" : "此版未引用"}</div>`}
  </article>`).join("")}</div>`;
}

function contextNotes(s) {
  return `<details class="reader"><summary>课程依据与设计转化</summary><p>成员 C 用这次演练表达“知行合一”：让材料进入行动，再用结果检视判断。这是小组的设计转化。以下页码从封面起算。</p><dl>${s.courseNotes.map(n=>`<dt>${n.source}</dt><dd>${n.text}</dd>`).join("")}</dl></details>`;
}

function voices(s) {
  return `<details class="reader"><summary>两位船员的意见 <small>预写演示 · 可不同意</small></summary>${s.upstreamViews.map(v => `<div class="voice"><h3>${v.label}</h3><p>“${v.text}”</p></div>`).join("")}</details>`;
}

function opening(s, d) {
  return `<section class="hero"><div class="hero-copy">${eyebrow("港务交接簿　/　实践演练 C")}<h1>${s.title}</h1><p>${s.question}</p><div class="hero-meta"><span>教学创作模拟</span><span>约 3–5 分钟</span></div></div>
    <figure class="hero-figure">${harbor()}<figcaption><span>图 01　蒸汽港区侧视图</span><span>港务交接簿</span></figcaption></figure></section>
    <div class="workbench"><section class="sheet"><div class="sheet-heading">${eyebrow("01　/　材料夹")}<h2>选出你要引用的材料</h2><p>加入 K1，再选至少一张情境卡。未引用的材料也可以阅读。</p></div>
      ${materialCards(s,d.form.selectedMaterialIds)}${contextNotes(s)}${voices(s)}</section>
      <aside class="note-sheet"><div class="note-heading">${eyebrow("本轮交接单")}<h2>你的优先目标</h2></div>
      <p>你来协调这一班。先写下最想照顾谁，以及想为他们保住什么。</p>
      ${field("goal","本轮优先考虑什么？",d.goal,"例如，我想尽量保住原班船员的轮休。",3)}
      <div class="check-list" id="evidence-check"></div>
      <p class="notice"><strong>演练提示</strong>第一次预览后，每个人都会收到同一条新信息。</p>
      ${alerts}${primary("to-plan","继续制定安排")}<p class="tiny">问题、情境与船员意见均为演示预置。</p></aside></div>`;
}

export function evidenceCheck(ids) {
  return [["课程依据",ids.includes("K1")],["情境依据",ids.some(i=>i!=="K1")]].map(([text,yes])=>`<div><span>${text}</span><strong>${yes ? "✓ 已选" : "○ 待选"}</strong></div>`).join("");
}

function planCards(s, d) {
  return `<fieldset><legend class="section-title">班组安排</legend><div class="plans">${Object.entries(s.plans).map(([id,p])=>{
    const e = effects(s,id);
    return `<label class="plan-card"><span class="plan-top"><input type="radio" name="plan" value="${id}"${tick(d.form.planId===id)}><b>${p.name}</b></span><span class="plan-description">${p.action}</span><span class="plan-score"><span>交付 <strong>${arrival(e)}</strong></span><span>原班额外执勤 <strong>${e.originalCrewExtraDuty} 格</strong></span><span>替班支出 <strong>${e.reserveCost} 单位</strong></span><span>保留储备 <strong>${e.reserveAfterPlan} 单位</strong></span></span></label>`;
  }).join("")}</div></fieldset>`;
}

function planPage(s, d) {
  const isRev = d.stage === "revise", f = d.form;
  const original = d.planRecords[0], observation = isRev ? getObs(d,original) : null;
  return `${pageHead(isRev ? "02　/　相同条件下再演练" : "02　/　制定安排", isRev ? "再拟一份安排" : "排定这一班", isRev ? `初始储备仍为 ${s.rules.initialReserve} 单位，已知维护需要 ${s.rules.maintenanceNeed} 单位。第一版安排和理由已存入交接簿。` : "三种班表各有代价。对照材料和船员意见，再写下你的选择。")}
    <section class="sheet">${planCards(s,d)}${voices(s)}</section>
    <div class="workbench plan-form"><section class="sheet">${eyebrow("调度记录")}<h2>写下判断依据</h2>
    <div class="selection"><div><span class="sub-label">本次引用</span><div class="tags" id="selected-tags">${tags(s,f.selectedMaterialIds)}</div></div>${secondary("read-materials","查看或调整依据")}</div>
    <p id="same-note" class="notice" hidden>选项与 v1 相同。写下坚持的理由，将作为保持安排的反思保存。</p>
    <label class="field"><span id="reason-label">材料怎样影响你的安排？</span><textarea data-field="reason" name="reason" rows="2" placeholder="写出你引用了哪条材料，以及它怎样影响取舍。">${esc(f.reason)}</textarea></label>
    <div id="plan-extra"><fieldset><legend>你认为谁主要承担代价？</legend><div class="chips">${bearers.map(x=>`<label><input type="radio" name="bearer" value="${x}"${tick(f.bearer===x)}>${x}</label>`).join("")}</div></fieldset>
    <div id="other-wrap" ${f.bearer === "其他" ? "" : "hidden"}>${field("otherBearer","其他承担者的身份",f.otherBearer,"例如，接手工作的替班组。",1)}</div>
    ${field("expected","你预期会有什么影响？",f.expected,"说明谁会等待、谁会额外工作，或还会留下多少储备。")}</div></section>
    <aside class="note-sheet">${eyebrow(isRev ? "v1　/　原始目标" : "本轮交接单")}<h2>${isRev ? "再演练的起点" : "你写下的目标"}</h2><p class="quoted user-text">${esc(d.initialGoal ?? d.goal)}</p>
    ${isRev ? `<p class="notice"><strong>v1 · ${s.plans[original.planId].name}</strong>维护预留后余 ${observation.remainingAfterMaintenance} 单位，缺口 ${observation.maintenanceShortfall} 单位。</p><p>更换选项后将生成唯一的 v2。</p>` : hint("预览后会保留这份安排。稍后可以对照新信息，再决定是否修订。")}
    ${alerts}<div id="preview-button">${primary("preview-plan","预览这份安排")}</div>${secondary(isRev?"back-reflect":"back-materials",isRev?"返回反思":"返回问题与材料")}</aside></div>`;
}

export function samePlanControls(same) {
  return { label: same ? "为什么仍保持原安排？" : "材料怎样影响你的安排？",
    button: primary("preview-plan", same ? "记录保持理由" : "预览这份安排") };
}

function maintenancePanel(s, r, obs, allowReveal) {
  if (!obs) return `<section class="dispatch"><div>${eyebrow("下一班来单")}<h2>共同的新信息到了</h2><p>先看本轮安排，再拆开给所有玩家的同一份维护通知。</p></div>${allowReveal ? primary("reveal","打开共同维护需求") : ""}</section>`;
  return `<section class="dispatch revealed" id="event-panel" tabindex="-1"><div>${eyebrow("共同维护通知　/　已揭示")}<h2>下一班需要 ${obs.maintenanceNeed} 单位维护资源</h2><p>本轮留有 ${r.effects.reserveAfterPlan} 单位可供预留。此处展示预留量与缺口。</p></div>
    <div class="math"><div><span>预留后的余量</span><strong>${obs.remainingAfterMaintenance}</strong> 单位</div><div class="${obs.maintenanceShortfall ? "shortfall" : ""}"><span>维护缺口</span><strong>${obs.maintenanceShortfall}</strong> 单位</div></div></section>`;
}

function affected(s,r,obs) {
  const e=r.effects;
  const rows=[
    ["货主",arrival(e),e.deliveryDelay?"等待比原约定多 1 格。":"本轮按约交付。","S1 · 交付窗口与计划"],
    ["原班船员",`额外执勤 ${e.originalCrewExtraDuty} 格`,e.originalCrewExtraDuty?"原班接下加速班次。":"原班保有原定轮休。","S2 · 班组安排"],
    ["替班组",reliefWork(e),e.reliefCrewCalled?`调用这组人员支出 ${e.reserveCost} 单位，工作由他们承担。`:"本轮没有安排替班人员接手。","S2、S3 · 调用规则"],
    ["下一班",`可用储备 ${e.reserveAfterPlan} 单位`,obs?`预留维护后余 ${obs.remainingAfterMaintenance} 单位，缺口 ${obs.maintenanceShortfall} 单位。`:"维护通知待打开。","S3 · 储备规则" + (obs ? "与共同维护需求" : "")]
  ];
  return `<div class="affected">${rows.map(([who,status,text,source])=>`<div><h3>${who}</h3><p><strong>${status}</strong>　${text}</p><small>${source}</small></div>`).join("")}</div>`;
}

function mapFigure(s,r) {
  const e=r.effects;
  return `<figure class="map"><div class="map-title"><span>港区安排图</span><small>v${r.version}　/　${s.plans[r.planId].name}</small></div>${harbor(e)}<figcaption class="map-legend">
    <div><span>交付窗口 ${r.ruleInputs.deliveryWindow} 格</span><b>${arrival(e)}</b></div><div><span>原班额外执勤</span>${ruleNumber(e.originalCrewExtraDuty,"格")}</div><div><span>替班组</span><b>${reliefWork(e)}</b></div><div><span>储备余量</span>${ruleNumber(e.reserveAfterPlan,"单位")}</div></figcaption></figure>`;
}

function statedVsRule(s,r) {
  const typical=s.plans[r.planId].mainBearer;
  return `<details class="reader" ${bearerName(r)!==typical ? "open" : ""}><summary>对照我的预期和规则</summary><p>我点选的主要承担者为<strong>${esc(bearerName(r))}</strong>。我的预期是“${noteText(r.expected)}”。</p><p>按规则预览为${arrival(r.effects)}，原班额外执勤 ${r.effects.originalCrewExtraDuty} 格，储备余 ${r.effects.reserveAfterPlan} 单位。</p><p>${bearerName(r)!==typical ? `这组规则把直接代价落在${typical}身上。可以对照四方影响，说明你为何点选另一位承担者。` : "对照四方影响，可在反思里说明哪些预期得到印证、哪些需要修改。"}</p></details>`;
}

function previewPage(s,d) {
  const r=d.planRecords.at(-1), obs=getObs(d,r);
  const instruction = r.version===2 ? "同一份维护通知仍然有效。核对这份新安排，再查看最终成果。" :
    obs ? "维护通知已打开。对照四方影响和维护缺口，再回看原先的目标。" : "核对货物、班组和储备的位置，再打开下一班的维护通知。";
  return `${pageHead("03　/　按演示规则预览",s.plans[r.planId].name+"的影响",instruction)}
    <div class="preview-grid">${mapFigure(s,r)}<section class="sheet impacts">${eyebrow("值班交接")}<h2>谁受到影响</h2>${affected(s,r,obs)}</section></div>
    ${maintenancePanel(s,r,obs,true)}${statedVsRule(s,r)}
    <div class="action-row">${secondary("read-materials","回看引用材料")}${obs?primary("after-preview",r.version===2?"查看最终成果":"对照目标，写下反思"):""}</div>`;
}

function comparison(s,d) {
  const rows=[
    ["选择的安排", r=>s.plans[r.planId].name],["货物交付", r=>arrival(r.effects)],
    ["原班额外执勤",r=>r.effects.originalCrewExtraDuty+" 格"],["替班组",r=>reliefWork(r.effects)],
    ["替班支出",r=>r.effects.reserveCost+" 单位"],["本轮保留储备",r=>r.effects.reserveAfterPlan+" 单位"],
    ["维护预留后余量",r=>getObs(d,r).remainingAfterMaintenance+" 单位"],["维护缺口",r=>getObs(d,r).maintenanceShortfall+" 单位"]
  ];
  return `<table class="comparison"><caption>相同初始储备 ${s.rules.initialReserve} 单位 · 共同维护需求 ${s.rules.maintenanceNeed} 单位</caption><thead><tr><th scope="col">核对项目</th>${d.planRecords.map(r=>`<th scope="col">v${r.version}　${r.version===1?"初版":"修订版"}</th>`).join("")}</tr></thead><tbody>${rows.map(([name,show])=>`<tr><th scope="row">${name}</th>${d.planRecords.map(r=>`<td>${show(r)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}

export function recordDetails(s,d,r) {
  const citations = r.selectedMaterialIds.map(id=>`<li><b>${id} · ${s.materials[id].title}</b>　${s.materials[id].source}</li>`).join("");
  return `<div class="record"><h3>v${r.version}　${s.plans[r.planId].name}</h3><dl><dt>记录关系</dt><dd>${r.previousPlanRecordId ? "在 v1 的基础上重新演练" : "首次预览"}</dd><dt>引用材料与出处</dt><dd><ul class="issue-list">${citations}</ul></dd><dt>当时的理由</dt><dd>${noteText(r.reason)}</dd><dt>预期影响</dt><dd>${noteText(r.expected)}</dd><dt>点选的主要承担者</dt><dd>${noteText(bearerName(r))}</dd></dl>${affected(s,r,getObs(d,r))}</div>`;
}

function firstPlan(s,d) {
  const r=d.planRecords[0],obs=getObs(d,r);
  return `<section class="sheet"><div class="sheet-heading">${eyebrow("v1　/　第一次预览")}<h2>原先的判断</h2></div>
    <dl class="facts"><dt>初始目标</dt><dd>${noteText(d.initialGoal)}</dd><dt>第一版安排</dt><dd>${s.plans[r.planId].name}</dd><dt>第一版理由</dt><dd>${noteText(r.reason)}</dd><dt>当时的预期</dt><dd>${noteText(r.expected)}</dd></dl>
    <p class="notice"><strong>共同维护需求 · ${obs.maintenanceNeed} 单位</strong>第一版按规则预留后余 ${obs.remainingAfterMaintenance} 单位，维护缺口 ${obs.maintenanceShortfall} 单位。</p>
    <ul class="issue-list">${issues(r,obs).map(i=>`<li>${i}</li>`).join("")}</ul>${secondary("read-materials","回看引用材料")}</section>`;
}

const responseLabels = {revise:"为什么要修改安排？",keep:"为什么仍保持原安排？",insufficient:"还需要什么材料才能判断？"};
export function responseLabel(decision) {return responseLabels[decision] ?? "准备如何回应？";}
function reflectionPage(s,d) {
  const r=d.reflectionDraft;
  return `${pageHead("04　/　成果与反思","把结果和初衷放在一起","可以修改一次安排，也可以坚持原先的判断，或把缺少的证据留在交接簿里。")}
    <div class="reflection-grid">${firstPlan(s,d)}<section class="sheet">${eyebrow("我的反思")}<h2>回应这次取舍</h2>
    ${field("insight","哪一项结果改变或印证了你的理解？",r.insight,"对照原先目标，写下你注意到的变化。")}
    ${field("cost","谁仍承担什么代价？",r.cost,"写下承担者，以及你仍接受或需要回应的代价。")}
    <fieldset><legend>接下来怎样处理？</legend><div class="chips">${Object.entries(label).map(([id,name])=>`<label><input type="radio" name="decision" value="${id}"${tick(r.decision===id)}>${name}</label>`).join("")}</div></fieldset>
    <label class="field"><span id="response-label">${responseLabel(r.decision)}</span><textarea data-field="response" name="response" rows="2" placeholder="写下理由，或点明缺哪类证据。">${esc(r.response)}</textarea></label>
    ${alerts}<div id="reflect-button">${reflectionButton(r.decision)}</div></section></div>`;
}
export const reflectionButton = decision => primary("act-reflect", decision==="revise"?"继续制定第二版":"保存这次反思");

function finalPage(s,d) {
  const r=d.reflections[0], last=d.planRecords.at(-1),obs=getObs(d,last);
  return `${pageHead("04　/　港务交接簿","本次安排与反思已记录",r.decision==="insufficient"?"成果状态为待继续判断。下方保留已知结果和仍需补充的材料。":"下方保留本轮的选择、模拟结果，以及仍有人承担的代价。")}
    <div class="result-bar"><span>${label[r.decision]} · ${r.decision==="insufficient"?"待继续判断":"已记录"}</span><strong>v${last.version}　${s.plans[last.planId].name}</strong>${primary("export","导出成果 JSON")}</div>
    <div class="reflection-grid"><section class="sheet">${eyebrow("安排对照")}<h2>资源与班组交接</h2>${comparison(s,d)}
    <div class="history">${d.planRecords.map(p=>`<details class="reader"><summary>回看 v${p.version} · ${s.plans[p.planId].name}的原始记录</summary>${recordDetails(s,d,p)}</details>`).join("")}</div></section>
    <section class="sheet">${eyebrow("实践反思")}<h2>我怎样回应</h2><dl class="facts"><dt>本轮问题</dt><dd>${esc(d.question)}</dd><dt>原先目标</dt><dd>${noteText(d.initialGoal)}</dd><dt>对结果的理解</dt><dd>${noteText(r.insight)}</dd><dt>第一版中仍承担的代价</dt><dd>${noteText(r.cost)}</dd><dt>${responseLabel(r.decision)}</dt><dd>${noteText(r.response)}</dd></dl><div class="notice ${obs.maintenanceShortfall?"pending":""}"><strong>仍需交接的事项</strong><ul class="issue-list">${r.unresolvedIssues.map(i=>`<li>${noteText(i)}</li>`).join("")}</ul></div></section></div>`;
}

export function renderPage(s,d) {
  if (d.stage === "materials") return opening(s,d);
  if (["plan","revise"].includes(d.stage)) return planPage(s,d);
  if (["preview","v2preview"].includes(d.stage)) return previewPage(s,d);
  return d.stage === "reflect" ? reflectionPage(s,d) : finalPage(s,d);
}
export function reviewMaterials(s,d,editable) {
  const ids = editable ? d.form.selectedMaterialIds : d.planRecords.at(-1).selectedMaterialIds;
  return `${materialCards(s,ids,editable)}${contextNotes(s)}${voices(s)}`;
}
export function reviewPlans(s,d) {
  return d.planRecords.map(r=>recordDetails(s,d,r)).join("");
}
export function reviewMaps(s,d) {
  return d.planRecords.map(r=>mapFigure(s,r)+maintenancePanel(s,r,getObs(d,r),false)).join("");
}
export const selectedTags=tags;
