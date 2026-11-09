import * as THREE from 'three';

/**
 * Procedural texture generators adhering strictly to:
 * - Midnight navy (#020817) and electric ice blue (#48DFFF)
 * - Zero external 404 dependencies
 * - Explicit sRGBColorSpace
 */

// 1. Star Glow Billboard Texture (Soft electric-blue luminous halo)
export function createStarGlowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.15, 'rgba(72, 223, 255, 0.95)');
  gradient.addColorStop(0.4, 'rgba(72, 223, 255, 0.45)');
  gradient.addColorStop(0.7, 'rgba(72, 223, 255, 0.12)');
  gradient.addColorStop(1, 'rgba(2, 8, 23, 0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// 1b. Distinct Five-Pointed Glowing Starburst Texture
export function createFivePointedStarTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const cx = 128;
  const cy = 128;

  // Outer ambient glow
  const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, 120);
  halo.addColorStop(0, 'rgba(72, 223, 255, 0.7)');
  halo.addColorStop(0.35, 'rgba(72, 223, 255, 0.25)');
  halo.addColorStop(0.7, 'rgba(72, 223, 255, 0.05)');
  halo.addColorStop(1, 'rgba(2, 8, 23, 0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, 256, 256);

  // Five radiant light spikes passing through the 5 points
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    const grad = ctx.createLinearGradient(0, -115, 0, 115);
    grad.addColorStop(0, 'rgba(72, 223, 255, 0)');
    grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.9)');
    grad.addColorStop(1, 'rgba(72, 223, 255, 0)');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, -115);
    ctx.lineTo(0, 0);
    ctx.stroke();
    ctx.restore();
  }

  // Draw solid 5-pointed star shape at center with bright core
  const outerR = 52;
  const innerR = 21;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();

  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = '#48DFFF';
  ctx.shadowBlur = 18;
  ctx.fill();

  ctx.strokeStyle = 'rgba(72, 223, 255, 0.9)';
  ctx.lineWidth = 3;
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// 2. Large Subtle Blue Moon Surface Texture
export function createMoonTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Dark midnight navy base with icy blue tint
  ctx.fillStyle = '#061633';
  ctx.fillRect(0, 0, 512, 512);

  // Procedural maria (craters and lunar frost patterns)
  for (let i = 0; i < 40; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = 20 + Math.random() * 70;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, 'rgba(72, 223, 255, 0.22)');
    grad.addColorStop(0.7, 'rgba(30, 90, 140, 0.15)');
    grad.addColorStop(1, 'rgba(6, 22, 51, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Fine crater rims
  for (let i = 0; i < 80; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = 4 + Math.random() * 15;
    ctx.strokeStyle = 'rgba(72, 223, 255, 0.35)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// 3. Falling Snow Particle Texture
export function createSnowflakeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
  gradient.addColorStop(0.35, 'rgba(72, 223, 255, 0.6)');
  gradient.addColorStop(0.7, 'rgba(72, 223, 255, 0.15)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
