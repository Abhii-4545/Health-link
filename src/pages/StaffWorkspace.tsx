import React, { useEffect, useState, useCallback } from 'react';
import {
  Building2,
  UserPlus,
  Upload,
  Share2,
  History,
  LogOut,
  FileText,
  CheckCircle2,
  X,
} from 'lucide-react';
import { apiRequest } from '../services/api';
import { RECORD_CATEGORIES } from '../utils/domainLogic';
import type {
  AppPage,
  AuditLog,
  Hospital,
  HospitalStaffAffiliation,
  MedicalRecord,
  PatientProfile,
  RecordCategory,
  RecordSharingRequest,
  User,
} from '../types/models';

interface StaffWorkspaceProps {
  token: string;
  currentUser: User;
  activeSubPage: AppPage;
  onNavigate: (page: AppPage) => void;
  onLogout: () => void;
}

type StaffTab =
  | 'overview'
  | 'register-patient'
  | 'upload-records'
  | 'requests'
  | 'facilities'
  | 'audit';

export const StaffWorkspace: React.FC<StaffWorkspaceProps> = ({
  token,
  currentUser,
  activeSubPage,
  onNavigate,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<StaffTab>(
    activeSubPage === 'hospital-management' ? 'facilities' : 'overview'
  );
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const [affiliation, setAffiliation] = useState<HospitalStaffAffiliation | null>(null);
  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [registeredPatients, setRegisteredPatients] = useState<PatientProfile[]>([]);
  const [facilityRecords, setFacilityRecords] = useState<MedicalRecord[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<RecordSharingRequest[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<RecordSharingRequest[]>([]);
  const [connectedHospitals, setConnectedHospitals] = useState<Hospital[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Walk-in Patient Registration Form
  const [patName, setPatName] = useState('');
  const [patEmail, setPatEmail] = useState('');
  const [patMobile, setPatMobile] = useState('');
  const [patDob, setPatDob] = useState('');
  const [patGender, setPatGender] = useState('');
  const [patBlood, setPatBlood] = useState('');
  const [patAbha, setPatAbha] = useState('');
  const [patPassword, setPatPassword] = useState('');
  const [registeringPat, setRegisteringPat] = useState(false);

  // Record Upload Form
  const [recPatientId, setRecPatientId] = useState('');
  const [recTitle, setRecTitle] = useState('');
  const [recCategory, setRecCategory] = useState<RecordCategory>('Prescriptions');
  const [recDate, setRecDate] = useState(new Date().toISOString().slice(0, 10));
  const [recDesc, setRecDesc] = useState('');
  const [recClinicalText, setRecClinicalText] = useState('');
  const [recFileName, setRecFileName] = useState('hospital_report.pdf');
  const [recFileSize, setRecFileSize] = useState(128400);
  const [uploadingRec, setUploadingRec] = useState(false);

  // Outgoing Inter-Hospital Request Form
  const [reqPatientId, setReqPatientId] = useState('');
  const [reqPurpose, setReqPurpose] = useState('');
  const [submittingReq, setSubmittingReq] = useState(false);

  const fetchStaffOverview = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await apiRequest('/api/staff/overview', {}, token);
      setAffiliation(data.affiliation);
      setHospital(data.hospital);
      setRegisteredPatients(data.registeredPatients || []);
      setFacilityRecords(data.facilityRecords || []);
      setOutgoingRequests(data.outgoingRequests || []);
      setIncomingRequests(data.incomingRequests || []);
      setConnectedHospitals(data.connectedHospitals || []);
      setAuditLogs(data.auditLogs || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Unable to load hospital staff workspace.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchStaffOverview();
  }, [fetchStaffOverview]);

  const handleRegisterPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setFeedbackMsg(null);
    setRegisteringPat(true);
    try {
      const res = await apiRequest<{ patientProfile: PatientProfile }>(
        '/api/staff/register-patient',
        {
          method: 'POST',
          body: JSON.stringify({
            fullName: patName,
            email: patEmail,
            mobile: patMobile,
            dateOfBirth: patDob,
            gender: patGender,
            bloodGroup: patBlood,
            abhaNumber: patAbha,
            tempPassword: patPassword,
          }),
        },
        token
      );
      setFeedbackMsg(
        `Registered patient ${res.patientProfile.fullName}. Generated Internal Patient ID: ${res.patientProfile.internalPatientId}`
      );
      setRecPatientId(res.patientProfile.internalPatientId);
      setPatName('');
      setPatEmail('');
      setPatMobile('');
      setPatDob('');
      setPatAbha('');
      setPatPassword('');
      await fetchStaffOverview();
    } catch (err: any) {
      setErrorMsg(err.message || 'Patient registration failed.');
    } finally {
      setRegisteringPat(false);
    }
  };

  const handleUploadRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setFeedbackMsg(null);
    setUploadingRec(true);
    try {
      await apiRequest(
        '/api/records/upload',
        {
          method: 'POST',
          body: JSON.stringify({
            patientId: recPatientId,
            title: recTitle,
            category: recCategory,
            recordDate: recDate,
            description: recDesc,
            clinicalTextContent: recClinicalText || recDesc,
            fileName: recFileName,
            fileMimeType: 'application/pdf',
            fileSizeBytes: recFileSize,
          }),
        },
        token
      );
      setFeedbackMsg(`Uploaded "${recTitle}" (${recCategory}) for patient ${recPatientId}.`);
      setRecTitle('');
      setRecDesc('');
      setRecClinicalText('');
      await fetchStaffOverview();
    } catch (err: any) {
      setErrorMsg(err.message || 'Record upload failed.');
    } finally {
      setUploadingRec(false);
    }
  };

  const handleCreateOutgoingRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setFeedbackMsg(null);
    setSubmittingReq(true);
    try {
      await apiRequest(
        '/api/consents/request',
        {
          method: 'POST',
          body: JSON.stringify({
            patientId: reqPatientId,
            purpose: reqPurpose,
            requestedCategories: RECORD_CATEGORIES,
            requestedDurationHours: 72,
          }),
        },
        token
      );
      setFeedbackMsg(`Submitted inter-hospital record request for patient ${reqPatientId}.`);
      setReqPatientId('');
      setReqPurpose('');
      await fetchStaffOverview();
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not submit request.');
    } finally {
      setSubmittingReq(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-65px)] bg-slate-50 flex flex-col lg:flex-row">
      {/* Sidebar */}
      <aside className="w-full lg:w-64 bg-white border-b lg:border-b-0 lg:border-r border-slate-200 shrink-0 flex flex-col justify-between p-4">
        <div className="space-y-4">
          <div className="px-3 py-2.5 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-xs font-medium text-teal-800">Hospital Staff Portal</p>
            <p className="text-sm font-bold text-slate-900 truncate">{currentUser.fullName}</p>
            <p className="text-xs text-slate-500 truncate mt-0.5">
              {affiliation?.hospitalName} · {affiliation?.requestedRole}
            </p>
          </div>

          <nav aria-label="Hospital Staff Sidebar Navigation" className="space-y-1">
            {(
              [
                { id: 'overview', label: 'Hospital Overview', icon: Building2, page: 'staff-dashboard' },
                { id: 'register-patient', label: 'Patient Registration & ID', icon: UserPlus },
                { id: 'upload-records', label: 'Medical Record Upload', icon: Upload },
                { id: 'requests', label: 'Incoming & Outgoing Requests', icon: Share2 },
                {
                  id: 'facilities',
                  label: 'Connected Facilities',
                  icon: CheckCircle2,
                  page: 'hospital-management',
                },
                { id: 'audit', label: 'Audit History', icon: History, page: 'audit-logs' },
              ] as const
            ).map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.id);
                    setErrorMsg(null);
                    setFeedbackMsg(null);
                    if ('page' in item && item.page) onNavigate(item.page);
                  }}
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
            Loading hospital staff workspace...
          </div>
        ) : (
          <>
            {/* OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-mono text-teal-700">
                      <span>Facility Code: {hospital?.facilityCode}</span>
                      <span>·</span>
                      <span>Status: {hospital?.verificationStatus}</span>
                    </div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
                      {hospital?.name} — Health Information Desk
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                      Staff Officer: {affiliation?.fullName} ({affiliation?.requestedRole})
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setActiveTab('register-patient')}
                      className="px-4 py-2 text-xs font-semibold text-white bg-sky-700 rounded-lg hover:bg-sky-800"
                    >
                      Register Patient
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('upload-records')}
                      className="px-4 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                    >
                      Upload Medical Record
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="bg-white border border-slate-200 rounded-xl p-5">
                    <p className="text-xs font-medium text-slate-500">Registered Patients</p>
                    <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
                      {registeredPatients.length}
                    </p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-5">
                    <p className="text-xs font-medium text-slate-500">Uploaded Facility Records</p>
                    <p className="text-2xl font-bold font-mono tabular-nums text-sky-700 mt-1">
                      {facilityRecords.length}
                    </p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-5">
                    <p className="text-xs font-medium text-slate-500">Outgoing Requests</p>
                    <p className="text-2xl font-bold font-mono tabular-nums text-amber-700 mt-1">
                      {outgoingRequests.length}
                    </p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-5">
                    <p className="text-xs font-medium text-slate-500">Connected Facilities</p>
                    <p className="text-2xl font-bold font-mono tabular-nums text-emerald-700 mt-1">
                      {connectedHospitals.length}
                    </p>
                  </div>
                </div>

                {/* Facility Records List */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                  <h2 className="text-sm font-bold text-slate-900">
                    Medical Documents Uploaded by {hospital?.name}
                  </h2>
                  {facilityRecords.length === 0 ? (
                    <p className="text-xs text-slate-500 py-6 text-center">
                      No medical records found for this facility yet.
                    </p>
                  ) : (
                    <div className="divide-y divide-slate-200 text-xs sm:text-sm">
                      {facilityRecords.map((r) => (
                        <div key={r.id} className="py-3 flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-slate-900">
                              {r.title} · <span className="font-mono">{r.patientId}</span> (
                              {r.patientName})
                            </p>
                            <p className="text-xs text-slate-500">
                              {r.category} · Date: {r.recordDate} · Ref: {r.storageReference}
                            </p>
                          </div>
                          <span className="text-xs font-mono text-emerald-700">Encrypted</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* PATIENT REGISTRATION & INTERNAL ID GENERATION */}
            {activeTab === 'register-patient' && (
              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
                <div>
                  <h1 className="text-xl font-bold text-slate-900">
                    Walk-In Patient Registration & Internal ID Generation
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                    Generates a unique Internal Patient ID (<span className="font-mono">HL-PAT-2026-XXXXXX</span>) and optionally links a 14-digit ABHA number.
                  </p>
                </div>

                <form onSubmit={handleRegisterPatient} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="st-pat-name"
                        className="block text-xs font-semibold text-slate-700 mb-1"
                      >
                        Patient Full Name *
                      </label>
                      <input
                        id="st-pat-name"
                        type="text"
                        required
                        value={patName}
                        onChange={(e) => setPatName(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="st-pat-email"
                        className="block text-xs font-semibold text-slate-700 mb-1"
                      >
                        Patient Email or Mobile Identifier *
                      </label>
                      <input
                        id="st-pat-email"
                        type="text"
                        required
                        value={patEmail}
                        onChange={(e) => setPatEmail(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label
                        htmlFor="st-pat-dob"
                        className="block text-xs font-semibold text-slate-700 mb-1"
                      >
                        Date of Birth *
                      </label>
                      <input
                        id="st-pat-dob"
                        type="date"
                        required
                        value={patDob}
                        onChange={(e) => setPatDob(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="st-pat-abha"
                        className="block text-xs font-semibold text-slate-700 mb-1"
                      >
                        14-Digit ABHA Number (Optional)
                      </label>
                      <input
                        id="st-pat-abha"
                        type="text"
                        value={patAbha}
                        onChange={(e) => setPatAbha(e.target.value)}
                        placeholder="XX-XXXX-XXXX-XXXX"
                        className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="st-pat-pass"
                        className="block text-xs font-semibold text-slate-700 mb-1"
                      >
                        Initial Patient Portal Password *
                      </label>
                      <input
                        id="st-pat-pass"
                        type="password"
                        required
                        value={patPassword}
                        onChange={(e) => setPatPassword(e.target.value)}
                        placeholder="Min 8 characters"
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={registeringPat}
                    className="px-5 py-2.5 text-sm font-semibold text-white bg-sky-700 rounded-lg hover:bg-sky-800 disabled:opacity-60"
                  >
                    {registeringPat
                      ? 'Generating ID...'
                      : 'Register Patient & Generate Internal ID'}
                  </button>
                </form>

                {registeredPatients.length > 0 && (
                  <div className="pt-4 border-t border-slate-200 space-y-2">
                    <h2 className="text-xs font-bold text-slate-800">
                      Patients Registered at {hospital?.name}
                    </h2>
                    <div className="divide-y divide-slate-200 text-xs">
                      {registeredPatients.map((p) => (
                        <div key={p.internalPatientId} className="py-2 flex justify-between">
                          <span>
                            <strong>{p.fullName}</strong> ({p.email})
                          </span>
                          <span className="font-mono font-semibold text-sky-700">
                            {p.internalPatientId}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* MEDICAL RECORD UPLOAD */}
            {activeTab === 'upload-records' && (
              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
                <div>
                  <h1 className="text-xl font-bold text-slate-900">
                    Hospital Medical Record Upload & Organization
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                    Organize records by Prescriptions, Laboratory reports, Discharge summaries,
                    Consultation notes, Diagnostic reports, or Other medical documents.
                  </p>
                </div>

                <form onSubmit={handleUploadRecord} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label
                        htmlFor="st-rec-patid"
                        className="block text-xs font-semibold text-slate-700 mb-1"
                      >
                        Internal Patient ID *
                      </label>
                      <input
                        id="st-rec-patid"
                        type="text"
                        required
                        value={recPatientId}
                        onChange={(e) => setRecPatientId(e.target.value)}
                        placeholder="HL-PAT-2026-XXXXXX"
                        className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="st-rec-cat"
                        className="block text-xs font-semibold text-slate-700 mb-1"
                      >
                        Category *
                      </label>
                      <select
                        id="st-rec-cat"
                        value={recCategory}
                        onChange={(e) => setRecCategory(e.target.value as RecordCategory)}
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
                        htmlFor="st-rec-date"
                        className="block text-xs font-semibold text-slate-700 mb-1"
                      >
                        Record Date *
                      </label>
                      <input
                        id="st-rec-date"
                        type="date"
                        required
                        value={recDate}
                        onChange={(e) => setRecDate(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="st-rec-title"
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      Document Title *
                    </label>
                    <input
                      id="st-rec-title"
                      type="text"
                      required
                      value={recTitle}
                      onChange={(e) => setRecTitle(e.target.value)}
                      placeholder="e.g., Cardiology Discharge Summary & Medication Plan"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="st-rec-desc"
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      Document Description *
                    </label>
                    <input
                      id="st-rec-desc"
                      type="text"
                      required
                      value={recDesc}
                      onChange={(e) => setRecDesc(e.target.value)}
                      placeholder="Summary of clinical encounter"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="st-rec-text"
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      Structured Clinical Content (Diagnoses, Medications, Lab Values, Allergies) *
                    </label>
                    <textarea
                      id="st-rec-text"
                      rows={4}
                      required
                      value={recClinicalText}
                      onChange={(e) => setRecClinicalText(e.target.value)}
                      placeholder="Enter structured clinical report text..."
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={uploadingRec}
                    className="px-5 py-2.5 text-sm font-semibold text-white bg-sky-700 rounded-lg hover:bg-sky-800 disabled:opacity-60"
                  >
                    {uploadingRec ? 'Uploading...' : 'Encrypt & Store Medical Record'}
                  </button>
                </form>
              </div>
            )}

            {/* INCOMING & OUTGOING REQUESTS */}
            {activeTab === 'requests' && (
              <div className="space-y-6">
                <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                  <h2 className="text-base font-bold text-slate-900">
                    Initiate Outgoing Inter-Hospital Record Request
                  </h2>
                  <form
                    onSubmit={handleCreateOutgoingRequest}
                    className="grid grid-cols-1 sm:grid-cols-3 gap-3"
                  >
                    <input
                      type="text"
                      required
                      value={reqPatientId}
                      onChange={(e) => setReqPatientId(e.target.value)}
                      placeholder="HL-PAT-2026-XXXXXX"
                      className="px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                    />
                    <input
                      type="text"
                      required
                      value={reqPurpose}
                      onChange={(e) => setReqPurpose(e.target.value)}
                      placeholder="Clinical reason for external record retrieval"
                      className="px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                    <button
                      type="submit"
                      disabled={submittingReq}
                      className="px-4 py-2 text-sm font-semibold text-white bg-sky-700 rounded-lg hover:bg-sky-800"
                    >
                      Request Patient Consent
                    </button>
                  </form>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
                    <h3 className="text-sm font-bold text-slate-900">
                      Outgoing Requests from {hospital?.name}
                    </h3>
                    {outgoingRequests.length === 0 ? (
                      <p className="text-xs text-slate-500">No outgoing requests.</p>
                    ) : (
                      <div className="divide-y divide-slate-200 text-xs">
                        {outgoingRequests.map((r) => (
                          <div key={r.id} className="py-2.5 flex justify-between">
                            <span>
                              {r.patientName} ({r.patientId}) — {r.purpose}
                            </span>
                            <span className="font-semibold">{r.status}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
                    <h3 className="text-sm font-bold text-slate-900">
                      Incoming Requests for Facility Records
                    </h3>
                    {incomingRequests.length === 0 ? (
                      <p className="text-xs text-slate-500">No incoming requests.</p>
                    ) : (
                      <div className="divide-y divide-slate-200 text-xs">
                        {incomingRequests.map((r) => (
                          <div key={r.id} className="py-2.5 flex justify-between">
                            <span>
                              {r.requestingFacilityName} → {r.patientId}
                            </span>
                            <span className="font-semibold">{r.status}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* CONNECTED FACILITIES */}
            {activeTab === 'facilities' && (
              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <h1 className="text-xl font-bold text-slate-900">
                  Connected Healthcare Facilities Directory
                </h1>
                {connectedHospitals.length === 0 ? (
                  <p className="text-xs text-slate-500">No connected hospitals registered.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {connectedHospitals.map((h) => (
                      <div
                        key={h.id}
                        className="p-4 rounded-lg border border-slate-200 space-y-1 text-xs"
                      >
                        <p className="text-sm font-bold text-slate-900">{h.name}</p>
                        <p className="font-mono text-slate-500">
                          Code: {h.facilityCode} · Status: {h.verificationStatus}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* AUDIT HISTORY */}
            {activeTab === 'audit' && (
              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <h1 className="text-xl font-bold text-slate-900">Facility Audit History</h1>
                {auditLogs.length === 0 ? (
                  <p className="text-xs text-slate-500">No audit events recorded yet.</p>
                ) : (
                  <div className="divide-y divide-slate-200 text-xs">
                    {auditLogs.map((l) => (
                      <div key={l.id} className="py-2.5 flex justify-between gap-4">
                        <span>
                          <strong className="font-mono">{l.actionType}</strong> · {l.details}
                        </span>
                        <span className="font-mono text-slate-500 shrink-0">
                          {new Date(l.timestamp).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};
