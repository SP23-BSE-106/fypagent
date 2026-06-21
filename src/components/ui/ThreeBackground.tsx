"use client";

import * as React from "react";
import * as THREE from "three";

interface ThreeBackgroundProps {
  className?: string;
}

export const ThreeBackground: React.FC<ThreeBackgroundProps> = ({ className }) => {
  const mountRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!mountRef.current) return;

    const container = mountRef.current;
    let width = container.clientWidth;
    let height = container.clientHeight;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // Scene
    const scene = new THREE.Scene();

    // Camera
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.z = 55;
    camera.position.y = 5;

    // Mouse tracker
    const mouse = new THREE.Vector2(0, 0);
    const targetRotation = new THREE.Vector2(0, 0);

    // ── PARTICLE GRID ──────────────────────────────────────────────────
    const GRID_W = 48;
    const GRID_H = 28;
    const SPACING = 2.4;

    const particleCount = GRID_W * GRID_H;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    const accentColor = new THREE.Color("#5BE7C4");
    const dimColor = new THREE.Color("#1E3A5F");

    let idx = 0;
    for (let ix = 0; ix < GRID_W; ix++) {
      for (let iy = 0; iy < GRID_H; iy++) {
        positions[idx * 3]     = (ix - GRID_W / 2) * SPACING;
        positions[idx * 3 + 1] = (iy - GRID_H / 2) * SPACING;
        positions[idx * 3 + 2] = 0;

        const edge = Math.min(ix, GRID_W - 1 - ix, iy, GRID_H - 1 - iy);
        const t = Math.pow(edge / (Math.min(GRID_W, GRID_H) / 2), 1.5);
        const col = dimColor.clone().lerp(accentColor, t * 0.35);
        colors[idx * 3]     = col.r;
        colors[idx * 3 + 1] = col.g;
        colors[idx * 3 + 2] = col.b;
        sizes[idx] = 1.8 + Math.random() * 2.2;
        idx++;
      }
    }

    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    particleGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    particleGeo.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

    const particleMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uMouse: { value: new THREE.Vector2(0, 0) },
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        varying float vAlpha;
        uniform float uTime;
        uniform vec2 uMouse;
        void main() {
          vColor = color;
          vec3 pos = position;
          float dist = length(position.xy - uMouse * 40.0);
          float wave = sin(pos.x * 0.18 + uTime * 1.2) * cos(pos.y * 0.18 + uTime * 0.9) * 3.5;
          float ripple = sin(dist * 0.3 - uTime * 2.5) * (1.0 / (1.0 + dist * 0.15)) * 6.0;
          pos.z += wave + ripple;
          vAlpha = 0.35 + 0.65 * (pos.z + 10.0) / 20.0;
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = size * (200.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          if (d > 0.5) discard;
          float alpha = smoothstep(0.5, 0.1, d) * vAlpha;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      vertexColors: true,
    });

    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // ── WIREFRAME SPHERE ───────────────────────────────────────────────
    const sphereGeo = new THREE.IcosahedronGeometry(8, 2);
    const wireframeMat = new THREE.MeshBasicMaterial({
      color: 0x5be7c4,
      wireframe: true,
      transparent: true,
      opacity: 0.12,
    });
    const sphere = new THREE.Mesh(sphereGeo, wireframeMat);
    sphere.position.set(28, 5, -8);
    scene.add(sphere);

    // ── INNER SOLID SPHERE ─────────────────────────────────────────────
    const innerGeo = new THREE.IcosahedronGeometry(5, 1);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0x5be7c4,
      wireframe: true,
      transparent: true,
      opacity: 0.06,
    });
    const innerSphere = new THREE.Mesh(innerGeo, innerMat);
    innerSphere.position.set(28, 5, -8);
    scene.add(innerSphere);

    // ── FLOATING RING ──────────────────────────────────────────────────
    const ringGeo = new THREE.TorusGeometry(11, 0.06, 3, 80);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x5be7c4,
      transparent: true,
      opacity: 0.18,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.set(28, 5, -8);
    ring.rotation.x = Math.PI / 2.8;
    scene.add(ring);

    // Second ring
    const ring2 = ring.clone();
    ring2.rotation.z = Math.PI / 3;
    ring2.material = ringMat.clone();
    (ring2.material as THREE.MeshBasicMaterial).opacity = 0.08;
    scene.add(ring2);

    // ── AMBIENT GLOW PLANES ────────────────────────────────────────────
    const glowGeo = new THREE.PlaneGeometry(35, 35);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x5be7c4,
      transparent: true,
      opacity: 0.018,
      side: THREE.DoubleSide,
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.set(28, 5, -10);
    scene.add(glow);

    // ── MOUSE HANDLER ──────────────────────────────────────────────────
    // ── MOUSE HANDLER (rAF throttled) ─────────────────────────────────────
    let mouseTargetX = mouse.x;
    let mouseTargetY = mouse.y;
    let mouseRafId: number | null = null;

    const onMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouseTargetX = ((e.clientX - rect.left) / Math.max(1, width)) * 2 - 1;
      mouseTargetY = -((e.clientY - rect.top) / Math.max(1, height)) * 2 + 1;

      if (mouseRafId != null) return;
      mouseRafId = window.requestAnimationFrame(() => {
        mouse.x = mouseTargetX;
        mouse.y = mouseTargetY;
        mouseRafId = null;
      });
    };
    window.addEventListener("mousemove", onMouseMove, { passive: true });

    // ── RESIZE HANDLER (debounced) ───────────────────────────────────────
    let resizeTimeoutId: number | null = null;
    const onResize = () => {
      if (resizeTimeoutId != null) window.clearTimeout(resizeTimeoutId);
      resizeTimeoutId = window.setTimeout(() => {
        width = container.clientWidth;
        height = container.clientHeight;

        renderer.setSize(width, height);
        camera.aspect = width / Math.max(1, height);
        camera.updateProjectionMatrix();
      }, 80);
    };
    window.addEventListener("resize", onResize);

    // ── ANIMATION LOOP ─────────────────────────────────────────────────
    let frameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const t = prefersReducedMotion ? 0 : clock.getElapsedTime();

      // Smooth mouse follow
      targetRotation.x += (mouse.y * 0.3 - targetRotation.x) * 0.05;
      targetRotation.y += (mouse.x * 0.3 - targetRotation.y) * 0.05;

      particleMat.uniforms.uTime.value = t;
      particleMat.uniforms.uMouse.value.set(
        Math.max(-1, Math.min(1, mouse.x)),
        Math.max(-1, Math.min(1, mouse.y))
      );

      particles.rotation.x = targetRotation.x * 0.35;
      particles.rotation.y = targetRotation.y * 0.35;

      // Orbit the sphere + rings
      sphere.rotation.y = t * 0.18;
      sphere.rotation.x = t * 0.11;
      innerSphere.rotation.y = -t * 0.22;
      innerSphere.rotation.x = t * 0.14;
      ring.rotation.y = t * 0.25;
      ring2.rotation.z = t * 0.15 + Math.PI / 3;

      // Float gently
      const floatY = 5 + Math.sin(t * 0.7) * 1.2;
      sphere.position.y = floatY;
      innerSphere.position.y = floatY;
      ring.position.y = floatY;
      ring2.position.y = floatY;

      renderer.render(scene, camera);
    };

    if (prefersReducedMotion) {
      // Render a single frame and stop.
      particleMat.uniforms.uTime.value = 0;
      particleMat.uniforms.uMouse.value.set(mouse.x, mouse.y);
      renderer.render(scene, camera);
    } else {
      animate();
    }

    // ── CLEANUP ────────────────────────────────────────────────────────
    return () => {
      if (mouseRafId != null) window.cancelAnimationFrame(mouseRafId);
      if (resizeTimeoutId != null) window.clearTimeout(resizeTimeoutId);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", onResize);

      cancelAnimationFrame(frameId);

      // Dispose GPU resources
      particleGeo.dispose();
      particleMat.dispose();

      sphereGeo.dispose();
      (sphere.material as THREE.Material).dispose();
      innerGeo.dispose();
      (innerSphere.material as THREE.Material).dispose();

      ringGeo.dispose();
      (ring.material as THREE.Material).dispose();
      ring2.geometry.dispose();
      (ring2.material as THREE.Material).dispose();

      glowGeo.dispose();
      (glow.material as THREE.Material).dispose();

      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className={className}
      style={{ position: "absolute", inset: 0, overflow: "hidden" }}
    />
  );
};
