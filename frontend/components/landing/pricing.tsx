import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const TIERS = [
  {
    name: "Free",
    price: "$0",
    description: "For getting clear, occasional guidance.",
    features: ["Unlimited AI chat", "5 symptom checks / month", "Doctors near me"],
    cta: "Start for free",
    highlighted: false,
  },
  {
    name: "Plus",
    price: "Coming soon",
    description: "For ongoing health tracking and history.",
    features: ["Unlimited symptom checks", "Full history & trends", "Priority response time"],
    cta: "Join the waitlist",
    highlighted: true,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="container py-24">
      <div className="max-w-2xl">
        <p className="text-sm font-medium text-accent">Pricing</p>
        <h2 className="mt-3 font-display text-3xl font-semibold text-foreground sm:text-4xl">
          Start free, upgrade later
        </h2>
        <p className="mt-4 text-muted-foreground">Plus-tier pricing is still being finalized.</p>
      </div>

      <div className="mt-12 grid gap-6 sm:grid-cols-2 sm:max-w-2xl">
        {TIERS.map((tier) => (
          <Card
            key={tier.name}
            className={cn(
              "card-hover",
              tier.highlighted && "relative overflow-hidden border-primary/30 shadow-glow"
            )}
          >
            {tier.highlighted && (
              <span className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-primary" />
            )}
            <CardHeader>
              <p className="text-sm text-muted-foreground">{tier.name}</p>
              <p className="text-3xl font-semibold text-foreground">{tier.price}</p>
              <p className="text-sm text-muted-foreground">{tier.description}</p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2.5">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-foreground/90">
                    <Check className="h-4 w-4 text-success" /> {f}
                  </li>
                ))}
              </ul>
              <Button asChild className="mt-6 w-full" variant={tier.highlighted ? "default" : "outline"}>
                <Link href="/signup">{tier.cta}</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
