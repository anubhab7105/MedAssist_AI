import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.round(diffMs / 60000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.round(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function severityColor(severity?: string): string {
  switch (severity) {
    case "emergency":
      return "text-danger border-danger/30 bg-danger/10";
    case "high":
      return "text-danger border-danger/30 bg-danger/10";
    case "moderate":
      return "text-warning border-warning/30 bg-warning/10";
    case "low":
      return "text-success border-success/30 bg-success/10";
    default:
      return "text-muted-foreground border-border bg-muted/10";
  }
}
