import React, { useEffect, useState, useCallback } from 'react';
import {
  LayoutDashboard,
  Search,
  Share2,
  FileText,
  FileSearch,
  History,
  Settings,
  LogOut,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Eye,
  Download,
  Sparkles,
  X,
} from 'lucide-react';
import { apiRequest } from '../services/api';
import { RECORD_CATEGORIES } from '../utils/domainLogic';
import type {
  AIGeneratedSummary,
  AppPage,
  AuditLog,
  ConsentGrant,
  DoctorProfile,
  MedicalRecord,
  RecordCategory,
  RecordSharingRequest,
  User,
} from '../types/models';

interface DoctorWorkspaceProps {
  token: string;
  currentUser: User;
  activeSubPage: AppPage;
  onNavigate: (page: AppPage) => void;
  onLogout: () => void;
}

type DoctorTab =
  | 'overview'
  | 'search'
  | 'requests'
  | 'records'
  | 'summaries'
  | 'history'
  | 'settings';

export const DoctorWorkspace: React.FC<DoctorWorkspaceProps> = ({
  token,
  currentUser,
  activeSubPage,
  onNavigate,
  onLogout,
}) => {
  const mapPageToTab = (p: AppPage): DoctorTab => {
    switch (p) {
      case 'doctor-search':
        return 'search';
      case 'doctor-records':
        return 'records';
      case 'doctor-summaries':
        return 'summaries';
      case 'audit-logs':
        return 'history';
      case 'settings':
        return 'settings';
      default:
        return 'overview';
    }
  };

  const [activeTab, setActiveTab] = useState<DoctorTab>(mapPageToTab(activeSubPage));
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const [metrics, setMetrics] = useState({
    pendingRequests: 0,
    activeConsents: 0,
    authorizedRecordsCount: 0,
    aiSummariesCount: 0,
  });
  const [requests, setRequests] = useState<RecordSharingRequest[]>([]);
  const [activeGrants, setActiveGrants] = useState<ConsentGrant[]>([]);
  const [authorizedRecords, setAuthorizedRecords] = useState<MedicalRecord[]>([]);
  const [summaries, setSummaries] = useState<AIGeneratedSummary[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Patient Lookup State
  const [lookupInput, setLookupInput] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResult, setLookupResult] = useState<{
    internalPatientId: string;
    fullName: string;
    dateOfBirth: string;
    gender: string;
    abhaNumber?: string;
    abhaStatus: string;
    totalRecordsOnFile: number;
    hasActiveConsent: boolean;
    activeConsentExpiresAt?: string;
    latestRequestStatus?: string | null;
  } | null>(null);
  const [lookupSearched, setLookupSearched] = useState(false);

  // Request Consent Form State
  const [requestPurpose, setRequestPurpose] = useState('');
  const [requestDuration, setRequestDuration] = useState(72);
  const [selectedCategories, setSelectedCategories] = useState<RecordCategory[]>([
    'Prescriptions',
    'Laboratory reports',
    'Discharge summaries',
    'Consultation notes',
    'Diagnostic reports',
  ]);
  const [submittingRequest, setSubmittingRequest] = useState(false);

  // Record Viewer & AI Summary State
  const [viewingRecord, setViewingRecord] = useState<MedicalRecord | null>(null);
  const [selectedPatientForSummary, setSelectedPatientForSummary] = useState('');
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [reviewNotesMap, setReviewNotesMap] = useState<Record<string, string>>({});

  useEffect(() => {
    setActiveTab(mapPageToTab(activeSubPage));
  }, [activeSubPage]);

  const fetchDoctorOverview = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await apiRequest('/api/doctor/overview', {}, token);
      setProfile(data.profile);
      setMetrics(data.metrics);
      setRequests(data.requests || []);
      setActiveGrants(data.activeGrants || []);
      setAuthorizedRecords(data.authorizedRecords || []);
      setSummaries(data.summaries || []);
      setAuditLogs(data.auditLogs || []);
      if (data.activeGrants?.length > 0 && !selectedPatientForSummary) {
        setSelectedPatientForSummary(data.activeGrants[0].patientId);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Unable to load doctor workspace.');
    } finally {
      setLoading(false);
    }
  }, [token, selectedPatientForSummary]);

  useEffect(() => {
    fetchDoctorOverview();
  }, [fetchDoctorOverview]);

  const switchTab = (tab: DoctorTab, page?: AppPage) => {
    setActiveTab(tab);
    setErrorMsg(null);
    setFeedbackMsg(null);
    if (page) onNavigate(page);
  };

  const handlePatientLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setFeedbackMsg(null);
    setLookupSearched(false);
    if (!lookupInput.trim()) {
      setErrorMsg('Enter an Internal Patient ID (HL-PAT-YYYY-XXXXXX) or 14-digit ABHA number.');
      return;
    }
    setLookupLoading(true);
    try {
      const data = await apiRequest(
        `/api/patients/lookup?q=${encodeURIComponent(lookupInput.trim())}`,
        {},
        token
      );
      setLookupResult(data.patient);
      setLookupSearched(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Lookup failed.');
    } finally {
      setLookupLoading(false);
    }
  };

  const handleCreateSharingRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupResult) return;
    setErrorMsg(null);
    setFeedbackMsg(null);
    setSubmittingRequest(true);
    try {
      await apiRequest(
        '/api/consents/request',
        {
          method: 'POST',
          body: JSON.stringify({
            patientId: lookupResult.internalPatientId,
            purpose: requestPurpose,
            requestedCategories: selectedCategories,
            requestedDurationHours: requestDuration,
          }),
        },
        token
      );
      setFeedbackMsg(
        `Record-sharing request sent to ${lookupResult.fullName} (${lookupResult.internalPatientId}). Status: Pending Patient Consent.`
      );
      setRequestPurpose('');
      await fetchDoctorOverview();
      // Refresh lookup status
      const updated = await apiRequest(
        `/api/patients/lookup?q=${encodeURIComponent(lookupResult.internalPatientId)}`,
        {},
        token
      );
      setLookupResult(updated.patient);
    } catch (err: any) {
      setErrorMsg(err.message || 'Unable to submit record request.');
    } finally {
      setSubmittingRequest(false);
    }
  };

  const toggleCategory = (cat: RecordCategory) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleAccessRecord = async (recordId: string, mode: 'view' | 'download') => {
    setErrorMsg(null);
    try {
      const data = await apiRequest<{ record: MedicalRecord }>(
        `/api/records/${recordId}/access?mode=${mode}`,
        {},
        token
      );
      if (mode === 'view') {
        setViewingRecord(data.record);
      } else {
        const content =
          `HEALTHLINK ABHA — AUTHORIZED CLINICAL RECORD\n` +
          `Record ID: ${data.record.id}\n` +
          `Patient: ${data.record.patientName} (${data.record.patientId})\n` +
          `Category: ${data.record.category}\n` +
          `Originating Facility: ${data.record.facilityName}\n` +
          `Date: ${data.record.recordDate}\n\n` +
          `CLINICAL CONTENT:\n${data.record.clinicalTextContent}\n`;
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${data.record.id}_clinical_record.txt`;
        a.click();
        URL.revokeObjectURL(url);
      }
      await fetchDoctorOverview();
    } catch (err: any) {
      setErrorMsg(err.message || 'Access denied.');
    }
  };

  const handleGenerateAISummary = async () => {
    if (!selectedPatientForSummary) {
      setErrorMsg('Select a patient with an active consent grant first.');
      return;
    }
    setErrorMsg(null);
    setFeedbackMsg(null);
    setGeneratingSummary(true);
    try {
      await apiRequest(
        '/api/summaries/generate',
        {
          method: 'POST',
          body: JSON.stringify({ patientId: selectedPatientForSummary }),
        },
        token
      );
      setFeedbackMsg(
        'AI-assisted clinical summary generated from authorized patient records. Please review and verify before clinical use.'
      );
      await fetchDoctorOverview();
    } catch (err: any) {
      setErrorMsg(err.message || 'AI Summary generation failed.');
    } finally {
      setGeneratingSummary(false);
    }
  };

  const handleDoctorReviewSummary = async (
    summaryId: string,
    status: 'reviewed_verified' | 'amended'
  ) => {
    setErrorMsg(null);
    setFeedbackMsg(null);
    try {
      await apiRequest(
        `/api/summaries/${summaryId}/review`,
        {
          method: 'PUT',
          body: JSON.stringify({
            doctorReviewStatus: status,
            doctorClinicalNotes: reviewNotesMap[summaryId] || '',
          }),
        },
        token
      );
      setFeedbackMsg('Clinical interpretation review saved and logged.');
      await fetchDoctorOverview();
    } catch (err: any) {
      setErrorMsg(err.message || 'Unable to save clinical review.');
    }
  };

  return (
    <div className="min-h-[calc(100vh-65px)] bg-slate-50 flex flex-col lg:flex-row">
      {/* Doctor Sidebar */}
      <aside className="w-full lg:w-64 bg-white border-b lg:border-b-0 lg:border-r border-slate-200 shrink-0 flex flex-col justify-between p-4">
        <div className="space-y-4">
          <div className="px-3 py-2.5 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-xs font-medium text-sky-800">Doctor Workspace</p>
            <p className="text-sm font-bold text-slate-900 truncate">{currentUser.fullName}</p>
            <p className="text-xs text-slate-500 truncate mt-0.5">
              {profile?.hospitalName} · {profile?.registrationNumber}
            </p>
          </div>

          <nav aria-label="Doctor Sidebar Navigation" className="space-y-1">
            {(
              [
                { id: 'overview', label: 'Overview', icon: LayoutDashboard, page: 'doctor-dashboard' },
                { id: 'search', label: 'Patient Search', icon: Search, page: 'doctor-search' },
                { id: 'requests', label: 'Record Requests', icon: Share2 },
                {
                  id: 'records',
                  label: 'Authorized Patient Records',
                  icon: FileText,
                  page: 'doctor-records',
                },
                {
                  id: 'summaries',
                  label: 'AI Medical Summaries',
                  icon: FileSearch,
                  page: 'doctor-summaries',
                },
                { id: 'history', label: 'Access History', icon: History, page: 'audit-logs' },
                { id: 'settings', label: 'Profile and Settings', icon: Settings, page: 'settings' },
              ] as const
            ).map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => switchTab(item.id, item.page)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-sky-50 text-sky-800 font-semibold'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="pt-4 border-t border-slate-200 mt-4">
          <button
            type="button"
            onClick={onLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs sm:text-sm font-medium text-red-700 hover:bg-red-50"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 lg:p-8 max-w-6xl w-full mx-auto space-y-6">
        {errorMsg && (
          <div
            role="alert"
            className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm flex items-center justify-between"
          >
            <span>{errorMsg}</span>
            <button type="button" onClick={() => setErrorMsg(null)} aria-label="Dismiss error">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {feedbackMsg && (
          <div
            role="status"
            className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between"
          >
            <span>{feedbackMsg}</span>
            <button type="button" onClick={() => setFeedbackMsg(null)} aria-label="Dismiss alert">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {loading ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-sm text-slate-500">
            Loading clinical workspace...
          </div>
        ) : (
          <>
            {/* TAB 1: DOCTOR OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                      Clinical Exchange Workspace
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                      {profile?.fullName} · {profile?.specialization} · {profile?.hospitalName}
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => switchTab('search', 'doctor-search')}
                      className="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-sky-700 rounded-lg hover:bg-sky-800"
                    >
                      Patient Lookup & Request Access
                    </button>
                    <button
                      type="button"
                      onClick={() => switchTab('summaries', 'doctor-summaries')}
                      className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                    >
                      AI Clinical Summaries
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white border border-slate-200 rounded-xl p-5">
                    <p className="text-xs font-medium text-slate-500">Pending Record Requests</p>
                    <p className="text-2xl font-bold font-mono tabular-nums text-amber-700 mt-1">
                      {metrics.pendingRequests}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">Awaiting patient approval</p>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-5">
                    <p className="text-xs font-medium text-slate-500">Active Patient Consents</p>
                    <p className="text-2xl font-bold font-mono tabular-nums text-emerald-700 mt-1">
                      {metrics.activeConsents}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">Authorized for clinical review</p>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-5">
                    <p className="text-xs font-medium text-slate-500">Authorized Documents</p>
                    <p className="text-2xl font-bold font-mono tabular-nums text-sky-700 mt-1">
                      {metrics.authorizedRecordsCount}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">Accessible within consent scope</p>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-5">
                    <p className="text-xs font-medium text-slate-500">AI Medical Summaries</p>
                    <p className="text-2xl font-bold font-mono tabular-nums text-teal-700 mt-1">
                      {metrics.aiSummariesCount}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">Synthesized from source records</p>
                  </div>
                </div>

                {/* Authorized Patient Records Preview */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold text-slate-900">
                      Currently Authorized Patient Records
                    </h2>
                    <button
                      type="button"
                      onClick={() => switchTab('records', 'doctor-records')}
                      className="text-xs font-semibold text-sky-700 hover:underline"
                    >
                      Open Authorized Record Viewer →
                    </button>
                  </div>

                  {authorizedRecords.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-500">
                      No patient records available. Use Patient Search to look up a patient by
                      Internal Patient ID or ABHA number and request consent.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-200 text-xs sm:text-sm">
                      {authorizedRecords.slice(0, 4).map((rec) => (
                        <div
                          key={rec.id}
                          className="py-3 flex items-center justify-between gap-4"
                        >
                          <div>
                            <p className="font-semibold text-slate-900">
                              {rec.title} ·{' '}
                              <span className="font-normal text-slate-600">
                                {rec.patientName} ({rec.patientId})
                              </span>
                            </p>
                            <p className="text-xs text-slate-500">
                              {rec.category} · {rec.facilityName} · {rec.recordDate}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAccessRecord(rec.id, 'view')}
                            className="px-3 py-1.5 text-xs font-semibold text-sky-700 bg-sky-50 rounded-lg hover:bg-sky-100"
                          >
                            View Record
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: PATIENT SEARCH (SCOPED LOOKUP) */}
            {activeTab === 'search' && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-xl font-bold text-slate-900">
                    Authorized Patient Lookup & Record Request
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                    Unrestricted browsing of patient directories is disabled for privacy. Search by
                    exact Internal Patient ID (<span className="font-mono">HL-PAT-2026-XXXXXX</span>
                    ) or 14-digit ABHA number.
                  </p>
                </div>

                <form
                  onSubmit={handlePatientLookup}
                  className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col sm:flex-row gap-3"
                >
                  <input
                    type="text"
                    aria-label="Enter Internal Patient ID or 14-digit ABHA Number"
                    value={lookupInput}
                    onChange={(e) => setLookupInput(e.target.value)}
                    placeholder="Enter HL-PAT-2026-XXXXXX or 14-digit ABHA (XX-XXXX-XXXX-XXXX)"
                    className="flex-1 px-3.5 py-2.5 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                  <button
                    type="submit"
                    disabled={lookupLoading}
                    className="px-5 py-2.5 text-sm font-semibold text-white bg-sky-700 rounded-lg hover:bg-sky-800 disabled:opacity-60 whitespace-nowrap"
                  >
                    {lookupLoading ? 'Searching...' : 'Search Patient'}
                  </button>
                </form>

                {lookupSearched && !lookupResult && (
                  <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-2">
                    <p className="text-sm font-semibold text-slate-900">
                      No matching patient found
                    </p>
                    <p className="text-xs text-slate-600">
                      Verify the exact Internal Patient ID or 14-digit ABHA number with the
                      patient.
                    </p>
                  </div>
                )}

                {lookupResult && (
                  <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                      <div>
                        <p className="text-xs font-mono text-sky-700">
                          {lookupResult.internalPatientId}
                        </p>
                        <h2 className="text-lg font-bold text-slate-900">
                          {lookupResult.fullName}
                        </h2>
                        <p className="text-xs text-slate-600 mt-0.5">
                          DOB: {lookupResult.dateOfBirth || 'N/A'} · Records on File:{' '}
                          <span className="font-mono font-semibold">
                            {lookupResult.totalRecordsOnFile}
                          </span>{' '}
                          · ABHA:{' '}
                          {lookupResult.abhaNumber
                            ? `${lookupResult.abhaNumber} (${
                                lookupResult.abhaStatus === 'verified'
                                  ? 'Verified'
                                  : 'Unverified — Pending Gateway'
                              })`
                            : 'Not linked'}
                        </p>
                      </div>

                      <div className="text-xs font-semibold">
                        {lookupResult.hasActiveConsent ? (
                          <span className="text-emerald-700 flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4" />
                            Consent Approved (Active until{' '}
                            {lookupResult.activeConsentExpiresAt
                              ? new Date(lookupResult.activeConsentExpiresAt).toLocaleDateString()
                              : ''}
                            )
                          </span>
                        ) : lookupResult.latestRequestStatus === 'Pending' ? (
                          <span className="text-amber-700 flex items-center gap-1.5">
                            <Clock className="w-4 h-4" />
                            Consent Request Pending Patient Approval
                          </span>
                        ) : (
                          <span className="text-slate-600 flex items-center gap-1.5">
                            <AlertTriangle className="w-4 h-4 text-amber-600" />
                            No Active Consent — Protected Records Locked
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Request Access Form */}
                    <form onSubmit={handleCreateSharingRequest} className="space-y-4">
                      <h3 className="text-sm font-bold text-slate-900">
                        Request Patient Consent for Historical Medical Records
                      </h3>
                      <div>
                        <label
                          htmlFor="req-purpose"
                          className="block text-xs font-semibold text-slate-700 mb-1"
                        >
                          Clinical Purpose for Record Access *
                        </label>
                        <input
                          id="req-purpose"
                          type="text"
                          required
                          value={requestPurpose}
                          onChange={(e) => setRequestPurpose(e.target.value)}
                          placeholder="e.g., Cardiology consultation and review of prior diagnostic reports"
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                        />
                      </div>

                      <div>
                        <p className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Requested Record Categories
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {RECORD_CATEGORIES.map((cat) => (
                            <label
                              key={cat}
                              className="flex items-center gap-2 text-xs text-slate-700 p-2 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50"
                            >
                              <input
                                type="checkbox"
                                checked={selectedCategories.includes(cat)}
                                onChange={() => toggleCategory(cat)}
                                className="rounded text-sky-700"
                              />
                              <span>{cat}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                        <div className="flex items-center gap-2">
                          <label
                            htmlFor="req-duration"
                            className="text-xs font-semibold text-slate-700"
                          >
                            Requested Access Duration:
                          </label>
                          <select
                            id="req-duration"
                            value={requestDuration}
                            onChange={(e) => setRequestDuration(Number(e.target.value))}
                            className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                          >
                            <option value={24}>24 Hours</option>
                            <option value={72}>72 Hours</option>
                            <option value={168}>7 Days</option>
                          </select>
                        </div>

                        <button
                          type="submit"
                          disabled={submittingRequest}
                          className="px-5 py-2.5 text-xs sm:text-sm font-semibold text-white bg-sky-700 rounded-lg hover:bg-sky-800 disabled:opacity-60"
                        >
                          {submittingRequest
                            ? 'Sending Request...'
                            : 'Submit Record-Sharing Request'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: RECORD REQUESTS */}
            {activeTab === 'requests' && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-xl font-bold text-slate-900">
                    Outgoing Record-Sharing Requests
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                    Track the consent status of your historical record requests.
                  </p>
                </div>

                {requests.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-xs text-slate-500">
                    No record-sharing requests submitted yet.
                  </div>
                ) : (
                  <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs sm:text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 font-semibold">
                          <th className="p-4">Request ID</th>
                          <th className="p-4">Patient</th>
                          <th className="p-4">Clinical Purpose</th>
                          <th className="p-4">Categories</th>
                          <th className="p-4">Consent Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {requests.map((r) => (
                          <tr key={r.id}>
                            <td className="p-4 font-mono text-xs">{r.id}</td>
                            <td className="p-4">
                              <p className="font-semibold text-slate-900">{r.patientName}</p>
                              <p className="text-xs font-mono text-slate-500">{r.patientId}</p>
                            </td>
                            <td className="p-4 text-slate-700">{r.purpose}</td>
                            <td className="p-4 text-xs text-slate-600">
                              {r.requestedCategories.join(', ')}
                            </td>
                            <td className="p-4 font-semibold">
                              <span
                                className={
                                  r.status === 'Approved'
                                    ? 'text-emerald-700'
                                    : r.status === 'Pending'
                                    ? 'text-amber-700'
                                    : 'text-red-700'
                                }
                              >
                                {r.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: AUTHORIZED PATIENT RECORDS */}
            {activeTab === 'records' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-xl font-bold text-slate-900">
                      Authorized Patient Record Viewer
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                      Displays only medical documents covered by an active, unexpired patient
                      Consent Grant.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => switchTab('summaries', 'doctor-summaries')}
                    className="px-4 py-2 text-xs font-semibold text-white bg-teal-700 rounded-lg hover:bg-teal-800"
                  >
                    Generate AI Summary →
                  </button>
                </div>

                {authorizedRecords.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-2">
                    <FileText className="w-8 h-8 text-slate-400 mx-auto" />
                    <h2 className="text-base font-semibold text-slate-900">
                      No patient records available
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
                      You currently have zero authorized patient records. Search for a patient and
                      obtain active consent before viewing protected documents.
                    </p>
                  </div>
                ) : (
                  <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs sm:text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 font-semibold">
                          <th className="p-4">Document Title</th>
                          <th className="p-4">Patient</th>
                          <th className="p-4">Category</th>
                          <th className="p-4">Originating Hospital</th>
                          <th className="p-4">Date</th>
                          <th className="p-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {authorizedRecords.map((rec) => (
                          <tr key={rec.id} className="hover:bg-slate-50/70">
                            <td className="p-4">
                              <p className="font-semibold text-slate-900">{rec.title}</p>
                              <p className="text-xs font-mono text-slate-500">{rec.id}</p>
                            </td>
                            <td className="p-4">
                              <p className="font-medium text-slate-900">{rec.patientName}</p>
                              <p className="text-xs font-mono text-slate-500">{rec.patientId}</p>
                            </td>
                            <td className="p-4 text-slate-700">{rec.category}</td>
                            <td className="p-4 text-slate-700">{rec.facilityName}</td>
                            <td className="p-4 font-mono text-slate-600">{rec.recordDate}</td>
                            <td className="p-4 text-right space-x-2 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => handleAccessRecord(rec.id, 'view')}
                                className="px-2.5 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-50 rounded-md inline-flex items-center gap-1"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Inspect</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAccessRecord(rec.id, 'download')}
                                className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-md inline-flex items-center gap-1"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>Download</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB 5: AI MEDICAL SUMMARIES */}
            {activeTab === 'summaries' && (
              <div className="space-y-6">
                <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-semibold text-teal-700">
                        <Sparkles className="w-4 h-4" />
                        <span>Server-Side Gemini Clinical Summarization</span>
                      </div>
                      <h1 className="text-xl font-bold text-slate-900 mt-0.5">
                        AI-Assisted Medical Record Summarization
                      </h1>
                      <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                        Processes only patient-consented records to extract documented history,
                        diagnoses, medications, allergies, and source references.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      <select
                        aria-label="Select consented patient for AI summary"
                        value={selectedPatientForSummary}
                        onChange={(e) => setSelectedPatientForSummary(e.target.value)}
                        className="px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg bg-white"
                      >
                        <option value="">Select Authorized Patient</option>
                        {activeGrants.map((g) => (
                          <option key={g.id} value={g.patientId}>
                            {g.patientId} (Grant {g.id})
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        disabled={generatingSummary || !selectedPatientForSummary}
                        onClick={handleGenerateAISummary}
                        className="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-sky-700 rounded-lg hover:bg-sky-800 disabled:opacity-60 whitespace-nowrap"
                      >
                        {generatingSummary
                          ? 'Synthesizing Authorized Records...'
                          : 'Generate AI Summary'}
                      </button>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-amber-50/70 border border-amber-200 text-xs text-amber-900">
                    <strong>Clinical Disclaimer:</strong> This summary is AI-generated strictly from
                    consented source documents and is not a replacement for professional clinical
                    judgment. Verify all findings against the linked source documents before clinical
                    decision-making.
                  </div>
                </div>

                {summaries.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-2">
                    <FileSearch className="w-8 h-8 text-slate-400 mx-auto" />
                    <h2 className="text-base font-semibold text-slate-900">
                      No AI medical summaries generated yet
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
                      Select an authorized patient with an active consent grant above and click
                      &ldquo;Generate AI Summary&rdquo; to synthesize their clinical records.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {summaries.map((item) => (
                      <div
                        key={item.id}
                        className="bg-white border border-slate-200 rounded-xl p-6 space-y-5"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-4">
                          <div>
                            <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
                              <span>Summary ID: {item.id}</span>
                              <span>·</span>
                              <span>AI-Generated ({item.modelUsed})</span>
                              <span>·</span>
                              <span>Consent Grant: {item.consentGrantId}</span>
                            </div>
                            <h2 className="text-base font-bold text-slate-900 mt-1">
                              Patient: {item.patientName} ({item.patientId})
                            </h2>
                          </div>

                          <div className="text-xs font-semibold">
                            {item.doctorReviewStatus === 'reviewed_verified' ? (
                              <span className="text-emerald-700">
                                Verified by {item.reviewedByDoctorName}
                              </span>
                            ) : item.doctorReviewStatus === 'amended' ? (
                              <span className="text-sky-700">
                                Amended by {item.reviewedByDoctorName}
                              </span>
                            ) : (
                              <span className="text-amber-700">Pending Clinician Verification</span>
                            )}
                          </div>
                        </div>

                        {/* Overview */}
                        <div>
                          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                            1. Overview of Available Records
                          </h3>
                          <p className="text-sm text-slate-700 mt-1 leading-relaxed">
                            {item.summary.overview}
                          </p>
                        </div>

                        {/* Structured Clinical Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm">
                          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
                            <h4 className="font-bold text-slate-900">
                              2. Relevant Medical History
                            </h4>
                            <ul className="list-disc list-inside text-slate-700 space-y-1">
                              {item.summary.relevantMedicalHistory.map((h, i) => (
                                <li key={i}>{h}</li>
                              ))}
                            </ul>
                          </div>

                          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
                            <h4 className="font-bold text-slate-900">
                              3. Documented Diagnoses in Source
                            </h4>
                            <ul className="list-disc list-inside text-slate-700 space-y-1">
                              {item.summary.documentedDiagnoses.map((d, i) => (
                                <li key={i}>{d}</li>
                              ))}
                            </ul>
                          </div>

                          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
                            <h4 className="font-bold text-slate-900">
                              4. Current Medications Mentioned
                            </h4>
                            <ul className="list-disc list-inside text-slate-700 space-y-1">
                              {item.summary.currentMedications.map((m, i) => (
                                <li key={i}>{m}</li>
                              ))}
                            </ul>
                          </div>

                          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
                            <h4 className="font-bold text-slate-900">
                              5. Allergies Mentioned in Documents
                            </h4>
                            <ul className="list-disc list-inside text-slate-700 space-y-1">
                              {item.summary.allergies.map((a, i) => (
                                <li key={i}>{a}</li>
                              ))}
                            </ul>
                          </div>

                          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
                            <h4 className="font-bold text-slate-900">
                              6. Important Investigation Results
                            </h4>
                            <ul className="list-disc list-inside text-slate-700 space-y-1">
                              {item.summary.investigationResults.map((inv, i) => (
                                <li key={i}>{inv}</li>
                              ))}
                            </ul>
                          </div>

                          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
                            <h4 className="font-bold text-slate-900">
                              7. Relevant Dates & Missing/Unclear Information
                            </h4>
                            <p className="text-xs text-slate-600">
                              <strong>Key Dates:</strong> {item.summary.relevantDates.join(' · ')}
                            </p>
                            <p className="text-xs text-amber-800 mt-1">
                              <strong>Missing / Unclear:</strong>{' '}
                              {item.summary.missingOrUnclearInfo.join(' · ')}
                            </p>
                          </div>
                        </div>

                        {/* Source Document References */}
                        <div className="border-t border-slate-200 pt-3">
                          <h4 className="text-xs font-bold text-slate-900 mb-2">
                            8. Linked Source Document References
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {item.summary.sourceDocumentReferences.map((ref) => (
                              <button
                                key={ref.recordId}
                                type="button"
                                onClick={() => handleAccessRecord(ref.recordId, 'view')}
                                className="px-3 py-1.5 text-xs font-mono bg-slate-100 hover:bg-sky-50 text-sky-800 rounded-md border border-slate-200"
                              >
                                [{ref.recordId}] {ref.title} ({ref.facilityName}, {ref.recordDate})
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Doctor Clinical Review & Amendment Box */}
                        <div className="border-t border-slate-200 pt-4 space-y-3">
                          <label
                            htmlFor={`notes-${item.id}`}
                            className="block text-xs font-bold text-slate-800"
                          >
                            Physician Clinical Interpretation & Review Notes
                          </label>
                          <textarea
                            id={`notes-${item.id}`}
                            rows={2}
                            value={
                              reviewNotesMap[item.id] ?? item.doctorClinicalNotes ?? ''
                            }
                            onChange={(e) =>
                              setReviewNotesMap((prev) => ({
                                ...prev,
                                [item.id]: e.target.value,
                              }))
                            }
                            placeholder="Add clinical verification notes or corrections before clinical use..."
                            className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg"
                          />
                          <div className="flex items-center gap-2.5">
                            <button
                              type="button"
                              onClick={() =>
                                handleDoctorReviewSummary(item.id, 'reviewed_verified')
                              }
                              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800"
                            >
                              Verify & Approve Summary
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDoctorReviewSummary(item.id, 'amended')}
                              className="px-4 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                            >
                              Save with Clinical Amendments
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 6: ACCESS HISTORY */}
            {activeTab === 'history' && (
              <div className="space-y-6">
                <h1 className="text-xl font-bold text-slate-900">Doctor Access Audit History</h1>
                {auditLogs.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-xs text-slate-500">
                    No audit events recorded yet.
                  </div>
                ) : (
                  <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs sm:text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 font-semibold">
                          <th className="p-4">Timestamp</th>
                          <th className="p-4">Action</th>
                          <th className="p-4">Patient ID</th>
                          <th className="p-4">Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {auditLogs.map((l) => (
                          <tr key={l.id}>
                            <td className="p-4 font-mono text-xs text-slate-500">
                              {new Date(l.timestamp).toLocaleString()}
                            </td>
                            <td className="p-4 font-mono text-xs font-semibold">{l.actionType}</td>
                            <td className="p-4 font-mono text-xs">{l.targetPatientId || '—'}</td>
                            <td className="p-4 text-slate-600">{l.details}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB 7: SETTINGS */}
            {activeTab === 'settings' && profile && (
              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <h1 className="text-xl font-bold text-slate-900">Doctor Profile & Credentials</h1>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
                  <div>
                    <p className="text-slate-500">Full Name</p>
                    <p className="font-semibold text-slate-900">{profile.fullName}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Medical Registration Number</p>
                    <p className="font-mono font-semibold text-slate-900">
                      {profile.registrationNumber}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Specialization</p>
                    <p className="font-semibold text-slate-900">{profile.specialization}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Affiliated Hospital</p>
                    <p className="font-semibold text-slate-900">{profile.hospitalName}</p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* AUTHORIZED RECORD MODAL */}
      {viewingRecord && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <p className="text-xs font-mono text-emerald-700">
                  Authorized Clinical Record · {viewingRecord.id}
                </p>
                <h2 className="text-base font-bold text-slate-900">{viewingRecord.title}</h2>
              </div>
              <button
                type="button"
                onClick={() => setViewingRecord(null)}
                aria-label="Close record viewer"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="text-xs text-slate-600 space-y-1">
              <p>
                <strong>Patient:</strong> {viewingRecord.patientName} ({viewingRecord.patientId})
              </p>
              <p>
                <strong>Category:</strong> {viewingRecord.category} · <strong>Date:</strong>{' '}
                {viewingRecord.recordDate}
              </p>
              <p>
                <strong>Originating Facility:</strong> {viewingRecord.facilityName}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs sm:text-sm font-mono whitespace-pre-wrap max-h-64 overflow-y-auto">
              {viewingRecord.clinicalTextContent}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
