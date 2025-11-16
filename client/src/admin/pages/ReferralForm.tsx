// MindFit v2 Admin - New Referral Form
// Campaign 1 - Sprint 6.4B UAT
// Classification: TIER-1

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Referral } from '../types';

export const ReferralForm: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    clientAge: '',
    presentingConcerns: '',
    urgency: 'routine' as Referral['urgency'],
    insuranceProvider: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Convert clientAge to number if provided
      const payload: any = {
        ...formData,
        clientAge: formData.clientAge ? parseInt(formData.clientAge) : undefined,
      };

      const response = await fetch('/api/referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create referral');
      }

      const result = await response.json();

      // Navigate to the referral detail page
      if (result.referral?.id) {
        navigate(`/admin/referrals/${result.referral.id}`);
      } else {
        navigate('/admin/referrals');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/admin/referrals')}
            className="text-gray-600 hover:text-gray-900"
          >
            ← Back to Referrals
          </button>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mt-4">New Referral</h1>
        <p className="text-sm text-gray-600 mt-1">
          Create a new client referral for intake processing
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        {/* Client Information */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Client Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Client Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Client Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="clientName"
                value={formData.clientName}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter client full name"
              />
            </div>

            {/* Client Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="clientEmail"
                value={formData.clientEmail}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="client@example.com"
              />
            </div>

            {/* Client Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                name="clientPhone"
                value={formData.clientPhone}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="(555) 123-4567"
              />
            </div>

            {/* Client Age */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Age
              </label>
              <input
                type="number"
                name="clientAge"
                value={formData.clientAge}
                onChange={handleChange}
                min="1"
                max="120"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Age"
              />
            </div>
          </div>
        </div>

        {/* Insurance Information */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Insurance</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Insurance Provider
            </label>
            <input
              type="text"
              name="insuranceProvider"
              value={formData.insuranceProvider}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Insurance company name"
            />
          </div>
        </div>

        {/* Clinical Information */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Clinical Information</h2>

          {/* Urgency Level */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Urgency Level <span className="text-red-500">*</span>
            </label>
            <select
              name="urgency"
              value={formData.urgency}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="routine">Routine</option>
              <option value="urgent">Urgent</option>
              <option value="emergency">Emergency</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Routine: Standard intake timeline | Urgent: Within 1 week | Emergency: Immediate attention
            </p>
          </div>

          {/* Presenting Concerns */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Presenting Concerns <span className="text-red-500">*</span>
            </label>
            <textarea
              name="presentingConcerns"
              value={formData.presentingConcerns}
              onChange={handleChange}
              required
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Describe the client's presenting concerns, symptoms, and reason for referral..."
            />
            <p className="mt-1 text-xs text-gray-500">
              Include relevant clinical information, behavioral concerns, and therapy goals
            </p>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={() => navigate('/admin/referrals')}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? 'Creating Referral...' : 'Create Referral'}
          </button>
        </div>
      </form>
    </div>
  );
};
