# MindFit Mental Health Website - Design Guidelines

## Design Approach

**Reference-Based Approach** drawing inspiration from modern mental health and wellness platforms (Headspace, BetterHelp, Calm) combined with professional medical practice aesthetics. The design balances clinical credibility with approachable warmth, creating a safe, trustworthy environment for families seeking mental health support.

**Core Principles:**
- Trust through clarity: Clean layouts with obvious navigation and CTAs
- Calm confidence: Soothing color palette that conveys professionalism
- Tech-forward warmth: Modern interface that feels human, not clinical
- Accessible simplicity: Easy-to-understand content hierarchy for all ages

---

## Color Palette

**Primary Brand Colors:**
- **Primary Blue**: 210 65% 45% - Trustworthy, calming, professional (buttons, headers, key accents)
- **Deep Navy**: 215 50% 25% - Authority and stability (text, footer backgrounds)
- **Soft Teal**: 180 40% 55% - Secondary accent for interactive elements

**Supporting Colors:**
- **Warm Neutral Background**: 30 15% 97% - Main page background (off-white with subtle warmth)
- **Cool Gray**: 215 15% 50% - Body text, secondary information
- **Light Accent**: 35 80% 95% - Subtle section dividers, card backgrounds (very light peach/cream)

**Semantic Colors:**
- **Success Green**: 150 60% 45% - Form confirmations, positive states
- **Alert Coral**: 10 70% 55% - Important notices (used sparingly)

**Dark Mode** (for portal access only):
- Background: 215 20% 12%
- Surface: 215 15% 18%
- Text: 210 15% 90%

---

## Typography

**Font Families:**
- **Headlines**: 'Inter', sans-serif (700, 600, 500 weights) - Modern, highly legible
- **Body**: 'Inter', sans-serif (400, 500 weights) - Same family for cohesion
- **Accent/Quotes**: 'Libre Baskerville', serif (400 italic) - Warmth for testimonials

**Type Scale:**
- Hero Headline: text-5xl md:text-6xl lg:text-7xl, font-bold, tracking-tight
- Section Headers: text-3xl md:text-4xl lg:text-5xl, font-semibold
- Subsection Headers: text-xl md:text-2xl, font-semibold
- Body Large: text-lg, leading-relaxed
- Body Regular: text-base, leading-relaxed
- Small/Meta: text-sm, text-gray-500

---

## Layout System

**Spacing Primitives:** Use Tailwind units of **4, 6, 8, 12, 16, 20** for consistent rhythm
- Component padding: p-6 to p-8
- Section spacing: py-16 md:py-20 lg:py-24
- Card gaps: gap-6 to gap-8
- Element margins: mt-4, mb-6, mx-8

**Container Strategy:**
- Full-width sections: w-full with inner max-w-7xl mx-auto px-6
- Content-focused sections: max-w-6xl mx-auto px-6
- Text content: max-w-4xl for optimal readability
- Forms: max-w-2xl for focused interaction

**Grid Systems:**
- Services cards: grid-cols-1 md:grid-cols-2 lg:grid-cols-3
- Team bios: grid-cols-1 md:grid-cols-2 lg:grid-cols-3
- FAQ layout: Single column max-w-3xl
- Contact page: md:grid-cols-2 (form + info split)

---

## Component Library

### Navigation
- **Header**: Sticky top navigation with logo left, menu items center/right, "Schedule Appointment" CTA button (primary blue)
- **Portal Access**: Subtle "Staff Login" text link in footer only, not in main navigation (text-sm, text-gray-400 hover:text-gray-600)
- **Mobile Menu**: Slide-in drawer with large touch targets

### Hero Section (Home)
- **Layout**: Full-width with 80vh min-height, asymmetric two-column (60/40 split)
- **Content**: Left - headline + subheadline + CTA buttons, Right - large hero image
- **CTA Buttons**: Primary "Schedule Appointment" (solid blue) + Secondary "Learn More" (outline with backdrop-blur-sm if over image)

### Cards & Content Blocks
- **Service Cards**: Rounded-2xl, border border-gray-200, p-8, hover:shadow-lg transition, icon top-left (size-12, text-primary)
- **Team Bio Cards**: Photo (rounded-full, w-32 h-32), name (text-xl font-semibold), title (text-sm text-gray-500), bio snippet
- **Testimonial Cards**: Quoted text in serif italic, attribution with small photo, star rating visual

