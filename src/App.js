import React, { useMemo, useState, useEffect } from "react";
import { 
  Building2, Search, ChevronLeft, ChevronRight, 
  ArrowUpDown, LayoutList, Leaf, BarChart3, CheckCircle2 
} from "lucide-react";

import verraData from "./data/verra_retirements.json";
import carData from "./data/climate_action_reserve_retirements.json";

/**
 * V5.1 – PRODUCTION READY (With "None" Fix)
 * Changes:
 * 1. Added isInvalidBuyer() helper to surgically remove "None" sentinel values.
 * 2. Applied strict filtering before aggregation.
 */

/* =========================
   1. CONFIGURATION
========================= */
const CURRENT_YEAR = new Date().getFullYear();

const SALES_RULES = {
  MIN_VOLUME: 1000,      
  MIN_EVENTS: 2,         
  RECENT_YEAR: CURRENT_YEAR - 1 
};

// Partial match filters (keep these for sentences)
const NOISE_FILTER = ["no owner", "anonymous", "anonymously", "contributing towards"];

/* =========================
   2. DATA HELPERS (PURE)
========================= */

// NEW: Surgical check for invalid sentinel values
const isInvalidBuyer = (name) => {
  if (!name) return true;
  const n = name.trim().toLowerCase();
  return (
    n === "none" || 
    n === "null" || 
    n === "n/a" ||
    n === "0"
  );
};

