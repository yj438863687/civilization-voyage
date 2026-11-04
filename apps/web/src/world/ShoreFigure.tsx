import { HistoryMarker } from './HistoryMarker';
import { Figure as Human } from './Figure';
import type { Figure } from './stories';

/**
 * 岸上的人：每条航线的终点站着一个真正改变过那个时代的人。
 */
/** 码头上的那个人：比船员高一点，有一盏灯照着，面朝来船 */
export function ShoreFigure({
  figure,
  at,
  face,
  reduceMotion,
}: {
  figure: Figure;
  at: { x: number; z: number };
  face: number;
  reduceMotion: boolean;
}) {
  return (
    <group position={[at.x, 0.68, at.z]} rotation={[0, face, 0]}>
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[1.1, 1.2, 0.24, 18]} />
        <meshStandardMaterial color="#4a4238" roughness={0.9} />
      </mesh>
      <group position={[0, 0.24, 0]} scale={1.9}>
        {figure.image ? <HistoryMarker image={figure.image} completed /> : <Human look={figure.look} reduceMotion={reduceMotion} phase={2.2} />}
      </group>
      {/* 一盏立灯：远远就看见岸上站着一个人 */}
      <mesh position={[1.3, 1.6, 0.3]}>
        <cylinderGeometry args={[0.05, 0.06, 3.2, 6]} />
        <meshStandardMaterial color="#2a2118" />
      </mesh>
      <mesh position={[1.3, 3.3, 0.3]}>
        <sphereGeometry args={[0.24, 12, 10]} />
        <meshStandardMaterial color="#fff1d0" emissive="#ffcf8a" emissiveIntensity={3} toneMapped={false} />
      </mesh>
      <pointLight position={[1.0, 3.4, 1.2]} color="#ffcf8a" intensity={8} distance={12} decay={2} />
    </group>
  );
}
