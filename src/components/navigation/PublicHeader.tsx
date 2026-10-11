import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ValgentLogo } from '../brand/ValgentLogo';
import { ThemeToggle } from '../theme/ThemeToggle';
import { useAuth } from '../../context/AuthContext';
import { ArrowRight, User } from 'lucide-react';

export const PublicHeader: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 w-full px-6 py-4 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between glass-panel px-6 py-3.5 rounded-2xl">
        {/* Brand Logo */}
        <ValgentLogo size="md" to="/" />

        {/* Public Navigation */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[var(--text-secondary)]">
          <a href="#features" className="hover:text-[var(--color-wine)] dark:hover:text-[var(--color-coral)] transition-colors">
            Features
          </a>
          <a href="#how-it-works" className="hover:text-[var(--color-wine)] dark:hover:text-[var(--color-coral)] transition-colors">
            How it works
          </a>
          <a href="#security" className="hover:text-[var(--color-wine)] dark:hover:text-[var(--color-coral)] transition-colors">
            Security
          </a>
        </nav>

        {/* Right Actions: Night Mode Button & Auth */}
        <div className="flex items-center gap-3">
          {/* Night Mode Button */}
          <ThemeToggle showLabel={false} />

          {user ? (
            <button
              onClick={() => navigate('/projects')}
              className="btn-primary"
            >
              <span>Go to Projects</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <div className="flex items-center gap-2.5">
              <Link
                to="/login"
                className="btn-secondary text-sm font-medium"
              >
                Log in
              </Link>
              <Link
                to="/signup"
                className="btn-primary"
              >
                Sign up
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
