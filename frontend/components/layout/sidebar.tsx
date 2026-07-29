"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  LayoutDashboard,
  MessageSquare,
  Stethoscope,
  MapPin,
  User,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/chat", label: "AI Chat", icon: MessageSquare },
  { href: "/symptom-checker", label: "Symptom Checker", icon: Stethoscope },
  { href: "/doctors-near-me", label: "Doctors Near Me", icon: MapPin },
  { href: "/profile", label: "Profile", icon: User },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? "MA";

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-white/[0.06] bg-card/40 md:flex">
      <div className="flex h-16 items-center gap-2 px-6 font-semibold tracking-tight">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent">
          <Activity className="h-4.5 w-4.5 text-white" />
        </span>
        MedAssist AI
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
              )}
            >
              <item.icon className="h-4.5 w-4.5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/[0.06] p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user?.email ?? "Signed in"}</p>
          </div>
          <button
            onClick={() => signOut()}
            aria-label="Log out"
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-white/5 hover:text-danger"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
