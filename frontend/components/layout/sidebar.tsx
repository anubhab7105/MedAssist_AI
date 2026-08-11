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
import { LogoutDialog } from "@/components/layout/logout-dialog";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/chat", label: "AI Chat", icon: MessageSquare },
  { href: "/symptom-checker", label: "Symptom Checker", icon: Stethoscope },
  { href: "/doctors-near-me", label: "Doctors Near Me", icon: MapPin },
  { href: "/profile", label: "Profile", icon: User },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? "MA";

  return (
    <aside className="hidden h-screen w-64 shrink-0 flex-col border-r border-[#c3c6d4] bg-white/85 backdrop-blur-xl md:flex">
      <Link href="/" className="flex h-[72px] items-center gap-2 px-6 font-display text-lg font-bold text-primary">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary shadow-[0_6px_16px_-10px_rgba(0,49,120,0.75)]">
          <Activity className="h-4.5 w-4.5 text-white" />
        </span>
        MedAssist AI
      </Link>

      <nav className="flex-1 space-y-1 px-3 py-5">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                active
                  ? "bg-[#dce9ff] text-primary shadow-sm"
                  : "text-muted-foreground hover:bg-[#eff4ff] hover:text-primary"
              )}
            >
              <item.icon className="h-4.5 w-4.5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-[#c3c6d4] p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{user?.email ?? "Signed in"}</p>
          </div>
          <LogoutDialog
            trigger={
              <button
                aria-label="Log out"
                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-danger/10 hover:text-danger"
              >
                <LogOut className="h-4 w-4" />
              </button>
            }
          />
        </div>
      </div>
    </aside>
  );
}
