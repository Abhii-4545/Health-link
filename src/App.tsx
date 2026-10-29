/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { LandingPage } from './pages/LandingPage';
import { AuthPages } from './pages/AuthPages';
import { AboutAndPrivacyPages } from './pages/AboutAndPrivacyPages';
import { PatientWorkspace } from './pages/PatientWorkspace';
import { DoctorWorkspace } from './pages/DoctorWorkspace';
import { StaffWorkspace } from './pages/StaffWorkspace';
import { AdminWorkspace } from './pages/AdminWorkspace';
import { apiRequest } from './services/api';
import type { AppPage, User } from './types/models';

const SESSION_STORAGE_KEY = 'healthlink_abha_session_token';

export default function App() {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem(SESSION_STORAGE_KEY)
  );
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState<AppPage>('landing');
  const [initializing, setInitializing] = useState<boolean>(Boolean(token));

  useEffect(() => {
    if (!token) {
      setInitializing(false);
      return;
    }
    apiRequest<{ user: User }>('/api/auth/me', {}, token)
      .then((data) => {
        setCurrentUser(data.user);
      })
      .catch(() => {
        localStorage.removeItem(SESSION_STORAGE_KEY);
        setToken(null);
        setCurrentUser(null);
      })
      .finally(() => {
        setInitializing(false);
      });
  }, [token]);

  const getDefaultDashboardForRole = (user: User): AppPage => {
    switch (user.role) {
      case 'patient':
        return 'patient-dashboard';
      case 'doctor':
        return 'doctor-dashboard';
      case 'staff':
        return 'staff-dashboard';
      case 'admin':
        return 'admin-dashboard';
    }
  };

  const handleNavigate = (page: AppPage, sectionId?: string) => {
    setCurrentPage(page);
    if (sectionId) {
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 60);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleAuthSuccess = (newToken: string, user: User) => {
    localStorage.setItem(SESSION_STORAGE_KEY, newToken);
    setToken(newToken);
    setCurrentUser(user);
    setCurrentPage(getDefaultDashboardForRole(user));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = async () => {
    if (token) {
      try {
        await apiRequest('/api/auth/logout', { method: 'POST' }, token);
      } catch {
        // Ignore logout network error
      }
    }
    localStorage.removeItem(SESSION_STORAGE_KEY);
    setToken(null);
    setCurrentUser(null);
    setCurrentPage('landing');
  };

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-slate-600 text-sm">
        Verifying session state...
      </div>
    );
  }

  const isProtectedPage = ![
    'landing',
    'signin',
    'signup',
    'forgot-password',
    'about-project',
    'privacy-policy',
  ].includes(currentPage);

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900">
      <Navbar
        currentPage={currentPage}
        onNavigate={handleNavigate}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      <div className="flex-1">
        {currentPage === 'landing' && (
          <LandingPage onNavigate={handleNavigate} currentUser={currentUser} />
        )}

        {(currentPage === 'signin' ||
          currentPage === 'signup' ||
          currentPage === 'forgot-password') && (
          <AuthPages
            mode={currentPage}
            onNavigate={handleNavigate}
            onAuthSuccess={handleAuthSuccess}
          />
        )}

        {(currentPage === 'about-project' || currentPage === 'privacy-policy') && (
          <AboutAndPrivacyPages mode={currentPage} onNavigate={handleNavigate} />
        )}

        {isProtectedPage && !currentUser && (
          <AuthPages
            mode="signin"
            onNavigate={handleNavigate}
            onAuthSuccess={handleAuthSuccess}
          />
        )}

        {isProtectedPage && currentUser && token && (
          <>
            {currentUser.role === 'patient' && (
              <PatientWorkspace
                token={token}
                currentUser={currentUser}
                activeSubPage={currentPage}
                onNavigate={handleNavigate}
                onLogout={handleLogout}
              />
            )}
            {currentUser.role === 'doctor' && (
              <DoctorWorkspace
                token={token}
                currentUser={currentUser}
                activeSubPage={currentPage}
                onNavigate={handleNavigate}
                onLogout={handleLogout}
              />
            )}
            {currentUser.role === 'staff' && (
              <StaffWorkspace
                token={token}
                currentUser={currentUser}
                activeSubPage={currentPage}
                onNavigate={handleNavigate}
                onLogout={handleLogout}
              />
            )}
            {currentUser.role === 'admin' && (
              <AdminWorkspace
                token={token}
                currentUser={currentUser}
                activeSubPage={currentPage}
                onNavigate={handleNavigate}
                onLogout={handleLogout}
              />
            )}
          </>
        )}
      </div>

      {!isProtectedPage && <Footer onNavigate={handleNavigate} />}
    </div>
  );
}
