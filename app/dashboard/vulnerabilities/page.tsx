"use client";
import { useEffect, useState } from "react";
import { vulnApi } from "@/lib/api";
import type { Vulnerability, Severity } from "@/lib/types";
import { Search, Download, ExternalLink } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { exportVulnsCSV } from "@/lib/export";

/* ── helpers ─────────────────────────────────────────────────── */

function SevChip({ level }: { level: string }) {
  const cls = level === "CRITICAL" ? "critical" : level === "HIGH" ? "high" : level === "MEDIUM" ? "medium" : level === "LOW" ? "low" : "info";
  return <span className={`sev ${cls}`}>{level}</span>;
}

function AgeBadge({ date, severity }: { date: string; severity: string }) {
  const days = differenceInDays(new Date(), new Date(date));
  const alert = (severity === "CRITICAL" && days > 7) || (severity === "HIGH" && days > 14);
  return (
    <span style={{
      fontSize: 11, padding: "2px 8px", borderRadius: 999,
      fontFamily: "var(--font-mono)",
      background: alert ? "oklch(0.65 0.24 22 / 0.12)" : "var(--surface-3)",
      color: alert ? "var(--sev-critical)" : "var(--fg-dim)",
    }}>
      {days}d{alert ? " ⚠" : ""}
    </span>
  );
}

const SEVERITIES: Severity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

const SEV_ACTIVE: Record<Severity, { bg: string; color: string }> = {
  CRITICAL: { bg: "oklch(0.65 0.24 22 / 0.14)", color: "var(--sev-critical)" },
  HIGH:     { bg: "oklch(0.72 0.18 50 / 0.14)", color: "var(--sev-high)" },
  MEDIUM:   { bg: "oklch(0.82 0.16 90 / 0.14)", color: "var(--sev-medium)" },
  LOW:      { bg: "oklch(0.70 0.14 245 / 0.14)", color: "var(--sev-low)" },
  UNKNOWN:  { bg: "var(--surface-3)", color: "var(--fg-muted)" },
};

/* ── Page ────────────────────────────────────────────────────── */