### Forms
- **Contact/Appointment Form**: Clean white card with shadow-xl, rounded-2xl padding
- **Input Fields**: border-gray-300, focus:border-primary, focus:ring-2 focus:ring-primary/20, rounded-lg, p-3
- **Submit Button**: Full-width on mobile, auto-width on desktop, primary blue with hover:bg-primary-dark
- **Field Labels**: text-sm font-medium text-gray-700, mb-2

### Sections
- **Features/Services Overview**: 3-column grid with icons, headlines, descriptions
- **Social Proof**: Centered testimonial carousel or 3-column static grid
- **CTA Sections**: Centered content with gradient background (subtle blue-to-teal), py-20, single focused message
- **Footer**: 4-column layout (About, Services, Quick Links, Contact) with newsletter signup and discreet staff login link

### Interactive Elements
- **Buttons**: Primary (solid blue, white text), Secondary (outline blue), Ghost (transparent, blue text)
- **Links**: Underline on hover, transition-colors, primary blue color
- **Accordions** (FAQ): Clean borders, rotate chevron animation, smooth expand/collapse

---

## Images

**Hero Section:**
- Large, high-quality hero image showing diverse families/teens in supportive, calm environment
- Positioned right side of hero section, rounded-2xl with subtle shadow
- Image should convey warmth, professionalism, diversity (stock photos from Unsplash: family therapy, teens, supportive environments)

**Additional Images:**
- **Services Page**: Icon-based illustrations rather than photos for each service type (clean, modern line icons)
- **About/Team Page**: Professional headshots of therapists in circular frames, consistent lighting/background
- **Testimonial Section**: Small circular client photos (if using attributed testimonials) or abstract calming imagery
- **Contact Page Background**: Subtle abstract pattern or light texture, not a photo

**Image Treatment:**
- All photos: rounded-2xl corners for modern feel
- Aspect ratios: 16:9 for hero, 1:1 for team photos
- Overlay text on images: Use backdrop-blur-sm and dark overlay (bg-black/40) for readability

---

## Portal Access Design

**Discreet Implementation:**
- No prominent "Login" or "Portal" in main navigation
- Footer placement only: "Staff & Client Access" link in small text (text-sm text-gray-400)
- Hover state: text-gray-600, no underline at rest
- Click leads to `/portal/login` route or subdomain
- Login page: Clean, simple form with MindFit logo, email/password fields, "Forgot Password" link
- Portal UI: Uses dark mode by default for visual separation from public site

**Security Indicators:**
- Lock icon next to portal link in footer
- HTTPS badge visible on login page
- "Secure Access" text near login form

---

## Accessibility & Responsiveness

- **Color Contrast**: All text meets WCAG AA standards (4.5:1 for body, 3:1 for large text)
- **Focus States**: Visible focus rings on all interactive elements (ring-2 ring-primary ring-offset-2)
- **Mobile Navigation**: Touch targets minimum 44px height
- **Responsive Images**: Use srcset for optimized loading
- **Form Validation**: Clear error states with icons and descriptive messages
- **Screen Reader**: Semantic HTML, aria-labels for icon-only buttons

---

## Animation & Motion

**Minimal, Purposeful Animations:**
- Scroll-triggered fade-ins: opacity-0 to opacity-100, translate-y-4 to translate-y-0 (subtle)
- Hover states: scale-105 on cards, shadow transitions
- Page transitions: Smooth fade between routes
- **No**: Parallax scrolling, complex scroll-driven animations, auto-playing video backgrounds

---

## Content Hierarchy & Flow

**Home Page Sections (in order):**
1. Hero with headline + CTA
2. Services Overview (3-column grid)
3. Why MindFit (values, tech-empowered approach)
4. Team Preview (featured therapists, link to full About page)
5. Testimonials/Social Proof
6. Final CTA (Schedule Appointment)
7. Footer with newsletter + discreet portal access

**Vertical Rhythm:** Consistent py-20 between major sections, py-12 for subsections, maintaining visual breathing room throughout