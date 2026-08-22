"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Wind } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type BreathPhase = "inhale" | "hold" | "exhale";

const PHASES: { phase: BreathPhase; label: string; seconds: number }[] = [
  { phase: "inhale", label: "Breathe in", seconds: 4 },
  { phase: "hold", label: "Hold", seconds: 4 },
  { phase: "exhale", label: "Breathe out", seconds: 6 },
];

const TOTAL_CYCLE = PHASES.reduce((s, p) => s + p.seconds, 0); // 14s

export default function BreathingWidget() {
  const [isActive, setIsActive] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [cyclesCompleted, setCyclesCompleted] = useState(0);

  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 0.1;
        if (next >= TOTAL_CYCLE) {
          setCyclesCompleted((c) => c + 1);
          return 0;
        }
        return next;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [isActive]);

  const getCurrentPhase = useCallback((): { phase: BreathPhase; label: string; progress: number } => {
    let acc = 0;
    for (const p of PHASES) {
      if (elapsed < acc + p.seconds) {
        return {
          phase: p.phase,
          label: p.label,
          progress: (elapsed - acc) / p.seconds,
        };
      }
      acc += p.seconds;
    }
    return { phase: "inhale", label: "Breathe in", progress: 0 };
  }, [elapsed]);

  const current = getCurrentPhase();

  // Circle scale: inhale grows, hold stays, exhale shrinks
  const circleScale =
    current.phase === "inhale"
      ? 0.6 + 0.4 * current.progress
      : current.phase === "hold"
        ? 1.0
        : 1.0 - 0.4 * current.progress;

  const handleToggle = () => {
    if (isActive) {
      setIsActive(false);
      setElapsed(0);
      setCyclesCompleted(0);
    } else {
      setIsActive(true);
      setElapsed(0);
    }
  };

  return (
    <Card className="overflow-hidden border-secondary/20">
      <CardContent className="flex flex-col items-center p-5">
        <div className="mb-3 flex w-full items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50">
            <Wind className="h-4 w-4 text-teal-600" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground">Breathing exercise</h4>
            <p className="text-xs text-muted-foreground">4-4-6 box breathing</p>
          </div>
        </div>

        <div className="relative my-4 flex h-36 w-36 items-center justify-center">
          {/* Outer ring */}
          <div className="absolute inset-0 rounded-full border-2 border-teal-100" />

          {/* Animated breathing circle */}
          <motion.div
            className="flex items-center justify-center rounded-full bg-gradient-to-br from-teal-400/30 to-secondary/20"
            animate={{
              width: `${circleScale * 100}%`,
              height: `${circleScale * 100}%`,
            }}
            transition={{ duration: 0.1, ease: "linear" }}
          >
            <span className="text-center text-sm font-medium text-secondary">
              {isActive ? current.label : "Ready"}
            </span>
          </motion.div>
        </div>

        {isActive && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-3 text-xs text-muted-foreground"
          >
            Cycles completed: {cyclesCompleted}
          </motion.p>
        )}

        <Button
          id="breathing-toggle"
          onClick={handleToggle}
          variant={isActive ? "outline" : "secondary"}
          size="sm"
        >
          {isActive ? "Stop" : "Start breathing"}
        </Button>
      </CardContent>
    </Card>
  );
}
