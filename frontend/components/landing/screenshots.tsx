"use client";

import { motion } from "framer-motion";
import { MapPin, MessageSquare, Stethoscope } from "lucide-react";

const PREVIEWS = [
  {
    icon: Stethoscope,
    title: "Symptom Checker",
    description: "Structured intake with severity, duration, and history — read out as a clear summary.",
    gradient: "from-primary/15 via-white to-white",
    iconColor: "text-primary",
  },
  {
    icon: MessageSquare,
    title: "AI Chat",
    description: "Streaming, markdown-formatted answers with full conversation history.",
    gradient: "from-secondary/15 via-white to-white",
    iconColor: "text-secondary",
  },
  {
    icon: MapPin,
    title: "Interactive Map",
    description: "Doctors, hospitals, clinics, and pharmacies plotted live around your location.",
    gradient: "from-accent/15 via-white to-white",
    iconColor: "text-accent",
  },
];

export function Screenshots() {
  return (
    <section className="container py-24">
      <div className="max-w-2xl">
        <p className="text-sm font-medium text-primary">Inside the product</p>
        <h2 className="mt-3 font-display text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
          A look at the workspace
        </h2>
      </div>

      <div className="mt-12 grid gap-6 lg:grid-cols-3">
        {PREVIEWS.map((preview, i) => (
          <motion.div
            key={preview.title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, delay: i * 0.08 }}
            className="card-hover overflow-hidden rounded-2xl border border-border bg-white"
          >
            <div className={`flex aspect-[4/3] items-center justify-center bg-gradient-to-br ${preview.gradient}`}>
              <preview.icon className={`h-10 w-10 ${preview.iconColor}`} />
            </div>
            <div className="p-5">
              <h3 className="font-medium text-foreground">{preview.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{preview.description}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
