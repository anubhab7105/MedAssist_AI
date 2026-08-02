import Link from "next/link";
import { Activity } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-grid bg-aurora px-4 py-12">
      <Link href="/" className="relative mb-8 flex items-center gap-2 font-semibold tracking-tight text-foreground">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-secondary shadow-[0_6px_16px_-6px_rgba(47,111,237,0.6)]">
          <Activity className="h-4.5 w-4.5 text-white" />
        </span>
        MedAssist AI
      </Link>
      <div className="relative w-full max-w-md">{children}</div>
    </div>
  );
}
