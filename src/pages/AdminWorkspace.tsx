import React, { useEffect, useState, useCallback } from 'react';
import {
  ShieldCheck,
  Users,
  Building2,
  History,
  Settings,
  LogOut,
  Lock,
  X,
} from 'lucide-react';
import { apiRequest } from '../services/api';
import type { AppPage, AuditLog, Hospital, User } from '../types/models';

interface AdminWorkspaceProps {
  token: string;
  currentUser: User;
  activeSubPage: AppPage;
  onNavigate: (page: AppPage) => void;
  onLogout: () => void;
}

type AdminTab = 'overview' | 'users' | 'hospitals' | 'audit' | 'config';

export const AdminWorkspace: React.FC<AdminWorkspaceProps> = ({
  token,
  currentUser,
  activeSubPage,
  onNavigate,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>(
    activeSubPage === 'hospital-management'
      ? 'hospitals'
      : activeSubPage === 'audit-logs'
      ? 'audit'
      : activeSubPage === 'settings'
      ? 'config'
      : 'overview'
  );
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const [metrics, setMetrics] = useState({
    totalUsers: 0,
    totalPatients: 0,
    totalDoctors: 0,
    totalStaff: 0,
    totalHospitals: 0,
    verifiedHospitals: 0,
    totalRecordsMetadataCount: 0,
    activeConsentsCount: 0,
    securityEventsCount: 0,
  });
  const [users, setUsers] = useState<User[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [systemStatus, setSystemStatus] = useState<{
    aiConfigured: boolean;
    abdmConfigured: boolean;
    emailSmsGatewayConfigured: boolean;
  } | null>(null);

  const fetchAdminData = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [overviewData, sysData] = await Promise.all([
        apiRequest('/api/admin/overview', {}, token),
        apiRequest('/api/system/status'),
      ]);
      setMetrics(overviewData.metrics);
      setUsers(overviewData.users || []);
      setHospitals(overviewData.hospitals || []);
      setAuditLogs(overviewData.auditLogs || []);
      setSystemStatus(sysData);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load administrator console.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  const handleUpdateUserStatus = async (
    userId: string,
    accountStatus: 'active' | 'suspended'
  ) => {
    try {
      await apiRequest(
        `/api/admin/users/${userId}/status`,
        {
          method: 'PUT',
          body: JSON.stringify({ accountStatus }),
        },
        token
      );
      setFeedbackMsg(`Updated user account status to ${accountStatus}.`);
      await fetchAdminData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Unable to update user status.');
    }
  };

  const handleUpdateHospital = async (
    hospitalId: string,
    verificationStatus: 'verified' | 'suspended',
    integrationSupported: boolean
  ) => {
    try {
      await apiRequest(
        `/api/admin/hospitals/${hospitalId}/verify`,
        {
          method: 'PUT',
          body: JSON.stringify({ verificationStatus, integrationSupported }),
        },
        token
      );
      setFeedbackMsg('Updated hospital verification and integration status.');
      await fetchAdminData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Unable to update hospital.');
    }
  };

  return (
    <div className="min-h-[calc(100vh-65px)] bg-slate-50 flex flex-col lg:flex-row">
      {/* Admin Sidebar */}
      <aside className="w-full lg:w-64 bg-white border-b lg:border-b-0 lg:border-r border-slate-200 shrink-0 flex flex-col justify-between p-4">
        <div className="space-y-4">
          <div className="px-3 py-2.5 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-xs font-medium text-slate-500">System Governance</p>
            <p className="text-sm font-bold text-slate-900 truncate">{currentUser.fullName}</p>
            <p className="text-xs font-mono text-sky-700">Least-Privilege Admin</p>
          </div>

          <nav aria-label="Administrator Sidebar Navigation" className="space-y-1">
            {(
              [
                { id: 'overview', label: 'System Overview', icon: ShieldCheck, page: 'admin-dashboard' },
                { id: 'users', label: 'User & Role Management', icon: Users },
                {
                  id: 'hospitals',
                  label: 'Hospital Verification',
                  icon: Building2,
                  page: 'hospital-management',
                },
                { id: 'audit', label: 'Security & Audit Logs', icon: History, page: 'audit-logs' },
                { id: 'config', label: 'Application Configuration', icon: Settings, page: 'settings' },
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
        <div className="p-3.5 rounded-lg bg-slate-100 border border-slate-200 flex items-center gap-2.5 text-xs text-slate-700">
          <Lock className="w-4 h-4 text-sky-700 shrink-0" />
          <span>
            <strong>Least-Privilege Governance Policy:</strong> Administrators manage accounts,
            hospital verification, and security logs. Readable patient clinical documents are
            cryptographically isolated and inaccessible from the administrator console.
          </span>
        </div>

        {errorMsg && (
          <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm flex justify-between">
            <span>{errorMsg}</span>
            <button type="button" onClick={() => setErrorMsg(null)}>
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {feedbackMsg && (
          <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex justify-between">
            <span>{feedbackMsg}</span>
            <button type="button" onClick={() => setFeedbackMsg(null)}>
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {loading ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-sm text-slate-500">
            Loading administrator governance console...
          </div>
        ) : (
          <>
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                  Administrator Governance Dashboard
                </h1>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white border border-slate-200 rounded-xl p-5">
                    <p className="text-xs font-medium text-slate-500">Total Registered Accounts</p>
                    <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
                      {metrics.totalUsers}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Patients: {metrics.totalPatients} · Doctors: {metrics.totalDoctors} · Staff:{' '}
                      {metrics.totalStaff}
                    </p>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-5">
                    <p className="text-xs font-medium text-slate-500">Participating Hospitals</p>
                    <p className="text-2xl font-bold font-mono tabular-nums text-sky-700 mt-1">
                      {metrics.totalHospitals}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Verified: {metrics.verifiedHospitals}
                    </p>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-5">
                    <p className="text-xs font-medium text-slate-500">Active Consents & Audit</p>
                    <p className="text-2xl font-bold font-mono tabular-nums text-emerald-700 mt-1">
                      {metrics.activeConsentsCount}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Security Events: {metrics.securityEventsCount}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'users' && (
              <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 font-semibold">
                      <th className="p-4">Name & ID</th>
                      <th className="p-4">Email</th>
                      <th className="p-4">Role</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {users.map((u) => (
                      <tr key={u.id}>
                        <td className="p-4">
                          <p className="font-semibold text-slate-900">{u.fullName}</p>
                          <p className="text-xs font-mono text-slate-500">{u.id}</p>
                        </td>
                        <td className="p-4 text-slate-600">{u.email}</td>
                        <td className="p-4 font-mono text-xs">{u.role}</td>
                        <td className="p-4 font-semibold">
                          <span
                            className={
                              u.accountStatus === 'active' ? 'text-emerald-700' : 'text-red-700'
                            }
                          >
                            {u.accountStatus}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          {u.id !== currentUser.id && (
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateUserStatus(
                                  u.id,
                                  u.accountStatus === 'active' ? 'suspended' : 'active'
                                )
                              }
                              className="px-3 py-1 text-xs font-semibold border border-slate-300 rounded-md hover:bg-slate-50"
                            >
                              {u.accountStatus === 'active' ? 'Suspend' : 'Activate'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'hospitals' && (
              <div className="space-y-4">
                <h1 className="text-xl font-bold text-slate-900">
                  Hospital Verification & Integration Management
                </h1>
                {hospitals.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-xs text-slate-500">
                    No connected hospitals registered yet.
                  </div>
                ) : (
                  <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs sm:text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 font-semibold">
                          <th className="p-4">Hospital Name</th>
                          <th className="p-4">Facility Code</th>
                          <th className="p-4">Verification</th>
                          <th className="p-4">Exchange Integration</th>
                          <th className="p-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {hospitals.map((h) => (
                          <tr key={h.id}>
                            <td className="p-4 font-semibold text-slate-900">{h.name}</td>
                            <td className="p-4 font-mono text-xs">{h.facilityCode}</td>
                            <td className="p-4">{h.verificationStatus}</td>
                            <td className="p-4">
                              {h.integrationSupported ? 'Supported' : 'Disabled'}
                            </td>
                            <td className="p-4 text-right">
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateHospital(
                                    h.id,
                                    h.verificationStatus === 'verified' ? 'suspended' : 'verified',
                                    !h.integrationSupported
                                  )
                                }
                                className="px-3 py-1 text-xs font-semibold border border-slate-300 rounded-md hover:bg-slate-50"
                              >
                                Toggle Status
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

            {activeTab === 'audit' && (
              <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 font-semibold">
                      <th className="p-4">Timestamp</th>
                      <th className="p-4">Action</th>
                      <th className="p-4">Actor</th>
                      <th className="p-4">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {auditLogs.map((l) => (
                      <tr key={l.id}>
                        <td className="p-4 font-mono text-xs text-slate-500 whitespace-nowrap">
                          {new Date(l.timestamp).toLocaleString()}
                        </td>
                        <td className="p-4 font-mono text-xs font-semibold">{l.actionType}</td>
                        <td className="p-4">
                          {l.actorName} ({l.actorRole})
                        </td>
                        <td className="p-4 text-slate-600">{l.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'config' && (
              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <h1 className="text-xl font-bold text-slate-900">
                  System & Integration Configuration Status
                </h1>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs sm:text-sm">
                  <div className="p-4 rounded-lg border border-slate-200 space-y-1">
                    <p className="font-bold text-slate-900">Gemini AI Summarization API</p>
                    <p
                      className={
                        systemStatus?.aiConfigured ? 'text-emerald-700' : 'text-amber-700'
                      }
                    >
                      {systemStatus?.aiConfigured
                        ? 'Configured (Server-Side GEMINI_API_KEY Active)'
                        : 'Requires GEMINI_API_KEY in Server Environment'}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border border-slate-200 space-y-1">
                    <p className="font-bold text-slate-900">ABDM Live Gateway Integration</p>
                    <p className="text-amber-700">
                      Sandbox/Live Gateway Not Connected (ABHA numbers marked Unverified)
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border border-slate-200 space-y-1">
                    <p className="font-bold text-slate-900">Email / SMS OTP Verification</p>
                    <p className="text-amber-700">
                      Requires SMTP / SMS Provider Setup
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};
