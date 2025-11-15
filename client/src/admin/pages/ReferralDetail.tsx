// MindFit v2 Admin - Referral Detail Page
// Campaign 1 - Admin Dashboard Scaffolding
// Classification: TIER-1

import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import type { Referral, IntakePackage } from '../types';

export const ReferralDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [referral, setReferral] = useState<Referral | null>(null);
  const [intakePackages, setIntakePackages] = useState<IntakePackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (id) {
      fetchReferral(id);
      fetchIntakePackages(id);
    }
  }, [id]);

  const fetchReferral = async (referralId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/referrals/${referralId}`);
      if (!response.ok) throw new Error('Failed to fetch referral');
      const data = await response.json();
      setReferral(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchIntakePackages = async (referralId: string) => {
    try {
      const response = await fetch(`/api/intake-packages?referralId=${referralId}`);
      if (!response.ok) throw new Error('Failed to fetch intake packages');
      const data = await response.json();
      setIntakePackages(data);
    } catch (err: any) {
      console.error('Failed to fetch intake packages:', err);
    }
  };

  const updateStatus = async (newStatus: Referral['status']) => {
    if (!referral) return;

    try {
      setUpdating(true);
      const response = await fetch(`/api/referrals/${referral.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error('Failed to update status');

      const updated = await response.json();
      setReferral(updated);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUpdating(false);
    }
  };

  const exportIntakePackage = async () => {
    if (!referral) return;

    try {
      setUpdating(true);
      const response = await fetch('/api/intake-packages/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referralId: referral.id }),
      });

      if (!response.ok) throw new Error('Failed to export intake package');

      const result = await response.json();
      alert(`Intake package created successfully!\nPackage ID: ${result.packageId}`);
      fetchIntakePackages(referral.id);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-2 text-sm text-gray-600">Loading referral...</p>
        </div>
      </div>
    );
  }

  if (error || !referral) {
    return (
      <div className="space-y-4">
        <Link to="/admin/referrals" className="text-blue-600 hover:text-blue-800">
          ← Back to Referrals
        </Link>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">Error: {error || 'Referral not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            to="/admin/referrals"
            className="text-blue-600 hover:text-blue-800 flex items-center"
          >
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Referral Details</h1>
            <p className="text-sm text-gray-600 mt-1">ID: {referral.id}</p>
          </div>
        </div>
        <button
          onClick={exportIntakePackage}
          disabled={updating}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:bg-green-300"
        >
          {updating ? 'Exporting...' : 'Export Intake Package'}
        </button>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Client Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Client Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Client Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Name</label>
                <p className="mt-1 text-sm text-gray-900">{referral.clientName}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Email</label>
                <p className="mt-1 text-sm text-gray-900">{referral.clientEmail}</p>
              </div>
              {referral.clientPhone && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Phone</label>
                  <p className="mt-1 text-sm text-gray-900">{referral.clientPhone}</p>
                </div>
              )}
              {referral.clientAge && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Age</label>
                  <p className="mt-1 text-sm text-gray-900">{referral.clientAge}</p>
                </div>
              )}
              {referral.insuranceProvider && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Insurance Provider</label>
                  <p className="mt-1 text-sm text-gray-900">{referral.insuranceProvider}</p>
                </div>
              )}
            </div>
          </div>

          {/* Presenting Concerns */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Presenting Concerns</h2>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{referral.presentingConcerns}</p>
          </div>

          {/* Intake Packages */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Intake Packages</h2>
            {intakePackages.length === 0 ? (
              <p className="text-sm text-gray-500">No intake packages exported yet</p>
            ) : (
              <div className="space-y-3">
                {intakePackages.map((pkg) => (
                  <div key={pkg.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{pkg.packageName}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Created: {new Date(pkg.createdAt).toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500">
                          Expires: {new Date(pkg.expiresAt).toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500">
                          Size: {(pkg.fileSizeBytes / 1024).toFixed(2)} KB
                        </p>
                      </div>
                      {pkg.downloadUrl && (
                        <a
                          href={pkg.downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                        >
                          Download
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Status & Actions */}
        <div className="space-y-6">
          {/* Status Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Status</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Current Status</label>
                <p className="mt-1 text-sm font-semibold text-gray-900 capitalize">
                  {referral.status.replace('_', ' ')}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Urgency</label>
                <p className="mt-1 text-sm font-semibold text-gray-900 capitalize">
                  {referral.urgency}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Assigned Therapist</label>
                <p className="mt-1 text-sm text-gray-900">
                  {referral.assignedTherapist || 'Not assigned'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Assigned Supervisor</label>
                <p className="mt-1 text-sm text-gray-900">
                  {referral.assignedSupervisor || 'Not assigned'}
                </p>
              </div>
            </div>
          </div>

          {/* Status Update Actions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Update Status</h2>
            <div className="space-y-2">
              <button
                onClick={() => updateStatus('under_review')}
                disabled={updating}
                className="w-full bg-blue-100 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-200 transition-colors text-sm disabled:opacity-50"
              >
                Mark Under Review
              </button>
              <button
                onClick={() => updateStatus('assigned')}
                disabled={updating}
                className="w-full bg-purple-100 text-purple-700 px-4 py-2 rounded-lg hover:bg-purple-200 transition-colors text-sm disabled:opacity-50"
              >
                Mark Assigned
              </button>
              <button
                onClick={() => updateStatus('contacted')}
                disabled={updating}
                className="w-full bg-indigo-100 text-indigo-700 px-4 py-2 rounded-lg hover:bg-indigo-200 transition-colors text-sm disabled:opacity-50"
              >
                Mark Contacted
              </button>
              <button
                onClick={() => updateStatus('completed')}
                disabled={updating}
                className="w-full bg-green-100 text-green-700 px-4 py-2 rounded-lg hover:bg-green-200 transition-colors text-sm disabled:opacity-50"
              >
                Mark Completed
              </button>
            </div>
          </div>

          {/* Metadata */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Metadata</h2>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-500">Created:</span>
                <span className="ml-2 text-gray-900">
                  {new Date(referral.createdAt).toLocaleString()}
                </span>
              </div>
              {referral.updatedAt && (
                <div>
                  <span className="text-gray-500">Updated:</span>
                  <span className="ml-2 text-gray-900">
                    {new Date(referral.updatedAt).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
