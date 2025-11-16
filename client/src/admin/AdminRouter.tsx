// MindFit v2 Admin - Router Configuration
// Campaign 1 - Admin Dashboard Scaffolding
// Classification: TIER-1

import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AdminLayout } from './layouts';
import {
  Dashboard,
  Login,
  ReferralsList,
  ReferralForm,
  ReferralDetail,
  Events,
  Flyers,
  IntakePackages,
} from './pages';
import type { AdminUser, Notification } from './types';

export const AdminRouter: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // Check if user is authenticated
      const response = await fetch('/api/admin/me');
      if (response.ok) {
        const user = await response.json();
        setCurrentUser(user);
        setIsAuthenticated(true);
      }
    } catch (err) {
      console.error('Auth check failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        const user = await response.json();
        setCurrentUser(user);
        setIsAuthenticated(true);
        return true;
      }

      return false;
    } catch (err) {
      console.error('Login failed:', err);
      return false;
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout failed:', err);
    } finally {
      setCurrentUser(null);
      setIsAuthenticated(false);
      window.location.href = '/admin/login';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 text-blue-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Login Route */}
      <Route
        path="/login"
        element={<Login onLogin={handleLogin} isAuthenticated={isAuthenticated} />}
      />

      {/* Protected Admin Routes */}
      <Route
        element={
          <AdminLayout
            currentUser={currentUser}
            notifications={notifications}
            onLogout={handleLogout}
            isAuthenticated={isAuthenticated}
          />
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="referrals" element={<ReferralsList />} />
        <Route path="referrals/new" element={<ReferralForm />} />
        <Route path="referrals/:id" element={<ReferralDetail />} />
        <Route path="events" element={<Events />} />
        <Route path="flyers" element={<Flyers />} />
        <Route path="intake-packages" element={<IntakePackages />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
};
