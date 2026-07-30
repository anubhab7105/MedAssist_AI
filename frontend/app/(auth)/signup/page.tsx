"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, MailCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const schema = z
  .object({
    email: z.string().email("Enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });
type FormValues = z.infer<typeof schema>;

export default function SignupPage() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { signUpWithPassword } = useAuth();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      await signUpWithPassword(values.email, values.password);
      setSubmitted(true);
    } catch (err) {
      toast({
        variant: "danger",
        title: "Couldn't create your account",
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <MailCheck className="h-10 w-10 text-success" />
          <h2 className="text-lg font-medium">Check your inbox</h2>
          <p className="text-sm text-muted-foreground">
            We&apos;ve sent a verification link to your email. Click it to activate your account.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create your account</CardTitle>
        <CardDescription>Free forever for core features. No credit card required.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="you@example.com" error={!!errors.email} {...register("email")} />
            {errors.email && <p className="text-xs text-danger">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" placeholder="At least 8 characters" error={!!errors.password} {...register("password")} />
            {errors.password && <p className="text-xs text-danger">{errors.password.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <Input id="confirmPassword" type="password" error={!!errors.confirmPassword} {...register("confirmPassword")} />
            {errors.confirmPassword && <p className="text-xs text-danger">{errors.confirmPassword.message}</p>}
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Create account
          </Button>
        </form>

        <p className="text-center text-xs leading-relaxed text-muted-foreground">
          By signing up, you agree this app provides educational information only and is not a
          substitute for professional medical care.
        </p>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Log in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
