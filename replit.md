# MindFit Mental Health - Public Website

## Project Overview
A modern, professional public-facing website for MindFit Mental Health, a therapy practice specializing in tech-empowered treatment for kids, teens, and families. This website serves as the marketing presence and provides discreet access to the existing EMRM (Electronic Medical Records Module) system.

## Architecture

### Frontend
- **React + TypeScript** with Wouter for routing
- **Tailwind CSS + Shadcn UI** for styling and components
- **TanStack Query** for data fetching and state management
- **React Hook Form + Zod** for form validation

### Backend
- **Express.js** API server
- **In-memory storage** for contact submissions and newsletter subscriptions
- **Zod validation** for all API endpoints
- Email integration ready (placeholder for Resend/SendGrid)

### Pages
1. **Home** (`/`) - Hero section, services overview, team preview, testimonials, CTA
2. **Services** (`/services`) - Detailed service offerings and process
3. **About** (`/about`) - Team bios, values, FAQ
4. **Contact** (`/contact`) - Contact form and information
5. **Portal** (`/portal/login`) - Discreet login page for EMRM access (dark mode)

## Key Features

### Public Website
- Mobile-first responsive design
- SEO-optimized with meta tags
- Accessible navigation with sticky header
- Newsletter signup in footer
- Contact form with email/phone preference

### EMRM Integration
- Discreet "Staff & Client Access" link in footer only
- Separate dark-themed login page
- Portal page excluded from main header/footer layout
- Ready to redirect to existing EMRM system

## API Endpoints

### Contact Form
- `POST /api/contact/submit` - Submit contact form
  - Validates name, email, phone, preferred contact method, message
  - Stores submission in memory
  - Sends confirmation email to user (placeholder)
  - Sends notification to staff (placeholder)

### Newsletter
- `POST /api/newsletter/subscribe` - Subscribe to newsletter
  - Validates email
  - Prevents duplicate subscriptions
  - Sends welcome email (placeholder)

### Admin (Internal)
- `GET /api/admin/contacts` - View all contact submissions
- `GET /api/admin/subscribers` - View all newsletter subscribers

## Data Models

### Contact Submission
```typescript
{
  id: string
  name: string
  email: string
  phone?: string
  preferredContact: "email" | "phone"
  message: string
  createdAt: Date
}
```

### Newsletter Subscriber
```typescript
{
  id: string
  email: string
  subscribedAt: Date
}
```

## Design System

### Colors
- **Primary Blue**: 210 65% 45% (trustworthy, calming)
- **Deep Navy**: 215 50% 25% (authority, text)
- **Soft Teal**: 180 40% 55% (secondary accent)
- **Warm Neutral**: 30 15% 97% (background)

### Typography
- **Sans-serif**: Inter (headlines, body)
- **Serif**: Libre Baskerville (testimonials, quotes)

### Components
- Follows Shadcn UI patterns
- Consistent spacing (4, 6, 8, 12, 16, 20 units)
- Rounded corners (rounded-2xl for cards)
- Hover states with subtle elevation

## Development

### Running the App
```bash
npm run dev
```
Starts both Express backend and Vite frontend on port 5000.

### Storage
Currently using in-memory storage (MemStorage). Data persists only during runtime. For production:
- Consider PostgreSQL database integration
- Or connect to existing EMRM database

### Email Integration
Email sending is currently a placeholder that logs to console. To integrate:
1. Install email service SDK (e.g., Resend, SendGrid)
2. Add API key to environment variables
3. Replace `sendEmail` function in `server/routes.ts`

## EMRM Portal Connection
The portal login page (`/portal/login`) is prepared to redirect to the EMRM system. Update the redirect logic in `client/src/pages/Portal.tsx`:
- Set `EMRM_URL` environment variable
- Or modify the `window.location.href` redirect

## Future Enhancements
- Database persistence (PostgreSQL)
- Real email service integration (Resend)
- Blog/resources section
- Scheduling widget integration
- Client testimonials management
- Analytics tracking

## Notes
- Portal page uses dark mode by default for visual separation
- All forms include comprehensive validation
- Mobile menu slides in from side with large touch targets
- Design follows WCAG AA accessibility standards