const fixEncoding = (str = "") => str
  .replace(/\\u221a\\u00a3/g, "ã").replace(/\\u221a\\u00b0/g, "á")
  .replace(/\\u221a\\u00df/g, "ç").replace(/\\u201a\\u00c4\\u00ec/g, "í")
  .replace(/"/g, "").trim();

const extractOnBehalf = (text = "") => {
  const match = text.match(/on behalf of\s+([^.,;]+)/i);
  return match ? match[1].trim() : null;
};

const normalizeVolume = (value) => 
  typeof value === "string" ? parseInt(value.replace(/,/g, ""), 10) || 0 : Number(value) || 0;

const getVerraIdentity = (r) => {
  const text = `${r.retirement_beneficiary || ""} ${r.retirement_details || ""}`;
  return fixEncoding(extractOnBehalf(text) || r.retirement_beneficiary || "");
};

const getCARIdentity = (r) => {
  const text = r.retirement_details || r.buyer_contact_information || "";
  return extractOnBehalf(text) || r.account_holder || "";
};

/* =========================
   3. LOGIC & COMPONENT
========================= */
const RegistryDashboard = () => {
  const [registry, setRegistry] = useState("verra");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState({ key: "totalVolume", dir: "desc" });
  const [viewMode, setViewMode] = useState("focus"); 

  const PER_PAGE = 10;

  useEffect(() => setPage(1), [registry, search, viewMode]);

  // --- PROCESSING ---
  const buyers = useMemo(() => {
    const raw = registry === "verra" ? verraData : carData.retirements || [];
    const map = {};

    raw.forEach((r) => {
      // 1. Extract Name
      const name = registry === "verra" ? getVerraIdentity(r) : getCARIdentity(r);
      
      // 2. SAFETY FILTER (The Fix)
      if (
        isInvalidBuyer(name) || // Drops "None", "N/A"
        name.length < 2 || 
        NOISE_FILTER.some(t => name.toLowerCase().includes(t))
      ) {
        return;
      }

      // 3. Process Logic
      const vol = registry === "verra" ? normalizeVolume(r.quantity_issued) : normalizeVolume(r.quantity_tonnes);
      const year = String(r.retirement_date || r.vintage_year || "").slice(0, 4);
      const type = (r.project_type || "Unknown").split("-")[0].split("(")[0].trim();
      const key = name.toLowerCase();

      if (!map[key]) {
        map[key] = {
          name, 
          totalVolume: 0,
          retirementCount: 0,
          lastYear: parseInt(year) || 0,
          projectTypes: new Set()
        };
      }
      map[key].totalVolume += vol;
      map[key].retirementCount += 1;
      if (parseInt(year) > map[key].lastYear) map[key].lastYear = parseInt(year);
      map[key].projectTypes.add(type);
    });

    return Object.values(map).map(c => {
      const tags = [];
      if (c.retirementCount >= 3) tags.push({ label: "Repeat Buyer", bg: "#f3e8ff", color: "#7c3aed" });
      else if (c.totalVolume >= 50000) tags.push({ label: "High Volume", bg: "#ffedd5", color: "#ea580c" });
      else if (c.lastYear >= SALES_RULES.RECENT_YEAR) tags.push({ label: "Active", bg: "#dcfce7", color: "#16a34a" });

      const isTier1 = c.totalVolume >= SALES_RULES.MIN_VOLUME || c.retirementCount >= SALES_RULES.MIN_EVENTS;

      return {
        ...c,
        totalVolume: Math.round(c.totalVolume),
        projectTypes: Array.from(c.projectTypes).slice(0, 3),
        tags,
        isTier1
      };
    });
  }, [registry]);

  // --- FILTER & SORT ---
  const filtered = useMemo(() => {
    let data = buyers.filter(b => 
      b.name.toLowerCase().includes(search.toLowerCase()) || 
      b.projectTypes.some(t => t.toLowerCase().includes(search.toLowerCase()))
    );

    if (viewMode === "focus") data = data.filter(b => b.isTier1);

    data.sort((a, b) => {
      const valA = a[sort.key];
      const valB = b[sort.key];
      return sort.dir === "asc" ? valA - valB : valB - valA;
    });
    return data;
  }, [buyers, search, viewMode, sort]);

  // Pagination
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const rows = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const handleSort = (key) => setSort({ key, dir: sort.key === key && sort.dir === "desc" ? "asc" : "desc" });

  // --- STYLES ---
  const s = {
    wrap: { background: "#f8fafc", minHeight: "100vh", padding: "2rem", fontFamily: "system-ui, -apple-system, sans-serif", color: "#0f172a" },
    cont: { maxWidth: 1200, margin: "0 auto" },
    header: { marginBottom: "2rem", display: "flex", alignItems: "center", gap: "1rem" },
    card: { background: "white", borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", overflow: "hidden" },
    statGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "2rem" },
    stat: { background: "white", padding: "1.5rem", borderRadius: 12, border: "1px solid #e2e8f0" },
    toolbar: { padding: "1.5rem", borderBottom: "1px solid #e2e8f0", display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" },
    th: { textAlign: "left", padding: "1rem", fontSize: "0.75rem", textTransform: "uppercase", color: "#64748b", fontWeight: 600, cursor: "pointer" },
    td: { padding: "1rem", borderBottom: "1px solid #f1f5f9", fontSize: "0.875rem" },
    badge: (bg, col) => ({ background: bg, color: col, padding: "2px 8px", borderRadius: 99, fontSize: "0.7rem", fontWeight: 600, display: "inline-block", marginRight: 4 }),
    btn: (active) => ({ padding: "0.5rem 1rem", borderRadius: 6, border: "none", background: active ? "#0f172a" : "#f1f5f9", color: active ? "white" : "#64748b", fontWeight: 600, cursor: "pointer", display: 'flex', alignItems: 'center', gap: 6 })
  };

  return (
    <div style={s.wrap}>
      <div style={s.cont}>
        {/* HEADER */}
        <div style={s.header}>
          <div style={{ background: "#16a34a", padding: 10, borderRadius: 10, color: "white" }}><Building2 /></div>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.8rem" }}>Buyer Intelligence</h1>
            <p style={{ margin: 0, color: "#64748b" }}>Sales-Ready Lead List</p>
          </div>
        </div>

        {/* METRICS */}
        <div style={s.statGrid}>
          <div style={s.stat}>
            <div style={{ color: "#64748b", marginBottom: 5, display: "flex", gap: 6 }}><LayoutList size={18}/> {viewMode === "focus" ? "Qualified Leads" : "Total Rows"}</div>
            <div style={{ fontSize: "2rem", fontWeight: 700 }}>{filtered.length}</div>
          </div>
          <div style={s.stat}>
            <div style={{ color: "#64748b", marginBottom: 5, display: "flex", gap: 6 }}><Leaf size={18}/> Volume (tCO2e)</div>
            <div style={{ fontSize: "2rem", fontWeight: 700, color: "#16a34a" }}>{(filtered.reduce((a,c)=>a+c.totalVolume,0)/1000000).toFixed(1)}M</div>
          </div>
          <div style={s.stat}>
            <div style={{ color: "#64748b", marginBottom: 5, display: "flex", gap: 6 }}><BarChart3 size={18}/> Source</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 600 }}>{registry === "verra" ? "Verra" : "CAR"}</div>
          </div>
        </div>

        {/* MAIN UI */}
        <div style={s.card}>
          <div style={s.toolbar}>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setRegistry("verra")} style={s.btn(registry === "verra")}>Verra</button>
              <button onClick={() => setRegistry("car")} style={s.btn(registry === "car")}>CAR</button>
            </div>
            <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
              <button onClick={() => setViewMode("focus")} style={s.btn(viewMode === "focus")}><CheckCircle2 size={14}/> Key Accounts</button>
              <button onClick={() => setViewMode("all")} style={s.btn(viewMode === "all")}>Show All</button>
            </div>
            <div style={{ position: "relative" }}>
              <Search size={16} style={{ position: "absolute", left: 10, top: 10, color: "#94a3b8" }}/>
              <input 
                placeholder="Search companies..." 
                value={search} onChange={e => setSearch(e.target.value)}
                style={{ padding: "0.5rem 1rem 0.5rem 2.2rem", borderRadius: 6, border: "1px solid #cbd5e1", width: 200 }} 
              />
            </div>
          </div>

          <table width="100%" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                <th style={s.th}>Company</th>
                <th style={s.th}>Status</th>
                <th style={{...s.th, textAlign:"right"}} onClick={() => handleSort("totalVolume")}>Volume <ArrowUpDown size={12}/></th>
                <th style={{...s.th, textAlign:"center"}} onClick={() => handleSort("retirementCount")}>Events <ArrowUpDown size={12}/></th>
                <th style={s.th}>Last Activity</th>
                <th style={s.th}>Interests</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(c => (
                <tr key={c.name}>
                  <td style={{...s.td, fontWeight: 600}}>{c.name}</td>
                  <td style={s.td}>
                    {c.tags.map(t => <span key={t.label} style={s.badge(t.bg, t.color)}>{t.label}</span>)}
                  </td>
                  <td style={{...s.td, textAlign:"right", fontFamily:"monospace"}}>{c.totalVolume.toLocaleString()}</td>
                  <td style={{...s.td, textAlign:"center"}}>{c.retirementCount}</td>
                  <td style={{...s.td, color: "#64748b"}}>{c.lastYear}</td>
                  <td style={s.td}>
                    {c.projectTypes.map(t => <span key={t} style={s.badge("#f1f5f9", "#475569")}>{t}</span>)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ padding: "1rem", display: "flex", justifyContent: "center", gap: "1rem", borderTop: "1px solid #e2e8f0" }}>
             <button disabled={page === 1} onClick={() => setPage(p => p - 1)} style={{ border: "none", background: "none", cursor: "pointer" }}><ChevronLeft/></button>
             <span style={{ fontSize: "0.9rem", color: "#64748b", alignSelf:"center" }}>Page {page} of {totalPages}</span>
             <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} style={{ border: "none", background: "none", cursor: "pointer" }}><ChevronRight/></button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegistryDashboard;