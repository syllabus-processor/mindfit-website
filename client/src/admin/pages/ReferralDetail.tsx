// MindFit v2 Admin - Enhanced Referral Detail Page
// Bronwyn's Intake Coordinator Workflow
// Classification: TIER-1

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { Referral } from '../types';

interface Note {
  id: string;
  content: string;
  createdBy: string;
  createdAt: string;
}

export const ReferralDetailEnhanced: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [referral, setReferral] = useState<Referral | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);

  // Form states
  const [newNote, setNewNote] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [selectedClinician, setSelectedClinician] = useState('');

  // Clinician list
  const clinicians = [
    { value: 'Rob', label: 'Rob (Younger Kids)' },
    { value: 'Katie', label: 'Katie (Teens)' },
    { value: 'Julie C', label: 'Julie C (Adults)' },
    { value: 'Dr. Smith', label: 'Dr. Smith' },
    { value: 'Sarah Johnson', label: 'Sarah Johnson' },
  ];

  useEffect(() => {
    if (id) {
      fetchReferral(id);
      fetchNotes(id);
    }
  }, [id]);

  const fetchReferral = async (referralId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/referrals/${referralId}`);
      if (!response.ok) throw new Error('Failed to fetch referral');
      const data = await response.json();
      setReferral(data);
      setSelectedClinician(data.assignedTherapist || '');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotes = async (referralId: string) => {
    try {
      const response = await fetch(`/api/referrals/${referralId}/notes`);
      if (response.ok) {
        const data = await response.json();
        setNotes(data);
      }
    } catch (err: any) {
      console.error('Failed to fetch notes:', err);
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

  const addNote = async () => {
    if (!referral || !newNote.trim()) return;

    try {
      setUpdating(true);
      const response = await fetch(`/api/referrals/${referral.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newNote }),
      });

      if (!response.ok) throw new Error('Failed to add note');

      const note = await response.json();
      setNotes([note, ...notes]);
      setNewNote('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUpdating(false);
    }
  };

  const assignClinician = async () => {
    if (!referral || !selectedClinician) return;

    try {
      setUpdating(true);
      const response = await fetch(`/api/referrals/${referral.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedTherapist: selectedClinician }),
      });

      if (!response.ok) throw new Error('Failed to assign clinician');

      const updated = await response.json();
      setReferral(updated);

      // Auto-update status to 'assigned'
      if (updated.status === 'pending' || updated.status === 'contacted') {
        await updateStatus('assigned');
      }
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

      // Open download URL in new tab
      if (result.downloadUrl) {
        window.open(result.downloadUrl, '_blank');
      }

      alert(`Intake package created successfully!\nPackage will download automatically.\nPackage ID: ${result.packageId}`);
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

  // Get client initials
  const initials = referral.clientName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase();

  const getStatusColor = (status: Referral['status']) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      under_review: 'bg-blue-100 text-blue-800 border-blue-300',
      assigned: 'bg-purple-100 text-purple-800 border-purple-300',
      contacted: 'bg-indigo-100 text-indigo-800 border-indigo-300',
      scheduled: 'bg-green-100 text-green-800 border-green-300',
      in_progress: 'bg-cyan-100 text-cyan-800 border-cyan-300',
      completed: 'bg-green-200 text-green-900 border-green-400',
      declined: 'bg-red-100 text-red-800 border-red-300',
      cancelled: 'bg-gray-200 text-gray-700 border-gray-300',
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const getUrgencyIcon = (urgency: Referral['urgency']) => {
    if (urgency === 'emergency') return '🚨';
    if (urgency === 'urgent') return '⚠️';
    return '📋';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            to="/admin/referrals"
            className="text-blue-600 hover:text-blue-800 flex items-center text-sm"
          >
            ← Back to List
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {getUrgencyIcon(referral.urgency)} {initials} - Age {referral.clientAge || 'N/A'}
            </h1>
            <p className="text-sm text-gray-600 mt-1">Referral ID: {referral.id.slice(0, 8)}...</p>
          </div>
        </div>
        <button
          onClick={exportIntakePackage}
          disabled={updating}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:bg-green-300 flex items-center gap-2"
        >
          📦 {updating ? 'Exporting...' : 'Export Intake Package'}
        </button>
      </div>

      {/* Status Banner */}
      <div className={`rounded-lg border-2 p-4 ${getStatusColor(referral.status)}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Current Status</p>
            <p className="text-lg font-bold capitalize">{referral.status.replace('_', ' ')}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium">Urgency</p>
            <p className="text-lg font-bold capitalize">{referral.urgency}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Client Info & Actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Client Information Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              👤 Client Information
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Full Name</label>
                <p className="mt-1 text-sm font-medium text-gray-900">{referral.clientName}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Age</label>
                <p className="mt-1 text-sm font-medium text-gray-900">{referral.clientAge || 'Not provided'}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Email</label>
                <p className="mt-1 text-sm text-blue-600">{referral.clientEmail}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Phone</label>
                <p className="mt-1 text-sm text-gray-900">{referral.clientPhone || 'Not provided'}</p>
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-500 uppercase">Insurance Provider</label>
                <p className="mt-1 text-sm text-gray-900">{referral.insuranceProvider || 'Not provided'}</p>
              </div>
            </div>
          </div>

          {/* Presenting Concerns */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              📋 Presenting Concerns
            </h2>
            <div className="bg-gray-50 rounded p-4">
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{referral.presentingConcerns}</p>
            </div>
          </div>

          {/* Notes Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              📝 Notes
            </h2>

            {/* Add Note */}
            <div className="mb-4">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add a note (e.g., 'Mom will send insurance card', 'Requested 2pm slots', 'Left voicemail')..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
              />
              <button
                onClick={addNote}
                disabled={updating || !newNote.trim()}
                className="mt-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 text-sm"
              >
                Add Note
              </button>
            </div>

            {/* Notes History */}
            <div className="space-y-3">
              {notes.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No notes yet</p>
              ) : (
                notes.map((note) => (
                  <div key={note.id} className="border-l-4 border-blue-500 bg-blue-50 p-3 rounded">
                    <p className="text-sm text-gray-800">{note.content}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {note.createdBy} • {new Date(note.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Workflow Actions */}
        <div className="space-y-6">
          {/* Workflow Steps */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-lg p-6 border border-blue-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              🔄 Bronwyn's Workflow
            </h2>

            <div className="space-y-3">
              {/* Step 1: Attempted Contact */}
              <button
                onClick={() => updateStatus('under_review')}
                disabled={updating}
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-medium px-4 py-3 rounded-lg transition-colors disabled:opacity-50 text-sm shadow"
              >
                ☎️ Mark as "Attempted"
              </button>

              {/* Step 2: Successfully Contacted */}
              <button
                onClick={() => updateStatus('contacted')}
                disabled={updating}
                className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-medium px-4 py-3 rounded-lg transition-colors disabled:opacity-50 text-sm shadow"
              >
                ✅ Mark as "Contacted"
              </button>

              {/* Step 3: Waitlist */}
              <button
                onClick={() => updateStatus('scheduled')}
                disabled={updating}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium px-4 py-3 rounded-lg transition-colors disabled:opacity-50 text-sm shadow"
              >
                ⏸️ Move to Waitlist
              </button>

              <div className="border-t-2 border-blue-300 pt-3 mt-3">
                <p className="text-xs text-gray-600 mb-2 font-medium">COMPLETION</p>
                <button
                  onClick={() => updateStatus('completed')}
                  disabled={updating}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-3 rounded-lg transition-colors disabled:opacity-50 text-sm shadow"
                >
                  ✓ Mark Completed
                </button>
              </div>
            </div>
          </div>

          {/* Assign Clinician */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              🧑‍⚕️ Assign Clinician
            </h2>

            <div className="space-y-3">
              <select
                value={selectedClinician}
                onChange={(e) => setSelectedClinician(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select clinician...</option>
                {clinicians.map((clinician) => (
                  <option key={clinician.value} value={clinician.value}>
                    {clinician.label}
                  </option>
                ))}
              </select>

              <button
                onClick={assignClinician}
                disabled={updating || !selectedClinician}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium px-4 py-2 rounded-lg transition-colors disabled:bg-gray-300"
              >
                Assign to {selectedClinician || 'Clinician'}
              </button>

              {referral.assignedTherapist && (
                <div className="bg-purple-50 border border-purple-200 rounded p-3">
                  <p className="text-xs font-medium text-purple-800">Currently Assigned:</p>
                  <p className="text-sm font-bold text-purple-900">{referral.assignedTherapist}</p>
                </div>
              )}
            </div>
          </div>

          {/* Follow-up Date */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              📅 Follow-up Date
            </h2>
            <input
              type="date"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={() => {
                // TODO: API call to save follow-up date
                alert(`Follow-up date set to: ${followUpDate}`);
              }}
              disabled={!followUpDate}
              className="mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors disabled:bg-gray-300 text-sm"
            >
              Save Follow-up Date
            </button>
          </div>

          {/* Metadata */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">📊 Timeline</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Created:</span>
                <span className="text-gray-900 font-medium">
                  {new Date(referral.createdAt).toLocaleDateString()}
                </span>
              </div>
              {referral.updatedAt && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Last Updated:</span>
                  <span className="text-gray-900 font-medium">
                    {new Date(referral.updatedAt).toLocaleDateString()}
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
