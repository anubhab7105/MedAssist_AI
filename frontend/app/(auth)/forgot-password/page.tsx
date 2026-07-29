"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Loader2, MailCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const schema = z.object({ email: z.string().email("Enter a valid email address") });
type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { sendPasswordReset } = useAuth();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      await sendPasswordReset(values.email);
      setSent(true);
    } catch (err) {
      toast({
        variant: "danger",
        title: "Couldn't send reset email",
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <MailCheck className="h-10 w-10 text-success" />
          <h2 className="text-lg font-medium">Reset link sent</h2>
          <p className="text-sm text-muted-foreground">
            Check your inbox for a link to reset your password.
          </p>
          <Link href="/login" className="mt-2 text-sm text-primary hover:underline">
            Back to login
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <Link href="/login" className="mb-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to login
        </Link>
        <CardTitle>Reset your password</CardTitle>
        <CardDescription>We&apos;ll email you a link to set a new password.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="you@example.com" error={!!errors.email} {...register("email")} />
            {errors.email && <p className="text-xs text-danger">{errors.email.message}</p>}
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Send reset link
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
