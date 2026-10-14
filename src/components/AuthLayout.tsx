import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import Logo from './Logo';

interface AuthLayoutProps {
  children: ReactNode;
  /** Heading text for the card */
  title: string;
  /** Supporting sentence below the heading */
  subtitle: string;
}

export default function AuthLayout({
  children,
  title,
  subtitle,
}: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <Link to="/login" aria-label="RideSync home" className="inline-flex">
            <Logo size="sm" />
          </Link>
          <span className="text-xs font-medium text-charcoal-muted">
            Rider Platform
          </span>
        </div>
      </header>

      {/* Main content */}
      <main className="flex min-h-[calc(100vh-57px)] flex-col items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-md animate-slide-up">
          {/* Heading block */}
          <div className="mb-7 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-charcoal sm:text-3xl">
              {title}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-charcoal-muted">
              {subtitle}
            </p>
          </div>

          {/* Card */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-card sm:p-8">
            {children}
          </div>

          {/* Footer */}
          <p className="mt-8 text-center text-xs text-charcoal-muted">
            RideSync — the group riding platform for motorcyclists.
          </p>
        </div>
      </main>
    </div>
  );
}
