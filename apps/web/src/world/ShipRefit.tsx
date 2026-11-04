import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group } from 'three';
import type { HullStyle } from './hull';

export const REFIT_NAMES: Record<string, string[]> = {
  raft: ['渡河木筏', '有仓的粮船', '双帆远行船', '双体共济船'],
  steamer: ['明轮小汽船', '封闭货舱汽船', '双烟囱轮船', '高桥远洋轮船'],
  sailnet: ['单桅通信船', '海上报务船', '碟形天线船', '海上通信站'],
  selfnav: ['低舷自航船', '有人值守舱', '双体试航船', '协作科考船'],
  junk: ['初航宝船', '有仓的宝船', '双层航楼', '共同远行号'],
};

// Refit changes the superstructure and silhouette inside the existing navigation
// envelope, so the same hull still fits the established harbours and shore reach.
export function ShipRefit({ style, level, reduceMotion }: { style: HullStyle; level: number; reduceMotion: boolean }) {
  const rotor = useRef<Group>(null);
  useFrame((_, dt) => { if (rotor.current && !reduceMotion) rotor.current.rotation.y += Math.min(dt, .05) * .6; });
  if (level < 1) return null;
  const { beam: b, length: l, deckY: d } = style;
  const agricultural = style.id === 'raft';
  const industrial = style.id === 'steamer';
  const information = style.id === 'sailnet';
  const intelligent = style.id === 'selfnav';
  const wall = agricultural ? '#845f39' : industrial ? '#293a42' : intelligent ? '#c5c9bb' : '#38565d';
  const roof = agricultural ? '#bd995a' : '#b89b64';
  const box = (position: [number, number, number], size: [number, number, number], color: string, name?: string) => <mesh key={name??position.join(',')} name={name} position={position} castShadow receiveShadow><boxGeometry args={size}/><meshStandardMaterial color={color} roughness={.65} metalness={agricultural ? .02 : .3}/></mesh>;
  const aft = l * .27;
  return <group name={`refit-${style.id}-${level}`} userData={{ refitLevel: level, design: REFIT_NAMES[style.id][Math.min(3, level)] }}>
    <group name="refit-cargo-house">
      {box([0,d+.85,aft], [b*.72,1.7,l*.25], wall)}
      {box([0,d+1.77,aft], [b*.86,.18,l*.29], roof)}
      {[-1,1].map(side=><group key={side}>
        {[0,1,2].map(index=>box([side*b*.365,d+1.05,aft-l*.085+index*l*.085],[.035,.52,l*.045],'#a8c8c5'))}
        {box([side*b*.43,d+.6,-l*.22],[b*.09,1.3,l*.25],roof)}
      </group>)}
      {agricultural && [0,1,2].map(index=><mesh key={index} position={[-b*.2+index*b*.2,d+.45,-l*.32]} castShadow><cylinderGeometry args={[.38,.44,.9,10]}/><meshStandardMaterial color="#c3a366" roughness={.95}/></mesh>)}
    </group>
    {level>=2 && <group name="refit-navigation-bridge">
      {box([0,d+2.65,aft], [b*.55,1.55,l*.17], wall)}
      {box([0,d+3.5,aft], [b*.77,.2,l*.22], roof)}
      {box([0,d+2.9,aft-l*.086], [b*.43,.54,.04], '#89b3bd')}
      {agricultural && <group position={[0,d,-l*.3]}>
        <mesh position={[0,3.8,0]}><cylinderGeometry args={[.08,.12,7.6,8]}/><meshStandardMaterial color="#6b4d2f"/></mesh>
        <mesh position={[0,4.9,0]} rotation={[0,.3,0]}><planeGeometry args={[b*.8,3.8]}/><meshStandardMaterial color="#b64f35" side={2} roughness={.95}/></mesh>
        {box([0,6.9,0],[b*.84,.07,.07],roof)}
      </group>}
      {industrial && <group position={[0,d+2.9,l*.1]}>
        <mesh castShadow><cylinderGeometry args={[.6,.8,5.8,12]}/><meshStandardMaterial color="#293a42" metalness={.45} roughness={.6}/></mesh>
        <mesh position={[0,2.6,0]}><cylinderGeometry args={[.65,.65,.6,12]}/><meshStandardMaterial color="#ad5b37"/></mesh>
      </group>}
      {information && <group position={[-b*.25,d+3,-l*.24]} rotation={[.45,0,-.3]}>
        <mesh rotation={[-Math.PI/2,0,0]}><sphereGeometry args={[1.65,20,12,0,Math.PI*2,0,Math.PI*.4]}/><meshStandardMaterial color="#d5d6c4" side={2} metalness={.35} roughness={.5}/></mesh>
        <mesh position={[0,0,1.1]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.06,.06,2.2,6]}/><meshStandardMaterial color={roof}/></mesh>
      </group>}
      {intelligent && [-1,1].map(side=><mesh key={side} position={[side*b*.39,d-.45,0]} rotation={[Math.PI/2,0,0]} castShadow><capsuleGeometry args={[b*.105,l*.67,4,10]}/><meshStandardMaterial color="#c3d4ce" metalness={.45} roughness={.35}/></mesh>)}
    </group>}
    {level>=3 && <group name="refit-expedition-deck">
      {agricultural && [-1,1].map(side=><group key={side}>
        {box([side*b*.4,d-.5,0],[b*.17,1.1,l*.85], '#4c5a43')}
        {box([0,d+.15,side*l*.23],[b,.24,.35],roof)}
      </group>)}
      {industrial && <group position={[0,d,-l*.29]}>
        {[-1,1].map(side=>box([side*b*.34,2.5,0],[.2,5,.24],roof))}
        {box([0,4.9,0],[b*.74,.24,.25],roof)}
        <mesh position={[0,3.4,0]}><cylinderGeometry args={[.035,.035,2.8,6]}/><meshStandardMaterial color="#273435"/></mesh>
        {box([0,1.9,0],[1.4,1.1,1.4],'#745c3b')}
      </group>}
      {(information||intelligent)&&[-1,1].map(side=><group key={side} position={[side*b*.28,d+1.1,-l*.23]} rotation={[0,0,side*.18]}>
        {box([0,0,0],[b*.42,.12,l*.31],'#153e51')}
        {Array.from({length:5},(_,index)=>box([0,.075,-l*.125+index*l*.062],[b*.4,.02,.035],'#82afb4'))}
      </group>)}
      {intelligent&&<mesh position={[0,d+3.9,aft]}><sphereGeometry args={[b*.3,20,12,0,Math.PI*2,0,Math.PI/2]}/><meshStandardMaterial color="#9cc5c6" metalness={.35} roughness={.25}/></mesh>}
      {(information||intelligent)&&<group ref={rotor} position={[0,d+4.4,aft]}>
        {box([0,.9,0],[.1,1.8,.1],roof)}{box([0,1.8,0],[b*.72,.28,.32],'#acc9c8')}
      </group>}
    </group>}
  </group>;
}
