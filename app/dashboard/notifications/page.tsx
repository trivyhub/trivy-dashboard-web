"use client";
import { useEffect, useState } from "react";
import { projectsApi, vulnApi } from "@/lib/api";
import type { Project, Vulnerability, ScanSummary } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { ShieldAlert, Play, CheckCircle, Bell, Settings, Check } from "lucide-react";

/* ── Types ───────────────────────────────────────────────────── */

type NotifType = "critical" | "scan" | "fix" | "alert" | "system";

interface Notif {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  time: Date;
  read: boolean;
}

/* ── Icon/color per type ─────────────────────────────────────── */

const TYPE_META: Record<NotifType, { icon: React.ElementType; color: string }> = {
  critical: { icon: ShieldAlert, color: "var(--sev-critical)" },
  scan:     { icon: Play,        color: "var(--accent)" },
  fix:      { icon: CheckCircle, color: "var(--accent)" },
  alert:    { icon: Bell,        color: "var(--sev-high)" },
  system:   { icon: Settings,    color: "var(--fg-muted)" },
};

/* ── Build notifications from real data ──────────────────────── */

function buildNotifs(projects: Project[], vulns: Vulnerability[], scans: ScanSummary[]): Notif[] {
  const notifs: Notif[] = [];

  // One "scan complete" notif per recent scan (last 20)
  scans.slice(0, 20).forEach(s => {
    const proj = projects.find(p => p.id === s.project_id);
    if (!proj) return;
    notifs.push({
      id: `scan-${s.id}`,
      type: "scan",
      title: `Scan terminé · ${proj.name}`,
      body: `${s.critical > 0 ? `${s.critical} critical` : s.high > 0 ? `${s.high} high` : "Clean"} · ${s.image_name || "main"}`,
      time: new Date(s.scanned_at),
      read: false,
    });
  });

  // One notif per critical vuln
  vulns.filter(v => v.severity === "CRITICAL").slice(0, 10).forEach(v => {
    notifs.push({
      id: `crit-${v.id}`,
      type: "critical",
      title: "Nouvelle vulnérabilité Critical détectée",
      body: `${v.cve_id}${v.title ? ` (${v.title.slice(0, 50)})` : ""} · scan #${v.scan_id}`,
      time: new Date(v.first_seen_at),
      read: false,
    });
  });

  // Fixed vulns
  vulns.filter(v => v.is_fixed && v.fixed_version).slice(0, 5).forEach(v => {
    notifs.push({
      id: `fix-${v.id}`,
      type: "fix",
      title: `${v.cve_id} corrigée`,
      body: `${v.package_name} → ${v.fixed_version} · scan #${v.scan_id}`,
      time: new Date(v.first_seen_at),
      read: true,
    });
  });

  // Sort by time desc
  return notifs.sort((a, b) => b.time.getTime() - a.time.getTime());
}

/* ── Page ────────────────────────────────────────────────────── */

