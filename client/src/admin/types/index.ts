// MindFit v2 Admin - TypeScript Types
// Campaign 1 - Admin Dashboard Types
// Classification: TIER-1

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'supervisor' | 'therapist' | 'staff' | 'readonly';
  fullName: string;
  isActive: boolean;
}

export interface Referral {
  id: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  clientAge?: number;
  presentingConcerns: string;
  urgency: 'routine' | 'urgent' | 'emergency';
  status: 'pending' | 'under_review' | 'assigned' | 'contacted' | 'scheduled' | 'in_progress' | 'exported' | 'completed' | 'declined' | 'cancelled';
  assignedTherapist?: string;
  assignedSupervisor?: string;
  insuranceProvider?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface IntakePackage {
  id: string;
  referralId: string;
  packageName: string;
  status: 'pending' | 'encrypted' | 'uploaded' | 'downloaded' | 'expired' | 'error';
  downloadUrl?: string;
  expiresAt: string;
  fileSizeBytes: number;
  checksumSha256: string;
  createdAt: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  eventType: 'workshop' | 'group_session' | 'community_event' | 'webinar' | 'open_house';
  startTime: string;
  endTime: string;
  locationType: 'in_person' | 'virtual' | 'hybrid';
  locationName?: string;
  isPublished: boolean;
  isFeatured: boolean;
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
}

export interface Flyer {
  id: string;
  title: string;
  description: string;
  flyerType: 'group_therapy' | 'service_announcement' | 'workshop' | 'community_resource' | 'referral_info';
  imageUrl: string;
  pdfUrl?: string;
  isPublished: boolean;
  isFeatured: boolean;
  showOnHomepage: boolean;
  createdAt: string;
}

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}
