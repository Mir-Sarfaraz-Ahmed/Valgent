import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ValgentLogo } from '../brand/ValgentLogo';
import { ThemeToggle } from '../theme/ThemeToggle';
import { useAuth } from '../../context/AuthContext';
import { ArrowRight, Menu, X } from 'lucide-react';

export const PublicHeader: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[var(--border-soft)] bg-[var(--surface-card)]/90 backdrop-blur-md transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <ValgentLogo size="md" to="/" />

        {/* Public Navigation (Desktop) */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[var(--text-secondary)]">
          <a href="#features" className="hover:text-[var(--color-rose)] transition-colors">
            Features
          </a>
          <a href="#how-it-works" className="hover:text-[var(--color-rose)] transition-colors">
            How it works
          </a>
          <a href="#security" className="hover:text-[var(--color-rose)] transition-colors">
            Security
          </a>
        </nav>

        {/* Right Actions: Theme Toggle & Auth */}
        <div className="flex items-center gap-3">
          <ThemeToggle showLabel={false} />

          {user ? (
            <button
              onClick={() => navigate('/projects')}
              className="btn-primary text-xs sm:text-sm px-4 py-2"
            >
              <span>Projects</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <Link
                to="/login"
                className="btn-secondary text-xs sm:text-sm px-4 py-2 font-medium"
              >
                Log in
              </Link>
              <Link
                to="/signup"
                className="btn-primary text-xs sm:text-sm px-4 py-2"
              >
                Sign up
              </Link>
            </div>
          )}

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/10"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-[var(--border-soft)] bg-[var(--surface-card)] px-4 py-4 flex flex-col gap-3 shadow-lg">
          <nav className="flex flex-col gap-1 text-sm font-medium text-[var(--text-secondary)]">
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 hover:text-[var(--text-primary)]"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 hover:text-[var(--text-primary)]"
            >
              How it works
            </a>
            <a
              href="#security"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 hover:text-[var(--text-primary)]"
            >
              Security
            </a>
          </nav>

          {!user && (
            <div className="flex items-center gap-2 pt-2 border-t border-[var(--border-soft)]">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="btn-secondary text-xs flex-1 text-center py-2"
              >
                Log in
              </Link>
              <Link
                to="/signup"
                onClick={() => setMobileMenuOpen(false)}
                className="btn-primary text-xs flex-1 text-center py-2"
              >
                Sign up
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
