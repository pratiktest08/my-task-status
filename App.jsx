import { BRAND } from './config';
import { ArrowUp, ArrowDown, User } from 'lucide-react';

// Status Badge
export function Badge({ status }) {
  const s = (status || "").toLowerCase();
  let c;
  if (s.includes("complete") || s === "approved" || s.includes("closed"))
    c = { bg: BRAND.okBg, fg: BRAND.green };
  else if (s.includes("progress"))
    c = { bg: BRAND.infoBg, fg: BRAND.info };
  else if (s.includes("pending") || s.includes("review"))
    c = { bg: BRAND.warnBg, fg: BRAND.warn };
  else if (s.includes("hold"))
    c = { bg: "#f5f5f5", fg: "#888" };
  else
    c = { bg: BRAND.warnBg, fg: BRAND.warn };

  return (
    <span style={{
      background: c.bg, color: c.fg,
      border: `1px solid ${c.fg}30`,
      padding: "3px 10px", borderRadius: 6,
      fontSize: 12, fontWeight: 600, whiteSpace: "nowrap",
    }}>
      {status}
    </span>
  );
}

// Priority Indicator
export function Priority({ priority }) {
  const colors = { Critical: BRAND.danger, High: BRAND.warn, Medium: BRAND.info, Low: BRAND.green };
  const color = colors[priority] || "#999";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, color }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: color }} />
      {priority}
    </span>
  );
}

// Progress Bar
export function ProgressBar({ value, height = 6 }) {
  const bg = value === 100 ? BRAND.green : value > 60 ? BRAND.purple : value > 30 ? BRAND.warn : BRAND.danger;
  return (
    <div style={{ width: "100%", background: "#e8eaf0", borderRadius: height, height, overflow: "hidden" }}>
      <div style={{ width: `${value}%`, height: "100%", borderRadius: height, background: bg, transition: "width 0.4s" }} />
    </div>
  );
}

// Avatar
export function Avatar({ name, size = 34 }) {
  const colors = ["#0F0F83", "#4C4CCC", "#1FB15A", "#e53e3e", "#ed8936", "#3182ce", "#805AD5"];
  const n = name || "?";
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: colors[n.charCodeAt(0) % colors.length],
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "#fff", fontWeight: 600, fontSize: size * 0.42, flexShrink: 0,
    }}>
      {n[0]}
    </div>
  );
}

// People Pills
export function Pills({ people }) {
  if (!people?.length) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
      {people.map((p, i) => (
        <span key={i} style={{
          display: "inline-flex", alignItems: "center", gap: 3,
          padding: "2px 8px", borderRadius: 10,
          background: `${BRAND.navy}08`, border: `1px solid ${BRAND.navy}12`,
          fontSize: 11, fontWeight: 500, color: BRAND.navy,
        }}>
          <User size={9} />{p}
        </span>
      ))}
    </div>
  );
}

// Metric Card
export function MetricCard({ icon: Icon, label, value, sub, accent = BRAND.navy, trend }) {
  return (
    <div style={{
      background: BRAND.card, borderRadius: 14,
      padding: "16px 18px", border: `1px solid ${BRAND.border}`,
      flex: 1, minWidth: 120,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9,
          background: `${accent}12`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon size={15} color={accent} />
        </div>
        <span style={{ fontSize: 13, color: BRAND.sub, fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
        <div style={{ fontSize: 26, fontWeight: 700, color: BRAND.text }}>{value}</div>
        {trend && (
          <span style={{
            fontSize: 12, fontWeight: 600,
            color: trend > 0 ? BRAND.green : BRAND.danger,
            display: "flex", alignItems: "center",
          }}>
            {trend > 0 ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      {sub && <div style={{ fontSize: 12, color: BRAND.muted, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}
