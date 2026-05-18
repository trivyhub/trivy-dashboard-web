"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ExternalLink, ChevronDown, ChevronRight } from "lucide-react";
import { projectsApi } from "@/lib/api";
import type { ScanSummary, Vulnerability } from "@/lib/types";
import { format } from "date-fns";

function SevChip({ level }: { level: string }) {
  const cls = level === "CRITICAL" ? "critical" : level === "HIGH" ? "high" : level === "MEDIUM" ? "medium" : level === "LOW" ? "low" : "info";
  return <span className={`sev ${cls}`}>{level}</span>;
}

function ScanRow({ scan, index }: { scan: ScanSummary; index: number }) {
  const [open, setOpen] = useState(false);
  const [vulns, setVulns] = useState<Vulnerability[] | null>(null);
  const [loading, setLoading] = useState(false);
  const isLatest = index === 0;

  async function toggle() {
    if (!open && vulns === null) {
      setLoading(true);
      try { setVulns(await projectsApi.scanVulnerabilities(scan.id) ?? []); }
      finally { setLoading(false); }
    }
    setOpen(o => !o);
  }

  return (
    <>
      <tr
        onClick={toggle}
        style={{ borderBottom: "1px solid var(--border)", cursor: "pointer", transition: "background 140ms ease", background: isLatest ? "oklch(0.86 0.18 130 / 0.03)" : "transparent" }}
        onMouseEnter={e => (e.currentTarget.style.background = isLatest ? "oklch(0.86 0.18 130 / 0.06)" : "var(--surface-2)")}
        onMouseLeave={e => (e.currentTarget.style.background = isLatest ? "oklch(0.86 0.18 130 / 0.03)" : "transparent")}
      >
        <td style={{ padding: "12px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {open
              ? <ChevronDown size={14} style={{ color: "var(--fg-faint)" }}/>
              : <ChevronRight size={14} style={{ color: "var(--fg-faint)" }}/>}
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-faint)" }}>#{scan.id}</span>
            {isLatest && <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: "oklch(0.86 0.18 130 / 0.12)", color: "var(--accent)", fontFamily: "var(--font-mono)" }}>latest</span>}
          </div>
        </td>
        <td style={{ padding: "12px 14px" }}>
          {scan.pipeline_id ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }} onClick={e => e.stopPropagation()}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, padding: "2px 8px", background: "var(--surface-3)", borderRadius: 6, color: "var(--fg-dim)" }}>#{scan.pipeline_id}</span>
              {scan.pipeline_url && (
                <a href={scan.pipeline_url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--fg-faint)", display: "flex" }}>
                  <ExternalLink size={12}/>
                </a>
              )}
            </div>
          ) : <span style={{ fontSize: 11, color: "var(--fg-faint)" }}>—</span>}
        </td>
        <td style={{ padding: "12px 14px", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-dim)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{scan.image_name || "—"}</td>
        <td style={{ padding: "12px 14px", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-dim)", whiteSpace: "nowrap" }}>
          {scan.scanned_at ? format(new Date(scan.scanned_at), "MMM d, yyyy HH:mm") : "—"}
        </td>
        <td style={{ padding: "12px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {scan.critical > 0 && <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--sev-critical)" }}>{scan.critical}C</span>}
            {scan.high > 0 && <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--sev-high)" }}>{scan.high}H</span>}
            {scan.medium > 0 && <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--sev-medium)" }}>{scan.medium}M</span>}
            {scan.low > 0 && <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--sev-low)" }}>{scan.low}L</span>}
            {(scan.critical + scan.high + scan.medium + scan.low) === 0 && <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--accent)" }}>Clean</span>}
          </div>
        </td>
        <td style={{ padding: "12px 14px", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-dim)" }}>{scan.total}</td>
      </tr>
      {open && (
        <tr style={{ borderBottom: "1px solid var(--border)" }}>
          <td colSpan={6} style={{ padding: 0 }}>
            <div style={{ padding: "16px 20px", background: "var(--bg-elev)" }}>
              {loading && (
                <div style={{ height: 80, background: "var(--surface)", borderRadius: 8 }}/>
              )}
              {!loading && vulns?.length === 0 && (
                <div style={{ fontSize: 13, color: "var(--accent)", padding: "8px 0" }}>✓ No vulnerabilities in this scan</div>
              )}
              {!loading && vulns && vulns.length > 0 && (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--border)" }}>
                        {["CVE", "Severity", "Package", "Version", "Fix", "Link", "Status"].map(h => (
                          <th key={h} style={{ textAlign: "left", padding: "8px 12px", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg-faint)", fontWeight: 500 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {vulns.map(v => (
                        <tr key={v.id}
                          style={{ borderBottom: "1px solid var(--border)", transition: "background 140ms ease" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "var(--surface)")}
                          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                        >
                          <td style={{ padding: "8px 12px", fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600, color: "var(--fg)" }}>{v.cve_id}</td>
                          <td style={{ padding: "8px 12px" }}><SevChip level={v.severity}/></td>
                          <td style={{ padding: "8px 12px", fontSize: 12 }}>{v.package_name}</td>
                          <td style={{ padding: "8px 12px", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-dim)" }}>{v.installed_version}</td>
                          <td style={{ padding: "8px 12px", fontFamily: "var(--font-mono)", fontSize: 11 }}>
                            {v.fixed_version ? <span style={{ color: "var(--accent)" }}>→ {v.fixed_version}</span> : <span style={{ color: "var(--fg-faint)" }}>—</span>}
                          </td>
                          <td style={{ padding: "8px 12px" }}>
                            {v.primary_url
                              ? <a href={v.primary_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "var(--violet)", textDecoration: "none" }}>NVD ↗</a>
                              : <span style={{ fontSize: 11, color: "var(--fg-faint)" }}>—</span>}
                          </td>
                          <td style={{ padding: "8px 12px" }}>
                            {v.is_fixed
                              ? <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, background: "oklch(0.86 0.18 130 / 0.10)", color: "var(--accent)", fontFamily: "var(--font-mono)" }}>Fixed</span>
                              : <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, background: "oklch(0.65 0.24 22 / 0.10)", color: "var(--sev-critical)", fontFamily: "var(--font-mono)" }}>Open</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function HistoryPage() {
  const { name: rawName } = useParams<{ name: string }>();
  const name = decodeURIComponent(rawName);
  const [scans, setScans] = useState<ScanSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    projectsApi.scans(name).then(s => setScans(s ?? [])).finally(() => setLoading(false));
  }, [name]);

  const latest = scans[0];
  const previous = scans[1];
  const newVulns = latest && previous ? Math.max(0, (latest.critical + latest.high + latest.medium + latest.low) - (previous.critical + previous.high + previous.medium + previous.low)) : 0;
  const resolved = latest && previous ? Math.max(0, (previous.critical + previous.high + previous.medium + previous.low) - (latest.critical + latest.high + latest.medium + latest.low)) : 0;

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1480, margin: "0 auto", animation: "page-in 320ms cubic-bezier(0.2,0.7,0.2,1)" }}>
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--fg-dim)", marginBottom: 20 }}>
        <Link href="/dashboard/projects" style={{ color: "var(--fg-muted)", textDecoration: "none" }}>Projects</Link>
        <ChevronRight size={12} style={{ color: "var(--fg-faint)" }}/>
        <Link href={`/dashboard/projects/${encodeURIComponent(name)}`} style={{ color: "var(--fg-muted)", textDecoration: "none" }}>{name}</Link>
        <ChevronRight size={12} style={{ color: "var(--fg-faint)" }}/>
        <span style={{ color: "var(--fg)" }}>History</span>
      </div>

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-0.02em", margin: 0 }}>{name} · History</h1>
        <p style={{ color: "var(--fg-dim)", fontSize: 13.5, marginTop: 4 }}>
          {scans.length} scan{scans.length !== 1 ? "s" : ""} · click a row to expand vulnerabilities
        </p>
      </div>

      {/* Diff summary */}
      {scans.length >= 2 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
          {[
            { label: "New vulnerabilities", value: newVulns, color: newVulns > 0 ? "var(--sev-critical)" : "var(--accent)" },
            { label: "Resolved",             value: resolved,  color: resolved > 0 ? "var(--accent)" : "var(--fg-faint)" },
            { label: "Total scans",          value: scans.length, color: "var(--fg)" },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 20 }}>
              <div style={{ fontSize: 11, color: "var(--fg-dim)", marginBottom: 6 }}>{label}</div>
              <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em", color, fontFamily: "var(--font-mono)" }}>{value}</div>
              <div style={{ fontSize: 11, color: "var(--fg-faint)", marginTop: 4 }}>since last scan</div>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--border)" }}>
                {["Scan", "Pipeline", "Image", "Date", "Severity", "Total"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "11px 14px", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg-dim)", fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} style={{ padding: "12px 14px" }}>
                        <div style={{ height: 12, background: "var(--surface-2)", borderRadius: 4 }}/>
                      </td>
                    ))}
                  </tr>
                ))
              ) : scans.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: "48px 0", textAlign: "center", color: "var(--fg-dim)", fontSize: 13 }}>No scans yet</td></tr>
              ) : scans.map((s, i) => <ScanRow key={s.id} scan={s} index={i}/>)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
