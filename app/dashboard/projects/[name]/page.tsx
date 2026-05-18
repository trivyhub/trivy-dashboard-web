"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { History, Clock, ChevronRight, TrendingUp, TrendingDown } from "lucide-react";
import { projectsApi } from "@/lib/api";
import type { Project, Vulnerability, ScanSummary } from "@/lib/types";
import { format } from "date-fns";

function SevChip({ level }: { level: string }) {
  const cls = level === "CRITICAL" ? "critical" : level === "HIGH" ? "high" : level === "MEDIUM" ? "medium" : level === "LOW" ? "low" : "info";
  return <span className={`sev ${cls}`}>{level}</span>;
}

function SeverityBar({ c, h, m, l }: { c: number; h: number; m: number; l: number }) {
  const total = c + h + m + l || 1;
  return (
    <div style={{ display: "flex", height: 6, borderRadius: 999, overflow: "hidden", gap: 1 }}>
      {c > 0 && <div style={{ flex: c / total, background: "var(--sev-critical)" }}/>}
      {h > 0 && <div style={{ flex: h / total, background: "var(--sev-high)" }}/>}
      {m > 0 && <div style={{ flex: m / total, background: "var(--sev-medium)" }}/>}
      {l > 0 && <div style={{ flex: l / total, background: "var(--sev-low)" }}/>}
      {(c + h + m + l) === 0 && <div style={{ flex: 1, background: "var(--surface-3)" }}/>}
    </div>
  );
}

function KpiCard({ label, value, color, sub }: { label: string; value: number; color: string; sub?: string }) {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 20 }}>
      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg-faint)", fontFamily: "var(--font-mono)", marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em", color: value > 0 ? color : "var(--fg)", fontFamily: "var(--font-mono)" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--fg-faint)", marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

