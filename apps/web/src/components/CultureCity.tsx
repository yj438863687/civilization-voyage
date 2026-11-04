import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useRef } from 'react';
import type { Group } from 'three';
import { cityPlan, type DemoPriority } from '../world/presentationDemo';

export type CityStyle='ancient'|'modern'|'future';
function Building({x,z,kind,built,style,active,onInspect}:{x:number;z:number;kind:string;built:boolean;style:CityStyle;active:boolean;onInspect:(kind:string)=>void}){
  const group=useRef<Group>(null),height=kind==='学堂'?1.5:kind==='工坊'?1.2:.85;
  useFrame((_,dt)=>{if(group.current){const goal=built?1:.16;group.current.scale.y+=(goal-group.current.scale.y)*(1-Math.exp(-Math.min(dt,.05)*7));}});
  const storey=height*(style==='future'?1.6:1);
  const color=active?'#e7bf75':kind==='住屋'?'#c7b491':kind==='学堂'?'#e3dcc5':kind==='仓库'?'#9a754c':'#859d94';
  return <group ref={group} position={[x,.2,z]} onClick={event=>{event.stopPropagation();onInspect(kind);}}>
    <mesh position={[0,storey/2,0]} castShadow><boxGeometry args={[1.35,storey,1.25]}/><meshStandardMaterial color={color} transparent opacity={built?1:.4}/></mesh>
    {style==='ancient'?<mesh position={[0,storey+.28,0]} rotation={[0,Math.PI/4,0]} castShadow><coneGeometry args={[1.13,.65,4]}/><meshStandardMaterial color={kind==='学堂'?'#713d32':'#425b55'}/></mesh>:<mesh position={[0,storey+.07,0]}><boxGeometry args={[1.5,.15,1.4]}/><meshStandardMaterial color={style==='future'?'#9bd9d9':'#4e696f'} emissive={style==='future'?'#335e7a':'#000000'} emissiveIntensity={.7}/></mesh>}
    <mesh position={[0,.35,.632]}><boxGeometry args={[.42,.52,.03]}/><meshStandardMaterial color="#d3b77d" emissive={style==='future'?'#72c4ce':'#17130b'} emissiveIntensity={.5}/></mesh>
  </group>;
}
export function CultureCityBuildings({priority,style,selected='',onInspect=()=>{}}:{priority:DemoPriority;style:CityStyle;selected?:string;onInspect?:(kind:string)=>void}){
  const plan=cityPlan(priority),buildings=[...Array(plan.warehouses).fill('仓库'),...Array(plan.workshops).fill('工坊'),...Array(plan.schools).fill('学堂'),...Array(plan.homes).fill('住屋')];
  return <group name="player-built-civilization" userData={{priority,style}}>
    {[0,...(plan.canals>1?[1]:[])].map(index=><mesh key={index} position={[-5.55+index*11.1,.185,0]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[.65,10]}/><meshStandardMaterial color="#7ab7bc" metalness={.3} roughness={.3}/></mesh>)}
    <mesh position={[0,.2,1.4]}><boxGeometry args={[11,.04,.55]}/><meshStandardMaterial color="#d5c29a"/></mesh>
    {buildings.map((kind,index)=><Building key={`${index}-${kind}`} x={-4.3+(index%5)*2.1} z={-3.4+Math.floor(index/5)*3.1} kind={kind} built style={style} active={selected===kind} onInspect={onInspect}/>)}
  </group>;
}
function City({priority,built,style,selected,onInspect}:{priority:DemoPriority;built:boolean;style:CityStyle;selected:string;onInspect:(kind:string)=>void}){
  const plan=cityPlan(priority),buildings=[...Array(plan.warehouses).fill('仓库'),...Array(plan.workshops).fill('工坊'),...Array(plan.schools).fill('学堂'),...Array(plan.homes).fill('住屋')];
  return <>
    <color attach="background" args={[style==='future'?'#101e34':'#193b40']}/><ambientLight intensity={1.8}/><directionalLight position={[6,12,7]} intensity={3} color="#ffdfab"/>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.4,0]}><planeGeometry args={[40,40]}/><meshStandardMaterial color={style==='future'?'#153c54':'#315c65'} roughness={.45}/></mesh>
    <mesh position={[0,-.08,0]} receiveShadow><boxGeometry args={[12,.5,10]}/><meshStandardMaterial color={style==='future'?'#3a5860':'#8d9f75'}/></mesh>
    {[0,...(plan.canals>1?[1]:[])].map(index=><mesh key={index} position={[-5.55+index*11.1,.185,0]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[.65,10]}/><meshStandardMaterial color="#7ab7bc" metalness={.3} roughness={.3}/></mesh>)}
    <mesh position={[0,.2,1.4]}><boxGeometry args={[11,.04,.55]}/><meshStandardMaterial color="#d5c29a"/></mesh>
    {buildings.map((kind,index)=><Building key={`${index}-${kind}`} x={-4.3+(index%5)*2.1} z={-3.4+Math.floor(index/5)*3.1} kind={kind} built={built} style={style} active={selected===kind} onInspect={onInspect}/>)}
    <mesh position={[0,.2,5.7]}><boxGeometry args={[5,.25,1.7]}/><meshStandardMaterial color="#8d7250"/></mesh>
    <group position={[.5,.15,7.5]}><mesh><boxGeometry args={[1.2,.5,2.4]}/><meshStandardMaterial color="#795938"/></mesh><mesh position={[0,1.2,0]}><cylinderGeometry args={[.04,.06,2,6]}/><meshStandardMaterial color="#c7ab6a"/></mesh><mesh position={[.45,1.5,0]}><planeGeometry args={[.85,1.15]}/><meshStandardMaterial color="#d8bc83" side={2}/></mesh></group>
    <OrbitControls enablePan={false} minDistance={10} maxDistance={30} maxPolarAngle={Math.PI*.47}/>
  </>;
}
export function CultureCity({priority,built,style,selected,onInspect}:{priority:DemoPriority;built:boolean;style:CityStyle;selected:string;onInspect:(kind:string)=>void}){
  return <div className="demo-city" data-built={built} data-style={style} role="img" aria-label={`${built?'已建成':'待批准的'}港城，${cityPlan(priority).label}。可拖动转动，点建筑查看。`}><Canvas dpr={[1,1.3]} camera={{position:[13,13,16],fov:38}}><City priority={priority} built={built} style={style} selected={selected} onInspect={onInspect}/></Canvas><p>{built?'你已批准的港城':'方案预览 · 等待船长批准'} · 拖动转动，点建筑查看</p></div>;
}
