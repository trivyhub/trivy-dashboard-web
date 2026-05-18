"use client";
import { useState, useCallback } from "react";

export function Card({ children, className = "", style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: 14,
      ...style,
    }} className={className}>
      {children}
    </div>
  );
}

export function CardHeader({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "16px 20px",
      borderBottom: "1px solid var(--border)",
    }}>
      {children}
    </div>
  );
}

export function CardContent({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ padding: "16px 20px", ...style }}>{children}</div>;
}

export function SpotlightCard({ children, style, className }: {
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
          zIndex: 0,
        }}/>
      )}
      <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
    </div>
  );
}
