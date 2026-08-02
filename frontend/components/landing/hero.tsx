"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PulseLine } from "./pulse-line";

const VITALS = [
  { label: "Symptom clarity", value: "3x faster to describe what's wrong" },
  { label: "Emergency detection", value: "Runs before every AI response" },
  { label: "Nearby care", value: "Live doctors, clinics & pharmacies" },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-grid bg-aurora pt-20 pb-24 sm:pt-28">
      <div className="container relative grid gap-16 lg:grid-cols-2 lg:items-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-white/80 px-3 py-1 text-xs text-muted-foreground shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            Educational guidance, not a diagnosis
          </div>

          <h1 className="mt-6 font-display text-4xl font-medium leading-[1.1] tracking-tight text-foreground sm:text-5xl lg:text-[3.4rem]">
            Understand what your body
            <span className="text-gradient"> is telling you</span>
          </h1>

          <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground">
            Describe your symptoms, chat with an AI health assistant, and find
            real doctors, clinics, and pharmacies nearby — every response
            grounded in caution, never certainty.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/signup">
                Start for free <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="#how-it-works">See how it works</Link>
            </Button>
          </div>

          <div className="mt-10 flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-success" />
            Never diagnoses. Never prescribes. Always recommends a licensed doctor.
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="relative"
        >
          <div className="glass animate-float rounded-3xl p-5">
            <div className="flex items-center gap-2 border-b border-border pb-4">
              <span className="h-2.5 w-2.5 rounded-full bg-danger/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
              <span className="ml-2 text-xs text-muted-foreground">AI Chat</span>
            </div>

            <div className="space-y-3 py-5">
              <div className="ml-auto max-w-[80%] rounded-2xl rounded-tr-sm bg-gradient-to-br from-primary to-primary/90 px-4 py-2.5 text-sm text-white shadow-sm">
                I&apos;ve had a dull headache and mild nausea since this morning.
              </div>
              <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-border bg-white px-4 py-3 text-sm leading-relaxed text-foreground shadow-sm">
                Thanks for sharing that. Possible contributors include
                dehydration, tension headaches, or skipped meals — not a
                diagnosis, just possibilities worth ruling out. Have you had
                enough water today, and how long has the nausea lasted?
                <div className="mt-2 text-xs text-muted-foreground">
                  This information is educational only and should not replace
                  professional medical advice.
                </div>
              </div>
            </div>

            <PulseLine className="h-8 w-full opacity-80" />
          </div>

          <div className="absolute -bottom-6 -right-4 hidden w-56 rounded-2xl border border-border bg-white/95 p-4 shadow-popover backdrop-blur-xl sm:block">
            <p className="text-xs text-muted-foreground">Recommended specialist</p>
            <p className="mt-1 font-medium text-secondary">Neurologist</p>
          </div>
        </motion.div>
      </div>

      <div className="container mt-20 grid gap-6 border-t border-border pt-10 sm:grid-cols-3">
        {VITALS.map((v) => (
          <div key={v.label}>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{v.label}</p>
            <p className="mt-1 text-sm font-medium text-foreground/90">{v.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
