"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";

export function TunnelBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const requestRef = useRef<number | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // --- SETUP ---
    const scene = new THREE.Scene();
    
    // We want a very long view distance for the tunnel
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      5000
    );
    camera.position.z = 0;

    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true 
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // --- LIGHTING ---
    // The light orbits the camera and provides that dynamic shine
    const light = new THREE.PointLight(0xea580c, 2, 800); // App primary (orange)
    scene.add(light);

    // Add some ambient light to see the mesh
    const ambient = new THREE.AmbientLight(0x4B5320, 0.5); // App background (army green)
    scene.add(ambient);

    // --- ELEMENTS ---
    const elements = new THREE.Group();
    scene.add(elements);

    const circleCount = 14;
    const cubesPerCircle = 13;
    const spacing = 180;
    
    // Forge Palette
    const colors = [
      new THREE.Color(0x4B5320), // Army Green
      new THREE.Color(0x5c6628), // Lighter Green
      new THREE.Color(0xea580c), // Primary Orange
      new THREE.Color(0x3d441a)  // Deep Muted Green
    ];

    const geometry = new THREE.BoxGeometry(50, 50, 150);
    const translate = new THREE.Matrix4().makeTranslation(150, 0, 0);

    for (let i = 0; i < circleCount; i++) {
      const circleGroup = new THREE.Group();
      
      for (let j = 0; j < cubesPerCircle; j++) {
        const material = new THREE.MeshPhongMaterial({ 
          color: colors[i % colors.length],
          shininess: 100,
          transparent: true,
          opacity: 0.9
        });
        
        const cube = new THREE.Mesh(geometry, material);
        const rotation = new THREE.Matrix4().makeRotationZ((Math.PI * 2 / cubesPerCircle) * j);
        
        // Apply rotation and translation to position the cube in a ring
        cube.applyMatrix4(new THREE.Matrix4().multiplyMatrices(rotation, translate));
        circleGroup.add(cube);
      }
      
      circleGroup.position.z = -i * spacing;
      elements.add(circleGroup);
    }

    let farest = -(circleCount - 1) * spacing;

    // --- ANIMATION LOOP ---
    let counter = 0;
    
    const animate = () => {
      requestRef.current = requestAnimationFrame(animate);

      // Scroll the camera forward
      camera.position.z -= 7;
      light.position.z = camera.position.z - 750; // Follow camera with offset
      
      // Orbit the light
      light.position.y = Math.sin(counter / 50) * 75;
      light.position.x = Math.cos(counter / 50) * 75;
      
      // Rotate camera for dizziness/trippiness
      camera.rotation.z += 0.005;

      // Wrap circles around (infinite tunnel logic)
      for (let i = 0; i < elements.children.length; i++) {
        const circle = elements.children[i];
        
        // If camera has passed the circle
        if (camera.position.z <= circle.position.z) {
          farest -= spacing;
          circle.position.z = farest;
        }
      }

      counter++;
      renderer.render(scene, camera);
    };

    animate();

    // --- RESIZE HANDLING ---
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (rendererRef.current) {
        containerRef.current?.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ filter: "blur(2px) contrast(1.1)" }}
    />
  );
}
