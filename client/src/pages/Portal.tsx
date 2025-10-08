import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Shield } from "lucide-react";
import { useState } from "react";

export default function Portal() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // This would redirect to the actual EMRM system
    // For now, it's a placeholder that would connect to your existing EMRM
    window.location.href = import.meta.env.VITE_EMRM_URL || "/emrm";
  };

  return (
    <div className="min-h-screen bg-[hsl(215,20%,12%)] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">MindFit</h1>
          <p className="text-[hsl(210,15%,70%)] text-sm">Secure Portal Access</p>
        </div>

        <Card className="bg-[hsl(215,15%,18%)] border-[hsl(215,16%,28%)]">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Lock className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl text-white">Staff & Client Login</CardTitle>
            <CardDescription className="text-[hsl(210,15%,70%)]">
              Access the MindFit Electronic Medical Records System
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[hsl(210,15%,90%)]">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-[hsl(215,16%,24%)] border-[hsl(215,16%,28%)] text-white placeholder:text-[hsl(210,12%,50%)]"
                  required
                  data-testid="input-portal-email"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="password" className="text-[hsl(210,15%,90%)]">Password</Label>
                  <a href="#" className="text-sm text-primary hover:underline" data-testid="link-forgot-password">
                    Forgot password?
                  </a>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-[hsl(215,16%,24%)] border-[hsl(215,16%,28%)] text-white placeholder:text-[hsl(210,12%,50%)]"
                  required
                  data-testid="input-portal-password"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                size="lg"
                data-testid="button-portal-login"
              >
                Sign In
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-[hsl(215,16%,28%)]">
              <div className="flex items-center gap-2 text-sm text-[hsl(210,15%,70%)]">
                <Shield className="h-4 w-4 text-green-500" />
                <span>HIPAA Compliant • Secure • Encrypted</span>
              </div>
            </div>

            <div className="mt-4">
              <p className="text-xs text-[hsl(210,12%,60%)] text-center">
                Having trouble accessing your account? Contact our support team at{" "}
                <a href="mailto:support@mindfithealth.com" className="text-primary hover:underline" data-testid="link-support-email">
                  support@mindfithealth.com
                </a>
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <a href="/" className="text-sm text-[hsl(210,15%,70%)] hover:text-white transition-colors" data-testid="link-back-to-website">
            ← Back to main website
          </a>
        </div>
      </div>
    </div>
  );
}
