"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Menu, X, LayoutDashboard, MessageSquare, Stethoscope, MapPin, User, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/chat", label: "AI Chat", icon: MessageSquare },
  { href: "/symptom-checker", label: "Symptom Checker", icon: Stethoscope },
  { href: "/doctors-near-me", label: "Doctors Near Me", icon: MapPin },
  { href: "/profile", label: "Profile", icon: User },
];

export function MobileTopbar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { signOut } = useAuth();

  return (
    <div className="flex h-16 items-center justify-between border-b border-[#c3c6d4] bg-white/90 px-4 backdrop-blur-xl md:hidden">
      <Link href="/" className="flex items-center gap-2 font-display font-bold text-primary">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Activity className="h-4.5 w-4.5 text-white" />
        </span>
        MedAssist AI
      </Link>
      <button onClick={() => setOpen(true)} aria-label="Open menu" className="p-2 text-foreground">
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xl animate-in fade-in-0 zoom-in-95 duration-200">
          <div className="flex h-16 items-center justify-between border-b border-[#c3c6d4] px-4">
            <span className="font-display font-semibold text-foreground">Menu</span>
            <button onClick={() => setOpen(false)} aria-label="Close menu" className="p-2 text-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>
          <nav className="flex flex-col gap-1 px-3">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium",
                  pathname === item.href ? "bg-[#dce9ff] text-primary" : "text-muted-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            ))}
            <button
              onClick={() => signOut()}
              className="mt-4 flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-danger"
            >
              <LogOut className="h-5 w-5" />
              Log out
            </button>
          </nav>
        </div>
      )}
    </div>
  );
}
