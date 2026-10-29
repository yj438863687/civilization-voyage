import { useFrame } from '@react-three/fiber';
import { useMemo } from 'react';
import * as THREE from 'three';
import { WORLD } from './world.config';

function cssVar(name: string, fallback: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

function hex(name: string, fallback: string) {
  return new THREE.Color(cssVar(name, fallback));
}

const WATER_VERT = /* glsl */ `
uniform float uTime;
uniform float uReduce;
varying vec3 vWorld;
varying float vWave;
void main() {
  vec3 p = position;
  float t = uTime * (1.0 - uReduce);
  float w1 = sin(p.x * 0.11 + t * 0.65) * 0.16;
  float w2 = sin(p.z * 0.085 + t * 0.48) * 0.12;
  float w3 = sin((p.x + p.z) * 0.19 + t * 0.95) * 0.05;
  vWave = (w1 + w2 + w3) * (1.0 - uReduce);
  p.y += vWave;
  vec4 world = modelMatrix * vec4(p, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const WATER_FRAG = /* glsl */ `
uniform vec3 uDeep;
uniform vec3 uShallow;
uniform vec3 uFog;
uniform vec3 uSpec;
uniform vec3 uLightDir;
uniform float uFogNear;
uniform float uFogFar;
varying vec3 vWorld;
varying float vWave;
void main() {
  vec3 view = normalize(cameraPosition - vWorld);
  float fres = pow(1.0 - max(dot(view, vec3(0.0, 1.0, 0.0)), 0.0), 2.4);
  vec3 col = mix(uDeep, uShallow, clamp(0.35 + fres * 0.55 + vWave * 1.8, 0.0, 1.0));
  float spec = pow(max(dot(normalize(view + uLightDir), vec3(0.0, 1.0, 0.0)), 0.0), 48.0);
  col += uSpec * spec * 0.55;
  float foam = smoothstep(0.12, 0.2, vWave);
  col = mix(col, vec3(0.78, 0.86, 0.88), foam * 0.28);
  float dist = length(cameraPosition - vWorld);
  float fogF = clamp((dist - uFogNear) / max(uFogFar - uFogNear, 0.001), 0.0, 1.0);
  col = mix(col, uFog, fogF);
  gl_FragColor = vec4(col, 1.0);
}
`;

const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const SKY_FRAG = /* glsl */ `
uniform vec3 uTop;
uniform vec3 uHorizon;
uniform vec3 uNadir;
varying vec3 vDir;
void main() {
  float h = normalize(vDir).y;
  vec3 col = mix(uHorizon, uTop, smoothstep(0.0, 0.62, h));
  col = mix(uNadir, col, smoothstep(-0.15, 0.04, h));
  float moon = pow(max(dot(normalize(vDir), normalize(vec3(-0.25, 0.42, 0.4))), 0.0), 80.0);
  col += vec3(0.85, 0.9, 1.0) * moon * 0.55;
  gl_FragColor = vec4(col, 1.0);
}
`;

export function Atmosphere({ test, reduceMotion }: { test: boolean; reduceMotion: boolean }) {
  const water = useMemo(() => {
    const deep = hex('--cv-scene-water', '#123039');
    const fog = hex('--cv-scene-fog', '#1c3139');
    const spec = hex('--cv-scene-light', '#f1d9a8');
    const shallow = deep.clone().lerp(new THREE.Color('#7eacb2'), 0.62);
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uReduce: { value: reduceMotion ? 1 : 0 },
        uDeep: { value: deep },
        uShallow: { value: shallow },
        uFog: { value: fog },
        uSpec: { value: spec },
        uLightDir: { value: new THREE.Vector3(0.35, 0.82, 0.28).normalize() },
        uFogNear: { value: 55 },
        uFogFar: { value: 170 },
      },
      vertexShader: WATER_VERT,
      fragmentShader: WATER_FRAG,
    });
  }, [reduceMotion]);

  const sky = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTop: { value: hex('--cv-scene-sky-top', '#0d1a20') },
        uHorizon: { value: hex('--cv-scene-sky-horizon', '#2b4650') },
        uNadir: { value: hex('--cv-scene-water', '#123039') },
      },
      vertexShader: SKY_VERT,
      fragmentShader: SKY_FRAG,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    });
  }, []);

  const waterGeo = useMemo(() => {
    const g = new THREE.PlaneGeometry(220, 220, 96, 96);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);

  useFrame((_, dt) => {
    water.uniforms.uTime.value += dt;
    water.uniforms.uReduce.value = reduceMotion ? 1 : 0;
  });

  return (
    <group>
      <mesh material={sky}>
        <sphereGeometry args={[170, 24, 16]} />
      </mesh>
      <mesh geometry={waterGeo} material={water} />
      <mesh position={[-40, 38, -50]}>
        <sphereGeometry args={[4.5, 16, 12]} />
        <meshBasicMaterial color={cssVar('--cv-ship-lamp-cool', '#8fb6c8')} fog={false} />
      </mesh>
      {test ? <gridHelper args={[140, 18, '#2c383c', '#1c2427']} position={[0, 0.03, 0]} /> : null}
      {WORLD.ports.map((p) => (
        <group key={p.id} position={[p.x, 0, p.z]}>
          <mesh position={[0, 0.45, 0]}>
            <boxGeometry args={[16, 0.9, 12]} />
            <meshStandardMaterial color="#5c6164" roughness={0.92} />
          </mesh>
          <mesh position={[0, 2.4, -2.4]}>
            <boxGeometry args={[7.5, 3.0, 4.6]} />
            <meshStandardMaterial color="#6a6e70" roughness={0.88} />
          </mesh>
          <mesh position={[8.2, 0.28, 2]}>
            <boxGeometry args={[6.4, 0.4, 2.2]} />
            <meshStandardMaterial color="#4e5356" roughness={0.9} />
          </mesh>
          {[ -4, -1, 2, 5 ].map((x) => (
            <group key={x} position={[x, 0, 4.5]}>
              <mesh position={[0, 4, 0]}>
                <cylinderGeometry args={[0.07, 0.09, 8, 6]} />
                <meshStandardMaterial color="#c9a15a" roughness={0.4} metalness={0.6} />
              </mesh>
              <mesh position={[0, 8.1, 0]}>
                <sphereGeometry args={[0.14, 8, 8]} />
                <meshStandardMaterial
                  color={cssVar('--cv-ship-lamp-core', '#ffd9a0')}
                  emissive={cssVar('--cv-ship-lamp-warm', '#f0b46a')}
                  emissiveIntensity={1.4}
                />
              </mesh>
            </group>
          ))}
          <mesh position={[0.8, 7.5, -2.2]}>
            <planeGeometry args={[1.6, 1.1]} />
            <meshStandardMaterial color="#c9a15a" side={THREE.DoubleSide} roughness={0.7} />
          </mesh>
        </group>
      ))}
      {WORLD.fragments.map((f) => (
        <group key={f.id} position={[f.x, 0, f.z]}>
          <mesh position={[0, 1.5, 0]}>
            <boxGeometry args={[0.08, 3.0, 0.08]} />
            <meshStandardMaterial color="#b3bdc1" roughness={0.5} />
          </mesh>
          <mesh position={[0.45, 2.3, 0]} rotation={[0, 0.4, 0]}>
            <planeGeometry args={[1.4, 0.9]} />
            <meshStandardMaterial color="#e8dcc6" side={THREE.DoubleSide} roughness={0.8} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
