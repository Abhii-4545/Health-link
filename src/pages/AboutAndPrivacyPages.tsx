import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  ShieldCheck,
  Database,
  Server,
  Download,
  ExternalLink,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { apiRequest } from '../services/api';
import type { AppPage } from '../types/models';

interface AboutAndPrivacyProps {
  mode: 'about-project' | 'privacy-policy';
  onNavigate: (page: AppPage) => void;
}

const LITERATURE_REVIEW = [
  {
    existingSystem: 'Hospitals store medical records separately.',
    paperTitle: "1. The Ayushman Bharat Digital Mission (ABDM): Making of India's Digital Health Story (2023)",
    authors: 'Sharma, R., Rohatgi, J. & Singh, A. · Journal of Health Management, 11(1), 10–23.',
    doi: '10.1007/s40012-023-00375-0',
    limitations: 'Records remain fragmented across different systems.',
    gapsIdentified: 'Need for ABHA-linked record exchange between hospitals.',
  },
  {
    existingSystem: 'Patients carry reports between hospitals.',
    paperTitle: '2. Inception of the Indian Digital Health Mission: Connecting the Dots (2023)',
    authors: 'Raj, A., Dananjayan, P. & Agarwal, S. · Health Care Science, 2(5), 100–110.',
    doi: '10.1002/hcs2.67',
    limitations: 'Sharing needs proper authorization and verification.',
    gapsIdentified: 'Secure, consent-based sharing of medical records.',
  },
  {
    existingSystem: 'Doctors review multiple medical reports.',
    paperTitle: "3. India's Evolving Digital Health Strategy (2024)",
    authors: 'Narayan, B., Bhushan, S. & Schulman, E. · npj Digital Medicine, 7, Article 284.',
    doi: '10.1038/s41746-024-01279-2',
    limitations: 'Reviewing long medical histories takes time.',
    gapsIdentified: 'AI-assisted summaries for quick and efficient access to patient history.',
  },
];

