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
    tint: "from-primary/10 to-primary/0 text-primary",
  },
  {
    icon: MessageSquare,
    title: "AI Health Chat",
    description: "A calm, streaming conversation for health questions — with full history saved to your account.",
    span: "",
    tint: "from-secondary/10 to-secondary/0 text-secondary",
  },
  {
    icon: ShieldAlert,
    title: "Emergency Detection",
    description:
      "Every message is screened for red-flag symptoms before it ever reaches the AI. If detected, you're told to seek emergency care immediately.",
    span: "",
    tint: "from-danger/10 to-danger/0 text-danger",
  },
  {
    icon: MapPin,
    title: "Doctors Near Me",
    description:
      "Live map of nearby doctors, hospitals, clinics, and pharmacies — powered by OpenStreetMap, with distance and directions.",
    span: "lg:col-span-2",
    tint: "from-accent/10 to-accent/0 text-accent",
  },
  {
    icon: Compass,
    title: "Specialist Matching",
    description: "Headache, chest pain, joint pain — mapped automatically to the right kind of specialist.",
    span: "",
    tint: "from-primary/10 to-primary/0 text-primary",
  },
  {
    icon: History,
    title: "Full History",
    description: "Every chat and symptom check is saved so you can track patterns and revisit past guidance.",
    span: "",
    tint: "from-secondary/10 to-secondary/0 text-secondary",
  },
];

export function Features() {
  return (
    <section id="features" className="container py-24">
      <div className="max-w-2xl">
        <p className="text-sm font-medium text-accent">Everything in one place</p>
        <h2 className="mt-3 font-display text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
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
            className={`card-hover group rounded-2xl border border-border bg-gradient-to-b ${feature.tint} bg-white p-6 ${feature.span}`}
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-border transition-transform group-hover:scale-110">
              <feature.icon className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-lg font-medium text-foreground">{feature.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
