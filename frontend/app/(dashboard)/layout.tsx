import { Sidebar } from "@/components/layout/sidebar";
import { MobileTopbar } from "@/components/layout/mobile-topbar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background bg-aurora">
      <Sidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <MobileTopbar />
        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="container max-w-6xl py-8 md:py-10">{children}</div>
        </main>
      </div>
    </div>
  );
}
