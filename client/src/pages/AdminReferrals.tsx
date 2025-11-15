import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Search, Mail, Phone, AlertCircle, User, FileText, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "@/components/AdminLayout";

interface Referral {
  id: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  clientAge?: number;
  presentingConcerns: string;
  urgency: "routine" | "urgent" | "emergency";
  insuranceProvider?: string;
  insuranceMemberId?: string;
  referralSource?: string;
  referralNotes?: string;
  status: string;
  assignedTherapist?: string;
  assignedSupervisor?: string;
  assignmentNotes?: string;
  createdAt: string;
  reviewedAt?: string;
  assignedAt?: string;
  exportedAt?: string;
  completedAt?: string;
}

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "under_review", label: "Under Review" },
  { value: "assigned", label: "Assigned" },
  { value: "contacted", label: "Contacted" },
  { value: "scheduled", label: "Scheduled" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "declined", label: "Declined" },
  { value: "cancelled", label: "Cancelled" },
];

const URGENCY_OPTIONS = [
  { value: "all", label: "All Urgencies" },
  { value: "routine", label: "Routine" },
  { value: "urgent", label: "Urgent" },
  { value: "emergency", label: "Emergency" },
];

export default function AdminReferrals() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [urgencyFilter, setUrgencyFilter] = useState("all");
  const [selectedReferral, setSelectedReferral] = useState<Referral | null>(null);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [assignFormData, setAssignFormData] = useState({
    status: "assigned",
    assignedTherapist: "",
    assignedSupervisor: "",
    assignmentNotes: "",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Build query params for filters
  const queryParams = new URLSearchParams();
  if (statusFilter !== "all") queryParams.set("status", statusFilter);
  if (urgencyFilter !== "all") queryParams.set("urgency", urgencyFilter);
  if (searchTerm) queryParams.set("search", searchTerm);
  const queryString = queryParams.toString();

  const { data, isLoading } = useQuery<{ success: boolean; data: Referral[] }>({
    queryKey: [`/api/admin/referrals${queryString ? `?${queryString}` : ""}`],
  });

  const updateReferralMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Referral> }) => {
      const response = await fetch(`/api/admin/referrals/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to update referral");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/referrals"] });
      toast({
        title: "Success",
        description: "Referral updated successfully",
      });
      setIsAssignDialogOpen(false);
      setSelectedReferral(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update referral",
        variant: "destructive",
      });
    },
  });

  const referrals = data?.data || [];

  const handleAssign = () => {
    if (!selectedReferral) return;
    updateReferralMutation.mutate({
      id: selectedReferral.id,
      updates: assignFormData,
    });
  };

  const handleStatusChange = (referral: Referral, newStatus: string) => {
    updateReferralMutation.mutate({
      id: referral.id,
      updates: { status: newStatus },
    });
  };

  const getUrgencyBadgeVariant = (urgency: string) => {
    switch (urgency) {
      case "emergency":
        return "destructive";
      case "urgent":
        return "default";
      default:
        return "secondary";
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "completed":
        return "default";
      case "cancelled":
      case "declined":
        return "secondary";
      default:
        return "outline";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6" data-testid="page-admin-referrals">
        <div>
          <h1 className="text-3xl font-bold">Referral Management</h1>
          <p className="text-muted-foreground mt-2">
            Track, assign, and manage client referrals through the intake pipeline
          </p>
        </div>

        {/* Filters */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or concerns..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-referrals"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger data-testid="select-status-filter">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
            <SelectTrigger data-testid="select-urgency-filter">
              <SelectValue placeholder="Filter by urgency" />
            </SelectTrigger>
            <SelectContent>
              {URGENCY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{referrals.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {referrals.filter((r) => r.status === "pending").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Emergency</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {referrals.filter((r) => r.urgency === "emergency").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {referrals.filter((r) => r.status === "completed").length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Referral List */}
        <div className="space-y-4">
          {referrals.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No referrals found</p>
                <p className="text-sm text-muted-foreground">
                  {searchTerm || statusFilter !== "all" || urgencyFilter !== "all"
                    ? "Try adjusting your filters"
                    : "Referrals will appear here"}
                </p>
              </CardContent>
            </Card>
          ) : (
            referrals.map((referral) => (
              <Card key={referral.id} data-testid={`referral-card-${referral.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-xl">{referral.clientName}</CardTitle>
                      <CardDescription className="flex items-center gap-4 mt-2">
                        <span className="flex items-center gap-1">
                          <Mail className="h-4 w-4" />
                          {referral.clientEmail}
                        </span>
                        {referral.clientPhone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-4 w-4" />
                            {referral.clientPhone}
                          </span>
                        )}
                        {referral.clientAge && (
                          <span className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            Age {referral.clientAge}
                          </span>
                        )}
                      </CardDescription>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex gap-2">
                        <Badge variant={getUrgencyBadgeVariant(referral.urgency)}>
                          {referral.urgency === "emergency" && <AlertCircle className="h-3 w-3 mr-1" />}
                          {referral.urgency.toUpperCase()}
                        </Badge>
                        <Badge variant={getStatusBadgeVariant(referral.status)}>
                          {referral.status.replace("_", " ").toUpperCase()}
                        </Badge>
                      </div>
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(referral.createdAt).toLocaleDateString()} at{" "}
                        {new Date(referral.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium mb-2">Presenting Concerns:</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {referral.presentingConcerns}
                      </p>
                    </div>

                    {referral.insuranceProvider && (
                      <div>
                        <p className="text-sm font-medium mb-1">Insurance:</p>
                        <p className="text-sm text-muted-foreground">
                          {referral.insuranceProvider}
                          {referral.insuranceMemberId && ` - Member ID: ${referral.insuranceMemberId}`}
                        </p>
                      </div>
                    )}

                    {referral.referralSource && (
                      <div>
                        <p className="text-sm font-medium mb-1">Referral Source:</p>
                        <p className="text-sm text-muted-foreground">{referral.referralSource}</p>
                      </div>
                    )}

                    {referral.assignedTherapist && (
                      <div>
                        <p className="text-sm font-medium mb-1">Assigned Therapist:</p>
                        <p className="text-sm text-muted-foreground">{referral.assignedTherapist}</p>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="default"
                        onClick={() => {
                          setSelectedReferral(referral);
                          setAssignFormData({
                            status: referral.status,
                            assignedTherapist: referral.assignedTherapist || "",
                            assignedSupervisor: referral.assignedSupervisor || "",
                            assignmentNotes: referral.assignmentNotes || "",
                          });
                          setIsAssignDialogOpen(true);
                        }}
                        data-testid={`button-assign-${referral.id}`}
                      >
                        <User className="mr-2 h-4 w-4" />
                        Assign / Update
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() =>
                          window.open(
                            `mailto:${referral.clientEmail}?subject=Re: Your referral to MindFit Mental Health`,
                            "_blank"
                          )
                        }
                        data-testid={`button-email-${referral.id}`}
                      >
                        <Mail className="mr-2 h-4 w-4" />
                        Email Client
                      </Button>
                      {referral.clientPhone && (
                        <Button
                          variant="outline"
                          onClick={() => window.open(`tel:${referral.clientPhone}`, "_blank")}
                          data-testid={`button-call-${referral.id}`}
                        >
                          <Phone className="mr-2 h-4 w-4" />
                          Call
                        </Button>
                      )}
                      <Select
                        value={referral.status}
                        onValueChange={(newStatus) => handleStatusChange(referral, newStatus)}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Change status" />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.filter((opt) => opt.value !== "all").map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Assignment Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Assign Referral</DialogTitle>
            <DialogDescription>
              Assign this referral to a therapist and supervisor
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="assignedTherapist">Therapist Email</Label>
              <Input
                id="assignedTherapist"
                type="email"
                placeholder="therapist@mindfithealth.com"
                value={assignFormData.assignedTherapist}
                onChange={(e) =>
                  setAssignFormData({ ...assignFormData, assignedTherapist: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="assignedSupervisor">Supervisor Email</Label>
              <Input
                id="assignedSupervisor"
                type="email"
                placeholder="supervisor@mindfithealth.com"
                value={assignFormData.assignedSupervisor}
                onChange={(e) =>
                  setAssignFormData({ ...assignFormData, assignedSupervisor: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="assignmentNotes">Assignment Notes</Label>
              <Textarea
                id="assignmentNotes"
                placeholder="Add any notes for the assigned therapist..."
                value={assignFormData.assignmentNotes}
                onChange={(e) =>
                  setAssignFormData({ ...assignFormData, assignmentNotes: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAssign}
              disabled={updateReferralMutation.isPending}
            >
              {updateReferralMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
