"use client"

import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { useMemo, useRef } from "react"
import * as THREE from "three"

/*
 * "Ink press": a monochrome fluid-noise field that the pointer pushes around, like ink
 * spreading under a roller. Our replacement for Aceternity's Pro shader blocks.
 * One full-screen quad, one render loop, demand-driven when idle.
 */

const vertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

const fragment = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float uTime;
uniform vec2 uPointer;
uniform vec2 uResolution;
uniform float uStrength;
uniform float uGrain;

// 2D simplex noise (Ashima Arts, MIT)
vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m; m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * snoise(p); p *= 2.02; a *= 0.5; }
  return v;
}

void main() {
  vec2 uv = vUv;
  float aspect = uResolution.x / uResolution.y;
  vec2 p = vec2(uv.x * aspect, uv.y);
  vec2 m = vec2(uPointer.x * aspect, uPointer.y);

  // Pointer displaces the field: a soft dent that drags the ink with it.
  vec2 d = p - m;
  float falloff = exp(-dot(d, d) * 9.0);
  p += normalize(d + 1e-4) * falloff * 0.18 * uStrength;

  float t = uTime * 0.06;
  vec2 q = vec2(fbm(p * 1.6 + t), fbm(p * 1.6 - t + 4.2));
  float n = fbm(p * 2.2 + q * 1.4 * uStrength + t);

  // Contour bands: ink lines on black, brighter near the pointer.
  float bands = abs(fract(n * 6.0) - 0.5) * 2.0;
  float ink = smoothstep(0.92, 1.0, 1.0 - bands) * (0.35 + 0.65 * falloff);
  float wash = smoothstep(-0.2, 0.9, n) * 0.08;
  float grain = (fract(sin(dot(uv * uResolution, vec2(12.9898, 78.233)) + uTime) * 43758.5453) - 0.5) * uGrain;

  float c = clamp(ink + wash + grain, 0.0, 1.0);
  gl_FragColor = vec4(vec3(c), 1.0);
}
`

function Plane({ strength }: { strength: number }) {
  const material = useRef<THREE.ShaderMaterial>(null)
  const pointer = useRef(new THREE.Vector2(0.5, 0.5))
  const target = useRef(new THREE.Vector2(0.5, 0.5))
  const { size } = useThree()
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPointer: { value: new THREE.Vector2(0.5, 0.5) },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uStrength: { value: strength },
      uGrain: { value: 0.06 },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- uniforms are created once; strength is synced each frame
    [],
  )

  useFrame((state, delta) => {
    const mat = material.current
    if (!mat) return
    // R3F reports the pointer in -1..1 over the canvas; the shader wants 0..1 uv.
    target.current.set((state.pointer.x + 1) / 2, (state.pointer.y + 1) / 2)
    pointer.current.lerp(target.current, Math.min(1, delta * 4))
    mat.uniforms.uTime.value += delta
    mat.uniforms.uPointer.value.copy(pointer.current)
    mat.uniforms.uResolution.value.set(size.width, size.height)
    mat.uniforms.uStrength.value += (strength - mat.uniforms.uStrength.value) * Math.min(1, delta * 3)
  })

  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial ref={material} vertexShader={vertex} fragmentShader={fragment} uniforms={uniforms} />
    </mesh>
  )
}

export default function InkPress({ strength = 0.6, className }: { strength?: number; className?: string }) {
  return (
    <Canvas
      className={className}
      dpr={[1, 1.75]}
      gl={{ antialias: false, alpha: false, powerPreference: "high-performance" }}
      frameloop="always"
      aria-hidden
    >
      <Plane strength={strength} />
    </Canvas>
  )
}
