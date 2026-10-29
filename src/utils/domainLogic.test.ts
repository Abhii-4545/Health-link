import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateInternalPatientId,
  isValidInternalPatientId,
  normalizeAndValidateABHA,
  computeEffectiveConsentStatus,
  isRecordAuthorizedByConsent,
  validateRegistrationInput,
  validateMedicalFileUpload,
} from './domainLogic';
import type { ConsentGrant, MedicalRecord } from '../types/models';

test('generateInternalPatientId and isValidInternalPatientId work accurately', () => {
  const id = generateInternalPatientId('482910', 2026);
  assert.equal(id, 'HL-PAT-2026-482910');
  assert.equal(isValidInternalPatientId(id), true);
  assert.equal(isValidInternalPatientId('INVALID-ID'), false);
});

test('normalizeAndValidateABHA enforces 14-digit format and marks user-entered ABHA as unverified', () => {
  const empty = normalizeAndValidateABHA('');
  assert.equal(empty.valid, true);
  assert.equal(empty.status, 'not_linked');

  const invalid = normalizeAndValidateABHA('12345');
  assert.equal(invalid.valid, false);
  assert.ok(invalid.error);

  const validUnverified = normalizeAndValidateABHA('91234567890123', false);
  assert.equal(validUnverified.valid, true);
  assert.equal(validUnverified.formatted, '91-2345-6789-0123');
  assert.equal(validUnverified.status, 'unverified_pending_gateway');
});

test('computeEffectiveConsentStatus transitions Approved to Expired or Revoked accurately', () => {
  const now = new Date('2026-10-29T10:00:00Z').getTime();
  const future = '2026-10-30T10:00:00Z';
  const past = '2026-10-28T10:00:00Z';

  assert.equal(computeEffectiveConsentStatus('Approved', future, undefined, now), 'Approved');
  assert.equal(computeEffectiveConsentStatus('Approved', past, undefined, now), 'Expired');
  assert.equal(
    computeEffectiveConsentStatus('Approved', future, '2026-10-29T09:00:00Z', now),
    'Revoked'
  );
});

test('isRecordAuthorizedByConsent enforces patient match, expiration, revocation, and category scope', () => {
  const now = new Date('2026-10-29T10:00:00Z').getTime();

  const sampleRecord: MedicalRecord = {
    id: 'rec-1',
    title: 'Complete Blood Count Panel',
    category: 'Laboratory reports',
    patientId: 'HL-PAT-2026-111222',
    patientUserId: 'usr-pat-1',
    patientName: 'Test Patient',
    facilityId: 'hosp-1',
    facilityName: 'City General Hospital',
    recordDate: '2026-10-20',
    uploadDate: '2026-10-21',
    description: 'Routine CBC panel',
    clinicalTextContent: 'Hb 13.8 g/dL, WBC 6.4 x10^3/uL, Platelets 240 x10^3/uL',
    fileName: 'cbc_report.pdf',
    fileMimeType: 'application/pdf',
    fileSizeBytes: 24500,
    storageReference: 'vault://rec-1',
    uploadedByUserId: 'usr-staff-1',
    uploadedByRole: 'staff',
    visibility: 'patient_and_authorized',
  };

  const activeGrant: ConsentGrant = {
    id: 'grant-1',
    requestId: 'req-1',
    patientId: 'HL-PAT-2026-111222',
    patientUserId: 'usr-pat-1',
    granteeUserId: 'usr-doc-1',
    granteeName: 'Dr. Test',
    granteeFacilityId: 'hosp-2',
    granteeFacilityName: 'Metro Heart Institute',
    purpose: 'Cardiology consultation',
    allowedCategories: ['Laboratory reports', 'Prescriptions'],
    allowedRecordIds: [],
    status: 'Approved',
    grantedAt: '2026-10-29T08:00:00Z',
    expiresAt: '2026-10-30T08:00:00Z',
  };

  // Authorized doctor
  assert.equal(
    isRecordAuthorizedByConsent(activeGrant, sampleRecord, 'usr-doc-1', 'hosp-2', now),
    true
  );

  // Unauthorized doctor from another hospital
  assert.equal(
    isRecordAuthorizedByConsent(activeGrant, sampleRecord, 'usr-doc-999', 'hosp-999', now),
    false
  );

  // Category not in consent scope
  const dischargeRecord: MedicalRecord = {
    ...sampleRecord,
    id: 'rec-2',
    category: 'Discharge summaries',
  };
  assert.equal(
    isRecordAuthorizedByConsent(activeGrant, dischargeRecord, 'usr-doc-1', 'hosp-2', now),
    false
  );

  // Revoked consent no longer authorizes access
  const revokedGrant: ConsentGrant = {
    ...activeGrant,
    status: 'Revoked',
    revokedAt: '2026-10-29T09:30:00Z',
  };
  assert.equal(
    isRecordAuthorizedByConsent(revokedGrant, sampleRecord, 'usr-doc-1', 'hosp-2', now),
    false
  );
});

test('validateRegistrationInput validates role-specific requirements', () => {
  const invalidDoctor = validateRegistrationInput({
    role: 'doctor',
    fullName: 'Dr. A',
    email: 'doc@hospital.org',
    password: 'password123',
    confirmPassword: 'password123',
    registrationNumber: '', // missing
    hospitalName: 'Apollo Clinic',
  });
  assert.equal(invalidDoctor.valid, false);
  assert.ok(invalidDoctor.errors.registrationNumber);

  const validDoctor = validateRegistrationInput({
    role: 'doctor',
    fullName: 'Dr. Meera Kulkarni',
    email: 'meera@hospital.org',
    password: 'password123',
    confirmPassword: 'password123',
    registrationNumber: 'MMC-2019-88412',
    hospitalName: 'Sahyadri Speciality Hospital',
  });
  assert.equal(validDoctor.valid, true);
});

test('validateMedicalFileUpload checks allowed file extensions and 10MB limit', () => {
  assert.equal(validateMedicalFileUpload('report.pdf', 'application/pdf', 102400).valid, true);
  assert.equal(validateMedicalFileUpload('malware.exe', 'application/octet-stream', 1024).valid, false);
  assert.equal(validateMedicalFileUpload('huge.pdf', 'application/pdf', 15 * 1024 * 1024).valid, false);
});
