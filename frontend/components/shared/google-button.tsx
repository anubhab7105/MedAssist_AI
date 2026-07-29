"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export function GoogleButton() {
  const [loading, setLoading] = useState(false);
  const { signInWithGoogle } = useAuth();
  const { toast } = useToast();

  async function handleClick() {
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      toast({
        variant: "danger",
        title: "Google sign-in failed",
        description: err instanceof Error ? err.message : "Please try again.",
      });
      setLoading(false);
    }
  }

  return (
    <Button type="button" variant="outline" className="w-full" onClick={handleClick} disabled={loading}>
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <svg viewBox="0 0 24 24" className="h-4 w-4">
          <path
            fill="#4285F4"
            d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.53 5.53 0 01-2.4 3.63v3h3.87c2.27-2.09 3.58-5.17 3.58-8.82z"
          />
          <path
            fill="#34A853"
            d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.87-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.28v3.11A11.99 11.99 0 0012 24z"
          />
          <path
            fill="#FBBC05"
            d="M5.27 14.28A7.2 7.2 0 014.9 12c0-.79.14-1.56.37-2.28V6.61H1.28A11.99 11.99 0 000 12c0 1.94.46 3.77 1.28 5.39l3.99-3.11z"
          />
          <path
            fill="#EA4335"
            d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.28 6.61l3.99 3.11C6.22 6.86 8.87 4.75 12 4.75z"
          />
        </svg>
      )}
      Continue with Google
    </Button>
  );
}
