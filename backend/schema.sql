-- =============================================================================
-- HealthLink ABHA — Normalized MySQL Database Schema
-- Project: ABHA-Based Inter-Hospital Medical Record Exchange
-- NOTE: Starts with completely empty tables and zero pre-seeded personal data.
-- =============================================================================

CREATE DATABASE IF NOT EXISTS healthlink_abha_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE healthlink_abha_db;

-- 1. Users Table (Core authentication & RBAC)
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(180) NOT NULL UNIQUE,
  mobile VARCHAR(20) NULL,
  password_hash VARCHAR(255) NOT NULL,
  password_salt VARCHAR(128) NOT NULL,
  role ENUM('patient', 'doctor', 'staff', 'admin') NOT NULL,
  account_status ENUM('active', 'pending_verification', 'suspended') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP NULL,
  INDEX idx_users_role (role),
  INDEX idx_users_email (email)
) ENGINE=InnoDB;

-- 2. Hospitals Table (Participating Healthcare Facilities)
CREATE TABLE IF NOT EXISTS hospitals (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(200) NOT NULL UNIQUE,
  facility_code VARCHAR(64) NOT NULL UNIQUE,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  contact_email VARCHAR(180) NOT NULL,
  verification_status ENUM('verified', 'pending_review', 'suspended') NOT NULL DEFAULT 'verified',
  integration_supported BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_hospitals_verification (verification_status)
) ENGINE=InnoDB;

-- 3. Patient Profiles Table (Internal Patient ID + Protected ABHA reference)
CREATE TABLE IF NOT EXISTS patient_profiles (
  user_id VARCHAR(36) PRIMARY KEY,
  internal_patient_id VARCHAR(32) NOT NULL UNIQUE,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(180) NOT NULL,
  mobile VARCHAR(20) NULL,
  date_of_birth DATE NOT NULL,
  blood_group VARCHAR(10) NULL,
  gender VARCHAR(30) NULL,
  emergency_contact VARCHAR(100) NULL,
  address TEXT NULL,
  abha_number_masked VARCHAR(25) NULL,
  abha_address VARCHAR(100) NULL,
  abha_status ENUM('not_linked', 'unverified_pending_gateway', 'verified') NOT NULL DEFAULT 'not_linked',
  registered_by_hospital_id VARCHAR(36) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_patient_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_patient_reg_hospital FOREIGN KEY (registered_by_hospital_id) REFERENCES hospitals(id) ON DELETE SET NULL,
  INDEX idx_patient_internal_id (internal_patient_id),
  INDEX idx_patient_abha (abha_number_masked)
) ENGINE=InnoDB;

-- 4. Doctor Profiles Table
CREATE TABLE IF NOT EXISTS doctor_profiles (
  user_id VARCHAR(36) PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(180) NOT NULL,
  registration_number VARCHAR(80) NOT NULL UNIQUE,
  specialization VARCHAR(120) NOT NULL DEFAULT 'General Medicine',
  hospital_id VARCHAR(36) NOT NULL,
  hospital_name VARCHAR(200) NOT NULL,
  verification_status ENUM('verified', 'pending_review') NOT NULL DEFAULT 'verified',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_doctor_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_doctor_hospital FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE RESTRICT,
  INDEX idx_doctor_hospital (hospital_id)
) ENGINE=InnoDB;

-- 5. Hospital Staff Affiliations Table
CREATE TABLE IF NOT EXISTS hospital_staff_affiliations (
  user_id VARCHAR(36) PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(180) NOT NULL,
  hospital_id VARCHAR(36) NOT NULL,
  hospital_name VARCHAR(200) NOT NULL,
  requested_role VARCHAR(100) NOT NULL,
  status ENUM('active', 'pending_approval') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_staff_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_staff_hospital FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE RESTRICT,
  INDEX idx_staff_hospital (hospital_id)
) ENGINE=InnoDB;

