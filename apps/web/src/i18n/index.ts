import { useSyncExternalStore } from 'react';
import chineseHistory from '../world/voyageHistory.json';
import englishHistory from './history.en.json';
import englishUI from './ui.en.json';

export type Language = 'zh' | 'en';
const LANGUAGE_KEY = 'cv.language.v1';
const SIZE_KEY = 'cv.largeText.v1';
function preference(key:string){try{return typeof localStorage==='undefined'?null:localStorage.getItem(key);}catch{return null;}}
let language:Language=preference(LANGUAGE_KEY)==='en'?'en':'zh';
let largeText=preference(SIZE_KEY)==='1';
const listeners=new Set<()=>void>();
const subscribe=(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener);};};
function syncDocument(){if(typeof document==='undefined')return;document.documentElement.lang=language==='en'?'en':'zh-CN';document.documentElement.dataset.largeText=String(largeText);document.title=language==='en'?'Civilization Voyage':'文明航程';}
syncDocument();
export const getLanguage=()=>language;
export function setLanguage(next:Language){if(next===language)return;language=next;try{localStorage.setItem(LANGUAGE_KEY,next);}catch{/* Preferences are optional in private browsing. */}syncDocument();listeners.forEach(listener=>listener());}
export function setLargeText(next:boolean){largeText=next;try{localStorage.setItem(SIZE_KEY,next?'1':'0');}catch{/* The current session still uses the selected size. */}syncDocument();listeners.forEach(listener=>listener());}
export function useLanguage(){return useSyncExternalStore(subscribe,()=>language);}
export function useLargeText(){return useSyncExternalStore(subscribe,()=>largeText);}

const dictionary:Record<string,string>={};
function pair(original:unknown,translated:unknown){
 if(typeof original==='string'&&typeof translated==='string'&&original!==translated){dictionary[original]=translated;return;}
 if(original&&translated&&typeof original==='object'&&typeof translated==='object')for(const key of Object.keys(original))pair((original as Record<string,unknown>)[key],(translated as Record<string,unknown>)[key]);
}
pair(chineseHistory,englishHistory);
Object.assign(dictionary,englishUI);
for(const [key,value] of Object.entries(dictionary))dictionary[key.trim()]=value.trim();
const escape=(text:string)=>text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const phrases=Object.keys(dictionary).filter(key=>key.length>1&&/[\u3400-\u9fff]/.test(key)).sort((a,b)=>b.length-a.length);
const phrasePattern=new RegExp(phrases.map(escape).join('|'),'g');
const templates:[string,string][]=[
 ['起 · {0} · {1}','Beginning · {0} · {1}'],
 ['承 · {0}','Along the Way · {0}'],
 ['转 · {0}','Turning Point · {0}'],
 ['第 {0}/3 站 · {1}','Scene {0}/3 · {1}'],
 ['{0}的图片背景','Image Notes: {0}'],
 ['岸上的人：{0}','At the Shore: {0}'],
 ['这一程的故事：{0}','The Story: {0}'],
 ['{0} · 出事了','{0} · A New Dilemma'],
 ['{0} · 情境与对话为创作','{0} · Fictional Situation and Dialogue'],
 ['{0}。带着三站的经历，听{1}回顾这一程。','{0}. Bring your three experiences to a reflection with {1}.'],
 ['{0}。{1} 这次要面对的是：{2}','{0}. {1} Now consider this situation: {2}'],
 ['先完成「{0}」，再回港回顾。','Complete “{0}” before returning to the harbour.'],
 ['先完成「{0}」，再来见这里的人。','Complete “{0}” before meeting this person.'],
 ['靠过去 · {0}守着「{1}」','Meet {0} · {1}'],
 ['接近 {0}。按 F 靠港。','Approaching {0}. Press F to dock.'],
 ['接住「{0}」，绕开「{1}」','Collect “{0}”; avoid “{1}”'],
 ['接住 {0}','Collected {0}'],
 ['没来得及决定。{0}','No decision was made in time. {0}'],
 ['没来得及 · {0}','Time Expired · {0}'],
 ['需要 {0} 份补给，并至少留下 15 份口粮','Requires {0} supplies and a reserve of at least 15'],
 [' · 用去 {0} 份，还要留下15份口粮',' · Costs {0}; keep at least 15 in reserve'],
 [' · 需要 {0}',' · Requires {0}'],
 ['实物预览：船体整修{0}级，船员行装{1}级。可拖动旋转。','Model Preview: ship tier {0}, crew outfit tier {1}. Drag to rotate.'],
 ['整修船体：{0}，用去 {1} 份补给。','Ship refit: {0}, costing {1} supplies.'],
 ['船员换装：{0}。大家愿意穿上同一条船的行装。','Crew outfit: {0}. A shared uniform for a shared voyage.'],
 ['你记下了“{0}”。{1} {2}','You recorded “{0}”. {1} {2}'],
 ['WASD 航行 · Shift {0}','WASD to Sail · Shift: {0}'],
 ['{0} · 正在烧补给','{0} · Using Supplies'],
 ['编号 {0}','ID {0}'],
 ['{0} / {1} 秒','{0} / {1} seconds'],
 ['「{0}」· 接着走','“{0}” · Continue'],
 [' · 已看 {0}',' · Visited {0}'],
 ['站位：{0}','Position: {0}'],
 ['轴：{0} ↔ {1}','Axis: {0} ↔ {1}'],
 ['进入{0}','Enter {0}'],
 ['靠港 · {0}','Dock · {0}'],
 ['转动船头，让铜针对准船头（偏 {0}°）。','Turn toward the brass needle ({0}° away).'],
 ['铜针已对准 {0}。再靠近一些，压进港区就会提示靠港。','The needle points to {0}. Move closer to enter the harbour approach.'],
];
const patterns=templates.map(([from,to])=>({pattern:new RegExp('^'+from.split(/\{\d+\}/).map(escape).join('([\\s\\S]+?)')+'$'),to}));
const missing=new Set<string>();
export function translateText(text:string):string{
 if(language==='zh'||!/[\u3400-\u9fff]/.test(text))return text;
 if(dictionary[text]!==undefined)return dictionary[text];
 const trimmed=text.trim();if(dictionary[trimmed]!==undefined)return text.slice(0,text.indexOf(trimmed))+dictionary[trimmed]+text.slice(text.indexOf(trimmed)+trimmed.length);
 for(const {pattern,to} of patterns){const match=pattern.exec(text);if(match)return to.replace(/\{(\d+)\}/g,(_,index)=>translateText(match[Number(index)+1]));}
 const result=text.replace(phrasePattern,key=>dictionary[key]).replace(/，/g,', ').replace(/。/g,'. ').replace(/：/g,': ').replace(/；/g,'; ').replace(/「/g,'“').replace(/」/g,'”');
 if(result.includes('·')&&/[\u3400-\u9fff]/.test(result))return result.split(/(\s*·\s*)/).map((part,index)=>index%2===0?translateText(part):part).join('');
 if(/[\u3400-\u9fff]/.test(result))missing.add(text);
 return result;
}
/** Translate only display strings. Objects, handlers, React elements and saves are untouched. */
export function localize<T>(value:T):T{return typeof value==='string'?translateText(value) as T:value;}
export const untranslatedText=()=>[...missing];
