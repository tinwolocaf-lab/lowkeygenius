import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Button } from './Button';
import { ThemeSelector } from './ThemeSelector';
import { HorrorLogo } from './horror/HorrorLogo';

export function PublicHeader() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [visibleItems, setVisibleItems] = useState<number[]>([]);

  const totalItems = 7; // 4 nav links + theme + 2 buttons
  const staggerDelay = 60; // ms between each item

  useEffect(() => {
    if (mobileMenuOpen) {
      setShowMenu(true);
      setIsAnimating(true);
      // Animate items in from top to bottom
      const timeouts: NodeJS.Timeout[] = [];
      for (let i = 0; i < totalItems; i++) {
        timeouts.push(
          setTimeout(() => {
            setVisibleItems((prev) => [...prev, i]);
          }, i * staggerDelay)
        );
      }
      timeouts.push(
        setTimeout(() => setIsAnimating(false), totalItems * staggerDelay)
      );
      return () => timeouts.forEach(clearTimeout);
    } else if (showMenu) {
      setIsAnimating(true);
      // Animate items out from bottom to top
      const timeouts: NodeJS.Timeout[] = [];
      for (let i = totalItems - 1; i >= 0; i--) {
        timeouts.push(
          setTimeout(() => {
            setVisibleItems((prev) => prev.filter((idx) => idx !== i));
          }, (totalItems - 1 - i) * staggerDelay)
        );
      }
      timeouts.push(
        setTimeout(() => {
          setShowMenu(false);
          setIsAnimating(false);
        }, totalItems * staggerDelay + 100)
      );
      return () => timeouts.forEach(clearTimeout);
    }
  }, [mobileMenuOpen]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setMobileMenuOpen(false);
    }
  };

  const navLinks: Array<{ label: string; id?: string; path?: string }> = [
    { label: 'Features', id: 'features' },
    { label: 'How It Works', id: 'how-it-works' },
    { label: 'Pricing', path: '/pricing' },
    { label: 'FAQ', id: 'faq' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-neutral-bg/95 backdrop-blur-sm shadow-soft border-b border-neutral-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <HorrorLogo showText={true} size="md" />
          </div>

          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <button
                key={link.id || link.path}
                onClick={() => link.path ? navigate(link.path) : scrollToSection(link.id!)}
                className="font-body font-semibold text-neutral-text hover:text-primary transition-colors"
              >
                {link.label}
              </button>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <div className="w-48">
              <ThemeSelector />
            </div>
            <Button
              variant="secondary"
              onClick={() => navigate('/login')}
            >
              Log In
            </Button>
            <Button
              variant="primary"
              onClick={() => navigate('/signup')}
            >
              Sign Up
            </Button>
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-neutral-text hover:text-primary transition-colors"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {showMenu && (
        <div className="md:hidden absolute left-0 right-0 top-20 bg-neutral-bg border-t-2 border-neutral-border shadow-soft overflow-hidden z-50">
          <div className="px-4 py-6 space-y-4">
            {navLinks.map((link, index) => (
              <button
                key={link.id || link.path}
                onClick={() => {
                  if (link.path) {
                    navigate(link.path);
                    setMobileMenuOpen(false);
                  } else {
                    scrollToSection(link.id!);
                  }
                }}
                className={`block w-full text-center font-body font-semibold text-neutral-text hover:text-primary py-2 transition-all duration-300 ease-out ${
                  visibleItems.includes(index)
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 -translate-y-4'
                }`}
              >
                {link.label}
              </button>
            ))}
            <div
              className={`pt-4 border-t-2 border-neutral-border space-y-2 transition-all duration-300 ease-out ${
                visibleItems.includes(4)
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 -translate-y-4'
              }`}
            >
              <div className="mb-4 flex justify-center">
                <ThemeSelector />
              </div>
            </div>
            <div
              className={`transition-all duration-300 ease-out ${
                visibleItems.includes(5)
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 -translate-y-4'
              }`}
            >
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => navigate('/login')}
              >
                Log In
              </Button>
            </div>
            <div
              className={`transition-all duration-300 ease-out ${
                visibleItems.includes(6)
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 -translate-y-4'
              }`}
            >
              <Button
                variant="primary"
                className="w-full"
                onClick={() => navigate('/signup')}
              >
                Sign Up
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
