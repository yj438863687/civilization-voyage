import { Suspense, useLayoutEffect } from 'react';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import media from './historyMedia.json';

/** 用真正的历史图片标识故事，避免给所有时代套同一个角色模型。 */
export function HistoryMarker({ image, completed = false }: { image: string; completed?: boolean }) {
  const item = (media as Record<string, { src: string }>)[image];
  if (!item) return null;
  return <Suspense fallback={null}><Portrait src={item.src} completed={completed} /></Suspense>;
}
function Portrait({ src, completed }: { src: string; completed: boolean }) {
  const texture = useTexture(src);
  useLayoutEffect(() => { texture.colorSpace = THREE.SRGBColorSpace; }, [texture]);
  const ratio = texture.image.width / texture.image.height;
  const width = Math.min(4.2, 3.8 * ratio), height = width / ratio;
  return <group>
    <mesh position={[0, 0.9, 0]}><cylinderGeometry args={[0.1, 0.14, 1.8, 8]} /><meshStandardMaterial color="#71543a" roughness={0.9} /></mesh>
    <mesh position={[0, 2.8, -0.05]}><boxGeometry args={[width + 0.24, height + 0.24, 0.16]} /><meshStandardMaterial color={completed ? '#728b65' : '#ad8443'} roughness={0.6} metalness={0.2} /></mesh>
    <mesh position={[0, 2.8, -0.15]} rotation={[0, Math.PI, 0]}><planeGeometry args={[width, height]} /><meshBasicMaterial map={texture} toneMapped={false} /></mesh>
    <mesh position={[0, 2.8, 0.05]}><planeGeometry args={[width, height]} /><meshBasicMaterial map={texture} side={THREE.DoubleSide} toneMapped={false} /></mesh>
  </group>;
}
