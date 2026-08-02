"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { SymptomForm } from "@/components/symptom-checker/symptom-form";
import { SymptomResult } from "@/components/symptom-checker/symptom-result";
import { checkSymptoms } from "@/services/symptomChecker";
import { useToast } from "@/hooks/use-toast";
import type { SymptomCheckRequest, SymptomCheckResponse } from "@/types";

export default function SymptomCheckerPage() {
  const [result, setResult] = useState<SymptomCheckResponse | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (values: SymptomCheckRequest) => checkSymptoms(values),
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ["symptom-history"] });
    },
    onError: (err: Error) => {
      toast({ variant: "danger", title: "Couldn't analyze symptoms", description: err.message });
    },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">AI Symptom Checker</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Share what you&apos;re experiencing for a structured, educational summary.
        </p>
      </div>

      <AnimatePresence mode="wait">
        {!result && (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            <SymptomForm onSubmit={(values) => mutation.mutate(values)} loading={mutation.isPending} />
          </motion.div>
        )}

        {result && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="space-y-4"
          >
            <SymptomResult result={result} />
            <button
              onClick={() => setResult(null)}
              className="mx-auto block text-sm font-medium text-primary hover:underline"
            >
              Run another check
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
