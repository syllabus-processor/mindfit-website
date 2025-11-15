// MindFit v2 - Public Events & Calendar Page
// Campaign 1 - Events & Calendar System
// Classification: TIER-1

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, MapPin, Clock, Download, Users, Video, Building2, Filter } from 'lucide-react';
import { format, parseISO, isFuture, isPast, isToday } from 'date-fns';

interface Event {
  id: string;
  title: string;
  description: string;
  eventType: string;
  startTime: string;
  endTime: string;
  locationType: 'in_person' | 'virtual' | 'hybrid';
  locationName?: string;
  locationAddress?: string;
  locationUrl?: string;
  facilitator?: string;
  cost: string;
  maxAttendees?: string;
  requiresRegistration: boolean;
  registrationUrl?: string;
  imageUrl?: string;
  isFeatured: boolean;
  status: string;
}

export default function Events() {
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'today' | 'past'>('upcoming');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [events, filter, typeFilter]);

  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/events/public');
      if (response.ok) {
        const data = await response.json();
        setEvents(data.events || []);
      }
    } catch (err) {
      console.error('Failed to fetch events:', err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...events];

    // Time filter
    if (filter === 'upcoming') {
      filtered = filtered.filter((event) => isFuture(parseISO(event.startTime)));
    } else if (filter === 'today') {
      filtered = filtered.filter((event) => isToday(parseISO(event.startTime)));
    } else if (filter === 'past') {
      filtered = filtered.filter((event) => isPast(parseISO(event.endTime)));
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter((event) => event.eventType === typeFilter);
    }

    // Sort by start time
    filtered.sort((a, b) => {
      const aTime = new Date(a.startTime).getTime();
      const bTime = new Date(b.startTime).getTime();
      return filter === 'past' ? bTime - aTime : aTime - bTime;
    });

    setFilteredEvents(filtered);
  };

  const downloadICS = async (eventId: string, eventTitle: string) => {
    try {
      const response = await fetch(`/api/events/${eventId}/ics`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${eventTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.ics`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error('Failed to download ICS:', err);
    }
  };

  const getLocationIcon = (locationType: string) => {
    if (locationType === 'virtual') return <Video className="h-5 w-5" />;
    if (locationType === 'hybrid') return <Building2 className="h-5 w-5" />;
    return <MapPin className="h-5 w-5" />;
  };

  const getEventTypeBadge = (eventType: string) => {
    const colors: Record<string, string> = {
      workshop: 'bg-blue-100 text-blue-800',
      group_session: 'bg-green-100 text-green-800',
      community_event: 'bg-purple-100 text-purple-800',
      webinar: 'bg-orange-100 text-orange-800',
      open_house: 'bg-pink-100 text-pink-800',
    };

    const labels: Record<string, string> = {
      workshop: 'Workshop',
      group_session: 'Group Session',
      community_event: 'Community Event',
      webinar: 'Webinar',
      open_house: 'Open House',
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${colors[eventType] || 'bg-gray-100 text-gray-800'}`}>
        {labels[eventType] || eventType}
      </span>
    );
  };

  const eventTypes = [
    { value: 'all', label: 'All Types' },
    { value: 'workshop', label: 'Workshops' },
    { value: 'group_session', label: 'Group Sessions' },
    { value: 'community_event', label: 'Community Events' },
    { value: 'webinar', label: 'Webinars' },
    { value: 'open_house', label: 'Open Houses' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <svg
            className="animate-spin h-12 w-12 text-blue-600 mx-auto"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <p className="mt-4 text-gray-600">Loading events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <section className="relative bg-gradient-to-br from-[hsl(210,65%,45%)] to-[hsl(180,40%,55%)] text-white py-20">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItMnptMCAwdjItMnptMCAwdjItMnptMCAwdjItMnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-10"></div>

        <div className="relative max-w-7xl mx-auto px-6">
          <div className="max-w-3xl">
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
              Events & Workshops
            </h1>
            <p className="text-xl text-white/90 leading-relaxed">
              Join us for workshops, group sessions, and community events designed to support mental health and wellness.
              All events are led by experienced clinicians and tailored for children, teens, and families.
            </p>
          </div>
        </div>
      </section>

      {/* Filters Section */}
      <section className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Time Filters */}
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-gray-400" />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={filter === 'all' ? 'default' : 'outline'}
                  onClick={() => setFilter('all')}
                >
                  All Events
                </Button>
                <Button
                  size="sm"
                  variant={filter === 'upcoming' ? 'default' : 'outline'}
                  onClick={() => setFilter('upcoming')}
                >
                  Upcoming
                </Button>
                <Button
                  size="sm"
                  variant={filter === 'today' ? 'default' : 'outline'}
                  onClick={() => setFilter('today')}
                >
                  Today
                </Button>
                <Button
                  size="sm"
                  variant={filter === 'past' ? 'default' : 'outline'}
                  onClick={() => setFilter('past')}
                >
                  Past
                </Button>
              </div>
            </div>

            {/* Type Filter */}
            <div className="flex items-center gap-2">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {eventTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Events Grid */}
      <section className="max-w-7xl mx-auto px-6 py-12">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-20">
            <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No events found</h3>
            <p className="text-gray-600">
              {filter === 'today'
                ? 'No events scheduled for today. Check back soon!'
                : filter === 'past'
                ? 'No past events to display.'
                : 'No upcoming events at the moment. Check back soon for new workshops and sessions!'}
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((event) => (
              <Card key={event.id} className={`overflow-hidden hover:shadow-lg transition-shadow ${event.isFeatured ? 'border-2 border-blue-500' : ''}`}>
                {event.imageUrl && (
                  <div className="h-48 bg-gray-200 overflow-hidden">
                    <img
                      src={event.imageUrl}
                      alt={event.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <CardContent className="p-6">
                  {event.isFeatured && (
                    <div className="mb-3">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-semibold">
                        ⭐ Featured Event
                      </span>
                    </div>
                  )}

                  <div className="mb-3">
                    {getEventTypeBadge(event.eventType)}
                  </div>

                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    {event.title}
                  </h3>

                  <p className="text-gray-600 mb-4 line-clamp-3">
                    {event.description}
                  </p>

                  {/* Event Details */}
                  <div className="space-y-2 mb-4">
                    {/* Date & Time */}
                    <div className="flex items-start gap-2 text-sm text-gray-700">
                      <Calendar className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-medium">
                          {format(parseISO(event.startTime), 'EEEE, MMMM d, yyyy')}
                        </div>
                        <div className="text-gray-600">
                          {format(parseISO(event.startTime), 'h:mm a')} - {format(parseISO(event.endTime), 'h:mm a')}
                        </div>
                      </div>
                    </div>

                    {/* Location */}
                    <div className="flex items-start gap-2 text-sm text-gray-700">
                      {getLocationIcon(event.locationType)}
                      <div>
                        <div className="font-medium capitalize">{event.locationType.replace('_', ' ')}</div>
                        {event.locationName && <div className="text-gray-600">{event.locationName}</div>}
                        {event.locationAddress && event.locationType === 'in_person' && (
                          <div className="text-gray-600 text-xs">{event.locationAddress}</div>
                        )}
                      </div>
                    </div>

                    {/* Facilitator */}
                    {event.facilitator && (
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <Users className="h-4 w-4" />
                        <span>Led by {event.facilitator}</span>
                      </div>
                    )}

                    {/* Cost */}
                    <div className="flex items-center gap-2 text-sm">
                      <span className={`font-semibold ${event.cost === 'free' ? 'text-green-600' : 'text-gray-900'}`}>
                        {event.cost === 'free' ? 'FREE' : event.cost}
                      </span>
                      {event.maxAttendees && (
                        <span className="text-gray-600">• Limited to {event.maxAttendees} attendees</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-4 border-t border-gray-200">
                    {event.requiresRegistration && event.registrationUrl ? (
                      <Button
                        className="flex-1"
                        onClick={() => window.open(event.registrationUrl, '_blank')}
                      >
                        Register Now
                      </Button>
                    ) : (
                      <Button className="flex-1" variant="outline" disabled>
                        No Registration Required
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => downloadICS(event.id, event.title)}
                      title="Add to Calendar"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>

                  {event.locationUrl && event.locationType !== 'in_person' && (
                    <Button
                      variant="link"
                      className="w-full mt-2 text-sm"
                      onClick={() => window.open(event.locationUrl, '_blank')}
                    >
                      Virtual Meeting Link
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* CTA Section */}
      <section className="bg-white border-t border-gray-200 py-16">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Want to Stay Updated?
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Subscribe to our newsletter to receive notifications about upcoming events, workshops, and mental health resources.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="px-8" onClick={() => window.location.href = '/contact'}>
              Subscribe to Newsletter
            </Button>
            <Button size="lg" variant="outline" className="px-8" onClick={() => window.location.href = '/contact'}>
              Contact Us
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
