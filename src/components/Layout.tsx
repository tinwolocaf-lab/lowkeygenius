import { useState, useRef, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Home, BookOpen, StickyNote, ChevronLeft, ChevronRight, User, Settings, LogOut, Store } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useHorrorTheme } from '../hooks/useHorrorTheme';
import { HorrorDecorations, HorrorLogo, SidebarDecorations } from './horror';

export function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, signOut } = useAuth();
  const { isHorror } = useHorrorTheme();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
        setShowAccountMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const navItems = [
    { icon: Home, label: 'Dashboard', path: '/dashboard' },
    { icon: BookOpen, label: 'My Courses', path: '/courses' },
    { icon: Store, label: 'Marketplace', path: '/marketplace' },
    { icon: StickyNote, label: 'Notes', path: '/notes' },
  ];

  const isActivePath = (path: string) => location.pathname === path;

  return (
    <div className={`min-h-screen ${isHorror ? 'horror-bg text-neutral-text' : 'bg-neutral-surface'}`}>
      <div className="hidden md:flex h-screen">
        <aside className={`relative bg-neutral-bg border-r border-neutral-border shadow-soft flex flex-col transition-all duration-300 ${sidebarCollapsed ? 'w-20' : 'w-64'} ${isHorror ? 'horror-sidebar' : ''}`}>
          {/* Horror sidebar decorations */}
          {isHorror && <SidebarDecorations collapsed={sidebarCollapsed} />}
          
          <div className={`p-6 border-b-2 border-neutral-border ${sidebarCollapsed ? 'flex justify-center' : ''}`}>
            <div className={`flex items-center gap-3 ${sidebarCollapsed ? 'flex-col' : ''}`}>
              {isHorror ? (
                <HorrorLogo 
                  size={sidebarCollapsed ? 'md' : 'sm'} 
                  showText={!sidebarCollapsed}
                />
              ) : (
                <>
                  <div className="" style={{ padding: '8px' }}>
                    <img src="/logo.png" alt="Progent" className={`object-contain ${sidebarCollapsed ? 'w-12 h-12' : 'w-9 h-9'}`} />
                  </div>
                  {!sidebarCollapsed && (
                    <h1 className="font-display text-2xl font-bold text-primary">Progent</h1>
                  )}
                </>
              )}
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = isActivePath(item.path);
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'} px-5 py-4 rounded-2xl font-body font-bold transition-all ${isActive
                    ? 'bg-primary text-white shadow-soft'
                    : 'text-neutral-text hover:bg-primary-light/20 hover:scale-[1.02]'
                    }`}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <Icon style={{ width: '20px', height: '20px', flexShrink: 0 }} />
                  {!sidebarCollapsed && item.label}
                </button>
              );
            })}
          </nav>

          <div className="p-4 border-t-2 border-neutral-border">
            <button
              onClick={() => navigate('/settings')}
              className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-2xl font-body font-bold transition-all ${location.pathname === '/settings'
                ? 'bg-primary text-white shadow-soft'
                : 'text-neutral-text hover:bg-primary-light/20 hover:scale-[1.02]'
                }`}
              title={sidebarCollapsed ? 'Account' : undefined}
            >
              <div style={{ width: '40px', height: '40px', flexShrink: 0 }} className="rounded-full bg-primary-light flex items-center justify-center">
                {profile?.full_name ? (
                  <span className="text-base font-bold text-primary">
                    {profile.full_name.charAt(0).toUpperCase()}
                  </span>
                ) : (
                  <User style={{ width: '20px', height: '20px' }} className="text-primary" />
                )}
              </div>
              {!sidebarCollapsed && (
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-semibold truncate">{profile?.full_name || 'Account'}</p>
                  <p className="text-xs text-neutral-text-muted truncate">{profile?.email}</p>
                </div>
              )}
            </button>
          </div>

          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="absolute left-full top-6 -translate-x-1/2 bg-neutral-bg border-2 border-neutral-border rounded-full p-2 shadow-soft hover:bg-neutral-surface transition-all z-10"
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-4 h-4 text-primary" />
            ) : (
              <ChevronLeft className="w-4 h-4 text-primary" />
            )}
          </button>
        </aside>

        <main className="flex-1 overflow-y-auto relative">
          {/* Horror decorations for main content area */}
          {isHorror && <HorrorDecorations />}
          <Outlet />
        </main>
      </div>

      <div className="md:hidden flex flex-col min-h-screen">
        <header className={`sticky top-0 z-40 bg-neutral-bg border-b border-neutral-border shadow-soft p-4 flex items-center justify-between ${isHorror ? 'horror-header' : ''}`}>
          <div className="flex items-center gap-2">
            {isHorror ? (
              <HorrorLogo size="sm" showText />
            ) : (
              <>
                <div className="p-1">
                  <img src="/logo.png" alt="Progent" className="w-8 h-8 object-contain" />
                </div>
                <h1 className="font-display text-xl font-bold text-primary">Progent</h1>
              </>
            )}
          </div>
          <div className="relative" ref={accountMenuRef}>
            <button
              onClick={() => setShowAccountMenu(!showAccountMenu)}
              className={`w-10 h-10 rounded-full flex items-center justify-center active:scale-95 transition-all ${location.pathname === '/settings' || showAccountMenu ? 'bg-primary' : 'bg-primary-light'
                }`}
            >
              {profile?.full_name ? (
                <span className={`text-sm font-bold ${location.pathname === '/settings' || showAccountMenu ? 'text-white' : 'text-primary'}`}>
                  {profile.full_name.charAt(0).toUpperCase()}
                </span>
              ) : (
                <User className={`w-5 h-5 ${location.pathname === '/settings' || showAccountMenu ? 'text-white' : 'text-primary'}`} />
              )}
            </button>

            {showAccountMenu && (
              <div className="absolute right-0 top-12 w-48 bg-neutral-bg border border-neutral-border rounded-xl shadow-tile z-50 overflow-hidden">
                <div className="p-3 border-b border-neutral-border">
                  <p className="font-body font-semibold text-neutral-text text-sm truncate">{profile?.full_name || 'User'}</p>
                  <p className="font-body text-xs text-neutral-text-muted truncate">{profile?.email}</p>
                </div>
                <button
                  onClick={() => {
                    setShowAccountMenu(false);
                    navigate('/settings');
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-neutral-text hover:bg-neutral-surface transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  <span className="font-body text-sm">Settings</span>
                </button>
                <button
                  onClick={() => {
                    setShowAccountMenu(false);
                    setShowLogoutConfirm(true);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-accent-red hover:bg-accent-red/10 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="font-body text-sm">Log Out</span>
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto pb-20 relative">
          {/* Horror decorations for mobile main content area */}
          {isHorror && <HorrorDecorations />}
          <Outlet />
        </main>

        <nav className={`fixed bottom-0 left-0 right-0 z-40 bg-neutral-bg shadow-soft border-t-2 border-neutral-border ${isHorror ? 'horror-nav' : ''}`}>
          <div className="flex items-center justify-around p-2 pb-safe">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = isActivePath(item.path);
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all active:scale-95 ${isActive ? 'text-primary bg-primary-light/30' : 'text-neutral-text-muted hover:bg-neutral-surface'
                    }`}
                >
                  <Icon className="w-6 h-6" />
                  <span className="text-xs font-body font-bold">{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>

      {/* Logout Confirmation Dialog */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-bg rounded-2xl shadow-tile max-w-sm w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-accent-red/10 flex items-center justify-center">
                <LogOut className="w-6 h-6 text-accent-red" />
              </div>
              <div>
                <h3 className="font-display text-lg font-bold text-neutral-text">Log Out</h3>
                <p className="font-body text-sm text-neutral-text-muted">Are you sure you want to log out?</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 px-4 py-3 rounded-xl border-2 border-neutral-border font-body font-bold text-neutral-text hover:bg-neutral-surface transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 px-4 py-3 rounded-xl bg-accent-red font-body font-bold text-white hover:brightness-110 transition-all"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
