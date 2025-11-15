// MindFit v2 - ICS/iCalendar File Generator
// RFC 5545 Compliant - Calendar Export Functionality
// Classification: TIER-1

/**
 * ICS Generator for MindFit Events
 *
 * Features:
 * - RFC 5545 compliant iCalendar format
 * - Timezone support (VTIMEZONE)
 * - Single event or calendar export
 * - Location, description, organizer fields
 * - VALARM for reminders
 * - URL integration for registration
 *
 * Usage:
 *   const ics = generateICS(event);
 *   res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
 *   res.setHeader('Content-Disposition', 'attachment; filename="event.ics"');
 *   res.send(ics);
 */

interface ICSEvent {
  id: string;
  title: string;
  description: string;
  startTime: Date | string;
  endTime: Date | string;
  timezone?: string;
  locationType: string;
  locationName?: string;
  locationAddress?: string;
  locationUrl?: string;
  registrationUrl?: string;
  facilitator?: string;
  eventType?: string;
}

/**
 * Format date to ICS format (YYYYMMDDTHHMMSS)
 * Example: 20241215T150000
 */
function formatICSDate(date: Date | string, timezone?: string): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  // Format as YYYYMMDDTHHMMSSZ for UTC
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  const hours = String(d.getUTCHours()).padStart(2, '0');
  const minutes = String(d.getUTCMinutes()).padStart(2, '0');
  const seconds = String(d.getUTCSeconds()).padStart(2, '0');

  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

/**
 * Format date to local timezone format
 * Example: 20241215T150000 (for America/New_York)
 */
function formatICSDateLocal(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');

  return `${year}${month}${day}T${hours}${minutes}${seconds}`;
}

/**
 * Escape special characters for ICS format
 * Commas, semicolons, and backslashes must be escaped
 */
function escapeICSText(text: string | undefined | null): string {
  if (!text) return '';

  return text
    .replace(/\\/g, '\\\\')  // Backslash
    .replace(/;/g, '\\;')    // Semicolon
    .replace(/,/g, '\\,')    // Comma
    .replace(/\n/g, '\\n')   // Newline
    .replace(/\r/g, '')      // Remove carriage return
    .trim();
}

/**
 * Fold long lines to 75 characters (RFC 5545 requirement)
 * Lines must be broken with CRLF + space
 */
function foldLine(line: string, maxLength: number = 75): string {
  if (line.length <= maxLength) return line;

  const lines: string[] = [];
  let currentLine = line.substring(0, maxLength);
  let remaining = line.substring(maxLength);

  lines.push(currentLine);

  while (remaining.length > 0) {
    const chunk = remaining.substring(0, maxLength - 1); // -1 for leading space
    lines.push(` ${chunk}`);
    remaining = remaining.substring(maxLength - 1);
  }

  return lines.join('\r\n');
}

/**
 * Generate location string for ICS
 * Combines location name and address if available
 */
function generateLocation(event: ICSEvent): string {
  const parts: string[] = [];

  if (event.locationName) {
    parts.push(event.locationName);
  }

  if (event.locationAddress) {
    parts.push(event.locationAddress);
  }

  if (event.locationType === 'virtual' && event.locationUrl) {
    parts.push(`Virtual: ${event.locationUrl}`);
  }

  return escapeICSText(parts.join(', '));
}

/**
 * Generate enhanced description with all event details
 */
function generateDescription(event: ICSEvent): string {
  const parts: string[] = [];

  // Main description
  if (event.description) {
    parts.push(event.description);
  }

  // Event type
  if (event.eventType) {
    parts.push(`\nEvent Type: ${event.eventType}`);
  }

  // Facilitator
  if (event.facilitator) {
    parts.push(`\nFacilitator: ${event.facilitator}`);
  }

  // Location details
  if (event.locationType === 'virtual' && event.locationUrl) {
    parts.push(`\nJoin URL: ${event.locationUrl}`);
  } else if (event.locationType === 'in_person') {
    if (event.locationName) {
      parts.push(`\nLocation: ${event.locationName}`);
    }
    if (event.locationAddress) {
      parts.push(`\nAddress: ${event.locationAddress}`);
    }
  } else if (event.locationType === 'hybrid') {
    parts.push(`\nHybrid Event (In-Person + Virtual)`);
    if (event.locationName) {
      parts.push(`\nIn-Person: ${event.locationName}`);
    }
    if (event.locationUrl) {
      parts.push(`\nVirtual: ${event.locationUrl}`);
    }
  }

  // Registration
  if (event.registrationUrl) {
    parts.push(`\nRegister: ${event.registrationUrl}`);
  }

  return escapeICSText(parts.join('\n'));
}

/**
 * Generate a single VEVENT component
 */
