import React from 'react';
import {
  Fingerprint,
  ShieldCheck,
  Building2,
  FileSearch,
  ClipboardList,
  Stethoscope,
  ArrowRight,
  Lock,
  LogIn,
} from 'lucide-react';
import { HeroDataFlowDiagram } from '../components/HeroDataFlowDiagram';
import type { AppPage, User } from '../types/models';

interface LandingPageProps {
  onNavigate: (page: AppPage, sectionId?: string) => void;
  currentUser: User | null;
}

const KEY_FEATURES = [
  {
    number: '01',
    title: 'ABHA-Linked Identification',
    description:
      'Support patient identification with an automatic Internal Patient ID and optional 14-digit ABHA linking where authorized integration is available.',
    icon: Fingerprint,
  },
  {
    number: '02',
    title: 'Consent-Based Sharing',
    description:
      'Require explicit, time-bounded patient authorization specifying the requesting facility, clinical purpose, and document categories before protected records are disclosed.',
    icon: ShieldCheck,
  },
  {
    number: '03',
    title: 'Inter-Hospital Exchange',
    description:
      'Provide a structured workflow for requesting and retrieving longitudinal medical records across connected healthcare facilities.',
    icon: Building2,
  },
  {
    number: '04',
    title: 'AI Medical Summaries',
    description:
      'Synthesize authorized medical documents into structured clinical overviews, documented diagnoses, medications, allergies, and source references for faster review.',
    icon: FileSearch,
  },
  {
    number: '05',
    title: 'Secure Audit Logs',
    description:
      'Record every registration, upload, consent approval, revocation, document view, and AI summary generation in an immutable audit trail.',
    icon: ClipboardList,
  },
  {
    number: '06',
    title: 'Better Healthcare Coordination',
    description:
      'Reduce delays in accessing patient history and avoid unnecessary repetition of diagnostic tests across separate hospitals.',
    icon: Stethoscope,
  },
];

