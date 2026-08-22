"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface EnergyForecastProps {
  /** Minutes since the recovery activity was shown (or since check-in). */
  minutesElapsed?: number;
}

const STAGES = [
  { min: 0, label: "Resting", color: "text-amber-500", bg: "bg-amber-100", fill: 20 },
  { min: 1, label: "Recharging", color: "text-amber-500", bg: "bg-amber-100", fill: 40 },
  { min: 2, label: "Building up", color: "text-teal-500", bg: "bg-teal-100", fill: 60 },
  { min: 3, label: "Feeling better", color: "text-green-500", bg: "bg-green-100", fill: 80 },
  { min: 5, label: "Recharged!", color: "text-green-600", bg: "bg-green-100", fill: 100 },
];

function getStage(minutes: number) {
  let result = STAGES[0]!;
  for (const stage of STAGES) {
    if (minutes >= stage.min) result = stage;
  }
  return result;
}

export default function EnergyForecast({ minutesElapsed = 0 }: EnergyForecastProps) {
  const [minutes, setMinutes] = useState(minutesElapsed);

  // Auto-tick every 60 seconds if the component stays mounted
  useEffect(() => {
    const interval = setInterval(() => {
      setMinutes((m) => m + 1);
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  const stage = getStage(minutes);

  return (
    <Card className="overflow-hidden border-secondary/20">
      <CardContent className="p-5">
        <div className="mb-3 flex items-center gap-2">
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${stage.bg}`}>
            <Zap className={`h-4 w-4 ${stage.color}`} />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground">Energy forecast</h4>
            <p className="text-xs text-muted-foreground">Estimated recovery progress</p>
          </div>
        </div>

        <div className="mt-2">
          {/* Energy bar */}
          <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
            <motion.div
              className={`h-full rounded-full ${stage.bg.replace("100", "400")}`}
              initial={{ width: 0 }}
              animate={{ width: `${stage.fill}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>

          <div className="mt-2 flex items-center justify-between">
            <span className={`text-sm font-medium ${stage.color}`}>{stage.label}</span>
            <span className="text-xs text-muted-foreground">
              {minutes < 1 ? "Just started" : `~${minutes} min in`}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
