'use client';

import { useEffect, useRef } from 'react';
import { Renderer, Program, Mesh, Triangle } from 'ogl';

type GradientWavesProps = {
  horizonColor?: string;
  waveColor?: string;
  crestColor?: string;
  speed?: number;
  amplitude?: number;
  opacity?: number;
};

const hexToRgb = (hex: string) => {
  const value = hex.replace('#', '');
  const normalized = value.length === 3 ? value.split('').map((char) => char + char).join('') : value;
  return [0, 2, 4].map((index) => parseInt(normalized.slice(index, index + 2), 16) / 255);
};

export default function GradientWaves({
  horizonColor = '#06101b',
  waveColor = '#1769ff',
  crestColor = '#25d6d1',
  speed = 0.18,
  amplitude = 1.5,
  opacity = 0.72,
}: GradientWavesProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const renderer = new Renderer({ alpha: true, antialias: true, dpr: Math.min(window.devicePixelRatio, 2) });
    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);
    container.appendChild(gl.canvas);

    const vertex = /* glsl */ `#version 300 es
      in vec2 position;
      void main() { gl_Position = vec4(position, 0.0, 1.0); }
    `;
    const fragment = /* glsl */ `#version 300 es
      precision highp float;
      uniform float uTime;
      uniform vec2 uResolution;
      uniform vec3 uHorizon;
      uniform vec3 uWave;
      uniform vec3 uCrest;
      uniform float uAmplitude;
      uniform float uOpacity;
      out vec4 outColor;

      float wave(vec2 p, float t, float offset, float frequency, float strength) {
        float x = p.x * frequency + offset;
        return sin(x + t * (0.55 + frequency * 0.08)) * strength
          + sin(x * 1.7 - t * 0.42) * strength * 0.34;
      }

      void main() {
        vec2 uv = gl_FragCoord.xy / uResolution.xy;
        float aspect = uResolution.x / uResolution.y;
        vec2 p = vec2((uv.x - 0.5) * aspect, uv.y);
        float t = uTime * 0.45;
        float horizon = 0.28;
        float field = 0.0;
        field += wave(p, t, 0.0, 2.7, 0.085 * uAmplitude);
        field += wave(p, t, 2.2, 5.2, 0.035 * uAmplitude);
        float y = horizon + field + (1.0 - uv.x) * 0.06;
        float band = smoothstep(0.0, 0.18, y - uv.y);
        float foam = smoothstep(0.018, 0.0, abs(uv.y - y));
        float glow = smoothstep(0.32, 0.0, abs(uv.y - y)) * 0.3;
        vec3 color = mix(uHorizon, uWave, smoothstep(0.0, 0.88, uv.y));
        color = mix(color, uWave, band * 0.35);
        color = mix(color, uCrest, clamp(foam + glow, 0.0, 1.0));
        float vignette = smoothstep(1.25, 0.18, length(vec2((uv.x - 0.5) * 1.15, uv.y - 0.38)));
        outColor = vec4(color, uOpacity * band * vignette);
      }
    `;

    const program = new Program(gl, {
      vertex,
      fragment,
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: [1, 1] },
        uHorizon: { value: hexToRgb(horizonColor) },
        uWave: { value: hexToRgb(waveColor) },
        uCrest: { value: hexToRgb(crestColor) },
        uAmplitude: { value: amplitude },
        uOpacity: { value: opacity },
      },
    });
    const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });
    let frame = 0;
    let running = true;
    const resize = () => {
      const width = container.clientWidth || window.innerWidth;
      const height = container.clientHeight || window.innerHeight;
      renderer.setSize(width, height);
      program.uniforms.uResolution.value = [width, height];
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const render = (time: number) => {
      if (!running) return;
      program.uniforms.uTime.value = reduceMotion ? 0 : time * 0.001 * speed;
      renderer.render({ scene: mesh });
      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);

    return () => {
      running = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      gl.canvas.remove();
    };
  }, [amplitude, crestColor, horizonColor, opacity, speed, waveColor]);

  return <div ref={containerRef} className="gradient-waves" aria-hidden="true" />;
}
