"use client";
import { usePathname, useRouter } from "next/navigation";
import { Search, Bell, Sparkles } from "lucide-react";

const ROUTE_CRUMBS: Record<string, string[]> = {
  "/dashboard":                  ["Workspace", "Overview"],
  "/dashboard/vulnerabilities":  ["Workspace", "CVEs"],
  "/dashboard/projects":         ["Workspace", "Projects"],
  "/dashboard/members":          ["Workspace", "Members"],
  "/dashboard/api-keys":         ["Account", "API Keys"],
  "/dashboard/settings":         ["Account", "Settings"],
};

export function Topbar() {
  const pathname = usePathname();
  const router = useRouter();

  const crumbs = (() => {
    if (ROUTE_CRUMBS[pathname]) return ROUTE_CRUMBS[pathname];
    // Dynamic segments like /dashboard/projects/[id]
    if (pathname.startsWith("/dashboard/projects/")) return ["Workspace", "Projects", pathname.split("/").pop() ?? ""];
    if (pathname.startsWith("/dashboard/vulnerabilities/")) return ["Workspace", "CVEs", pathname.split("/").pop() ?? ""];
    return ["Workspace"];
  })();

  return (
    <header style={{
      height: 56,
      borderBottom: "1px solid var(--border)",
      display: "flex",
      alignItems: "center",
      padding: "0 24px",
      gap: 14,
      background: "color-mix(in oklab, var(--bg-elev), transparent 20%)",
      backdropFilter: "blur(8px)",
      position: "sticky",
      top: 0,
      zIndex: 30,
      flexShrink: 0,
    }}>
      {/* Breadcrumbs */}
      <nav style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--fg-dim)" }}>
        {crumbs.map((crumb, i) => (
          <span key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {i > 0 && <span style={{ color: "var(--fg-faint)" }}>/</span>}
            <span style={{ color: i === crumbs.length - 1 ? "var(--fg)" : "var(--fg-muted)" }}>
              {crumb}
            </span>
          </span>
        ))}
      </nav>

      <div style={{ flex: 1 }}/>

      {/* ⌘K trigger */}
      <button
        onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }))}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "6px 10px 6px 12px",
          borderRadius: 8,
          border: "1px solid var(--border)",
          background: "var(--surface)",
          color: "var(--fg-dim)",
          fontSize: 13,
          minWidth: 280,
          cursor: "pointer",
          transition: "border-color 160ms ease",
        }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--border-bright)")}
        onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
      >
        <Search size={14}/>
        <span style={{ flex: 1, textAlign: "left" }}>Search CVEs, projects…</span>
        <span style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10.5,
          padding: "2px 6px",
          borderRadius: 4,
          background: "var(--surface-3)",
          color: "var(--fg-muted)",
          border: "1px solid var(--border)",
        }}>⌘K</span>
      </button>

      {/* Notifications */}
      <button
        title="Notifications"
        onClick={() => router.push("/dashboard/notifications")}
        style={{
          width: 32, height: 32,
          display: "grid", placeItems: "center",
          borderRadius: 8,
          border: "1px solid transparent",
          color: "var(--fg-muted)",
          cursor: "pointer",
          transition: "all 140ms ease",
          position: "relative",
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.background = "var(--surface)";
          (e.currentTarget as HTMLElement).style.color = "var(--fg)";
          (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.background = "transparent";
          (e.currentTarget as HTMLElement).style.color = "var(--fg-muted)";
          (e.currentTarget as HTMLElement).style.borderColor = "transparent";
        }}
      >
        <Bell size={16}/>
        {/* Notification dot */}
        <span style={{
          position: "absolute",
          top: 6, right: 6,
          width: 6, height: 6,
          borderRadius: "50%",
          background: "var(--sev-critical)",
          boxShadow: "0 0 8px var(--sev-critical)",
        }}/>
      </button>
    </header>
  );
}
