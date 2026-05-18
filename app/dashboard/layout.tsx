"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { Sidebar } from "@/components/Sidebar";
import { CommandPalette } from "@/components/CommandPalette";
import { Toaster } from "@/components/ui/Toast";
import { Topbar } from "@/components/Topbar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  useEffect(() => {
    if (!isAuthenticated()) router.replace("/login");
  }, [router]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", minHeight: "100vh" }}>
      <Sidebar />
      <div style={{ minWidth: 0, display: "flex", flexDirection: "column" }}>
        <Topbar />
        <main style={{ flex: 1, overflowY: "auto" }}>
          <div style={{
            maxWidth: 1480,
            width: "100%",
            margin: "0 auto",
            padding: "28px 32px",
            animation: "page-in 320ms cubic-bezier(0.2, 0.7, 0.2, 1)",
          }}>
            {children}
          </div>
        </main>
      </div>
      <CommandPalette />
      <Toaster />
    </div>
  );
}