export const AboutAndPrivacyPages: React.FC<AboutAndPrivacyProps> = ({
  mode,
  onNavigate,
}) => {
  const [archFiles, setArchFiles] = useState<{
    schemaSql: string;
    flaskAppPy: string;
    requirementsTxt: string;
  } | null>(null);
  const [activeCodeTab, setActiveCodeTab] = useState<'schema' | 'flask' | 'reqs'>('schema');

  useEffect(() => {
    if (mode === 'about-project') {
      apiRequest('/api/architecture/files')
        .then((data) => setArchFiles(data))
        .catch(() => {});
    }
  }, [mode]);

  const downloadTextFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (mode === 'privacy-policy') {
    return (
      <div className="max-w-5xl mx-auto px-6 py-12 space-y-10">
        <div className="border-b border-slate-200 pb-6 space-y-2">
          <p className="text-xs font-semibold text-sky-800">
            Security, Privacy & Governance Specification
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Privacy Policy, Consent Governance & Security Controls
          </h1>
          <p className="text-sm text-slate-600 max-w-3xl leading-relaxed">
            HealthLink ABHA treats patient medical records as strictly confidential clinical
            data. Access is governed by explicit patient authorization, role-based isolation,
            and server-enforced consent validation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-2.5">
            <div className="flex items-center gap-2 text-slate-900 font-semibold text-base">
              <Lock className="w-4 h-4 text-sky-700" />
              <h2>1. Zero Default Disclosure & Explicit Consent</h2>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              No doctor, hospital staff member, or administrator can browse all patient medical
              records. Every cross-hospital disclosure requires an explicit patient-approved
              Consent Grant specifying the permitted record categories, purpose, and expiration
              timestamp.Revoked or expired consents immediately block backend record retrieval.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-2.5">
            <div className="flex items-center gap-2 text-slate-900 font-semibold text-base">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <h2>2. ABHA Identifier Protection & Verification Honesty</h2>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              Internal database relationships use generated Internal Patient IDs (
              <code className="font-mono text-xs">HL-PAT-YYYY-XXXXXX</code>). User-entered
              14-digit ABHA numbers are validated for structure and explicitly labeled{' '}
              <strong>Unverified — Pending Authorized Gateway</strong> unless verified through an
              official ABDM gateway.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-2.5">
            <div className="flex items-center gap-2 text-slate-900 font-semibold text-base">
              <Server className="w-4 h-4 text-teal-700" />
              <h2>3. AI Medical Summarization Boundaries</h2>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              AI-assisted summaries process only documents covered by an active Consent Grant.
              API keys remain strictly in server-side environment variables and are never
              exposed to browser code. All outputs are labeled AI-Generated, cite source
              documents, and require clinician verification before clinical use.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-2.5">
            <div className="flex items-center gap-2 text-slate-900 font-semibold text-base">
              <Database className="w-4 h-4 text-sky-700" />
              <h2>4. Least-Privilege Administration & Immutable Audit Trail</h2>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              System administrators manage account statuses, hospital verification, and security
              logs without default access to readable clinical content. Every registration,
              login, record upload, view, download, consent action, and AI summary is logged.
            </p>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 space-y-2 text-xs text-slate-600 leading-relaxed">
          <p className="font-semibold text-slate-900 text-sm">
            Terms of Use & Academic Project Disclaimer
          </p>
          <p>
            This application is developed as a final-year Computer Science academic project
            demonstration (“ABHA-Based Inter-Hospital Medical Record Exchange”). It is not
            affiliated with or endorsed by the National Health Authority (NHA) or the
            Government of India. Do not upload real-world protected health information (PHI) to
            public demonstration instances without institutional security certification.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 space-y-12">
      {/* Header & Project Credits */}
      <div className="border-b border-slate-200 pb-8 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-2 max-w-3xl">
          <div className="flex items-center gap-2 text-xs font-semibold text-sky-800">
            <BookOpen className="w-4 h-4" />
            <span>Final Year Project Presentation · Department of Computer Science</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            ABHA-Based Inter-Hospital Medical Record Exchange
          </h1>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            The project aims to simplify secure medical record sharing between hospitals using
            ABHA-linked health information. It focuses on improving healthcare coordination and
            making patient history easier to access with consent and AI-assisted summarization.
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-1.5 shrink-0">
          <p className="font-semibold text-slate-900">
            Under The Guidance of: Prof. Anil Lohar
          </p>
          <p className="text-slate-600">
            <span className="font-medium text-slate-800">Presented by:</span> Priya Gaikwad ·
            Mahank Yesambare · Abhay Wable · Mahesh Khanat
          </p>
          <div className="pt-1">
            <a
              href="/assets/aistudio/Abha-based_record_system_15715151.pdf"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-sky-700 hover:underline"
            >
              <span>Open Original Project Presentation (PDF)</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>

      {/* Motivation, Problem Statement & Objectives */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
          <h2 className="text-base font-bold text-slate-900">1. Motivation</h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Simplify secure medical record sharing between hospitals using ABHA-linked health
            information:
          </p>
          <ul className="space-y-2 text-xs sm:text-sm text-slate-700">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-sky-700 shrink-0 mt-0.5" />
              <span>Improve accessibility of medical records across facilities.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-sky-700 shrink-0 mt-0.5" />
              <span>Reduce clinical delays in accessing longitudinal patient history.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-sky-700 shrink-0 mt-0.5" />
              <span>Avoid unnecessary repetition of diagnostic and laboratory tests.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-sky-700 shrink-0 mt-0.5" />
              <span>Support faster clinical review through AI-assisted summarization.</span>
            </li>
          </ul>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
          <h2 className="text-base font-bold text-slate-900">2. Problem Statement</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Medical records are often stored in different hospitals, making it difficult for
            doctors to access a patient&apos;s complete medical history during consultations or
            referrals.
          </p>
          <p className="text-sm text-slate-700 font-medium leading-relaxed">
            A secure, consent-based system is required to exchange ABHA-linked medical records
            efficiently between hospitals while preserving patient privacy and clinical accuracy.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
          <h2 className="text-base font-bold text-slate-900">4. Core Project Objectives</h2>
          <ol className="space-y-1.5 text-xs sm:text-sm text-slate-700 list-decimal list-inside">
            <li>Enable secure exchange of medical records between hospitals.</li>
            <li>Use ABHA and Internal Patient IDs for patient identification.</li>
            <li>Ensure explicit patient consent before sharing any records.</li>
            <li>Reduce delays in accessing patient medical history.</li>
            <li>Generate source-linked AI-assisted medical summaries.</li>
            <li>Improve inter-hospital healthcare coordination and auditability.</li>
          </ol>
        </div>
      </div>

      {/* Literature Review & Gaps Identified Table (Slide 5) */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            3. Existing System, Literature Review & Gaps Identified
          </h2>
          <p className="text-xs sm:text-sm text-slate-600">
            Research synthesis from our presentation analyzing current healthcare record
            fragmentation and digital health literature.
          </p>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-800 font-semibold">
                <th className="p-4">Existing System</th>
                <th className="p-4">Literature Review (Related Research Papers)</th>
                <th className="p-4">Limitations</th>
                <th className="p-4">Gaps Identified</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {LITERATURE_REVIEW.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/70 align-top">
                  <td className="p-4 font-medium text-slate-900">{row.existingSystem}</td>
                  <td className="p-4 space-y-1">
                    <p className="font-semibold text-slate-900">{row.paperTitle}</p>
                    <p className="text-xs text-slate-600">{row.authors}</p>
                    <p className="text-xs font-mono text-sky-700">DOI: {row.doi}</p>
                  </td>
                  <td className="p-4 text-slate-600">{row.limitations}</td>
                  <td className="p-4 font-medium text-teal-800">{row.gapsIdentified}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Software & Hardware Requirements (Slides 8 & 9) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
          <h2 className="text-base font-bold text-slate-900">
            6A. Software Architecture Requirements
          </h2>
          <div className="space-y-2 text-xs sm:text-sm text-slate-600">
            <p>
              <strong className="text-slate-900">Operating System:</strong> Windows 10/11 or
              Ubuntu Linux
            </p>
            <p>
              <strong className="text-slate-900">Frontend:</strong> HTML5, CSS3, JavaScript /
              TypeScript Responsive Web Portal
            </p>
            <p>
              <strong className="text-slate-900">Backend Architecture:</strong> Python with
              Flask REST API + Express Full-Stack Runtime Bridge
            </p>
            <p>
              <strong className="text-slate-900">Database:</strong> Normalized MySQL 8.0 Schema
              (11 InnoDB tables with foreign-key integrity)
            </p>
            <p>
              <strong className="text-slate-900">AI & Data Processing:</strong> Python, Pandas
              & NumPy, Gemini API (<code className="font-mono">gemini-3.8-flash</code>) for
              structured clinical record summarization
            </p>
            <p>
              <strong className="text-slate-900">Development Tools:</strong> Visual Studio
              Code, Postman, Git & GitHub
            </p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
          <h2 className="text-base font-bold text-slate-900">
            6B. Hardware & Deployment Specifications
          </h2>
          <div className="space-y-2 text-xs sm:text-sm text-slate-600">
            <p>
              <strong className="text-slate-900">Development Machine:</strong> Intel Core i3
              (10th Gen+) / AMD Ryzen 3+, 8 GB RAM min (16 GB recommended), 256 GB SSD
            </p>
            <p>
              <strong className="text-slate-900">Server Deployment:</strong> Linux-based Cloud
              Server, 2+ vCPUs, 4+ GB RAM, 50 GB SSD Storage
            </p>
            <p>
              <strong className="text-slate-900">Supported Client Devices:</strong> Desktop
              Computers, Laptops, Android Smartphones, and Tablets
            </p>
            <p>
              <strong className="text-slate-900">Network Security:</strong> HTTPS-enabled
              connection, server-side token validation, and rate-limited authentication endpoints
            </p>
          </div>
        </div>
      </div>

      {/* Inspectable & Downloadable MySQL Schema & Flask Backend Code */}
      {archFiles && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Database Schema (MySQL) & Python Flask Backend Source
              </h2>
              <p className="text-xs text-slate-600">
                Inspect or download the normalized 11-table MySQL DDL script and Python Flask
                REST API included in <code className="font-mono">/backend</code>.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => downloadTextFile('schema.sql', archFiles.schemaSql)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download schema.sql</span>
              </button>
              <button
                type="button"
                onClick={() => downloadTextFile('app.py', archFiles.flaskAppPy)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download app.py</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit">
            <button
              type="button"
              onClick={() => setActiveCodeTab('schema')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md ${
                activeCodeTab === 'schema'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              backend/schema.sql (MySQL)
            </button>
            <button
              type="button"
              onClick={() => setActiveCodeTab('flask')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md ${
                activeCodeTab === 'flask'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              backend/app.py (Python Flask)
            </button>
            <button
              type="button"
              onClick={() => setActiveCodeTab('reqs')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md ${
                activeCodeTab === 'reqs'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              backend/requirements.txt
            </button>
          </div>

          <pre className="p-4 rounded-lg bg-slate-900 text-slate-100 text-xs font-mono overflow-x-auto max-h-80 leading-relaxed">
            {activeCodeTab === 'schema' && archFiles.schemaSql}
            {activeCodeTab === 'flask' && archFiles.flaskAppPy}
            {activeCodeTab === 'reqs' && archFiles.requirementsTxt}
          </pre>
        </div>
      )}
    </div>
  );
};
