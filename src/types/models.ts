export type UserRole = 'patient' | 'doctor' | 'staff' | 'admin';

export type AccountStatus = 'active' | 'pending_verification' | 'suspended';

export type ABHAStatus = 'not_linked' | 'unverified_pending_gateway' | 'verified';

export type RecordCategory =
  | 'Prescriptions'
  | 'Laboratory reports'
  | 'Discharge summaries'
  | 'Consultation notes'
  | 'Diagnostic reports'
  | 'Other medical documents';

export type ConsentStatus = 'Pending' | 'Approved' | 'Rejected' | 'Expired' | 'Revoked';

export interface User {
  id: string;
  fullName: string;
  email: string;
  mobile?: string;
  role: UserRole;
  accountStatus: AccountStatus;
  createdAt: string;
  lastLoginAt?: string;
}

export interface PatientProfile {
  userId: string;
  internalPatientId: string; // e.g., HL-PAT-2026-841920
  fullName: string;
  email: string;
  mobile?: string;
  dateOfBirth?: string;
  bloodGroup?: string;
  gender?: string;
  emergencyContact?: string;
  address?: string;
  abhaNumber?: string; // 14-digit format XX-XXXX-XXXX-XXXX
  abhaAddress?: string; // e.g., username@abdm
  abhaStatus: ABHAStatus;
  registeredByHospitalId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DoctorProfile {
  userId: string;
  fullName: string;
  email: string;
  registrationNumber: string;
  specialization: string;
  hospitalId: string;
  hospitalName: string;
  verificationStatus: 'verified' | 'pending_review';
  createdAt: string;
}

export interface Hospital {
  id: string;
  name: string;
  facilityCode: string; // e.g., HFR-IN-10293
  city: string;
  state: string;
  contactEmail: string;
  verificationStatus: 'verified' | 'pending_review' | 'suspended';
  integrationSupported: boolean;
  createdAt: string;
}

export interface HospitalStaffAffiliation {
  userId: string;
  fullName: string;
  email: string;
  hospitalId: string;
  hospitalName: string;
  requestedRole: string; // e.g., Medical Records Officer, Front Desk Coordinator, Lab Technician
  status: 'active' | 'pending_approval';
  createdAt: string;
}

export interface MedicalRecord {
  id: string;
  title: string;
  category: RecordCategory;
  patientId: string; // internalPatientId
  patientUserId: string;
  patientName: string;
  facilityId: string;
  facilityName: string;
  recordDate: string;
  uploadDate: string;
  description: string;
  clinicalTextContent: string; // Extracted or entered structured clinical content for viewing & AI summary
  fileName: string;
  fileMimeType: string;
  fileSizeBytes: number;
  storageReference: string;
  uploadedByUserId: string;
  uploadedByRole: UserRole;
  visibility: 'patient_and_authorized' | 'private_patient_only';
}

export interface RecordSharingRequest {
  id: string;
  patientId: string; // internalPatientId
  patientUserId: string;
  patientName: string;
  requesterUserId: string;
  requesterName: string;
  requesterRole: 'doctor' | 'staff';
  requestingFacilityId: string;
  requestingFacilityName: string;
  purpose: string;
  requestedCategories: RecordCategory[];
  specificRecordIds?: string[]; // empty means all matching categories
  requestedDurationHours: number;
  status: ConsentStatus;
  createdAt: string;
  respondedAt?: string;
  expiresAt?: string;
  revokedAt?: string;
  patientNotes?: string;
}

export interface ConsentGrant {
  id: string;
  requestId: string;
  patientId: string;
  patientUserId: string;
  granteeUserId: string;
  granteeName: string;
  granteeFacilityId: string;
  granteeFacilityName: string;
  purpose: string;
  allowedCategories: RecordCategory[];
  allowedRecordIds: string[];
  status: ConsentStatus;
  grantedAt: string;
  expiresAt: string;
  revokedAt?: string;
  revocationReason?: string;
}

export interface AISummaryStructured {
  overview: string;
  relevantMedicalHistory: string[];
  documentedDiagnoses: string[];
  currentMedications: string[];
  allergies: string[];
  investigationResults: string[];
  relevantDates: string[];
  missingOrUnclearInfo: string[];
  sourceDocumentReferences: { recordId: string; title: string; facilityName: string; recordDate: string }[];
}

export interface AIGeneratedSummary {
  id: string;
  patientId: string;
  patientName: string;
  generatedForUserId: string;
  generatedForName: string;
  consentGrantId: string;
  sourceRecordIds: string[];
  summary: AISummaryStructured;
  modelUsed: string;
  doctorReviewStatus: 'pending_review' | 'reviewed_verified' | 'amended';
  doctorClinicalNotes?: string;
  reviewedByDoctorName?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actorUserId: string;
  actorName: string;
  actorRole: UserRole | 'system';
  actionType:
    | 'USER_REGISTERED'
    | 'USER_LOGIN'
    | 'USER_LOGOUT'
    | 'PASSWORD_RESET'
    | 'ABHA_LINK_ATTEMPT'
    | 'RECORD_UPLOADED'
    | 'RECORD_VIEWED'
    | 'RECORD_DOWNLOADED'
    | 'SHARING_REQUEST_CREATED'
    | 'CONSENT_APPROVED'
    | 'CONSENT_REJECTED'
    | 'CONSENT_REVOKED'
    | 'AI_SUMMARY_GENERATED'
    | 'AI_SUMMARY_REVIEWED'
    | 'HOSPITAL_VERIFIED'
    | 'ACCOUNT_STATUS_CHANGED';
  targetPatientId?: string;
  targetResourceId?: string;
  facilityName?: string;
  severity: 'info' | 'warning' | 'security';
  details: string;
}

export type AppPage =
  | 'landing'
  | 'signin'
  | 'signup'
  | 'forgot-password'
  | 'patient-dashboard'
  | 'patient-profile'
  | 'patient-records'
  | 'patient-consents'
  | 'patient-requests'
  | 'doctor-dashboard'
  | 'doctor-search'
  | 'doctor-records'
  | 'doctor-summaries'
  | 'staff-dashboard'
  | 'hospital-management'
  | 'admin-dashboard'
  | 'audit-logs'
  | 'settings'
  | 'privacy-policy'
  | 'about-project';
