import { Hero } from "@/components/landing/hero";
import { Features } from "@/components/landing/features";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Screenshots } from "@/components/landing/screenshots";
import { Pricing } from "@/components/landing/pricing";
import { FAQ } from "@/components/landing/faq";
import { Contact } from "@/components/landing/contact";
import { CTA } from "@/components/landing/cta";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Features />
      <HowItWorks />
      <Screenshots />
      <Pricing />
      <FAQ />
      <CTA />
      <Contact />
    </>
  );
}
