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

  // References to keep animation loop smooth without re-triggering Three.js mount
  const isHoveredRef = useRef(false);
  const isJumpingRef = useRef(false);
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

  // Sync state to refs
  useEffect(() => {
    isHoveredRef.current = isHovered;
  }, [isHovered]);

  useEffect(() => {
    isJumpingRef.current = isJumping;
  }, [isJumping]);

  // Draw expressive digital eyes & mouth on 2D canvas texture matching Fixion design sheet
  const drawFace = useCallback((expr: MascotExpression, lookX = 0, lookY = 0) => {
    const canvas = eyeCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Deep pitch-black OLED visor screen background
    ctx.fillStyle = '#050814';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle dark gradient vignette for depth
    const screenGrad = ctx.createRadialGradient(256, 256, 120, 256, 256, 256);
    screenGrad.addColorStop(0, '#0a1024');
    screenGrad.addColorStop(1, '#03050c');
    ctx.fillStyle = screenGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Color definitions from Fixion character sheet
    const cyanColor = '#00D1FF';
    const cyanGlow = '#00D1FF';
    const pinkColor = '#FF4ED8';

    const centerX = canvas.width / 2 + lookX * 24;
    const centerY = canvas.height / 2 + lookY * 18 - 8;
    const eyeSpacing = 68;
    const leftX = centerX - eyeSpacing;
    const rightX = centerX + eyeSpacing;

    // Helper: 4-pointed sparkle star drawer for Excited Expression
    const drawSparkle = (cx: number, cy: number, radius: number) => {
      ctx.beginPath();
      ctx.moveTo(cx, cy - radius);
      ctx.quadraticCurveTo(cx, cy, cx + radius, cy);
      ctx.quadraticCurveTo(cx, cy, cx, cy + radius);
      ctx.quadraticCurveTo(cx, cy, cx - radius, cy);
      ctx.quadraticCurveTo(cx, cy, cx, cy - radius);
      ctx.closePath();
      ctx.fill();
    };

    ctx.shadowColor = cyanGlow;
    ctx.shadowBlur = 32;

    if (expr === 'normal') {
      // Normal: Curved upward luminous smile eyes `^ ^` + cute mouth line + glowing pink blush
      ctx.lineWidth = 18;
      ctx.strokeStyle = cyanColor;
      ctx.lineCap = 'round';

      // Left curved smile arch
      ctx.beginPath();
      ctx.arc(leftX, centerY + 12, 34, Math.PI * 1.16, Math.PI * 1.84, false);
      ctx.stroke();

      // Right curved smile arch
      ctx.beginPath();
      ctx.arc(rightX, centerY + 12, 34, Math.PI * 1.16, Math.PI * 1.84, false);
      ctx.stroke();

      // Cute small smile mouth line
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.arc(centerX, centerY + 52, 22, Math.PI * 0.15, Math.PI * 0.85, false);
      ctx.stroke();

      // Glowing pink cheeks
      ctx.shadowColor = pinkColor;
      ctx.shadowBlur = 24;
      ctx.fillStyle = 'rgba(255, 78, 216, 0.75)';
      ctx.beginPath();
      ctx.arc(leftX - 44, centerY + 28, 16, 0, Math.PI * 2);
      ctx.arc(rightX + 44, centerY + 28, 16, 0, Math.PI * 2);
      ctx.fill();
    } else if (expr === 'wink') {
      // Wink: Left eye wide open round circle, Right eye cute playful wink arc
      ctx.fillStyle = cyanColor;

      // Left open eye
      ctx.beginPath();
      ctx.arc(leftX, centerY, 32, 0, Math.PI * 2);
      ctx.fill();

      // White glossy highlight in open eye
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(leftX - 9, centerY - 9, 10, 0, Math.PI * 2);
      ctx.fill();

      // Right wink arc
      ctx.lineWidth = 16;
      ctx.strokeStyle = cyanColor;
      ctx.lineCap = 'round';
      ctx.shadowColor = cyanGlow;
      ctx.shadowBlur = 28;
      ctx.beginPath();
      ctx.moveTo(rightX - 26, centerY + 10);
      ctx.lineTo(rightX + 4, centerY - 12);
      ctx.lineTo(rightX + 26, centerY + 10);
      ctx.stroke();

      // Playful mouth
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.arc(centerX + 6, centerY + 52, 22, Math.PI * 0.1, Math.PI * 0.9, false);
      ctx.stroke();

      // Blush on winking cheek
      ctx.shadowColor = pinkColor;
      ctx.fillStyle = 'rgba(255, 78, 216, 0.75)';
      ctx.beginPath();
      ctx.arc(rightX + 40, centerY + 28, 16, 0, Math.PI * 2);
      ctx.fill();
    } else if (expr === 'excited') {
      // Excited: Glowing Cyan Sparkle Stars `✦ ✦` + Joyful Open Smile
      ctx.fillStyle = cyanColor;
      ctx.shadowColor = cyanGlow;
      ctx.shadowBlur = 38;

      drawSparkle(leftX, centerY, 38);
      drawSparkle(rightX, centerY, 38);

      // Star sparkles in centers
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(leftX, centerY, 7, 0, Math.PI * 2);
      ctx.arc(rightX, centerY, 7, 0, Math.PI * 2);
      ctx.fill();

      // Big joyful open smile
      ctx.fillStyle = cyanColor;
      ctx.beginPath();
      ctx.arc(centerX, centerY + 46, 26, 0, Math.PI, false);
      ctx.fill();

      // Bright rosy blush
      ctx.shadowColor = pinkColor;
      ctx.fillStyle = 'rgba(255, 78, 216, 0.8)';
      ctx.beginPath();
      ctx.arc(leftX - 44, centerY + 32, 17, 0, Math.PI * 2);
      ctx.arc(rightX + 44, centerY + 32, 17, 0, Math.PI * 2);
      ctx.fill();
    } else if (expr === 'thinking') {
      // Thinking: Downward thoughtful curves `◡ ◡`
      ctx.lineWidth = 16;
      ctx.strokeStyle = cyanColor;
      ctx.lineCap = 'round';

      ctx.beginPath();
      ctx.arc(leftX, centerY - 4, 28, Math.PI * 0.15, Math.PI * 0.85, false);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(rightX, centerY - 4, 28, Math.PI * 0.15, Math.PI * 0.85, false);
      ctx.stroke();

      // Thoughtful small mouth
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(centerX + 12, centerY + 50, 9, 0, Math.PI * 2);
      ctx.stroke();

      // Thinking bubbles above head
      ctx.fillStyle = cyanColor;
      ctx.shadowColor = cyanColor;
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(rightX + 32, centerY - 46, 7, 0, Math.PI * 2);
      ctx.arc(rightX + 46, centerY - 62, 5, 0, Math.PI * 2);
      ctx.fill();
    } else if (expr === 'blink') {
      // Blink: Thin sleeping horizontal slit
      ctx.lineWidth = 11;
      ctx.strokeStyle = cyanColor;
      ctx.lineCap = 'round';

      ctx.beginPath();
      ctx.moveTo(leftX - 26, centerY + 4);
      ctx.lineTo(leftX + 26, centerY + 4);
      ctx.moveTo(rightX - 26, centerY + 4);
      ctx.lineTo(rightX + 26, centerY + 4);
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
        setExpression(isHoveredRef.current ? 'excited' : 'normal');
      }, 150);

      const nextDelay = 3000 + Math.random() * 4500;
      blinkTimerRef.current = setTimeout(triggerBlink, nextDelay);
    };

    blinkTimerRef.current = setTimeout(triggerBlink, 3500);
    return () => {
      if (blinkTimerRef.current) clearTimeout(blinkTimerRef.current);
    };
  }, []);

  // Update canvas when expression changes
  useEffect(() => {
    drawFace(expression, mouseRef.current.x, mouseRef.current.y);
  }, [expression, drawFace]);

  // Happy Jump Reaction (on click)
  const triggerHappyJump = useCallback(() => {
    if (isJumping) return;
    setIsJumping(true);
    setExpression('excited');
    jumpTimeRef.current = Date.now();

    setTimeout(() => {
      setIsJumping(false);
      setExpression('normal');
    }, 1200);

    if (onMascotClick) onMascotClick();
  }, [isJumping, onMascotClick]);

  // Main Three.js Scene Setup (mounts once cleanly)
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const widthPx = mount.clientWidth || 320;
    const heightPx = mount.clientHeight || 320;

    // Scene & Perspective Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, widthPx / heightPx, 0.1, 100);
    camera.position.set(0, -0.05, 5.4);

    // Renderer
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

    // 2D Face Canvas
    const faceCanvas = document.createElement('canvas');
    faceCanvas.width = 512;
    faceCanvas.height = 512;
    eyeCanvasRef.current = faceCanvas;
    const faceTexture = new THREE.CanvasTexture(faceCanvas);
    faceTexture.colorSpace = THREE.SRGBColorSpace;
    faceTexture.minFilter = THREE.LinearFilter;
    faceTexture.magFilter = THREE.LinearFilter;
    eyeTextureRef.current = faceTexture;
    drawFace('normal', 0, 0);

    // --- MATERIALS ---
    // Smooth glossy white ceramic shell (#E6F1FF)
    const whiteCeramicMat = new THREE.MeshPhysicalMaterial({
      color: 0xedf4fc,
      roughness: 0.1,
      metalness: 0.05,
      clearcoat: 1.0,
      clearcoatRoughness: 0.06,
    });

    // Dark navy frame material (#0B1E3B)
    const darkNavyMat = new THREE.MeshPhysicalMaterial({
      color: 0x0b1e3b,
      roughness: 0.2,
      metalness: 0.6,
      clearcoat: 0.5,
    });

    // Visor Screen Material (Unlit, toneMapped=false for 100% true neon colors)
    const visorScreenMat = new THREE.MeshBasicMaterial({
      map: faceTexture,
      toneMapped: false,
      side: THREE.DoubleSide,
    });

    // Neon Halo Dual Gradient (Cyan #00D1FF to Magenta #FF4ED8)
    const haloCanvas = document.createElement('canvas');
    haloCanvas.width = 512;
    haloCanvas.height = 128;
    const haloCtx = haloCanvas.getContext('2d')!;
    const haloGrad = haloCtx.createLinearGradient(0, 0, 512, 0);
    haloGrad.addColorStop(0.0, '#00D1FF');
    haloGrad.addColorStop(0.35, '#38BDF8');
    haloGrad.addColorStop(0.65, '#D946EF');
    haloGrad.addColorStop(1.0, '#FF4ED8');
    haloCtx.fillStyle = haloGrad;
    haloCtx.fillRect(0, 0, 512, 128);

    const haloTexture = new THREE.CanvasTexture(haloCanvas);
    haloTexture.colorSpace = THREE.SRGBColorSpace;
    const neonHaloMat = new THREE.MeshBasicMaterial({
      map: haloTexture,
      toneMapped: false,
    });

    // Glowing Electric Cyan Material (#00D1FF)
    const electricCyanMat = new THREE.MeshBasicMaterial({
      color: 0x00d1ff,
      toneMapped: false,
    });

    // Glowing Electric Magenta Material (#FF4ED8)
    const electricPinkMat = new THREE.MeshBasicMaterial({
      color: 0xff4ed8,
      toneMapped: false,
    });

    // Fixion Winged Chest Badge
    const chestCanvas = document.createElement('canvas');
    chestCanvas.width = 256;
    chestCanvas.height = 256;
    const cCtx = chestCanvas.getContext('2d')!;
    cCtx.fillStyle = '#0b1e3b';
    cCtx.beginPath();
    cCtx.arc(128, 128, 120, 0, Math.PI * 2);
    cCtx.fill();

    cCtx.strokeStyle = '#00D1FF';
    cCtx.lineWidth = 10;
    cCtx.shadowColor = '#00D1FF';
    cCtx.shadowBlur = 18;
    cCtx.stroke();

    // Fixion Winged Emblem
    cCtx.fillStyle = '#00D1FF';
    cCtx.shadowColor = '#00D1FF';
    cCtx.shadowBlur = 20;

    cCtx.beginPath();
    cCtx.moveTo(70, 75);
    cCtx.bezierCurveTo(120, 55, 185, 75, 195, 95);
    cCtx.bezierCurveTo(165, 105, 120, 95, 80, 110);
    cCtx.closePath();
    cCtx.fill();

    cCtx.beginPath();
    cCtx.moveTo(75, 120);
    cCtx.bezierCurveTo(115, 108, 160, 120, 172, 136);
    cCtx.bezierCurveTo(145, 145, 110, 138, 85, 150);
    cCtx.closePath();
    cCtx.fill();

    cCtx.beginPath();
    cCtx.moveTo(72, 75);
    cCtx.bezierCurveTo(90, 120, 95, 165, 115, 195);
    cCtx.bezierCurveTo(95, 180, 80, 145, 65, 105);
    cCtx.closePath();
    cCtx.fill();

    const chestTexture = new THREE.CanvasTexture(chestCanvas);
    chestTexture.colorSpace = THREE.SRGBColorSpace;
    const chestBadgeMat = new THREE.MeshBasicMaterial({
      map: chestTexture,
      toneMapped: false,
    });

    // --- 3D SCENE OBJECTS ---
    const robotRoot = new THREE.Group();
    robotRoot.scale.set(scale, scale, scale);
    scene.add(robotRoot);
    robotRootRef.current = robotRoot;

    // ─────────────────────────────────────────────────────────────────────────
    // 1. HEAD & VISOR (Deeply Recessed Socket - Visor is 100% PROMINENT & VISIBLE)
    // ─────────────────────────────────────────────────────────────────────────
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.45, 0);
    robotRoot.add(headGroup);
    headGroupRef.current = headGroup;

    // Sculpted Head Sphere: Flattened in the front socket so the visor is NEVER submerged
    const headGeo = new THREE.SphereGeometry(1.0, 48, 48);
    const pos = headGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i);
      let y = pos.getY(i);
      let z = pos.getZ(i);

      // Chibi proportions: slightly wider than tall
      x *= 1.08;
      y *= 0.98;

      // Recess front face socket so visor sits cleanly inside
      if (z > 0.15) {
        const dist = Math.sqrt((x * x) / (1.12 * 1.12) + ((y - 0.02) * (y - 0.02)) / (0.96 * 0.96));
        if (dist < 0.80) {
          // Flatten socket floor to z = 0.56
          if (z > 0.56) {
            z = 0.56;
          }
        } else if (dist < 0.96) {
          // Smooth bevel out of the socket to outer helmet shell
          const t = (dist - 0.80) / (0.96 - 0.80);
          const maxZ = 0.56 + t * 0.44;
          if (z > maxZ) {
            z = maxZ;
          }
        }
      }
      pos.setXYZ(i, x, y, z);
    }
    headGeo.computeVertexNormals();

    const headMesh = new THREE.Mesh(headGeo, whiteCeramicMat);
    headMesh.castShadow = true;
    headMesh.receiveShadow = true;
    headGroup.add(headMesh);

    // Front Visor Screen: Sits prominently in socket at z = 0.69 (safely in front of socket floor z = 0.56)
    const visorGeo = new THREE.CircleGeometry(0.74, 48);
    visorGeo.scale(1.10, 0.95, 1.0);
    const visorMesh = new THREE.Mesh(visorGeo, visorScreenMat);
    visorMesh.position.set(0, 0.02, 0.69);
    visorMesh.rotation.x = -0.04;
    headGroup.add(visorMesh);

    // Bezel Frame Ring around the visor
    const visorBezelGeo = new THREE.TorusGeometry(0.74, 0.045, 20, 64);
    visorBezelGeo.scale(1.10, 0.95, 1.0);
    const visorBezelMesh = new THREE.Mesh(visorBezelGeo, darkNavyMat);
    visorBezelMesh.position.set(0, 0.02, 0.70);
    visorBezelMesh.rotation.x = -0.04;
    headGroup.add(visorBezelMesh);

    // ─────────────────────────────────────────────────────────────────────────
    // 2. ANGLED NEON HALO RING (Hovering Prominently Overhead)
    // ─────────────────────────────────────────────────────────────────────────
    const haloGeo = new THREE.TorusGeometry(1.06, 0.055, 24, 64);
    const haloMesh = new THREE.Mesh(haloGeo, neonHaloMat);
    // Tilted back halo hovering overhead like Fixion character sheet
    haloMesh.position.set(0, 0.62, -0.15);
    haloMesh.rotation.x = Math.PI * 0.26;
    headGroup.add(haloMesh);
    haloRingRef.current = haloMesh;

    // Glowing Point Lights near the Halo to cast intense Pink & Cyan ambient light
    const haloPinkLight = new THREE.PointLight(0xff4ed8, 3.2, 5.0);
    haloPinkLight.position.set(1.1, 0.8, -0.1);
    headGroup.add(haloPinkLight);

    const haloCyanLight = new THREE.PointLight(0x00d1ff, 3.2, 5.0);
    haloCyanLight.position.set(-1.1, 0.5, 0.1);
    headGroup.add(haloCyanLight);

    // ─────────────────────────────────────────────────────────────────────────
    // 3. HEADPHONES (With Vibrant Pink & Cyan Glowing Rings)
    // ─────────────────────────────────────────────────────────────────────────
    // Overhead headband
    const bandGeo = new THREE.TorusGeometry(1.12, 0.055, 16, 48, Math.PI * 0.92);
    const bandMesh = new THREE.Mesh(bandGeo, darkNavyMat);
    bandMesh.position.set(0, 0.18, -0.05);
    bandMesh.rotation.z = Math.PI * 0.04;
    bandMesh.rotation.x = -0.12;
    headGroup.add(bandMesh);

    // Ear Cups Builder
    const createEarCup = (isLeft: boolean) => {
      const earGroup = new THREE.Group();
      const xSign = isLeft ? -1 : 1;
      earGroup.position.set(xSign * 1.08, 0.08, 0.02);
      earGroup.rotation.y = isLeft ? Math.PI / 2 : -Math.PI / 2;
      earGroup.rotation.z = isLeft ? 0.04 : -0.04;

      // Outer white cup dome
      const outerCupGeo = new THREE.CylinderGeometry(0.32, 0.35, 0.14, 32);
      const outerCupMesh = new THREE.Mesh(outerCupGeo, whiteCeramicMat);
      outerCupMesh.rotation.x = Math.PI / 2;
      earGroup.add(outerCupMesh);

      // Inner navy disc
      const insetGeo = new THREE.CylinderGeometry(0.27, 0.27, 0.04, 32);
      const insetMesh = new THREE.Mesh(insetGeo, darkNavyMat);
      insetMesh.position.z = 0.08;
      insetMesh.rotation.x = Math.PI / 2;
      earGroup.add(insetMesh);

      // Glowing Neon Ring 1: Magenta on top
      const neonRing1 = new THREE.TorusGeometry(0.28, 0.028, 16, 32);
      const ring1Mesh = new THREE.Mesh(neonRing1, electricPinkMat);
      ring1Mesh.position.set(0, 0.04, 0.09);
      earGroup.add(ring1Mesh);

      // Glowing Neon Ring 2: Cyan on center
      const neonRing2 = new THREE.TorusGeometry(0.18, 0.024, 16, 32);
      const ring2Mesh = new THREE.Mesh(neonRing2, electricCyanMat);
      ring2Mesh.position.set(0, 0, 0.11);
      earGroup.add(ring2Mesh);

      return earGroup;
    };

    headGroup.add(createEarCup(true));
    headGroup.add(createEarCup(false));

    // ─────────────────────────────────────────────────────────────────────────
    // 4. CHUBBY BODY & FIXION CHEST LOGO
    // ─────────────────────────────────────────────────────────────────────────
    const bodyGroup = new THREE.Group();
    bodyGroup.position.set(0, -0.68, 0);
    robotRoot.add(bodyGroup);
    bodyGroupRef.current = bodyGroup;

    // Torso pod
    const torsoGeo = new THREE.CapsuleGeometry(0.5, 0.42, 24, 32);
    torsoGeo.scale(1.04, 0.96, 0.96);
    const torsoMesh = new THREE.Mesh(torsoGeo, whiteCeramicMat);
    torsoMesh.castShadow = true;
    torsoMesh.receiveShadow = true;
    bodyGroup.add(torsoMesh);

    // Fixion Chest Logo Emblem (High contrast badge on chest)
    const chestBadgeGeo = new THREE.CircleGeometry(0.24, 32);
    const chestBadgeMesh = new THREE.Mesh(chestBadgeGeo, chestBadgeMat);
    chestBadgeMesh.position.set(0, 0.08, 0.51);
    bodyGroup.add(chestBadgeMesh);

    // ─────────────────────────────────────────────────────────────────────────
    // 5. FLOATING ARMS (Seamless Shape & True Forward Waving Motion)
    // ─────────────────────────────────────────────────────────────────────────
    const createArm = (isRight: boolean) => {
      const armRoot = new THREE.Group();
      const xSign = isRight ? 1 : -1;
      // Positioned cleanly beside body, slightly forward
      armRoot.position.set(xSign * 0.76, 0.02, 0.12);

      const armPivot = new THREE.Group();
      armRoot.add(armPivot);

      // Shoulder ball
      const shoulderGeo = new THREE.SphereGeometry(0.12, 16, 16);
      const shoulderMesh = new THREE.Mesh(shoulderGeo, whiteCeramicMat);
      armPivot.add(shoulderMesh);

      // Arm capsule (smooth, natural shape)
      const armGeo = new THREE.CapsuleGeometry(0.11, 0.24, 16, 20);
      const armMesh = new THREE.Mesh(armGeo, whiteCeramicMat);
      armMesh.position.set(0, -0.15, 0);
      armMesh.castShadow = true;
      armPivot.add(armMesh);

      // Glowing wrist cuff ring (Pink on right, Cyan on left)
      const cuffGeo = new THREE.TorusGeometry(0.105, 0.02, 16, 32);
      const cuffMesh = new THREE.Mesh(cuffGeo, isRight ? electricPinkMat : electricCyanMat);
      cuffMesh.position.set(0, -0.28, 0);
      cuffMesh.rotation.x = Math.PI / 2;
      armPivot.add(cuffMesh);

      // Cute robotic mitten hand (clean rounded hand)
      const handGroup = new THREE.Group();
      handGroup.position.set(0, -0.34, 0);

      const palmGeo = new THREE.SphereGeometry(0.10, 16, 16);
      palmGeo.scale(1.0, 0.9, 0.85);
      const palmMesh = new THREE.Mesh(palmGeo, whiteCeramicMat);
      handGroup.add(palmMesh);

      // Cute thumb angled forward
      const thumbGeo = new THREE.CapsuleGeometry(0.035, 0.07, 12, 12);
      const thumbMesh = new THREE.Mesh(thumbGeo, whiteCeramicMat);
      thumbMesh.position.set(xSign * -0.05, 0.02, 0.04);
      thumbMesh.rotation.z = xSign * 0.45;
      thumbMesh.rotation.x = 0.3;
      handGroup.add(thumbMesh);

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
    // 6. SHORT CUTE LEGS & HOVER THRUSTER GLOW
    // ─────────────────────────────────────────────────────────────────────────
    const createLeg = (isRight: boolean) => {
      const legGroup = new THREE.Group();
      const xSign = isRight ? 1 : -1;
      legGroup.position.set(xSign * 0.28, -0.46, 0.05);

      // Short cute leg
      const legGeo = new THREE.CapsuleGeometry(0.15, 0.2, 16, 20);
      const legMesh = new THREE.Mesh(legGeo, whiteCeramicMat);
      legMesh.position.set(0, -0.1, 0.04);
      legMesh.rotation.x = -0.22;
      legMesh.castShadow = true;
      legGroup.add(legMesh);

      // Glowing ankle ring
      const ringGeo = new THREE.TorusGeometry(0.145, 0.022, 16, 32);
      const ringMesh = new THREE.Mesh(ringGeo, isRight ? electricPinkMat : electricCyanMat);
      ringMesh.position.set(0, -0.22, 0.08);
      ringMesh.rotation.x = -0.22;
      legGroup.add(ringMesh);

      // Flat foot
      const footGeo = new THREE.CylinderGeometry(0.14, 0.15, 0.07, 24);
      const footMesh = new THREE.Mesh(footGeo, whiteCeramicMat);
      footMesh.position.set(0, -0.26, 0.1);
      footMesh.rotation.x = -0.22;
      legGroup.add(footMesh);

      return legGroup;
    };

    bodyGroup.add(createLeg(false));
    bodyGroup.add(createLeg(true));

    // Thruster Hover Glow
    if (showThrusterLight) {
      const thrusterLight = new THREE.PointLight(0x00d1ff, 2.5, 3.5);
      thrusterLight.position.set(0, -0.85, 0);
      bodyGroup.add(thrusterLight);

      // Ground circular projection
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
      hoverMesh.position.set(0, -1.8, 0);
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
      shadowMesh.position.set(0, -1.81, 0);
      shadowMesh.rotation.x = -Math.PI / 2;
      robotRoot.add(shadowMesh);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 7. LIGHTING SETUP
    // ─────────────────────────────────────────────────────────────────────────
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.1);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfff5ea, 1.8);
    keyLight.position.set(2.8, 4.2, 3.8);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const cyanRim = new THREE.PointLight(0x00d1ff, 3.0, 7);
    cyanRim.position.set(-2.6, 1.2, 1.8);
    scene.add(cyanRim);

    const pinkRim = new THREE.PointLight(0xff4ed8, 3.0, 7);
    pinkRim.position.set(2.6, 1.0, -1.5);
    scene.add(pinkRim);

    // ─────────────────────────────────────────────────────────────────────────
    // 8. MOUSE TRACKING LISTENER
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
    // 9. ANIMATION LOOP (Fixed Arm Waving Forward)
    // ─────────────────────────────────────────────────────────────────────────
    let clock = new THREE.Clock();

    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      const time = clock.getElapsedTime();

      // Smooth mouse lerping
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.07;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.07;

      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      // Jump Arc
      let jumpY = 0;
      if (isJumpingRef.current && jumpTimeRef.current > 0) {
        const elapsedJump = (Date.now() - jumpTimeRef.current) / 1000;
        if (elapsedJump < 1.0) {
          jumpY = Math.sin(elapsedJump * Math.PI) * 0.38;
        }
      }

      // Idle Floating Bobbing
      if (enableFloating) {
        const floatY = Math.sin(time * 2.3) * 0.09 + jumpY;
        robotRoot.position.y = floatY;
        robotRoot.position.x = Math.sin(time * 1.5) * 0.02;

        if (headGroupRef.current) {
          headGroupRef.current.position.y = 0.45 + Math.sin(time * 2.5 + 0.3) * 0.025;
        }
        if (bodyGroupRef.current) {
          bodyGroupRef.current.position.y = -0.68 + Math.sin(time * 2.3) * 0.02;
        }

        if (haloRingRef.current) {
          haloRingRef.current.rotation.z = Math.sin(time * 1.8) * 0.04;
        }
      }

      // Head Mouse Tracking
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

      // Body Mouse Follow-through
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

      // ARM ANIMATION: Natural Forward-Facing Wave
      if (rightArmRef.current) {
        if (isHoveredRef.current || isJumpingRef.current) {
          // Greeting Pose: Lifts arm up beside head, tilts forward towards camera, waves side-to-side!
          rightArmRef.current.rotation.x = THREE.MathUtils.lerp(
            rightArmRef.current.rotation.x,
            0.35, // Tilted forward towards camera/user
            0.12
          );
          rightArmRef.current.rotation.z = THREE.MathUtils.lerp(
            rightArmRef.current.rotation.z,
            1.95 + Math.sin(time * 7.5) * 0.28, // Arm raised up and waving side-to-side!
            0.12
          );
          rightArmRef.current.rotation.y = THREE.MathUtils.lerp(
            rightArmRef.current.rotation.y,
            Math.sin(time * 7.5) * 0.18, // Natural wrist twisting waving
            0.12
          );
        } else {
          // Natural idle resting pose beside the body
          rightArmRef.current.rotation.x = THREE.MathUtils.lerp(
            rightArmRef.current.rotation.x,
            0.12 + Math.sin(time * 2.2) * 0.05,
            0.08
          );
          rightArmRef.current.rotation.z = THREE.MathUtils.lerp(
            rightArmRef.current.rotation.z,
            -0.06,
            0.08
          );
          rightArmRef.current.rotation.y = THREE.MathUtils.lerp(
            rightArmRef.current.rotation.y,
            0,
            0.08
          );
        }
      }

      if (leftArmRef.current) {
        leftArmRef.current.rotation.x = 0.12 + Math.sin(time * 2.2 + 0.6) * 0.05;
        leftArmRef.current.rotation.z = 0.06;
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
  }, [scale, showShadow, showThrusterLight, enableFloating, enableTracking, drawFace]);

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
        setExpression('excited');
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        setExpression('normal');
      }}
      title="Fixion 3D Learning Buddy — اضغط للقفز والترحيب!"
    />
  );
}

export const FixionMascot = RobotMascot3D;
