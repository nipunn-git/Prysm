"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";

export function ParticleWave({
  className = "",
  particleColor = "#38bdf8",
  particleCountX = 65,
  particleCountZ = 65,
  particleSeparation = 1.4,
  waveSpeed = 1.1,
  waveAmplitude = 1.6,
  cameraHeight = 12,
  cameraDistance = 24,
  opacity = 0.35,
}) {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let animationFrameId;
    let width = container.clientWidth || window.innerWidth;
    let height = container.clientHeight || window.innerHeight;

    // Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, width / height, 1, 1000);
    camera.position.set(0, cameraHeight, cameraDistance);
    camera.lookAt(0, 0, 0);

    // WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Create soft circular dot texture
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
      gradient.addColorStop(0.3, "rgba(255, 255, 255, 0.8)");
      gradient.addColorStop(0.7, "rgba(255, 255, 255, 0.2)");
      gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 64, 64);
    }
    const texture = new THREE.CanvasTexture(canvas);

    // Generate Grid Geometry
    const numParticles = particleCountX * particleCountZ;
    const positions = new Float32Array(numParticles * 3);
    const scales = new Float32Array(numParticles);

    let i = 0;
    const offsetX = (particleCountX * particleSeparation) / 2;
    const offsetZ = (particleCountZ * particleSeparation) / 2;

    for (let ix = 0; ix < particleCountX; ix++) {
      for (let iz = 0; iz < particleCountZ; iz++) {
        positions[i] = ix * particleSeparation - offsetX; // x
        positions[i + 1] = 0;                             // y
        positions[i + 2] = iz * particleSeparation - offsetZ; // z
        scales[ix * particleCountZ + iz] = 1;
        i += 3;
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    // Material with soft particle texture
    const color = new THREE.Color(particleColor);
    const material = new THREE.PointsMaterial({
      color: color,
      size: 0.55,
      map: texture,
      transparent: true,
      opacity: opacity,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });

    const particles = new THREE.Points(geometry, material);
    particles.position.y = -4; // Sit gracefully in the lower plane
    scene.add(particles);

    // Mouse parallax tracking
    let mouseX = 0;
    let mouseY = 0;
    let targetMouseX = 0;
    let targetMouseY = 0;

    const handleMouseMove = (event) => {
      const windowHalfX = window.innerWidth / 2;
      const windowHalfY = window.innerHeight / 2;
      targetMouseX = (event.clientX - windowHalfX) * 0.0008;
      targetMouseY = (event.clientY - windowHalfY) * 0.0008;
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });

    // Handle Resize
    const handleResize = () => {
      if (!container) return;
      width = container.clientWidth || window.innerWidth;
      height = container.clientHeight || window.innerHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener("resize", handleResize);

    // Animation Loop
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const elapsedTime = clock.getElapsedTime() * waveSpeed;

      // Smooth mouse damping
      mouseX += (targetMouseX - mouseX) * 0.05;
      mouseY += (targetMouseY - mouseY) * 0.05;

      camera.position.x = Math.sin(mouseX) * cameraDistance;
      camera.position.y = cameraHeight + mouseY * 10;
      camera.lookAt(0, -2, 0);

      const posAttr = geometry.attributes.position;
      const posArray = posAttr.array;

      let idx = 0;
      for (let ix = 0; ix < particleCountX; ix++) {
        for (let iz = 0; iz < particleCountZ; iz++) {
          const i3 = idx * 3;
          const x = posArray[i3];
          const z = posArray[i3 + 2];

          // Complex dual-sine wave for elegant organic flow
          const wave1 = Math.sin(x * 0.22 + elapsedTime * 1.4);
          const wave2 = Math.cos(z * 0.22 + elapsedTime * 1.1);
          const wave3 = Math.sin((x + z) * 0.12 + elapsedTime * 0.8);

          posArray[i3 + 1] = (wave1 + wave2 + wave3 * 0.5) * (waveAmplitude / 2.5);

          idx++;
        }
      }

      posAttr.needsUpdate = true;
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
      geometry.dispose();
      material.dispose();
      texture.dispose();
      renderer.dispose();
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [
    particleColor,
    particleCountX,
    particleCountZ,
    particleSeparation,
    waveSpeed,
    waveAmplitude,
    cameraHeight,
    cameraDistance,
    opacity,
  ]);

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`}
      style={{ width: "100%", height: "100%" }}
    />
  );
}

export default ParticleWave;
