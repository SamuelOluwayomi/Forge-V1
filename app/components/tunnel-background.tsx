"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";

export function TunnelBackground() {
  const [mounted, setMounted] = React.useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const requestRef = useRef<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !containerRef.current) return;

    // --- SETUP ---
    const scene = new THREE.Scene();
    
    // Warm light beige fog to create depth in the light environment
    scene.fog = new THREE.FogExp2(0xF5F5DC, 0.0008);
    
    // Tighter FOV for better depth perception (was 75)
    const camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      1,
      10000
    );
    camera.position.z = 0;

    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: false 
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0xF5F5DC, 1); // Exact Beige background
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // --- LIGHTING ---
    // Powerful light with warm amber tone
    const light = new THREE.PointLight(0xFFD700, 5, 2000); 
    light.position.set(0, 0, -800);
    scene.add(light);

    // More ambient light for a light theme to prevent overly dark corners
    const ambient = new THREE.AmbientLight(0xFFF5E1, 0.4);
    scene.add(ambient);

    // --- ELEMENTS ---
    const elements = new THREE.Group();
    scene.add(elements);

    const circleCount = 14;
    const cubesPerCircle = 13;
    const spacing = 180;
    
    // FIERY colors (Oranges, Reds, Golds)
    const colors = [
      new THREE.Color(0xFF4500), // OrangeRed
      new THREE.Color(0xFFA500), // Orange
      new THREE.Color(0xFFD700), // Gold
      new THREE.Color(0x8B0000)  // DarkRed
    ];

    const geometry = new THREE.BoxGeometry(50, 50, 150);
    const translate = new THREE.Matrix4().makeTranslation(150, 0, 0);

    for (let i = 0; i < circleCount; i++) {
      const circleGroup = new THREE.Group();
      
      for (let j = 0; j < cubesPerCircle; j++) {
        const material = new THREE.MeshPhongMaterial({ 
          color: colors[i % colors.length],
          shininess: 120,
          specular: 0x555555
        });
        
        const cube = new THREE.Mesh(geometry, material);
        const rotation = new THREE.Matrix4().makeRotationZ((Math.PI * 2 / cubesPerCircle) * j);
        
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

      camera.position.z -= 7;
      light.position.z = camera.position.z - 800;
      
      light.position.y = Math.sin(counter / 50) * 85;
      light.position.x = Math.cos(counter / 50) * 85;
      
      camera.rotation.z += 0.005;

      for (let i = 0; i < elements.children.length; i++) {
        const circle = elements.children[i];
        if (camera.position.z <= circle.position.z) {
          farest -= spacing;
          circle.position.z = farest;
        }
      }

      counter++;
      renderer.render(scene, camera);
    };

    animate();

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
  }, [mounted]);

  if (!mounted) return null;

  return (
    <div 
      ref={containerRef} 
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ backgroundColor: "#d8d886ff" }}
      suppressHydrationWarning
    />
  );
}
