
import React, { useEffect, useRef } from 'react';

interface BackgroundMatrixProps {
    audioLevel?: number;
}

const BackgroundMatrix: React.FC<BackgroundMatrixProps> = ({ audioLevel = 0 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shockwaves = useRef<{r: number, opacity: number}[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    const particles: {x: number, y: number, z: number, speed: number, size: number}[] = [];
    for(let i=0; i<150; i++) {
        particles.push({
            x: Math.random() * width,
            y: Math.random() * height,
            z: Math.random() * 2 + 0.5,
            speed: Math.random() * 0.5 + 0.2,
            size: Math.random() * 2
        });
    }

    const animate = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)'; // Slightly clearer trails
      ctx.fillRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height * 0.65;
      const intensity = Math.min(1, audioLevel / 60);

      // 1. HORIZON / SUN
      const sunBase = Math.min(width, height) * 0.1;
      const sunPulse = sunBase + (intensity * 30);
      
      const sunGrad = ctx.createRadialGradient(cx, cy, sunBase * 0.1, cx, cy, sunPulse);
      
      // Reactive Colors
      const r = 30 + (intensity * 150);
      const b = 255 - (intensity * 50);
      sunGrad.addColorStop(0, '#ffffff');
      sunGrad.addColorStop(0.1, `rgba(${r}, 200, ${b}, 0.8)`);
      sunGrad.addColorStop(0.5, `rgba(${r}, 200, ${b}, 0.1)`);
      sunGrad.addColorStop(1, 'rgba(0,0,0,0)');

      ctx.fillStyle = sunGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, sunPulse, 0, Math.PI * 2);
      ctx.fill();

      // 2. SHOCKWAVES
      if (audioLevel > 15 && Math.random() > 0.85) {
          shockwaves.current.push({ r: sunBase, opacity: 0.6 + (intensity * 0.4) });
      }

      shockwaves.current.forEach((sw, i) => {
          sw.r += 3 + intensity * 5;
          sw.opacity -= 0.015;
          
          if (sw.opacity <= 0) {
              shockwaves.current.splice(i, 1);
              return;
          }

          ctx.beginPath();
          ctx.ellipse(cx, cy, sw.r, sw.r * 0.4, 0, 0, Math.PI * 2); // Perspective ellipse
          ctx.strokeStyle = `rgba(34, 211, 238, ${sw.opacity})`;
          ctx.lineWidth = 1 + (intensity * 2);
          ctx.stroke();
      });

      // 3. FLOOR GRID
      ctx.beginPath();
      ctx.strokeStyle = `rgba(6, 182, 212, ${0.15 + intensity * 0.2})`;
      ctx.lineWidth = 1;
      
      // Vertical Lines
      for (let x = -width; x < width * 2; x += 80) {
           ctx.moveTo(x, height);
           ctx.lineTo(cx + (x - cx) * 0.15, cy);
      }
      
      // Horizontal Moving Lines
      const timeOffset = (Date.now() / 30) % 60;
      for (let i = 0; i < 25; i++) {
          const yBase = cy + (Math.pow(i, 1.8) * 3);
          const y = yBase + timeOffset; 
          if (y > height) continue;
          
          // Audio waveform distortion on grid
          const wave = Math.sin(Date.now() / 200 + i) * (intensity * 10);
          
          ctx.moveTo(0, y + wave);
          ctx.lineTo(width, y + wave);
      }
      ctx.stroke();

      // 4. PARTICLES (Upward flow when active)
      particles.forEach(p => {
          // Flow logic
          const dy = (p.speed * (1 + intensity * 5));
          p.y -= dy;
          
          // Horizontal drift
          p.x += Math.sin(p.y * 0.01 + Date.now() * 0.002) * 0.5;

          if(p.y < 0) {
              p.y = height;
              p.x = Math.random() * width;
          }

          const dist = Math.abs(cx - p.x);
          const alpha = (1 - dist / width) * 0.8;

          ctx.fillStyle = p.z > 1.5 ? '#fff' : '#22d3ee';
          ctx.globalAlpha = alpha;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (1 + intensity), 0, Math.PI * 2);
          ctx.fill();
      });
      ctx.globalAlpha = 1;

      requestAnimationFrame(animate);
    };

    const animId = requestAnimationFrame(animate);

    const handleResize = () => {
        if (!canvasRef.current) return;
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    return () => {
        cancelAnimationFrame(animId);
        window.removeEventListener('resize', handleResize);
    };
  }, [audioLevel]);

  return (
    <canvas 
        ref={canvasRef} 
        className="absolute inset-0 w-full h-full pointer-events-none mix-blend-screen"
    />
  );
};

export default BackgroundMatrix;
