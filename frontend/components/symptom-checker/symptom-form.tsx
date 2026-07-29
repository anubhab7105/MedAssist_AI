"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { SymptomCheckRequest } from "@/types";

const schema = z.object({
  age: z.coerce.number().min(0).max(120),
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"]),
  weightKg: z.coerce.number().min(1).max(400).optional().or(z.literal(undefined)),
  heightCm: z.coerce.number().min(30).max(272).optional().or(z.literal(undefined)),
  symptoms: z.string().min(3, "Please describe your symptoms"),
  duration: z.string().min(1, "How long has this been going on?"),
  painLevel: z.coerce.number().min(0).max(10),
  temperatureCelsius: z.coerce.number().min(30).max(45).optional().or(z.literal(undefined)),
  currentMedication: z.string().optional(),
  knownDiseases: z.string().optional(),
  allergies: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface SymptomFormProps {
  onSubmit: (values: SymptomCheckRequest) => void;
  loading: boolean;
}

export function SymptomForm({ onSubmit, loading }: SymptomFormProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { painLevel: 0, gender: "prefer_not_to_say" },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
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
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                  <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="duration">Duration</Label>
          <Input id="duration" placeholder="e.g. 3 days" error={!!errors.duration} {...register("duration")} />
          {errors.duration && <p className="text-xs text-danger">{errors.duration.message}</p>}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="weightKg">Weight (kg)</Label>
          <Input id="weightKg" type="number" step="0.1" {...register("weightKg")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="heightCm">Height (cm)</Label>
          <Input id="heightCm" type="number" step="0.1" {...register("heightCm")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="temperatureCelsius">Temperature (°C)</Label>
          <Input id="temperatureCelsius" type="number" step="0.1" {...register("temperatureCelsius")} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="symptoms">Symptoms</Label>
        <Textarea id="symptoms" placeholder="Describe what you're experiencing in detail..." error={!!errors.symptoms} {...register("symptoms")} />
        {errors.symptoms && <p className="text-xs text-danger">{errors.symptoms.message}</p>}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="painLevel">Pain level</Label>
          <span className="text-sm text-muted-foreground">{`0–10`}</span>
        </div>
        <input
          id="painLevel"
          type="range"
          min={0}
          max={10}
          className="w-full accent-primary"
          {...register("painLevel")}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="currentMedication">Current medication</Label>
          <Input id="currentMedication" placeholder="Optional" {...register("currentMedication")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="knownDiseases">Known conditions</Label>
          <Input id="knownDiseases" placeholder="Optional" {...register("knownDiseases")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="allergies">Allergies</Label>
          <Input id="allergies" placeholder="Optional" {...register("allergies")} />
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        Analyze symptoms
      </Button>
    </form>
  );
}
