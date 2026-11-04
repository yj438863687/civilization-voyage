import { useEffect, useRef, useState } from 'react';
import { historyScene } from '../world/voyageHistory';
import { BACKGROUND_MEDIA, ISLAND_BACKGROUNDS } from '../world/islandBackgrounds';
import './island-background.css';

export function IslandBackground({id,onClose}:{id:string;onClose:()=>void}) {
  const note=ISLAND_BACKGROUNDS[id],person=historyScene(id)!;
  const photo=BACKGROUND_MEDIA[note.image];
  const panel=useRef<HTMLDivElement>(null);
  const [failed,setFailed]=useState(false);
  useEffect(()=>{
    const previous=document.activeElement instanceof HTMLElement?document.activeElement:null;
    panel.current?.focus();
    return()=>{if(previous?.isConnected)previous.focus();};
  },[]);
  return <div className="island-background" role="dialog" aria-modal="true" aria-label={`${person.who}的图片背景`} onKeyDown={event=>{
    event.stopPropagation();
    if(event.key==='Escape'){event.preventDefault();onClose();}
    if(event.key==='Tab'){
      const nodes=[...(panel.current?.querySelectorAll<HTMLElement>('button,a[href],summary')??[])].filter(node=>node.getClientRects().length>0);if(!nodes?.length)return;
      const first=nodes[0],last=nodes[nodes.length-1];
      if(event.shiftKey&&(document.activeElement===first||document.activeElement===panel.current)){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&(document.activeElement===last||document.activeElement===panel.current)){event.preventDefault();first.focus();}
    }
  }}>
    <div className="island-background-paper" ref={panel} tabIndex={-1}>
      <header><h2>{person.who} · 图片背景</h2><button className="btn" type="button" onClick={onClose}>收起，继续航行</button></header>
      <figure>{failed?<p>图片暂时无法显示，仍可阅读背景解说。</p>:<img src={photo.src} alt={photo.caption} onError={()=>setFailed(true)}/>}<figcaption>{photo.caption}</figcaption></figure>
      <p>{note.date} · {note.nature}</p><p>{note.text}</p><p><a href={note.source.url} target="_blank" rel="noreferrer">历史背景出处：{note.source.title}</a></p><p className="island-background-note">配图展示相关历史背景；画中人不代表虚构的互动人物，人物台词与选择为创作。</p>
      {(id==='A-water'||id==='A-stake')&&<details><summary>再读两段中国农耕传说：仓颉与后稷</summary><p>仓颉造字、后稷教稼是另外两段农耕传说，没有可确证的纪年。一个谈怎样留下记号，一个谈怎样给下一季留种。</p>{['cangjie','houji'].map(key=><figure key={key}><img src={BACKGROUND_MEDIA[key].src} alt={BACKGROUND_MEDIA[key].caption}/><figcaption>{BACKGROUND_MEDIA[key].caption} <a href={BACKGROUND_MEDIA[key].url} target="_blank" rel="noreferrer">{BACKGROUND_MEDIA[key].author} · {BACKGROUND_MEDIA[key].license}</a></figcaption></figure>)}</details>}
      <details><summary>图片来源与授权</summary><p><a href={photo.url} target="_blank" rel="noreferrer">{photo.title}</a><br/>{photo.author} · <a href={photo.licenseUrl} target="_blank" rel="noreferrer">{photo.license}</a></p></details>
      <p className="island-background-note">这里只补充图片和背景。阅读不改变补给、人心或故事进度。按 Escape 或收起按钮返回。</p>
    </div>
  </div>;
}
