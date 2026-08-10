"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Loader2, LogOut, Pencil, Trash2, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { LogoutDialog } from "@/components/layout/logout-dialog";
import { useToast } from "@/hooks/use-toast";
import { getProfile, updateProfile, deleteAccount } from "@/services/profile";
import type { Gender } from "@/types";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const optionalNumber = (schema: z.ZodNumber) =>
  z.preprocess((value) => (value === "" || value === null ? undefined : value), schema.optional());

const profileSchema = z.object({
  full_name: z.string().max(120, "Full name must be 120 characters or fewer").optional(),
  medical_history: z.string().max(4000, "Medical history must be 4000 characters or fewer").optional(),
  age: optionalNumber(z.coerce.number().min(0, "Age must be at least 0").max(120, "Age must be 120 or lower")),
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional(),
  weight_kg: optionalNumber(
    z.coerce.number().min(1, "Weight must be at least 1 kg").max(400, "Weight must be 400 kg or lower")
  ),
  height_cm: optionalNumber(
    z.coerce.number().min(30, "Height must be at least 30 cm").max(272, "Height must be 272 cm or lower")
  ),
});

type FormValues = z.infer<typeof profileSchema>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const GENDER_LABELS: Record<string, string> = {
  male: "Male",
  female: "Female",
  other: "Other",
  prefer_not_to_say: "Prefer not to say",
};

function displayValue(value: string | number | null | undefined, suffix?: string): string {
  if (value === null || value === undefined || value === "") return "—";
  return suffix ? `${value} ${suffix}` : String(value);
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: getProfile,
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { gender: "prefer_not_to_say" },
  });

  // Sync form when profile loads
  useEffect(() => {
    if (profile) {
      reset({
        full_name: profile.full_name ?? "",
        medical_history: profile.medical_history ?? "",
        age: profile.age ?? undefined,
        gender: profile.gender ?? "prefer_not_to_say",
        weight_kg: profile.weight_kg ?? undefined,
        height_cm: profile.height_cm ?? undefined,
      });
    }
  }, [profile, reset]);

  const updateMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      toast({ title: "Profile updated" });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      setIsEditing(false);
    },
    onError: (err: Error) => toast({ variant: "danger", title: "Update failed", description: err.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAccount,
    onSuccess: async () => {
      toast({ title: "Account deleted" });
      await signOut();
      router.push("/");
    },
    onError: (err: Error) => toast({ variant: "danger", title: "Couldn't delete account", description: err.message }),
  });

  const handleCancel = () => {
    if (profile) {
      reset({
        full_name: profile.full_name ?? "",
        medical_history: profile.medical_history ?? "",
        age: profile.age ?? undefined,
        gender: profile.gender ?? "prefer_not_to_say",
        weight_kg: profile.weight_kg ?? undefined,
        height_cm: profile.height_cm ?? undefined,
      });
    }
    setIsEditing(false);
  };

  // ---------------------------------------------------------------------------
  // Read-only field display
  // ---------------------------------------------------------------------------
  const ReadOnlyField = ({ label, value }: { label: string; value: string }) => (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="clinical-panel p-6">
        <div className="status-pill">
          <span className="status-dot" />
          Account center
        </div>
        <h1 className="mt-4 font-display text-3xl font-semibold text-foreground">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your account details.</p>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Account information card                                          */}
      {/* ----------------------------------------------------------------- */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Account information</CardTitle>
          {!isEditing && !profileLoading && (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              <Pencil className="h-3.5 w-3.5" /> Edit
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {profileLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : isEditing ? (
            /* ----- Edit mode ----- */
            <form onSubmit={handleSubmit((v) => updateMutation.mutate(v))} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={user?.email ?? ""} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="full_name">Full name</Label>
                <Input id="full_name" error={!!errors.full_name} {...register("full_name")} />
                {errors.full_name && <p className="text-xs text-danger">{errors.full_name.message}</p>}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="age">Age</Label>
                  <Input id="age" type="number" error={!!errors.age} {...register("age")} />
                  {errors.age && <p className="text-xs text-danger">{errors.age.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Gender</Label>
                  <Controller
                    control={control}
                    name="gender"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={(value) => field.onChange(value as Gender)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                          <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.gender && <p className="text-xs text-danger">{errors.gender.message}</p>}
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="weight_kg">Weight (kg)</Label>
                  <Input id="weight_kg" type="number" step="0.1" error={!!errors.weight_kg} {...register("weight_kg")} />
                  {errors.weight_kg && <p className="text-xs text-danger">{errors.weight_kg.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="height_cm">Height (cm)</Label>
                  <Input id="height_cm" type="number" step="0.1" error={!!errors.height_cm} {...register("height_cm")} />
                  {errors.height_cm && <p className="text-xs text-danger">{errors.height_cm.message}</p>}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="medical_history">Medical history</Label>
                <Textarea
                  id="medical_history"
                  placeholder="Chronic conditions, past surgeries, ongoing treatments..."
                  error={!!errors.medical_history}
                  {...register("medical_history")}
                />
                {errors.medical_history && <p className="text-xs text-danger">{errors.medical_history.message}</p>}
              </div>
              <div className="flex gap-3">
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save changes
                </Button>
                <Button type="button" variant="outline" onClick={handleCancel}>
                  <X className="h-4 w-4" /> Cancel
                </Button>
              </div>
            </form>
          ) : (
            /* ----- Read-only mode ----- */
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email-ro">Email</Label>
                <Input id="email-ro" value={user?.email ?? ""} disabled />
              </div>

              <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                <ReadOnlyField label="Full name" value={displayValue(profile?.full_name)} />
                <ReadOnlyField label="Age" value={displayValue(profile?.age)} />
                <ReadOnlyField label="Gender" value={GENDER_LABELS[profile?.gender ?? ""] ?? "—"} />
                <ReadOnlyField label="Weight" value={displayValue(profile?.weight_kg, "kg")} />
                <ReadOnlyField label="Height" value={displayValue(profile?.height_cm, "cm")} />
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Medical history</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
                  {profile?.medical_history || "—"}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ----------------------------------------------------------------- */}
      {/* Danger zone (unchanged)                                           */}
      {/* ----------------------------------------------------------------- */}
      <Card className="border-danger/30">
        <CardHeader>
          <CardTitle className="text-base text-danger">Danger zone</CardTitle>
          <CardDescription>These actions are permanent and cannot be undone.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <LogoutDialog
            trigger={
              <Button variant="outline" className="sm:w-auto">
                <LogOut className="h-4 w-4" /> Log out
              </Button>
            }
          />

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="danger" className="sm:w-auto">
                <Trash2 className="h-4 w-4" /> Delete account
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete your account?</DialogTitle>
                <DialogDescription>
                  This permanently deletes your account, chat history, symptom history, and saved
                  locations. This cannot be undone. Type <strong>DELETE</strong> to confirm.
                </DialogDescription>
              </DialogHeader>
              <Input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type DELETE to confirm"
              />
              <DialogFooter>
                <Button
                  variant="danger"
                  disabled={deleteConfirmText !== "DELETE" || deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate()}
                >
                  {deleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Permanently delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}
