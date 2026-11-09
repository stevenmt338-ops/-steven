import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { WishItem } from '../types';
import { createMoonTexture, createStarGlowTexture, createFivePointedStarTexture, createSnowflakeTexture } from '../utils/textures';
import { soundEngine } from '../utils/audio';

interface WinterScene3DProps {
  wishes: WishItem[];
  selectedStarId: string | null;
  onSelectStar: (star: WishItem | null) => void;
  isTransforming: boolean;
  onTransformationComplete?: () => void;
  heroStarPos: [number, number, number] | null;
  mode: 'paper' | 'transforming' | 'arrived' | 'explore';
  onHoverStar?: (star: WishItem | null) => void;
}

// Math helpers pre-allocated at module scope to eliminate garbage collection
const _vec3 = new THREE.Vector3();
const _targetLookAt = new THREE.Vector3();
const _currentLookAt = new THREE.Vector3();
const _starScreenPos = new THREE.Vector2();

// Helper to generate an authentic 3D extruded five-pointed star geometry
function createFivePointedStarGeometry(outerR = 1.1, innerR = 0.45, depth = 0.3): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const points = 5;
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(angle) * r;
    const y = -Math.sin(angle) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();

  const extrudeSettings = {
    depth: depth,
    bevelEnabled: true,
    bevelThickness: 0.1,
    bevelSize: 0.08,
    bevelSegments: 2,
  };
  const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geo.center();
  return geo;
}