export default function NotificationsPage() {
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [filter, setFilter] = useState<"all" | "unread" | NotifType>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      projectsApi.list(),
      vulnApi.list(1, 200),
    ]).then(async ([projects, vulnPage]) => {
      const projectList = projects ?? [];
      const vulnList = vulnPage?.data ?? [];

      // Fetch scans for all projects
      const scanArrays = await Promise.all(
        projectList.map(p => projectsApi.scans(p.name).catch(() => [] as ScanSummary[]))
      );
      const allScans = scanArrays.flat();

      setNotifs(buildNotifs(projectList, vulnList, allScans));
    }).finally(() => setLoading(false));
  }, []);

  const unreadCount = notifs.filter(n => !n.read).length;

  const visible = notifs.filter(n => {
    if (filter === "all") return true;
    if (filter === "unread") return !n.read;
    return n.type === filter;
  });

  function markAllRead() {
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
  }

  function markRead(id: string) {
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }

  const tabs: { id: "all" | "unread" | NotifType; label: string; count: number }[] = [
    { id: "all",      label: "Toutes",   count: notifs.length },
    { id: "unread",   label: "Non lues", count: unreadCount },
    { id: "critical", label: "Critical", count: notifs.filter(n => n.type === "critical").length },
    { id: "scan",     label: "Scans",    count: notifs.filter(n => n.type === "scan").length },
    { id: "fix",      label: "Fixes",    count: notifs.filter(n => n.type === "fix").length },
  ];

  return (
    <div style={{ padding: "28px 32px", maxWidth: 960, margin: "0 auto", animation: "page-in 320ms cubic-bezier(0.2,0.7,0.2,1)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 24, gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-0.02em", margin: 0 }}>Notifications</h1>
          <p style={{ color: "var(--fg-dim)", fontSize: 13.5, marginTop: 4 }}>
            {unreadCount > 0
              ? <><span style={{ color: "var(--accent)", fontWeight: 500 }}>{unreadCount} non lue{unreadCount > 1 ? "s" : ""}</span> · {notifs.length} au total</>
              : `${notifs.length} notification${notifs.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "7px 12px", borderRadius: 8, fontSize: 13,
              border: "1px solid var(--border)", background: "var(--surface)",
              color: "var(--fg-muted)", cursor: "pointer", transition: "all 140ms ease",
              fontFamily: "var(--font-sans)",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border-bright)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
          >
            <Check size={13}/> Tout marquer comme lu
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div style={{
        display: "inline-flex", gap: 2, padding: 3,
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: 10, marginBottom: 20,
      }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setFilter(t.id)} style={{
            padding: "5px 12px", borderRadius: 7, fontSize: 12.5, fontWeight: 500,
            background: filter === t.id ? "var(--surface-3)" : "transparent",
            color: filter === t.id ? "var(--fg)" : "var(--fg-dim)",
            border: "none", cursor: "pointer", transition: "all 140ms ease",
            display: "flex", alignItems: "center", gap: 6,
          }}>
            {t.label}
            {t.count > 0 && (
              <span style={{
                fontSize: 10, fontFamily: "var(--font-mono)",
                color: filter === t.id ? "var(--fg-muted)" : "var(--fg-faint)",
              }}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--surface-2)", flexShrink: 0 }}/>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ height: 13, width: "40%", background: "var(--surface-2)", borderRadius: 4 }}/>
                <div style={{ height: 11, width: "65%", background: "var(--surface-2)", borderRadius: 4 }}/>
              </div>
            </div>
          ))
        ) : visible.length === 0 ? (
          <div style={{ padding: "60px 0", textAlign: "center", color: "var(--fg-dim)", fontSize: 13 }}>
            Aucune notification dans ce filtre
          </div>
        ) : visible.map((n, i) => {
          const meta = TYPE_META[n.type];
          const Icon = meta.icon;
          return (
            <div
              key={n.id}
              onClick={() => markRead(n.id)}
              style={{
                display: "flex", alignItems: "flex-start", gap: 14,
                padding: "14px 20px",
                borderBottom: i < visible.length - 1 ? "1px solid var(--border)" : "none",
                background: !n.read
                  ? "linear-gradient(90deg, oklch(0.86 0.18 130 / 0.03), transparent 40%)"
                  : "transparent",
                cursor: "pointer", transition: "background 140ms ease",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-2)")}
              onMouseLeave={e => (e.currentTarget.style.background = !n.read
                ? "linear-gradient(90deg, oklch(0.86 0.18 130 / 0.03), transparent 40%)"
                : "transparent"
              )}
            >
              {/* Icon */}
              <div style={{
                width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                background: `color-mix(in oklab, ${meta.color}, transparent 88%)`,
                color: meta.color, display: "grid", placeItems: "center",
              }}>
                <Icon size={15}/>
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 13.5, fontWeight: n.read ? 400 : 500, color: "var(--fg)" }}>
                    {n.title}
                  </span>
                  {!n.read && (
                    <span style={{
                      width: 6, height: 6, borderRadius: "50%",
                      background: "var(--accent)",
                      boxShadow: "0 0 6px var(--accent-glow)",
                      flexShrink: 0,
                    }}/>
                  )}
                </div>
                <div style={{ fontSize: 12.5, color: "var(--fg-dim)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {n.body}
                </div>
              </div>

              {/* Time */}
              <span style={{ fontSize: 11, color: "var(--fg-faint)", fontFamily: "var(--font-mono)", flexShrink: 0, paddingTop: 2 }}>
                {formatDistanceToNow(n.time, { addSuffix: true, locale: fr })}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
