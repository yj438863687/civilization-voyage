import media from './backgroundMedia.json';
import { HISTORY_ROUTES } from './voyageHistory';

export const ISLAND_BACKGROUNDS:Record<string,{image:string;text:string;source:{title:string;url:string};date:string;nature:string}>=Object.fromEntries(Object.values(HISTORY_ROUTES).flatMap(route=>[...route.islands,route.crisis]).map(scene=>[scene.id,{image:scene.image,text:scene.paragraphs.join(' '),source:scene.source,date:scene.date,nature:scene.nature}]));
export const BACKGROUND_MEDIA:Record<string,{src:string;caption:string;title:string;url:string;author:string;license:string;licenseUrl:string}>=media;
