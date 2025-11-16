// MindFit v2 - Workflow Status Transition Modal
// Campaign 1 - Sprint 6.5: Phase 2 - UI Integration
// Classification: TIER-1 | Workflow status updates with validation

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowRight, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface NextStatus {
  value: string;
  label: string;
}

interface NextStatusesData {
  success: boolean;
  currentStatus: string;
  currentLabel: string;
  nextStatuses: NextStatus[];
}

interface WorkflowStatusModalProps {
  referralId: string;
  currentStatus: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function WorkflowStatusModal({
  referralId,
  currentStatus,
  isOpen,
  onClose,
}: WorkflowStatusModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<NextStatusesData>({
    queryKey: [`/api/referrals/${referralId}/next-statuses`],
    enabled: isOpen,
  });

  const transitionMutation = useMutation({
    mutationFn: async ({ targetStatus, reason }: { targetStatus: string; reason?: string }) => {
      const response = await fetch(`/api/referrals/${referralId}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetStatus, reason }),
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to transition status");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/referrals"] });
      queryClient.invalidateQueries({ queryKey: [`/api/referrals/${referralId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/referrals/${referralId}/timeline`] });
      toast({
        title: "Status Updated",
        description: "Referral workflow status has been updated successfully",
      });
      onClose();
      setSelectedStatus(null);
      setReason("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive",
      });
    },
  });

  const handleTransition = () => {
    if (!selectedStatus) return;

    // Check if reason is required
    const requiresReason = selectedStatus === "declined" || selectedStatus === "referral_declined";
    if (requiresReason && !reason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for this status change",
        variant: "destructive",
      });
      return;
    }

    transitionMutation.mutate({
      targetStatus: selectedStatus,
      reason: reason.trim() || undefined,
    });
  };

  const requiresReason = selectedStatus === "declined" || selectedStatus === "referral_declined";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Update Workflow Status</DialogTitle>
          <DialogDescription>
            Select the next workflow status for this referral
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {/* Current Status */}
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <Label className="text-sm font-medium">Current Status:</Label>
              <Badge variant="outline">{data?.currentLabel || currentStatus}</Badge>
            </div>

            {/* Next Status Options */}
            <div className="space-y-2">
              <Label>Select Next Status:</Label>
              {data?.nextStatuses && data.nextStatuses.length > 0 ? (
                <div className="grid gap-2">
                  {data.nextStatuses.map((status) => (
                    <button
                      key={status.value}
                      onClick={() => setSelectedStatus(status.value)}
                      className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all hover:border-primary ${
                        selectedStatus === status.value
                          ? "border-primary bg-primary/5"
                          : "border-border"
                      }`}
                    >
                      <span className="font-medium">{status.label}</span>
                      {selectedStatus === status.value && (
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No valid next statuses available</p>
                  <p className="text-sm mt-2">This referral may be in a terminal state</p>
                </div>
              )}
            </div>

            {/* Reason (conditional) */}
            {selectedStatus && requiresReason && (
              <div className="space-y-2">
                <Label htmlFor="reason">Reason *</Label>
                <Textarea
                  id="reason"
                  placeholder="Please provide a reason for declining this referral..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                />
              </div>
            )}

            {/* Preview */}
            {selectedStatus && (
              <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg border-2 border-primary/20">
                <span className="text-sm text-muted-foreground">{data?.currentLabel}</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {data?.nextStatuses.find((s) => s.value === selectedStatus)?.label}
                </span>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={transitionMutation.isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleTransition}
            disabled={!selectedStatus || transitionMutation.isPending}
          >
            {transitionMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Update Status
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
