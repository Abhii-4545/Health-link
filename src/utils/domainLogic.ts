import type {
  ABHAStatus,
  ConsentGrant,
  ConsentStatus,
  MedicalRecord,
  RecordCategory,
  UserRole,
} from '../types/models';

export const RECORD_CATEGORIES: RecordCategory[] = [
  'Prescriptions',
  'Laboratory reports',
  'Discharge summaries',
  'Consultation notes',
  'Diagnostic reports',
  'Other medical documents',
];

/**
 * Generates a deterministic-format unique Internal Patient ID.
 * Format: HL-PAT-YYYY-XXXXXX
 */
export function generateInternalPatientId(seedDigits?: string, year = 2026): string {
  const digits =
    seedDigits && /^\d{6}$/.test(seedDigits)
      ? seedDigits
      : String(Math.floor(100000 + Math.random() * 900000));
  return `HL-PAT-${year}-${digits}`;
}

/**
 * Validates Internal Patient ID format.
 */
export function isValidInternalPatientId(id: string): boolean {
  return /^HL-PAT-\d{4}-\d{6}$/.test(id.trim().toUpperCase());
}

/**
 * Validates 14-digit ABHA number format (either XX-XXXX-XXXX-XXXX or 14 digits)
 * and normalizes it to XX-XXXX-XXXX-XXXX.
 * Per requirement #5: Never treat a user-entered ABHA number as verified
 * without an authorized verification mechanism.
 */
export function normalizeAndValidateABHA(
  rawInput: string,
  gatewayVerified = false
): {
  valid: boolean;
  formatted: string;
  status: ABHAStatus;
  error?: string;
} {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return { valid: true, formatted: '', status: 'not_linked' };
  }
  const digitsOnly = trimmed.replace(/[\s-]/g, '');
  if (!/^\d{14}$/.test(digitsOnly)) {
    return {
      valid: false,
      formatted: trimmed,
      status: 'not_linked',
      error: 'ABHA number must contain exactly 14 digits (format: XX-XXXX-XXXX-XXXX).',
    };
  }
  const formatted = `${digitsOnly.slice(0, 2)}-${digitsOnly.slice(2, 6)}-${digitsOnly.slice(6, 10)}-${digitsOnly.slice(10, 14)}`;
  return {
    valid: true,
    formatted,
    status: gatewayVerified ? 'verified' : 'unverified_pending_gateway',
  };
}

/**
 * Evaluates effective ConsentStatus considering expiration and revocation timestamps.
 */
export function computeEffectiveConsentStatus(
  status: ConsentStatus,
  expiresAt?: string,
  revokedAt?: string,
  nowMs: number = Date.now()
): ConsentStatus {
  if (revokedAt || status === 'Revoked') {
    return 'Revoked';
  }
  if (status === 'Rejected') {
    return 'Rejected';
  }
  if (status === 'Pending') {
    if (expiresAt && new Date(expiresAt).getTime() <= nowMs) {
      return 'Expired';
    }
    return 'Pending';
  }
  if (status === 'Approved') {
    if (expiresAt && new Date(expiresAt).getTime() <= nowMs) {
      return 'Expired';
    }
    return 'Approved';
  }
  return status;
}

/**
 * Strict server/domain check for whether a ConsentGrant authorizes a specific doctor/facility
 * to access a given MedicalRecord at `nowMs`.
 */
export function isRecordAuthorizedByConsent(
  grant: ConsentGrant,
  record: MedicalRecord,
  requesterUserId: string,
  requesterFacilityId?: string,
  nowMs: number = Date.now()
): boolean {
  // 1. Must match patient
  if (grant.patientId !== record.patientId) {
    return false;
  }

  // 2. Private patient-only records cannot be disclosed externally
  if (record.visibility === 'private_patient_only') {
    return false;
  }

  // 3. Check effective status (must be Approved, not Expired or Revoked)
  const effectiveStatus = computeEffectiveConsentStatus(
    grant.status,
    grant.expiresAt,
    grant.revokedAt,
    nowMs
  );
  if (effectiveStatus !== 'Approved') {
    return false;
  }

  // 4. Requester must be the granted user OR belong to the granted healthcare facility
  const matchesUser = grant.granteeUserId === requesterUserId;
  const matchesFacility =
    Boolean(requesterFacilityId) && grant.granteeFacilityId === requesterFacilityId;
  if (!matchesUser && !matchesFacility) {
    return false;
  }

  // 5. Check specific record scope if specified
  if (grant.allowedRecordIds && grant.allowedRecordIds.length > 0) {
    if (!grant.allowedRecordIds.includes(record.id)) {
      return false;
    }
  }

  // 6. Check category scope
  if (grant.allowedCategories && grant.allowedCategories.length > 0) {
    if (!grant.allowedCategories.includes(record.category)) {
      return false;
    }
  }

  return true;
}

