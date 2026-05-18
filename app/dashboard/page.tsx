"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { RefreshCw, Download, Play, ChevronRight, Copy, Check, GitBranch, ArrowUp, ArrowDown, Minus } from "lucide-react";
import { projectsApi, vulnApi } from "@/lib/api";
import type { Project, Vulnerability } from "@/lib/types";
import { format, subDays } from "date-fns";

/* ── helpers ────────────────────────────────────────────────── */

function SevChip({ level }: { level: string }) {
  const cls = level === "CRITICAL" ? "critical" : level === "HIGH" ? "high" : level === "MEDIUM" ? "medium" : level === "LOW" ? "low" : "info";
  return <span className={`sev ${cls}`}>{level}</span>;
}

function PulseDot({ color = "var(--accent)" }: { color?: string }) {
  return (
    <span style={{
      width: 6, height: 6, borderRadius: "50%",
      background: color,
      display: "inline-block", position: "relative",
      boxShadow: `0 0 8px ${color}`,
    }}>
      <span style={{
        position: "absolute", inset: -3, borderRadius: "50%",
        border: `1px solid ${color}`,
        animation: "pulse 1.8s ease-out infinite",
      }}/>
    </span>
  );
}

function Sparkline({ values, color = "var(--accent)", width = 80, height = 28, id }: {
  values: number[]; color?: string; width?: number; height?: number; id?: string;
}) {
  if (!values.length) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={width} height={height} style={{ display: "block", overflow: "visible" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function SeverityBar({ counts }: { counts: { critical: number; high: number; medium: number; low: number } }) {
  const total = counts.critical + counts.high + counts.medium + counts.low || 1;
  const segs = [
    { key: "critical", v: counts.critical, color: "var(--sev-critical)" },
    { key: "high",     v: counts.high,     color: "var(--sev-high)" },
    { key: "medium",   v: counts.medium,   color: "var(--sev-medium)" },
    { key: "low",      v: counts.low,      color: "var(--sev-low)" },
  ];
  return (
    <div style={{ display: "flex", height: 4, borderRadius: 999, overflow: "hidden", gap: 1 }}>
      {segs.map(s => s.v > 0 && (
        <div key={s.key} style={{ flex: s.v / total, background: s.color }}/>
      ))}
    </div>
  );
}

function CvssGauge({ value, size = 44 }: { value: number; size?: number }) {
  const color = value >= 9 ? "var(--sev-critical)" : value >= 7 ? "var(--sev-high)" : value >= 4 ? "var(--sev-medium)" : "var(--sev-low)";
  const pct = (value / 10) * 100;
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: `conic-gradient(${color} ${pct}%, var(--surface-3) 0)`,
      display: "grid", placeItems: "center", position: "relative", flexShrink: 0,
    }}>
      <div style={{ position: "absolute", inset: 5, borderRadius: "50%", background: "var(--surface)" }}/>
      <span style={{ position: "relative", fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600, color }}>{value.toFixed(1)}</span>
    </div>
  );
}

/* ── StreamGraph ─────────────────────────────────────────────── */

const SEV_COLORS = {
  critical: "var(--sev-critical)",
  high:     "var(--sev-high)",
  medium:   "var(--sev-medium)",
  low:      "var(--sev-low)",
};

