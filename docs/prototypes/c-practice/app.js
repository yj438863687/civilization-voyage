import { DRAFT_KEY, newDraft, restore, evidenceErrors, planErrors, reflectionErrors, previewPlan, reveal, actOnReflection } from "./model.js";
import { esc, steps, renderPage, evidenceCheck, selectedTags, samePlanControls, responseLabel, reflectionButton, reviewMaterials, reviewPlans, reviewMaps } from "./views.js";

const $ = selector => document.querySelector(selector);
const main = $("#main"), progress = $("#steps"), saveState = $("#save-state"), note = $("#storage-note");
const resetDialog = $("#reset-dialog");
const reader = document.createElement("dialog");
reader.id = "reader-dialog";
reader.setAttribute("aria-labelledby","reader-title");
document.body.append(reader);
let scenario, draft, lastRaw = null, memoryOnly = false, locked = false;

function storageNotice(message) {
  note.hidden = !message;
  note.textContent = message;
}

function showLock(message, stale = false) {
  locked = true;
  if (reader.open) reader.close();
  if (resetDialog.open) resetDialog.close();
  progress.replaceChildren();
  storageNotice("");
  saveState.textContent = stale ? "草稿有更新" : "草稿待处理";
  $("#reset").hidden = stale;
  main.innerHTML = `<section class="sheet recovery"><div class="eyebrow">本机草稿</div><h1>${stale?"另一页面更新了交接簿":"这份草稿暂时无法恢复"}</h1><p>${esc(message)}</p>${stale ? '<button type="button" class="primary" data-action="reload">重新读取草稿</button>' : '<button type="button" class="secondary" data-action="export-raw">保存原草稿副本</button> <button type="button" class="primary" data-action="reset">清除草稿并重新开始</button>'}</section>`;
  main.focus();
}

function diskChanged(raw) {
  if (raw === lastRaw) return false;
  showLock("请重新读取本机最新内容，再继续演练。", true);
  return true;
}

function persist() {
  if (locked) return false;
  if (!memoryOnly) {
    try {
      if (diskChanged(localStorage.getItem(DRAFT_KEY))) return false;
      const next = JSON.stringify(draft);
      localStorage.setItem(DRAFT_KEY, next);
      lastRaw = next;
    } catch {
      memoryOnly = true;
      storageNotice("浏览器未能保存这次修改。仍可完成本页演练并导出 JSON，刷新可能丢失本次修改。");
    }
  }
  saveState.textContent = memoryOnly ? "仅本页暂存" : "本机已保存";
  return true;
}

function download(text, name) {
  const url = URL.createObjectURL(new Blob([text], {type:"application/json;charset=utf-8"}));
  const link = document.createElement("a");
  link.href=url; link.download=name; document.body.append(link); link.click(); link.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 1000);
}

function updatePlanControls() {
  if (!$("#plan-extra")) return;
  const same = draft.stage === "revise" && draft.form.planId === draft.planRecords[0].planId;
  const controls = samePlanControls(same);
  $("#plan-extra").hidden = same;
  $("#same-note").hidden = !same;
  $("#reason-label").textContent = controls.label;
  $("#preview-button").innerHTML = controls.button;
  $("#other-wrap").hidden = draft.form.bearer !== "其他";
}

function render(focus = true) {
  progress.innerHTML = steps(draft);
  main.innerHTML = renderPage(scenario,draft);
  if (draft.stage !== "final") {
    main.insertAdjacentHTML("beforeend", '<div class="draft-tools"><button type="button" class="text-btn" data-action="export">导出当前草稿 JSON</button></div>');
  }
  if ($("#evidence-check")) $("#evidence-check").innerHTML = evidenceCheck(draft.form.selectedMaterialIds);
  updatePlanControls();
  if (focus) { main.focus({preventScroll:true}); window.scrollTo(0,0); }
}

function savePage(stage) {
  draft.stage = stage;
  if (persist()) render();
}

function validation(messages) {
  const box = main.querySelector("[data-errors]");
  if (!messages.length) { if (box) box.hidden = true; return true; }
  box.innerHTML = `<strong>还需补齐</strong><ul>${messages.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`;
  box.hidden = false; box.focus();
  return false;
}

function changeMaterial(input) {
  const chosen = new Set(draft.form.selectedMaterialIds);
  if (input.checked) chosen.add(input.value); else chosen.delete(input.value);
  draft.form.selectedMaterialIds = Object.keys(scenario.materials).filter(id=>chosen.has(id));
  input.closest("[data-card]").classList.toggle("chosen", input.checked);
  if ($("#evidence-check")) $("#evidence-check").innerHTML = evidenceCheck(draft.form.selectedMaterialIds);
  if ($("#selected-tags")) $("#selected-tags").innerHTML = selectedTags(scenario,draft.form.selectedMaterialIds);
}

function openReader(title, body) {
  reader.innerHTML = `<div class="reader-head"><h2 id="reader-title">${title}</h2><button type="button" class="secondary" data-action="close-reader" autofocus>返回当前步骤</button></div>${body}<button type="button" class="secondary reader-end" data-action="close-reader">返回当前步骤</button>`;
  reader.showModal();
  reader.scrollTop=0;
}

function readMaterials() {
  const editable = ["materials","plan","revise"].includes(draft.stage);
  openReader(editable ? "查看或调整引用材料" : "回看本版引用材料",reviewMaterials(scenario,draft,editable));
}

