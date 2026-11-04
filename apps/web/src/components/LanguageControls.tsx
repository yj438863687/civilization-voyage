import { setLanguage, setLargeText, useLanguage, useLargeText } from '../i18n';
export function LanguageControls(){
 const language=useLanguage(),large=useLargeText();
 return <div className="language-controls" role="group" aria-label={language==='zh'?'语言与文字':'Language and text'}>
  <button type="button" lang="zh-CN" aria-pressed={language==='zh'} onClick={()=>setLanguage('zh')}>中文</button>
  <button type="button" lang="en" aria-pressed={language==='en'} onClick={()=>setLanguage('en')}>English</button>
  <button type="button" aria-pressed={large} onClick={()=>setLargeText(!large)}>{language==='zh'?(large?'标准字':'大字'):(large?'Standard text':'Larger text')}</button>
 </div>;
}