-- 6. Patient Medical Records Table
CREATE TABLE IF NOT EXISTS patient_medical_records (
  id VARCHAR(36) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  category ENUM(
    'Prescriptions',
    'Laboratory reports',
    'Discharge summaries',
    'Consultation notes',
    'Diagnostic reports',
    'Other medical documents'
  ) NOT NULL,
  patient_id VARCHAR(32) NOT NULL,
  patient_user_id VARCHAR(36) NOT NULL,
  patient_name VARCHAR(150) NOT NULL,
  facility_id VARCHAR(36) NOT NULL,
  facility_name VARCHAR(200) NOT NULL,
  record_date DATE NOT NULL,
  upload_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  description TEXT NOT NULL,
  clinical_text_content LONGTEXT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_mime_type VARCHAR(100) NOT NULL,
  file_size_bytes INT UNSIGNED NOT NULL,
  storage_reference VARCHAR(512) NOT NULL,
  uploaded_by_user_id VARCHAR(36) NOT NULL,
  uploaded_by_role ENUM('patient', 'doctor', 'staff', 'admin') NOT NULL,
  visibility ENUM('patient_and_authorized', 'private_patient_only') NOT NULL DEFAULT 'patient_and_authorized',
  CONSTRAINT fk_record_patient FOREIGN KEY (patient_id) REFERENCES patient_profiles(internal_patient_id) ON DELETE CASCADE,
  CONSTRAINT fk_record_uploader FOREIGN KEY (uploaded_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_records_patient (patient_id),
  INDEX idx_records_category (category),
  INDEX idx_records_facility (facility_id),
  INDEX idx_records_date (record_date)
) ENGINE=InnoDB;

-- 7. Record-Sharing Requests Table
CREATE TABLE IF NOT EXISTS record_sharing_requests (
  id VARCHAR(36) PRIMARY KEY,
  patient_id VARCHAR(32) NOT NULL,
  patient_user_id VARCHAR(36) NOT NULL,
  patient_name VARCHAR(150) NOT NULL,
  requester_user_id VARCHAR(36) NOT NULL,
  requester_name VARCHAR(150) NOT NULL,
  requester_role ENUM('doctor', 'staff') NOT NULL,
  requesting_facility_id VARCHAR(36) NOT NULL,
  requesting_facility_name VARCHAR(200) NOT NULL,
  purpose VARCHAR(500) NOT NULL,
  requested_categories_json JSON NOT NULL,
  specific_record_ids_json JSON NULL,
  requested_duration_hours INT UNSIGNED NOT NULL DEFAULT 72,
  status ENUM('Pending', 'Approved', 'Rejected', 'Expired', 'Revoked') NOT NULL DEFAULT 'Pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  responded_at TIMESTAMP NULL,
  expires_at TIMESTAMP NULL,
  revoked_at TIMESTAMP NULL,
  patient_notes VARCHAR(500) NULL,
  CONSTRAINT fk_request_patient FOREIGN KEY (patient_id) REFERENCES patient_profiles(internal_patient_id) ON DELETE CASCADE,
  CONSTRAINT fk_request_requester FOREIGN KEY (requester_user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_requests_patient (patient_id, status),
  INDEX idx_requests_requester (requester_user_id, status)
) ENGINE=InnoDB;

-- 8. Consent Grants Table
CREATE TABLE IF NOT EXISTS consent_grants (
  id VARCHAR(36) PRIMARY KEY,
  request_id VARCHAR(36) NOT NULL UNIQUE,
  patient_id VARCHAR(32) NOT NULL,
  patient_user_id VARCHAR(36) NOT NULL,
  grantee_user_id VARCHAR(36) NOT NULL,
  grantee_name VARCHAR(150) NOT NULL,
  grantee_facility_id VARCHAR(36) NOT NULL,
  grantee_facility_name VARCHAR(200) NOT NULL,
  purpose VARCHAR(500) NOT NULL,
  allowed_categories_json JSON NOT NULL,
  allowed_record_ids_json JSON NOT NULL,
  status ENUM('Pending', 'Approved', 'Rejected', 'Expired', 'Revoked') NOT NULL DEFAULT 'Approved',
  granted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP NULL,
  revocation_reason VARCHAR(500) NULL,
  CONSTRAINT fk_grant_request FOREIGN KEY (request_id) REFERENCES record_sharing_requests(id) ON DELETE CASCADE,
  CONSTRAINT fk_grant_patient FOREIGN KEY (patient_id) REFERENCES patient_profiles(internal_patient_id) ON DELETE CASCADE,
  INDEX idx_grants_patient (patient_id, status),
  INDEX idx_grants_grantee (grantee_user_id, status)
) ENGINE=InnoDB;

-- 9. Consent Revocation & Expiration History Table
CREATE TABLE IF NOT EXISTS consent_revocations (
  id VARCHAR(36) PRIMARY KEY,
  consent_grant_id VARCHAR(36) NOT NULL,
  revoked_by_user_id VARCHAR(36) NOT NULL,
  event_type ENUM('REVOKED_BY_PATIENT', 'EXPIRED_AUTOMATICALLY') NOT NULL,
  reason VARCHAR(500) NULL,
  occurred_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_revocation_grant FOREIGN KEY (consent_grant_id) REFERENCES consent_grants(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 10. AI-Generated Summaries Table
CREATE TABLE IF NOT EXISTS ai_generated_summaries (
  id VARCHAR(36) PRIMARY KEY,
  patient_id VARCHAR(32) NOT NULL,
  patient_name VARCHAR(150) NOT NULL,
  generated_for_user_id VARCHAR(36) NOT NULL,
  generated_for_name VARCHAR(150) NOT NULL,
  consent_grant_id VARCHAR(36) NOT NULL,
  source_record_ids_json JSON NOT NULL,
  summary_json JSON NOT NULL,
  model_used VARCHAR(80) NOT NULL,
  doctor_review_status ENUM('pending_review', 'reviewed_verified', 'amended') NOT NULL DEFAULT 'pending_review',
  doctor_clinical_notes TEXT NULL,
  reviewed_by_doctor_name VARCHAR(150) NULL,
  reviewed_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_summary_patient FOREIGN KEY (patient_id) REFERENCES patient_profiles(internal_patient_id) ON DELETE CASCADE,
  CONSTRAINT fk_summary_grant FOREIGN KEY (consent_grant_id) REFERENCES consent_grants(id) ON DELETE CASCADE,
  INDEX idx_summaries_patient (patient_id),
  INDEX idx_summaries_doctor (generated_for_user_id)
) ENGINE=InnoDB;

-- 11. Audit Logs Table (Immutable Security & Access Trail)
CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(36) PRIMARY KEY,
  timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actor_user_id VARCHAR(36) NOT NULL,
  actor_name VARCHAR(150) NOT NULL,
  actor_role ENUM('patient', 'doctor', 'staff', 'admin', 'system') NOT NULL,
  action_type VARCHAR(64) NOT NULL,
  target_patient_id VARCHAR(32) NULL,
  target_resource_id VARCHAR(64) NULL,
  facility_name VARCHAR(200) NULL,
  severity ENUM('info', 'warning', 'security') NOT NULL DEFAULT 'info',
  details TEXT NOT NULL,
  INDEX idx_audit_timestamp (timestamp),
  INDEX idx_audit_patient (target_patient_id),
  INDEX idx_audit_actor (actor_user_id)
) ENGINE=InnoDB;
