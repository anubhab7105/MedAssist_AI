"use client";

import { AlertTriangle, CheckCircle2, Stethoscope, HeartPulse, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { severityColor } from "@/lib/utils";
import type { SymptomCheckResponse } from "@/types";

export function SymptomResult({ result }: { result: SymptomCheckResponse }) {
  if (result.isEmergency) {
    return (
      <Card className="border-danger/30 bg-danger/5">
        <CardContent className="flex items-start gap-4 p-6">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-danger/10">
            <AlertTriangle className="h-5 w-5 text-danger" />
          </span>
          <div>
            <h3 className="text-lg font-semibold text-danger">Emergency detected</h3>
            <p className="mt-2 text-sm leading-relaxed text-danger/90">{result.emergencyMessage}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <Stethoscope className="h-4 w-4 text-primary" /> Summary
          </CardTitle>
          {result.severity && (
            <Badge className={severityColor(result.severity)} variant="outline">
              {result.severity} severity
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-foreground/90">{result.symptomSummary}</p>
        </CardContent>
      </Card>

      {result.possibleConditions && result.possibleConditions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Possible conditions</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {result.possibleConditions.map((c) => (
                <li key={c} className="flex items-start gap-2 text-sm text-foreground/90">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" /> {c}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {result.lifestyleSuggestions && result.lifestyleSuggestions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <HeartPulse className="h-4 w-4 text-secondary" /> Lifestyle suggestions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {result.lifestyleSuggestions.map((s) => (
                  <li key={s} className="flex items-start gap-2 text-sm text-foreground/90">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" /> {s}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {result.emergencyWarnings && result.emergencyWarnings.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldAlert className="h-4 w-4 text-warning" /> Watch for
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {result.emergencyWarnings.map((w) => (
                  <li key={w} className="flex items-start gap-2 text-sm text-foreground/90">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-warning" /> {w}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      {result.recommendedSpecialist && (
        <Card className="border-primary/20 bg-[#eff4ff]">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Recommended specialist</p>
              <p className="mt-1 text-lg font-medium text-primary">{result.recommendedSpecialist}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <p className="text-center text-xs text-muted-foreground">{result.disclaimer}</p>
    </div>
  );
}
