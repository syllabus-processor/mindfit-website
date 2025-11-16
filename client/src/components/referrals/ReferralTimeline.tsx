// MindFit v2 - Referral Timeline Component
// Campaign 1 - Sprint 6.5: Phase 2 - UI Integration
// Classification: TIER-1 | Visual workflow timeline display

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, Circle, Clock } from "lucide-react";
import { format } from "date-fns";

interface TimelineEvent {
  timestamp: string;
  event: string;
  phase: string;
  details?: string;
}

interface TimelineData {
  success: boolean;
  referralId: string;
  clientName: string;
  currentState: string;
  currentStatus: string;
  timeline: TimelineEvent[];
}

interface ReferralTimelineProps {
  referralId: string;
}

const PHASE_COLORS: Record<string, string> = {
  referral: "bg-blue-500",
  pre_staging: "bg-purple-500",
  staging: "bg-indigo-500",
  assignment: "bg-green-500",
  acceptance: "bg-yellow-500",
  treatment: "bg-orange-500",
  completion: "bg-gray-500",
};

const PHASE_LABELS: Record<string, string> = {
  referral: "Referral",
  pre_staging: "Pre-Staging",
  staging: "Staging",
  assignment: "Assignment",
  acceptance: "Intake",
  treatment: "Treatment",
  completion: "Completed",
};

export default function ReferralTimeline({ referralId }: ReferralTimelineProps) {
  const { data, isLoading, error } = useQuery<TimelineData>({
    queryKey: [`/api/referrals/${referralId}/timeline`],
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-sm text-muted-foreground">Failed to load timeline</p>
        </CardContent>
      </Card>
    );
  }

  const { timeline, clientName, currentState, currentStatus } = data;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Referral Timeline</CardTitle>
        <CardDescription>
          {clientName} - Current: {currentStatus.replace(/_/g, " ")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative space-y-6 before:absolute before:left-[15px] before:top-[10px] before:bottom-[10px] before:w-[2px] before:bg-border">
          {timeline.map((event, index) => {
            const isLast = index === timeline.length - 1;
            const phaseColor = PHASE_COLORS[event.phase] || "bg-gray-500";
            const phaseLabel = PHASE_LABELS[event.phase] || event.phase;

            return (
              <div key={index} className="relative flex gap-4 pl-10">
                {/* Timeline dot */}
                <div className="absolute left-0 top-[10px]">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center ${phaseColor}`}>
                    {isLast ? (
                      <CheckCircle2 className="h-5 w-5 text-white" />
                    ) : (
                      <Circle className="h-3 w-3 text-white" />
                    )}
                  </div>
                </div>

                {/* Event content */}
                <div className="flex-1 space-y-1 pb-4">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{event.event}</p>
                    <Badge variant="outline" className="text-xs">
                      {phaseLabel}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {format(new Date(event.timestamp), "MMM d, yyyy 'at' h:mm a")}
                  </div>

                  {event.details && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {event.details}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {timeline.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12">
            <Circle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No timeline events</p>
            <p className="text-sm text-muted-foreground">
              Events will appear as the referral progresses
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
