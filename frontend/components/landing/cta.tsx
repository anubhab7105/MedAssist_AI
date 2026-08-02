import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PulseLine } from "./pulse-line";

export function CTA() {
  return (
    <section className="container pb-24">
      <div className="clinical-panel relative overflow-hidden px-8 py-16 text-center sm:px-16">
        <div className="pointer-events-none absolute inset-0 bg-aurora" />
        <PulseLine className="relative mx-auto h-16 w-full max-w-lg opacity-70" />
        <h2 className="relative mt-2 font-display text-3xl font-semibold text-foreground sm:text-4xl">
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