export const WinterScene3D: React.FC<WinterScene3DProps> = ({
  wishes,
  selectedStarId,
  onSelectStar,
  isTransforming,
  onTransformationComplete,
  heroStarPos,
  mode,
  onHoverStar,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  // Hero five-pointed star objects (persists throughout journey)
  const heroStarMeshRef = useRef<THREE.Group | null>(null);
  const heroStarCoreRef = useRef<THREE.Mesh | null>(null);
  const heroHaloRef = useRef<THREE.Sprite | null>(null);
  const heroLightRef = useRef<THREE.PointLight | null>(null);

  const wishStarsGroupRef = useRef<THREE.Group | null>(null);
  const snowSystemRef = useRef<THREE.Points | null>(null);
  const animFrameIdRef = useRef<number>(0);
  const clockRef = useRef<THREE.Clock>(new THREE.Clock());

  // Continuous flight state (driven internally by Three.js loop to prevent React re-renders)
  const flightProgressRef = useRef<number>(0);
  const isFlyingRef = useRef<boolean>(false);
  const hasTriggeredArrivalRef = useRef<boolean>(false);
  const flightCurveRef = useRef<THREE.CatmullRomCurve3 | null>(null);

  // Target summit coordinate where the hero star flies and settles
  const summitTargetRef = useRef<THREE.Vector3>(new THREE.Vector3(12, 68, -135));

  // Interactive camera controls state
  const orbitStateRef = useRef({
    isDragging: false,
    prevPointerX: 0,
    prevPointerY: 0,
    yaw: 0.1,
    pitch: 0.14,
    targetYaw: 0.1,
    targetPitch: 0.14,
    zoom: 1,
    targetZoom: 1,
  });

  // Keep callback refs stable
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const isTransformingRef = useRef(isTransforming);
  isTransformingRef.current = isTransforming;
  const wishesRef = useRef(wishes);
  wishesRef.current = wishes;
  const selectedStarIdRef = useRef(selectedStarId);
  selectedStarIdRef.current = selectedStarId;
  const onSelectStarRef = useRef(onSelectStar);
  onSelectStarRef.current = onSelectStar;
  const onHoverStarRef = useRef(onHoverStar);
  onHoverStarRef.current = onHoverStar;
  const onTransformationCompleteRef = useRef(onTransformationComplete);
  onTransformationCompleteRef.current = onTransformationComplete;

  // Initialize Three.js Scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // 1. Scene & Midnight Atmosphere
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020817);
    scene.fog = new THREE.FogExp2(0x020817, 0.022); // Starts deep for paper scene
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(
      52,
      container.clientWidth / container.clientHeight,
      0.1,
      1200
    );
    camera.position.set(0, 0, 16);
    _currentLookAt.set(0, 0, 0);
    camera.lookAt(_currentLookAt);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    // 4. Studio Environment Lighting
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // Balanced Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0x0a2a52, 0x020817, 0.9);
    scene.add(hemiLight);

    const moonLight = new THREE.DirectionalLight(0x48DFFF, 1.3);
    moonLight.position.set(-80, 130, -110);
    scene.add(moonLight);

    const ambientLight = new THREE.AmbientLight(0x051833, 0.7);
    scene.add(ambientLight);

    // 5. Large Subtle Luminous Blue Moon
    const moonGeo = new THREE.SphereGeometry(24, 32, 32);
    const moonMat = new THREE.MeshBasicMaterial({
      map: createMoonTexture(),
      color: 0x48DFFF,
      transparent: true,
      opacity: 0.95,
    });
    const moonMesh = new THREE.Mesh(moonGeo, moonMat);
    moonMesh.position.set(-140, 115, -280);
    scene.add(moonMesh);

    const moonGlowMat = new THREE.SpriteMaterial({
      map: createStarGlowTexture(),
      color: 0x48DFFF,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
    });
    const moonGlow = new THREE.Sprite(moonGlowMat);
    moonGlow.scale.set(135, 135, 1);
    moonGlow.position.copy(moonMesh.position);
    scene.add(moonGlow);

    // 6. Ambient Celestial Stars
    const ambientStarCount = 2400;
    const starPositions = new Float32Array(ambientStarCount * 3);
    const starColors = new Float32Array(ambientStarCount * 3);
    const starColorBase = new THREE.Color(0x48DFFF);
    const starWhite = new THREE.Color(0xdcf8ff);

    for (let i = 0; i < ambientStarCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 360 + Math.random() * 250;

      const y = Math.abs(Math.cos(phi)) * r + 10;
      const x = Math.sin(phi) * Math.sin(theta) * r;
      const z = Math.sin(phi) * Math.cos(theta) * r;

      starPositions[i * 3] = x;
      starPositions[i * 3 + 1] = y;
      starPositions[i * 3 + 2] = z;

      const mixed = Math.random() > 0.4 ? starColorBase : starWhite;
      starColors[i * 3] = mixed.r;
      starColors[i * 3 + 1] = mixed.g;
      starColors[i * 3 + 2] = mixed.b;
    }

    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

    const starMat = new THREE.PointsMaterial({
      size: 2.2,
      vertexColors: true,
      map: createStarGlowTexture(),
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const ambientStars = new THREE.Points(starGeo, starMat);
    scene.add(ambientStars);

    // 7. Snowy Mountains (Procedural Horizon Ranges with Majestic Peaks)
    const mountainGroup = new THREE.Group();
    const mountainMat = new THREE.MeshStandardMaterial({
      color: 0x051633,
      roughness: 0.75,
      metalness: 0.25,
      flatShading: true,
    });

    const capMat = new THREE.MeshStandardMaterial({
      color: 0x48DFFF,
      roughness: 0.35,
      metalness: 0.45,
      flatShading: true,
    });

    // Outer & Middle Mountain ranges with jagged peaks
    const mountainRanges = [
      { r: 240, count: 28, heightMax: 95, heightMin: 45 },
      { r: 180, count: 22, heightMax: 72, heightMin: 35 },
      { r: 130, count: 18, heightMax: 52, heightMin: 22 },
    ];

    mountainRanges.forEach((range) => {
      const coneGeo = new THREE.ConeGeometry(38, range.heightMax, 6, 2);
      coneGeo.computeVertexNormals();

      for (let i = 0; i < range.count; i++) {
        const angle = (i / range.count) * Math.PI * 2 + (Math.random() - 0.5) * 0.2;
        const dist = range.r + (Math.random() - 0.5) * 20;
        const x = Math.cos(angle) * dist;
        const z = Math.sin(angle) * dist;

        if (Math.abs(x) < 25 && z > -30 && z < 40) continue;

        const h = range.heightMin + Math.random() * (range.heightMax - range.heightMin);
        const mountain = new THREE.Mesh(coneGeo, mountainMat);
        mountain.scale.set(0.85 + Math.random() * 0.6, h / range.heightMax, 0.85 + Math.random() * 0.6);
        mountain.position.set(x, h / 2 - 12, z);
        mountain.rotation.y = Math.random() * Math.PI;
        mountainGroup.add(mountain);

        // Snow Cap
        const capGeo = new THREE.ConeGeometry(19, h * 0.38, 6, 1);
        const cap = new THREE.Mesh(capGeo, capMat);
        cap.position.set(x, h - (h * 0.38) / 2 - 12, z);
        cap.rotation.y = mountain.rotation.y;
        cap.scale.copy(mountain.scale);
        mountainGroup.add(cap);
      }
    });

    // The Crown Snowy Mountain Summit (The Hero Summit Destination)
    const heroSummitPeakGeo = new THREE.ConeGeometry(46, 78, 7, 2);
    const heroSummit = new THREE.Mesh(heroSummitPeakGeo, mountainMat);
    heroSummit.position.set(12, 27, -135);
    mountainGroup.add(heroSummit);

    const heroSummitCapGeo = new THREE.ConeGeometry(24, 34, 7, 1);
    const heroSummitCap = new THREE.Mesh(heroSummitCapGeo, capMat);
    heroSummitCap.position.set(12, 53, -135);
    mountainGroup.add(heroSummitCap);

    scene.add(mountainGroup);

    // 8. Ground Snow Valley
    const groundGeo = new THREE.PlaneGeometry(360, 360, 48, 48);
    groundGeo.rotateX(-Math.PI / 2);
    const posAttr = groundGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const gx = posAttr.getX(i);
      const gz = posAttr.getZ(i);
      const distFromCenter = Math.sqrt(gx * gx + gz * gz);
      const elevation = Math.sin(gx * 0.04) * 3 + Math.cos(gz * 0.04) * 3 + (distFromCenter > 70 ? (distFromCenter - 70) * 0.25 : 0);
      posAttr.setY(i, elevation - 8);
    }
    groundGeo.computeVertexNormals();
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x030f24,
      roughness: 0.85,
      metalness: 0.15,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    scene.add(ground);

    // 9. Frozen Pine Forest
    const treeTrunkGeo = new THREE.CylinderGeometry(0.3, 0.5, 4, 6);
    const treeFoliageGeo = new THREE.ConeGeometry(2.4, 7, 6);
    const treeWoodMat = new THREE.MeshStandardMaterial({ color: 0x020914, roughness: 0.9 });
    const treeSnowMat = new THREE.MeshStandardMaterial({
      color: 0x0b2447,
      emissive: 0x48DFFF,
      emissiveIntensity: 0.12,
      roughness: 0.6,
      metalness: 0.3,
    });

    const forestGroup = new THREE.Group();
    const treeCount = 140;
    for (let i = 0; i < treeCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 28 + Math.random() * 95;
      const tx = Math.cos(angle) * dist;
      const tz = Math.sin(angle) * dist;

      if (Math.abs(tx) < 14 && Math.abs(tz) < 20) continue;

      const singleTree = new THREE.Group();
      const trunk = new THREE.Mesh(treeTrunkGeo, treeWoodMat);
      trunk.position.y = 2;
      singleTree.add(trunk);

      for (let t = 0; t < 3; t++) {
        const foliage = new THREE.Mesh(treeFoliageGeo, treeSnowMat);
        foliage.position.y = 4.2 + t * 2.2;
        foliage.scale.set(1 - t * 0.22, 1 - t * 0.15, 1 - t * 0.22);
        singleTree.add(foliage);
      }

      const scale = 0.75 + Math.random() * 0.6;
      singleTree.scale.set(scale, scale, scale);
      singleTree.position.set(tx, -7, tz);
      singleTree.rotation.y = Math.random() * Math.PI;
      forestGroup.add(singleTree);
    }
    scene.add(forestGroup);

    // 10. Falling Snowflakes & Drifting Cosmic Dust
    const snowCount = 1200;
    const snowGeo = new THREE.BufferGeometry();
    const snowPositions = new Float32Array(snowCount * 3);
    const snowVelocities = new Float32Array(snowCount * 3);

    for (let i = 0; i < snowCount; i++) {
      snowPositions[i * 3] = (Math.random() - 0.5) * 220;
      snowPositions[i * 3 + 1] = Math.random() * 120 - 10;
      snowPositions[i * 3 + 2] = (Math.random() - 0.5) * 220;

      snowVelocities[i * 3] = (Math.random() - 0.5) * 0.3;
      snowVelocities[i * 3 + 1] = -0.35 - Math.random() * 0.45;
      snowVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.3;
    }
    snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPositions, 3));
    const snowMat = new THREE.PointsMaterial({
      size: 1.8,
      map: createSnowflakeTexture(),
      color: 0x48DFFF,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const snowSystem = new THREE.Points(snowGeo, snowMat);
    scene.add(snowSystem);
    snowSystemRef.current = snowSystem;

    // 11. Hero Glowing Five-Pointed Star (Same object throughout entire journey)
    const heroGroup = new THREE.Group();
    heroGroup.visible = false;
    heroGroup.position.set(0, 0, 10);

    // 3D Extruded Five-Pointed Star Geometry (Strictly 5-pointed, not a circle)
    const starGeo3D = createFivePointedStarGeometry(1.2, 0.48, 0.3);
    const heroStarMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x48DFFF,
      emissiveIntensity: 1.2,
      roughness: 0.15,
      metalness: 0.4,
    });
    const heroStarMesh = new THREE.Mesh(starGeo3D, heroStarMat);
    heroGroup.add(heroStarMesh);
    heroStarCoreRef.current = heroStarMesh;

    // Five-Pointed Starburst Halo Sprite
    const heroHaloMat = new THREE.SpriteMaterial({
      map: createFivePointedStarTexture(),
      color: 0x48DFFF,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
    });
    const heroHalo = new THREE.Sprite(heroHaloMat);
    heroHalo.scale.set(9.5, 9.5, 1);
    heroGroup.add(heroHalo);
    heroHaloRef.current = heroHalo;

    // Dynamic Point Light casting blue light on surroundings
    const heroLight = new THREE.PointLight(0x48DFFF, 3.2, 55);
    heroGroup.add(heroLight);
    heroLightRef.current = heroLight;

    scene.add(heroGroup);
    heroStarMeshRef.current = heroGroup;

    // 12. Wish Stars Group
    const wishGroup = new THREE.Group();
    scene.add(wishGroup);
    wishStarsGroupRef.current = wishGroup;

    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // 13. Continuous Animation Loop
    const tick = () => {
      const delta = clockRef.current.getDelta();
      const elapsed = clockRef.current.getElapsedTime();

      // Animate Snow
      if (snowSystemRef.current) {
        const positions = snowSystemRef.current.geometry.attributes.position.array as Float32Array;
        for (let i = 0; i < snowCount; i++) {
          positions[i * 3 + 1] += snowVelocities[i * 3 + 1];
          positions[i * 3] += Math.sin(elapsed * 0.5 + i) * 0.04;
          if (positions[i * 3 + 1] < -10) {
            positions[i * 3 + 1] = 95;
            positions[i * 3] = (Math.random() - 0.5) * 220;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 220;
          }
        }
        snowSystemRef.current.geometry.attributes.position.needsUpdate = true;
      }

      // Gentle Cosmos Rotation
      ambientStars.rotation.y = elapsed * 0.003;

      // Rotate Hero 5-Pointed Star so it gleams
      if (heroStarCoreRef.current) {
        heroStarCoreRef.current.rotation.z += delta * 1.2;
      }

      const curMode = modeRef.current;

      // Atmospheric Fog Damping: Deep focus for paper, dramatic vista for mountain cinema
      if (scene.fog && 'density' in scene.fog) {
        const targetFog = curMode === 'paper' ? 0.022 : 0.0035;
        (scene.fog as THREE.FogExp2).density = THREE.MathUtils.damp(
          (scene.fog as THREE.FogExp2).density,
          targetFog,
          2.2,
          delta
        );
      }

      if (curMode === 'paper') {
        // Intimate gentle floating camera for 2D paper writing
        const targetCamX = Math.sin(elapsed * 0.4) * 0.35;
        const targetCamY = Math.cos(elapsed * 0.3) * 0.25;
        camera.position.x = THREE.MathUtils.damp(camera.position.x, targetCamX, 2, delta);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, targetCamY, 2, delta);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, 16, 2, delta);
        _targetLookAt.set(0, 0, 0);
        _currentLookAt.lerp(_targetLookAt, 0.05);
        camera.lookAt(_currentLookAt);
      } else if (curMode === 'transforming' && flightCurveRef.current && heroStarMeshRef.current) {
        heroStarMeshRef.current.visible = true;

        // Advance flight progress internally (duration: 6.2s)
        if (isFlyingRef.current) {
          flightProgressRef.current = Math.min(1, flightProgressRef.current + delta / 6.2);
        }

        const prog = flightProgressRef.current;
        const curvePoint = flightCurveRef.current.getPointAt(prog);
        heroStarMeshRef.current.position.copy(curvePoint);

        // Dynamic halo expansion
        if (heroHaloRef.current) {
          const haloScale = 8 + Math.sin(elapsed * 8) * 1.5 + prog * 5;
          heroHaloRef.current.scale.set(haloScale, haloScale, 1);
        }

        // Camera smoothly follows behind and beneath the star, framing the snowy mountain summit
        const tangent = flightCurveRef.current.getTangentAt(prog).normalize();
        const camOffset = _vec3
          .copy(tangent)
          .multiplyScalar(-16)
          .add(new THREE.Vector3(0, 5, 10 * (1 - prog * 0.4)));
        const desiredCamPos = _vec3.copy(curvePoint).add(camOffset);

        camera.position.x = THREE.MathUtils.damp(camera.position.x, desiredCamPos.x, 3.2, delta);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, desiredCamPos.y, 3.2, delta);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, desiredCamPos.z, 3.2, delta);

        _targetLookAt.copy(curvePoint);
        _currentLookAt.lerp(_targetLookAt, 0.12);
        camera.lookAt(_currentLookAt);

        // On reaching summit
        if (prog >= 1 && !hasTriggeredArrivalRef.current) {
          hasTriggeredArrivalRef.current = true;
          isFlyingRef.current = false;
          soundEngine.playChime(1760); // Brilliant summit chime

          // Guarantee transition to final mountain scene
          setTimeout(() => {
            onTransformationCompleteRef.current?.();
          }, 800);
        }
      } else if (curMode === 'arrived' || curMode === 'explore') {
        // Orbit and panoramic mountain view controls
        const orbit = orbitStateRef.current;
        orbit.yaw = THREE.MathUtils.damp(orbit.yaw, orbit.targetYaw, 4, delta);
        orbit.pitch = THREE.MathUtils.damp(orbit.pitch, orbit.targetPitch, 4, delta);
        orbit.zoom = THREE.MathUtils.damp(orbit.zoom, orbit.targetZoom, 4, delta);

        // Center orbit around the snowy mountain summit
        const summitPos = summitTargetRef.current;
        const dist = 75 * orbit.zoom;
        const cx = summitPos.x + Math.sin(orbit.yaw) * Math.cos(orbit.pitch) * dist;
        const cy = summitPos.y + Math.sin(orbit.pitch) * dist + 12;
        const cz = summitPos.z + Math.cos(orbit.yaw) * Math.cos(orbit.pitch) * dist;

        camera.position.set(cx, cy, cz);
        _targetLookAt.copy(summitPos);
        _currentLookAt.lerp(_targetLookAt, 0.08);
        camera.lookAt(_currentLookAt);

        // Pulsing brilliance for hero star at the summit
        if (heroHaloRef.current) {
          const pulse = 1.0 + Math.sin(elapsed * 3) * 0.3;
          heroHaloRef.current.scale.set(12 * pulse, 12 * pulse, 1);
        }
      }

      renderer.render(scene, camera);
      animFrameIdRef.current = requestAnimationFrame(tick);
    };

    animFrameIdRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animFrameIdRef.current);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Set up flight trajectory directly toward the snowy mountain summit
  useEffect(() => {
    if (isTransforming) {
      flightProgressRef.current = 0;
      isFlyingRef.current = true;
      hasTriggeredArrivalRef.current = false;

      // Summit coordinate: highest mountain peak
      const summitPos = heroStarPos
        ? new THREE.Vector3(heroStarPos[0], heroStarPos[1], heroStarPos[2])
        : new THREE.Vector3(12, 68, -135);
      summitTargetRef.current = summitPos;

      // Continuous flight spline: from 2D paper center up through valley to snowy mountain summit
      const p0 = new THREE.Vector3(0, 0, 10);
      const p1 = new THREE.Vector3(0, 6, 2);
      const p2 = new THREE.Vector3(-6, 20, -35);
      const p3 = new THREE.Vector3(6, 42, -80);
      const p4 = summitPos;

      flightCurveRef.current = new THREE.CatmullRomCurve3([p0, p1, p2, p3, p4]);

      if (heroStarMeshRef.current) {
        heroStarMeshRef.current.visible = true;
        heroStarMeshRef.current.position.copy(p0);
      }
    }
  }, [isTransforming, heroStarPos]);

  // Update Constellation Wish Stars in 3D Scene with 5-Pointed Star Geometries
  useEffect(() => {
    const wishGroup = wishStarsGroupRef.current;
    if (!wishGroup) return;

    while (wishGroup.children.length > 0) {
      const child = wishGroup.children[0];
      wishGroup.remove(child);
    }

    const starGlowTex = createFivePointedStarTexture();
    const starGeo5Point = createFivePointedStarGeometry(0.8, 0.34, 0.2);

    wishes.forEach((w) => {
      const starObj = new THREE.Group();
      starObj.position.set(w.position[0], w.position[1], w.position[2]);
      starObj.userData = { wish: w };

      const isSelected = selectedStarId === w.id;

      // 3D 5-pointed star mesh
      const starMat = new THREE.MeshStandardMaterial({
        color: isSelected ? 0xffffff : 0xd8f8ff,
        emissive: 0x48DFFF,
        emissiveIntensity: isSelected ? 1.0 : 0.6,
      });
      const starMesh = new THREE.Mesh(starGeo5Point, starMat);
      starMesh.scale.set(w.size * 0.8, w.size * 0.8, w.size * 0.8);
      starObj.add(starMesh);

      // Luminous 5-pointed halo sprite
      const haloMat = new THREE.SpriteMaterial({
        map: starGlowTex,
        color: 0x48DFFF,
        transparent: true,
        opacity: isSelected ? 0.95 : 0.65 * w.brightness,
        blending: THREE.AdditiveBlending,
      });
      const halo = new THREE.Sprite(haloMat);
      const baseScale = (isSelected ? 8.5 : 5.0) * w.size;
      halo.scale.set(baseScale, baseScale, 1);
      starObj.add(halo);

      wishGroup.add(starObj);
    });
  }, [wishes, selectedStarId]);

  // Pointer & Touch interactions for exploring the starry sky
  const handlePointerDown = (e: React.PointerEvent) => {
    if (mode !== 'explore' && mode !== 'arrived') return;
    orbitStateRef.current.isDragging = true;
    orbitStateRef.current.prevPointerX = e.clientX;
    orbitStateRef.current.prevPointerY = e.clientY;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!orbitStateRef.current.isDragging) {
      if ((mode === 'explore' || mode === 'arrived') && cameraRef.current && wishStarsGroupRef.current) {
        const rect = mountRef.current?.getBoundingClientRect();
        if (!rect) return;
        _starScreenPos.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        _starScreenPos.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        const raycaster = new THREE.Raycaster();
        raycaster.params.Points = { threshold: 4 };
        raycaster.setFromCamera(_starScreenPos, cameraRef.current);

        const hits = raycaster.intersectObjects(wishStarsGroupRef.current.children, true);
        if (hits.length > 0) {
          let topGroup = hits[0].object;
          while (topGroup.parent && topGroup.parent !== wishStarsGroupRef.current) {
            topGroup = topGroup.parent;
          }
          const wish = topGroup.userData?.wish as WishItem | undefined;
          if (wish) {
            if (mountRef.current) mountRef.current.style.cursor = 'pointer';
            onHoverStarRef.current?.(wish);
            return;
          }
        }
        if (mountRef.current) mountRef.current.style.cursor = 'grab';
        onHoverStarRef.current?.(null);
      }
      return;
    }

    const dx = e.clientX - orbitStateRef.current.prevPointerX;
    const dy = e.clientY - orbitStateRef.current.prevPointerY;
    orbitStateRef.current.prevPointerX = e.clientX;
    orbitStateRef.current.prevPointerY = e.clientY;

    const orbit = orbitStateRef.current;
    orbit.targetYaw -= dx * 0.005;
    orbit.targetPitch = Math.max(-0.2, Math.min(0.85, orbit.targetPitch + dy * 0.005));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    const wasDragging =
      Math.abs(e.clientX - orbitStateRef.current.prevPointerX) > 4 ||
      Math.abs(e.clientY - orbitStateRef.current.prevPointerY) > 4;
    orbitStateRef.current.isDragging = false;
    if (mountRef.current) {
      mountRef.current.style.cursor = mode === 'explore' ? 'grab' : 'default';
    }

    if (!wasDragging && (mode === 'explore' || mode === 'arrived') && cameraRef.current && wishStarsGroupRef.current) {
      const rect = mountRef.current?.getBoundingClientRect();
      if (!rect) return;
      _starScreenPos.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      _starScreenPos.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.params.Points = { threshold: 4 };
      raycaster.setFromCamera(_starScreenPos, cameraRef.current);

      const hits = raycaster.intersectObjects(wishStarsGroupRef.current.children, true);
      if (hits.length > 0) {
        let topGroup = hits[0].object;
        while (topGroup.parent && topGroup.parent !== wishStarsGroupRef.current) {
          topGroup = topGroup.parent;
        }
        const wish = topGroup.userData?.wish as WishItem | undefined;
        if (wish) {
          soundEngine.playChime(1318.51);
          onSelectStarRef.current(wish);
          return;
        }
      } else {
        onSelectStarRef.current(null);
      }
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (mode !== 'explore' && mode !== 'arrived') return;
    const orbit = orbitStateRef.current;
    orbit.targetZoom = Math.max(0.4, Math.min(2.0, orbit.targetZoom + e.deltaY * 0.001));
  };

  return (
    <div
      ref={mountRef}
      className="absolute inset-0 w-full h-full overflow-hidden touch-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onWheel={handleWheel}
      style={{
        cursor: mode === 'explore' ? 'grab' : 'default',
      }}
    />
  );
};
