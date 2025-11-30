import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Home, BookOpen, StickyNote, GraduationCap, Plus, ChevronLeft, ChevronRight, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const navItems = [
    { icon: Home, label: 'Dashboard', path: '/dashboard' },
    { icon: BookOpen, label: 'My Courses', path: '/courses' },
    { icon: StickyNote, label: 'Notes', path: '/notes' },
  ];

  const isActivePath = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-neutral-surface">
      <div className="hidden md:flex h-screen">
        <aside className={`relative bg-neutral-bg border-r border-neutral-border shadow-soft flex flex-col transition-all duration-300 ${sidebarCollapsed ? 'w-20' : 'w-64'}`}>
          <div className={`p-6 border-b-2 border-neutral-border ${sidebarCollapsed ? 'flex justify-center' : ''}`}>
            <div className={`flex items-center gap-3 ${sidebarCollapsed ? 'flex-col' : ''}`}>
              <div className="bg-primary rounded-2xl p-3 shadow-soft">
                <GraduationCap className="w-7 h-7 text-white" />
              </div>
              {!sidebarCollapsed && (
                <h1 className="font-display text-2xl font-bold text-primary">LearnSelfAI</h1>
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
                  className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'} px-5 py-4 rounded-2xl font-body font-bold transition-all ${
                    isActive
                      ? 'bg-primary text-white shadow-soft'
                      : 'text-neutral-text hover:bg-primary-light/20 hover:scale-[1.02]'
                  }`}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <Icon className={sidebarCollapsed ? 'w-7 h-7' : 'w-5 h-5'} />
                  {!sidebarCollapsed && item.label}
                </button>
              );
            })}
          </nav>

          <div className="p-4 border-t-2 border-neutral-border">
            <button
              onClick={() => navigate('/settings')}
              className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-2xl font-body font-bold transition-all ${
                location.pathname === '/settings'
                  ? 'bg-primary text-white shadow-soft'
                  : 'text-neutral-text hover:bg-primary-light/20 hover:scale-[1.02]'
              }`}
              title={sidebarCollapsed ? 'Account' : undefined}
            >
              <div className={`${sidebarCollapsed ? 'w-10 h-10' : 'w-8 h-8'} rounded-full bg-primary-light flex items-center justify-center flex-shrink-0`}>
                {profile?.full_name ? (
                  <span className={`${sidebarCollapsed ? 'text-base' : 'text-sm'} font-bold text-primary`}>
                    {profile.full_name.charAt(0).toUpperCase()}
                  </span>
                ) : (
                  <User className={`${sidebarCollapsed ? 'w-5 h-5' : 'w-4 h-4'} text-primary`} />
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

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      <div className="md:hidden flex flex-col h-screen">
        <header className="bg-neutral-bg border-b border-neutral-border shadow-soft p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary rounded-xl p-2.5 shadow-soft">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <h1 className="font-display text-xl font-bold text-primary">LearnSelfAI</h1>
          </div>
          <button
            onClick={() => navigate('/onboarding')}
            className="bg-accent-green text-white p-3 rounded-xl active:scale-95 active:translate-y-1 transition-all shadow-button"
          >
            <Plus className="w-5 h-5" />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>

        <nav className="bg-neutral-bg shadow-soft border-t-2 border-neutral-border">
          <div className="flex items-center justify-around p-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = isActivePath(item.path);
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all active:scale-95 ${
                    isActive ? 'text-primary bg-primary-light/30' : 'text-neutral-text-muted hover:bg-neutral-surface'
                  }`}
                >
                  <Icon className="w-6 h-6" />
                  <span className="text-xs font-body font-bold">{item.label}</span>
                </button>
              );
            })}
            <button
              onClick={() => navigate('/settings')}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all active:scale-95 ${
                location.pathname === '/settings' ? 'text-primary bg-primary-light/30' : 'text-neutral-text-muted hover:bg-neutral-surface'
              }`}
            >
              <div className="w-6 h-6 rounded-full bg-primary-light flex items-center justify-center">
                {profile?.full_name ? (
                  <span className="text-xs font-bold text-primary">
                    {profile.full_name.charAt(0).toUpperCase()}
                  </span>
                ) : (
                  <User className="w-4 h-4 text-primary" />
                )}
              </div>
              <span className="text-xs font-body font-bold">Account</span>
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
}
