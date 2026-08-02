"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const FAQS = [
  {
    question: "Does MedAssist AI diagnose conditions?",
    answer:
      "No. It never diagnoses and never prescribes medication. It offers educational information, phrased as possibilities, and always recommends consulting a licensed doctor for anything that needs one.",
  },
  {
    question: "What happens if I describe an emergency?",
    answer:
      "Before any message reaches the AI, it's screened for red-flag symptoms like chest pain, stroke signs, difficulty breathing, heavy bleeding, unconsciousness, or seizures. If detected, the AI call is skipped entirely and you're told to seek immediate emergency care.",
  },
  {
    question: "Is my health data private?",
    answer:
      "Your chat and symptom history are stored under your account with row-level security in Supabase, meaning only you can access your own records. You can delete your account and all associated data at any time from your profile.",
  },
  {
    question: "How does 'Doctors Near Me' work?",
    answer:
      "With your permission, we use your browser's location to query OpenStreetMap's Overpass API for nearby doctors, hospitals, clinics, and pharmacies, then plot them on an interactive map with distance and directions.",
  },
  {
    question: "Is MedAssist AI free to use?",
    answer:
      "Yes — the core features (AI chat, a limited number of symptom checks per month, and doctors near me) are free. A paid tier with expanded limits is in development.",
  },
];

export function FAQ() {
  return (
    <div id="faq">
      <div>
        <p className="text-sm font-medium text-secondary">FAQ</p>
        <h2 className="mt-3 font-display text-3xl font-semibold text-foreground sm:text-4xl">
          Common questions
        </h2>
      </div>

      <div className="mt-10 rounded-2xl border border-border bg-white px-6">
        <Accordion type="single" collapsible>
          {FAQS.map((faq) => (
            <AccordionItem key={faq.question} value={faq.question}>
              <AccordionTrigger>{faq.question}</AccordionTrigger>
              <AccordionContent>{faq.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
}

