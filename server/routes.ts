import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertContactSchema, insertNewsletterSchema, insertIntegrationSettingSchema, insertUserSchema, insertReferralSchema, updateReferralSchema } from "@shared/schema";
import { fromError } from "zod-validation-error";
import { createProvider } from "./providers";
import bcrypt from "bcryptjs";
import { registerEventRoutes } from "./routes/events";
import { registerMigrationRoutes } from "./routes/migrate";

// Security middleware - Rate limiters
// NOTE: Rate limiting disabled - using Cloudflare WAF instead
// See: /mnt/d/projects/mindfit-fixes/CLOUDFLARE_RATE_LIMITING_CONFIG.md
// @ts-ignore - JS module
// import { loginLimiter, contactLimiter, newsletterLimiter } from "../security-middleware/03-rate-limiting.js";

// Email service placeholder - can be replaced with actual email service (Resend, SendGrid, etc.)
async function sendEmail(to: string, subject: string, body: string) {
  console.log("📧 Email would be sent:");
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Body: ${body}`);
  // In production, integrate with email service like Resend:
  // await resend.emails.send({ from: 'noreply@mindfit.com', to, subject, html: body });
}

// Auth middleware to protect admin routes
function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.session?.userId) {
    next();
  } else {
    res.status(401).json({ success: false, message: "Unauthorized" });
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Admin login - rate limiting handled by Cloudflare WAF
  app.post("/api/admin/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      const user = await storage.getUserByUsername(username);
      
      if (!user) {
        return res.status(401).json({ 
          success: false, 
          message: "Invalid username or password" 
        });
      }

      const isValid = await bcrypt.compare(password, user.password);
      
      if (!isValid) {
        return res.status(401).json({ 
          success: false, 
          message: "Invalid username or password" 
        });
      }

      req.session.userId = user.id;
      
      res.json({ 
        success: true, 
        message: "Login successful",
        user: { id: user.id, username: user.username }
      });
    } catch (error: any) {
      console.error("[LOGIN ERROR]", error);
      res.status(500).json({
        success: false,
        message: "Login failed"
      });
    }
  });

  // Admin logout
  app.post("/api/admin/logout", async (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ 
          success: false, 
          message: "Logout failed" 
        });
      }
      res.json({ success: true, message: "Logged out successfully" });
    });
  });

  // Check auth status
  app.get("/api/admin/me", async (req, res) => {
    if (req.session?.userId) {
      const user = await storage.getUser(req.session.userId);
      if (user) {
        return res.json({ 
          success: true, 
          user: { id: user.id, username: user.username }
        });
      }
    }
    res.status(401).json({ success: false, message: "Not authenticated" });
  });

  // Contact form submission with provider integration - with rate limiting
  app.post("/api/contact/submit", async (req, res) => {
    try {
      const validatedData = insertContactSchema.parse(req.body);
      
      // Store locally first
      const submission = await storage.createContactSubmission(validatedData);

      // Get integration settings and forward to provider
      const setting = await storage.getIntegrationSetting("contact_form");
      if (setting && setting.enabled === "true") {
        try {
          const config = JSON.parse(setting.config || "{}");
          const provider = createProvider(setting.provider as any, config);
          
          const providerResult = await provider.handleContactSubmission(
            validatedData,
            submission.id
          );
          
          if (!providerResult.success) {
            console.error("❌ Provider integration failed:", providerResult.error);
            // Continue anyway - data is already stored locally
          } else {
            console.log(`✅ Contact forwarded to ${provider.name}:`, providerResult.externalId);
          }
        } catch (error: any) {
          console.error("❌ Provider config error, falling back to standalone:", error.message);
          // Continue with standalone behavior - data is already stored locally
        }
      }

      // Send confirmation email to user
      await sendEmail(
        validatedData.email,
        "Thank you for contacting MindFit Mental Health",
        `
          <h2>Thank you for reaching out!</h2>
          <p>We've received your message and will get back to you within 24 hours.</p>
          <p><strong>Your message:</strong></p>
          <p>${validatedData.message}</p>
          <br/>
          <p>Best regards,<br/>The MindFit Team</p>
        `
      );

      // Send notification to staff
      await sendEmail(
        "contact@mindfithealth.com",
        `New Contact Form Submission from ${validatedData.name}`,
        `
          <h2>New Contact Form Submission</h2>
          <p><strong>Name:</strong> ${validatedData.name}</p>
          <p><strong>Email:</strong> ${validatedData.email}</p>
          <p><strong>Phone:</strong> ${validatedData.phone || "Not provided"}</p>
          <p><strong>Preferred Contact:</strong> ${validatedData.preferredContact}</p>
          <p><strong>Message:</strong></p>
          <p>${validatedData.message}</p>
        `
      );

      res.json({ 
        success: true, 
        message: "Message sent successfully",
        id: submission.id 
      });
    } catch (error: any) {
      if (error.name === "ZodError") {
        const validationError = fromError(error);
        return res.status(400).json({ 
          success: false, 
          message: validationError.message 
        });
      }
      console.error("[CONTACT FORM ERROR]", error);
      res.status(500).json({
        success: false,
        message: "Failed to send message. Please try again."
      });
    }
  });

  // Newsletter subscription with provider integration
  // Newsletter subscription - with rate limiting
  app.post("/api/newsletter/subscribe", async (req, res) => {
    try {
      const validatedData = insertNewsletterSchema.parse(req.body);
      
      // Store locally first
      const subscriber = await storage.createNewsletterSubscriber(validatedData);

      // Get integration settings and forward to provider
      const setting = await storage.getIntegrationSetting("newsletter");
      if (setting && setting.enabled === "true") {
        try {
          const config = JSON.parse(setting.config || "{}");
          const provider = createProvider(setting.provider as any, config);
          
          const providerResult = await provider.handleNewsletterSubscription(
            validatedData,
            subscriber.id
          );
          
          if (!providerResult.success) {
            console.error("❌ Provider integration failed:", providerResult.error);
            // Continue anyway - data is already stored locally
          } else {
            console.log(`✅ Newsletter forwarded to ${provider.name}:`, providerResult.externalId);
          }
        } catch (error: any) {
          console.error("❌ Provider config error, falling back to standalone:", error.message);
          // Continue with standalone behavior - data is already stored locally
        }
      }

      // Send welcome email
      await sendEmail(
        validatedData.email,
        "Welcome to MindFit Mental Health Newsletter",
        `
          <h2>Welcome to our community!</h2>
          <p>Thank you for subscribing to the MindFit Mental Health newsletter.</p>
          <p>You'll receive mental health tips, resources, and updates delivered to your inbox.</p>
          <br/>
          <p>Best regards,<br/>The MindFit Team</p>
        `
      );

      res.json({ 
        success: true, 
        message: "Successfully subscribed to newsletter",
        id: subscriber.id 
      });
    } catch (error: any) {
      if (error.message === "Email already subscribed to newsletter") {
        return res.status(400).json({ 
          success: false, 
          message: "This email is already subscribed to our newsletter." 
        });
      }
      if (error.name === "ZodError") {
        const validationError = fromError(error);
        return res.status(400).json({ 
          success: false, 
          message: validationError.message 
        });
      }
      console.error("[NEWSLETTER ERROR]", error);
      res.status(500).json({
        success: false,
        message: "Failed to subscribe. Please try again."
      });
    }
  });

  // Admin endpoint to view contact submissions (protected)
  app.get("/api/admin/contacts", requireAuth, async (req, res) => {
    try {
      const submissions = await storage.getAllContactSubmissions();
      res.json({ success: true, data: submissions });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: "Failed to fetch contact submissions" 
      });
    }
  });

  // Admin endpoint to view newsletter subscribers (protected)
  app.get("/api/admin/subscribers", requireAuth, async (req, res) => {
    try {
      const subscribers = await storage.getAllNewsletterSubscribers();
      res.json({ success: true, data: subscribers });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: "Failed to fetch subscribers" 
      });
    }
  });

  // Integration settings endpoints (protected)
  app.get("/api/admin/integrations", requireAuth, async (req, res) => {
    try {
      const settings = await storage.getAllIntegrationSettings();
      res.json({ success: true, data: settings });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: "Failed to fetch integration settings" 
      });
    }
  });

  app.post("/api/admin/integrations", requireAuth, async (req, res) => {
    try {
      const validatedData = insertIntegrationSettingSchema.parse(req.body);
      const setting = await storage.upsertIntegrationSetting(validatedData);
      res.json({
        success: true,
        message: "Integration settings updated",
        data: setting
      });
    } catch (error: any) {
      if (error.name === "ZodError") {
        const validationError = fromError(error);
        return res.status(400).json({
          success: false,
          message: validationError.message
        });
      }
      res.status(500).json({
        success: false,
        message: "Failed to update integration settings"
      });
    }
  });

  // ========================================================================
  // REFERRAL MANAGEMENT ENDPOINTS (Sprint 1 - Campaign 1)
  // ========================================================================

  // Create new referral (protected)
  app.post("/api/admin/referrals", requireAuth, async (req, res) => {
    try {
      const validatedData = insertReferralSchema.parse(req.body);
      const referral = await storage.createReferral(validatedData, req.session?.userId);

      // Send notification email to supervisor about new referral
      await sendEmail(
        "supervisor@mindfithealth.com",
        `New ${validatedData.urgency} Referral: ${validatedData.clientName}`,
        `
          <h2>New Referral Received</h2>
          <p><strong>Client:</strong> ${validatedData.clientName}</p>
          <p><strong>Email:</strong> ${validatedData.clientEmail}</p>
          <p><strong>Phone:</strong> ${validatedData.clientPhone || "Not provided"}</p>
          <p><strong>Age:</strong> ${validatedData.clientAge || "Not provided"}</p>
          <p><strong>Urgency:</strong> ${validatedData.urgency.toUpperCase()}</p>
          <p><strong>Presenting Concerns:</strong></p>
          <p>${validatedData.presentingConcerns}</p>
          ${validatedData.insuranceProvider ? `<p><strong>Insurance:</strong> ${validatedData.insuranceProvider}</p>` : ''}
          ${validatedData.referralSource ? `<p><strong>Referral Source:</strong> ${validatedData.referralSource}</p>` : ''}
          ${validatedData.referralNotes ? `<p><strong>Notes:</strong> ${validatedData.referralNotes}</p>` : ''}
          <br/>
          <p>Please review and assign this referral in the admin dashboard.</p>
        `
      );

      res.json({
        success: true,
        message: "Referral created successfully",
        data: referral
      });
    } catch (error: any) {
      if (error.name === "ZodError") {
        const validationError = fromError(error);
        return res.status(400).json({
          success: false,
          message: validationError.message
        });
      }
      console.error("[CREATE REFERRAL ERROR]", error);
      res.status(500).json({
        success: false,
        message: "Failed to create referral"
      });
    }
  });

  // Get all referrals with optional filtering (protected)
  app.get("/api/admin/referrals", requireAuth, async (req, res) => {
    try {
      const filters = {
        status: req.query.status as string | undefined,
        urgency: req.query.urgency as string | undefined,
        search: req.query.search as string | undefined,
      };

      const referrals = await storage.getAllReferrals(filters);
      res.json({ success: true, data: referrals });
    } catch (error) {
      console.error("[GET REFERRALS ERROR]", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch referrals"
      });
    }
  });

  // Get single referral by ID (protected)
  app.get("/api/admin/referrals/:id", requireAuth, async (req, res) => {
    try {
      const referral = await storage.getReferral(req.params.id);

      if (!referral) {
        return res.status(404).json({
          success: false,
          message: "Referral not found"
        });
      }

      res.json({ success: true, data: referral });
    } catch (error) {
      console.error("[GET REFERRAL ERROR]", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch referral"
      });
    }
  });

  // Update referral (protected)
  app.put("/api/admin/referrals/:id", requireAuth, async (req, res) => {
    try {
      const validatedData = updateReferralSchema.parse(req.body);
      const referral = await storage.updateReferral(
        req.params.id,
        validatedData,
        req.session?.userId
      );

      // If referral was assigned, send notification to assigned therapist
      if (validatedData.status === "assigned" && validatedData.assignedTherapist) {
        await sendEmail(
          validatedData.assignedTherapist,
          `New Client Referral Assigned: ${referral.clientName}`,
          `
            <h2>You've Been Assigned a New Client</h2>
            <p><strong>Client:</strong> ${referral.clientName}</p>
            <p><strong>Email:</strong> ${referral.clientEmail}</p>
            <p><strong>Phone:</strong> ${referral.clientPhone || "Not provided"}</p>
            <p><strong>Urgency:</strong> ${referral.urgency.toUpperCase()}</p>
            <p><strong>Presenting Concerns:</strong></p>
            <p>${referral.presentingConcerns}</p>
            ${validatedData.assignmentNotes ? `<p><strong>Assignment Notes:</strong> ${validatedData.assignmentNotes}</p>` : ''}
            <br/>
            <p>Please contact the client within 24-48 hours to schedule an initial consultation.</p>
          `
        );
      }

      res.json({
        success: true,
        message: "Referral updated successfully",
        data: referral
      });
    } catch (error: any) {
      if (error.name === "ZodError") {
        const validationError = fromError(error);
        return res.status(400).json({
          success: false,
          message: validationError.message
        });
      }
      if (error.message?.includes("not found")) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }
      console.error("[UPDATE REFERRAL ERROR]", error);
      res.status(500).json({
        success: false,
        message: "Failed to update referral"
      });
    }
  });

  // Delete referral (protected)
  app.delete("/api/admin/referrals/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteReferral(req.params.id);
      res.json({
        success: true,
        message: "Referral deleted successfully"
      });
    } catch (error) {
      console.error("[DELETE REFERRAL ERROR]", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete referral"
      });
    }
  });

  // ========================================================================
  // MINDFIT V2 ROUTES REGISTRATION
  // ========================================================================

  // Register events routes (public + protected)
  registerEventRoutes(app, requireAuth);

  // Register migration routes (admin only)
  registerMigrationRoutes(app, requireAuth);

  const httpServer = createServer(app);

  return httpServer;
}