function generateVEvent(event: ICSEvent): string {
  const now = formatICSDate(new Date());
  const start = formatICSDate(event.startTime, event.timezone);
  const end = formatICSDate(event.endTime, event.timezone);
  const location = generateLocation(event);
  const description = generateDescription(event);

  const lines: string[] = [
    'BEGIN:VEVENT',
    foldLine(`UID:${event.id}@mindfit.ruha.io`),
    foldLine(`DTSTAMP:${now}`),
    foldLine(`DTSTART:${start}`),
    foldLine(`DTEND:${end}`),
    foldLine(`SUMMARY:${escapeICSText(event.title)}`),
  ];

  // Optional fields
  if (description) {
    lines.push(foldLine(`DESCRIPTION:${description}`));
  }

  if (location) {
    lines.push(foldLine(`LOCATION:${location}`));
  }

  // Add URL for registration or event page
  if (event.registrationUrl) {
    lines.push(foldLine(`URL:${event.registrationUrl}`));
  } else {
    lines.push(foldLine(`URL:https://mindfit.ruha.io/events/${event.id}`));
  }

  // Organizer
  lines.push(foldLine('ORGANIZER;CN=MindFit:mailto:info@mindfitclinic.com'));

  // Status
  lines.push('STATUS:CONFIRMED');

  // Reminder alarm (15 minutes before)
  lines.push('BEGIN:VALARM');
  lines.push('TRIGGER:-PT15M');
  lines.push('ACTION:DISPLAY');
  lines.push(foldLine(`DESCRIPTION:Reminder: ${escapeICSText(event.title)}`));
  lines.push('END:VALARM');

  lines.push('END:VEVENT');

  return lines.join('\r\n');
}

/**
 * Generate VTIMEZONE component for America/New_York
 * Required for timezone-aware events
 */
function generateVTimezone(): string {
  return [
    'BEGIN:VTIMEZONE',
    'TZID:America/New_York',
    'BEGIN:DAYLIGHT',
    'TZOFFSETFROM:-0500',
    'TZOFFSETTO:-0400',
    'TZNAME:EDT',
    'DTSTART:19700308T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU',
    'END:DAYLIGHT',
    'BEGIN:STANDARD',
    'TZOFFSETFROM:-0400',
    'TZOFFSETTO:-0500',
    'TZNAME:EST',
    'DTSTART:19701101T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU',
    'END:STANDARD',
    'END:VTIMEZONE',
  ].join('\r\n');
}

/**
 * Generate complete ICS file for a single event
 *
 * @param event - Event data conforming to ICSEvent interface
 * @returns Complete ICS file content as string
 */
export function generateICS(event: ICSEvent): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MindFit//Event Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:MindFit Events',
    'X-WR-TIMEZONE:America/New_York',
    'X-WR-CALDESC:MindFit Mental Health Events & Workshops',
  ];

  // Add timezone definition if using local time
  if (event.timezone && event.timezone !== 'UTC') {
    lines.push(generateVTimezone());
  }

  // Add event
  lines.push(generateVEvent(event));

  lines.push('END:VCALENDAR');

  return lines.join('\r\n') + '\r\n';
}

/**
 * Generate ICS file for multiple events (full calendar export)
 *
 * @param events - Array of events
 * @param calendarName - Optional calendar name (default: "MindFit Events")
 * @returns Complete ICS file content as string
 */
export function generateCalendarICS(
  events: ICSEvent[],
  calendarName: string = 'MindFit Events'
): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MindFit//Event Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    foldLine(`X-WR-CALNAME:${escapeICSText(calendarName)}`),
    'X-WR-TIMEZONE:America/New_York',
    'X-WR-CALDESC:MindFit Mental Health Events & Workshops',
  ];

  // Add timezone definition
  lines.push(generateVTimezone());

  // Add all events
  for (const event of events) {
    lines.push(generateVEvent(event));
  }

  lines.push('END:VCALENDAR');

  return lines.join('\r\n') + '\r\n';
}

/**
 * Generate filename for ICS download
 * Safe for filesystems (removes special characters)
 *
 * @param title - Event title
 * @returns Safe filename (e.g., "mindfulness-workshop.ics")
 */
export function generateICSFilename(title: string): string {
  const safe = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);

  return `${safe || 'event'}.ics`;
}

/**
 * Validate event data before ICS generation
 * Throws error if required fields are missing
 */
export function validateEventForICS(event: Partial<ICSEvent>): void {
  const required = ['id', 'title', 'startTime', 'endTime'];

  for (const field of required) {
    if (!event[field as keyof ICSEvent]) {
      throw new Error(`Missing required field for ICS generation: ${field}`);
    }
  }

  // Validate dates
  const start = new Date(event.startTime!);
  const end = new Date(event.endTime!);

  if (isNaN(start.getTime())) {
    throw new Error('Invalid startTime for ICS generation');
  }

  if (isNaN(end.getTime())) {
    throw new Error('Invalid endTime for ICS generation');
  }

  if (end <= start) {
    throw new Error('Event endTime must be after startTime');
  }
}

/**
 * Example usage in Express route:
 *
 * app.get('/api/events/:id/ics', async (req, res) => {
 *   const event = await storage.getEvent(req.params.id);
 *
 *   if (!event || !event.isPublished) {
 *     return res.status(404).json({ error: 'Event not found' });
 *   }
 *
 *   validateEventForICS(event);
 *   const ics = generateICS(event);
 *   const filename = generateICSFilename(event.title);
 *
 *   res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
 *   res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
 *   res.send(ics);
 * });
 */