export default function VulnerabilitiesPage() {
  const [vulns, setVulns] = useState<Vulnerability[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sevFilter, setSevFilter] = useState<Severity | "ALL">("ALL");
  const [fixedFilter, setFixedFilter] = useState<"ALL" | "FIXED" | "UNFIXED">("UNFIXED");

  useEffect(() => {
    setLoading(true);
    vulnApi.list(page, 100, sevFilter === "ALL" ? "" : sevFilter)
      .then(v => { setVulns(v?.data ?? []); setTotal(v?.total ?? 0); })
      .finally(() => setLoading(false));
  }, [page, sevFilter]);

  const filtered = vulns.filter(v => {
    if (fixedFilter === "FIXED" && !v.is_fixed) return false;
    if (fixedFilter === "UNFIXED" && v.is_fixed) return false;
    const q = search.toLowerCase();
    return !q || v.cve_id.toLowerCase().includes(q) || v.package_name.toLowerCase().includes(q) || (v.title ?? "").toLowerCase().includes(q);
  });

  const totalPages = Math.ceil(total / 100);

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1480, margin: "0 auto", animation: "page-in 320ms cubic-bezier(0.2,0.7,0.2,1)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 24, gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-0.02em", margin: 0 }}>Vulnerabilities</h1>
          <p style={{ color: "var(--fg-dim)", fontSize: 13.5, marginTop: 4 }}>
            {total} CVEs detected · latest scan results across all projects
          </p>
        </div>
        <button
          onClick={() => exportVulnsCSV(filtered, `vulnerabilities-${new Date().toISOString().slice(0,10)}.csv`)}
          style={btnGhost}
        >
          <Download size={13}/> Export CSV
        </button>
      </div>

      {/* Severity filter pills */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <button
          onClick={() => { setSevFilter("ALL"); setPage(1); }}
          style={{
            ...pill,
            background: sevFilter === "ALL" ? "linear-gradient(180deg, oklch(0.92 0.16 130), oklch(0.78 0.18 130))" : "var(--surface)",
            color: sevFilter === "ALL" ? "#08080b" : "var(--fg-muted)",
            borderColor: sevFilter === "ALL" ? "transparent" : "var(--border)",
            boxShadow: sevFilter === "ALL" ? "0 0 0 1px oklch(0.78 0.18 130), 0 4px 12px -4px var(--accent-glow)" : "none",
          }}
        >
          All <span style={{ fontFamily: "var(--font-mono)", opacity: 0.7, marginLeft: 4 }}>{total}</span>
        </button>
        {SEVERITIES.map(s => {
          const active = sevFilter === s;
          const c = SEV_ACTIVE[s];
          return (
            <button key={s}
              onClick={() => { setSevFilter(prev => prev === s ? "ALL" : s); setPage(1); }}
              style={{
                ...pill,
                background: active ? c.bg : "var(--surface)",
                color: active ? c.color : "var(--fg-muted)",
                borderColor: active ? c.color : "var(--border)",
              }}
            >
              {s}
            </button>
          );
        })}
      </div>

      {/* Search + status filter */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <div style={{ position: "relative", flex: 1, maxWidth: 360 }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--fg-faint)", pointerEvents: "none" }}/>
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search CVE, package, title…"
            style={{
              width: "100%", paddingLeft: 32, paddingRight: 12, paddingTop: 7, paddingBottom: 7,
              background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8,
              fontSize: 13, color: "var(--fg)", outline: "none",
              transition: "border-color 160ms ease",
            }}
            onFocus={e => (e.target.style.borderColor = "var(--accent-dim)")}
            onBlur={e => (e.target.style.borderColor = "var(--border)")}
          />
        </div>
        <div style={{ display: "flex", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 3, gap: 2 }}>
          {(["ALL", "UNFIXED", "FIXED"] as const).map(f => (
            <button key={f} onClick={() => setFixedFilter(f)} style={{
              padding: "5px 10px", borderRadius: 6, fontSize: 12, fontWeight: 500,
              background: fixedFilter === f ? "var(--surface-3)" : "transparent",
              color: fixedFilter === f ? "var(--fg)" : "var(--fg-dim)",
              border: "none", cursor: "pointer", transition: "all 140ms ease",
            }}>
              {f === "ALL" ? "All" : f === "UNFIXED" ? "Unfixed" : "Fixed"}
            </button>
          ))}
        </div>
        <span style={{ fontSize: 12, color: "var(--fg-faint)", fontFamily: "var(--font-mono)" }}>
          {filtered.length} result{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--surface-2)" }}>
                {["CVE ID", "CVSS", "Severity", "Package", "Installed", "Fix", "Title", "Link", "Status", "Age", "First seen"].map(h => (
                  <th key={h} style={{
                    textAlign: "left", padding: "11px 14px",
                    fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em",
                    color: "var(--fg-dim)", fontWeight: 500, whiteSpace: "nowrap",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                    {Array.from({ length: 10 }).map((_, j) => (
                      <td key={j} style={{ padding: "12px 14px" }}>
                        <div style={{ height: 12, background: "var(--surface-2)", borderRadius: 4, animation: "shimmer 2s linear infinite", backgroundSize: "200% 100%", backgroundImage: "linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)" }}/>
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ padding: "48px 0", textAlign: "center", color: "var(--fg-dim)", fontSize: 13 }}>
                    No vulnerabilities found
                  </td>
                </tr>
              ) : filtered.map(v => (
                <tr key={v.id}
                  style={{ borderBottom: "1px solid var(--border)", transition: "background 140ms ease", cursor: "default" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-2)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={{ padding: "12px 14px", fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600, color: "var(--fg)", whiteSpace: "nowrap" }}>
                    {v.cve_id}
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    {v.cvss_score != null
                      ? <span style={{
                          fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700,
                          color: v.cvss_score >= 9 ? "var(--sev-critical)" : v.cvss_score >= 7 ? "var(--sev-high)" : v.cvss_score >= 4 ? "var(--sev-medium)" : "var(--sev-low)",
                        }}>{v.cvss_score.toFixed(1)}</span>
                      : <span style={{ color: "var(--fg-faint)", fontSize: 11 }}>—</span>}
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <SevChip level={v.severity}/>
                  </td>
                  <td style={{ padding: "12px 14px", fontSize: 13 }}>{v.package_name}</td>
                  <td style={{ padding: "12px 14px", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-dim)" }}>
                    {v.installed_version}
                  </td>
                  <td style={{ padding: "12px 14px", fontFamily: "var(--font-mono)", fontSize: 11 }}>
                    {v.fixed_version
                      ? <span style={{ color: "var(--accent)" }}>→ {v.fixed_version}</span>
                      : <span style={{ color: "var(--fg-faint)" }}>—</span>}
                  </td>
                  <td style={{ padding: "12px 14px", fontSize: 12, color: "var(--fg-muted)", maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={v.title}>
                    {v.title || "—"}
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    {v.primary_url
                      ? <a href={v.primary_url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--violet)", fontSize: 11, textDecoration: "none" }}>
                          NVD <ExternalLink size={10}/>
                        </a>
                      : <span style={{ color: "var(--fg-faint)", fontSize: 11 }}>—</span>}
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    {v.is_fixed
                      ? <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: "oklch(0.86 0.18 130 / 0.12)", color: "var(--accent)", fontFamily: "var(--font-mono)" }}>Fixed</span>
                      : <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: "oklch(0.65 0.24 22 / 0.10)", color: "var(--sev-critical)", fontFamily: "var(--font-mono)" }}>Open</span>}
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <AgeBadge date={v.first_seen_at} severity={v.severity}/>
                  </td>
                  <td style={{ padding: "12px 14px", fontSize: 11, color: "var(--fg-faint)", whiteSpace: "nowrap", fontFamily: "var(--font-mono)" }}>
                    {format(new Date(v.first_seen_at), "MMM d, yyyy")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 16px", borderTop: "1px solid var(--border)" }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ ...pill, opacity: page === 1 ? 0.3 : 1 }}>← Prev</button>
            <span style={{ fontSize: 12, color: "var(--fg-dim)", fontFamily: "var(--font-mono)" }}>Page {page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ ...pill, opacity: page === totalPages ? 0.3 : 1 }}>Next →</button>
          </div>
        )}
      </div>
    </div>
  );
}

const pill: React.CSSProperties = {
  display: "inline-flex", alignItems: "center",
  padding: "5px 12px", borderRadius: 999,
  fontSize: 12, fontWeight: 500,
  border: "1px solid var(--border)",
  background: "var(--surface)",
  color: "var(--fg-muted)",
  cursor: "pointer",
  transition: "all 140ms ease",
  fontFamily: "var(--font-sans)",
};

const btnGhost: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "7px 12px", borderRadius: 8, fontSize: 13, fontWeight: 500,
  border: "1px solid var(--border)", background: "var(--surface)",
  color: "var(--fg-muted)", cursor: "pointer", transition: "all 160ms ease",
  fontFamily: "var(--font-sans)",
};
