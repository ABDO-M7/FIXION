'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export interface BlueBuddyModelProps {
  loadingLabel?: string;
  errorLabel?: string;
  accessibleLabel?: string;
  compact?: boolean;
  className?: string;
  interactive?: boolean;
  enableTracking?: boolean;
  enableFloating?: boolean;
  focus?: 'auto' | 'full' | 'head';
  scale?: number;
  onMascotClick?: () => void;
}

function disposeObject(root: THREE.Object3D) {
  const textures = new Set<THREE.Texture>();

  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry.dispose();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material) => {
      Object.values(material).forEach((value) => {
        if (value instanceof THREE.Texture) textures.add(value);
      });
      material.dispose();
    });
  });

  textures.forEach((texture) => texture.dispose());
}

export default function BlueBuddyModel({
  loadingLabel = 'جاري تحميل البطل ثلاثي الأبعاد...',
  errorLabel = 'تعذر تحميل المجسم ثلاثي الأبعاد.',
  accessibleLabel = 'رفيق FIXION ثلاثي الأبعاد',
  compact = false,
  className = '',
  interactive = true,
  enableTracking = true,
  enableFloating = true,
  focus = 'auto',
  scale: customScale = 1.0,
  onMascotClick,
}: BlueBuddyModelProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [loadError, setLoadError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isJumping, setIsJumping] = useState(false);

  // References for continuous 60fps animation without tearing down WebGL
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const isHoveredRef = useRef(false);
  const isJumpingRef = useRef(false);
  const jumpTimeRef = useRef<number>(0);

  useEffect(() => {
    isHoveredRef.current = isHovered;
  }, [isHovered]);

  useEffect(() => {
    isJumpingRef.current = isJumping;
  }, [isJumping]);

  // Click-to-jump trigger
  const triggerHappyJump = useCallback(() => {
    if (!interactive || isJumping) return;
    setIsJumping(true);
    jumpTimeRef.current = Date.now();

    setTimeout(() => {
      setIsJumping(false);
    }, 1200);

    if (onMascotClick) onMascotClick();
  }, [interactive, isJumping, onMascotClick]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    let frameId = 0;
    let resizeObserver: ResizeObserver | undefined;
    let renderer: THREE.WebGLRenderer | undefined;

    try {
      const scene = new THREE.Scene();

      // Camera setup with flexible focus (full body vs head portrait)
      const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
      camera.position.set(0, 0, 4.6);

      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.25;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      host.appendChild(renderer.domElement);

      // Studio Lighting setup tailored for Meshy AI PBR textures
      const hemiLight = new THREE.HemisphereLight(0xdff4ff, 0x071526, 2.2);
      scene.add(hemiLight);

      // Key light casting soft shadow
      const keyLight = new THREE.DirectionalLight(0xffffff, 2.8);
      keyLight.position.set(3, 5, 4);
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      scene.add(keyLight);

      // Electric Cyan Rim Light (#00D1FF)
      const cyanRim = new THREE.PointLight(0x00d1ff, 3.5, 8);
      cyanRim.position.set(-3, 1.5, 2.5);
      scene.add(cyanRim);

      // Electric Magenta Rim Light (#FF4ED8)
      const magentaRim = new THREE.PointLight(0xff4ed8, 2.8, 8);
      magentaRim.position.set(3, 1.5, -2);
      scene.add(magentaRim);

      // Soft front fill
      const frontFill = new THREE.DirectionalLight(0xa5f3fc, 1.2);
      frontFill.position.set(0, 0, 4);
      scene.add(frontFill);

      // Ground Thruster Hover Glow
      const groundGlowGeo = new THREE.RingGeometry(0.15, 0.75, 32);
      const groundGlowMat = new THREE.MeshBasicMaterial({
        color: 0x00d1ff,
        transparent: true,
        opacity: 0.28,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const groundGlow = new THREE.Mesh(groundGlowGeo, groundGlowMat);
      groundGlow.rotation.x = -Math.PI / 2;
      groundGlow.position.y = -1.05;
      scene.add(groundGlow);

      // Ground Contact Shadow
      const shadowGeo = new THREE.CircleGeometry(0.85, 32);
      const shadowCanvas = document.createElement('canvas');
      shadowCanvas.width = 128;
      shadowCanvas.height = 128;
      const sCtx = shadowCanvas.getContext('2d')!;
      const sGrad = sCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
      sGrad.addColorStop(0, 'rgba(3, 6, 15, 0.6)');
      sGrad.addColorStop(0.6, 'rgba(3, 6, 15, 0.2)');
      sGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      sCtx.fillStyle = sGrad;
      sCtx.fillRect(0, 0, 128, 128);

      const shadowTex = new THREE.CanvasTexture(shadowCanvas);
      const shadowMat = new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        depthWrite: false,
      });
      const groundShadow = new THREE.Mesh(shadowGeo, shadowMat);
      groundShadow.rotation.x = -Math.PI / 2;
      groundShadow.position.y = -1.06;
      scene.add(groundShadow);

      // Pivot Group for the Robot Model (centered perfectly at visual origin)
      const pivotGroup = new THREE.Group();
      scene.add(pivotGroup);

      let buddyModel: THREE.Group | undefined;

      // Load Meshy AI Blue Buddy GLB Model
      const loader = new GLTFLoader();
      loader.load(
        '/models/blue-buddy.glb',
        (gltf) => {
          if (disposed) {
            disposeObject(gltf.scene);
            return;
          }

          buddyModel = gltf.scene;

          // Compute exact bounding box and center
          const bounds = new THREE.Box3().setFromObject(buddyModel);
          const size = bounds.getSize(new THREE.Vector3());
          const center = bounds.getCenter(new THREE.Vector3());

          // Normalization scale: target height ~1.85 units
          const maxDim = Math.max(size.x, size.y, size.z);
          const baseScale = (1.85 / (maxDim || 1)) * customScale;
          buddyModel.scale.setScalar(baseScale);

          // Center the model cleanly inside pivotGroup so rotations happen around its heart
          buddyModel.position.set(-center.x * baseScale, -center.y * baseScale, -center.z * baseScale);

          // Configure materials for maximum fidelity
          buddyModel.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              const mesh = child as THREE.Mesh;
              mesh.castShadow = true;
              mesh.receiveShadow = true;
              if (mesh.material) {
                const mat = mesh.material as THREE.MeshStandardMaterial;
                if (mat.map) {
                  mat.map.colorSpace = THREE.SRGBColorSpace;
                }
                mat.roughness = Math.min(mat.roughness ?? 0.5, 0.65);
                mat.needsUpdate = true;
              }
            }
          });

          pivotGroup.add(buddyModel);
          setIsLoaded(true);
        },
        undefined,
        (error) => {
          if (!disposed) {
            console.error('Unable to load the Blue Buddy GLB model.', error);
            setLoadError(true);
          }
        },
      );

      // Adaptive camera framing according to container size
      const updateCamera = (w: number, h: number) => {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();

        const isSmallAvatar = focus === 'head' || (focus === 'auto' && w <= 130 && h <= 130);
        if (isSmallAvatar) {
          // Zoomed portrait focused on cute head and headphones
          camera.position.set(0, 0.35, 2.7);
        } else if (compact) {
          camera.position.set(0, 0.05, 4.3);
        } else {
          camera.position.set(0, 0.0, 4.6);
        }
      };

      const handleResize = () => {
        if (!host || !renderer) return;
        const { width, height } = host.getBoundingClientRect();
        if (width === 0 || height === 0) return;
        renderer.setSize(width, height, false);
        updateCamera(width, height);
      };

      resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(host);
      handleResize();

      // Mouse tracking listener
      const handleMouseMove = (e: MouseEvent) => {
        if (!enableTracking) return;
        const rect = host.getBoundingClientRect();
        const clientX = e.clientX;
        const clientY = e.clientY;

        const x = ((clientX - rect.left) / rect.width) * 2 - 1;
        const y = -(((clientY - rect.top) / rect.height) * 2 - 1);

        mouseRef.current.targetX = Math.max(-1.3, Math.min(1.3, x));
        mouseRef.current.targetY = Math.max(-1.3, Math.min(1.3, y));
      };

      window.addEventListener('mousemove', handleMouseMove, { passive: true });

      // Main Render & Animation Loop
      const clock = new THREE.Clock();

      const render = () => {
        if (disposed || !renderer) return;
        frameId = window.requestAnimationFrame(render);

        const time = clock.getElapsedTime();

        // Mouse smooth lerping
        mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.065;
        mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.065;

        const mx = mouseRef.current.x;
        const my = mouseRef.current.y;

        // Jump physics arc on click
        let jumpY = 0;
        let jumpRotY = 0;
        if (isJumpingRef.current && jumpTimeRef.current > 0) {
          const elapsed = (Date.now() - jumpTimeRef.current) / 1000;
          if (elapsed < 1.1) {
            // Springy jump up
            jumpY = Math.sin(elapsed * Math.PI) * 0.42;
            // Celebratory spin/nod
            jumpRotY = Math.sin(elapsed * Math.PI) * 0.6;
          }
        }

        if (pivotGroup) {
          // Floating levitation
          if (enableFloating) {
            const floatSpeed = isHoveredRef.current ? 3.2 : 2.2;
            const floatY = Math.sin(time * floatSpeed) * 0.075 + jumpY;
            pivotGroup.position.y = floatY;
            pivotGroup.position.x = Math.sin(time * 1.4) * 0.015;

            // Hover ring pulse
            groundGlow.scale.setScalar(1 + Math.sin(time * floatSpeed) * 0.08);
            groundGlowMat.opacity = 0.28 + Math.sin(time * floatSpeed) * 0.08;
          } else {
            pivotGroup.position.y = jumpY;
          }

          // Mouse look tracking & hover reaction
          if (enableTracking) {
            const hoverTiltX = isHoveredRef.current ? 0.08 : 0;
            pivotGroup.rotation.y = THREE.MathUtils.lerp(
              pivotGroup.rotation.y,
              mx * 0.45 + jumpRotY,
              0.08
            );
            pivotGroup.rotation.x = THREE.MathUtils.lerp(
              pivotGroup.rotation.x,
              -my * 0.25 + hoverTiltX,
              0.08
            );
            pivotGroup.rotation.z = THREE.MathUtils.lerp(
              pivotGroup.rotation.z,
              -mx * 0.08,
              0.08
            );
          } else {
            pivotGroup.rotation.y = THREE.MathUtils.lerp(
              pivotGroup.rotation.y,
              Math.sin(time * 0.8) * 0.15 + jumpRotY,
              0.05
            );
          }
        }

        renderer.render(scene, camera);
      };

      frameId = window.requestAnimationFrame(render);

      return () => {
        disposed = true;
        window.removeEventListener('mousemove', handleMouseMove);
        window.cancelAnimationFrame(frameId);
        resizeObserver?.disconnect();
        if (buddyModel) disposeObject(buddyModel);
        groundGlowGeo.dispose();
        groundGlowMat.dispose();
        shadowGeo.dispose();
        shadowMat.dispose();
        shadowTex.dispose();
        const canvas = host.querySelector('canvas');
        if (canvas) host.removeChild(canvas);
        renderer?.dispose();
      };
    } catch (error) {
      console.error('Unable to initialize the Blue Buddy model.', error);
      setLoadError(true);
    }
  }, [compact, customScale, enableFloating, enableTracking, focus]);

  return (
    <div
      className={`blue-buddy-scene${compact ? ' blue-buddy-scene-compact' : ''} ${className}`}
      ref={hostRef}
      aria-label={accessibleLabel}
      role="img"
      style={{
        cursor: interactive ? 'pointer' : 'default',
        touchAction: 'none',
        position: 'relative',
        width: '100%',
        height: '100%',
      }}
      onClick={triggerHappyJump}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={interactive ? 'اضغط للقفز والترحيب! 🚀' : accessibleLabel}
    >
      {!isLoaded && !loadError && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            color: '#a5b8c7',
            fontSize: 12,
            background: 'rgba(5, 12, 26, 0.4)',
            backdropFilter: 'blur(4px)',
            borderRadius: 14,
            zIndex: 2,
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              border: '2px solid rgba(0, 209, 255, 0.25)',
              borderTopColor: '#00D1FF',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          <span style={{ fontSize: 11, color: '#38bdf8' }}>{loadingLabel}</span>
        </div>
      )}
      {loadError && (
        <span
          className="blue-buddy-error"
          style={{
            position: 'absolute',
            inset: 'auto 0 20px',
            color: '#f87171',
            textAlign: 'center',
            fontSize: 11,
          }}
        >
          {errorLabel}
        </span>
      )}
    </div>
  );
}

// Backward-compatibility aliases for anywhere RobotMascot3D or FixionMascot was imported
export { BlueBuddyModel as RobotMascot3D, BlueBuddyModel as FixionMascot };
