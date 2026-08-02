"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

interface LogoutDialogProps {
  trigger: React.ReactNode;
}

export function LogoutDialog({ trigger }: LogoutDialogProps) {
  const [open, setOpen] = useState(false);
  const { signOut } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut();
    setOpen(false);
    router.push("/");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LogOut className="h-5 w-5 text-danger" />
            Are you sure?
          </DialogTitle>
          <DialogDescription>
            You will be logged out of your account and redirected to the home page.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <DialogClose asChild>
            <Button variant="outline" className="sm:w-auto">
              No, stay
            </Button>
          </DialogClose>
          <Button variant="danger" onClick={handleLogout} className="sm:w-auto">
            Yes, log out
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