export interface RegistrationValidationInput {
  role: UserRole;
  fullName: string;
  email: string;
  password?: string;
  confirmPassword?: string;
  dateOfBirth?: string;
  abhaNumber?: string;
  registrationNumber?: string;
  hospitalName?: string;
  requestedRole?: string;
  adminSetupKey?: string;
}

/**
 * Validates role-specific user registration inputs.
 */
export function validateRegistrationInput(input: RegistrationValidationInput): {
  valid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  if (!input.fullName || input.fullName.trim().length < 2) {
    errors.fullName = 'Full name is required (minimum 2 characters).';
  }

  const emailOrMobile = (input.email || '').trim();
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailOrMobile);
  const isMobile = /^\+?[0-9]{10,13}$/.test(emailOrMobile);

  if (!emailOrMobile) {
    errors.email = 'Valid email address is required.';
  } else if (input.role === 'patient' ? !isEmail && !isMobile : !isEmail) {
    errors.email =
      input.role === 'patient'
        ? 'Enter a valid email address or 10-digit mobile number.'
        : 'Enter a valid institutional email address.';
  }

  if (!input.password || input.password.length < 8) {
    errors.password = 'Password must be at least 8 characters long.';
  }

  if (
    input.confirmPassword !== undefined &&
    input.password !== input.confirmPassword
  ) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  if (input.role === 'patient') {
    if (!input.dateOfBirth) {
      errors.dateOfBirth = 'Date of birth is required for patient identification.';
    }
    if (input.abhaNumber && input.abhaNumber.trim().length > 0) {
      const abhaCheck = normalizeAndValidateABHA(input.abhaNumber, false);
      if (!abhaCheck.valid && abhaCheck.error) {
        errors.abhaNumber = abhaCheck.error;
      }
    }
  } else if (input.role === 'doctor') {
    if (!input.registrationNumber || input.registrationNumber.trim().length < 4) {
      errors.registrationNumber = 'Professional medical registration number is required.';
    }
    if (!input.hospitalName || input.hospitalName.trim().length < 3) {
      errors.hospitalName = 'Hospital affiliation is required.';
    }
  } else if (input.role === 'staff') {
    if (!input.hospitalName || input.hospitalName.trim().length < 3) {
      errors.hospitalName = 'Hospital affiliation is required.';
    }
    if (!input.requestedRole || input.requestedRole.trim().length < 2) {
      errors.requestedRole = 'Requested hospital staff role is required.';
    }
  } else if (input.role === 'admin') {
    if (!input.adminSetupKey || input.adminSetupKey.trim().length < 4) {
      errors.adminSetupKey =
        'Administrator provisioning requires the secure setup key.';
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validates medical record file upload metadata (file type and size).
 */
export function validateMedicalFileUpload(
  fileName: string,
  mimeType: string,
  sizeBytes: number
): { valid: boolean; error?: string } {
  const maxBytes = 10 * 1024 * 1024; // 10 MB
  if (sizeBytes <= 0) {
    return { valid: false, error: 'File appears to be empty.' };
  }
  if (sizeBytes > maxBytes) {
    return { valid: false, error: 'File size exceeds the 10 MB security limit.' };
  }
  const allowedExtensions = ['.pdf', '.txt', '.json', '.csv', '.png', '.jpg', '.jpeg', '.xml'];
  const lower = fileName.toLowerCase();
  const hasAllowedExt = allowedExtensions.some((ext) => lower.endsWith(ext));
  if (!hasAllowedExt) {
    return {
      valid: false,
      error:
        'Unsupported file type. Allowed formats: PDF, TXT, JSON, CSV, HL7/XML, PNG, JPG.',
    };
  }
  return { valid: true };
}
