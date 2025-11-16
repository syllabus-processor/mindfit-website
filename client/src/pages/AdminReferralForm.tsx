import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, ArrowLeft, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "@/components/AdminLayout";

interface ReferralFormData {
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientAge: string;
  presentingConcerns: string;
  urgency: "routine" | "urgent" | "emergency";
  insuranceProvider: string;
}

export default function AdminReferralForm() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState<ReferralFormData>({
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    clientAge: "",
    presentingConcerns: "",
    urgency: "routine",
    insuranceProvider: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleUrgencyChange = (value: string) => {
    setFormData((prev) => ({ ...prev, urgency: value as ReferralFormData["urgency"] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Convert clientAge to number if provided
      const payload: any = {
        ...formData,
        clientAge: formData.clientAge ? parseInt(formData.clientAge) : undefined,
      };

      const response = await fetch("/api/referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create referral");
      }

      const result = await response.json();

      toast({
        title: "Success",
        description: "Referral created successfully",
      });

      // Navigate to referrals list
      setLocation("/admin/referrals");
    } catch (err: any) {
      setError(err.message);
      toast({
        title: "Error",
        description: err.message || "Failed to create referral",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-6" data-testid="page-admin-referral-form">
        {/* Header */}
        <div>
          <Button
            variant="ghost"
            onClick={() => setLocation("/admin/referrals")}
            className="mb-4"
            data-testid="button-back"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Referrals
          </Button>
          <h1 className="text-3xl font-bold">New Referral</h1>
          <p className="text-muted-foreground mt-2">
            Create a new client referral for Bronwyn's intake workflow
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Client Information */}
          <Card>
            <CardHeader>
              <CardTitle>Client Information</CardTitle>
              <CardDescription>Basic contact and demographic information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Client Name */}
                <div className="space-y-2">
                  <Label htmlFor="clientName">
                    Client Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="clientName"
                    name="clientName"
                    value={formData.clientName}
                    onChange={handleChange}
                    required
                    placeholder="Enter client full name"
                    data-testid="input-client-name"
                  />
                </div>

                {/* Client Email */}
                <div className="space-y-2">
                  <Label htmlFor="clientEmail">
                    Email Address <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="clientEmail"
                    name="clientEmail"
                    type="email"
                    value={formData.clientEmail}
                    onChange={handleChange}
                    required
                    placeholder="client@example.com"
                    data-testid="input-client-email"
                  />
                </div>

                {/* Client Phone */}
                <div className="space-y-2">
                  <Label htmlFor="clientPhone">Phone Number</Label>
                  <Input
                    id="clientPhone"
                    name="clientPhone"
                    type="tel"
                    value={formData.clientPhone}
                    onChange={handleChange}
                    placeholder="(555) 123-4567"
                    data-testid="input-client-phone"
                  />
                </div>

                {/* Client Age */}
                <div className="space-y-2">
                  <Label htmlFor="clientAge">Age</Label>
                  <Input
                    id="clientAge"
                    name="clientAge"
                    type="number"
                    min="1"
                    max="120"
                    value={formData.clientAge}
                    onChange={handleChange}
                    placeholder="Age"
                    data-testid="input-client-age"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Insurance Information */}
          <Card>
            <CardHeader>
              <CardTitle>Insurance</CardTitle>
              <CardDescription>Insurance provider information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="insuranceProvider">Insurance Provider</Label>
                <Input
                  id="insuranceProvider"
                  name="insuranceProvider"
                  value={formData.insuranceProvider}
                  onChange={handleChange}
                  placeholder="Insurance company name"
                  data-testid="input-insurance-provider"
                />
              </div>
            </CardContent>
          </Card>

          {/* Clinical Information */}
          <Card>
            <CardHeader>
              <CardTitle>Clinical Information</CardTitle>
              <CardDescription>Urgency level and presenting concerns</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Urgency Level */}
              <div className="space-y-2">
                <Label htmlFor="urgency">
                  Urgency Level <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.urgency}
                  onValueChange={handleUrgencyChange}
                  required
                >
                  <SelectTrigger id="urgency" data-testid="select-urgency">
                    <SelectValue placeholder="Select urgency level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="routine">Routine</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Routine: Standard intake timeline | Urgent: Within 1 week | Emergency: Immediate attention
                </p>
              </div>

              {/* Presenting Concerns */}
              <div className="space-y-2">
                <Label htmlFor="presentingConcerns">
                  Presenting Concerns <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="presentingConcerns"
                  name="presentingConcerns"
                  value={formData.presentingConcerns}
                  onChange={handleChange}
                  required
                  rows={6}
                  placeholder="Describe the client's presenting concerns, symptoms, and reason for referral..."
                  data-testid="textarea-presenting-concerns"
                />
                <p className="text-xs text-muted-foreground">
                  Include relevant clinical information, behavioral concerns, and therapy goals
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Form Actions */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setLocation("/admin/referrals")}
              disabled={loading}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              data-testid="button-submit"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? "Creating Referral..." : "Create Referral"}
            </Button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
