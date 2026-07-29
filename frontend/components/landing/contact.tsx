"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export function Contact() {
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      toast({ title: "Message sent", description: "We'll get back to you within 1–2 business days." });
      e.currentTarget.reset();
    }, 700);
  }

  return (
    <section id="contact" className="border-t border-white/[0.06] bg-card/20 py-24">
      <div className="container grid gap-12 lg:grid-cols-2 lg:items-start">
        <div>
          <p className="text-sm font-medium text-primary">Get in touch</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Questions or feedback?</h2>
          <p className="mt-4 max-w-md text-muted-foreground">
            Whether it's a bug report, a feature idea, or a partnership inquiry — we read everything.
          </p>
          <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="h-4 w-4" /> support@medassist.ai
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-white/[0.06] bg-card p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" required placeholder="Jane Doe" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required placeholder="jane@example.com" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea id="message" name="message" required placeholder="How can we help?" />
          </div>
          <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
            {submitting ? "Sending..." : "Send message"}
          </Button>
        </form>
      </div>
    </section>
  );
}
