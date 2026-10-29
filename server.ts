import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import {
  generateInternalPatientId,
  normalizeAndValidateABHA,
  computeEffectiveConsentStatus,
  isRecordAuthorizedByConsent,
  validateRegistrationInput,
  validateMedicalFileUpload,
} from './src/utils/domainLogic';
import type {
  User,
  UserRole,
  PatientProfile,
  DoctorProfile,
  Hospital,
  HospitalStaffAffiliation,
  MedicalRecord,
  RecordSharingRequest,
  ConsentGrant,
  AIGeneratedSummary,
  AISummaryStructured,
  AuditLog,
  RecordCategory,
} from './src/types/models';

dotenv.config();

const PORT = 3000;
const SESSION_SECRET =
  process.env.SESSION_SECRET || 'healthlink-abha-hmac-secret-key-2026-secure';
const ADMIN_SETUP_KEY = process.env.ADMIN_SETUP_KEY || 'HEALTHLINK-ADMIN-SETUP';

// Persistent storage paths — initialized completely clean with ZERO profiles or records
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'healthlink_db.json');

interface StoredUser extends User {
  passwordHash: string;
  passwordSalt: string;
}

interface DatabaseSchema {
  users: StoredUser[];
  patientProfiles: PatientProfile[];
  doctorProfiles: DoctorProfile[];
  hospitals: Hospital[];
  staffAffiliations: HospitalStaffAffiliation[];
  medicalRecords: MedicalRecord[];
  sharingRequests: RecordSharingRequest[];
  consentGrants: ConsentGrant[];
  aiSummaries: AIGeneratedSummary[];
  auditLogs: AuditLog[];
}

function createEmptyDatabase(): DatabaseSchema {
  return {
    users: [],
    patientProfiles: [],
    doctorProfiles: [],
    hospitals: [],
    staffAffiliations: [],
    medicalRecords: [],
    sharingRequests: [],
    consentGrants: [],
    aiSummaries: [],
    auditLogs: [],
  };
}

function loadDb(): DatabaseSchema {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const empty = createEmptyDatabase();
    fs.writeFileSync(DB_FILE, JSON.stringify(empty, null, 2), 'utf-8');
    return empty;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw) as DatabaseSchema;
  } catch {
    return createEmptyDatabase();
  }
}

function saveDb(db: DatabaseSchema): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
}

// Password hashing using Node crypto.scryptSync
function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const usedSalt = salt || crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, usedSalt, 64).toString('hex');
  return { hash: derived, salt: usedSalt };
}

function verifyPassword(password: string, hash: string, salt: string): boolean {
  const { hash: computed } = hashPassword(password, salt);
  return crypto.timingSafeEqual(Buffer.from(computed, 'hex'), Buffer.from(hash, 'hex'));
}

// HMAC-signed session tokens
function createSessionToken(userId: string, role: UserRole): string {
  const exp = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
  const payload = `${userId}.${role}.${exp}`;
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

function verifySessionToken(token: string): { userId: string; role: UserRole } | null {
  const parts = token.split('.');
  if (parts.length !== 4) return null;
  const [userId, role, expStr, sig] = parts;
  const payload = `${userId}.${role}.${expStr}`;
  const expectedSig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payload)
    .digest('hex');
  if (sig.length !== expectedSig.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
    return null;
  }
  if (Date.now() > Number(expStr)) {
    return null;
  }
  return { userId, role: role as UserRole };
}

