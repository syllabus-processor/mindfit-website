# MindFit Mental Health - Public Website

## Project Overview
A modern, professional public-facing website for MindFit Mental Health, a therapy practice specializing in tech-empowered treatment for kids, teens, and families. This website serves as the marketing presence and provides discreet access to the existing EMRM (Electronic Medical Records Module) system.

### Deployment Plan
1. **Beta/Preview**: `mindfit.resonantgrid.dev` - Private preview and beta user testing
2. **Production**: `https://mindfitmentalhealth.com/` - Final production domain (pending DNS access)
3. **Hosting**: DigitalOcean (dockerized deployment)

## Architecture

### Frontend
- **React + TypeScript** with Wouter for routing
- **Tailwind CSS + Shadcn UI** for styling and components
- **TanStack Query** for data fetching and state management
- **React Hook Form + Zod** for form validation

### Backend
- **Express.js** API server
- **PostgreSQL database** for persistent storage (contact submissions, newsletter, integration settings)
- **Provider integration system** - Pluggable adapters for EMRM, SimplySafe, generic webhooks, or standalone
- **Zod validation** for all API endpoints
- Email integration ready (placeholder for Resend/SendGrid)

### Pages
1. **Home** (`/`) - Hero section, services overview, team preview, testimonials, CTA
2. **Services** (`/services`) - Detailed service offerings and process
3. **About** (`/about`) - Team bios, values, FAQ
4. **Contact** (`/contact`) - Contact form and information
5. **Portal** (`/portal/login`) - Discreet login page for EMRM access (dark mode)
6. **Admin Integrations** (`/admin/integrations`) - Configure provider integrations (EMRM, SimplySafe, webhooks, standalone)

## Key Features

### Public Website
- Mobile-first responsive design
- SEO-optimized with meta tags
- Accessible navigation with sticky header
- Newsletter signup in footer
- Contact form with email/phone preference

### Provider Integration System
- **Configurable Adapters**: Admin can select provider per data type (contact form, newsletter)
- **Supported Providers**:
  - **Standalone** - Local storage only, no external integration
  - **EMRM** - Send to EMRM for client intake and CRM
  - **SimplySafe** - Integration ready (placeholder)
  - **Generic Webhook** - Send to any custom webhook URL
- **Admin UI**: Configure provider settings at `/admin/integrations`
- **Fail-Safe**: Data always stored locally first, then forwarded to provider
- **JSON Configuration**: Provider-specific settings stored as JSON

### EMRM Integration
- Discreet "Staff & Client Access" link in footer only
- Separate dark-themed login page
- Portal page excluded from main header/footer layout
- Ready to redirect to existing EMRM system
- Contact form integration via provider system

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

### Integration Setting
```typescript
{
  id: string
  dataType: "contact_form" | "newsletter"
  provider: "standalone" | "emrm" | "simplysafe" | "generic_webhook"
  config: string  // JSON configuration
  enabled: "true" | "false"
  updatedAt: Date
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
Using PostgreSQL database (Neon) for persistent storage:
- Contact submissions stored in `contact_submissions` table
- Newsletter subscribers stored in `newsletter_subscribers` table  
- Integration settings stored in `integration_settings` table
- Data persists across restarts

### Email Integration
Email sending is currently a placeholder that logs to console. To integrate:
1. Install email service SDK (e.g., Resend, SendGrid)
2. Add API key to environment variables
3. Replace `sendEmail` function in `server/routes.ts`

## Provider Integration Configuration

### Admin Configuration
Access the integration settings at `/admin/integrations` to configure:
1. **Select Provider** per data type (contact form, newsletter)
2. **Configure Settings** - Provider-specific JSON config
3. **Enable/Disable** - Toggle integration on/off

### Provider Types

#### Standalone
No external integration. Data stored locally only.
```json
{}
```

#### EMRM
```json
{
  "apiUrl": "https://emrm.mindfithealth.com/api",
  "apiKey": "emrm_live_sk_..."
}
```

#### Generic Webhook
```json
{
  "contactWebhookUrl": "https://example.com/webhooks/contact",
  "newsletterWebhookUrl": "https://example.com/webhooks/newsletter",
  "authHeader": "Bearer your_api_key_here"
}
```

### Environment Variables
```bash
# EMRM Integration (optional, can be configured in admin UI)
EMRM_API_BASE_URL=https://emrm.mindfithealth.com/api
EMRM_API_KEY=emrm_live_sk_...
```

## EMRM Portal Connection
The portal login page (`/portal/login`) is prepared to redirect to the EMRM system. Update the redirect logic in `client/src/pages/Portal.tsx`:
- Set `VITE_EMRM_URL` environment variable
- Or modify the `window.location.href` redirect

## Docker Deployment

### Quick Start
```bash
# Build and run with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### DigitalOcean Deployment
See `deploy/digitalocean/README.md` for complete deployment guide including:
- App Platform (managed, recommended)
- Droplet + Docker (self-managed)
- Kubernetes (enterprise scale)

### Environment Variables for Production
```bash
DATABASE_URL=postgresql://user:pass@host:5432/mindfit
SESSION_SECRET=<generate-secure-random-32-chars>
EMRM_API_BASE_URL=https://emrm.mindfithealth.com/api
EMRM_API_KEY=emrm_live_sk_...
NODE_ENV=production
```

## Future Enhancements
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
