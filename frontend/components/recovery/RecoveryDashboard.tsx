"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Shield, Sun, TrendingDown, Flame, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { updateProfile } from "@/services/profile";
import { getRecoveryActivity } from "@/services/checkin";
import type { UserProfile, RecoveryActivityResponse } from "@/types";
import RecoveryActivityCard from "./RecoveryActivityCard";
import BreathingWidget from "./BreathingWidget";
import EnergyForecast from "./EnergyForecast";

interface RecoveryDashboardProps {
  profile: UserProfile;
}

export default function RecoveryDashboard({ profile }: RecoveryDashboardProps) {
  const queryClient = useQueryClient();
  const [isExiting, setIsExiting] = useState(false);

  // Fetch a recovery activity based on the user's state
  const { data: activity, isLoading: activityLoading } = useQuery<RecoveryActivityResponse>({
    queryKey: ["recovery-activity"],
    queryFn: () =>
      getRecoveryActivity("User is in recovery mode and feeling unwell or stressed."),
    staleTime: 5 * 60 * 1000, // Keep for 5 minutes
  });

  const handleExitRecovery = async () => {
    setIsExiting(true);
    try {
      await updateProfile({ is_recovery_mode: false });
      // Invalidate the profile query so the dashboard switches back
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    } catch {
      setIsExiting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-6"
    >
      {/* Recovery mode banner */}
      <div className="clinical-panel overflow-hidden border-secondary/30 p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-secondary/10 px-3 py-1 text-xs font-semibold text-secondary">
              <Shield className="h-3.5 w-3.5" />
              Recovery Mode active
            </div>
            <h1 className="mt-4 font-display text-2xl font-semibold text-foreground">
              Take it easy today
            </h1>
            <p className="mt-1 max-w-lg text-sm text-muted-foreground">
              We&apos;ve noticed you&apos;re not feeling your best. Your goals have been
              adjusted and we&apos;ve got some gentle activities to help you recover.
            </p>
          </div>
        </div>
      </div>

      {/* Reduced stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-secondary/15">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
              <TrendingDown className="h-3.5 w-3.5" />
              Today&apos;s target
            </div>
            <p className="mt-1 text-2xl font-semibold text-secondary">
              {profile.daily_goal_target.toLocaleString()}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">steps (reduced)</p>
          </CardContent>
        </Card>

        <Card className="border-secondary/15">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
              <Flame className="h-3.5 w-3.5" />
              Streak
            </div>
            <p className="mt-1 text-2xl font-semibold text-foreground">
              {profile.current_streak}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              <Badge variant="outline" className="text-xs text-secondary border-secondary/30">
                frozen today
              </Badge>
            </p>
          </CardContent>
        </Card>

        <Card className="border-secondary/15">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
              <Sun className="h-3.5 w-3.5" />
              Status
            </div>
            <p className="mt-1 text-lg font-semibold text-secondary">Recovering</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Auto-exits in 24h or when you&apos;re ready
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Activity + widgets grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          {activityLoading ? (
            <Card className="border-secondary/20">
              <CardContent className="flex items-center justify-center p-8">
                <Loader2 className="h-5 w-5 animate-spin text-secondary" />
                <span className="ml-2 text-sm text-muted-foreground">
                  Finding a recovery activity for you...
                </span>
              </CardContent>
            </Card>
          ) : activity ? (
            <RecoveryActivityCard activity={activity} />
          ) : null}

          <EnergyForecast />
        </div>

        <div className="space-y-4">
          <BreathingWidget />
        </div>
      </div>

      {/* Exit recovery */}
      <Card className="border-dashed border-secondary/20">
        <CardContent className="flex items-center justify-between p-5">
          <div>
            <h4 className="text-sm font-semibold text-foreground">Feeling better?</h4>
            <p className="text-xs text-muted-foreground">
              Exit recovery mode to restore your normal goals and dashboard.
            </p>
          </div>
          <Button
            id="exit-recovery"
            onClick={handleExitRecovery}
            disabled={isExiting}
            variant="secondary"
            size="sm"
          >
            {isExiting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
            {isExiting ? "Exiting..." : "I'm feeling better"}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
