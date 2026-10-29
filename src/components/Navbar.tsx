import React, { useState } from 'react';
import { Menu, X, ShieldCheck, LogOut } from 'lucide-react';
import type { AppPage, User } from '../types/models';

interface NavbarProps {
  currentPage: AppPage;
  onNavigate: (page: AppPage, sectionId?: string) => void;
  currentUser: User | null;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentPage,
  onNavigate,
  currentUser,
  onLogout,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLinkClick = (page: AppPage, sectionId?: string) => {
    setMobileMenuOpen(false);
    onNavigate(page, sectionId);
  };

  const getDashboardPageForRole = (user: User): AppPage => {
    switch (user.role) {
      case 'patient':
        return 'patient-dashboard';
      case 'doctor':
        return 'doctor-dashboard';
      case 'staff':
        return 'staff-dashboard';
      case 'admin':
        return 'admin-dashboard';
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-8 px-6 py-4">
        {/* Zone 1: Brand Title (Single element wordmark with clean medical cross SVG) */}
        <button
          type="button"
          onClick={() => handleLinkClick('landing')}
          className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-sky-700 rounded"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            className="text-sky-700 shrink-0"
          >
            <rect
              x="2"
              y="2"
              width="20"
              height="20"
              rx="5"
              className="stroke-sky-700"
              strokeWidth="2"
            />
            <path
              d="M12 7V17M7 12H17"
              className="stroke-teal-600"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </svg>
          <span>HealthLink ABHA</span>
        </button>

        {/* Zone 2: Concise single-line navigation links */}
        <nav
          aria-label="Primary Navigation"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600"
        >
          <button
            type="button"
            onClick={() => handleLinkClick('landing')}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 ${
              currentPage === 'landing' ? 'text-sky-700 font-semibold' : ''
            }`}
          >
            Home
          </button>
          <button
            type="button"
            onClick={() => handleLinkClick('landing', 'how-it-works')}
            className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
          >
            How It Works
          </button>
          <button
            type="button"
            onClick={() => handleLinkClick('landing', 'features')}
            className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
          >
            Features
          </button>
          <button
            type="button"
            onClick={() => handleLinkClick('privacy-policy')}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 ${
              currentPage === 'privacy-policy' ? 'text-sky-700 font-semibold' : ''
            }`}
          >
            Security
          </button>
          <button
            type="button"
            onClick={() => handleLinkClick('about-project')}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 ${
              currentPage === 'about-project' ? 'text-sky-700 font-semibold' : ''
            }`}
          >
            About Project
          </button>
        </nav>

        {/* Zone 3: Primary Action */}
        <div className="hidden md:flex items-center gap-4 shrink-0">
          {currentUser ? (
            <button
              type="button"
              onClick={() => handleLinkClick(getDashboardPageForRole(currentUser))}
              className="px-4 py-2 text-sm font-semibold text-white bg-sky-700 rounded-lg hover:bg-sky-800 transition-colors whitespace-nowrap shrink-0"
            >
              Open Workspace
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleLinkClick('signup')}
              className="px-4 py-2 text-sm font-semibold text-white bg-sky-700 rounded-lg hover:bg-sky-800 transition-colors whitespace-nowrap shrink-0"
            >
              Create Account
            </button>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={mobileMenuOpen}
          className="md:hidden p-2.5 text-slate-700 hover:bg-slate-100 rounded-lg"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Dropdown Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-6 py-4 space-y-3">
          <div className="flex flex-col space-y-2 text-sm font-medium text-slate-700">
            <button
              type="button"
              onClick={() => handleLinkClick('landing')}
              className="text-left py-2 hover:text-sky-700"
            >
              Home
            </button>
            <button
              type="button"
              onClick={() => handleLinkClick('landing', 'how-it-works')}
              className="text-left py-2 hover:text-sky-700"
            >
              How It Works
            </button>
            <button
              type="button"
              onClick={() => handleLinkClick('landing', 'features')}
              className="text-left py-2 hover:text-sky-700"
            >
              Features
            </button>
            <button
              type="button"
              onClick={() => handleLinkClick('privacy-policy')}
              className="text-left py-2 hover:text-sky-700"
            >
              Security & Privacy
            </button>
            <button
              type="button"
              onClick={() => handleLinkClick('about-project')}
              className="text-left py-2 hover:text-sky-700"
            >
              About Project
            </button>
          </div>
          <div className="pt-3 border-t border-slate-200 flex flex-col gap-2">
            {currentUser ? (
              <>
                <button
                  type="button"
                  onClick={() => handleLinkClick(getDashboardPageForRole(currentUser))}
                  className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-sky-700 rounded-lg hover:bg-sky-800 text-center"
                >
                  Open Workspace ({currentUser.fullName})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onLogout();
                  }}
                  className="w-full py-2.5 px-4 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => handleLinkClick('signin')}
                  className="w-full py-2.5 px-4 text-sm font-semibold text-slate-800 border border-slate-300 rounded-lg hover:bg-slate-50 text-center"
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => handleLinkClick('signup')}
                  className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-sky-700 rounded-lg hover:bg-sky-800 text-center"
                >
                  Create Account
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
