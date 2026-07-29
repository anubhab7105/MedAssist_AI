"use client";

import { motion } from "framer-motion";
import { MessageSquare, Stethoscope, MapPin, ShieldAlert, History, Compass } from "lucide-react";

const FEATURES = [
  {
    icon: Stethoscope,
    title: "AI Symptom Checker",
    description:
      "Log symptoms, duration, and severity to get a plain-language summary, possible conditions, and a recommended specialist.",
    span: "lg:col-span-2",
  },
  {
    icon: MessageSquare,
    title: "AI Health Chat",
    description: "A calm, streaming conversation for health questions — with full history saved to your account.",
    span: "",
  },
  {
    icon: ShieldAlert,
    title: "Emergency Detection",
    description:
      "Every message is screened for red-flag symptoms before it ever reaches the AI. If detected, you're told to seek emergency care immediately.",
    span: "",
  },
  {
    icon: MapPin,
    title: "Doctors Near Me",
    description:
      "Live map of nearby doctors, hospitals, clinics, and pharmacies — powered by OpenStreetMap, with distance and directions.",
    span: "lg:col-span-2",
  },
  {
    icon: Compass,
    title: "Specialist Matching",
    description: "Headache, chest pain, joint pain — mapped automatically to the right kind of specialist.",
    span: "",
  },
  {
    icon: History,
    title: "Full History",
    description: "Every chat and symptom check is saved so you can track patterns and revisit past guidance.",
    span: "",
  },
];

export function Features() {
  return (
    <section id="features" className="container py-24">
      <div className="max-w-2xl">
        <p className="text-sm font-medium text-accent">Everything in one place</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          Built for clarity, not diagnosis
        </h2>
        <p className="mt-4 text-muted-foreground">
          Every feature is designed around one rule: inform confidently, decide never.
        </p>
      </div>

      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature, i) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, delay: i * 0.05 }}
            className={`group rounded-2xl border border-white/[0.06] bg-card/50 p-6 transition-colors hover:border-primary/30 hover:bg-card ${feature.span}`}
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
              <feature.icon className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-lg font-medium">{feature.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
