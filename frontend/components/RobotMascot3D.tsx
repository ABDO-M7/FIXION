'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';

export type MascotExpression = 'normal' | 'wink' | 'excited' | 'thinking' | 'blink';

interface FixionMascotProps {
  className?: string;
  width?: number | string;
  height?: number | string;
  interactive?: boolean;
  enableTracking?: boolean;
  enableFloating?: boolean;
  onMascotClick?: () => void;
  scale?: number;
  initialExpression?: MascotExpression;
  showShadow?: boolean;
  showThrusterLight?: boolean;
}

export default function RobotMascot3D({
  className = '',
  width = '100%',
  height = '100%',
  interactive = true,
  enableTracking = true,
  enableFloating = true,
  onMascotClick,
  scale = 1.0,
  initialExpression = 'normal',
  showShadow = true,
  showThrusterLight = true,
}: FixionMascotProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [expression, setExpression] = useState<MascotExpression>(initialExpression);
  const [isHovered, setIsHovered] = useState(false);
  const [isJumping, setIsJumping] = useState(false);

  // References for animation loop
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const animFrameRef = useRef<number>(0);
  const eyeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const eyeTextureRef = useRef<THREE.CanvasTexture | null>(null);
  const rightArmRef = useRef<THREE.Group | null>(null);
  const leftArmRef = useRef<THREE.Group | null>(null);
  const headGroupRef = useRef<THREE.Group | null>(null);
  const bodyGroupRef = useRef<THREE.Group | null>(null);
  const haloRingRef = useRef<THREE.Mesh | null>(null);
  const robotRootRef = useRef<THREE.Group | null>(null);
  const blinkTimerRef = useRef<NodeJS.Timeout | null>(null);
  const jumpTimeRef = useRef<number>(0);

  // Draw expressive Fixion mascot digital eyes onto 2D canvas texture
  const drawFace = useCallback((expr: MascotExpression, lookX = 0, lookY = 0) => {
    const canvas = eyeCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Deep glossy navy/black visor screen (#060913)
    ctx.fillStyle = '#060913';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Electric Cyan (#00D1FF) & Electric Magenta (#FF4ED8) Palette
    const cyanColor = '#00D1FF';
    const cyanGlow = '#00B4D8';
    const pinkColor = '#FF4ED8';

    const centerX = canvas.width / 2 + lookX * 22;
    const centerY = canvas.height / 2 + lookY * 16 - 8;
    const eyeSpacing = 52;
    const leftX = centerX - eyeSpacing;
    const rightX = centerX + eyeSpacing;

    // Helper: Draw 5-pointed star for Excited Expression
    const drawStar = (cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number) => {
      let rot = (Math.PI / 2) * 3;
      let x = cx;
      let y = cy;
      const step = Math.PI / spikes;

      ctx.beginPath();
      ctx.moveTo(cx, cy - outerRadius);
      for (let i = 0; i < spikes; i++) {
        x = cx + Math.cos(rot) * outerRadius;
        y = cy + Math.sin(rot) * outerRadius;
        ctx.lineTo(x, y);
        rot += step;

        x = cx + Math.cos(rot) * innerRadius;
        y = cy + Math.sin(rot) * innerRadius;
        ctx.lineTo(x, y);
        rot += step;
      }
      ctx.lineTo(cx, cy - outerRadius);
      ctx.closePath();
      ctx.fill();
    };

    ctx.shadowColor = cyanGlow;
    ctx.shadowBlur = 28;

    if (expr === 'normal') {
      // Normal Expression: Cute curved smiling eyes `^ ^` + little smile mouth
      ctx.lineWidth = 15;
      ctx.strokeStyle = cyanColor;
      ctx.lineCap = 'round';

      // Left eye curved arch
      ctx.beginPath();
      ctx.arc(leftX, centerY + 8, 30, Math.PI * 1.15, Math.PI * 1.85, false);
      ctx.stroke();

      // Right eye curved arch
      ctx.beginPath();
      ctx.arc(rightX, centerY + 8, 30, Math.PI * 1.15, Math.PI * 1.85, false);
      ctx.stroke();

      // Cute small smile mouth line
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(centerX, centerY + 46, 16, Math.PI * 0.15, Math.PI * 0.85, false);
      ctx.stroke();

      // Soft pink cheek blush
      ctx.shadowColor = pinkColor;
      ctx.shadowBlur = 18;
      ctx.fillStyle = 'rgba(255, 78, 216, 0.4)';
      ctx.beginPath();
      ctx.arc(leftX - 32, centerY + 26, 12, 0, Math.PI * 2);
      ctx.arc(rightX + 32, centerY + 26, 12, 0, Math.PI * 2);
      ctx.fill();
    } else if (expr === 'wink') {
      // Wink Expression: Left eye wide open round circle, Right eye cute wink `>`
      ctx.fillStyle = cyanColor;

      // Left open eye with inner glow
      ctx.beginPath();
      ctx.arc(leftX, centerY, 28, 0, Math.PI * 2);
      ctx.fill();

      // Highlight in open eye
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(leftX - 7, centerY - 8, 8, 0, Math.PI * 2);
      ctx.fill();

      // Right wink curved angle
      ctx.lineWidth = 14;
      ctx.strokeStyle = cyanColor;
      ctx.lineCap = 'round';
      ctx.shadowColor = cyanGlow;
      ctx.shadowBlur = 24;
      ctx.beginPath();
      ctx.moveTo(rightX - 22, centerY + 8);
      ctx.lineTo(rightX + 4, centerY - 10);
      ctx.lineTo(rightX + 22, centerY + 8);
      ctx.stroke();

      // Playful mouth
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(centerX + 6, centerY + 44, 18, Math.PI * 0.1, Math.PI * 0.9, false);
      ctx.stroke();

      // Blush on winking side
      ctx.shadowColor = pinkColor;
      ctx.fillStyle = 'rgba(255, 78, 216, 0.45)';
      ctx.beginPath();
      ctx.arc(rightX + 26, centerY + 24, 13, 0, Math.PI * 2);
      ctx.fill();
    } else if (expr === 'excited') {
      // Excited Expression: Glowing Cyan Star Eyes `★ ★` + Big Joyful Smile
      ctx.fillStyle = cyanColor;
      ctx.shadowColor = cyanGlow;
      ctx.shadowBlur = 32;

      drawStar(leftX, centerY, 5, 34, 16);
      drawStar(rightX, centerY, 5, 34, 16);

      // Star sparkles
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(leftX - 5, centerY - 7, 5, 0, Math.PI * 2);
      ctx.arc(rightX - 5, centerY - 7, 5, 0, Math.PI * 2);
      ctx.fill();

      // Big happy open smile
      ctx.fillStyle = cyanColor;
      ctx.beginPath();
      ctx.arc(centerX, centerY + 38, 22, 0, Math.PI, false);
      ctx.fill();

      // Rosy blush on both cheeks
      ctx.shadowColor = pinkColor;
      ctx.fillStyle = 'rgba(255, 78, 216, 0.55)';
      ctx.beginPath();
      ctx.arc(leftX - 30, centerY + 30, 14, 0, Math.PI * 2);
      ctx.arc(rightX + 30, centerY + 30, 14, 0, Math.PI * 2);
      ctx.fill();
    } else if (expr === 'thinking') {
      // Thinking Expression: Gentle downward thoughtful curves `◡ ◡`
      ctx.lineWidth = 14;
      ctx.strokeStyle = cyanColor;
      ctx.lineCap = 'round';

      ctx.beginPath();
      ctx.arc(leftX, centerY - 8, 26, Math.PI * 0.15, Math.PI * 0.85, false);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(rightX, centerY - 8, 26, Math.PI * 0.15, Math.PI * 0.85, false);
      ctx.stroke();

      // Small contemplative mouth
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(centerX + 12, centerY + 42, 8, 0, Math.PI * 2);
      ctx.stroke();

      // Glowing thinking dot above
      ctx.fillStyle = '#00D1FF';
      ctx.shadowColor = '#00D1FF';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(rightX + 24, centerY - 42, 6, 0, Math.PI * 2);
      ctx.arc(rightX + 36, centerY - 56, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (expr === 'blink') {
      // Blink Expression: Horizontal thin sleeping slits
      ctx.lineWidth = 8;
      ctx.strokeStyle = cyanColor;
      ctx.lineCap = 'round';

      ctx.beginPath();
      ctx.moveTo(leftX - 22, centerY);
      ctx.lineTo(leftX + 22, centerY);
      ctx.moveTo(rightX - 22, centerY);
      ctx.lineTo(rightX + 22, centerY);
      ctx.stroke();
    }

    if (eyeTextureRef.current) {
      eyeTextureRef.current.needsUpdate = true;
    }
  }, []);

  // Periodic natural blinking
  useEffect(() => {
    const triggerBlink = () => {
      setExpression('blink');
      setTimeout(() => {
        setExpression(isHovered ? 'excited' : 'normal');
      }, 150);

      const nextDelay = 3000 + Math.random() * 4500;
      blinkTimerRef.current = setTimeout(triggerBlink, nextDelay);
    };

    blinkTimerRef.current = setTimeout(triggerBlink, 3500);
    return () => {
      if (blinkTimerRef.current) clearTimeout(blinkTimerRef.current);
    };
  }, [isHovered]);

  // Update canvas when expression changes
  useEffect(() => {
    drawFace(expression, mouseRef.current.x, mouseRef.current.y);
  }, [expression, drawFace]);

  // Trigger Happy Jump & Wave Animation (from design sheet)
  const triggerHappyJump = useCallback(() => {
    if (isJumping) return;
    setIsJumping(true);
    setExpression('excited');
    jumpTimeRef.current = Date.now();

    setTimeout(() => {
      setIsJumping(false);
      setExpression(isHovered ? 'normal' : 'normal');
    }, 1200);

    if (onMascotClick) onMascotClick();
  }, [isJumping, isHovered, onMascotClick]);

  // Main Three.js Scene Setup
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const widthPx = mount.clientWidth || 320;
    const heightPx = mount.clientHeight || 320;

    // Scene & Perspective Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, widthPx / heightPx, 0.1, 100);
    camera.position.set(0, 0.05, 5.4);

    // High performance WebGL renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(widthPx, heightPx);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    // Create 2D face canvas for digital expressions
    const faceCanvas = document.createElement('canvas');
    faceCanvas.width = 512;
    faceCanvas.height = 512;
    eyeCanvasRef.current = faceCanvas;
    const faceTexture = new THREE.CanvasTexture(faceCanvas);
    eyeTextureRef.current = faceTexture;
    drawFace('normal', 0, 0);

    // --- MATERIALS (Matching Fixion Palette: #E6F1FF, #00D1FF, #FF4ED8, #0B1E3B) ---
    // Smooth glossy white ceramic shell
    const whiteCeramicMat = new THREE.MeshPhysicalMaterial({
      color: 0xeef4fc,
      roughness: 0.1,
      metalness: 0.06,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
    });

    // Dark headphone frame material
    const darkNavyMat = new THREE.MeshPhysicalMaterial({
      color: 0x0b1e3b,
      roughness: 0.22,
      metalness: 0.65,
      clearcoat: 0.5,
    });

    // Dark glossy visor screen
    const visorScreenMat = new THREE.MeshPhysicalMaterial({
      color: 0x05070e,
      map: faceTexture,
      roughness: 0.04,
      metalness: 0.35,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
    });

    // Neon Halo Dual Gradient (Cyan #00D1FF & Pink #FF4ED8)
    const haloCanvas = document.createElement('canvas');
    haloCanvas.width = 512;
    haloCanvas.height = 128;
    const haloCtx = haloCanvas.getContext('2d')!;
    const haloGrad = haloCtx.createLinearGradient(0, 0, 512, 0);
    haloGrad.addColorStop(0.0, '#00D1FF'); // Electric Cyan
    haloGrad.addColorStop(0.35, '#38BDF8');
    haloGrad.addColorStop(0.65, '#D946EF'); // Violet
    haloGrad.addColorStop(1.0, '#FF4ED8'); // Electric Magenta
    haloCtx.fillStyle = haloGrad;
    haloCtx.fillRect(0, 0, 512, 128);

    const haloTexture = new THREE.CanvasTexture(haloCanvas);
    const neonHaloMat = new THREE.MeshStandardMaterial({
      map: haloTexture,
      emissive: 0xffffff,
      emissiveMap: haloTexture,
      emissiveIntensity: 2.2,
      roughness: 0.15,
      metalness: 0.1,
    });

    // Glowing Electric Cyan Material (#00D1FF)
    const electricCyanMat = new THREE.MeshStandardMaterial({
      color: 0x00d1ff,
      emissive: 0x00d1ff,
      emissiveIntensity: 2.0,
      roughness: 0.18,
    });

    // Glowing Electric Magenta Material (#FF4ED8)
    const electricPinkMat = new THREE.MeshStandardMaterial({
      color: 0xff4ed8,
      emissive: 0xff4ed8,
      emissiveIntensity: 2.0,
      roughness: 0.18,
    });

    // Fixion Winged Chest Badge Texture
    const chestCanvas = document.createElement('canvas');
    chestCanvas.width = 256;
    chestCanvas.height = 256;
    const cCtx = chestCanvas.getContext('2d')!;
    // Circular dark blue badge background
    cCtx.fillStyle = '#0b1e3b';
    cCtx.beginPath();
    cCtx.arc(128, 128, 120, 0, Math.PI * 2);
    cCtx.fill();
    // Glowing Cyan border ring
    cCtx.strokeStyle = '#00D1FF';
    cCtx.lineWidth = 10;
    cCtx.shadowColor = '#00D1FF';
    cCtx.shadowBlur = 18;
    cCtx.stroke();
    // Draw stylized Fixion winged 'F' emblem
    cCtx.fillStyle = '#00D1FF';
    cCtx.shadowColor = '#00D1FF';
    cCtx.shadowBlur = 20;

    // Wing 1 (top curve)
    cCtx.beginPath();
    cCtx.moveTo(70, 75);
    cCtx.bezierCurveTo(120, 55, 185, 75, 195, 95);
    cCtx.bezierCurveTo(165, 105, 120, 95, 80, 110);
    cCtx.closePath();
    cCtx.fill();

    // Wing 2 (middle bar)
    cCtx.beginPath();
    cCtx.moveTo(75, 120);
    cCtx.bezierCurveTo(115, 108, 160, 120, 172, 136);
    cCtx.bezierCurveTo(145, 145, 110, 138, 85, 150);
    cCtx.closePath();
    cCtx.fill();

    // Stem curve
    cCtx.beginPath();
    cCtx.moveTo(72, 75);
    cCtx.bezierCurveTo(90, 120, 95, 165, 115, 195);
    cCtx.bezierCurveTo(95, 180, 80, 145, 65, 105);
    cCtx.closePath();
    cCtx.fill();

    const chestTexture = new THREE.CanvasTexture(chestCanvas);
    const chestBadgeMat = new THREE.MeshStandardMaterial({
      map: chestTexture,
      emissive: 0xffffff,
      emissiveMap: chestTexture,
      emissiveIntensity: 1.1,
      roughness: 0.25,
      metalness: 0.15,
    });

    // --- 3D ROOT HIERARCHY ---
    const robotRoot = new THREE.Group();
    robotRoot.scale.set(scale, scale, scale);
    scene.add(robotRoot);
    robotRootRef.current = robotRoot;

    // ─────────────────────────────────────────────────────────────────────────
    // 1. HEAD (Chibi Large Helmet Dome)
    // ─────────────────────────────────────────────────────────────────────────
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.42, 0);
    robotRoot.add(headGroup);
    headGroupRef.current = headGroup;

    // Helmet shell (smooth rounded head)
    const headGeo = new THREE.SphereGeometry(1.0, 48, 48);
    headGeo.scale(1.08, 0.98, 1.02);
    const headMesh = new THREE.Mesh(headGeo, whiteCeramicMat);
    headMesh.castShadow = true;
    headMesh.receiveShadow = true;
    headGroup.add(headMesh);

    // Inset Face Screen Visor (slightly angled forward)
    const visorGeo = new THREE.CircleGeometry(0.72, 48);
    visorGeo.scale(0.98, 0.92, 1.0);
    const visorMesh = new THREE.Mesh(visorGeo, visorScreenMat);
    visorMesh.position.set(0, 0.02, 0.92);
    visorMesh.rotation.x = -0.05;
    headGroup.add(visorMesh);

    // Bezel Ring around Visor
    const visorBezelGeo = new THREE.TorusGeometry(0.74, 0.045, 20, 64);
    visorBezelGeo.scale(0.98, 0.92, 1.0);
    const visorBezelMesh = new THREE.Mesh(visorBezelGeo, darkNavyMat);
    visorBezelMesh.position.set(0, 0.02, 0.91);
    visorBezelMesh.rotation.x = -0.05;
    headGroup.add(visorBezelMesh);

    // ─────────────────────────────────────────────────────────────────────────
    // 2. FLOATING HALO RING (Angled Angel Ring from Design)
    // ─────────────────────────────────────────────────────────────────────────
    const haloGeo = new THREE.TorusGeometry(1.05, 0.052, 24, 64);
    const haloMesh = new THREE.Mesh(haloGeo, neonHaloMat);
    // Tilted back overhead halo like in the Fixion mascot illustration
    haloMesh.position.set(0, 0.42, -0.25);
    haloMesh.rotation.x = Math.PI * 0.32; // Angled 57 degrees backward
    headGroup.add(haloMesh);
    haloRingRef.current = haloMesh;

    // ─────────────────────────────────────────────────────────────────────────
    // 3. HEADPHONES (Chunky Cute Ear Cups with Dual Glow Rings)
    // ─────────────────────────────────────────────────────────────────────────
    // Overhead headband connecting ear cups
    const bandGeo = new THREE.TorusGeometry(1.12, 0.055, 16, 48, Math.PI * 0.94);
    const bandMesh = new THREE.Mesh(bandGeo, darkNavyMat);
    bandMesh.position.set(0, 0.18, -0.05);
    bandMesh.rotation.z = Math.PI * 0.03;
    bandMesh.rotation.x = -0.12;
    headGroup.add(bandMesh);

    // Ear Cup Builder (left/right)
    const createEarCup = (isLeft: boolean) => {
      const earGroup = new THREE.Group();
      const xSign = isLeft ? -1 : 1;
      earGroup.position.set(xSign * 1.08, 0.05, 0);
      earGroup.rotation.y = isLeft ? Math.PI / 2 : -Math.PI / 2;
      earGroup.rotation.z = isLeft ? 0.05 : -0.05;

      // Outer cup hemisphere/cylinder
      const outerCupGeo = new THREE.CylinderGeometry(0.32, 0.35, 0.15, 32);
      const outerCupMesh = new THREE.Mesh(outerCupGeo, whiteCeramicMat);
      outerCupMesh.rotation.x = Math.PI / 2;
      earGroup.add(outerCupMesh);

      // Inner dark inset
      const insetGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.04, 32);
      const insetMesh = new THREE.Mesh(insetGeo, darkNavyMat);
      insetMesh.position.z = 0.08;
      insetMesh.rotation.x = Math.PI / 2;
      earGroup.add(insetMesh);

      // Dual glowing neon ring 1: Magenta on top
      const neonRing1 = new THREE.TorusGeometry(0.29, 0.025, 16, 32);
      const ring1Mesh = new THREE.Mesh(neonRing1, electricPinkMat);
      ring1Mesh.position.set(0, 0.04, 0.08);
      earGroup.add(ring1Mesh);

      // Dual glowing neon ring 2: Cyan on center
      const neonRing2 = new THREE.TorusGeometry(0.18, 0.022, 16, 32);
      const ring2Mesh = new THREE.Mesh(neonRing2, electricCyanMat);
      ring2Mesh.position.set(0, 0, 0.1);
      earGroup.add(ring2Mesh);

      return earGroup;
    };

    headGroup.add(createEarCup(true));
    headGroup.add(createEarCup(false));

    // ─────────────────────────────────────────────────────────────────────────
    // 4. BODY & FIXION CHEST LOGO (Chubby Cute Pod with Neck Gap)
    // ─────────────────────────────────────────────────────────────────────────
    const bodyGroup = new THREE.Group();
    bodyGroup.position.set(0, -0.72, 0);
    robotRoot.add(bodyGroup);
    bodyGroupRef.current = bodyGroup;

    // Chubby torso pod (proportioned chibi body)
    const torsoGeo = new THREE.CapsuleGeometry(0.52, 0.38, 24, 32);
    torsoGeo.scale(1.05, 0.95, 0.95);
    const torsoMesh = new THREE.Mesh(torsoGeo, whiteCeramicMat);
    torsoMesh.castShadow = true;
    torsoMesh.receiveShadow = true;
    bodyGroup.add(torsoMesh);

    // Fixion Chest Logo Emblem (Circular Badge on Chest)
    const chestBadgeGeo = new THREE.CircleGeometry(0.24, 32);
    const chestBadgeMesh = new THREE.Mesh(chestBadgeGeo, chestBadgeMat);
    chestBadgeMesh.position.set(0, 0.08, 0.51);
    bodyGroup.add(chestBadgeMesh);

    // Soft cyan glow point light on the chest logo
    const chestLight = new THREE.PointLight(0x00d1ff, 1.2, 1.8);
    chestLight.position.set(0, 0.08, 0.65);
    bodyGroup.add(chestLight);

    // ─────────────────────────────────────────────────────────────────────────
    // 5. FLOATING ARMS (Waving / Greeting & Pointing Poses)
    // ─────────────────────────────────────────────────────────────────────────
    const createArm = (isRight: boolean) => {
      const armRoot = new THREE.Group();
      const xSign = isRight ? 1 : -1;
      armRoot.position.set(xSign * 0.72, 0.05, 0.08);

      const armPivot = new THREE.Group();
      armRoot.add(armPivot);

      // Upper arm / shoulder capsule
      const armGeo = new THREE.CapsuleGeometry(0.14, 0.32, 16, 24);
      const armMesh = new THREE.Mesh(armGeo, whiteCeramicMat);
      armMesh.position.set(0, -0.15, 0);
      armMesh.rotation.z = xSign * -0.28;
      armMesh.castShadow = true;
      armPivot.add(armMesh);

      // Glowing wrist cuff ring (Pink on right, Cyan on left)
      const cuffGeo = new THREE.TorusGeometry(0.13, 0.022, 16, 32);
      const cuffMesh = new THREE.Mesh(cuffGeo, isRight ? electricPinkMat : electricCyanMat);
      cuffMesh.position.set(xSign * 0.04, -0.32, 0.04);
      cuffMesh.rotation.x = Math.PI / 2;
      armPivot.add(cuffMesh);

      // Cute robotic hand with pointed finger (for Greeting pose)
      const handGroup = new THREE.Group();
      handGroup.position.set(xSign * 0.06, -0.38, 0.06);

      const palmGeo = new THREE.SphereGeometry(0.11, 16, 16);
      palmGeo.scale(1.0, 0.9, 0.8);
      const palmMesh = new THREE.Mesh(palmGeo, whiteCeramicMat);
      handGroup.add(palmMesh);

      if (isRight) {
        // Pointing index finger (like in "Your Learning Buddy" illustration)
        const fingerGeo = new THREE.CapsuleGeometry(0.04, 0.12, 12, 16);
        const fingerMesh = new THREE.Mesh(fingerGeo, whiteCeramicMat);
        fingerMesh.position.set(0.06, 0.1, 0.02);
        fingerMesh.rotation.z = -0.35;
        handGroup.add(fingerMesh);
      }

      armPivot.add(handGroup);

      return { root: armRoot, pivot: armPivot };
    };

    const leftArm = createArm(false);
    const rightArm = createArm(true);
    bodyGroup.add(leftArm.root);
    bodyGroup.add(rightArm.root);
    leftArmRef.current = leftArm.pivot;
    rightArmRef.current = rightArm.pivot;

    // ─────────────────────────────────────────────────────────────────────────
    // 6. FLOATING SHORT LEGS / HOVER BASE
    // ─────────────────────────────────────────────────────────────────────────
    const createLeg = (isRight: boolean) => {
      const legGroup = new THREE.Group();
      const xSign = isRight ? 1 : -1;
      legGroup.position.set(xSign * 0.28, -0.5, 0.04);

      // Stubby cute leg
      const legGeo = new THREE.CapsuleGeometry(0.16, 0.22, 16, 20);
      const legMesh = new THREE.Mesh(legGeo, whiteCeramicMat);
      legMesh.position.set(0, -0.12, 0.06);
      legMesh.rotation.x = -0.28;
      legMesh.castShadow = true;
      legGroup.add(legMesh);

      // Glowing ankle ring
      const ringGeo = new THREE.TorusGeometry(0.15, 0.022, 16, 32);
      const ringMesh = new THREE.Mesh(ringGeo, isRight ? electricPinkMat : electricCyanMat);
      ringMesh.position.set(0, -0.24, 0.1);
      ringMesh.rotation.x = -0.28;
      legGroup.add(ringMesh);

      // Flat tilted shoe/foot
      const footGeo = new THREE.CylinderGeometry(0.15, 0.16, 0.07, 24);
      const footMesh = new THREE.Mesh(footGeo, whiteCeramicMat);
      footMesh.position.set(0, -0.28, 0.12);
      footMesh.rotation.x = -0.28;
      legGroup.add(footMesh);

      return legGroup;
    };

    bodyGroup.add(createLeg(false));
    bodyGroup.add(createLeg(true));

    // Thruster Hover Light & Ground Glow
    if (showThrusterLight) {
      // Downward cyan hover light from under the mascot
      const thrusterLight = new THREE.PointLight(0x00d1ff, 2.8, 3.5);
      thrusterLight.position.set(0, -0.9, 0);
      bodyGroup.add(thrusterLight);

      // Glowing cyan circular hover projection disc on the ground
      const hoverRingGeo = new THREE.RingGeometry(0.2, 0.75, 32);
      const hoverCanvas = document.createElement('canvas');
      hoverCanvas.width = 128;
      hoverCanvas.height = 128;
      const hCtx = hoverCanvas.getContext('2d')!;
      const hGrad = hCtx.createRadialGradient(64, 64, 10, 64, 64, 64);
      hGrad.addColorStop(0, 'rgba(0, 209, 255, 0.45)');
      hGrad.addColorStop(0.6, 'rgba(0, 209, 255, 0.15)');
      hGrad.addColorStop(1, 'rgba(0, 209, 255, 0)');
      hCtx.fillStyle = hGrad;
      hCtx.fillRect(0, 0, 128, 128);

      const hoverTex = new THREE.CanvasTexture(hoverCanvas);
      const hoverMat = new THREE.MeshBasicMaterial({
        map: hoverTex,
        transparent: true,
        depthWrite: false,
      });
      const hoverMesh = new THREE.Mesh(hoverRingGeo, hoverMat);
      hoverMesh.position.set(0, -1.82, 0);
      hoverMesh.rotation.x = -Math.PI / 2;
      robotRoot.add(hoverMesh);
    }

    // Realistic Ground Shadow Plate
    if (showShadow) {
      const shadowGeo = new THREE.PlaneGeometry(2.4, 2.4);
      const shadowCanvas = document.createElement('canvas');
      shadowCanvas.width = 128;
      shadowCanvas.height = 128;
      const sCtx = shadowCanvas.getContext('2d')!;
      const sGrad = sCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
      sGrad.addColorStop(0, 'rgba(11, 30, 59, 0.55)');
      sGrad.addColorStop(0.5, 'rgba(11, 30, 59, 0.2)');
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
      shadowMesh.position.set(0, -1.83, 0);
      shadowMesh.rotation.x = -Math.PI / 2;
      robotRoot.add(shadowMesh);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 7. LIGHTING SETUP (Cosmic Cyber Aesthetic)
    // ─────────────────────────────────────────────────────────────────────────
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.1);
    scene.add(ambientLight);

    // Warm Key Light from top-front
    const keyLight = new THREE.DirectionalLight(0xfff5ea, 1.8);
    keyLight.position.set(2.8, 4.2, 3.8);
    keyLight.castShadow = true;
    scene.add(keyLight);

    // Electric Cyan Rim Light from left (#00D1FF)
    const cyanRim = new THREE.PointLight(0x00d1ff, 3.2, 7);
    cyanRim.position.set(-2.6, 1.2, 1.8);
    scene.add(cyanRim);

    // Electric Magenta Rim Light from right (#FF4ED8)
    const pinkRim = new THREE.PointLight(0xff4ed8, 3.0, 7);
    pinkRim.position.set(2.6, 1.0, -1.5);
    scene.add(pinkRim);

    // Soft Visor Front Light
    const faceLight = new THREE.PointLight(0x00d1ff, 1.4, 2.5);
    faceLight.position.set(0, 0.45, 2.0);
    scene.add(faceLight);

    // ─────────────────────────────────────────────────────────────────────────
    // 8. INTERACTION & MOUSE TRACKING
    // ─────────────────────────────────────────────────────────────────────────
    const handleMouseMove = (e: MouseEvent) => {
      if (!enableTracking) return;
      const rect = mount.getBoundingClientRect();
      const clientX = e.clientX;
      const clientY = e.clientY;

      const x = ((clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((clientY - rect.top) / rect.height) * 2 - 1);

      mouseRef.current.targetX = Math.max(-1.4, Math.min(1.4, x));
      mouseRef.current.targetY = Math.max(-1.4, Math.min(1.4, y));
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

    // ─────────────────────────────────────────────────────────────────────────
    // 9. ANIMATION LOOP
    // ─────────────────────────────────────────────────────────────────────────
    let clock = new THREE.Clock();

    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      const time = clock.getElapsedTime();

      // Mouse lerp dampening
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.07;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.07;

      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      // Handle Happy Jump Physics
      let jumpY = 0;
      if (isJumping && jumpTimeRef.current > 0) {
        const elapsedJump = (Date.now() - jumpTimeRef.current) / 1000;
        if (elapsedJump < 1.0) {
          // Bouncy sine jump arc
          jumpY = Math.sin(elapsedJump * Math.PI) * 0.38;
        }
      }

      // Idle Floating Motion (Bobbing & Breathing)
      if (enableFloating) {
        const floatY = Math.sin(time * 2.3) * 0.09 + jumpY;
        robotRoot.position.y = floatY;

        // Subtle side-to-side floating drift
        robotRoot.position.x = Math.sin(time * 1.5) * 0.02;

        // Head and Body independent floating resonance
        if (headGroupRef.current) {
          headGroupRef.current.position.y = 0.42 + Math.sin(time * 2.5 + 0.3) * 0.025;
        }
        if (bodyGroupRef.current) {
          bodyGroupRef.current.position.y = -0.72 + Math.sin(time * 2.3) * 0.02;
        }

        // Halo gentle hover tilt oscillation
        if (haloRingRef.current) {
          haloRingRef.current.rotation.z = Math.sin(time * 1.8) * 0.04;
        }
      }

      // Head & Eyes Mouse Tracking
      if (headGroupRef.current) {
        headGroupRef.current.rotation.y = THREE.MathUtils.lerp(
          headGroupRef.current.rotation.y,
          mx * 0.45,
          0.08
        );
        headGroupRef.current.rotation.x = THREE.MathUtils.lerp(
          headGroupRef.current.rotation.x,
          -my * 0.28,
          0.08
        );
        headGroupRef.current.rotation.z = THREE.MathUtils.lerp(
          headGroupRef.current.rotation.z,
          -mx * 0.08,
          0.08
        );
      }

      // Torso lag tracking (natural follow-through)
      if (bodyGroupRef.current) {
        bodyGroupRef.current.rotation.y = THREE.MathUtils.lerp(
          bodyGroupRef.current.rotation.y,
          mx * 0.22,
          0.05
        );
        bodyGroupRef.current.rotation.x = THREE.MathUtils.lerp(
          bodyGroupRef.current.rotation.x,
          -my * 0.12,
          0.05
        );
      }

      // Arm Poses: Waving, Pointing & Idle Floating
      if (rightArmRef.current) {
        if (isHovered || isJumping) {
          // Greeting / Pointing Hand Up pose from the Fixion graphic!
          rightArmRef.current.rotation.z = THREE.MathUtils.lerp(
            rightArmRef.current.rotation.z,
            -1.65 + Math.sin(time * 8) * 0.18,
            0.12
          );
          rightArmRef.current.rotation.x = THREE.MathUtils.lerp(
            rightArmRef.current.rotation.x,
            -0.35 + Math.cos(time * 8) * 0.1,
            0.12
          );
        } else {
          // Natural idle floating sway
          rightArmRef.current.rotation.z = THREE.MathUtils.lerp(
            rightArmRef.current.rotation.z,
            -Math.cos(time * 2.0) * 0.06 - 0.05,
            0.08
          );
          rightArmRef.current.rotation.x = THREE.MathUtils.lerp(
            rightArmRef.current.rotation.x,
            Math.sin(time * 2.3) * 0.08,
            0.08
          );
        }
      }

      if (leftArmRef.current) {
        leftArmRef.current.rotation.x = Math.sin(time * 2.3 + 0.6) * 0.08;
        leftArmRef.current.rotation.z = Math.cos(time * 1.9) * 0.06;
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
  }, [scale, showShadow, showThrusterLight, enableFloating, enableTracking, isJumping, isHovered, drawFace]);

  return (
    <div
      ref={mountRef}
      className={`fixion-mascot-container ${className}`}
      style={{
        width,
        height,
        position: 'relative',
        cursor: interactive ? 'pointer' : 'default',
        touchAction: 'none',
      }}
      onClick={() => {
        if (interactive) {
          triggerHappyJump();
        }
      }}
      onMouseEnter={() => {
        setIsHovered(true);
        setExpression('normal');
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        setExpression('normal');
      }}
      title="Fixion 3D Learning Buddy — اضغط للقفز والترحيب!"
    />
  );
}

// Export alias so it can also be imported as FixionMascot
export const FixionMascot = RobotMascot3D;
