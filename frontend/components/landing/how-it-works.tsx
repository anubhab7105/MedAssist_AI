"use client";

import { motion } from "framer-motion";

const STEPS = [
  {
    number: "01",
    title: "Describe what's going on",
    description: "Tell the symptom checker or chat what you're experiencing — age, symptoms, duration, severity.",
  },
  {
    number: "02",
    title: "Emergency check runs first",
    description: "Before anything reaches the AI, your input is screened for red-flag emergency patterns.",
  },
  {
    number: "03",
    title: "Get grounded guidance",
    description: "Receive a plain-language summary, possible conditions, lifestyle suggestions, and a recommended specialist.",
  },
  {
    number: "04",
    title: "Find care nearby",
    description: "Pull up real doctors, clinics, hospitals, and pharmacies near you, with directions.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="border-y border-[#c3c6d4] bg-[#eff4ff] py-24">
      <div className="container">
        <div className="max-w-2xl">
          <p className="text-sm font-medium text-secondary">The flow</p>
          <h2 className="mt-3 font-display text-3xl font-semibold text-foreground sm:text-4xl">
            From symptom to next step
          </h2>
        </div>

        <div className="relative mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="absolute left-0 right-0 top-6 hidden h-px bg-[#c3c6d4] lg:block" />
          {STEPS.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="relative"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-white">
                {i + 1}
              </span>
              <h3 className="mt-3 text-lg font-medium text-foreground">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