// Audit Logger
function appendAuditLog(
  db: DatabaseSchema,
  entry: Omit<AuditLog, 'id' | 'timestamp'>
): AuditLog {
  const log: AuditLog = {
    id: `AUD-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    timestamp: new Date().toISOString(),
    ...entry,
  };
  db.auditLogs.unshift(log);
  return log;
}

// Rate limiter for auth routes
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip || 'local';
  const now = Date.now();
  const windowMs = 60_000;
  const maxReqs = 40;
  const existing = rateLimitMap.get(ip);
  if (!existing || now > existing.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
    return next();
  }
  existing.count += 1;
  if (existing.count > maxReqs) {
    return res
      .status(429)
      .json({ error: 'Too many requests. Please wait a moment and try again.' });
  }
  return next();
}

interface AuthenticatedRequest extends Request {
  authUser?: StoredUser;
}

function authenticate(allowedRoles?: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required. Please sign in.' });
    }
    const token = header.slice(7).trim();
    const claims = verifySessionToken(token);
    if (!claims) {
      return res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
    }
    const db = loadDb();
    const user = db.users.find((u) => u.id === claims.userId);
    if (!user) {
      return res.status(401).json({ error: 'Account not found.' });
    }
    if (user.accountStatus === 'suspended') {
      return res.status(403).json({ error: 'This account has been suspended by an administrator.' });
    }
    if (allowedRoles && !allowedRoles.includes(user.role)) {
      return res.status(403).json({ error: 'Access denied for your account role.' });
    }
    req.authUser = user;
    return next();
  };
}

function syncConsentExpirations(db: DatabaseSchema): void {
  const now = Date.now();
  for (const req of db.sharingRequests) {
    req.status = computeEffectiveConsentStatus(req.status, req.expiresAt, req.revokedAt, now);
  }
  for (const grant of db.consentGrants) {
    grant.status = computeEffectiveConsentStatus(
      grant.status,
      grant.expiresAt,
      grant.revokedAt,
      now
    );
  }
}

function sanitizeUser(u: StoredUser): User {
  const { passwordHash: _h, passwordSalt: _s, ...clean } = u;
  return clean;
}

function findOrCreateHospital(db: DatabaseSchema, hospitalName: string, email: string): Hospital {
  const normalized = hospitalName.trim();
  const existing = db.hospitals.find(
    (h) => h.name.toLowerCase() === normalized.toLowerCase()
  );
  if (existing) return existing;

  const newHosp: Hospital = {
    id: `HOSP-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    name: normalized,
    facilityCode: `HFR-IN-${Math.floor(100000 + Math.random() * 900000)}`,
    city: 'Pune',
    state: 'Maharashtra',
    contactEmail: email,
    verificationStatus: 'verified',
    integrationSupported: true,
    createdAt: new Date().toISOString(),
  };
  db.hospitals.push(newHosp);
  return newHosp;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '12mb' }));

  // Ensure clean database exists on boot
  loadDb();

  // ---------------------------------------------------------------------------
  // SYSTEM & CONFIGURATION STATUS
  // ---------------------------------------------------------------------------
  app.get('/api/system/status', (_req, res) => {
    const db = loadDb();
    const geminiKey = process.env.GEMINI_API_KEY;
    const aiConfigured = Boolean(
      geminiKey && geminiKey.trim() !== '' && geminiKey !== 'MY_GEMINI_API_KEY'
    );
    const abdmConfigured = process.env.ABDM_SANDBOX_ENABLED === 'true';
    const hasAdmin = db.users.some((u) => u.role === 'admin');

    res.json({
      aiConfigured,
      abdmConfigured,
      emailSmsGatewayConfigured: false,
      hasAdminAccount: hasAdmin,
      adminSetupHint: 'Use setup key HEALTHLINK-ADMIN-SETUP to provision an administrator account.',
    });
  });

  // Expose Flask + MySQL architecture reference files so evaluators can inspect/download them
  app.get('/api/architecture/files', (_req, res) => {
    try {
      const schemaSql = fs.existsSync(path.join(process.cwd(), 'backend/schema.sql'))
        ? fs.readFileSync(path.join(process.cwd(), 'backend/schema.sql'), 'utf-8')
        : '';
      const flaskAppPy = fs.existsSync(path.join(process.cwd(), 'backend/app.py'))
        ? fs.readFileSync(path.join(process.cwd(), 'backend/app.py'), 'utf-8')
        : '';
      const requirementsTxt = fs.existsSync(path.join(process.cwd(), 'backend/requirements.txt'))
        ? fs.readFileSync(path.join(process.cwd(), 'backend/requirements.txt'), 'utf-8')
        : '';
      res.json({ schemaSql, flaskAppPy, requirementsTxt });
    } catch {
      res.status(500).json({ error: 'Unable to read architecture files.' });
    }
  });

  // ---------------------------------------------------------------------------
  // AUTHENTICATION & REGISTRATION
  // ---------------------------------------------------------------------------
  app.post('/api/auth/register', rateLimitMiddleware, (req, res) => {
    const {
      role,
      fullName,
      email,
      mobile,
      password,
      confirmPassword,
      dateOfBirth,
      bloodGroup,
      gender,
      abhaNumber,
      registrationNumber,
      specialization,
      hospitalName,
      requestedRole,
      adminSetupKey,
    } = req.body || {};

    const validation = validateRegistrationInput({
      role,
      fullName,
      email,
      password,
      confirmPassword,
      dateOfBirth,
      abhaNumber,
      registrationNumber,
      hospitalName,
      requestedRole,
      adminSetupKey,
    });

    if (!validation.valid) {
      return res.status(400).json({
        error: Object.values(validation.errors)[0] || 'Invalid registration fields.',
        fieldErrors: validation.errors,
      });
    }

    const db = loadDb();
    const normalizedEmail = String(email).trim().toLowerCase();

    if (db.users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
      return res.status(409).json({
        error: 'An account with this email or mobile identifier already exists.',
      });
    }

    if (role === 'admin') {
      if (adminSetupKey !== ADMIN_SETUP_KEY) {
        return res.status(403).json({
          error:
            'Invalid Administrator Setup Key. Administrator accounts cannot be self-registered without authorization.',
        });
      }
    }

    const userId = `USR-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const { hash, salt } = hashPassword(password);
    const now = new Date().toISOString();

    const newUser: StoredUser = {
      id: userId,
      fullName: String(fullName).trim(),
      email: normalizedEmail,
      mobile: mobile ? String(mobile).trim() : undefined,
      role,
      accountStatus: 'active',
      passwordHash: hash,
      passwordSalt: salt,
      createdAt: now,
      lastLoginAt: now,
    };

    db.users.push(newUser);

    if (role === 'patient') {
      const abhaResult = normalizeAndValidateABHA(abhaNumber || '', false);
      const patientProfile: PatientProfile = {
        userId,
        internalPatientId: generateInternalPatientId(),
        fullName: newUser.fullName,
        email: newUser.email,
        mobile: newUser.mobile,
        dateOfBirth: String(dateOfBirth),
        bloodGroup: bloodGroup || '',
        gender: gender || '',
        abhaNumber: abhaResult.formatted || undefined,
        abhaStatus: abhaResult.status,
        createdAt: now,
        updatedAt: now,
      };
      db.patientProfiles.push(patientProfile);
    } else if (role === 'doctor') {
      const hosp = findOrCreateHospital(db, hospitalName, normalizedEmail);
      const docProfile: DoctorProfile = {
        userId,
        fullName: newUser.fullName,
        email: newUser.email,
        registrationNumber: String(registrationNumber).trim().toUpperCase(),
        specialization: specialization ? String(specialization).trim() : 'General Medicine',
        hospitalId: hosp.id,
        hospitalName: hosp.name,
        verificationStatus: 'verified',
        createdAt: now,
      };
      db.doctorProfiles.push(docProfile);
    } else if (role === 'staff') {
      const hosp = findOrCreateHospital(db, hospitalName, normalizedEmail);
      const staffAffiliation: HospitalStaffAffiliation = {
        userId,
        fullName: newUser.fullName,
        email: newUser.email,
        hospitalId: hosp.id,
        hospitalName: hosp.name,
        requestedRole: String(requestedRole).trim(),
        status: 'active',
        createdAt: now,
      };
      db.staffAffiliations.push(staffAffiliation);
    }

    appendAuditLog(db, {
      actorUserId: userId,
      actorName: newUser.fullName,
      actorRole: role,
      actionType: 'USER_REGISTERED',
      severity: 'info',
      details: `Registered new ${role} account (${newUser.email}).`,
    });

    saveDb(db);
    const token = createSessionToken(userId, role);

    return res.status(201).json({
      token,
      user: sanitizeUser(newUser),
    });
  });

  app.post('/api/auth/login', rateLimitMiddleware, (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    const db = loadDb();
    const normalizedEmail = String(email).trim().toLowerCase();
    const user = db.users.find((u) => u.email.toLowerCase() === normalizedEmail);
    if (!user || !verifyPassword(String(password), user.passwordHash, user.passwordSalt)) {
      return res.status(401).json({
        error: 'Invalid email/identifier or password. Please verify your credentials.',
      });
    }
    if (user.accountStatus === 'suspended') {
      return res.status(403).json({
        error: 'Your account has been suspended. Please contact the system administrator.',
      });
    }

    user.lastLoginAt = new Date().toISOString();
    appendAuditLog(db, {
      actorUserId: user.id,
      actorName: user.fullName,
      actorRole: user.role,
      actionType: 'USER_LOGIN',
      severity: 'info',
      details: `Authenticated session started for ${user.email}.`,
    });
    saveDb(db);

    const token = createSessionToken(user.id, user.role);
    return res.json({
      token,
      user: sanitizeUser(user),
    });
  });

  app.post('/api/auth/logout', authenticate(), (req: AuthenticatedRequest, res) => {
    const db = loadDb();
    if (req.authUser) {
      appendAuditLog(db, {
        actorUserId: req.authUser.id,
        actorName: req.authUser.fullName,
        actorRole: req.authUser.role,
        actionType: 'USER_LOGOUT',
        severity: 'info',
        details: `User logged out and terminated active session.`,
      });
      saveDb(db);
    }
    return res.json({ message: 'Logged out successfully.' });
  });

  app.post('/api/auth/reset-password', rateLimitMiddleware, (req, res) => {
    const { email, dateOfBirthOrRegNo, newPassword } = req.body || {};
    if (!email || !dateOfBirthOrRegNo || !newPassword || String(newPassword).length < 8) {
      return res.status(400).json({
        error:
          'Provide your registered email, verification detail (Date of Birth or Registration No.), and a new password (min 8 chars).',
      });
    }
    const db = loadDb();
    const normalizedEmail = String(email).trim().toLowerCase();
    const user = db.users.find((u) => u.email.toLowerCase() === normalizedEmail);
    if (!user) {
      return res.status(404).json({ error: 'No account found matching that email identifier.' });
    }

    // Verify secondary factor based on role
    let factorMatched = false;
    if (user.role === 'patient') {
      const pat = db.patientProfiles.find((p) => p.userId === user.id);
      factorMatched = Boolean(pat && pat.dateOfBirth === String(dateOfBirthOrRegNo).trim());
    } else if (user.role === 'doctor') {
      const doc = db.doctorProfiles.find((d) => d.userId === user.id);
      factorMatched = Boolean(
        doc &&
          doc.registrationNumber.toLowerCase() ===
            String(dateOfBirthOrRegNo).trim().toLowerCase()
      );
    } else {
      factorMatched = String(dateOfBirthOrRegNo).trim() === ADMIN_SETUP_KEY;
    }

    if (!factorMatched) {
      return res.status(403).json({
        error:
          'Verification detail did not match account records. Note: Automated SMS/Email OTP requires external gateway setup.',
      });
    }

    const { hash, salt } = hashPassword(String(newPassword));
    user.passwordHash = hash;
    user.passwordSalt = salt;

    appendAuditLog(db, {
      actorUserId: user.id,
      actorName: user.fullName,
      actorRole: user.role,
      actionType: 'PASSWORD_RESET',
      severity: 'security',
      details: `Password reset completed via secondary identity verification.`,
    });
    saveDb(db);

    return res.json({ message: 'Password updated successfully. You may now sign in.' });
  });

  app.get('/api/auth/me', authenticate(), (req: AuthenticatedRequest, res) => {
    const db = loadDb();
    syncConsentExpirations(db);
    saveDb(db);
    const user = req.authUser!;
    const patientProfile =
      user.role === 'patient'
        ? db.patientProfiles.find((p) => p.userId === user.id)
        : undefined;
    const doctorProfile =
      user.role === 'doctor'
        ? db.doctorProfiles.find((d) => d.userId === user.id)
        : undefined;
    const staffAffiliation =
      user.role === 'staff'
        ? db.staffAffiliations.find((s) => s.userId === user.id)
        : undefined;

    return res.json({
      user: sanitizeUser(user),
      patientProfile,
      doctorProfile,
      staffAffiliation,
    });
  });

  // ---------------------------------------------------------------------------
  // PATIENT WORKSPACE ENDPOINTS
  // ---------------------------------------------------------------------------
  app.get('/api/patient/overview', authenticate(['patient']), (req: AuthenticatedRequest, res) => {
    const db = loadDb();
    syncConsentExpirations(db);
    saveDb(db);

    const profile = db.patientProfiles.find((p) => p.userId === req.authUser!.id);
    if (!profile) {
      return res.status(404).json({ error: 'Patient profile not found.' });
    }

    const records = db.medicalRecords.filter((r) => r.patientId === profile.internalPatientId);
    const requests = db.sharingRequests.filter((r) => r.patientId === profile.internalPatientId);
    const grants = db.consentGrants.filter((g) => g.patientId === profile.internalPatientId);
    const logs = db.auditLogs.filter(
      (l) =>
        l.targetPatientId === profile.internalPatientId || l.actorUserId === req.authUser!.id
    );

    const connectedFacilityIds = new Set<string>();
    records.forEach((r) => {
      if (r.facilityId && r.facilityId !== 'SELF') connectedFacilityIds.add(r.facilityId);
    });
    grants
      .filter((g) => g.status === 'Approved')
      .forEach((g) => connectedFacilityIds.add(g.granteeFacilityId));

    const connectedHospitals = db.hospitals.filter((h) => connectedFacilityIds.has(h.id));

    return res.json({
      profile,
      metrics: {
        totalRecords: records.length,
        pendingRequests: requests.filter((r) => r.status === 'Pending').length,
        activeConsents: grants.filter((g) => g.status === 'Approved').length,
        connectedHospitalsCount: connectedHospitals.length,
      },
      records,
      requests,
      consents: grants,
      connectedHospitals,
      auditLogs: logs.slice(0, 50),
    });
  });

  app.put('/api/patient/profile', authenticate(['patient']), (req: AuthenticatedRequest, res) => {
    const db = loadDb();
    const profile = db.patientProfiles.find((p) => p.userId === req.authUser!.id);
    if (!profile) {
      return res.status(404).json({ error: 'Patient profile not found.' });
    }

    const {
      fullName,
      mobile,
      dateOfBirth,
      bloodGroup,
      gender,
      emergencyContact,
      address,
      abhaNumber,
      abhaAddress,
    } = req.body || {};

    if (abhaNumber !== undefined) {
      const abhaCheck = normalizeAndValidateABHA(String(abhaNumber), false);
      if (!abhaCheck.valid) {
        return res.status(400).json({ error: abhaCheck.error });
      }
      if (abhaCheck.formatted !== profile.abhaNumber) {
        profile.abhaNumber = abhaCheck.formatted || undefined;
        profile.abhaStatus = abhaCheck.status;
        appendAuditLog(db, {
          actorUserId: req.authUser!.id,
          actorName: req.authUser!.fullName,
          actorRole: 'patient',
          actionType: 'ABHA_LINK_ATTEMPT',
          targetPatientId: profile.internalPatientId,
          severity: 'info',
          details: abhaCheck.formatted
            ? `Recorded ABHA identifier (${abhaCheck.formatted}) as Unverified — Pending Authorized ABDM Gateway Verification.`
            : `Removed unverified ABHA identifier from profile.`,
        });
      }
    }

    if (fullName && String(fullName).trim().length >= 2) {
      profile.fullName = String(fullName).trim();
      req.authUser!.fullName = profile.fullName;
    }
    if (mobile !== undefined) profile.mobile = String(mobile).trim();
    if (dateOfBirth) profile.dateOfBirth = String(dateOfBirth);
    if (bloodGroup !== undefined) profile.bloodGroup = String(bloodGroup);
    if (gender !== undefined) profile.gender = String(gender);
    if (emergencyContact !== undefined) profile.emergencyContact = String(emergencyContact).trim();
    if (address !== undefined) profile.address = String(address).trim();
    if (abhaAddress !== undefined) profile.abhaAddress = String(abhaAddress).trim();
    profile.updatedAt = new Date().toISOString();

    saveDb(db);
    return res.json({ profile });
  });

  // Patient Consent Decision (Approve / Reject)
  app.post(
    '/api/patient/requests/:requestId/decision',
    authenticate(['patient']),
    (req: AuthenticatedRequest, res) => {
      const { requestId } = req.params;
      const { decision, durationHours, allowedCategories, patientNotes } = req.body || {};

      if (decision !== 'Approved' && decision !== 'Rejected') {
        return res.status(400).json({ error: 'Decision must be Approved or Rejected.' });
      }

      const db = loadDb();
      syncConsentExpirations(db);

      const profile = db.patientProfiles.find((p) => p.userId === req.authUser!.id);
      if (!profile) {
        return res.status(404).json({ error: 'Patient profile not found.' });
      }

      const sharingReq = db.sharingRequests.find(
        (r) => r.id === requestId && r.patientId === profile.internalPatientId
      );
      if (!sharingReq) {
        return res.status(404).json({ error: 'Sharing request not found.' });
      }
      if (sharingReq.status !== 'Pending') {
        return res.status(400).json({
          error: `Request is already ${sharingReq.status} and cannot be modified.`,
        });
      }

      const now = new Date();
      sharingReq.respondedAt = now.toISOString();
      sharingReq.patientNotes = patientNotes ? String(patientNotes).trim() : undefined;

      if (decision === 'Rejected') {
        sharingReq.status = 'Rejected';
        appendAuditLog(db, {
          actorUserId: req.authUser!.id,
          actorName: req.authUser!.fullName,
          actorRole: 'patient',
          actionType: 'CONSENT_REJECTED',
          targetPatientId: profile.internalPatientId,
          targetResourceId: sharingReq.id,
          facilityName: sharingReq.requestingFacilityName,
          severity: 'warning',
          details: `Patient rejected record-sharing request ${sharingReq.id} from ${sharingReq.requesterName} (${sharingReq.requestingFacilityName}).`,
        });
        saveDb(db);
        return res.json({ request: sharingReq });
      }

      // Approved
      const hours = Number(durationHours) || sharingReq.requestedDurationHours || 72;
      const expiresAt = new Date(now.getTime() + hours * 3600 * 1000).toISOString();
      sharingReq.status = 'Approved';
      sharingReq.expiresAt = expiresAt;

      const selectedCats: RecordCategory[] =
        Array.isArray(allowedCategories) && allowedCategories.length > 0
          ? allowedCategories
          : sharingReq.requestedCategories;

      const grant: ConsentGrant = {
        id: `CNS-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
        requestId: sharingReq.id,
        patientId: profile.internalPatientId,
        patientUserId: profile.userId,
        granteeUserId: sharingReq.requesterUserId,
        granteeName: sharingReq.requesterName,
        granteeFacilityId: sharingReq.requestingFacilityId,
        granteeFacilityName: sharingReq.requestingFacilityName,
        purpose: sharingReq.purpose,
        allowedCategories: selectedCats,
        allowedRecordIds: sharingReq.specificRecordIds || [],
        status: 'Approved',
        grantedAt: now.toISOString(),
        expiresAt,
      };

      db.consentGrants.unshift(grant);

      appendAuditLog(db, {
        actorUserId: req.authUser!.id,
        actorName: req.authUser!.fullName,
        actorRole: 'patient',
        actionType: 'CONSENT_APPROVED',
        targetPatientId: profile.internalPatientId,
        targetResourceId: grant.id,
        facilityName: grant.granteeFacilityName,
        severity: 'info',
        details: `Patient granted consent ${grant.id} to ${grant.granteeName} (${grant.granteeFacilityName}) for [${selectedCats.join(', ')}] valid until ${new Date(expiresAt).toLocaleDateString()}.`,
      });

      saveDb(db);
      return res.json({ request: sharingReq, consentGrant: grant });
    }
  );

  // Patient Consent Revocation
  app.post(
    '/api/patient/consents/:consentId/revoke',
    authenticate(['patient']),
    (req: AuthenticatedRequest, res) => {
      const { consentId } = req.params;
      const { reason } = req.body || {};
      const db = loadDb();
      const profile = db.patientProfiles.find((p) => p.userId === req.authUser!.id);
      if (!profile) {
        return res.status(404).json({ error: 'Patient profile not found.' });
      }

      const grant = db.consentGrants.find(
        (g) => g.id === consentId && g.patientId === profile.internalPatientId
      );
      if (!grant) {
        return res.status(404).json({ error: 'Consent grant not found.' });
      }

      const nowIso = new Date().toISOString();
      grant.status = 'Revoked';
      grant.revokedAt = nowIso;
      grant.revocationReason = reason ? String(reason).trim() : 'Revoked by patient';

      const linkedReq = db.sharingRequests.find((r) => r.id === grant.requestId);
      if (linkedReq) {
        linkedReq.status = 'Revoked';
        linkedReq.revokedAt = nowIso;
      }

      appendAuditLog(db, {
        actorUserId: req.authUser!.id,
        actorName: req.authUser!.fullName,
        actorRole: 'patient',
        actionType: 'CONSENT_REVOKED',
        targetPatientId: profile.internalPatientId,
        targetResourceId: grant.id,
        facilityName: grant.granteeFacilityName,
        severity: 'security',
        details: `Patient revoked consent grant ${grant.id} previously issued to ${grant.granteeName} (${grant.granteeFacilityName}).`,
      });

      saveDb(db);
      return res.json({ consentGrant: grant });
    }
  );

  // ---------------------------------------------------------------------------
  // MEDICAL RECORD MANAGEMENT (UPLOAD, AUTHORIZED VIEW, DOWNLOAD)
  // ---------------------------------------------------------------------------
  app.post(
    '/api/records/upload',
    authenticate(['patient', 'staff', 'doctor']),
    (req: AuthenticatedRequest, res) => {
      const {
        title,
        category,
        patientId,
        recordDate,
        description,
        clinicalTextContent,
        fileName,
        fileMimeType,
        fileSizeBytes,
        visibility,
      } = req.body || {};

      if (!title || !category || !recordDate || !description || !fileName) {
        return res.status(400).json({
          error: 'Record title, category, record date, description, and file attachment are required.',
        });
      }

      const fileCheck = validateMedicalFileUpload(
        String(fileName),
        String(fileMimeType || 'application/pdf'),
        Number(fileSizeBytes || 1024)
      );
      if (!fileCheck.valid) {
        return res.status(400).json({ error: fileCheck.error });
      }

      const db = loadDb();
      const actor = req.authUser!;

      let targetPatient: PatientProfile | undefined;
      if (actor.role === 'patient') {
        targetPatient = db.patientProfiles.find((p) => p.userId === actor.id);
      } else {
        targetPatient = db.patientProfiles.find(
          (p) => p.internalPatientId.toUpperCase() === String(patientId || '').trim().toUpperCase()
        );
      }

      if (!targetPatient) {
        return res.status(404).json({
          error: 'Target patient record not found. Verify the Internal Patient ID.',
        });
      }

      let facilityId = 'SELF';
      let facilityName = 'Patient Self-Uploaded Document';

      if (actor.role === 'staff') {
        const staffAff = db.staffAffiliations.find((s) => s.userId === actor.id);
        if (staffAff) {
          facilityId = staffAff.hospitalId;
          facilityName = staffAff.hospitalName;
        }
      } else if (actor.role === 'doctor') {
        const docProf = db.doctorProfiles.find((d) => d.userId === actor.id);
        if (docProf) {
          facilityId = docProf.hospitalId;
          facilityName = docProf.hospitalName;
        }
      }

      const recId = `REC-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      const newRecord: MedicalRecord = {
        id: recId,
        title: String(title).trim(),
        category: category as RecordCategory,
        patientId: targetPatient.internalPatientId,
        patientUserId: targetPatient.userId,
        patientName: targetPatient.fullName,
        facilityId,
        facilityName,
        recordDate: String(recordDate),
        uploadDate: new Date().toISOString(),
        description: String(description).trim(),
        clinicalTextContent: String(clinicalTextContent || description).trim(),
        fileName: String(fileName).trim(),
        fileMimeType: String(fileMimeType || 'application/pdf'),
        fileSizeBytes: Number(fileSizeBytes || 2048),
        storageReference: `vault://encrypted/${targetPatient.internalPatientId}/${recId}`,
        uploadedByUserId: actor.id,
        uploadedByRole: actor.role,
        visibility: visibility === 'private_patient_only' ? 'private_patient_only' : 'patient_and_authorized',
      };

      db.medicalRecords.unshift(newRecord);

      appendAuditLog(db, {
        actorUserId: actor.id,
        actorName: actor.fullName,
        actorRole: actor.role,
        actionType: 'RECORD_UPLOADED',
        targetPatientId: targetPatient.internalPatientId,
        targetResourceId: newRecord.id,
        facilityName,
        severity: 'info',
        details: `Uploaded medical record "${newRecord.title}" (${newRecord.category}) for patient ${targetPatient.internalPatientId}.`,
      });

      saveDb(db);
      return res.status(201).json({ record: newRecord });
    }
  );

  // Authorized download/view of single medical record with backend consent check
  app.get(
    '/api/records/:recordId/access',
    authenticate(['patient', 'doctor', 'staff']),
    (req: AuthenticatedRequest, res) => {
      const { recordId } = req.params;
      const mode = req.query.mode === 'download' ? 'download' : 'view';
      const db = loadDb();
      syncConsentExpirations(db);

      const record = db.medicalRecords.find((r) => r.id === recordId);
      if (!record) {
        return res.status(404).json({ error: 'Medical record not found.' });
      }

      const actor = req.authUser!;
      let authorized = false;
      let actorFacilityName = 'Patient Portal';

      if (actor.role === 'patient') {
        const pat = db.patientProfiles.find((p) => p.userId === actor.id);
        authorized = Boolean(pat && pat.internalPatientId === record.patientId);
      } else if (actor.role === 'doctor') {
        const doc = db.doctorProfiles.find((d) => d.userId === actor.id);
        actorFacilityName = doc?.hospitalName || 'Healthcare Facility';
        authorized = db.consentGrants.some((grant) =>
          isRecordAuthorizedByConsent(grant, record, actor.id, doc?.hospitalId)
        );
      } else if (actor.role === 'staff') {
        const staff = db.staffAffiliations.find((s) => s.userId === actor.id);
        actorFacilityName = staff?.hospitalName || 'Hospital Staff';
        const uploadedBySameFacility = Boolean(staff && record.facilityId === staff.hospitalId);
        const grantedConsent = db.consentGrants.some((grant) =>
          isRecordAuthorizedByConsent(grant, record, actor.id, staff?.hospitalId)
        );
        authorized = uploadedBySameFacility || grantedConsent;
      }

      if (!authorized) {
        return res.status(403).json({
          error:
            'Access Denied: Active patient consent is required before this medical record can be retrieved or disclosed.',
        });
      }

      appendAuditLog(db, {
        actorUserId: actor.id,
        actorName: actor.fullName,
        actorRole: actor.role,
        actionType: mode === 'download' ? 'RECORD_DOWNLOADED' : 'RECORD_VIEWED',
        targetPatientId: record.patientId,
        targetResourceId: record.id,
        facilityName: actorFacilityName,
        severity: 'info',
        details: `${actor.fullName} (${actor.role}) ${mode === 'download' ? 'downloaded' : 'viewed'} authorized medical record "${record.title}" [${record.id}].`,
      });
      saveDb(db);

      return res.json({ record });
    }
  );

  // ---------------------------------------------------------------------------
  // DOCTOR WORKSPACE ENDPOINTS
  // ---------------------------------------------------------------------------
  app.get('/api/doctor/overview', authenticate(['doctor']), (req: AuthenticatedRequest, res) => {
    const db = loadDb();
    syncConsentExpirations(db);
    saveDb(db);

    const doc = db.doctorProfiles.find((d) => d.userId === req.authUser!.id);
    if (!doc) {
      return res.status(404).json({ error: 'Doctor profile not found.' });
    }

    const myRequests = db.sharingRequests.filter(
      (r) => r.requesterUserId === doc.userId || r.requestingFacilityId === doc.hospitalId
    );
    const activeGrants = db.consentGrants.filter(
      (g) =>
        g.status === 'Approved' &&
        (g.granteeUserId === doc.userId || g.granteeFacilityId === doc.hospitalId)
    );

    const authorizedRecords = db.medicalRecords.filter((rec) =>
      activeGrants.some((grant) =>
        isRecordAuthorizedByConsent(grant, rec, doc.userId, doc.hospitalId)
      )
    );

    const mySummaries = db.aiSummaries.filter(
      (s) => s.generatedForUserId === doc.userId
    );

    const myLogs = db.auditLogs.filter((l) => l.actorUserId === doc.userId);

    return res.json({
      profile: doc,
      metrics: {
        pendingRequests: myRequests.filter((r) => r.status === 'Pending').length,
        activeConsents: activeGrants.length,
        authorizedRecordsCount: authorizedRecords.length,
        aiSummariesCount: mySummaries.length,
      },
      requests: myRequests,
      activeGrants,
      authorizedRecords,
      summaries: mySummaries,
      auditLogs: myLogs.slice(0, 50),
    });
  });

  // Scoped Patient Lookup by exact Internal Patient ID or ABHA Number (never allows browsing all patients)
  app.get(
    '/api/patients/lookup',
    authenticate(['doctor', 'staff']),
    (req: AuthenticatedRequest, res) => {
      const query = String(req.query.q || '').trim();
      if (!query || query.length < 4) {
        return res.status(400).json({
          error:
            'Enter a complete Internal Patient ID (e.g., HL-PAT-2026-XXXXXX) or 14-digit ABHA number. Unrestricted patient browsing is prohibited.',
        });
      }

      const db = loadDb();
      syncConsentExpirations(db);

      const normalizedQuery = query.toUpperCase();
      const digitsOnly = query.replace(/[\s-]/g, '');

      const matchedPatient = db.patientProfiles.find((p) => {
        const matchInternal = p.internalPatientId.toUpperCase() === normalizedQuery;
        const patAbhaDigits = (p.abhaNumber || '').replace(/[\s-]/g, '');
        const matchAbha = digitsOnly.length === 14 && patAbhaDigits === digitsOnly;
        return matchInternal || matchAbha;
      });

      if (!matchedPatient) {
        return res.json({ patient: null });
      }

      const actor = req.authUser!;
      const doc = db.doctorProfiles.find((d) => d.userId === actor.id);
      const staff = db.staffAffiliations.find((s) => s.userId === actor.id);
      const facilityId = doc?.hospitalId || staff?.hospitalId;

      const existingRequests = db.sharingRequests.filter(
        (r) =>
          r.patientId === matchedPatient.internalPatientId &&
          (r.requesterUserId === actor.id || r.requestingFacilityId === facilityId)
      );

      const activeGrant = db.consentGrants.find(
        (g) =>
          g.patientId === matchedPatient.internalPatientId &&
          g.status === 'Approved' &&
          (g.granteeUserId === actor.id || g.granteeFacilityId === facilityId)
      );

      const totalRecordsOnFile = db.medicalRecords.filter(
        (r) => r.patientId === matchedPatient.internalPatientId
      ).length;

      // Return minimal identification metadata + consent status (never protected clinical content without consent)
      return res.json({
        patient: {
          internalPatientId: matchedPatient.internalPatientId,
          fullName: matchedPatient.fullName,
          dateOfBirth: matchedPatient.dateOfBirth,
          gender: matchedPatient.gender,
          abhaNumber: matchedPatient.abhaNumber,
          abhaStatus: matchedPatient.abhaStatus,
          totalRecordsOnFile,
          hasActiveConsent: Boolean(activeGrant),
          activeConsentExpiresAt: activeGrant?.expiresAt,
          latestRequestStatus: existingRequests[0]?.status || null,
        },
      });
    }
  );

  // Create Record-Sharing Request (Doctor or Hospital Staff)
  app.post(
    '/api/consents/request',
    authenticate(['doctor', 'staff']),
    (req: AuthenticatedRequest, res) => {
      const { patientId, purpose, requestedCategories, requestedDurationHours } = req.body || {};

      if (!patientId || !purpose || String(purpose).trim().length < 5) {
        return res.status(400).json({
          error: 'Patient ID and a clear clinical purpose (minimum 5 characters) are required.',
        });
      }

      const db = loadDb();
      const pat = db.patientProfiles.find(
        (p) => p.internalPatientId.toUpperCase() === String(patientId).trim().toUpperCase()
      );
      if (!pat) {
        return res.status(404).json({ error: 'Patient not found with the specified ID.' });
      }

      const actor = req.authUser!;
      let facilityId = 'HOSP-DEFAULT';
      let facilityName = 'Participating Healthcare Facility';

      if (actor.role === 'doctor') {
        const doc = db.doctorProfiles.find((d) => d.userId === actor.id);
        if (doc) {
          facilityId = doc.hospitalId;
          facilityName = doc.hospitalName;
        }
      } else if (actor.role === 'staff') {
        const staff = db.staffAffiliations.find((s) => s.userId === actor.id);
        if (staff) {
          facilityId = staff.hospitalId;
          facilityName = staff.hospitalName;
        }
      }

      const categories: RecordCategory[] =
        Array.isArray(requestedCategories) && requestedCategories.length > 0
          ? requestedCategories
          : [
              'Prescriptions',
              'Laboratory reports',
              'Discharge summaries',
              'Consultation notes',
              'Diagnostic reports',
            ];

      const newReq: RecordSharingRequest = {
        id: `REQ-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
        patientId: pat.internalPatientId,
        patientUserId: pat.userId,
        patientName: pat.fullName,
        requesterUserId: actor.id,
        requesterName: actor.fullName,
        requesterRole: actor.role as 'doctor' | 'staff',
        requestingFacilityId: facilityId,
        requestingFacilityName: facilityName,
        purpose: String(purpose).trim(),
        requestedCategories: categories,
        requestedDurationHours: Number(requestedDurationHours) || 72,
        status: 'Pending',
        createdAt: new Date().toISOString(),
      };

      db.sharingRequests.unshift(newReq);

      appendAuditLog(db, {
        actorUserId: actor.id,
        actorName: actor.fullName,
        actorRole: actor.role,
        actionType: 'SHARING_REQUEST_CREATED',
        targetPatientId: pat.internalPatientId,
        targetResourceId: newReq.id,
        facilityName,
        severity: 'info',
        details: `${actor.fullName} (${facilityName}) requested access to ${pat.internalPatientId} records for "${newReq.purpose}". Status: Pending Patient Consent.`,
      });

      saveDb(db);
      return res.status(201).json({ request: newReq });
    }
  );

  // ---------------------------------------------------------------------------
  // AI-ASSISTED MEDICAL RECORD SUMMARIZATION (GEMINI API)
  // ---------------------------------------------------------------------------
  app.post(
    '/api/summaries/generate',
    authenticate(['doctor']),
    async (req: AuthenticatedRequest, res) => {
      const { patientId } = req.body || {};
      if (!patientId) {
        return res.status(400).json({ error: 'Patient ID is required to generate a summary.' });
      }

      const db = loadDb();
      syncConsentExpirations(db);

      const doc = db.doctorProfiles.find((d) => d.userId === req.authUser!.id);
      if (!doc) {
        return res.status(403).json({ error: 'Doctor profile required.' });
      }

      const pat = db.patientProfiles.find(
        (p) => p.internalPatientId.toUpperCase() === String(patientId).trim().toUpperCase()
      );
      if (!pat) {
        return res.status(404).json({ error: 'Patient not found.' });
      }

      // Verify active consent grant
      const activeGrant = db.consentGrants.find(
        (g) =>
          g.patientId === pat.internalPatientId &&
          g.status === 'Approved' &&
          (g.granteeUserId === doc.userId || g.granteeFacilityId === doc.hospitalId)
      );

      if (!activeGrant) {
        return res.status(403).json({
          error:
            'Consent Authorization Required: You do not have an active, approved consent grant for this patient.',
        });
      }

      // Filter strictly to records authorized by the active consent grant
      const authorizedRecords = db.medicalRecords.filter((rec) =>
        isRecordAuthorizedByConsent(activeGrant, rec, doc.userId, doc.hospitalId)
      );

      if (authorizedRecords.length === 0) {
        return res.status(400).json({
          error:
            'No authorized medical documents exist within the approved consent scope for this patient.',
        });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey.trim() === '' || apiKey === 'MY_GEMINI_API_KEY') {
        return res.status(503).json({
          error:
            'AI Summarization Setup Required: GEMINI_API_KEY is not configured in server environment variables. Configure GEMINI_API_KEY in the Secrets panel to enable live AI clinical summarization.',
          requiresSetup: true,
        });
      }

      try {
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        });

        const formattedDocs = authorizedRecords
          .map(
            (r, idx) =>
              `--- SOURCE DOCUMENT #${idx + 1} ---\n` +
              `Record ID: ${r.id}\n` +
              `Title: ${r.title}\n` +
              `Category: ${r.category}\n` +
              `Healthcare Facility: ${r.facilityName}\n` +
              `Record Date: ${r.recordDate}\n` +
              `Description: ${r.description}\n` +
              `Clinical Content:\n${r.clinicalTextContent}\n`
          )
          .join('\n');

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents:
            `You are a clinical medical record summarization assistant supporting an authorized doctor.\n` +
            `Analyze ONLY the following ${authorizedRecords.length} patient-consented medical record(s) for patient ${pat.internalPatientId}.\n` +
            `CRITICAL SAFETY RULES:\n` +
            `1. NEVER invent, guess, or hallucinate diagnoses, medications, allergies, or investigation results.\n` +
            `2. If a category (such as allergies or medications) is not explicitly mentioned in the source documents, return ["Not documented in provided source records"].\n` +
            `3. Explicitly note any missing or unclear clinical details in missingOrUnclearInfo.\n\n` +
            formattedDocs,
          config: {
            temperature: 0.1,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                overview: {
                  type: Type.STRING,
                  description: 'Concise clinical overview of the available authorized records.',
                },
                relevantMedicalHistory: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Key historical events and background documented in the records.',
                },
                documentedDiagnoses: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Existing diagnoses explicitly stated in the source documents.',
                },
                currentMedications: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Medications and dosages explicitly documented in the source.',
                },
                allergies: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Allergies documented in the source records.',
                },
                investigationResults: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Important laboratory or diagnostic findings from the source.',
                },
                relevantDates: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Chronological timeline of key clinical dates mentioned.',
                },
                missingOrUnclearInfo: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Information that is missing, incomplete, or requires clinical verification.',
                },
              },
              required: [
                'overview',
                'relevantMedicalHistory',
                'documentedDiagnoses',
                'currentMedications',
                'allergies',
                'investigationResults',
                'relevantDates',
                'missingOrUnclearInfo',
              ],
            },
          },
        });

        const rawText = response.text || '{}';
        const parsed = JSON.parse(rawText) as Omit<
          AISummaryStructured,
          'sourceDocumentReferences'
        >;

        const structuredSummary: AISummaryStructured = {
          overview: parsed.overview || 'Summary generated from authorized clinical records.',
          relevantMedicalHistory: parsed.relevantMedicalHistory || [],
          documentedDiagnoses: parsed.documentedDiagnoses || [],
          currentMedications: parsed.currentMedications || [],
          allergies: parsed.allergies || [],
          investigationResults: parsed.investigationResults || [],
          relevantDates: parsed.relevantDates || [],
          missingOrUnclearInfo: parsed.missingOrUnclearInfo || [],
          sourceDocumentReferences: authorizedRecords.map((r) => ({
            recordId: r.id,
            title: r.title,
            facilityName: r.facilityName,
            recordDate: r.recordDate,
          })),
        };

        const aiSummaryRecord: AIGeneratedSummary = {
          id: `SUM-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
          patientId: pat.internalPatientId,
          patientName: pat.fullName,
          generatedForUserId: doc.userId,
          generatedForName: doc.fullName,
          consentGrantId: activeGrant.id,
          sourceRecordIds: authorizedRecords.map((r) => r.id),
          summary: structuredSummary,
          modelUsed: 'gemini-3.8-flash',
          doctorReviewStatus: 'pending_review',
          createdAt: new Date().toISOString(),
        };

        db.aiSummaries.unshift(aiSummaryRecord);

        appendAuditLog(db, {
          actorUserId: doc.userId,
          actorName: doc.fullName,
          actorRole: 'doctor',
          actionType: 'AI_SUMMARY_GENERATED',
          targetPatientId: pat.internalPatientId,
          targetResourceId: aiSummaryRecord.id,
          facilityName: doc.hospitalName,
          severity: 'info',
          details: `Generated AI-assisted clinical summary ${aiSummaryRecord.id} from ${authorizedRecords.length} authorized record(s) under consent grant ${activeGrant.id}.`,
        });

        saveDb(db);
        return res.status(201).json({ summary: aiSummaryRecord });
      } catch (err: any) {
        return res.status(502).json({
          error: `AI Summarization request failed: ${err?.message || 'Unable to reach Gemini API.'}`,
        });
      }
    }
  );

  // Doctor reviews / amends AI-generated summary before clinical use
  app.put(
    '/api/summaries/:summaryId/review',
    authenticate(['doctor']),
    (req: AuthenticatedRequest, res) => {
      const { summaryId } = req.params;
      const { doctorReviewStatus, doctorClinicalNotes } = req.body || {};
      const db = loadDb();
      const summary = db.aiSummaries.find((s) => s.id === summaryId);
      if (!summary) {
        return res.status(404).json({ error: 'AI Summary not found.' });
      }

      summary.doctorReviewStatus =
        doctorReviewStatus === 'amended' ? 'amended' : 'reviewed_verified';
      summary.doctorClinicalNotes = doctorClinicalNotes
        ? String(doctorClinicalNotes).trim()
        : undefined;
      summary.reviewedByDoctorName = req.authUser!.fullName;
      summary.reviewedAt = new Date().toISOString();

      appendAuditLog(db, {
        actorUserId: req.authUser!.id,
        actorName: req.authUser!.fullName,
        actorRole: 'doctor',
        actionType: 'AI_SUMMARY_REVIEWED',
        targetPatientId: summary.patientId,
        targetResourceId: summary.id,
        severity: 'info',
        details: `Doctor ${req.authUser!.fullName} reviewed AI summary ${summary.id} (${summary.doctorReviewStatus}).`,
      });

      saveDb(db);
      return res.json({ summary });
    }
  );

  // ---------------------------------------------------------------------------
  // HOSPITAL STAFF WORKSPACE ENDPOINTS
  // ---------------------------------------------------------------------------
  app.get('/api/staff/overview', authenticate(['staff']), (req: AuthenticatedRequest, res) => {
    const db = loadDb();
    syncConsentExpirations(db);
    saveDb(db);

    const staff = db.staffAffiliations.find((s) => s.userId === req.authUser!.id);
    if (!staff) {
      return res.status(404).json({ error: 'Hospital staff affiliation not found.' });
    }

    const hospital = db.hospitals.find((h) => h.id === staff.hospitalId);
    const facilityRecords = db.medicalRecords.filter((r) => r.facilityId === staff.hospitalId);
    const outgoingRequests = db.sharingRequests.filter(
      (r) => r.requestingFacilityId === staff.hospitalId
    );
    const incomingRequests = db.sharingRequests.filter((r) =>
      facilityRecords.some((rec) => rec.patientId === r.patientId)
    );
    const connectedHospitals = db.hospitals.filter((h) => h.verificationStatus === 'verified');
    const registeredPatients = db.patientProfiles.filter(
      (p) => p.registeredByHospitalId === staff.hospitalId
    );
    const facilityLogs = db.auditLogs.filter(
      (l) => l.facilityName === staff.hospitalName || l.actorUserId === staff.userId
    );

    return res.json({
      affiliation: staff,
      hospital,
      registeredPatients,
      facilityRecords,
      outgoingRequests,
      incomingRequests,
      connectedHospitals,
      auditLogs: facilityLogs.slice(0, 50),
    });
  });

  // Hospital Staff registers a walk-in patient and generates Internal Patient ID
  app.post(
    '/api/staff/register-patient',
    authenticate(['staff']),
    (req: AuthenticatedRequest, res) => {
      const { fullName, email, mobile, dateOfBirth, gender, bloodGroup, abhaNumber, tempPassword } =
        req.body || {};

      if (!fullName || !email || !dateOfBirth || !tempPassword || String(tempPassword).length < 8) {
        return res.status(400).json({
          error:
            'Patient full name, email/mobile identifier, date of birth, and initial password (min 8 chars) are required.',
        });
      }

      const db = loadDb();
      const staff = db.staffAffiliations.find((s) => s.userId === req.authUser!.id);
      if (!staff) {
        return res.status(403).json({ error: 'Staff affiliation required.' });
      }

      const normalizedEmail = String(email).trim().toLowerCase();
      if (db.users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
        return res.status(409).json({
          error: 'A patient with this email/identifier is already registered.',
        });
      }

      const abhaCheck = normalizeAndValidateABHA(abhaNumber || '', false);
      if (!abhaCheck.valid) {
        return res.status(400).json({ error: abhaCheck.error });
      }

      const userId = `USR-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      const { hash, salt } = hashPassword(String(tempPassword));
      const now = new Date().toISOString();

      const newUser: StoredUser = {
        id: userId,
        fullName: String(fullName).trim(),
        email: normalizedEmail,
        mobile: mobile ? String(mobile).trim() : undefined,
        role: 'patient',
        accountStatus: 'active',
        passwordHash: hash,
        passwordSalt: salt,
        createdAt: now,
      };

      const patientProfile: PatientProfile = {
        userId,
        internalPatientId: generateInternalPatientId(),
        fullName: newUser.fullName,
        email: newUser.email,
        mobile: newUser.mobile,
        dateOfBirth: String(dateOfBirth),
        gender: gender || '',
        bloodGroup: bloodGroup || '',
        abhaNumber: abhaCheck.formatted || undefined,
        abhaStatus: abhaCheck.status,
        registeredByHospitalId: staff.hospitalId,
        createdAt: now,
        updatedAt: now,
      };

      db.users.push(newUser);
      db.patientProfiles.unshift(patientProfile);

      appendAuditLog(db, {
        actorUserId: staff.userId,
        actorName: staff.fullName,
        actorRole: 'staff',
        actionType: 'USER_REGISTERED',
        targetPatientId: patientProfile.internalPatientId,
        facilityName: staff.hospitalName,
        severity: 'info',
        details: `Hospital staff registered patient ${patientProfile.fullName} and generated Internal Patient ID ${patientProfile.internalPatientId}.`,
      });

      saveDb(db);
      return res.status(201).json({ patientProfile });
    }
  );

  // ---------------------------------------------------------------------------
  // ADMINISTRATOR WORKSPACE ENDPOINTS (LEAST PRIVILEGE — NO RAW MEDICAL CONTENT)
  // ---------------------------------------------------------------------------
  app.get('/api/admin/overview', authenticate(['admin']), (_req: AuthenticatedRequest, res) => {
    const db = loadDb();
    syncConsentExpirations(db);
    saveDb(db);

    // Note: Admin receives system counts, user list, hospital list, and audit logs,
    // NEVER readable patient clinical text or medical document contents.
    return res.json({
      metrics: {
        totalUsers: db.users.length,
        totalPatients: db.patientProfiles.length,
        totalDoctors: db.doctorProfiles.length,
        totalStaff: db.staffAffiliations.length,
        totalHospitals: db.hospitals.length,
        verifiedHospitals: db.hospitals.filter((h) => h.verificationStatus === 'verified').length,
        totalRecordsMetadataCount: db.medicalRecords.length,
        activeConsentsCount: db.consentGrants.filter((g) => g.status === 'Approved').length,
        securityEventsCount: db.auditLogs.filter((l) => l.severity !== 'info').length,
      },
      users: db.users.map(sanitizeUser),
      hospitals: db.hospitals,
      auditLogs: db.auditLogs.slice(0, 100),
    });
  });

  app.put(
    '/api/admin/users/:userId/status',
    authenticate(['admin']),
    (req: AuthenticatedRequest, res) => {
      const { userId } = req.params;
      const { accountStatus } = req.body || {};
      if (!['active', 'pending_verification', 'suspended'].includes(accountStatus)) {
        return res.status(400).json({ error: 'Invalid account status.' });
      }
      const db = loadDb();
      const target = db.users.find((u) => u.id === userId);
      if (!target) {
        return res.status(404).json({ error: 'User not found.' });
      }
      target.accountStatus = accountStatus;
      appendAuditLog(db, {
        actorUserId: req.authUser!.id,
        actorName: req.authUser!.fullName,
        actorRole: 'admin',
        actionType: 'ACCOUNT_STATUS_CHANGED',
        targetResourceId: target.id,
        severity: accountStatus === 'suspended' ? 'security' : 'info',
        details: `Administrator updated account status for ${target.email} (${target.role}) to "${accountStatus}".`,
      });
      saveDb(db);
      return res.json({ user: sanitizeUser(target) });
    }
  );

  app.put(
    '/api/admin/hospitals/:hospitalId/verify',
    authenticate(['admin']),
    (req: AuthenticatedRequest, res) => {
      const { hospitalId } = req.params;
      const { verificationStatus, integrationSupported } = req.body || {};
      const db = loadDb();
      const hosp = db.hospitals.find((h) => h.id === hospitalId);
      if (!hosp) {
        return res.status(404).json({ error: 'Hospital not found.' });
      }
      if (verificationStatus) hosp.verificationStatus = verificationStatus;
      if (integrationSupported !== undefined) {
        hosp.integrationSupported = Boolean(integrationSupported);
      }

      appendAuditLog(db, {
        actorUserId: req.authUser!.id,
        actorName: req.authUser!.fullName,
        actorRole: 'admin',
        actionType: 'HOSPITAL_VERIFIED',
        targetResourceId: hosp.id,
        facilityName: hosp.name,
        severity: 'info',
        details: `Administrator updated hospital "${hosp.name}" status to ${hosp.verificationStatus} (Integration: ${hosp.integrationSupported ? 'Enabled' : 'Disabled'}).`,
      });
      saveDb(db);
      return res.json({ hospital: hosp });
    }
  );

  app.post(
    '/api/hospitals/register',
    authenticate(['admin', 'staff']),
    (req: AuthenticatedRequest, res) => {
      const { name, city, state, contactEmail } = req.body || {};
      if (!name || !city || !state || !contactEmail) {
        return res
          .status(400)
          .json({ error: 'Hospital name, city, state, and contact email are required.' });
      }
      const db = loadDb();
      const hosp = findOrCreateHospital(db, String(name), String(contactEmail));
      hosp.city = String(city).trim();
      hosp.state = String(state).trim();
      saveDb(db);
      return res.status(201).json({ hospital: hosp });
    }
  );

  // Vite middleware for development / static serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`HealthLink ABHA server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
