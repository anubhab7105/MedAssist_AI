import Link from "next/link";
import { Activity } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-grid bg-aurora px-4 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary shadow-glow">
        <Activity className="h-6 w-6 text-white" />
      </span>
      <h1 className="font-display text-3xl font-semibold text-foreground">Page not found</h1>
      <p className="max-w-sm text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist or may have moved.
      </p>
      <Button asChild>
        <Link href="/">Back to home</Link>
      </Button>
    </div>
  );
}
