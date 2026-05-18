"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { projectsApi } from "@/lib/api";
import type { Project } from "@/lib/types";
import { Search, Clock, ChevronRight, History } from "lucide-react";
import { format } from "date-fns";

function RiskBadge({ c, h, m }: { c: number; h: number; m: number }) {
  const score = c * 10 + h * 3 + m;
  if (score === 0) return <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: "oklch(0.86 0.18 130 / 0.12)", color: "var(--accent)", fontFamily: "var(--font-mono)" }}>Clean</span>;
  if (score >= 30) return <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: "oklch(0.65 0.24 22 / 0.12)", color: "var(--sev-critical)", fontFamily: "var(--font-mono)" }}>Critical risk</span>;
  if (score >= 10) return <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: "oklch(0.72 0.18 50 / 0.12)", color: "var(--sev-high)", fontFamily: "var(--font-mono)" }}>High risk</span>;
  return <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: "oklch(0.82 0.16 90 / 0.12)", color: "var(--sev-medium)", fontFamily: "var(--font-mono)" }}>Med risk</span>;
}

function ProjectCard({ project: p }: { project: Project }) {
  const [hov, setHov] = useState(false);
  const gradient = p.critical > 0
    ? "linear-gradient(135deg, oklch(0.65 0.24 22), oklch(0.65 0.24 40))"
    : p.high > 0
      ? "linear-gradient(135deg, oklch(0.72 0.18 50), oklch(0.72 0.18 30))"
      : "linear-gradient(135deg, oklch(0.65 0.20 280), oklch(0.65 0.20 240))";

  return (
    <Link
      href={`/dashboard/projects/${encodeURIComponent(p.name)}`}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "block", textDecoration: "none",
        background: "var(--surface)",
        border: `1px solid ${hov ? "var(--border-bright)" : "var(--border)"}`,
        borderRadius: 14, padding: 20,
        transition: "border-color 160ms ease, transform 160ms ease",
        transform: hov ? "translateY(-1px)" : "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: gradient, flexShrink: 0 }}/>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--fg)" }}>{p.name}</div>
            <div style={{ fontSize: 11, color: "var(--fg-dim)", marginTop: 2 }}>
              {p.environment || "production"}{p.owner ? ` · @${p.owner}` : ""}
            </div>
          </div>
        </div>
        <RiskBadge c={p.critical} h={p.high} m={p.medium}/>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
        {[
          { label: "Critical", v: p.critical, color: "var(--sev-critical)" },
          { label: "High",     v: p.high,     color: "var(--sev-high)" },
          { label: "Medium",   v: p.medium,   color: "var(--sev-medium)" },
          { label: "Low",      v: p.low,      color: "var(--sev-low)" },
        ].map(({ label, v, color }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, color: "var(--fg-faint)", width: 44 }}>{label}</span>
            <div style={{ flex: 1, height: 4, background: "var(--surface-3)", borderRadius: 999, overflow: "hidden" }}>
              <div style={{ width: `${Math.min(100, (v / 20) * 100)}%`, height: "100%", background: color, transition: "width 600ms cubic-bezier(0.2,0.7,0.2,1)" }}/>
            </div>
            <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: v > 0 ? color : "var(--fg-faint)", width: 24, textAlign: "right" }}>{v}</span>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 14, borderTop: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--fg-faint)" }}>
          <Clock size={11}/>
          {p.last_scan ? format(new Date(p.last_scan), "MMM d, HH:mm") : "Never scanned"}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 11, color: "var(--fg-faint)", fontFamily: "var(--font-mono)" }}>{p.total_scans} scan{p.total_scans !== 1 ? "s" : ""}</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--fg-dim)" }}>
            <History size={11}/> History
          </span>
          <ChevronRight size={12} style={{ color: "var(--fg-faint)" }}/>
        </div>
      </div>
    </Link>
  );
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    projectsApi.list().then(p => setProjects(p ?? [])).finally(() => setLoading(false));
  }, []);

  const filtered = projects.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalCritical = projects.reduce((s, p) => s + p.critical, 0);
  const totalHigh = projects.reduce((s, p) => s + p.high, 0);

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1480, margin: "0 auto", animation: "page-in 320ms cubic-bezier(0.2,0.7,0.2,1)" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 24, gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-0.02em", margin: 0 }}>Projects</h1>
          <p style={{ color: "var(--fg-dim)", fontSize: 13.5, marginTop: 4 }}>
            {projects.length} projects ·{" "}
            <span style={{ color: "var(--sev-critical)", fontFamily: "var(--font-mono)" }}>{totalCritical} critical</span>
            {" · "}
            <span style={{ color: "var(--sev-high)", fontFamily: "var(--font-mono)" }}>{totalHigh} high</span>
          </p>
        </div>
      </div>

      <div style={{ marginBottom: 24, maxWidth: 360, position: "relative" }}>
        <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--fg-faint)", pointerEvents: "none" }}/>
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search projects…"
          style={{ width: "100%", paddingLeft: 32, paddingRight: 12, paddingTop: 7, paddingBottom: 7, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, color: "var(--fg)", outline: "none" }}
          onFocus={e => (e.target.style.borderColor = "var(--accent-dim)")}
          onBlur={e => (e.target.style.borderColor = "var(--border)")}
        />
      </div>

      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ height: 220, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14 }}/>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: "80px 0", textAlign: "center", color: "var(--fg-dim)", fontSize: 14 }}>No projects found</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
          {filtered.map(p => <ProjectCard key={p.id} project={p}/>)}
        </div>
      )}
    </div>
  );
}
