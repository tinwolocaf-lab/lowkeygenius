import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Home, BookOpen, StickyNote, Settings, LogOut, GraduationCap, Plus, DollarSign, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut, profile } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const navItems = [
    { icon: Home, label: 'Dashboard', path: '/dashboard' },
    { icon: BookOpen, label: 'My Courses', path: '/courses' },
    { icon: StickyNote, label: 'Notes', path: '/notes' },
    { icon: DollarSign, label: 'Pricing', path: '/pricing' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  const isActivePath = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-neutral-surface">
      <div className="hidden md:flex h-screen">
        <aside className={`relative bg-white shadow-soft flex flex-col transition-all duration-300 ${sidebarCollapsed ? 'w-20' : 'w-64'}`}>
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
            {!sidebarCollapsed && (
              <div className="mb-4 p-4 bg-accent-yellow/20 rounded-2xl border-2 border-accent-yellow/30">
                <p className="font-body text-xs text-neutral-text-muted font-semibold uppercase">Plan</p>
                <p className="font-display text-lg font-bold text-neutral-text">{profile?.plan_type || 'FREE'}</p>
              </div>
            )}
            <button
              onClick={handleSignOut}
              className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'} px-5 py-4 rounded-2xl font-body font-bold text-neutral-text hover:bg-accent-red/10 hover:text-accent-red transition-all hover:scale-[1.02]`}
              title={sidebarCollapsed ? 'Sign Out' : undefined}
            >
              <LogOut className={sidebarCollapsed ? 'w-7 h-7' : 'w-5 h-5'} />
              {!sidebarCollapsed && 'Sign Out'}
            </button>
          </div>

          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="absolute left-full top-6 -translate-x-1/2 bg-white border-2 border-neutral-border rounded-full p-2 shadow-soft hover:bg-primary-light/20 transition-all z-10"
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
        <header className="bg-white shadow-soft p-4 flex items-center justify-between">
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

        <nav className="bg-white shadow-soft border-t-2 border-neutral-border">
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
          </div>
        </nav>
      </div>
    </div>
  );
}
