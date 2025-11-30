import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Menu, X } from 'lucide-react';
import { Button } from './Button';
import { ThemeSelector } from './ThemeSelector';

export function PublicHeader() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
            <div className="bg-primary rounded-2xl p-2.5 shadow-soft">
              <GraduationCap className="w-7 h-7 text-white" />
            </div>
            <h1 className="font-display text-2xl font-bold text-primary">LearnSelfAI</h1>
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

      {mobileMenuOpen && (
        <div className="md:hidden bg-neutral-bg border-t-2 border-neutral-border shadow-soft">
          <div className="px-4 py-6 space-y-4">
            {navLinks.map((link) => (
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
                className="block w-full text-left font-body font-semibold text-neutral-text hover:text-primary py-2 transition-colors"
              >
                {link.label}
              </button>
            ))}
            <div className="pt-4 border-t-2 border-neutral-border space-y-2">
              <div className="mb-4">
                <ThemeSelector />
              </div>
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => navigate('/login')}
              >
                Log In
              </Button>
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
