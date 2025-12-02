import { useEffect, useState } from 'react';
import { Award, Star, Zap } from 'lucide-react';

interface Particle {
  id: number;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  duration: number;
  delay: number;
  icon: 'award' | 'star' | 'zap';
}

export function ConfettiEffect() {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const newParticles: Particle[] = [];
    const icons: Array<'award' | 'star' | 'zap'> = [ 'award', 'star', 'zap'];

    for (let i = 0; i < 30; i++) {
      newParticles.push({
        id: i,
        x: Math.random() * 100,
        y: -10,
        rotation: Math.random() * 360,
        scale: 0.5 + Math.random() * 0.5,
        duration: 2 + Math.random() * 2,
        delay: Math.random() * 0.5,
        icon: icons[Math.floor(Math.random() * icons.length)],
      });
    }

    setParticles(newParticles);
  }, []);

  const renderIcon = (icon: string, className: string) => {
    switch (icon) {
      case 'award':
        return <Award className={className} />;
      case 'star':
        return <Star className={className} />;
      case 'zap':
        return <Zap className={className} />;
      default:
        return <Zap className={className} />;
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute animate-confetti-fall"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            animationDuration: `${particle.duration}s`,
            animationDelay: `${particle.delay}s`,
            transform: `rotate(${particle.rotation}deg) scale(${particle.scale})`,
          }}
        >
          {renderIcon(particle.icon, 'w-6 h-6 text-primary')}
        </div>
      ))}

      <div className="absolute inset-0 bg-gradient-to-t from-transparent via-primary/5 to-transparent animate-pulse" />

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-scale-in">
        <div className="bg-neutral-bg border-2 border-accent-green rounded-2xl p-6 shadow-2xl">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-accent-green rounded-full flex items-center justify-center">
              <Award className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="font-display text-xl font-bold text-neutral-text">Course Ready!</h3>
              <p className="font-body text-sm text-neutral-text-muted">5 lessons in 8 seconds</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
