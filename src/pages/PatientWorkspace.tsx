import React, { useEffect, useState, useCallback } from 'react';
import {
  LayoutDashboard,
  UserCheck,
  FileText,
  Share2,
  ShieldCheck,
  Building2,
  History,
  Settings,
  LogOut,
  Upload,
  Search,
  Eye,
  Download,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Lock,
  X,
} from 'lucide-react';
import { apiRequest } from '../services/api';
import { RECORD_CATEGORIES } from '../utils/domainLogic';
import type {
  AppPage,
  AuditLog,
  ConsentGrant,
  Hospital,
  MedicalRecord,
  PatientProfile,
  RecordCategory,
  RecordSharingRequest,
  User,
} from '../types/models';

interface PatientWorkspaceProps {
  token: string;
  currentUser: User;
  activeSubPage: AppPage;
  onNavigate: (page: AppPage) => void;
  onLogout: () => void;
}

type PatientTab =
  | 'overview'
  | 'profile'
  | 'records'
  | 'requests'
  | 'consents'
  | 'hospitals'
  | 'history'
  | 'settings';

export const PatientWorkspace: React.FC<PatientWorkspaceProps> = ({
  token,
  currentUser,
  activeSubPage,
  onNavigate,
  onLogout,
}) => {
  const mapPageToTab = (p: AppPage): PatientTab => {
    switch (p) {
      case 'patient-profile':
        return 'profile';
      case 'patient-records':
        return 'records';
      case 'patient-requests':
        return 'requests';
      case 'patient-consents':
        return 'consents';
      case 'audit-logs':
        return 'history';
      case 'settings':
        return 'settings';
      default:
        return 'overview';
    }
  };

  const [activeTab, setActiveTab] = useState<PatientTab>(mapPageToTab(activeSubPage));
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [metrics, setMetrics] = useState({
    totalRecords: 0,
    pendingRequests: 0,
    activeConsents: 0,
    connectedHospitalsCount: 0,
  });
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [requests, setRequests] = useState<RecordSharingRequest[]>([]);
  const [consents, setConsents] = useState<ConsentGrant[]>([]);
  const [connectedHospitals, setConnectedHospitals] = useState<Hospital[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Record Filter & Upload Modal State
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [facilityFilter, setFacilityFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [viewingRecord, setViewingRecord] = useState<MedicalRecord | null>(null);

  // Upload form fields
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState<RecordCategory>('Prescriptions');
  const [uploadDate, setUploadDate] = useState(new Date().toISOString().slice(0, 10));
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadClinicalText, setUploadClinicalText] = useState('');
  const [uploadFileName, setUploadFileName] = useState('clinical_document.pdf');
  const [uploadFileSize, setUploadFileSize] = useState(145200);
  const [uploadVisibility, setUploadVisibility] = useState<
    'patient_and_authorized' | 'private_patient_only'
  >('patient_and_authorized');
  const [uploading, setUploading] = useState(false);

  // Profile Edit State
  const [editFullName, setEditFullName] = useState('');
  const [editMobile, setEditMobile] = useState('');
  const [editDob, setEditDob] = useState('');
  const [editGender, setEditGender] = useState('');
  const [editBlood, setEditBlood] = useState('');
  const [editEmergency, setEditEmergency] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editAbha, setEditAbha] = useState('');
  const [editAbhaAddress, setEditAbhaAddress] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Consent Review Modal State
  const [reviewingRequest, setReviewingRequest] = useState<RecordSharingRequest | null>(null);
  const [approvalDurationHours, setApprovalDurationHours] = useState(72);
  const [patientDecisionNotes, setPatientDecisionNotes] = useState('');

  useEffect(() => {
    setActiveTab(mapPageToTab(activeSubPage));
  }, [activeSubPage]);

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await apiRequest('/api/patient/overview', {}, token);
      setProfile(data.profile);
      setMetrics(data.metrics);
      setRecords(data.records || []);
      setRequests(data.requests || []);
      setConsents(data.consents || []);
      setConnectedHospitals(data.connectedHospitals || []);
      setAuditLogs(data.auditLogs || []);

      if (data.profile) {
        setEditFullName(data.profile.fullName || '');
        setEditMobile(data.profile.mobile || '');
        setEditDob(data.profile.dateOfBirth || '');
        setEditGender(data.profile.gender || '');
        setEditBlood(data.profile.bloodGroup || '');
        setEditEmergency(data.profile.emergencyContact || '');
        setEditAddress(data.profile.address || '');
        setEditAbha(data.profile.abhaNumber || '');
        setEditAbhaAddress(data.profile.abhaAddress || '');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Unable to load patient workspace.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const switchTab = (tab: PatientTab, page?: AppPage) => {
    setActiveTab(tab);
    setFeedbackMsg(null);
    setErrorMsg(null);
    if (page) onNavigate(page);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadFileName(file.name);
    setUploadFileSize(file.size);
    if (
      file.type.startsWith('text/') ||
      file.name.endsWith('.txt') ||
      file.name.endsWith('.json') ||
      file.name.endsWith('.csv')
    ) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setUploadClinicalText(reader.result.slice(0, 8000));
        }
      };
      reader.readAsText(file);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setFeedbackMsg(null);
    setUploading(true);
    try {
      await apiRequest(
        '/api/records/upload',
        {
          method: 'POST',
          body: JSON.stringify({
            title: uploadTitle,
            category: uploadCategory,
            recordDate: uploadDate,
            description: uploadDescription,
            clinicalTextContent: uploadClinicalText || uploadDescription,
            fileName: uploadFileName,
            fileMimeType: 'application/pdf',
            fileSizeBytes: uploadFileSize,
            visibility: uploadVisibility,
          }),
        },
        token
      );
      setShowUploadModal(false);
      setUploadTitle('');
      setUploadDescription('');
      setUploadClinicalText('');
      setFeedbackMsg('Medical record uploaded and encrypted in your record vault.');
      await fetchOverview();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to upload medical record.');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setErrorMsg(null);
    setFeedbackMsg(null);
    try {
      await apiRequest(
        '/api/patient/profile',
        {
          method: 'PUT',
          body: JSON.stringify({
            fullName: editFullName,
            mobile: editMobile,
            dateOfBirth: editDob,
            gender: editGender,
            bloodGroup: editBlood,
            emergencyContact: editEmergency,
            address: editAddress,
            abhaNumber: editAbha,
            abhaAddress: editAbhaAddress,
          }),
        },
        token
      );
      setFeedbackMsg('Patient profile and ABHA preferences updated.');
      await fetchOverview();
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleRequestDecision = async (
    requestId: string,
    decision: 'Approved' | 'Rejected'
  ) => {
    setErrorMsg(null);
    setFeedbackMsg(null);
    try {
      await apiRequest(
        `/api/patient/requests/${requestId}/decision`,
        {
          method: 'POST',
          body: JSON.stringify({
            decision,
            durationHours: approvalDurationHours,
            patientNotes: patientDecisionNotes,
          }),
        },
        token
      );
      setReviewingRequest(null);
      setPatientDecisionNotes('');
      setFeedbackMsg(
        decision === 'Approved'
          ? 'Sharing request approved. Active consent grant has been issued.'
          : 'Sharing request rejected. No records were disclosed.'
      );
      await fetchOverview();
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not process consent decision.');
    }
  };

  const handleRevokeConsent = async (consentId: string) => {
    setErrorMsg(null);
    setFeedbackMsg(null);
    try {
      await apiRequest(
        `/api/patient/consents/${consentId}/revoke`,
        {
          method: 'POST',
          body: JSON.stringify({ reason: 'Revoked directly by patient via Consent Management' }),
        },
        token
      );
      setFeedbackMsg('Consent revoked immediately. Further access to your records is blocked.');
      await fetchOverview();
    } catch (err: any) {
      setErrorMsg(err.message || 'Unable to revoke consent.');
    }
  };

  const handleViewOrDownloadRecord = async (recId: string, mode: 'view' | 'download') => {
    try {
      const res = await apiRequest<{ record: MedicalRecord }>(
        `/api/records/${recId}/access?mode=${mode}`,
        {},
        token
      );
      if (mode === 'view') {
        setViewingRecord(res.record);
      } else {
        const content =
          `HEALTHLINK ABHA — AUTHORIZED MEDICAL RECORD EXPORT\n` +
          `==================================================\n` +
          `Record ID: ${res.record.id}\n` +
          `Title: ${res.record.title}\n` +
          `Category: ${res.record.category}\n` +
          `Patient: ${res.record.patientName} (${res.record.patientId})\n` +
          `Healthcare Facility: ${res.record.facilityName}\n` +
          `Record Date: ${res.record.recordDate}\n` +
          `Description: ${res.record.description}\n\n` +
          `CLINICAL NOTES / CONTENT:\n${res.record.clinicalTextContent}\n`;
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${res.record.id}_${res.record.fileName.replace(/\.[^/.]+$/, '')}.txt`;
        a.click();
        URL.revokeObjectURL(url);
      }
      await fetchOverview();
    } catch (err: any) {
      setErrorMsg(err.message || 'Unable to access record.');
    }
  };

  const filteredRecords = records.filter((r) => {
    const matchesSearch =
      !searchQuery.trim() ||
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.facilityName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = categoryFilter === 'ALL' || r.category === categoryFilter;
    const matchesFac = facilityFilter === 'ALL' || r.facilityName === facilityFilter;
    const matchesDate = !dateFilter || r.recordDate === dateFilter;
    return matchesSearch && matchesCat && matchesFac && matchesDate;
  });

  const uniqueFacilities = Array.from(new Set(records.map((r) => r.facilityName)));

  const profileCompletionPct = (() => {
    if (!profile) return 0;
    let filled = 3; // fullName, email, dob
    if (profile.mobile) filled++;
    if (profile.bloodGroup) filled++;
    if (profile.gender) filled++;
    if (profile.address) filled++;
    if (profile.abhaNumber) filled++;
    return Math.round((filled / 8) * 100);
  })();

  return (
    <div className="min-h-[calc(100vh-65px)] bg-slate-50 flex flex-col lg:flex-row">
      {/* Sidebar Navigation */}
      <aside className="w-full lg:w-[272px] bg-white border-b lg:border-b-0 lg:border-r border-slate-200 shrink-0 flex flex-col justify-between p-4">
        <div className="space-y-4">
          <div className="px-3 py-2.5 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-xs font-medium text-slate-500">Patient Portal</p>
            <p className="text-sm font-bold text-slate-900 truncate">{currentUser.fullName}</p>
            <p className="text-xs font-mono text-sky-700 mt-0.5">
              {profile?.internalPatientId || 'Loading ID...'}
            </p>
          </div>

          <nav aria-label="Patient Sidebar Navigation" className="space-y-1">
            {(
              [
                { id: 'overview', label: 'Overview', icon: LayoutDashboard, page: 'patient-dashboard' },
                { id: 'profile', label: 'My Profile', icon: UserCheck, page: 'patient-profile' },
                { id: 'records', label: 'My Medical Records', icon: FileText, page: 'patient-records' },
                {
                  id: 'requests',
                  label: 'Sharing Requests',
                  icon: Share2,
                  page: 'patient-requests',
                  count: metrics.pendingRequests,
                },
                {
                  id: 'consents',
                  label: 'Consent Management',
                  icon: ShieldCheck,
                  page: 'patient-consents',
                },
                { id: 'hospitals', label: 'Connected Hospitals', icon: Building2 },
                { id: 'history', label: 'Access History', icon: History, page: 'audit-logs' },
                { id: 'settings', label: 'Settings', icon: Settings, page: 'settings' },
              ] as const
            ).map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => switchTab(item.id, item.page)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-sky-50 text-sky-800 font-semibold'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <span className="flex items-center gap-2.5 truncate">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </span>
                  {'count' in item && item.count ? (
                    <span className="text-xs font-mono font-bold text-amber-700 tabular-nums">
                      {item.count}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="pt-4 border-t border-slate-200 mt-4">
          <button
            type="button"
            onClick={onLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs sm:text-sm font-medium text-red-700 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 lg:p-8 max-w-6xl w-full mx-auto space-y-6">
        {errorMsg && (
          <div
            role="alert"
            className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm flex items-center justify-between"
          >
            <span>{errorMsg}</span>
            <button
              type="button"
              onClick={() => setErrorMsg(null)}
              aria-label="Dismiss error"
              className="text-red-700 hover:text-red-900"
            >
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
            <button
              type="button"
              onClick={() => setFeedbackMsg(null)}
              aria-label="Dismiss notification"
              className="text-emerald-700 hover:text-emerald-900"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {loading ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-sm text-slate-500">
            Loading your encrypted patient workspace...
          </div>
        ) : (
          <>
            {/* TAB 1: OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                      Patient Health Exchange Overview
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                      Internal Patient ID:{' '}
                      <span className="font-mono font-semibold text-slate-900">
                        {profile?.internalPatientId}
                      </span>{' '}
                      · Share this ID with your doctor when requesting record exchange.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => switchTab('requests', 'patient-requests')}
                      className="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-sky-700 rounded-lg hover:bg-sky-800 transition-colors whitespace-nowrap"
                    >
                      Review Sharing Requests ({metrics.pendingRequests})
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowUploadModal(true)}
                      className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5 whitespace-nowrap"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Upload Record</span>
                    </button>
                  </div>
                </div>

                {/* 4 Overview Metric Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white border border-slate-200 rounded-xl p-5">
                    <p className="text-xs font-medium text-slate-500">Total Medical Records</p>
                    <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
                      {metrics.totalRecords}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Stored in your encrypted vault
                    </p>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-5">
                    <p className="text-xs font-medium text-slate-500">Pending Sharing Requests</p>
                    <p className="text-2xl font-bold font-mono tabular-nums text-amber-700 mt-1">
                      {metrics.pendingRequests}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Awaiting your explicit consent
                    </p>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-5">
                    <p className="text-xs font-medium text-slate-500">Active Consents</p>
                    <p className="text-2xl font-bold font-mono tabular-nums text-emerald-700 mt-1">
                      {metrics.activeConsents}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Currently authorized disclosures
                    </p>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-5">
                    <p className="text-xs font-medium text-slate-500">Connected Hospitals</p>
                    <p className="text-2xl font-bold font-mono tabular-nums text-sky-700 mt-1">
                      {metrics.connectedHospitalsCount}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Participating healthcare facilities
                    </p>
                  </div>
                </div>

                {/* Profile Completion & ABHA Linking Status */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-bold text-slate-900">
                        Patient Profile & ABHA Linking Status
                      </h2>
                      <span className="text-xs font-mono text-sky-700 tabular-nums">
                        {profileCompletionPct}% Complete
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-sky-700"
                        style={{ width: `${profileCompletionPct}%` }}
                      />
                    </div>
                    <div className="pt-2 space-y-1.5 text-xs text-slate-600">
                      <p>
                        <strong className="text-slate-900">Internal Patient ID:</strong>{' '}
                        <span className="font-mono">{profile?.internalPatientId}</span>
                      </p>
                      <p>
                        <strong className="text-slate-900">ABHA Number:</strong>{' '}
                        {profile?.abhaNumber ? (
                          <span className="font-mono">{profile.abhaNumber}</span>
                        ) : (
                          <span>Not linked (using Internal Patient ID)</span>
                        )}
                      </p>
                      <p>
                        <strong className="text-slate-900">Verification Status:</strong>{' '}
                        {profile?.abhaStatus === 'verified' && (
                          <span className="text-emerald-700 font-medium">
                            Verified via ABDM Gateway
                          </span>
                        )}
                        {profile?.abhaStatus === 'unverified_pending_gateway' && (
                          <span className="text-amber-700 font-medium">
                            Unverified — Pending Authorized ABDM Gateway
                          </span>
                        )}
                        {profile?.abhaStatus === 'not_linked' && (
                          <span className="text-slate-500">No ABHA number linked</span>
                        )}
                      </p>
                    </div>
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => switchTab('profile', 'patient-profile')}
                        className="text-xs font-semibold text-sky-700 hover:underline"
                      >
                        Manage Profile & ABHA Identifier →
                      </button>
                    </div>
                  </div>

                  {/* Pending Consent Requests Panel */}
                  <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h2 className="text-sm font-bold text-slate-900">
                          Pending Consent Requests
                        </h2>
                        <span className="text-xs font-mono text-amber-700">
                          {metrics.pendingRequests} Pending
                        </span>
                      </div>

                      {requests.filter((r) => r.status === 'Pending').length === 0 ? (
                        <div className="py-6 text-center text-xs text-slate-500">
                          No pending record-sharing requests. When a doctor or hospital requests
                          your records, it will appear here for your explicit approval.
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {requests
                            .filter((r) => r.status === 'Pending')
                            .slice(0, 2)
                            .map((req) => (
                              <div
                                key={req.id}
                                className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between gap-4"
                              >
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-slate-900 truncate">
                                    {req.requesterName} · {req.requestingFacilityName}
                                  </p>
                                  <p className="text-xs text-slate-600 truncate mt-0.5">
                                    Purpose: {req.purpose}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReviewingRequest(req);
                                    switchTab('requests', 'patient-requests');
                                  }}
                                  className="px-3 py-1.5 text-xs font-semibold text-white bg-sky-700 rounded-lg hover:bg-sky-800 shrink-0"
                                >
                                  Review
                                </button>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-200 mt-4">
                      <button
                        type="button"
                        onClick={() => switchTab('requests', 'patient-requests')}
                        className="text-xs font-semibold text-sky-700 hover:underline"
                      >
                        Open All Sharing Requests →
                      </button>
                    </div>
                  </div>
                </div>

                {/* Recent Authorized Activity */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold text-slate-900">Recent Authorized Activity</h2>
                    <button
                      type="button"
                      onClick={() => switchTab('history', 'audit-logs')}
                      className="text-xs font-semibold text-sky-700 hover:underline"
                    >
                      View Complete Audit Log →
                    </button>
                  </div>

                  {auditLogs.length === 0 ? (
                    <p className="text-xs text-slate-500 py-4 text-center">
                      No activity recorded yet.
                    </p>
                  ) : (
                    <div className="divide-y divide-slate-200 text-xs">
                      {auditLogs.slice(0, 5).map((log) => (
                        <div
                          key={log.id}
                          className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                        >
                          <div className="space-y-0.5">
                            <span className="font-mono font-semibold text-slate-800">
                              {log.actionType}
                            </span>{' '}
                            <span className="text-slate-400">·</span>{' '}
                            <span className="text-slate-700">{log.details}</span>
                          </div>
                          <span className="font-mono text-slate-500 shrink-0">
                            {new Date(log.timestamp).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: MY PROFILE */}
            {activeTab === 'profile' && profile && (
              <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
                <div className="border-b border-slate-200 pb-4">
                  <h1 className="text-xl font-bold text-slate-900">
                    Patient Profile & ABHA Identification
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-600 mt-1">
                    Manage your personal demographic details and optional 14-digit ABHA identifier.
                  </p>
                </div>

                <form onSubmit={handleSaveProfile} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Internal Patient ID (System Assigned)
                      </label>
                      <input
                        type="text"
                        disabled
                        value={profile.internalPatientId}
                        className="w-full px-3 py-2 text-sm font-mono bg-slate-100 border border-slate-300 rounded-lg text-slate-700"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="prof-fullname"
                        className="block text-xs font-semibold text-slate-700 mb-1"
                      >
                        Full Name *
                      </label>
                      <input
                        id="prof-fullname"
                        type="text"
                        required
                        value={editFullName}
                        onChange={(e) => setEditFullName(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label
                        htmlFor="prof-dob"
                        className="block text-xs font-semibold text-slate-700 mb-1"
                      >
                        Date of Birth
                      </label>
                      <input
                        id="prof-dob"
                        type="date"
                        value={editDob}
                        onChange={(e) => setEditDob(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="prof-gender"
                        className="block text-xs font-semibold text-slate-700 mb-1"
                      >
                        Gender
                      </label>
                      <select
                        id="prof-gender"
                        value={editGender}
                        onChange={(e) => setEditGender(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                      >
                        <option value="">Select</option>
                        <option value="Female">Female</option>
                        <option value="Male">Male</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label
                        htmlFor="prof-blood"
                        className="block text-xs font-semibold text-slate-700 mb-1"
                      >
                        Blood Group
                      </label>
                      <select
                        id="prof-blood"
                        value={editBlood}
                        onChange={(e) => setEditBlood(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                      >
                        <option value="">Select</option>
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="prof-mobile"
                        className="block text-xs font-semibold text-slate-700 mb-1"
                      >
                        Mobile Number
                      </label>
                      <input
                        id="prof-mobile"
                        type="text"
                        value={editMobile}
                        onChange={(e) => setEditMobile(e.target.value)}
                        placeholder="+91 98XXXXXXXX"
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="prof-emergency"
                        className="block text-xs font-semibold text-slate-700 mb-1"
                      >
                        Emergency Contact
                      </label>
                      <input
                        id="prof-emergency"
                        type="text"
                        value={editEmergency}
                        onChange={(e) => setEditEmergency(e.target.value)}
                        placeholder="Name & Relationship / Phone"
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                    <h2 className="text-xs font-bold text-slate-900">
                      ABHA Identifier Linking (14-Digit Number)
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="prof-abha"
                          className="block text-xs font-semibold text-slate-700 mb-1"
                        >
                          14-Digit ABHA Number
                        </label>
                        <input
                          id="prof-abha"
                          type="text"
                          value={editAbha}
                          onChange={(e) => setEditAbha(e.target.value)}
                          placeholder="XX-XXXX-XXXX-XXXX"
                          className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="prof-abha-addr"
                          className="block text-xs font-semibold text-slate-700 mb-1"
                        >
                          ABHA Address (Optional)
                        </label>
                        <input
                          id="prof-abha-addr"
                          type="text"
                          value={editAbhaAddress}
                          onChange={(e) => setEditAbhaAddress(e.target.value)}
                          placeholder="username@abdm"
                          className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-slate-600">
                      Current ABHA Status:{' '}
                      {profile.abhaStatus === 'unverified_pending_gateway' ? (
                        <strong className="text-amber-700">
                          Unverified — Pending Authorized ABDM Gateway Verification
                        </strong>
                      ) : profile.abhaStatus === 'verified' ? (
                        <strong className="text-emerald-700">Verified</strong>
                      ) : (
                        <span>Not Linked</span>
                      )}
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="px-5 py-2.5 text-sm font-semibold text-white bg-sky-700 rounded-lg hover:bg-sky-800 disabled:opacity-60"
                  >
                    {savingProfile ? 'Saving Changes...' : 'Save Profile Changes'}
                  </button>
                </form>
              </div>
            )}

            {/* TAB 3: MY MEDICAL RECORDS */}
            {activeTab === 'records' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-xl font-bold text-slate-900">My Medical Records</h1>
                    <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                      Upload, organize, filter, and download your protected medical documents.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(true)}
                    className="px-4 py-2.5 text-xs sm:text-sm font-semibold text-white bg-sky-700 rounded-lg hover:bg-sky-800 flex items-center gap-2 w-fit"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Upload Medical Document</span>
                  </button>
                </div>

                {/* Search & Filters */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      aria-label="Search medical records"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search title or facility..."
                      className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg"
                    />
                  </div>
                  <select
                    aria-label="Filter by category"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="ALL">All Categories</option>
                    {RECORD_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label="Filter by healthcare facility"
                    value={facilityFilter}
                    onChange={(e) => setFacilityFilter(e.target.value)}
                    className="px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="ALL">All Healthcare Facilities</option>
                    {uniqueFacilities.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                  <input
                    type="date"
                    aria-label="Filter by record date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg"
                  />
                </div>

                {/* Records Table or Clean Empty State */}
                {filteredRecords.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-3">
                    <FileText className="w-8 h-8 text-slate-400 mx-auto" />
                    <h2 className="text-base font-semibold text-slate-900">
                      No medical records found
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
                      No patient records are currently stored matching your filter criteria. Upload
                      a prescription, lab report, or discharge summary to populate your vault.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowUploadModal(true)}
                      className="px-4 py-2 text-xs font-semibold text-white bg-sky-700 rounded-lg hover:bg-sky-800"
                    >
                      Upload First Medical Record
                    </button>
                  </div>
                ) : (
                  <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs sm:text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 font-semibold">
                          <th className="p-4">Record Title & ID</th>
                          <th className="p-4">Category</th>
                          <th className="p-4">Healthcare Facility</th>
                          <th className="p-4">Record Date</th>
                          <th className="p-4">Access Scope</th>
                          <th className="p-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {filteredRecords.map((rec) => (
                          <tr key={rec.id} className="hover:bg-slate-50/80">
                            <td className="p-4">
                              <p className="font-semibold text-slate-900">{rec.title}</p>
                              <p className="text-xs font-mono text-slate-500">
                                {rec.id} · {rec.fileName}
                              </p>
                            </td>
                            <td className="p-4 text-slate-700">{rec.category}</td>
                            <td className="p-4 text-slate-700">{rec.facilityName}</td>
                            <td className="p-4 font-mono text-slate-600">{rec.recordDate}</td>
                            <td className="p-4 text-xs">
                              {rec.visibility === 'private_patient_only' ? (
                                <span className="text-amber-700 font-medium">
                                  Private (Patient Only)
                                </span>
                              ) : (
                                <span className="text-emerald-700 font-medium">
                                  Consent-Eligible
                                </span>
                              )}
                            </td>
                            <td className="p-4 text-right space-x-2 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => handleViewOrDownloadRecord(rec.id, 'view')}
                                className="px-2.5 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-50 rounded-md inline-flex items-center gap-1"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>View</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleViewOrDownloadRecord(rec.id, 'download')}
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

            {/* TAB 4: SHARING REQUESTS */}
            {activeTab === 'requests' && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-xl font-bold text-slate-900">
                    Medical Record-Sharing Requests
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                    Review incoming requests from doctors and hospitals. No records are disclosed
                    unless you explicitly approve the request.
                  </p>
                </div>

                {requests.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-2">
                    <Share2 className="w-8 h-8 text-slate-400 mx-auto" />
                    <h2 className="text-base font-semibold text-slate-900">
                      No record-sharing requests
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
                      When an authorized doctor or hospital requests access to your medical history,
                      the request will appear here for your approval or rejection.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {requests.map((req) => (
                      <div
                        key={req.id}
                        className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                          <div>
                            <p className="text-sm font-bold text-slate-900">
                              {req.requesterName} · {req.requestingFacilityName}
                            </p>
                            <p className="text-xs font-mono text-slate-500">
                              Request ID: {req.id} · Submitted{' '}
                              {new Date(req.createdAt).toLocaleString()}
                            </p>
                          </div>

                          <div className="text-xs font-semibold">
                            {req.status === 'Pending' && (
                              <span className="text-amber-700 flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                Pending Patient Approval
                              </span>
                            )}
                            {req.status === 'Approved' && (
                              <span className="text-emerald-700 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Approved (Expires{' '}
                                {req.expiresAt
                                  ? new Date(req.expiresAt).toLocaleDateString()
                                  : 'N/A'}
                                )
                              </span>
                            )}
                            {req.status === 'Rejected' && (
                              <span className="text-red-700 flex items-center gap-1">
                                <XCircle className="w-3.5 h-3.5" />
                                Rejected
                              </span>
                            )}
                            {(req.status === 'Revoked' || req.status === 'Expired') && (
                              <span className="text-slate-600 flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                {req.status}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600">
                          <div>
                            <p className="font-semibold text-slate-900">Clinical Purpose</p>
                            <p className="mt-0.5">{req.purpose}</p>
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">Requested Categories</p>
                            <p className="mt-0.5">{req.requestedCategories.join(' · ')}</p>
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">Requested Duration</p>
                            <p className="mt-0.5 font-mono">
                              {req.requestedDurationHours} hours
                            </p>
                          </div>
                        </div>

                        {req.status === 'Pending' && (
                          <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <label
                                htmlFor={`dur-${req.id}`}
                                className="text-xs font-semibold text-slate-700"
                              >
                                Consent Duration:
                              </label>
                              <select
                                id={`dur-${req.id}`}
                                value={approvalDurationHours}
                                onChange={(e) => setApprovalDurationHours(Number(e.target.value))}
                                className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                              >
                                <option value={24}>24 Hours</option>
                                <option value={72}>72 Hours (3 Days)</option>
                                <option value={168}>7 Days</option>
                                <option value={720}>30 Days</option>
                              </select>
                            </div>

                            <div className="flex items-center gap-2.5">
                              <button
                                type="button"
                                onClick={() => handleRequestDecision(req.id, 'Rejected')}
                                className="px-4 py-2 text-xs font-semibold text-red-700 bg-white border border-red-300 rounded-lg hover:bg-red-50"
                              >
                                Reject Request
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRequestDecision(req.id, 'Approved')}
                                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800"
                              >
                                Approve & Grant Consent
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 5: CONSENT MANAGEMENT */}
            {activeTab === 'consents' && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-xl font-bold text-slate-900">Consent Management</h1>
                  <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                    Inspect all active, expired, and revoked consent grants. Revoking an active
                    consent immediately blocks backend record access.
                  </p>
                </div>

                {consents.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-2">
                    <ShieldCheck className="w-8 h-8 text-slate-400 mx-auto" />
                    <h2 className="text-base font-semibold text-slate-900">
                      No consent grants issued yet
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
                      You have not granted record access to any external doctor or hospital yet.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {consents.map((grant) => (
                      <div
                        key={grant.id}
                        className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 text-xs font-mono">
                            <span className="font-semibold text-slate-900">{grant.id}</span>
                            <span>·</span>
                            <span
                              className={
                                grant.status === 'Approved'
                                  ? 'text-emerald-700 font-semibold'
                                  : 'text-red-700 font-semibold'
                              }
                            >
                              {grant.status}
                            </span>
                          </div>
                          <p className="text-sm font-bold text-slate-900">
                            Authorized Grantee: {grant.granteeName} ({grant.granteeFacilityName})
                          </p>
                          <p className="text-xs text-slate-600">
                            Purpose: {grant.purpose} · Permitted Categories:{' '}
                            {grant.allowedCategories.join(', ')}
                          </p>
                          <p className="text-xs font-mono text-slate-500">
                            Granted: {new Date(grant.grantedAt).toLocaleString()} · Expires:{' '}
                            {new Date(grant.expiresAt).toLocaleString()}
                          </p>
                        </div>

                        {grant.status === 'Approved' && (
                          <button
                            type="button"
                            onClick={() => handleRevokeConsent(grant.id)}
                            className="px-4 py-2 text-xs font-semibold text-white bg-red-700 rounded-lg hover:bg-red-800 shrink-0"
                          >
                            Revoke Consent Immediately
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 6: CONNECTED HOSPITALS */}
            {activeTab === 'hospitals' && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-xl font-bold text-slate-900">Connected Hospitals</h1>
                  <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                    Healthcare facilities connected to your profile through uploaded records or
                    active consent grants.
                  </p>
                </div>

                {connectedHospitals.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-2">
                    <Building2 className="w-8 h-8 text-slate-400 mx-auto" />
                    <h2 className="text-base font-semibold text-slate-900">
                      No connected hospitals
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
                      No external healthcare facilities are currently linked to your patient record.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {connectedHospitals.map((h) => (
                      <div
                        key={h.id}
                        className="bg-white border border-slate-200 rounded-xl p-5 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-bold text-slate-900">{h.name}</h3>
                          <span className="text-xs font-mono text-emerald-700">
                            {h.verificationStatus}
                          </span>
                        </div>
                        <p className="text-xs font-mono text-slate-500">
                          Facility Code: {h.facilityCode} · {h.city}, {h.state}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 7: ACCESS HISTORY & AUDIT LOGS */}
            {activeTab === 'history' && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-xl font-bold text-slate-900">
                    Access History & Security Audit Trail
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                    Every view, download, upload, consent approval, revocation, and AI summary
                    involving your records is logged here.
                  </p>
                </div>

                {auditLogs.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-xs text-slate-500">
                    No access history events recorded yet.
                  </div>
                ) : (
                  <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs sm:text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 font-semibold">
                          <th className="p-4">Timestamp</th>
                          <th className="p-4">Event Type</th>
                          <th className="p-4">Actor & Role</th>
                          <th className="p-4">Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {auditLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-50/70">
                            <td className="p-4 font-mono text-xs text-slate-500 whitespace-nowrap">
                              {new Date(log.timestamp).toLocaleString()}
                            </td>
                            <td className="p-4 font-mono text-xs font-semibold text-slate-900">
                              {log.actionType}
                            </td>
                            <td className="p-4 text-slate-700">
                              {log.actorName} ({log.actorRole})
                            </td>
                            <td className="p-4 text-slate-600">{log.details}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB 8: SETTINGS */}
            {activeTab === 'settings' && (
              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <h1 className="text-xl font-bold text-slate-900">Account & Privacy Settings</h1>
                <p className="text-xs sm:text-sm text-slate-600">
                  Your account is protected with role-based access control and explicit consent
                  enforcement.
                </p>
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2 text-xs text-slate-700">
                  <p>
                    <strong>Default Consent Policy:</strong> Deny all external access unless an
                    explicit time-bounded Consent Grant is approved by you.
                  </p>
                  <p>
                    <strong>AI Summarization Policy:</strong> Only authorized records within an
                    active Consent Grant may be summarized by a reviewing doctor.
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* UPLOAD MEDICAL RECORD MODAL */}
      {showUploadModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="upload-modal-title"
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h2 id="upload-modal-title" className="text-base font-bold text-slate-900">
                Upload Medical Record to Vault
              </h2>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                aria-label="Close upload modal"
                className="text-slate-500 hover:text-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="up-title"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Record Title *
                </label>
                <input
                  id="up-title"
                  type="text"
                  required
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="e.g., Complete Blood Count & Lipid Profile"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="up-category"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Record Category *
                  </label>
                  <select
                    id="up-category"
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value as RecordCategory)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    {RECORD_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="up-date"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Record Date *
                  </label>
                  <input
                    id="up-date"
                    type="date"
                    required
                    value={uploadDate}
                    onChange={(e) => setUploadDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="up-desc"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Document Summary / Description *
                </label>
                <input
                  id="up-desc"
                  type="text"
                  required
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  placeholder="Brief summary of clinical context"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label
                  htmlFor="up-clinical-text"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Clinical Findings / Text Content (Used for Authorized View & AI Summary) *
                </label>
                <textarea
                  id="up-clinical-text"
                  rows={4}
                  required
                  value={uploadClinicalText}
                  onChange={(e) => setUploadClinicalText(e.target.value)}
                  placeholder="Enter documented diagnoses, medications, dosages, allergies, or test values from the report..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="up-file"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Attach Document File (PDF/TXT/JPG, max 10MB)
                  </label>
                  <input
                    id="up-file"
                    type="file"
                    accept=".pdf,.txt,.json,.csv,.png,.jpg,.jpeg,.xml"
                    onChange={handleFileInputChange}
                    className="w-full text-xs text-slate-600"
                  />
                </div>

                <div>
                  <label
                    htmlFor="up-vis"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Sharing Eligibility
                  </label>
                  <select
                    id="up-vis"
                    value={uploadVisibility}
                    onChange={(e) =>
                      setUploadVisibility(
                        e.target.value as 'patient_and_authorized' | 'private_patient_only'
                      )
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="patient_and_authorized">
                      Disclosable with My Explicit Consent
                    </option>
                    <option value="private_patient_only">Private (Never Share Externally)</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-4 py-2 text-xs font-semibold text-white bg-sky-700 rounded-lg hover:bg-sky-800 disabled:opacity-60"
                >
                  {uploading ? 'Encrypting & Uploading...' : 'Upload Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW RECORD MODAL */}
      {viewingRecord && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
        >
          <div className="bg-white border border-slate-200 rounded-xl max-w-xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <p className="text-xs font-mono text-sky-700">{viewingRecord.id}</p>
                <h2 className="text-base font-bold text-slate-900">{viewingRecord.title}</h2>
              </div>
              <button
                type="button"
                onClick={() => setViewingRecord(null)}
                aria-label="Close document viewer"
                className="text-slate-500 hover:text-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="text-xs text-slate-600 space-y-1">
              <p>
                <strong>Category:</strong> {viewingRecord.category} ·{' '}
                <strong>Record Date:</strong> {viewingRecord.recordDate}
              </p>
              <p>
                <strong>Facility:</strong> {viewingRecord.facilityName} ·{' '}
                <strong>Storage Reference:</strong>{' '}
                <span className="font-mono">{viewingRecord.storageReference}</span>
              </p>
              <p>
                <strong>Description:</strong> {viewingRecord.description}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-800 whitespace-pre-wrap font-mono max-h-64 overflow-y-auto">
              {viewingRecord.clinicalTextContent}
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => handleViewOrDownloadRecord(viewingRecord.id, 'download')}
                className="px-4 py-2 text-xs font-semibold text-white bg-sky-700 rounded-lg hover:bg-sky-800 flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Authorized Copy</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
