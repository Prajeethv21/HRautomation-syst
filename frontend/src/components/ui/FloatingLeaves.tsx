import React, { useEffect, useRef } from 'react';

export const FloatingLeaves: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Detect low performance or preference for reduced motion
    const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isLowPerformance = 
      typeof navigator !== 'undefined' && 
      ((navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) ||
      /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent));

    if (prefersReducedMotion || isLowPerformance) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Leaf particle definition
    interface Particle {
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      angle: number;
      spin: number;
      opacity: number;
    }

    // High quality rendering configuration
    const particles: Particle[] = Array.from({ length: 8 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 12 + 10,
      speedX: Math.random() * 0.3 - 0.15,
      speedY: Math.random() * 0.2 + 0.1, // float down slowly
      angle: Math.random() * Math.PI * 2,
      spin: (Math.random() * 0.005 + 0.002) * (Math.random() > 0.5 ? 1 : -1),
      opacity: Math.random() * 0.02 + 0.01, // extremely low visual footprint (1% to 3% opacity)
    }));

    const drawLeaf = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, angle: number, opacity: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.beginPath();
      
      // Smooth quadratic curves to form organic leaf shape
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(size / 2, -size / 2, size, 0);
      ctx.quadraticCurveTo(size / 2, size / 2, 0, 0);
      
      ctx.fillStyle = `rgba(76, 175, 80, ${opacity})`;
      ctx.fill();
      
      // Central vein of the leaf
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(size, 0);
      ctx.strokeStyle = `rgba(76, 175, 80, ${opacity * 0.5})`;
      ctx.lineWidth = 1;
      ctx.stroke();
      
      ctx.restore();
    };

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.x += p.speedX;
        p.y += p.speedY;
        p.angle += p.spin;

        // Reset positions if they drift out of boundary
        if (p.y > height + 20) {
          p.y = -20;
          p.x = Math.random() * width;
        }
        if (p.x > width + 20) {
          p.x = -20;
        } else if (p.x < -20) {
          p.x = width + 20;
        }

        drawLeaf(ctx, p.x, p.y, p.size, p.angle, p.opacity);
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ mixBlendMode: 'multiply' }}
    />
  );
};
