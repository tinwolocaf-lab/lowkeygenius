import { Link, useNavigate } from 'react-router-dom';
import { HorrorLogo } from './horror/HorrorLogo';

export function PublicFooter() {
  const navigate = useNavigate();
  return (
    <footer className="bg-neutral-surface border-t border-neutral-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8 text-center md:text-left justify-items-center md:justify-items-start">
          <div className="space-y-3">
            <div className="flex items-center gap-2 cursor-pointer justify-center md:justify-start" onClick={() => navigate('/')}>
              <HorrorLogo showText={true} size="lg" />
            </div>
            <p className="font-body text-sm text-neutral-text-muted">
              Progent builds personalized, structured courses with audio, quizzes, and tracking.
            </p>
          </div>

          <div>
            <h4 className="font-display font-bold mb-4 text-neutral-text">Product</h4>
            <ul className="space-y-2 font-body text-sm text-neutral-text-muted">
              <li><button onClick={() => navigate('/pricing')} className="hover:text-neutral-text transition-colors">Pricing</button></li>
              <li><button onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-neutral-text transition-colors">How It Works</button></li>
              <li><button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-neutral-text transition-colors">Features</button></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display font-bold mb-4 text-neutral-text">Support</h4>
            <ul className="space-y-2 font-body text-sm text-neutral-text-muted">
              <li><button onClick={() => document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-neutral-text transition-colors">FAQ</button></li>
              <li><button onClick={() => navigate('/login')} className="hover:text-neutral-text transition-colors">Contact</button></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display font-bold mb-4 text-neutral-text">Legal</h4>
            <ul className="space-y-2 font-body text-sm text-neutral-text-muted">
              <li><Link to="/privacy" className="hover:text-neutral-text transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-neutral-text transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-neutral-border pt-6 text-center font-body text-sm text-neutral-text-muted">
          <p>&copy; {new Date().getFullYear()} Progent. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
