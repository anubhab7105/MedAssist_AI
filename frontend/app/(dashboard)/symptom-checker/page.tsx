"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Clock, ClipboardList, RotateCcw, Trash2 } from "lucide-react";
import { SymptomForm } from "@/components/symptom-checker/symptom-form";
import { SymptomResult } from "@/components/symptom-checker/symptom-result";
import { checkSymptoms } from "@/services/symptomChecker";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  getSymptomLocalHistory,
  saveSymptomRecord,
  deleteSymptomRecord,
} from "@/lib/localHistory";
import type { LocalSymptomRecord } from "@/lib/localHistory";
import { formatRelativeTime, severityColor } from "@/lib/utils";
import type { SymptomCheckRequest, SymptomCheckResponse } from "@/types";

type ViewState =
  | { kind: "form" }
  | { kind: "result"; request: SymptomCheckRequest; result: SymptomCheckResponse }
  | { kind: "history-detail"; record: LocalSymptomRecord };

export default function SymptomCheckerPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [view, setView] = useState<ViewState>({ kind: "form" });
  const [history, setHistory] = useState<LocalSymptomRecord[]>([]);

  const userId = user?.id ?? "";

  // Load local history
  const refreshHistory = useCallback(() => {
    if (!userId) return;
    setHistory(getSymptomLocalHistory(userId));
  }, [userId]);

  useEffect(() => {
    refreshHistory();
  }, [refreshHistory]);

  const mutation = useMutation({
    mutationFn: (values: SymptomCheckRequest) => checkSymptoms(values),
    onSuccess: (data, variables) => {
      // Save to local history
      if (userId) {
        saveSymptomRecord(userId, variables, data);
        refreshHistory();
      }
      setView({ kind: "result", request: variables, result: data });
      queryClient.invalidateQueries({ queryKey: ["symptom-history"] });
    },
    onError: (err: Error) => {
      toast({ variant: "danger", title: "Couldn't analyze symptoms", description: err.message });
    },
  });

  const handleDeleteRecord = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!userId) return;
    deleteSymptomRecord(userId, id);
    refreshHistory();
    // If we're viewing the deleted record, go back to form
    if (view.kind === "history-detail" && view.record.id === id) {
      setView({ kind: "form" });
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="clinical-panel p-6">
        <div className="status-pill">
          <span className="status-dot" />
          Structured review
        </div>
        <h1 className="mt-4 font-display text-3xl font-semibold text-foreground">AI Symptom Checker</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Share what you&apos;re experiencing for a structured, educational summary.
        </p>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Previous checks (compact inline list)                             */}
      {/* ----------------------------------------------------------------- */}
      {history.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="clinical-panel p-4"
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <ClipboardList className="h-4 w-4 text-primary" />
              Previous checks
            </h2>
            {view.kind !== "form" && (
              <button
                onClick={() => setView({ kind: "form" })}
                className="flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:text-primary/80"
              >
                <RotateCcw className="h-3 w-3" />
                New check
              </button>
            )}
          </div>
          <div className="space-y-1.5">
            {history.map((record) => (
              <button
                key={record.id}
                onClick={() => setView({ kind: "history-detail", record })}
                className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                  view.kind === "history-detail" && view.record.id === record.id
                    ? "bg-primary/10 text-primary"
                    : "text-foreground/80 hover:bg-muted/15"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium leading-snug">{record.title}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatRelativeTime(record.createdAt)}
                  </p>
                </div>
                {record.result.severity && (
                  <Badge className={severityColor(record.result.severity)} variant="outline">
                    {record.result.severity}
                  </Badge>
                )}
                <button
                  onClick={(e) => handleDeleteRecord(record.id, e)}
                  className="rounded p-1 opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
                  title="Delete"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Main content area                                                 */}
      {/* ----------------------------------------------------------------- */}
      <AnimatePresence mode="wait">
        {view.kind === "form" && (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            <div className="clinical-panel p-6">
              <SymptomForm onSubmit={(values) => mutation.mutate(values)} loading={mutation.isPending} />
            </div>
          </motion.div>
        )}

        {view.kind === "result" && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="space-y-4"
          >
            <SymptomResult result={view.result} />
            <button
              onClick={() => setView({ kind: "form" })}
              className="mx-auto block text-sm font-medium text-primary hover:underline"
            >
              Run another check
            </button>
          </motion.div>
        )}

        {view.kind === "history-detail" && (
          <motion.div
            key={`detail-${view.record.id}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="space-y-4"
          >
            {/* Submitted form data summary */}
            <div className="clinical-panel space-y-3 p-6">
              <h3 className="text-sm font-semibold text-foreground">Submitted details</h3>
              <div className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                <Detail label="Symptoms" value={view.record.formData.symptoms} />
                <Detail label="Duration" value={view.record.formData.duration} />
                <Detail label="Age" value={String(view.record.formData.age)} />
                <Detail label="Gender" value={view.record.formData.gender} />
                <Detail label="Pain level" value={`${view.record.formData.painLevel} / 10`} />
                {view.record.formData.weightKg && (
                  <Detail label="Weight" value={`${view.record.formData.weightKg} kg`} />
                )}
                {view.record.formData.heightCm && (
                  <Detail label="Height" value={`${view.record.formData.heightCm} cm`} />
                )}
                {view.record.formData.temperatureCelsius && (
                  <Detail label="Temperature" value={`${view.record.formData.temperatureCelsius} °C`} />
                )}
                {view.record.formData.currentMedication && (
                  <Detail label="Medication" value={view.record.formData.currentMedication} />
                )}
                {view.record.formData.knownDiseases && (
                  <Detail label="Known conditions" value={view.record.formData.knownDiseases} />
                )}
                {view.record.formData.allergies && (
                  <Detail label="Allergies" value={view.record.formData.allergies} />
                )}
              </div>
            </div>

            {/* Reuse the SymptomResult component */}
            <SymptomResult result={view.record.result} />

            <button
              onClick={() => setView({ kind: "form" })}
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

// Small helper component for the history detail view
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <p className="text-foreground/90">{value}</p>
    </div>
  );
}
