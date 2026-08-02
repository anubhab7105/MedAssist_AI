"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Bot, Send, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

const TRUST = ["HIPAA aware", "GDPR ready", "Secure guidance"];

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-background">
      <div className="container grid min-h-[660px] gap-12 py-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl"
        >
          <div className="status-pill">
            <span className="status-dot" />
            System Live & Active
          </div>

          <h1 className="mt-9 font-display text-4xl font-bold leading-[1.12] text-foreground sm:text-5xl lg:text-[3.35rem]">
            Clinical Intelligence,
            <span className="block text-primary">Human Empathy.</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
            Empower your healthcare decisions with AI-driven patient support.
            MedAssist AI provides accurate, empathetic preliminary guidance and
            ongoing care direction while keeping clinical safety at the center.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/signup">
                Get Started <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/chat">View Demo</Link>
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.12 }}
          className="clinical-panel overflow-hidden"
        >
          <div className="flex items-center gap-3 border-b border-[#ccdbf3] bg-white/80 p-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-glow">
              <Bot className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-foreground">MedAssist AI</h2>
              <p className="flex items-center gap-1.5 text-xs font-medium text-secondary">
                <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
                Online
              </p>
            </div>
          </div>

          <div className="space-y-4 p-5">
            <div className="max-w-[82%] rounded-lg rounded-tl-sm border border-secondary/10 bg-secondary/5 px-4 py-3 text-sm leading-6 text-foreground">
              Hello. I&apos;m MedAssist AI. How can I assist you with your symptoms today?
            </div>
            <p className="text-xs text-muted-foreground">10:42 AM</p>
            <div className="ml-auto max-w-[82%] rounded-lg rounded-tr-sm bg-[#e6eeff] px-4 py-3 text-sm leading-6 text-foreground">
              I&apos;ve had a persistent headache for the past two days and some mild nausea.
            </div>
            <p className="text-right text-xs text-muted-foreground">10:44 AM</p>
            <div className="max-w-[82%] rounded-lg rounded-tl-sm border border-secondary/10 bg-secondary/5 px-4 py-3 text-sm leading-6 text-foreground">
              I understand, that sounds uncomfortable. Are you experiencing any sensitivity to light or sound alongside the headache?
            </div>
            <div className="flex flex-wrap gap-2">
              {["Yes, to light", "Yes, to sound", "Neither"].map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-[#c3c6d4] bg-[#eff4ff] px-3 py-1 text-xs font-medium text-muted-foreground"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="border-t border-[#ccdbf3] bg-white/85 p-4">
            <div className="flex items-center gap-3 rounded-lg border border-input bg-white px-4 py-3 text-sm text-muted-foreground">
              <span className="flex-1">Type your symptoms...</span>
              <Send className="h-4 w-4 text-primary" />
            </div>
          </div>
        </motion.div>
      </div>

      <div className="border-y border-[#c3c6d4] bg-[#eff4ff]">
        <div className="container flex flex-col items-center justify-center gap-5 py-6 text-sm text-muted-foreground sm:flex-row">
          <span className="font-semibold uppercase text-[#737783]">Enterprise Grade Security</span>
          <div className="flex flex-wrap justify-center gap-5">
            {TRUST.map((item) => (
              <span key={item} className="inline-flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
