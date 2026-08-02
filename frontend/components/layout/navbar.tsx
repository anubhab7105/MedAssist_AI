"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-[#dce3ef] bg-background/90 backdrop-blur-xl">
      <nav className="container flex h-[72px] items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-display text-xl font-bold text-primary">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary shadow-[0_6px_16px_-10px_rgba(0,49,120,0.75)]">
            <Activity className="h-4.5 w-4.5 text-white" />
          </span>
          MedAssist AI
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <Button asChild size="sm">
              <Link href="/dashboard">Go to dashboard</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Log in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/signup">Get started</Link>
              </Button>
            </>
          )}
        </div>

        <button
          className="p-2 text-foreground md:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-border md:hidden"
          >
            <div className="container flex flex-col gap-4 py-4">
              {NAV_LINKS.map((link) => (
                <a key={link.href} href={link.href} className="text-sm text-muted-foreground" onClick={() => setOpen(false)}>
                  {link.label}
                </a>
              ))}
              <div className="flex flex-col gap-2 pt-2">
                {user ? (
                  <Button asChild size="sm">
                    <Link href="/dashboard">Go to dashboard</Link>
                  </Button>
                ) : (
                  <>
                    <Button asChild variant="outline" size="sm">
                      <Link href="/login">Log in</Link>
                    </Button>
                    <Button asChild size="sm">
                      <Link href="/signup">Get started</Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
