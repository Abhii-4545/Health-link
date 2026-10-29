import React from 'react';
import {
  UserCheck,
  Building2,
  ShieldCheck,
  FileSearch,
  Lock,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

export const HeroDataFlowDiagram: React.FC = () => {
  return (
    <div
      className="bg-slate-50 border border-slate-200 rounded-xl p-6 lg:p-8 flex flex-col justify-between h-full"
      aria-label="Healthcare Consent and Medical Record Exchange Data Flow Diagram"
    >
      <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-6">
        <div>
          <p className="text-xs font-medium text-sky-800">
            Inter-Hospital Architecture
          </p>
          <h3 className="text-base font-semibold text-slate-900 mt-0.5">
            Consent-Gated Clinical Exchange Workflow
          </h3>
        </div>
        <span className="text-xs font-mono text-slate-500">
          TLS 1.3 · RBAC Enforced
        </span>
      </div>

      {/* Visual Flow Nodes */}
      <div className="space-y-4 my-auto">
        {/* Step 1: Patient & ABHA / Internal ID */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-start gap-3.5">
          <div className="p-2.5 rounded-lg bg-sky-50 text-sky-700 shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-900">
                1. Patient Identity & Consent Control
              </p>
              <span className="text-xs font-mono text-teal-700 shrink-0">
                HL-PAT / ABHA ID
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Patient registers once, receives an Internal Patient ID, optionally links a
              14-digit ABHA identifier, and controls every disclosure request.
            </p>
          </div>
        </div>

        {/* Connector */}
        <div className="flex items-center justify-center text-xs text-slate-500 gap-2">
          <Lock className="w-3.5 h-3.5 text-amber-600" />
          <span>Explicit Scope, Purpose & Duration Approval Required</span>
        </div>

        {/* Step 2: Participating Hospitals Exchange */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-white border border-slate-200 rounded-lg p-3.5">
            <div className="flex items-center gap-2 text-slate-900 font-semibold text-xs">
              <Building2 className="w-4 h-4 text-sky-700 shrink-0" />
              <span>Originating Hospital (HIP)</span>
            </div>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              Uploads categorized prescriptions, lab reports, and discharge summaries to
              the encrypted record vault.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-3.5">
            <div className="flex items-center gap-2 text-slate-900 font-semibold text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>Requesting Hospital (HIU)</span>
            </div>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              Authorized doctor retrieves only records within the patient’s approved
              consent window.
            </p>
          </div>
        </div>

        {/* Connector */}
        <div className="flex items-center justify-center text-xs text-slate-500 gap-2">
          <ArrowRight className="w-3.5 h-3.5 text-sky-700 rotate-90" />
          <span>Server-Side Gemini Clinical Synthesis</span>
        </div>

        {/* Step 3: AI Medical Summary & Audit Log */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-start gap-3.5">
          <div className="p-2.5 rounded-lg bg-teal-50 text-teal-700 shrink-0">
            <FileSearch className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-900">
                3. AI-Assisted Clinical Summary & Audit Trail
              </p>
              <span className="text-xs text-emerald-700 font-medium flex items-center gap-1 shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Audited
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Synthesizes authorized documents into structured clinical history, medications,
              allergies, and source links for physician review—logging every access event.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
        <span>Zero automatic disclosure</span>
        <span>·</span>
        <span>Revocable anytime by patient</span>
        <span>·</span>
        <span>Source-linked AI review</span>
      </div>
    </div>
  );
};
