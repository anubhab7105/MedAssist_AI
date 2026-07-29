import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PulseLine } from "./pulse-line";

export function CTA() {
  return (
    <section className="container pb-24">
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.06] bg-gradient-to-br from-primary/15 via-card to-accent/10 px-8 py-16 text-center sm:px-16">
        <PulseLine className="absolute inset-x-0 top-1/2 h-16 w-full -translate-y-1/2 opacity-20" />
        <h2 className="relative text-3xl font-semibold tracking-tight sm:text-4xl">
          Get clarity on your symptoms today
        </h2>
        <p className="relative mx-auto mt-4 max-w-xl text-muted-foreground">
          Free to start. No credit card required. Educational guidance whenever you need it.
        </p>
        <Button asChild size="lg" className="relative mt-8">
          <Link href="/signup">
            Create your free account <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </section>
  );
}