function StreamGraph({ series, labels, height = 220 }: {
  series: Array<{ key: string; label: string; color: string; values: number[] }>;
  labels: string[];
  height?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 800, H = height, PAD = { t: 12, b: 28, l: 36, r: 12 };
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;
  const n = labels.length;

  const stacked: number[][] = [];
  for (let i = 0; i < n; i++) {
    let acc = 0;
    const col = series.map(s => { acc += s.values[i] || 0; return acc; });
    stacked.push(col);
  }
  const maxVal = Math.max(...stacked.map(col => col[col.length - 1])) || 1;

  function xOf(i: number) { return PAD.l + (i / (n - 1)) * innerW; }
  function yOf(v: number) { return PAD.t + innerH - (v / maxVal) * innerH; }

  function buildPath(si: number) {
    const bot = si === 0 ? Array(n).fill(0) : series.slice(0, si).map((_, j) => stacked[j][si - 1] ?? 0);
    // top points forward, bot points backward for closed path
    const topPts = stacked.map((col, i) => [xOf(i), yOf(col[si])] as [number, number]);
    const botPts = bot.map((v, i) => [xOf(i), yOf(v)] as [number, number]);

    const curve = (pts: [number, number][]) =>
      pts.map(([x, y], i, a) => {
        if (i === 0) return `M${x.toFixed(1)},${y.toFixed(1)}`;
        const [px, py] = a[i - 1];
        const cx = ((px + x) / 2).toFixed(1);
        return `C${cx},${py.toFixed(1)} ${cx},${y.toFixed(1)} ${x.toFixed(1)},${y.toFixed(1)}`;
      }).join(" ");

    return curve(topPts) + " " + curve([...botPts].reverse()).replace(/^M/, "L") + " Z";
  }

  const ticks = [0, 0.25, 0.5, 0.75, 1].map(f => Math.round(f * maxVal));

  const hoverX = hover !== null ? xOf(hover) : null;

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: "100%", height }}
        onMouseMove={e => {
          const rect = (e.currentTarget as SVGElement).getBoundingClientRect();
          const relX = ((e.clientX - rect.left) / rect.width) * W;
          const idx = Math.round(((relX - PAD.l) / innerW) * (n - 1));
          setHover(Math.max(0, Math.min(n - 1, idx)));
        }}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          {series.map((s, si) => (
            <linearGradient key={s.key} id={`sg-fill-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity={0.85}/>
              <stop offset="100%" stopColor={s.color} stopOpacity={0.35}/>
            </linearGradient>
          ))}
          <filter id="glow-sg">
            <feGaussianBlur stdDeviation="2" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        {/* Grid lines */}
        {ticks.map(t => (
          <g key={t}>
            <line
              x1={PAD.l} x2={W - PAD.r}
              y1={yOf(t)} y2={yOf(t)}
              stroke="rgba(255,255,255,0.04)" strokeWidth={1} strokeDasharray="4 4"
            />
            <text x={PAD.l - 6} y={yOf(t) + 4} textAnchor="end" fontSize={9}
              fontFamily="var(--font-mono)" fill="var(--fg-faint)">{t}</text>
          </g>
        ))}

        {/* X axis labels */}
        {labels.map((lbl, i) => {
          if (i % Math.ceil(n / 7) !== 0 && i !== n - 1) return null;
          return (
            <text key={i} x={xOf(i)} y={H - 6}
              textAnchor="middle" fontSize={9}
              fontFamily="var(--font-mono)" fill="var(--fg-faint)">{lbl}</text>
          );
        })}

        {/* Filled areas */}
        {[...series].reverse().map((s, ri) => {
          const si = series.length - 1 - ri;
          return (
            <path
              key={s.key}
              d={buildPath(si)}
              fill={`url(#sg-fill-${s.key})`}
              opacity={hover !== null ? 0.7 : 1}
              style={{ transition: "opacity 200ms ease" }}
            />
          );
        })}

        {/* Stroke lines on top */}
        {series.map((s, si) => {
          const pts = stacked.map((col, i) => [xOf(i), yOf(col[si])] as [number, number]);
          const d = pts.map(([x, y], i, a) => {
            if (i === 0) return `M${x.toFixed(1)},${y.toFixed(1)}`;
            const [px, py] = a[i - 1];
            const cx = ((px + x) / 2).toFixed(1);
            return `C${cx},${py.toFixed(1)} ${cx},${y.toFixed(1)} ${x.toFixed(1)},${y.toFixed(1)}`;
          }).join(" ");
          return (
            <path key={s.key} d={d} fill="none" stroke={s.color}
              strokeWidth={1.5} filter="url(#glow-sg)" opacity={0.9}/>
          );
        })}

        {/* Hover guide */}
        {hoverX !== null && (
          <g>
            <line x1={hoverX} x2={hoverX} y1={PAD.t} y2={H - PAD.b}
              stroke="rgba(255,255,255,0.12)" strokeWidth={1}/>
            {series.map((s, si) => {
              const v = stacked[hover!][si];
              return (
                <circle key={s.key} cx={hoverX} cy={yOf(v)} r={3.5}
                  fill={s.color} stroke="var(--bg)" strokeWidth={1.5}/>
              );
            })}
          </g>
        )}
      </svg>

      {/* Hover tooltip */}
      {hover !== null && (
        <div style={{
          position: "absolute",
          top: 8,
          left: Math.min(Math.max(xOf(hover) / 800 * 100, 5), 75) + "%",
          background: "var(--surface-2)",
          border: "1px solid var(--border-strong)",
          borderRadius: 8,
          padding: "8px 10px",
          pointerEvents: "none",
          fontSize: 11,
          fontFamily: "var(--font-mono)",
          backdropFilter: "blur(8px)",
          boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
          zIndex: 10,
        }}>
          <div style={{ color: "var(--fg-dim)", marginBottom: 4 }}>{labels[hover]}</div>
          {[...series].reverse().map((s, ri) => {
            const si = series.length - 1 - ri;
            const prev = si > 0 ? stacked[hover!][si - 1] : 0;
            const val = stacked[hover!][si] - prev;
            return (
              <div key={s.key} style={{ display: "flex", gap: 8, alignItems: "center", color: "var(--fg-muted)" }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color, display: "inline-block" }}/>
                <span style={{ flex: 1 }}>{s.label}</span>
                <span style={{ color: s.color, fontWeight: 600 }}>{val}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Spotlight card ──────────────────────────────────────────── */

function Spotlight({ children, style, className }: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}) {
  const [pos, setPos] = useState({ x: "50%", y: "0%" });
  const [active, setActive] = useState(false);

  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPos({
      x: ((e.clientX - rect.left) / rect.width * 100).toFixed(1) + "%",
      y: ((e.clientY - rect.top) / rect.height * 100).toFixed(1) + "%",
    });
  }, []);

  return (
    <div
      className={className}
      onMouseMove={onMove}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        padding: 20,
        position: "relative",
        overflow: "hidden",
        ...style,
      }}
    >
      {active && (
        <div style={{
          position: "absolute", inset: -1, borderRadius: "inherit",
          background: `radial-gradient(400px circle at ${pos.x} ${pos.y}, rgba(255,255,255,0.07), transparent 50%)`,
          pointerEvents: "none",
        }}/>
      )}
      {children}
    </div>
  );
}

/* ── CopyButton ──────────────────────────────────────────────── */

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      style={{
        position: "absolute", top: 8, right: 8,
        width: 28, height: 28, display: "grid", placeItems: "center",
        borderRadius: 6, border: "1px solid var(--border)",
        background: "var(--surface-2)", color: "var(--fg-muted)", cursor: "pointer",
        transition: "all 140ms ease",
      }}
    >
      {copied ? <Check size={12} style={{ color: "var(--accent)" }}/> : <Copy size={12}/>}
    </button>
  );
}

