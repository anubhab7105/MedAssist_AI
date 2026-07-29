import Link from "next/link";
import { Activity } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-grid px-4 py-12">
      <Link href="/" className="mb-8 flex items-center gap-2 font-semibold tracking-tight">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent">
          <Activity className="h-4.5 w-4.5 text-white" />
        </span>
        MedAssist AI
      </Link>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