function navigateStep(index) {
  if (index === 0 && draft.stage === "plan") { savePage("materials"); return; }
  if (index === 0) { if (draft.stage!=="materials") readMaterials(); return; }
  if (index === 1 && draft.planRecords.length && draft.stage!=="revise") openReader("已记录的安排",reviewPlans(scenario,draft));
  if (index === 2 && draft.planRecords.length && !["preview","v2preview"].includes(draft.stage)) openReader("回看影响预览",reviewMaps(scenario,draft));
}

document.addEventListener("input", event=>{
  const key = event.target.dataset.field;
  if (!key || locked) return;
  const value = event.target.value;
  if (key === "goal") draft.goal=value;
  else if (Object.hasOwn(draft.form,key)) draft.form[key]=value;
  else if (Object.hasOwn(draft.reflectionDraft,key)) draft.reflectionDraft[key]=value;
  validation([]);
  persist();
});

document.addEventListener("change", event=>{
  if (locked || !(event.target instanceof HTMLInputElement)) return;
  const input=event.target;
  if (input.name==="material") changeMaterial(input);
  if (input.name==="plan") {draft.form.planId=input.value; updatePlanControls();}
  if (input.name==="bearer") {draft.form.bearer=input.value; updatePlanControls();}
  if (input.name==="decision") {
    draft.reflectionDraft.decision=input.value;
    $("#response-label").textContent=responseLabel(input.value);
    $("#reflect-button").innerHTML=reflectionButton(input.value);
  }
  validation([]);
  persist();
});

document.addEventListener("click", event=>{
  const button=event.target.closest("button");
  if (!button) return;
  const action=button.dataset.action;
  if (action==="reload") { location.reload(); return; }
  if (action==="export-raw") { download(lastRaw,"c-practice-original-draft.json"); return; }
  if (button.id==="reset" || action==="reset") { resetDialog.showModal(); return; }
  if (button.id==="cancel-reset") { resetDialog.close(); return; }
  if (button.id==="confirm-reset") {
    try {
      // A failed write does not give this tab permission to delete a newer disk version.
      if (diskChanged(localStorage.getItem(DRAFT_KEY))) return;
      localStorage.removeItem(DRAFT_KEY);
      memoryOnly=false;
      storageNotice("");
    } catch {
      if (locked || lastRaw!==null) {
        resetDialog.close();
        storageNotice("未能清除本机草稿。请允许此站点使用浏览器存储后再试。");
        return;
      }
      memoryOnly=true;
      storageNotice("本次演练仅在当前页面暂存。请在刷新前导出需要保留的内容。");
    }
    resetDialog.close(); locked=false; lastRaw=null; draft=newDraft(scenario);
    saveState.textContent=memoryOnly?"仅本页暂存":"新交接簿"; $("#reset").hidden=false; render();
    return;
  }
  if (locked || !draft) return;
  if (button.dataset.nav!==undefined) {navigateStep(Number(button.dataset.nav));return;}
  switch(action) {
    case "read-materials": readMaterials(); break;
    case "close-reader": reader.close(); break;
    case "back-materials": savePage("materials"); break;
    case "back-reflect": savePage("reflect"); break;
    case "to-plan":
      if (validation(evidenceErrors(scenario,draft.goal,draft.form.selectedMaterialIds))) savePage("plan");
      break;
    case "preview-plan":
      if (validation(planErrors(scenario,draft))) { previewPlan(scenario,draft); if (persist()) render(); }
      break;
    case "reveal":
      reveal(scenario,draft);
      if (persist()) {render(false); $("#event-panel").focus();}
      break;
    case "after-preview":
      if (draft.maintenanceRevealed) savePage(draft.stage==="v2preview"?"final":"reflect");
      break;
    case "act-reflect":
      if (validation(reflectionErrors(draft.reflectionDraft))) {actOnReflection(draft); if (persist()) render();}
      break;
    case "export":
      download(JSON.stringify(draft,null,2)+"\n",`c-practice-${draft.stage==="final"?"record":"draft"}.json`);
      break;
  }
});

window.addEventListener("storage", e=>{
  if (!memoryOnly && (e.key===DRAFT_KEY || e.key===null)) diskChanged(e.key===null ? null : e.newValue);
});

async function start() {
  try {
    const response=await fetch("./scenario.json");
    if (!response.ok) throw new Error("HTTP "+response.status);
    scenario=await response.json();
  } catch {
    main.innerHTML='<section class="sheet recovery"><h1>无法打开情境数据</h1><p>请按 README 启动本地 HTTP 服务，然后刷新。请确认 scenario.json 与页面在同一目录。</p><button type="button" class="primary" data-action="reload">重新读取</button></section>';
    return;
  }
  try {lastRaw=localStorage.getItem(DRAFT_KEY);}
  catch {
    memoryOnly=true;
    storageNotice("浏览器存储不可用。本页仍可演练，请在关闭前导出 JSON。");
  }
  $("#reset").hidden=false;
  if (lastRaw!==null) {
    try {draft=restore(scenario,lastRaw);}
    catch(e) {
      showLock(e instanceof SyntaxError ? "草稿不是完整的 JSON。可以先保存原草稿副本，再清除并重新开始。" : e.message);
      return;
    }
  } else draft=newDraft(scenario);
  saveState.textContent=memoryOnly?"仅本页暂存":lastRaw===null?"新交接簿":"已恢复本机草稿";
  render(false);
}
start();