export default function ProjectDetailPage() {
  const { name: rawName } = useParams<{ name: string }>();
  const name = decodeURIComponent(rawName);
  const [project, setProject] = useState<Project | null>(null);
  const [scans, setScans] = useState<ScanSummary[]>([]);
  const [vulns, setVulns] = useState<Vulnerability[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([projectsApi.list(), projectsApi.scans(name)])
      .then(async ([projects, s]) => {
        const found = projects?.find(p => p.name === name) ?? null;
        const scanList = s ?? [];
        setProject(found);
        setScans(scanList);
        if (scanList.length > 0) {
          const v = await projectsApi.scanVulnerabilities(scanList[0].id);
          setVulns(v ?? []);
        }
      }).finally(() => setLoading(false));
  }, [name]);

  const latest = scans[0];
  const previous = scans[1];
  const newVulns = latest && previous ? Math.max(0, latest.total - previous.total) : 0;
  const resolvedVulns = latest && previous ? Math.max(0, previous.total - latest.total) : 0;

  if (loading) return (
    <div style={{ padding: "28px 32px" }}>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} style={{ height: 80, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, marginBottom: 16 }}/>
      ))}
    </div>
  );

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1480, margin: "0 auto", animation: "page-in 320ms cubic-bezier(0.2,0.7,0.2,1)" }}>
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--fg-dim)", marginBottom: 20 }}>
        <Link href="/dashboard/projects" style={{ color: "var(--fg-muted)", textDecoration: "none" }}>Projects</Link>
        <ChevronRight size={12} style={{ color: "var(--fg-faint)" }}/>
        <span style={{ color: "var(--fg)" }}>{name}</span>
      </div>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10, flexShrink: 0,
            background: (project?.critical ?? 0) > 0
              ? "linear-gradient(135deg, oklch(0.65 0.24 22), oklch(0.65 0.24 40))"
              : "linear-gradient(135deg, oklch(0.65 0.20 280), oklch(0.65 0.20 240))",
          }}/>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em", margin: 0 }}>{name}</h1>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4, fontSize: 12, color: "var(--fg-dim)" }}>
              <span style={{ padding: "2px 8px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 6, fontFamily: "var(--font-mono)" }}>
                {project?.environment ?? "production"}
              </span>
              {project?.owner && <span>@{project.owner}</span>}
              <span style={{ color: "var(--fg-faint)" }}>·</span>
              <Clock size={11}/>
              <span>{latest ? `Last scan ${format(new Date(latest.scanned_at), "MMM d, yyyy HH:mm")}` : "Never scanned"}</span>
              <span style={{ color: "var(--fg-faint)" }}>·</span>
              <span>{scans.length} scan{scans.length !== 1 ? "s" : ""}</span>
            </div>
          </div>
        </div>
        <Link href={`/dashboard/projects/${encodeURIComponent(name)}/history`} style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "7px 12px", borderRadius: 8, fontSize: 13, fontWeight: 500,
          border: "1px solid var(--border)", background: "var(--surface)",
          color: "var(--fg-muted)", textDecoration: "none", transition: "all 140ms ease",
        }}>
          <History size={14}/> Full history
        </Link>
      </div>

      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        <KpiCard label="Critical" value={project?.critical ?? 0} color="var(--sev-critical)" sub="Open critical CVEs"/>
        <KpiCard label="High"     value={project?.high ?? 0}     color="var(--sev-high)"     sub="Open high CVEs"/>
        <KpiCard label="Medium"   value={project?.medium ?? 0}   color="var(--sev-medium)"   sub="Open medium CVEs"/>
        <KpiCard label="Low"      value={project?.low ?? 0}      color="var(--sev-low)"      sub="Open low CVEs"/>
      </div>

      {/* Diff depuis dernier scan */}
      {scans.length >= 2 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
          <div style={{ background: "var(--surface)", border: `1px solid ${newVulns > 0 ? "oklch(0.65 0.24 22 / 0.3)" : "var(--border)"}`, borderRadius: 14, padding: 20, display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: newVulns > 0 ? "oklch(0.65 0.24 22 / 0.12)" : "oklch(0.86 0.18 130 / 0.10)", display: "grid", placeItems: "center", flexShrink: 0 }}>
              <TrendingUp size={18} style={{ color: newVulns > 0 ? "var(--sev-critical)" : "var(--accent)" }}/>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--fg-dim)", marginBottom: 4 }}>New since last scan</div>
              <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-0.02em", color: newVulns > 0 ? "var(--sev-critical)" : "var(--accent)", fontFamily: "var(--font-mono)" }}>{newVulns}</div>
            </div>
          </div>
          <div style={{ background: "var(--surface)", border: `1px solid ${resolvedVulns > 0 ? "oklch(0.86 0.18 130 / 0.3)" : "var(--border)"}`, borderRadius: 14, padding: 20, display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: resolvedVulns > 0 ? "oklch(0.86 0.18 130 / 0.10)" : "var(--surface-2)", display: "grid", placeItems: "center", flexShrink: 0 }}>
              <TrendingDown size={18} style={{ color: resolvedVulns > 0 ? "var(--accent)" : "var(--fg-faint)" }}/>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--fg-dim)", marginBottom: 4 }}>Resolved since last scan</div>
              <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-0.02em", color: resolvedVulns > 0 ? "var(--accent)" : "var(--fg-faint)", fontFamily: "var(--font-mono)" }}>{resolvedVulns}</div>
            </div>
          </div>
        </div>
      )}

      {/* Recent scans */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, marginBottom: 24, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--fg-muted)" }}>Recent scans</span>
          <Link href={`/dashboard/projects/${encodeURIComponent(name)}/history`} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--fg-dim)", textDecoration: "none" }}>
            <History size={11}/> View all
          </Link>
        </div>
        <div>
          {scans.slice(0, 5).map((s, i) => (
            <div key={s.id}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", borderBottom: i < Math.min(scans.length, 5) - 1 ? "1px solid var(--border)" : "none", transition: "background 140ms ease" }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-2)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-faint)" }}>#{s.id}</span>
                {i === 0 && <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: "oklch(0.86 0.18 130 / 0.12)", color: "var(--accent)", fontFamily: "var(--font-mono)" }}>latest</span>}
                {s.pipeline_id && (
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, padding: "2px 8px", background: "var(--surface-3)", borderRadius: 6, color: "var(--fg-dim)" }}>
                    #{s.pipeline_id}
                  </span>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {s.critical > 0 && <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--sev-critical)" }}>{s.critical}C</span>}
                  {s.high > 0 && <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--sev-high)" }}>{s.high}H</span>}
                  {s.medium > 0 && <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--sev-medium)" }}>{s.medium}M</span>}
                  {s.total === 0 && <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--accent)" }}>Clean</span>}
                </div>
                <span style={{ fontSize: 11, color: "var(--fg-faint)", fontFamily: "var(--font-mono)" }}>{format(new Date(s.scanned_at), "MMM d, HH:mm")}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Vulnerabilities table */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--fg-muted)" }}>Vulnerabilities in latest scan</span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--border)" }}>
                {["CVE", "Severity", "Package", "Version", "Fix"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "11px 14px", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg-dim)", fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vulns.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: "48px 0", textAlign: "center", color: "var(--fg-dim)", fontSize: 13 }}>No vulnerabilities found</td></tr>
              ) : vulns.slice(0, 10).map(v => (
                <tr key={v.id}
                  style={{ borderBottom: "1px solid var(--border)", transition: "background 140ms ease" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-2)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={{ padding: "12px 14px", fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600, color: "var(--fg)" }}>{v.cve_id}</td>
                  <td style={{ padding: "12px 14px" }}><SevChip level={v.severity}/></td>
                  <td style={{ padding: "12px 14px", fontSize: 13 }}>{v.package_name}</td>
                  <td style={{ padding: "12px 14px", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-dim)" }}>{v.installed_version}</td>
                  <td style={{ padding: "12px 14px", fontFamily: "var(--font-mono)", fontSize: 11 }}>
                    {v.fixed_version
                      ? <span style={{ color: "var(--accent)" }}>→ {v.fixed_version}</span>
                      : <span style={{ color: "var(--fg-faint)" }}>—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {vulns.length > 10 && (
          <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", textAlign: "center" }}>
            <Link href="/dashboard/vulnerabilities" style={{ fontSize: 12, color: "var(--fg-dim)", textDecoration: "none" }}>
              View all {vulns.length} vulnerabilities →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
