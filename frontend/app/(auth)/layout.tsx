import Link from "next/link";
import { Activity } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-grid bg-aurora px-4 py-12">
      <Link href="/" className="relative mb-8 flex items-center gap-2 font-display text-lg font-bold text-primary">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shadow-[0_6px_16px_-10px_rgba(0,49,120,0.75)]">
          <Activity className="h-4.5 w-4.5 text-white" />
        </span>
        MedAssist AI
      </Link>
      <div className="relative w-full max-w-md">{children}</div>
    </div>
  );
}
