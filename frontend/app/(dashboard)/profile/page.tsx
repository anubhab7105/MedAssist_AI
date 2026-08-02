"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, LogOut, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { getProfile, updateProfile, getChatHistory, getSymptomHistory, deleteAccount } from "@/services/profile";
import { formatRelativeTime, severityColor } from "@/lib/utils";

interface FormValues {
  full_name: string;
  medical_history: string;
}

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: getProfile,
  });

  const { register, handleSubmit, reset } = useForm<FormValues>();

  useEffect(() => {
    if (profile) {
      reset({ full_name: profile.full_name ?? "", medical_history: profile.medical_history ?? "" });
    }
  }, [profile, reset]);

  const updateMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      toast({ title: "Profile updated" });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
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

  const { data: chatHistory, isLoading: chatLoading } = useQuery({
    queryKey: ["chat-history", 50],
    queryFn: () => getChatHistory(50),
  });

  const { data: symptomHistory, isLoading: symptomLoading } = useQuery({
    queryKey: ["symptom-history", 50],
    queryFn: () => getSymptomHistory(50),
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="clinical-panel p-6">
        <div className="status-pill">
          <span className="status-dot" />
          Account center
        </div>
        <h1 className="mt-4 font-display text-3xl font-semibold text-foreground">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your account and view your history.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account information</CardTitle>
        </CardHeader>
        <CardContent>
          {profileLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : (
            <form onSubmit={handleSubmit((v) => updateMutation.mutate(v))} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={user?.email ?? ""} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="full_name">Full name</Label>
                <Input id="full_name" {...register("full_name")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="medical_history">Medical history</Label>
                <Textarea
                  id="medical_history"
                  placeholder="Chronic conditions, past surgeries, ongoing treatments..."
                  {...register("medical_history")}
                />
              </div>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Save changes
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your history</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="chats">
            <TabsList>
              <TabsTrigger value="chats">Chats</TabsTrigger>
              <TabsTrigger value="symptoms">Symptom checks</TabsTrigger>
            </TabsList>

            <TabsContent value="chats" className="space-y-2">
              {chatLoading && <Skeleton className="h-16 w-full" />}
              {!chatLoading && (!chatHistory || chatHistory.length === 0) && (
                <p className="py-6 text-center text-sm text-muted-foreground">No chat history yet.</p>
              )}
              {chatHistory?.map((entry: any) => (
                <div key={entry.id} className="rounded-lg border border-border bg-white p-3">
                  <div className="flex items-center justify-between">
                    <Badge variant={entry.role === "user" ? "outline" : "default"}>{entry.role}</Badge>
                    <span className="text-xs text-muted-foreground">{formatRelativeTime(entry.created_at)}</span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-foreground">{entry.content}</p>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="symptoms" className="space-y-2">
              {symptomLoading && <Skeleton className="h-16 w-full" />}
              {!symptomLoading && (!symptomHistory || symptomHistory.length === 0) && (
                <p className="py-6 text-center text-sm text-muted-foreground">No symptom checks yet.</p>
              )}
              {symptomHistory?.map((entry: any) => (
                <div key={entry.id} className="rounded-lg border border-border bg-white p-3">
                  <div className="flex items-center justify-between">
                    {entry.response_payload?.severity && (
                      <Badge className={severityColor(entry.response_payload.severity)} variant="outline">
                        {entry.response_payload.severity}
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">{formatRelativeTime(entry.created_at)}</span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-foreground">{entry.request_payload?.symptoms}</p>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

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