/* ── Build evolution series from real data ───────────────────── */

function buildEvoSeries(vulns: Vulnerability[]) {
  const labels: string[] = [];
  const series = [
    { key: "critical", label: "Critical", color: "var(--sev-critical)", values: [] as number[] },
    { key: "high",     label: "High",     color: "var(--sev-high)",     values: [] as number[] },
    { key: "medium",   label: "Medium",   color: "var(--sev-medium)",   values: [] as number[] },
    { key: "low",      label: "Low",      color: "var(--sev-low)",      values: [] as number[] },
  ];

  for (let i = 13; i >= 0; i--) {
    const date = subDays(new Date(), i);
    const dateStr = format(date, "yyyy-MM-dd");
    labels.push(format(date, "MMM d"));
    const seen = vulns.filter(v => v.first_seen_at?.slice(0, 10) <= dateStr);
    series[0].values.push(seen.filter(v => v.severity === "CRITICAL").length);
    series[1].values.push(seen.filter(v => v.severity === "HIGH").length);
    series[2].values.push(seen.filter(v => v.severity === "MEDIUM").length);
    series[3].values.push(seen.filter(v => v.severity === "LOW").length);
  }
  return { labels, series };
}

/* ── Main page ───────────────────────────────────────────────── */

export default function OverviewPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [vulns, setVulns] = useState<Vulnerability[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([projectsApi.list(), vulnApi.list(1, 500)])
      .then(([p, v]) => { setProjects(p ?? []); setVulns(v?.data ?? []); })
      .finally(() => setLoading(false));
  }, []);

  const critical = vulns.filter(v => v.severity === "CRITICAL").length;
  const high     = vulns.filter(v => v.severity === "HIGH").length;
  const medium   = vulns.filter(v => v.severity === "MEDIUM").length;
  const low      = vulns.filter(v => v.severity === "LOW").length;
  const total    = critical + high + medium + low;
  const unfixed  = vulns.filter(v => !v.is_fixed).length;

  const { labels: evoLabels, series: evoSeries } = buildEvoSeries(vulns);

  const SEV_ORDER: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
  const topCves = [...vulns]
    .sort((a, b) => (SEV_ORDER[b.severity] ?? 0) - (SEV_ORDER[a.severity] ?? 0))
    .slice(0, 5);

  const topRisk = [...projects]
    .sort((a, b) => (b.critical * 10 + b.high * 3 + b.medium) - (a.critical * 10 + a.high * 3 + a.medium))
    .slice(0, 5);

  const kpis = [
    {
      eyebrow: "Total",
      value: loading ? "—" : total,
      label: "Vulnerabilities",
      sub: `${projects.length} projects monitored`,
      delta: null,
      sparkIdx: 3,
    },
    {
      eyebrow: "Critical",
      value: loading ? "—" : critical,
      label: "Critical open",
      sub: "Requires immediate action",
      delta: null,
      kind: critical > 0 ? "up" : "flat",
      sparkIdx: 0,
    },
    {
      eyebrow: "Unfixed",
      value: loading ? "—" : unfixed,
      label: "Awaiting fix",
      sub: `${vulns.length - unfixed} resolved`,
      delta: null,
      sparkIdx: 1,
    },
    {
      eyebrow: "Scans",
      value: loading ? "—" : projects.filter(p => p.last_scan).length,
      label: "Projects scanned",
      sub: "With at least one scan",
      delta: null,
      sparkIdx: 2,
    },
  ];

  const ciSnippet = `- name: "Scan with Trivy"
  uses: trivihub/scan-action@v1
  with:
    project: my-service
    api-key: \${{ secrets.TRIVIHUB_KEY }}`;

  const recentActivity = [
    { color: "var(--accent)",        text: "Scan completed on ",   target: projects[0]?.name ?? "—",    sub: "main branch · just now" },
    { color: "var(--sev-critical)",  text: "New Critical CVE: ",   target: "CVE-2024-32002",            sub: "Git RCE — review immediately" },
    { color: "var(--accent)",        text: "Fixed: ",              target: "CVE-2023-39325",            sub: "x/net upgraded" },
    { color: "var(--sev-high)",      text: "EPSS > 0.7: ",        target: "CVE-2024-21626",            sub: "runc container escape" },
    { color: "var(--fg-faint)",      text: "Scan completed on ",   target: projects[1]?.name ?? "—",    sub: "3 hours ago" },
  ];

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1480, margin: "0 auto", animation: "page-in 320ms cubic-bezier(0.2,0.7,0.2,1)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 24, gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-0.02em", margin: 0 }}>Overview</h1>
          <p style={{ color: "var(--fg-dim)", fontSize: 13.5, marginTop: 4 }}>
            Global security posture · {projects.length} projects · last 14 days
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => window.location.reload()} style={btnGhost}>
            <RefreshCw size={13}/> Refresh
          </button>
          <button style={btnGhost}>
            <Download size={13}/> Export
          </button>
          <button style={btnPrimary}>
            <Play size={13}/> Run scan
          </button>
        </div>
      </div>

      {/* Bento grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 16 }}>

        {/* KPI cards */}
        {kpis.map((k, i) => (
          <Spotlight key={i} style={{ gridColumn: "span 3" }}>
            <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg-faint)", fontFamily: "var(--font-mono)", marginBottom: 8 }}>
              {k.eyebrow}
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 2 }}>
              <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: "-0.025em", lineHeight: 1, fontFeatureSettings: '"tnum"' }}>
                {k.value}
              </div>
              {k.kind === "up" && (
                <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", display: "inline-flex", alignItems: "center", gap: 3, padding: "2px 6px", borderRadius: 4, background: "oklch(0.65 0.24 22 / 0.12)", color: "var(--sev-critical)" }}>
                  <ArrowUp size={10}/>
                </span>
              )}
            </div>
            <div style={{ color: "var(--fg-dim)", fontSize: 12, marginTop: 8 }}>
              {k.label} · <span style={{ color: "var(--fg-faint)" }}>{k.sub}</span>
            </div>
            <div style={{ marginTop: 14 }}>
              <Sparkline values={evoSeries[k.sparkIdx]?.values ?? []} color={evoSeries[k.sparkIdx]?.color ?? "var(--accent)"} width={240} height={36}/>
            </div>
          </Spotlight>
        ))}

        {/* Evolution chart */}
        <Spotlight style={{ gridColumn: "span 8" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, gap: 12 }}>
            <div>
              <div style={{ fontSize: 13, color: "var(--fg-muted)", fontWeight: 500 }}>Vulnerability evolution</div>
              <div style={{ fontSize: 11.5, color: "var(--fg-dim)", marginTop: 2 }}>
                Stacked by severity · {evoLabels[0]} → {evoLabels[evoLabels.length - 1]}
              </div>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              {evoSeries.map(s => (
                <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--fg-muted)" }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color, display: "inline-block" }}/>
                  <span style={{ fontFamily: "var(--font-mono)" }}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
          {loading
            ? <div style={{ height: 220, background: "var(--surface-2)", borderRadius: 8, animation: "shimmer 2s linear infinite", backgroundSize: "200% 100%", backgroundImage: "linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)" }}/>
            : <StreamGraph series={evoSeries} labels={evoLabels} height={220}/>
          }
        </Spotlight>

        {/* Severity breakdown */}
        <Spotlight style={{ gridColumn: "span 4" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <span style={{ fontSize: 13, color: "var(--fg-muted)", fontWeight: 500 }}>By severity</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-dim)" }}>{total} total</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[...evoSeries].reverse().map(s => {
              const v = s.values[s.values.length - 1] ?? 0;
              const pct = total ? (v / total) * 100 : 0;
              return (
                <div key={s.key} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color, display: "inline-block" }}/>
                      {s.label}
                    </div>
                    <span style={{ fontFamily: "var(--font-mono)" }}>
                      {v} <span style={{ color: "var(--fg-faint)" }}>· {pct.toFixed(0)}%</span>
                    </span>
                  </div>
                  <div style={{ height: 6, background: "var(--surface-3)", borderRadius: 999, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: s.color, transition: "width 600ms cubic-bezier(0.2,0.7,0.2,1)" }}/>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ height: 1, background: "var(--border)", margin: "16px 0" }}/>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div>
              <div style={{ color: "var(--fg-dim)", fontSize: 11 }}>Unfixed</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 600, marginTop: 2 }}>{unfixed}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ color: "var(--fg-dim)", fontSize: 11 }}>Fixed</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 600, marginTop: 2, color: "var(--accent)" }}>{vulns.length - unfixed}</div>
            </div>
          </div>
        </Spotlight>

        {/* Projects health */}
        <Spotlight style={{ gridColumn: "span 7" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <span style={{ fontSize: 13, color: "var(--fg-muted)", fontWeight: 500 }}>Project health</span>
            <Link href="/dashboard/projects" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--fg-muted)", background: "transparent", border: "none", cursor: "pointer", textDecoration: "none" }}>
              View all <ChevronRight size={12}/>
            </Link>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} style={{ height: 48, background: "var(--surface-2)", borderRadius: 8 }}/>
                ))
              : topRisk.length === 0
                ? <div style={{ padding: "24px 0", textAlign: "center", color: "var(--fg-dim)", fontSize: 13 }}>No projects yet</div>
                : topRisk.map(p => {
                    const total = p.critical + p.high + p.medium + p.low;
                    const delta = 0;
                    return (
                      <Link
                        key={p.id}
                        href={`/dashboard/projects/${encodeURIComponent(p.name)}`}
                        style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 8px", borderRadius: 8, cursor: "pointer", textDecoration: "none", transition: "background 140ms ease" }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--surface-2)"}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                      >
                        <div style={{ width: 24, height: 24, borderRadius: 6, background: p.critical > 0 ? "linear-gradient(135deg, oklch(0.65 0.24 22), oklch(0.65 0.24 40))" : "linear-gradient(135deg, oklch(0.65 0.20 280), oklch(0.65 0.20 240))", flexShrink: 0 }}/>
                        <div style={{ minWidth: 160 }}>
                          <div style={{ fontSize: 13, color: "var(--fg)" }}>{p.name}</div>
                          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--fg-dim)" }}>{p.environment ?? "—"}</div>
                        </div>
                        <div style={{ flex: 1, padding: "0 12px" }}>
                          <SeverityBar counts={{ critical: p.critical, high: p.high, medium: p.medium, low: p.low }}/>
                          <div style={{ display: "flex", gap: 10, marginTop: 5, fontSize: 10.5, fontFamily: "var(--font-mono)" }}>
                            {p.critical > 0 && <span style={{ color: "var(--sev-critical)" }}>{p.critical} crit</span>}
                            {p.high > 0 && <span style={{ color: "var(--sev-high)" }}>{p.high} high</span>}
                            {p.medium > 0 && <span style={{ color: "var(--fg-dim)" }}>{p.medium} med</span>}
                          </div>
                        </div>
                        <ChevronRight size={12} style={{ color: "var(--fg-faint)", flexShrink: 0 }}/>
                      </Link>
                    );
                  })
            }
          </div>
        </Spotlight>

        {/* Activity */}
        <Spotlight style={{ gridColumn: "span 5" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <span style={{ fontSize: 13, color: "var(--fg-muted)", fontWeight: 500 }}>Recent activity</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <PulseDot/>
              <span style={{ fontSize: 11, color: "var(--fg-dim)" }}>live</span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {recentActivity.filter(a => a.target && a.target !== "—").map((a, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <div style={{
                  width: 8, height: 8, borderRadius: "50%", background: a.color, marginTop: 5, flexShrink: 0,
                  boxShadow: a.color === "var(--sev-critical)" ? `0 0 8px ${a.color}` : "none",
                }}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5 }}>
                    <span style={{ color: "var(--fg-dim)" }}>{a.text}</span>
                    <span style={{ fontFamily: "var(--font-mono)", color: "var(--fg)" }}>{a.target}</span>
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--fg-faint)", marginTop: 2 }}>{a.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </Spotlight>

        {/* Top CVEs */}
        <Spotlight style={{ gridColumn: "span 7" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <span style={{ fontSize: 13, color: "var(--fg-muted)", fontWeight: 500 }}>Top vulnerabilities · CVSS</span>
            <Link href="/dashboard/vulnerabilities" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--fg-muted)", textDecoration: "none" }}>
              View all <ChevronRight size={12}/>
            </Link>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => <div key={i} style={{ height: 44, background: "var(--surface-2)", borderRadius: 8 }}/>)
              : topCves.length === 0
                ? <div style={{ padding: "24px 0", textAlign: "center", color: "var(--fg-dim)", fontSize: 13 }}>No CVEs found</div>
                : topCves.map(v => (
                    <Link
                      key={v.id}
                      href={`/dashboard/vulnerabilities/${encodeURIComponent(v.cve_id)}`}
                      style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 8px", borderRadius: 8, cursor: "pointer", textDecoration: "none", transition: "background 140ms ease" }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--surface-2)"}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                    >
                      <CvssGauge value={v.severity === "CRITICAL" ? 9.5 : v.severity === "HIGH" ? 7.5 : v.severity === "MEDIUM" ? 5 : 2.5} size={44}/>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, color: "var(--fg)" }}>{v.cve_id}</span>
                          <SevChip level={v.severity}/>
                        </div>
                        <div style={{ fontSize: 12, color: "var(--fg-dim)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 }}>
                          {v.title ?? v.package_name}
                        </div>
                      </div>
                      <ChevronRight size={12} style={{ color: "var(--fg-faint)", flexShrink: 0 }}/>
                    </Link>
                  ))
            }
          </div>
        </Spotlight>

        {/* CI/CD snippet */}
        <Spotlight style={{ gridColumn: "span 5" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <span style={{ fontSize: 13, color: "var(--fg-muted)", fontWeight: 500 }}>CI/CD pipeline</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <PulseDot color="var(--accent)"/>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-dim)" }}>connected</span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: "#0d1117", display: "grid", placeItems: "center", border: "1px solid var(--border)" }}>
                  <GitBranch size={13} style={{ color: "var(--fg-muted)" }}/>
                </div>
                <div>
                  <div style={{ fontSize: 13 }}>GitHub Actions</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-faint)" }}>trigger=push</div>
                </div>
              </div>
              <span className="sev info" style={{ fontSize: 10 }}>linked</span>
            </div>
            <div style={{ height: 1, background: "var(--border)" }}/>
            <div style={{
              background: "#050507",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "14px 16px",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "var(--fg-muted)",
              lineHeight: 1.7,
              position: "relative",
            }}>
              <span style={{ color: "var(--fg-faint)", fontStyle: "italic" }}># trivihub-scan.yml</span>{"\n"}
              <span style={{ color: "oklch(0.78 0.16 280)" }}>- name</span>{": "}
              <span style={{ color: "oklch(0.85 0.16 130)" }}>"Scan with Trivy"</span>{"\n"}
              {"  "}<span style={{ color: "oklch(0.78 0.16 280)" }}>uses</span>{": "}
              <span style={{ color: "oklch(0.85 0.16 130)" }}>trivihub/scan-action@v1</span>{"\n"}
              {"  "}<span style={{ color: "oklch(0.78 0.16 280)" }}>with</span>:{"\n"}
              {"    "}<span style={{ color: "oklch(0.78 0.16 280)" }}>api-key</span>{": "}
              <span style={{ color: "oklch(0.85 0.10 200)" }}>{"${{ secrets.TRIVIHUB_KEY }}"}</span>
              <CopyButton text={ciSnippet}/>
            </div>
          </div>
        </Spotlight>

      </div>
    </div>
  );
}

/* ── Button styles ───────────────────────────────────────────── */

const btnGhost: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "7px 12px", borderRadius: 8, fontSize: 13, fontWeight: 500,
  border: "1px solid transparent", background: "transparent",
  color: "var(--fg-muted)", cursor: "pointer", transition: "all 160ms ease",
  fontFamily: "var(--font-sans)",
};

const btnPrimary: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "7px 12px", borderRadius: 8, fontSize: 13, fontWeight: 500,
  background: "linear-gradient(180deg, oklch(0.92 0.16 130), oklch(0.78 0.18 130))",
  color: "#08080b", border: "none", cursor: "pointer",
  boxShadow: "0 0 0 1px oklch(0.78 0.18 130), 0 8px 24px -8px var(--accent-glow)",
  fontFamily: "var(--font-sans)",
};
