import { useState, useRef, useEffect, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, User, Settings, LogOut, Menu, X, History } from 'lucide-react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import Logo from './Logo';
import Avatar from './Avatar';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close profile dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        profileRef.current &&
        !profileRef.current.contains(e.target as Node)
      ) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Close mobile nav on route change
  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    let active = true;

    void supabase.auth.getUser().then(({ data, error }) => {
      if (!active) return;
      if (error) console.error('Could not load signed-in user:', error.message);
      setUser(data.user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setUser(session?.user ?? null);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const displayName =
    (typeof user?.user_metadata?.full_name === 'string' &&
      user.user_metadata.full_name.trim()) ||
    user?.email?.split('@')[0] ||
    'Guest rider';
  const displayEmail = user?.email ?? 'Not signed in';
  const initials =
    displayName
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || 'GR';

  async function handleSignOut() {
    setProfileOpen(false);
    setMobileNavOpen(false);
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Sign out failed:', error.message);
      window.alert('Could not sign out. Please try again.');
      return;
    }
    navigate('/login', { replace: true });
  }

  function handleAccountAction() {
    if (user) {
      void handleSignOut();
    } else {
      setProfileOpen(false);
      setMobileNavOpen(false);
      navigate('/login');
    }
  }

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  const navLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/dashboard/history', label: 'Ride History', icon: History },
    { to: '/dashboard/profile', label: 'Profile', icon: User },
    { to: '/dashboard/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          {/* Logo + desktop nav */}
          <div className="flex items-center gap-6">
            <Link to="/dashboard" aria-label="RideSync dashboard" className="inline-flex">
              <Logo size="sm" />
            </Link>
            <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
              <Link
                to="/dashboard/history"
                className={[
                  "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive("/dashboard/history") ? "bg-ridesync-50 text-ridesync-700" : "text-charcoal-muted hover:bg-gray-100 hover:text-charcoal-soft",
                ].join(" ")}
              >
                <History className="h-4 w-4" aria-hidden="true" />
                Ride History
              </Link>
              <Link
                to="/dashboard"
                className={[
                  'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive('/dashboard') && !isActive('/dashboard/history') && !isActive('/dashboard/profile') && !isActive('/dashboard/settings')
                    ? 'bg-ridesync-50 text-ridesync-700'
                    : 'text-charcoal-muted hover:bg-gray-100 hover:text-charcoal-soft',
                ].join(' ')}
              >
                <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                Dashboard
              </Link>
            </nav>
          </div>

          {/* Desktop profile menu */}
          <div className="hidden md:block">
            <div ref={profileRef} className="relative">
              <button
                type="button"
                onClick={() => setProfileOpen((o) => !o)}
                className="flex items-center gap-2 rounded-full border border-transparent p-1 pr-2.5 transition-colors hover:border-gray-200 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ridesync-500"
                aria-label="Open profile menu"
                aria-expanded={profileOpen}
                aria-haspopup="menu"
              >
                <Avatar initials={initials} size="sm" />
                <span className="text-sm font-medium text-charcoal-soft">
                  {displayName}
                </span>
              </button>

              {profileOpen && (
                <div
                  className="absolute right-0 top-full mt-2 w-52 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg animate-slide-up"
                  role="menu"
                  aria-label="Profile menu"
                >
                  <div className="border-b border-gray-100 px-4 py-3">
                    <p className="text-sm font-medium text-charcoal">{displayName}</p>
                    <p className="break-all text-xs text-charcoal-muted">{displayEmail}</p>
                  </div>
                  <Link
                    to="/dashboard/profile"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-charcoal-soft transition-colors hover:bg-gray-50"
                    role="menuitem"
                  >
                    <User className="h-4 w-4 text-gray-400" aria-hidden="true" />
                    Profile
                  </Link>
                  <Link
                    to="/dashboard/settings"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-charcoal-soft transition-colors hover:bg-gray-50"
                    role="menuitem"
                  >
                    <Settings className="h-4 w-4 text-gray-400" aria-hidden="true" />
                    Settings
                  </Link>
                  <button
                    type="button"
                    onClick={handleAccountAction}
                    className="flex w-full items-center gap-2.5 border-t border-gray-100 px-4 py-2.5 text-sm text-charcoal-soft transition-colors hover:bg-gray-50"
                    role="menuitem"
                  >
                    <LogOut className="h-4 w-4 text-gray-400" aria-hidden="true" />
                    {user ? 'Sign out' : 'Sign in'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <button
            type="button"
            onClick={() => setMobileNavOpen((o) => !o)}
            className="rounded-lg p-2 text-charcoal-soft transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ridesync-500 md:hidden"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileNavOpen}
          >
            {mobileNavOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>

        {/* Mobile nav drawer */}
        {mobileNavOpen && (
          <div className="border-t border-gray-200 bg-white md:hidden" aria-label="Mobile navigation">
            <div className="space-y-1 px-4 py-3">
              <div className="mb-2 flex items-center gap-2.5 rounded-lg px-3 py-2">
                <Avatar initials={initials} size="sm" />
                <div>
                  <p className="truncate text-sm font-medium text-charcoal">{displayName}</p>
                  <p className="truncate text-xs text-charcoal-muted">{displayEmail}</p>
                </div>
              </div>
              {navLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={[
                      'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive(link.to)
                        ? 'bg-ridesync-50 text-ridesync-700'
                        : 'text-charcoal-soft hover:bg-gray-100',
                    ].join(' ')}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {link.label}
                  </Link>
                );
              })}
              <button
                type="button"
                onClick={handleAccountAction}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-charcoal-soft transition-colors hover:bg-gray-100"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                {user ? 'Sign out' : 'Sign in'}
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {children}
      </main>
    </div>
  );
}
