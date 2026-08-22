"use client";

import { motion } from "framer-motion";
import { Droplets, Moon, Wind, Dumbbell, Brain, Apple } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { RecoveryActivityResponse, RecoveryActivityCategory } from "@/types";

const CATEGORY_CONFIG: Record<
  RecoveryActivityCategory,
  { icon: typeof Droplets; label: string; tint: string; bg: string }
> = {
  hydration: { icon: Droplets, label: "Hydration", tint: "text-blue-600", bg: "bg-blue-50" },
  rest: { icon: Moon, label: "Rest", tint: "text-indigo-600", bg: "bg-indigo-50" },
  breathing: { icon: Wind, label: "Breathing", tint: "text-teal-600", bg: "bg-teal-50" },
  stretching: { icon: Dumbbell, label: "Stretching", tint: "text-amber-600", bg: "bg-amber-50" },
  mindfulness: { icon: Brain, label: "Mindfulness", tint: "text-purple-600", bg: "bg-purple-50" },
  nutrition: { icon: Apple, label: "Nutrition", tint: "text-green-600", bg: "bg-green-50" },
};

interface RecoveryActivityCardProps {
  activity: RecoveryActivityResponse;
}

export default function RecoveryActivityCard({ activity }: RecoveryActivityCardProps) {
  const config = CATEGORY_CONFIG[activity.category] ?? CATEGORY_CONFIG.rest;
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      <Card className="overflow-hidden border-secondary/20">
        <div className={`h-1 ${config.bg.replace("50", "400")}`} />
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${config.bg}`}>
              <Icon className={`h-5 w-5 ${config.tint}`} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold text-foreground">Suggested activity</h4>
                <Badge variant="outline" className={`text-xs ${config.tint} border-current/20`}>
                  {config.label}
                </Badge>
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-foreground/80">
                {activity.activity}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                ⏱ ~{activity.duration_minutes} min
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
