import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertContactSchema, insertNewsletterSchema } from "@shared/schema";
import { fromError } from "zod-validation-error";

// Email service placeholder - can be replaced with actual email service (Resend, SendGrid, etc.)
async function sendEmail(to: string, subject: string, body: string) {
  console.log("📧 Email would be sent:");
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Body: ${body}`);
  // In production, integrate with email service like Resend:
  // await resend.emails.send({ from: 'noreply@mindfit.com', to, subject, html: body });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Contact form submission
  app.post("/api/contact/submit", async (req, res) => {
    try {
      const validatedData = insertContactSchema.parse(req.body);
      const submission = await storage.createContactSubmission(validatedData);

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
      res.status(500).json({ 
        success: false, 
        message: "Failed to send message. Please try again." 
      });
    }
  });

  // Newsletter subscription
  app.post("/api/newsletter/subscribe", async (req, res) => {
    try {
      const validatedData = insertNewsletterSchema.parse(req.body);
      const subscriber = await storage.createNewsletterSubscriber(validatedData);

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
      res.status(500).json({ 
        success: false, 
        message: "Failed to subscribe. Please try again." 
      });
    }
  });

  // Admin endpoint to view contact submissions (for internal use)
  app.get("/api/admin/contacts", async (req, res) => {
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

  // Admin endpoint to view newsletter subscribers (for internal use)
  app.get("/api/admin/subscribers", async (req, res) => {
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

  const httpServer = createServer(app);

  return httpServer;
}
