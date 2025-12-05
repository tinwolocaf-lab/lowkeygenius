import { useEffect, useRef } from 'react';

interface VoiceOrbProps {
  isListening?: boolean;
  isSpeaking?: boolean;
  audioLevel?: number;
}

export function VoiceOrb({
  isListening = false,
  isSpeaking = false,
  audioLevel = 0,
}: VoiceOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 300;
    canvas.width = size;
    canvas.height = size;

    const centerX = size / 2;
    const centerY = size / 2;
    const baseRadius = 80;

    const animate = () => {
      timeRef.current += 0.016;
      const time = timeRef.current;

      ctx.clearRect(0, 0, size, size);

      let pulseAmount = 0;
      const speakingBoost = Math.min(audioLevel * 60, 40);
      const listeningBoost = Math.min(audioLevel * 50, 35);

      if (isSpeaking) {
        pulseAmount = Math.sin(time * 3) * 10 + speakingBoost;
      } else if (isListening) {
        pulseAmount = Math.sin(time * 1.5) * 6 + listeningBoost;
      } else {
        pulseAmount = Math.sin(time * 0.8) * 3 + Math.min(audioLevel * 8, 6);
      }

      const radius = baseRadius + pulseAmount;

      // Create gradient - pink theme to match Lowkeygenius branding
      const gradient = ctx.createRadialGradient(
        centerX,
        centerY + 20,
        0,
        centerX,
        centerY,
        radius * 1.2
      );

      if (isSpeaking) {
        // Vibrant pink when AI is speaking
        gradient.addColorStop(0, 'rgba(236, 72, 153, 0.7)'); // Pink-500
        gradient.addColorStop(0.3, 'rgba(219, 39, 119, 0.5)'); // Pink-600
        gradient.addColorStop(0.6, 'rgba(244, 114, 182, 0.4)'); // Pink-400
        gradient.addColorStop(1, 'rgba(251, 207, 232, 0.1)'); // Pink-200
      } else if (isListening) {
        // Softer pink when listening
        gradient.addColorStop(0, 'rgba(244, 114, 182, 0.6)'); // Pink-400
        gradient.addColorStop(0.4, 'rgba(236, 72, 153, 0.4)'); // Pink-500
        gradient.addColorStop(0.7, 'rgba(251, 207, 232, 0.3)'); // Pink-200
        gradient.addColorStop(1, 'rgba(253, 242, 248, 0.05)'); // Pink-50
      } else {
        // Subtle idle state
        gradient.addColorStop(0, 'rgba(251, 207, 232, 0.3)'); // Pink-200
        gradient.addColorStop(0.5, 'rgba(253, 242, 248, 0.2)'); // Pink-50
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0.05)');
      }

      // Draw main orb with glow
      ctx.shadowBlur = 30;
      ctx.shadowColor = 'rgba(236, 72, 153, 0.3)';
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fill();

      // Add inner wave layers for depth
      for (let i = 0; i < 3; i++) {
        const waveGradient = ctx.createRadialGradient(
          centerX + Math.sin(time * 0.5 + i) * 10,
          centerY + Math.cos(time * 0.3 + i) * 10,
          0,
          centerX,
          centerY,
          radius * 0.8
        );

        waveGradient.addColorStop(0, `rgba(244, 114, 182, ${0.15 - i * 0.04})`);
        waveGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.shadowBlur = 0;
        ctx.fillStyle = waveGradient;
        ctx.beginPath();
        ctx.arc(
          centerX,
          centerY,
          radius * (0.6 + i * 0.15) + Math.sin(time * (1 + i * 0.3)) * 5,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }

      // Outer glow ring
      const glowGradient = ctx.createRadialGradient(
        centerX,
        centerY,
        radius * 0.9,
        centerX,
        centerY,
        radius * 1.3
      );
      glowGradient.addColorStop(0, 'rgba(236, 72, 153, 0.15)');
      glowGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

      ctx.fillStyle = glowGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 1.3, 0, Math.PI * 2);
      ctx.fill();

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isListening, isSpeaking, audioLevel]);

  return (
    <div className="flex items-center justify-center">
      <canvas
        ref={canvasRef}
        className="rounded-full"
        style={{
          filter: 'blur(0.5px)',
        }}
      />
    </div>
  );
}
