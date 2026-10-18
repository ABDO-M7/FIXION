'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';

export type RobotExpression = 'normal' | 'happy' | 'blink' | 'wink' | 'thinking' | 'surprised';

interface RobotMascot3DProps {
  className?: string;
  width?: number | string;
  height?: number | string;
  interactive?: boolean;
  enableTracking?: boolean;
  enableFloating?: boolean;
  onRobotClick?: () => void;
  scale?: number;
  initialExpression?: RobotExpression;
  showShadow?: boolean;
}

export default function RobotMascot3D({
  className = '',
  width = '100%',
  height = '100%',
  interactive = true,
  enableTracking = true,
  enableFloating = true,
  onRobotClick,
  scale = 1.0,
  initialExpression = 'normal',
  showShadow = true,
}: RobotMascot3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [expression, setExpression] = useState<RobotExpression>(initialExpression);
  const [isWaving, setIsWaving] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // References for animation
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const animFrameRef = useRef<number>(0);
  const eyeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const eyeTextureRef = useRef<THREE.CanvasTexture | null>(null);
  const rightArmRef = useRef<THREE.Group | null>(null);
  const leftArmRef = useRef<THREE.Group | null>(null);
  const robotGroupRef = useRef<THREE.Group | null>(null);
  const blinkTimerRef = useRef<NodeJS.Timeout | null>(null);
  const waveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Draw expressive eyes onto 2D canvas texture
  const drawEyes = useCallback((expr: RobotExpression, lookX = 0, lookY = 0) => {
    const canvas = eyeCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Dark screen background
    ctx.fillStyle = '#060913';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Glowing cyan/sky neon eyes style
    const eyeColor = '#38bdf8';
    const glowColor = '#06b6d4';
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 24;
    ctx.fillStyle = eyeColor;

    const eyeW = 44;
    const eyeH = 68;
    const spacing = 46;
    const centerX = canvas.width / 2 + lookX * 18;
    const centerY = canvas.height / 2 + lookY * 14;

    const leftX = centerX - spacing - eyeW / 2;
    const rightX = centerX + spacing - eyeW / 2;

    if (expr === 'happy') {
      // Curved smiling arc eyes: ^ ^
      ctx.lineWidth = 14;
      ctx.strokeStyle = eyeColor;
      ctx.lineCap = 'round';

      // Left eye arc
      ctx.beginPath();
      ctx.arc(leftX + eyeW / 2, centerY + 8, 26, Math.PI * 1.15, Math.PI * 1.85, false);
      ctx.stroke();

      // Right eye arc
      ctx.beginPath();
      ctx.arc(rightX + eyeW / 2, centerY + 8, 26, Math.PI * 1.15, Math.PI * 1.85, false);
      ctx.stroke();

      // Cute cheek blush
      ctx.shadowBlur = 16;
      ctx.shadowColor = '#ec4899';
      ctx.fillStyle = 'rgba(236, 72, 153, 0.45)';
      ctx.beginPath();
      ctx.arc(leftX - 10, centerY + 30, 14, 0, Math.PI * 2);
      ctx.arc(rightX + eyeW + 10, centerY + 30, 14, 0, Math.PI * 2);
      ctx.fill();
    } else if (expr === 'blink') {
      // Closed horizontal eye slit
      ctx.lineWidth = 8;
      ctx.strokeStyle = eyeColor;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(leftX, centerY);
      ctx.lineTo(leftX + eyeW, centerY);
      ctx.moveTo(rightX, centerY);
      ctx.lineTo(rightX + eyeW, centerY);
      ctx.stroke();
    } else if (expr === 'wink') {
      // Left eye open, right eye closed
      ctx.beginPath();
      ctx.roundRect(leftX, centerY - eyeH / 2, eyeW, eyeH, 16);
      ctx.fill();

      ctx.lineWidth = 8;
      ctx.strokeStyle = eyeColor;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(rightX + eyeW / 2, centerY + 8, 22, Math.PI * 1.15, Math.PI * 1.85, false);
      ctx.stroke();
    } else if (expr === 'thinking') {
      // Eyes looking up with curious angle
      ctx.beginPath();
      ctx.roundRect(leftX, centerY - eyeH / 2 - 16, eyeW, eyeH * 0.85, 16);
      ctx.roundRect(rightX, centerY - eyeH / 2 - 16, eyeW, eyeH * 0.85, 16);
      ctx.fill();

      // Star sparkle near right eye
      ctx.fillStyle = '#fef08a';
      ctx.shadowColor = '#eab308';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(rightX + eyeW + 16, centerY - 28, 5, 0, Math.PI * 2);
      ctx.fill();
    } else if (expr === 'surprised') {
      // Big round wide eyes
      ctx.beginPath();
      ctx.arc(leftX + eyeW / 2, centerY, 32, 0, Math.PI * 2);
      ctx.arc(rightX + eyeW / 2, centerY, 32, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Normal rounded vertical eyes (from reference)
      ctx.beginPath();
      ctx.roundRect(leftX, centerY - eyeH / 2, eyeW, eyeH, 18);
      ctx.roundRect(rightX, centerY - eyeH / 2, eyeW, eyeH, 18);
      ctx.fill();

      // Tiny glossy inner highlights
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(leftX + 14, centerY - eyeH / 2 + 16, 5, 0, Math.PI * 2);
      ctx.arc(rightX + 14, centerY - eyeH / 2 + 16, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    if (eyeTextureRef.current) {
      eyeTextureRef.current.needsUpdate = true;
    }
  }, []);

  // Periodic blinking
  useEffect(() => {
    const triggerBlink = () => {
      setExpression('blink');
      setTimeout(() => {
        setExpression(isHovered ? 'happy' : 'normal');
      }, 160);

      const nextDelay = 2500 + Math.random() * 4000;
      blinkTimerRef.current = setTimeout(triggerBlink, nextDelay);
    };

    blinkTimerRef.current = setTimeout(triggerBlink, 3000);
    return () => {
      if (blinkTimerRef.current) clearTimeout(blinkTimerRef.current);
    };
  }, [isHovered]);

  // Update eyes when expression changes
  useEffect(() => {
    drawEyes(expression, mouseRef.current.x, mouseRef.current.y);
  }, [expression, drawEyes]);

  // Trigger wave animation
  const wave = useCallback(() => {
    setIsWaving(true);
    setExpression('happy');
    if (waveTimerRef.current) clearTimeout(waveTimerRef.current);
    waveTimerRef.current = setTimeout(() => {
      setIsWaving(false);
      setExpression('normal');
    }, 1800);
  }, []);

  // Main Three.js Scene Setup
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // Dimensions
    const widthPx = mount.clientWidth || 320;
    const heightPx = mount.clientHeight || 320;

    // Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, widthPx / heightPx, 0.1, 100);
    camera.position.set(0, 0.2, 5.2);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(widthPx, heightPx);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    // Create 2D eye canvas
    const eyeCanvas = document.createElement('canvas');
    eyeCanvas.width = 512;
    eyeCanvas.height = 512;
    eyeCanvasRef.current = eyeCanvas;
    const eyeTexture = new THREE.CanvasTexture(eyeCanvas);
    eyeTextureRef.current = eyeTexture;
    drawEyes('normal', 0, 0);

    // --- MATERIALS ---
    // Premium glossy ceramic white shell (from reference)
    const whiteShellMat = new THREE.MeshPhysicalMaterial({
      color: 0xf3f5fb,
      roughness: 0.12,
      metalness: 0.08,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
    });

    // Dark headphone frame material
    const darkBandMat = new THREE.MeshPhysicalMaterial({
      color: 0x1b2333,
      roughness: 0.25,
      metalness: 0.7,
      clearcoat: 0.4,
    });

    // Dark glossy glass face visor
    const visorGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0x060913,
      map: eyeTexture,
      roughness: 0.05,
      metalness: 0.3,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
    });

    // Glowing Neon Gradient Texture for the Halo Ring
    const haloCanvas = document.createElement('canvas');
    haloCanvas.width = 512;
    haloCanvas.height = 128;
    const haloCtx = haloCanvas.getContext('2d')!;
    const grad = haloCtx.createLinearGradient(0, 0, 512, 0);
    grad.addColorStop(0.0, '#ec4899'); // Neon Pink
    grad.addColorStop(0.25, '#d946ef'); // Purple
    grad.addColorStop(0.5, '#6366f1'); // Indigo (FIXION brand)
    grad.addColorStop(0.75, '#06b6d4'); // Cyan
    grad.addColorStop(1.0, '#38bdf8'); // Sky Blue
    haloCtx.fillStyle = grad;
    haloCtx.fillRect(0, 0, 512, 128);

    const haloTexture = new THREE.CanvasTexture(haloCanvas);
    const neonHaloMat = new THREE.MeshStandardMaterial({
      map: haloTexture,
      emissive: 0xffffff,
      emissiveMap: haloTexture,
      emissiveIntensity: 1.3,
      roughness: 0.2,
      metalness: 0.1,
    });

    // Cyan glowing ring material
    const cyanGlowMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x06b6d4,
      emissiveIntensity: 1.8,
      roughness: 0.2,
    });

    // Magenta glowing ring material
    const pinkGlowMat = new THREE.MeshStandardMaterial({
      color: 0xec4899,
      emissive: 0xec4899,
      emissiveIntensity: 1.8,
      roughness: 0.2,
    });

    // --- 3D ROBOT HIERARCHY ---
    const robotRoot = new THREE.Group();
    robotRoot.scale.set(scale, scale, scale);
    scene.add(robotRoot);
    robotGroupRef.current = robotRoot;

    // --- MAIN HEAD / TORSO POD ---
    const headGroup = new THREE.Group();
    robotRoot.add(headGroup);

    // Body sphere / pod
    const bodyGeo = new THREE.SphereGeometry(1.0, 48, 48);
    // Slight vertical oval elongation like reference
    bodyGeo.scale(1.02, 1.14, 0.98);
    const bodyMesh = new THREE.Mesh(bodyGeo, whiteShellMat);
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    headGroup.add(bodyMesh);

    // Inset Face Screen (Visor)
    const visorGeo = new THREE.CircleGeometry(0.72, 48);
    visorGeo.scale(0.96, 1.04, 1.0);
    const visorMesh = new THREE.Mesh(visorGeo, visorGlassMat);
    visorMesh.position.set(0, 0.05, 0.88);
    visorMesh.rotation.x = -0.06;
    headGroup.add(visorMesh);

    // Outer Neon Halo Ring (Torus around face)
    const haloGeo = new THREE.TorusGeometry(0.77, 0.065, 24, 64);
    haloGeo.scale(0.96, 1.05, 1.0);
    const haloMesh = new THREE.Mesh(haloGeo, neonHaloMat);
    haloMesh.position.set(0, 0.05, 0.87);
    haloMesh.rotation.x = -0.06;
    headGroup.add(haloMesh);

    // --- HEADPHONE ACCESSORY ---
    // Overhead headband
    const bandGeo = new THREE.TorusGeometry(1.08, 0.06, 16, 48, Math.PI * 0.92);
    const bandMesh = new THREE.Mesh(bandGeo, darkBandMat);
    bandMesh.position.set(0, 0.32, -0.06);
    bandMesh.rotation.z = Math.PI * 0.04;
    bandMesh.rotation.x = -0.15;
    headGroup.add(bandMesh);

    // Top padded cushion strip
    const cushionGeo = new THREE.TorusGeometry(1.04, 0.035, 12, 32, Math.PI * 0.55);
    const cushionMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 });
    const cushionMesh = new THREE.Mesh(cushionGeo, cushionMat);
    cushionMesh.position.set(0, 0.35, -0.06);
    cushionMesh.rotation.z = Math.PI * 0.225;
    cushionMesh.rotation.x = -0.15;
    headGroup.add(cushionMesh);

    // Ear cups builder
    const createEarCup = (isLeft: boolean) => {
      const earGroup = new THREE.Group();
      const xSign = isLeft ? -1 : 1;
      earGroup.position.set(xSign * 1.02, 0.22, -0.06);
      earGroup.rotation.y = isLeft ? Math.PI / 2 : -Math.PI / 2;
      earGroup.rotation.z = isLeft ? 0.08 : -0.08;

      // Outer cup shell
      const cupGeo = new THREE.CylinderGeometry(0.28, 0.32, 0.14, 32);
      const cupMesh = new THREE.Mesh(cupGeo, darkBandMat);
      cupMesh.rotation.x = Math.PI / 2;
      earGroup.add(cupMesh);

      // Glowing LED center disc
      const ledGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.03, 24);
      const ledMesh = new THREE.Mesh(ledGeo, cyanGlowMat);
      ledMesh.position.z = 0.08;
      ledMesh.rotation.x = Math.PI / 2;
      earGroup.add(ledMesh);

      // Inner ear cushion
      const padGeo = new THREE.CylinderGeometry(0.31, 0.29, 0.06, 32);
      const padMesh = new THREE.Mesh(padGeo, cushionMat);
      padMesh.position.z = -0.09;
      padMesh.rotation.x = Math.PI / 2;
      earGroup.add(padMesh);

      return earGroup;
    };

    headGroup.add(createEarCup(true));
    headGroup.add(createEarCup(false));

    // --- FLOATING LIMBS ---
    // Floating Arms
    const createArm = (isRight: boolean) => {
      const armRoot = new THREE.Group();
      const xSign = isRight ? 1 : -1;
      armRoot.position.set(xSign * 1.14, -0.36, 0.12);

      // Shoulder float pivot
      const armPivot = new THREE.Group();
      armRoot.add(armPivot);

      // Tapered cute arm capsule
      const armGeo = new THREE.CapsuleGeometry(0.18, 0.38, 16, 24);
      const armMesh = new THREE.Mesh(armGeo, whiteShellMat);
      armMesh.position.set(0, -0.18, 0);
      armMesh.rotation.z = xSign * -0.22;
      armMesh.rotation.x = 0.15;
      armMesh.castShadow = true;
      armPivot.add(armMesh);

      // Glowing cuff ring near hand (pink on right, cyan on left - matches reference)
      const cuffGeo = new THREE.TorusGeometry(0.17, 0.025, 16, 32);
      const cuffMesh = new THREE.Mesh(cuffGeo, isRight ? pinkGlowMat : cyanGlowMat);
      cuffMesh.position.set(xSign * 0.06, -0.38, 0.05);
      cuffMesh.rotation.x = Math.PI / 2;
      armPivot.add(cuffMesh);

      // Cute robotic hand/fingers
      const handGeo = new THREE.SphereGeometry(0.13, 20, 20);
      handGeo.scale(1.0, 0.85, 0.9);
      const handMesh = new THREE.Mesh(handGeo, whiteShellMat);
      handMesh.position.set(xSign * 0.08, -0.46, 0.08);
      armPivot.add(handMesh);

      return { root: armRoot, pivot: armPivot };
    };

    const leftArm = createArm(false);
    const rightArm = createArm(true);
    headGroup.add(leftArm.root);
    headGroup.add(rightArm.root);
    leftArmRef.current = leftArm.pivot;
    rightArmRef.current = rightArm.pivot;

    // Floating Cute Legs & Feet
    const createLeg = (isRight: boolean) => {
      const legGroup = new THREE.Group();
      const xSign = isRight ? 1 : -1;
      legGroup.position.set(xSign * 0.44, -1.05, -0.05);

      // Thigh socket
      const socketGeo = new THREE.SphereGeometry(0.15, 16, 16);
      const socketMesh = new THREE.Mesh(socketGeo, darkBandMat);
      legGroup.add(socketMesh);

      // Floating pod leg
      const legGeo = new THREE.CapsuleGeometry(0.24, 0.42, 16, 24);
      const legMesh = new THREE.Mesh(legGeo, whiteShellMat);
      legMesh.position.set(xSign * 0.04, -0.32, 0.18);
      legMesh.rotation.x = -0.45;
      legMesh.rotation.z = xSign * -0.15;
      legMesh.castShadow = true;
      legGroup.add(legMesh);

      // Glowing ankle ring (pink/cyan)
      const ringGeo = new THREE.TorusGeometry(0.23, 0.03, 16, 32);
      const ringMesh = new THREE.Mesh(ringGeo, isRight ? pinkGlowMat : cyanGlowMat);
      ringMesh.position.set(xSign * 0.08, -0.52, 0.32);
      ringMesh.rotation.x = -0.45;
      legGroup.add(ringMesh);

      // Floating cute flat foot
      const footGeo = new THREE.CylinderGeometry(0.23, 0.23, 0.08, 24);
      const footMesh = new THREE.Mesh(footGeo, whiteShellMat);
      footMesh.position.set(xSign * 0.09, -0.58, 0.36);
      footMesh.rotation.x = -0.45;
      legGroup.add(footMesh);

      return legGroup;
    };

    headGroup.add(createLeg(false));
    headGroup.add(createLeg(true));

    // Ground Shadow Plate (soft realistic hover shadow)
    if (showShadow) {
      const shadowGeo = new THREE.PlaneGeometry(2.4, 2.4);
      const shadowCanvas = document.createElement('canvas');
      shadowCanvas.width = 128;
      shadowCanvas.height = 128;
      const sCtx = shadowCanvas.getContext('2d')!;
      const sGrad = sCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
      sGrad.addColorStop(0, 'rgba(0, 0, 0, 0.38)');
      sGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0.12)');
      sGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      sCtx.fillStyle = sGrad;
      sCtx.fillRect(0, 0, 128, 128);

      const shadowTex = new THREE.CanvasTexture(shadowCanvas);
      const shadowMat = new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        depthWrite: false,
      });
      const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
      shadowMesh.position.set(0, -1.95, 0);
      shadowMesh.rotation.x = -Math.PI / 2;
      robotRoot.add(shadowMesh);
    }

    // --- LIGHTING ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
    scene.add(ambientLight);

    // Warm key directional light
    const keyLight = new THREE.DirectionalLight(0xfff8ee, 1.8);
    keyLight.position.set(2.5, 4, 3.5);
    keyLight.castShadow = true;
    scene.add(keyLight);

    // Cool Cyan fill light
    const cyanLight = new THREE.PointLight(0x06b6d4, 2.5, 6);
    cyanLight.position.set(-2, 1, 2);
    scene.add(cyanLight);

    // Magenta/Purple rim light from right rear
    const purpleLight = new THREE.PointLight(0xc084fc, 2.2, 6);
    purpleLight.position.set(2, 0.5, -2);
    scene.add(purpleLight);

    // Front soft light to highlight face visor
    const faceLight = new THREE.PointLight(0x38bdf8, 1.2, 3);
    faceLight.position.set(0, 0.2, 2.2);
    scene.add(faceLight);

    // --- MOUSE TRACKING LISTENER ---
    const handleMouseMove = (e: MouseEvent) => {
      if (!enableTracking) return;
      const rect = mount.getBoundingClientRect();
      const clientX = e.clientX;
      const clientY = e.clientY;

      // Normalized coordinates (-1 to 1) relative to window or element
      const x = ((clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((clientY - rect.top) / rect.height) * 2 - 1);

      mouseRef.current.targetX = Math.max(-1.5, Math.min(1.5, x));
      mouseRef.current.targetY = Math.max(-1.5, Math.min(1.5, y));
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // Handle Resize
    const handleResize = () => {
      if (!mount) return;
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // --- ANIMATION LOOP ---
    let clock = new THREE.Clock();

    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      const time = clock.getElapsedTime();

      // Smooth mouse lerping
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.06;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.06;

      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      // Floating hover bobbing
      if (enableFloating) {
        headGroup.position.y = Math.sin(time * 2.2) * 0.08;
        headGroup.position.x = Math.sin(time * 1.4) * 0.02;
        headGroup.rotation.z = Math.sin(time * 1.6) * 0.025;
      }

      // Head & Torso tracking mouse
      headGroup.rotation.y = THREE.MathUtils.lerp(headGroup.rotation.y, mx * 0.42, 0.08);
      headGroup.rotation.x = THREE.MathUtils.lerp(headGroup.rotation.x, -my * 0.28, 0.08);

      // Arm animations
      if (leftArmRef.current) {
        leftArmRef.current.rotation.x = Math.sin(time * 2.2 + 0.5) * 0.08;
        leftArmRef.current.rotation.z = Math.cos(time * 1.8) * 0.05;
      }

      if (rightArmRef.current) {
        if (isWaving) {
          // Waving motion!
          rightArmRef.current.rotation.z = -1.4 + Math.sin(time * 14) * 0.45;
          rightArmRef.current.rotation.x = -0.3 + Math.cos(time * 14) * 0.2;
        } else {
          // Subtle idle floating sway
          rightArmRef.current.rotation.x = Math.sin(time * 2.2) * 0.08;
          rightArmRef.current.rotation.z = -Math.cos(time * 1.8) * 0.05;
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (mount && renderer.domElement) {
        mount.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [scale, showShadow, enableFloating, enableTracking, isWaving, drawEyes]);

  return (
    <div
      ref={mountRef}
      className={`robot-mascot-container ${className}`}
      style={{
        width,
        height,
        position: 'relative',
        cursor: interactive ? 'pointer' : 'default',
        touchAction: 'none',
      }}
      onClick={() => {
        if (interactive) {
          wave();
          if (onRobotClick) onRobotClick();
        }
      }}
      onMouseEnter={() => {
        setIsHovered(true);
        setExpression('happy');
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        setExpression('normal');
      }}
    />
  );
}
