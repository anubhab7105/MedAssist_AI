"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Send, Loader2, Heart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { postCheckIn } from "@/services/checkin";
import type { CheckInResponse } from "@/types";

interface CheckInWidgetProps {
  onCheckInComplete: (result: CheckInResponse) => void;
}

export default function CheckInWidget({ onCheckInComplete }: CheckInWidgetProps) {
  const [text, setText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const trimmed = text.trim();
    if (!trimmed || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await postCheckIn(trimmed);
      onCheckInComplete(result);
      setText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="overflow-hidden border-secondary/20 bg-gradient-to-br from-white to-[#f0faf9]">
        <CardContent className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/10">
              <Heart className="h-4 w-4 text-secondary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">How are you feeling?</h3>
              <p className="text-xs text-muted-foreground">
                Share what&apos;s on your mind — we&apos;ll check if you need a lighter day.
              </p>
            </div>
          </div>

          <Textarea
            id="checkin-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. I barely slept, have a headache, and feel really stressed about exams..."
            className="min-h-[80px] border-secondary/20 bg-white/80 focus-visible:border-secondary focus-visible:ring-secondary/15"
            maxLength={4000}
            disabled={isSubmitting}
            error={!!error}
          />

          {error && (
            <p className="mt-2 text-xs text-danger">{error}</p>
          )}

          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {text.length}/4000
            </p>
            <Button
              id="checkin-submit"
              onClick={handleSubmit}
              disabled={!text.trim() || isSubmitting}
              size="sm"
              variant="secondary"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {isSubmitting ? "Checking..." : "Check in"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