const WORKFLOW_STEPS = [
  {
    step: '01',
    title: 'Patient Registration',
    detail: 'Patient or hospital staff creates a verified account with zero pre-filled records.',
  },
  {
    step: '02',
    title: 'Internal Patient ID',
    detail: 'System generates a unique internal identifier (HL-PAT-YYYY-XXXXXX).',
  },
  {
    step: '03',
    title: 'ABHA Linking (If Available)',
    detail: 'Optional 14-digit ABHA identifier is linked; status reflects gateway verification.',
  },
  {
    step: '04',
    title: 'Request Medical Records',
    detail: 'Authorized doctor or hospital requests specific record categories with a clinical purpose.',
  },
  {
    step: '05',
    title: 'Patient Consent',
    detail: 'Patient reviews requesting facility, scope, and duration, then approves or rejects.',
  },
  {
    step: '06',
    title: 'Retrieve Authorized Records',
    detail: 'Backend validates active consent scope and discloses only permitted documents.',
  },
  {
    step: '07',
    title: 'Generate AI-Assisted Summary',
    detail: 'Server-side Gemini API summarizes only the authorized source records.',
  },
  {
    step: '08',
    title: 'Doctor Reviews Summary',
    detail: 'Physician verifies clinical accuracy against linked source documents before use.',
  },
  {
    step: '09',
    title: 'Secure Audit Log',
    detail: 'Every access, consent decision, and clinical review is permanently logged.',
  },
];

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate, currentUser }) => {
  return (
    <div className="bg-white text-slate-900">
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 py-10 lg:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
          {/* Left Column: Value Proposition & Primary Actions */}
          <div className="lg:col-span-7 flex flex-col justify-center space-y-6">
            <div className="flex items-center gap-2 text-xs font-medium text-sky-800">
              <span>HealthLink ABHA</span>
              <span aria-hidden="true">·</span>
              <span>Secure Medical Records. Connected Healthcare.</span>
            </div>

            <h1
              className="font-display font-bold tracking-tight text-slate-900 leading-[1.12]"
              style={{ fontSize: 'clamp(2.25rem, 4vw, 3.5rem)', textWrap: 'balance' }}
            >
              Your Health Records, Connected Securely.
            </h1>

            <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl">
              Access and exchange medical history across participating healthcare facilities
              through a consent-driven workflow, with AI-assisted summaries to support faster
              clinical review.
            </p>

            {/* Primary & Secondary CTAs */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                type="button"
                onClick={() => onNavigate(currentUser ? 'patient-dashboard' : 'signup')}
                className="px-6 py-3 text-sm font-semibold text-white bg-sky-700 rounded-lg hover:bg-sky-800 transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
              >
                <span>Get Started</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => onNavigate('landing', 'how-it-works')}
                className="px-6 py-3 text-sm font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
              >
                Explore How It Works
              </button>

              {!currentUser && (
                <button
                  type="button"
                  onClick={() => onNavigate('signin')}
                  className="px-4 py-3 text-sm font-semibold text-sky-700 hover:text-sky-900 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </button>
              )}
            </div>

            {/* Supporting Description & Trust Principles */}
            <div className="pt-6 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-600">
              <div>
                <p className="font-semibold text-slate-900">Explicit Patient Consent</p>
                <p className="mt-0.5">No medical record is shared without active patient approval.</p>
              </div>
              <div>
                <p className="font-semibold text-slate-900">Role-Based Isolation</p>
                <p className="mt-0.5">Dedicated workspaces for Patients, Doctors, Staff, and Admins.</p>
              </div>
              <div>
                <p className="font-semibold text-slate-900">Source-Linked AI Review</p>
                <p className="mt-0.5">Summaries cite authorized records for clinical verification.</p>
              </div>
            </div>
          </div>

          {/* Right Column: Minimal Healthcare Data-Flow Illustration */}
          <div className="lg:col-span-5">
            <HeroDataFlowDiagram />
          </div>
        </div>
      </section>

      {/* Key Features Section */}
      <section id="features" className="bg-slate-50 border-y border-slate-200 py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl space-y-3 mb-12">
            <p className="text-xs font-semibold text-sky-800">Core Platform Capabilities</p>
            <h2
              className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight"
              style={{ textWrap: 'balance' }}
            >
              Built for Consent-Driven Clinical Interoperability
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              An ABHA-linked medical record exchange platform designed to help authorized
              healthcare professionals access patient history securely, subject to patient
              consent and supported integrations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {KEY_FEATURES.map((feat) => {
              const IconComponent = feat.icon;
              return (
                <div
                  key={feat.number}
                  className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between hover:border-sky-300 transition-colors"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-2.5 rounded-lg bg-sky-50 text-sky-700">
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-mono text-slate-400">{feat.number}</span>
                    </div>
                    <h3 className="text-base font-semibold text-slate-900">{feat.title}</h3>
                    <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                      {feat.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-6 py-16 lg:py-20">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="max-w-2xl space-y-3">
            <p className="text-xs font-semibold text-teal-700">Methodology & Proposed Project Flow</p>
            <h2
              className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight"
              style={{ textWrap: 'balance' }}
            >
              Nine-Stage Consent and Summarization Workflow
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              Every record exchange follows a verifiable sequence from patient registration to
              consent validation, AI-assisted summarization, and immutable audit logging.
            </p>
          </div>
          <p className="text-xs text-slate-500 max-w-xs">
            Note: Actual inter-hospital retrieval depends on supported facility integrations,
            gateway configuration, and active patient authorization.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {WORKFLOW_STEPS.map((item) => (
            <div
              key={item.step}
              className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-2 text-xs font-mono text-sky-700 mb-2">
                  <span>Step {item.step}</span>
                </div>
                <h3 className="text-sm font-semibold text-slate-900">{item.title}</h3>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Role-Based Access & Security CTA Section */}
      <section id="security" className="bg-slate-50 border-t border-slate-200 py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="bg-white border border-slate-200 rounded-xl p-8 lg:p-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
            <div className="space-y-3 max-w-2xl">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
                <Lock className="w-4 h-4" />
                <span>Zero Preloaded Profiles · Strict Role-Based Access Control</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                Ready to Experience the Record Exchange Workflow?
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Create a Patient, Doctor, or Hospital Staff account to test end-to-end record
                uploads, consent requests, approvals, revocations, and server-side AI clinical
                summarization.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => onNavigate('signup')}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-sky-700 rounded-lg hover:bg-sky-800 transition-colors whitespace-nowrap"
              >
                Create Account
              </button>
              <button
                type="button"
                onClick={() => onNavigate('signin')}
                className="px-5 py-2.5 text-sm font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => onNavigate('about-project')}
                className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors whitespace-nowrap"
              >
                View Project Documentation
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
