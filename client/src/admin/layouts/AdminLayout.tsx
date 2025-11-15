// MindFit v2 Admin - Admin Layout Component
// Campaign 1 - Admin Dashboard Scaffolding
// Classification: TIER-1

import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import type { AdminUser, Notification } from '../types';

interface AdminLayoutProps {
  currentUser: AdminUser | null;
  notifications: Notification[];
  onLogout: () => void;
  isAuthenticated: boolean;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  currentUser,
  notifications,
  onLogout,
  isAuthenticated,
}) => {
  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <Navbar
        currentUser={currentUser}
        notifications={notifications}
        onLogout={onLogout}
      />

      <Sidebar currentUser={currentUser} />

      <div className="p-4 lg:ml-64 pt-20">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </div>
    </div>
  );
};
