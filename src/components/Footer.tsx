import React from 'react';
import type { AppPage } from '../types/models';

interface FooterProps {
  onNavigate: (page: AppPage, sectionId?: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="bg-slate-50 border-t border-slate-200 text-slate-600">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-slate-200">
          {/* Column 1: Brand & Supporting Description */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2.5 text-slate-900 font-bold text-base">
              <svg
                width="20"
                height="20"
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
            </div>
            <p className="text-xs font-medium text-sky-800">
              Secure Medical Records. Connected Healthcare.
            </p>
            <p className="text-sm text-slate-600 max-w-md leading-relaxed">
              An ABHA-linked medical record exchange platform designed to help authorized
              healthcare professionals access patient history securely, subject to patient
              consent and supported integrations.
            </p>
          </div>

          {/* Column 2: Platform Links */}
          <div className="space-y-2.5">
            <h3 className="text-sm font-semibold text-slate-900">Platform</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('landing', 'how-it-works')}
                  className="hover:text-slate-900 transition-colors"
                >
                  How It Works
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('landing', 'features')}
                  className="hover:text-slate-900 transition-colors"
                >
                  Key Features
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('signin')}
                  className="hover:text-slate-900 transition-colors"
                >
                  Sign In to Portal
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('signup')}
                  className="hover:text-slate-900 transition-colors"
                >
                  Register Account
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Governance, Privacy & Contact */}
          <div className="space-y-2.5">
            <h3 className="text-sm font-semibold text-slate-900">Governance & Support</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('about-project')}
                  className="hover:text-slate-900 transition-colors"
                >
                  About the Project
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('privacy-policy')}
                  className="hover:text-slate-900 transition-colors"
                >
                  Privacy and Security
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('privacy-policy')}
                  className="hover:text-slate-900 transition-colors"
                >
                  Terms of Use
                </button>
              </li>
              <li className="text-slate-500 pt-1">
                Contact: support@healthlink-project.edu.in
              </li>
            </ul>
          </div>
        </div>

        {/* Project Status Disclaimer */}
        <div className="pt-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs text-slate-500">
          <p className="max-w-3xl leading-relaxed">
            <strong className="font-semibold text-slate-700">Project Status Disclaimer:</strong>{' '}
            HealthLink ABHA is an academic final-year engineering demonstration project
            (“ABHA-Based Inter-Hospital Medical Record Exchange”). It is not an official
            Government of India or National Health Authority (NHA) portal, and external
            inter-hospital retrieval or live ABHA verification requires configured gateway
            credentials and explicit patient authorization.
          </p>
          <p className="whitespace-nowrap shrink-0">
            © {new Date().getFullYear()} HealthLink ABHA Project
          </p>
        </div>
      </div>
    </footer>
  );
};
