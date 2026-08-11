"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Clock,
  ClipboardList,
  PanelLeftClose,
  PanelLeftOpen,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { SymptomForm } from "@/components/symptom-checker/symptom-form";
import { SymptomResult } from "@/components/symptom-checker/symptom-result";
import { checkSymptoms } from "@/services/symptomChecker";
import { getSymptomCheck } from "@/services/profile";
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
  const searchParams = useSearchParams();
  const openCheckId = searchParams.get("check");

  const [view, setView] = useState<ViewState>({ kind: "form" });
  const [history, setHistory] = useState<LocalSymptomRecord[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const userId = user?.id ?? "";

  // Load local history
  const refreshHistory = useCallback(() => {
    if (!userId) return;
    setHistory(getSymptomLocalHistory(userId));
  }, [userId]);

  useEffect(() => {
    refreshHistory();
  }, [refreshHistory]);

  // Open a check from the dashboard (?check=<id>): first try local storage,
  // then load it from the backend (works across devices).
  useEffect(() => {
    if (!userId || !openCheckId) return;

    const local = history.find((r) => r.id === openCheckId);
    if (local) {
      setView({ kind: "history-detail", record: local });
      return;
    }

    let cancelled = false;
    getSymptomCheck(openCheckId)
      .then((row: any) => {
        if (cancelled || !row) return;
        const req = row.request_payload ?? {};
        const res = row.response_payload ?? {};
        const record: LocalSymptomRecord = {
          id: openCheckId,
          title: String(req.symptoms ?? "").slice(0, 50) || "Symptom check",
          formData: {
            symptoms: req.symptoms ?? "",
            duration: req.duration ?? "",
            age: req.age ?? 0,
            gender: req.gender ?? "prefer_not_to_say",
            painLevel: req.pain_level ?? 0,
            weightKg: req.weight_kg,
            heightCm: req.height_cm,
            temperatureCelsius: req.temperature_celsius,
            currentMedication: req.current_medication,
            knownDiseases: req.known_diseases,
            allergies: req.allergies,
          },
          result: {
            isEmergency: res.is_emergency ?? false,
            emergencyMessage: res.emergency_message,
            symptomSummary: res.symptom_summary,
            possibleConditions: res.possible_conditions,
            severity: res.severity,
            lifestyleSuggestions: res.lifestyle_suggestions,
            emergencyWarnings: res.emergency_warnings,
            recommendedSpecialist: res.recommended_specialist,
            disclaimer: res.disclaimer,
          },
          createdAt: row.created_at ?? new Date().toISOString(),
        };
        setView({ kind: "history-detail", record });
      })
      .catch(() => {
        // Not found / offline: leave the form visible rather than crash.
      });
    return () => {
      cancelled = true;
    };
  }, [openCheckId, userId, history]);

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

  const handleNewCheck = () => {
    setView({ kind: "form" });
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-6xl gap-0 md:h-[calc(100vh-5rem)]">
      {/* ----------------------------------------------------------------- */}
      {/* Sidebar – Previous checks                                         */}
      {/* ----------------------------------------------------------------- */}
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <motion.aside
            key="symptom-sidebar"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="hidden flex-shrink-0 flex-col overflow-hidden border-r border-border md:flex"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Previous Checks
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleNewCheck}
                  className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted/20 hover:text-primary"
                  title="New check"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted/20 hover:text-primary"
                  title="Close sidebar"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-2 py-2">
              {history.length === 0 && (
                <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                  No previous checks yet.
                </p>
              )}
              {history.map((record) => (
                <button
                  key={record.id}
                  onClick={() => setView({ kind: "history-detail", record })}
                  className={`group mb-1 flex w-full items-start gap-2 rounded-lg px-3 py-2.5 text-left transition-colors ${
                    view.kind === "history-detail" && view.record.id === record.id
                      ? "bg-primary/10 text-primary"
                      : "text-foreground/80 hover:bg-muted/15"
                  }`}
                >
                  <ClipboardList className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 opacity-50" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium leading-snug">{record.title}</p>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatRelativeTime(record.createdAt)}
                      </span>
                      {record.result.severity && (
                        <Badge
                          className={`${severityColor(record.result.severity)} scale-90`}
                          variant="outline"
                        >
                          {record.result.severity}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDeleteRecord(record.id, e)}
                    className="ml-auto rounded p-1 opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
                    title="Delete"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </button>
              ))}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ----------------------------------------------------------------- */}
      {/* Main content area                                                 */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mb-4 flex items-start justify-between"
        >
          <div>
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="mb-2 hidden rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted/20 hover:text-primary md:inline-flex"
                title="Open sidebar"
              >
                <PanelLeftOpen className="h-4 w-4" />
              </button>
            )}
            <div className="status-pill">
              <span className="status-dot" />
              Structured review
            </div>
            <h1 className="mt-4 font-display text-3xl font-semibold text-foreground">
              AI Symptom Checker
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Share what you&apos;re experiencing for a structured, educational summary.
            </p>
          </div>

          {/* Mobile new check button */}
          <div className="flex gap-1 md:hidden">
            <button
              onClick={handleNewCheck}
              className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted/20 hover:text-primary"
              title="New check"
            >
              <RotateCcw className="h-5 w-5" />
            </button>
          </div>
        </motion.div>

        {/* Mobile history strip */}
        {history.length > 0 && (
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1 md:hidden">
            {history.slice(0, 5).map((record) => (
              <button
                key={record.id}
                onClick={() => setView({ kind: "history-detail", record })}
                className={`flex-shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  view.kind === "history-detail" && view.record.id === record.id
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border bg-white text-muted-foreground hover:border-primary/30"
                }`}
              >
                {record.title.length > 25 ? record.title.slice(0, 25) + "…" : record.title}
              </button>
            ))}
          </div>
        )}

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
                onClick={handleNewCheck}
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
                onClick={handleNewCheck}
                className="mx-auto block text-sm font-medium text-primary hover:underline"
              >
                Run another check
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
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
