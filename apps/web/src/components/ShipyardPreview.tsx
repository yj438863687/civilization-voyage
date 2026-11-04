import { localize } from '../i18n';
import type { OrbitControls as OrbitController } from 'three-stdlib';
import { Suspense, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { EraDeckCrew } from '../world/Figure';
import { TreasureShip } from '../world/TreasureShip';
import { HULL_STYLES, STYLE_BY_SCENE } from '../world/hull';
import { DECK_CREW } from '../world/encounters';
import { crewAppearance } from '../world/progression';

export function ShipyardPreview({ sceneId, shipLevel, crewLevel, closeUp }: { sceneId:string; shipLevel:number; crewLevel:number; closeUp:boolean }) {
  const orbit=useRef<OrbitController>(null);
  const preview=useRef<HTMLDivElement>(null);
  const style=HULL_STYLES[STYLE_BY_SCENE[sceneId]??'junk'];
  const crew=crewAppearance(DECK_CREW[sceneId]??DECK_CREW.test,crewLevel);
  return <><div className="shipyard-preview" data-ship-level={shipLevel} data-era={sceneId} ref={preview} role="img" aria-label={localize(`实物预览：船体整修${shipLevel}级，船员行装${crewLevel}级。可拖动旋转。`)}>
    <Canvas dpr={[1,1.3]} camera={{position:[24,16,26],fov:40}}>
      <color attach="background" args={['#11242b']} />
      <ambientLight intensity={1.5}/><directionalLight position={[12,20,10]} intensity={2.8} color="#ffe2af"/><directionalLight position={[-10,8,-10]} intensity={1.3} color="#a9c5d2"/>
      <PerspectiveCamera key={closeUp?'crew':'ship'} makeDefault position={closeUp?[-4.5,3.5,6]:[style.length*1.05,style.deckY+12,style.length*1.1]} fov={closeUp?35:40}/>
      <Suspense fallback={null}>{closeUp?<group name="crew-outfit-preview">
        <mesh position={[0,-.13,0]}><cylinderGeometry args={[3,3,.2,48]}/><meshStandardMaterial color="#61513b" roughness={.95}/></mesh>
        <group position={[-1.5,-style.deckY,0]}><EraDeckCrew crew={crew} crewLevel={crewLevel} deckY={style.deckY} reduceMotion/></group>
      </group>:<TreasureShip style={style} crew={crew} shipLevel={shipLevel} crewLevel={crewLevel} reduceMotion/>}</Suspense>
      <OrbitControls ref={orbit} onChange={()=>{if(preview.current&&orbit.current)preview.current.dataset.cameraDistance=String(orbit.current.getDistance());}} key={closeUp?'crew':'ship'} target={closeUp?[0,1.05,-.2]:[0,style.deckY+2,0]} enablePan={false} minDistance={closeUp?3:12} maxDistance={closeUp?12:70} maxPolarAngle={Math.PI*0.48}/>
    </Canvas>
    <p>{localize("拖动转一转 · 滚轮或双指缩放 · 预览不扣补给")}</p>
  </div><div className="shipyard-view-tools" role="group" aria-label={localize("预览视角")}><button type="button" onClick={()=>orbit.current?.setAzimuthalAngle((orbit.current?.getAzimuthalAngle()??0)-Math.PI/6)}>{localize("向左转")}</button><button type="button" onClick={()=>orbit.current?.setAzimuthalAngle((orbit.current?.getAzimuthalAngle()??0)+Math.PI/6)}>{localize("向右转")}</button><button type="button" onClick={()=>{orbit.current?.dollyIn(1/1.2);orbit.current?.update();}}>{localize("拉近")}</button><button type="button" onClick={()=>{orbit.current?.dollyOut(1/1.2);orbit.current?.update();}}>{localize("拉远")}</button><button type="button" onClick={()=>orbit.current?.reset()}>{localize("还原视角")}</button></div></>;
}
