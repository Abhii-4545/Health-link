import React, { useState } from 'react';
import {
  UserPlus,
  LogIn,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
  ArrowLeft,
} from 'lucide-react';
import { apiRequest } from '../services/api';
import type { AppPage, User, UserRole } from '../types/models';

interface AuthPagesProps {
  mode: 'signin' | 'signup' | 'forgot-password';
  onNavigate: (page: AppPage) => void;
  onAuthSuccess: (token: string, user: User) => void;
}

export const AuthPages: React.FC<AuthPagesProps> = ({
  mode,
  onNavigate,
  onAuthSuccess,
}) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>('patient');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [abhaNumber, setAbhaNumber] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [specialization, setSpecialization] = useState('General Medicine');
  const [hospitalName, setHospitalName] = useState('');
  const [requestedRole, setRequestedRole] = useState('Medical Records Officer');
  const [adminSetupKey, setAdminSetupKey] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Forgot password state
  const [resetVerificationFactor, setResetVerificationFactor] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    if (!email.trim() || !password) {
      setErrorMsg('Please enter both your email/identifier and password.');
      return;
    }
    setLoading(true);
    try {
      const data = await apiRequest<{ token: string; user: User }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), password }),
      });
      onAuthSuccess(data.token, data.user);
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      const data = await apiRequest<{ token: string; user: User }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          role: selectedRole,
          fullName,
          email,
          mobile,
          dateOfBirth,
          gender,
          bloodGroup,
          abhaNumber,
          registrationNumber,
          specialization,
          hospitalName,
          requestedRole,
          adminSetupKey,
          password,
          confirmPassword,
        }),
      });
      onAuthSuccess(data.token, data.user);
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed. Please check all required fields.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      const res = await apiRequest<{ message: string }>('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          email,
          dateOfBirthOrRegNo: resetVerificationFactor,
          newPassword,
        }),
      });
      setSuccessMsg(res.message);
      setNewPassword('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Password reset failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-140px)] bg-slate-50 py-12 px-6 flex flex-col justify-center">
      <div className="max-w-xl w-full mx-auto">
        <button
          type="button"
          onClick={() => onNavigate('landing')}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 mb-6"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Home</span>
        </button>

        <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
          {/* Header */}
          <div className="border-b border-slate-200 pb-5 mb-6">
            <div className="flex items-center gap-2 text-sky-700 text-xs font-semibold mb-1">
              {mode === 'signin' && <LogIn className="w-4 h-4" />}
              {mode === 'signup' && <UserPlus className="w-4 h-4" />}
              {mode === 'forgot-password' && <KeyRound className="w-4 h-4" />}
              <span>HealthLink ABHA Authentication</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              {mode === 'signin' && 'Sign In to Your Workspace'}
              {mode === 'signup' && 'Create a New Account'}
              {mode === 'forgot-password' && 'Reset Your Password'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              {mode === 'signin' &&
                'Access your role-isolated healthcare portal. No preloaded accounts exist—create an account first if you are new.'}
              {mode === 'signup' &&
                'Select your role below to register. All fields are validated and passwords are encrypted with salted scrypt hashing.'}
              {mode === 'forgot-password' &&
                'Verify your registered identifier and secondary credential to set a new password.'}
            </p>
          </div>

          {errorMsg && (
            <div
              role="alert"
              className="mb-6 p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div
              role="status"
              className="mb-6 p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-start gap-2.5"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p>{successMsg}</p>
                <button
                  type="button"
                  onClick={() => onNavigate('signin')}
                  className="text-xs font-semibold text-emerald-900 underline"
                >
                  Proceed to Sign In →
                </button>
              </div>
            </div>
          )}

          {/* SIGN IN FORM */}
          {mode === 'signin' && (
            <form onSubmit={handleSignIn} className="space-y-4" noValidate>
              <div>
                <label
                  htmlFor="signin-email"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Email or Mobile Identifier
                </label>
                <input
                  id="signin-email"
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@hospital.org or mobile number"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-700"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="signin-password"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMsg(null);
                      onNavigate('forgot-password');
                    }}
                    className="text-xs font-medium text-sky-700 hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <input
                  id="signin-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-700"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-sky-700 rounded-lg hover:bg-sky-800 disabled:opacity-60 transition-colors"
              >
                {loading ? 'Authenticating...' : 'Sign In'}
              </button>

              <div className="pt-4 border-t border-slate-200 text-center text-xs text-slate-600">
                Don’t have an account yet?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg(null);
                    onNavigate('signup');
                  }}
                  className="font-semibold text-sky-700 hover:underline"
                >
                  Create Account
                </button>
              </div>
            </form>
          )}

          {/* CREATE ACCOUNT FORM */}
          {mode === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-4" noValidate>
              {/* Role Selection Segmented Control */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Select Account Role
                </label>
                <div
                  role="group"
                  aria-label="Account Role"
                  className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-slate-100 rounded-lg"
                >
                  {(
                    [
                      { id: 'patient', label: 'Patient' },
                      { id: 'doctor', label: 'Doctor' },
                      { id: 'staff', label: 'Hospital Staff' },
                      { id: 'admin', label: 'Admin Setup' },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setSelectedRole(tab.id);
                        setErrorMsg(null);
                      }}
                      className={`py-2 px-2.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                        selectedRole === tab.id
                          ? 'bg-white text-sky-800 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Common Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="signup-fullname"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Full Name *
                  </label>
                  <input
                    id="signup-fullname"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={selectedRole === 'doctor' ? 'Dr. Full Name' : 'Full Name'}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-700"
                  />
                </div>

                <div>
                  <label
                    htmlFor="signup-email"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    {selectedRole === 'patient' ? 'Email or Mobile Number *' : 'Institutional Email *'}
                  </label>
                  <input
                    id="signup-email"
                    type="text"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={
                      selectedRole === 'patient'
                        ? 'patient@example.com or 10-digit mobile'
                        : 'professional@hospital.org'
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-700"
                  />
                </div>
              </div>

              {/* Role-Specific Fields: PATIENT */}
              {selectedRole === 'patient' && (
                <div className="space-y-4 pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label
                        htmlFor="signup-dob"
                        className="block text-xs font-semibold text-slate-700 mb-1"
                      >
                        Date of Birth *
                      </label>
                      <input
                        id="signup-dob"
                        type="date"
                        required
                        value={dateOfBirth}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-700"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="signup-gender"
                        className="block text-xs font-semibold text-slate-700 mb-1"
                      >
                        Gender (Optional)
                      </label>
                      <select
                        id="signup-gender"
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-sky-700"
                      >
                        <option value="">Select</option>
                        <option value="Female">Female</option>
                        <option value="Male">Male</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="signup-blood"
                        className="block text-xs font-semibold text-slate-700 mb-1"
                      >
                        Blood Group
                      </label>
                      <select
                        id="signup-blood"
                        value={bloodGroup}
                        onChange={(e) => setBloodGroup(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-sky-700"
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

                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                    <label
                      htmlFor="signup-abha"
                      className="block text-xs font-semibold text-slate-800"
                    >
                      Optional ABHA Number Linking (14 Digits)
                    </label>
                    <input
                      id="signup-abha"
                      type="text"
                      value={abhaNumber}
                      onChange={(e) => setAbhaNumber(e.target.value)}
                      placeholder="XX-XXXX-XXXX-XXXX (Leave blank to use Internal Patient ID only)"
                      className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-sky-700"
                    />
                    <p className="text-xs text-slate-500 leading-relaxed">
                      An Internal Patient ID (<span className="font-mono">HL-PAT-2026-XXXXXX</span>)
                      is generated automatically. User-entered ABHA numbers are marked{' '}
                      <strong className="font-medium text-amber-800">
                        Unverified (Pending ABDM Gateway Verification)
                      </strong>{' '}
                      until live gateway authentication is configured.
                    </p>
                  </div>
                </div>
              )}

              {/* Role-Specific Fields: DOCTOR */}
              {selectedRole === 'doctor' && (
                <div className="space-y-4 pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="signup-regno"
                        className="block text-xs font-semibold text-slate-700 mb-1"
                      >
                        Medical Registration Number *
                      </label>
                      <input
                        id="signup-regno"
                        type="text"
                        required
                        value={registrationNumber}
                        onChange={(e) => setRegistrationNumber(e.target.value)}
                        placeholder="e.g., MMC-2021-48291"
                        className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:border-sky-700"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="signup-spec"
                        className="block text-xs font-semibold text-slate-700 mb-1"
                      >
                        Clinical Specialization
                      </label>
                      <input
                        id="signup-spec"
                        type="text"
                        value={specialization}
                        onChange={(e) => setSpecialization(e.target.value)}
                        placeholder="e.g., Cardiology, Internal Medicine"
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-700"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="signup-doc-hospital"
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      Hospital Affiliation *
                    </label>
                    <input
                      id="signup-doc-hospital"
                      type="text"
                      required
                      value={hospitalName}
                      onChange={(e) => setHospitalName(e.target.value)}
                      placeholder="Name of participating hospital or clinic"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-700"
                    />
                  </div>
                </div>
              )}

              {/* Role-Specific Fields: HOSPITAL STAFF */}
              {selectedRole === 'staff' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label
                      htmlFor="signup-staff-hospital"
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      Hospital Affiliation *
                    </label>
                    <input
                      id="signup-staff-hospital"
                      type="text"
                      required
                      value={hospitalName}
                      onChange={(e) => setHospitalName(e.target.value)}
                      placeholder="Hospital or Healthcare Facility Name"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-700"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="signup-staff-role"
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      Requested Staff Role *
                    </label>
                    <select
                      id="signup-staff-role"
                      value={requestedRole}
                      onChange={(e) => setRequestedRole(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-sky-700"
                    >
                      <option value="Medical Records Officer">Medical Records Officer</option>
                      <option value="Front Desk Registration Coordinator">
                        Front Desk Registration Coordinator
                      </option>
                      <option value="Diagnostic & Lab Coordinator">
                        Diagnostic & Lab Coordinator
                      </option>
                      <option value="Health Information Manager">
                        Health Information Manager
                      </option>
                    </select>
                  </div>
                </div>
              )}

              {/* Role-Specific Fields: ADMINISTRATOR PROVISIONING */}
              {selectedRole === 'admin' && (
                <div className="p-4 rounded-lg bg-amber-50/70 border border-amber-200 space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-amber-900">
                    <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>Restricted Administrator Provisioning</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Administrator accounts cannot be self-registered without authorization. Enter
                    the server’s configured <code className="font-mono">ADMIN_SETUP_KEY</code>{' '}
                    (default demonstration key:{' '}
                    <code className="font-mono font-semibold">HEALTHLINK-ADMIN-SETUP</code>).
                  </p>
                  <div>
                    <label
                      htmlFor="signup-admin-key"
                      className="block text-xs font-semibold text-slate-800 mb-1"
                    >
                      Administrator Setup Key *
                    </label>
                    <input
                      id="signup-admin-key"
                      type="text"
                      required
                      value={adminSetupKey}
                      onChange={(e) => setAdminSetupKey(e.target.value)}
                      placeholder="Enter ADMIN_SETUP_KEY"
                      className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-sky-700"
                    />
                  </div>
                </div>
              )}

              {/* Password & Confirmation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="signup-password"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Password (Min 8 chars) *
                  </label>
                  <input
                    id="signup-password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-700"
                  />
                </div>
                <div>
                  <label
                    htmlFor="signup-confirm"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Confirm Password *
                  </label>
                  <input
                    id="signup-confirm"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-700"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-sky-700 rounded-lg hover:bg-sky-800 disabled:opacity-60 transition-colors"
              >
                {loading ? 'Creating Account...' : 'Complete Registration'}
              </button>

              <div className="pt-4 border-t border-slate-200 text-center text-xs text-slate-600">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg(null);
                    onNavigate('signin');
                  }}
                  className="font-semibold text-sky-700 hover:underline"
                >
                  Sign In
                </button>
              </div>
            </form>
          )}

          {/* FORGOT PASSWORD FORM */}
          {mode === 'forgot-password' && (
            <form onSubmit={handlePasswordReset} className="space-y-4" noValidate>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600">
                Note: External SMS/Email OTP delivery requires SMTP or SMS gateway setup. You can
                reset your password using your registered email and secondary identity attribute
                (Date of Birth for Patients, Medical Registration Number for Doctors).
              </div>

              <div>
                <label
                  htmlFor="reset-email"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Registered Email or Mobile Identifier *
                </label>
                <input
                  id="reset-email"
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your registered email"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-700"
                />
              </div>

              <div>
                <label
                  htmlFor="reset-factor"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Verification Attribute (YYYY-MM-DD Date of Birth or Medical Reg. No.) *
                </label>
                <input
                  id="reset-factor"
                  type="text"
                  required
                  value={resetVerificationFactor}
                  onChange={(e) => setResetVerificationFactor(e.target.value)}
                  placeholder="e.g., 1998-05-14 or MMC-2021-48291"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-700"
                />
              </div>

              <div>
                <label
                  htmlFor="reset-new-password"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  New Password (Min 8 characters) *
                </label>
                <input
                  id="reset-new-password"
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-sky-700"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-sky-700 rounded-lg hover:bg-sky-800 disabled:opacity-60 transition-colors"
              >
                {loading ? 'Updating Password...' : 'Reset Password'}
              </button>

              <div className="pt-4 border-t border-slate-200 text-center text-xs text-slate-600">
                Remembered your password?{' '}
                <button
                  type="button"
                  onClick={() => onNavigate('signin')}
                  className="font-semibold text-sky-700 hover:underline"
                >
                  Return to Sign In
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
