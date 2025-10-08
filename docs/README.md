# MindFit Mental Health - Documentation

Welcome to the MindFit Mental Health documentation repository. This directory contains all technical documentation for the public website and EMRM integration.

## 📚 Documentation Index

### Integration Documentation

#### [EMRM Integration Specification](./EMRM_INTEGRATION_SPEC.md)
**Audience:** EMRM Development Team, Integration Engineers  
**Purpose:** Comprehensive technical specification for integrating the MindFit public website with the EMRM system

**Contents:**
- Architecture overview and integration points
- Contact form → EMRM client intake integration
- Portal authentication and session management
- Newsletter subscriber sync (optional)
- Security & HIPAA compliance requirements
- Environment configuration
- Testing scenarios and validation
- Implementation phases and timeline
- Support contacts and escalation procedures

#### [OpenAPI Specification](./openapi.yaml)
**Audience:** API Developers, Integration Engineers  
**Purpose:** Machine-readable API specification in OpenAPI 3.0 format

**Contents:**
- Website API endpoints (contact form, newsletter, admin)
- EMRM API requirements (intake, authentication, sync)
- Complete request/response schemas
- Authentication and security definitions
- Example requests and responses
- Error codes and handling

**Tools:** Import into Swagger UI, Postman, or Insomnia for interactive documentation

---

## 🏗️ Project Overview

### MindFit Public Website
A modern, professional public-facing website for MindFit Mental Health, a therapy practice specializing in tech-empowered treatment for kids, teens, and families.

**Tech Stack:**
- **Frontend:** React + TypeScript, Wouter routing, Tailwind CSS, Shadcn UI
- **Backend:** Express.js, PostgreSQL (Neon), Drizzle ORM
- **Features:** Contact forms, newsletter signup, discreet EMRM portal access

**Live URL:** [Your deployment URL]

### EMRM (Electronic Medical Records Module)
Existing HIPAA-compliant platform for clinical operations, client management, and practice administration.

**Integration Status:** In Development  
**Target Completion:** [Target date]

---

## 🚀 Quick Start for EMRM Team

### 1. Review the Integration Spec
Start with [`EMRM_INTEGRATION_SPEC.md`](./EMRM_INTEGRATION_SPEC.md) to understand:
- What data the website sends
- What APIs EMRM needs to provide
- Security and compliance requirements

### 2. Review the OpenAPI Spec
Import [`openapi.yaml`](./openapi.yaml) into your API development tools:

```bash
# Using Swagger UI
docker run -p 8080:8080 -e SWAGGER_JSON=/docs/openapi.yaml -v $(pwd)/docs:/docs swaggerapi/swagger-ui

# Using Redoc
npx @redocly/cli preview-docs docs/openapi.yaml
```

### 3. Key Integration Points

**Required EMRM APIs:**
- `POST /api/intake/contact` - Receive contact form data
- `POST /api/auth/login` - Portal authentication
- `POST /api/auth/refresh` - Session token refresh
- `POST /api/auth/logout` - End user session

**Optional EMRM APIs:**
- `POST /api/marketing/subscriber` - Newsletter sync webhook

### 4. Environment Variables Needed

**Website needs:**
```bash
VITE_EMRM_URL=https://emrm.mindfithealth.com
EMRM_API_KEY=emrm_live_sk_...
EMRM_API_BASE_URL=https://emrm.mindfithealth.com/api
```

**EMRM needs:**
```bash
WEBSITE_API_KEY=website_sk_...
WEBSITE_BASE_URL=https://mindfit-website.replit.app
ALLOWED_ORIGINS=https://mindfit-website.replit.app
```

---

## 📋 Current Website API Endpoints

The website provides these endpoints that EMRM may consume:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/contact/submit` | POST | Submit contact form |
| `/api/newsletter/subscribe` | POST | Newsletter signup |
| `/api/admin/contacts` | GET | View contact submissions (admin) |
| `/api/admin/subscribers` | GET | View newsletter subscribers (admin) |

See [`openapi.yaml`](./openapi.yaml) for complete specifications.

---

## 🔒 Security & Compliance

### HIPAA Requirements
- **Encryption:** All data in transit uses TLS 1.2+
- **Authentication:** API keys rotated every 90 days
- **Audit Logging:** All integration calls logged with timestamps
- **Data Minimization:** Only necessary PHI transmitted

### Authentication Methods
- **API Keys:** Backend-to-backend integration (`Authorization: Bearer emrm_live_sk_...`)
- **Session Tokens:** User sessions with JWT
- **Rate Limiting:** Enforced on all endpoints

---

## 🧪 Testing

### Test Credentials
See integration spec for test user accounts and sample data.

### Test Scenarios
1. Contact form submission → EMRM client creation
2. Portal login → EMRM authentication
3. Newsletter subscription → Optional sync
4. Error handling and edge cases

### Monitoring
- Success rate > 95%
- Response time < 5s (p95)
- Error rate < 5%

---

## 📞 Support Contacts

### Website Team
- **Technical Lead:** [Your Name]
- **Email:** dev@mindfithealth.com
- **Slack:** #mindfit-website

### EMRM Team
- **Technical Lead:** [EMRM Lead Name]
- **Email:** emrm-dev@mindfithealth.com
- **Slack:** #emrm-integration

### Escalation
- **Urgent Issues:** Page on-call engineer
- **Security:** security@mindfithealth.com
- **HIPAA Compliance:** compliance@mindfithealth.com

---

## 📝 Additional Documentation

### Project Files
- [`/replit.md`](../replit.md) - Project overview and architecture
- [`/design_guidelines.md`](../design_guidelines.md) - Frontend design system

### Database Schema
- [`/shared/schema.ts`](../shared/schema.ts) - Drizzle schema definitions
- Tables: `users`, `contact_submissions`, `newsletter_subscribers`

### Source Code
- [`/client`](../client) - React frontend application
- [`/server`](../server) - Express.js backend API
- [`/shared`](../shared) - Shared types and schemas

---

## 🗓️ Implementation Timeline

### Phase 1: Contact Form Integration (Week 1-2)
- [ ] EMRM provides intake API endpoint
- [ ] Website implements EMRM API client
- [ ] End-to-end testing
- [ ] Production deployment

### Phase 2: Portal Authentication (Week 3-4)
- [ ] EMRM provides auth endpoints
- [ ] Website implements login flow
- [ ] Session management setup
- [ ] Security audit

### Phase 3: Newsletter Sync (Week 5)
- [ ] Define sync strategy
- [ ] Implement chosen method
- [ ] Testing & validation

### Phase 4: Monitoring & Optimization (Ongoing)
- [ ] Setup monitoring dashboards
- [ ] Performance optimization
- [ ] Error tracking

---

## 📄 Document Updates

All documentation in this directory should be kept up to date as the integration evolves.

**Last Updated:** October 2025  
**Version:** 1.0.0

---

## ❓ Need Help?

- Review the [Integration Spec](./EMRM_INTEGRATION_SPEC.md) for detailed requirements
- Import the [OpenAPI spec](./openapi.yaml) into your API tools
- Contact the website team via Slack or email
- For urgent issues, use the escalation procedures above
