// MindFit v2 Admin - Sidebar Component
// Campaign 1 - Admin Dashboard Scaffolding
// Classification: TIER-1

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { AdminUser } from '../types';

interface SidebarProps {
  currentUser: AdminUser | null;
}

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  roles?: Array<'admin' | 'supervisor' | 'therapist' | 'staff' | 'readonly'>;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentUser }) => {
  const location = useLocation();

  const navItems: NavItem[] = [
    {
      path: '/admin',
      label: 'Dashboard',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
          <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z"></path>
          <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z"></path>
        </svg>
      ),
    },
    {
      path: '/admin/referrals',
      label: 'Referrals',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"></path>
        </svg>
      ),
      roles: ['admin', 'supervisor', 'therapist'],
    },
    {
      path: '/admin/intake-packages',
      label: 'Intake Packages',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
          <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1H8a3 3 0 00-3 3v1.5a1.5 1.5 0 01-3 0V6z" clipRule="evenodd"></path>
          <path d="M6 12a2 2 0 012-2h8a2 2 0 012 2v2a2 2 0 01-2 2H2h2a2 2 0 002-2v-2z"></path>
        </svg>
      ),
      roles: ['admin', 'supervisor'],
    },
    {
      path: '/admin/events',
      label: 'Events',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
          <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"></path>
        </svg>
      ),
      roles: ['admin', 'staff'],
    },
    {
      path: '/admin/flyers',
      label: 'Flyers',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
          <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd"></path>
        </svg>
      ),
      roles: ['admin', 'staff'],
    },
  ];

  // Filter nav items based on user role
  const visibleNavItems = navItems.filter((item) => {
    if (!item.roles) return true; // No role restriction
    if (!currentUser) return false; // Not logged in
    return item.roles.includes(currentUser.role);
  });

  const isActive = (path: string) => {
    if (path === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <aside
      id="sidebar"
      className="fixed top-0 left-0 z-20 w-64 h-screen pt-20 transition-transform -translate-x-full bg-white border-r border-gray-200 lg:translate-x-0"
      aria-label="Sidebar"
    >
      <div className="h-full px-3 pb-4 overflow-y-auto bg-white">
        <ul className="space-y-2 font-medium">
          {visibleNavItems.map((item) => (
            <li key={item.path}>
              <Link
                to={item.path}
                className={`flex items-center p-2 rounded-lg group ${
                  isActive(item.path)
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-900 hover:bg-gray-100'
                }`}
              >
                <span
                  className={`${
                    isActive(item.path) ? 'text-blue-700' : 'text-gray-500 group-hover:text-gray-900'
                  }`}
                >
                  {item.icon}
                </span>
                <span className="ml-3">{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>

        {/* Divider */}
        <hr className="my-4 border-gray-200" />

        {/* Secondary Nav */}
        <ul className="space-y-2 font-medium">
          <li>
            <a
              href="https://mindfithealth.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center p-2 text-gray-900 rounded-lg hover:bg-gray-100 group"
            >
              <svg
                className="w-5 h-5 text-gray-500 group-hover:text-gray-900"
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z"></path>
                <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z"></path>
              </svg>
              <span className="ml-3">Public Site</span>
            </a>
          </li>
        </ul>

        {/* Version Info */}
        <div className="absolute bottom-4 left-3 right-3">
          <div className="px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-500">MindFit Admin v2.0</p>
            <p className="text-xs text-gray-400">Campaign 1 - TIER-1</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
