"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { MessageSquare, Stethoscope, MapPin, ArrowRight, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { getChatHistory, getSymptomHistory } from "@/services/profile";
import { formatRelativeTime, severityColor } from "@/lib/utils";

const QUICK_ACTIONS = [
  { href: "/chat", label: "Start AI Chat", description: "Ask a health question", icon: MessageSquare, tint: "bg-[#dce9ff] text-primary" },
  { href: "/symptom-checker", label: "Check Symptoms", description: "Structured symptom review", icon: Stethoscope, tint: "bg-secondary/10 text-secondary" },
  { href: "/doctors-near-me", label: "Find Care Nearby", description: "Doctors, clinics & pharmacies", icon: MapPin, tint: "bg-[#eff4ff] text-accent" },
];

export default function DashboardPage() {
  const { user } = useAuth();

  const { data: chatHistory, isLoading: chatLoading } = useQuery({
    queryKey: ["chat-history", 5],
    queryFn: () => getChatHistory(5),
  });

  const { data: symptomHistory, isLoading: symptomLoading } = useQuery({
    queryKey: ["symptom-history", 5],
    queryFn: () => getSymptomHistory(5),
  });

  const firstName = user?.email?.split("@")[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-8"
    >
      <div className="clinical-panel p-6">
        <div className="status-pill">
          <span className="status-dot" />
          Health workspace live
        </div>
        <h1 className="mt-4 font-display text-3xl font-semibold text-foreground">
          Welcome back{firstName ? `, ${firstName}` : ""}
        </h1>
        <p className="mt-1 text-muted-foreground">Here&apos;s a quick look at your health workspace.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {QUICK_ACTIONS.map((action) => (
          <Link key={action.href} href={action.href}>
            <Card className="card-hover group h-full hover:border-primary/30">
              <CardContent className="flex items-start justify-between p-5">
                <div>
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${action.tint}`}>
                    <action.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-3 font-medium text-foreground">{action.label}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{action.description}</p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Recent chats</CardTitle>
            <Link href="/chat" className="text-xs font-medium text-primary hover:underline">
              Open chat
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {chatLoading && (
              <>
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </>
            )}
            {!chatLoading && (!chatHistory || chatHistory.length === 0) && (
              <EmptyState icon={MessageSquare} text="No conversations yet. Start one to see it here." />
            )}
            {chatHistory?.slice(0, 4).map((entry: any) => (
              <div key={entry.id} className="rounded-lg border border-border bg-white p-3 transition-colors hover:border-primary/30">
                <p className="line-clamp-2 text-sm text-foreground">{entry.content}</p>
                <p className="mt-1 text-xs text-muted-foreground">{formatRelativeTime(entry.created_at)}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Recent symptom checks</CardTitle>
            <Link href="/symptom-checker" className="text-xs font-medium text-primary hover:underline">
              New check
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {symptomLoading && (
              <>
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </>
            )}
            {!symptomLoading && (!symptomHistory || symptomHistory.length === 0) && (
              <EmptyState icon={Stethoscope} text="No symptom checks yet. Run one to see it here." />
            )}
            {symptomHistory?.slice(0, 4).map((entry: any) => (
              <div key={entry.id} className="flex items-center justify-between rounded-lg border border-border bg-white p-3 transition-colors hover:border-primary/30">
                <div className="min-w-0">
                  <p className="truncate text-sm text-foreground">{entry.request_payload?.symptoms}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{formatRelativeTime(entry.created_at)}</p>
                </div>
                {entry.response_payload?.severity && (
                  <Badge className={severityColor(entry.response_payload.severity)} variant="outline">
                    {entry.response_payload.severity}
                  </Badge>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-accent" /> Health summary
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-3">
          <SummaryStat label="Symptom checks logged" value={symptomHistory?.length ?? 0} />
          <SummaryStat label="Chat conversations" value={new Set(chatHistory?.map((c: any) => c.conversation_id)).size || 0} />
          <SummaryStat
            label="Last activity"
            value={
              chatHistory?.[0]?.created_at
                ? formatRelativeTime(chatHistory[0].created_at)
                : "No activity yet"
            }
          />
        </CardContent>
      </Card>
    </motion.div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-gradient">{value}</p>
    </div>
  );
}

function EmptyState({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border bg-[#f8f9ff] py-8 text-center">
      <Icon className="h-6 w-6 text-muted-foreground" />
      <p className="max-w-[220px] text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
