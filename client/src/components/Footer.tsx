import { Link } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Footer() {
  const [email, setEmail] = useState("");
  const { toast } = useToast();

  const newsletterMutation = useMutation({
    mutationFn: async (email: string) => {
      return await apiRequest("POST", "/api/newsletter/subscribe", { email });
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "You've been subscribed to our newsletter.",
      });
      setEmail("");
    },
    onError: (error: Error) => {
      toast({
        title: "Subscription failed",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      newsletterMutation.mutate(email);
    }
  };

  return (
    <footer className="bg-[hsl(215,50%,25%)] text-[hsl(210,15%,90%)] py-16">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* About */}
          <div>
            <h3 className="text-xl font-semibold mb-4 text-white">MindFit Mental Health</h3>
            <p className="text-sm leading-relaxed text-[hsl(210,15%,80%)]">
              Tech-empowered therapy for kids, teens, and families. Compassionate,
              evidence-based care that meets you where you are.
            </p>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-white">Services</h3>
            <ul className="space-y-2">
              <li>
                <Link 
                  href="/services" 
                  className="text-sm text-[hsl(210,15%,80%)] hover:text-white transition-colors"
                  data-testid="link-footer-individual-therapy"
                >
                  Individual Therapy
                </Link>
              </li>
              <li>
                <Link 
                  href="/services" 
                  className="text-sm text-[hsl(210,15%,80%)] hover:text-white transition-colors"
                  data-testid="link-footer-ocd-consultations"
                >
                  OCD Consultations
                </Link>
              </li>
              <li>
                <Link 
                  href="/services" 
                  className="text-sm text-[hsl(210,15%,80%)] hover:text-white transition-colors"
                  data-testid="link-footer-group-therapy"
                >
                  Group Therapy
                </Link>
              </li>
              <li>
                <Link 
                  href="/services" 
                  className="text-sm text-[hsl(210,15%,80%)] hover:text-white transition-colors"
                  data-testid="link-footer-behavior-plans"
                >
                  Behavior Plans
                </Link>
              </li>
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-white">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link 
                  href="/about" 
                  className="text-sm text-[hsl(210,15%,80%)] hover:text-white transition-colors"
                  data-testid="link-footer-about"
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link 
                  href="/about#team" 
                  className="text-sm text-[hsl(210,15%,80%)] hover:text-white transition-colors"
                  data-testid="link-footer-team"
                >
                  Our Team
                </Link>
              </li>
              <li>
                <Link 
                  href="/about#faq" 
                  className="text-sm text-[hsl(210,15%,80%)] hover:text-white transition-colors"
                  data-testid="link-footer-faq"
                >
                  FAQ
                </Link>
              </li>
              <li>
                <Link 
                  href="/contact" 
                  className="text-sm text-[hsl(210,15%,80%)] hover:text-white transition-colors"
                  data-testid="link-footer-contact"
                >
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-white">Stay Connected</h3>
            <p className="text-sm text-[hsl(210,15%,80%)] mb-4">
              Get mental health tips and updates delivered to your inbox.
            </p>
            <form onSubmit={handleNewsletterSubmit} className="space-y-2">
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white focus:ring-white/20"
                required
                data-testid="input-newsletter-email"
              />
              <Button 
                type="submit" 
                className="w-full"
                disabled={newsletterMutation.isPending}
                data-testid="button-newsletter-subscribe"
              >
                {newsletterMutation.isPending ? "Subscribing..." : "Subscribe"}
              </Button>
            </form>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-[hsl(210,15%,70%)]">
            © {new Date().getFullYear()} MindFit Mental Health. All rights reserved.
          </p>

          {/* Discreet Portal Access - Two Logins */}
          <div className="flex items-center gap-6">
            <Link
              href="/admin/login"
              className="flex items-center gap-2 text-sm text-[hsl(210,15%,60%)] hover:text-[hsl(210,15%,80%)] transition-colors"
              data-testid="link-mindfit-staff"
            >
              <Lock className="h-3 w-3" />
              <span>MindFit Staff</span>
            </Link>

            <div className="h-4 w-px bg-white/10" />

            <Link
              href="/portal/login"
              className="flex items-center gap-2 text-sm text-[hsl(210,15%,60%)] hover:text-[hsl(210,15%,80%)] transition-colors"
              data-testid="link-ema-portal"
            >
              <Lock className="h-3 w-3" />
              <span>EMA Staff & Clients</span>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
