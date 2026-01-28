import React, { useMemo, useState, useEffect } from "react";
import {
  Building2, Search, ChevronLeft, ChevronRight,

  ArrowUpDown, CheckCircle2, Calendar, Download

} from "lucide-react";

import verraData from "./data/verra_retirements.json";
import carData from "./data/climate_action_reserve_retirements.json";

/**
 * V7.4 – WITH CSV EXPORT
 * ✅ New: Export to CSV for Google Sheets
 * ✅ Fixed: Invalid JS quotes in fixEncoding
 * ✅ Unified isMissing() check across all helpers
 * ✅ Multi-pattern buyer extraction
 * ✅ Expanded encoding fixes for mojibake
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

const DATE_RANGES = [
  { value: "all", label: "All Time" },
  { value: "12m", label: "Last 12 Months" },
  { value: "24m", label: "Last 24 Months" },
  { value: "2025", label: "2025" },
  { value: "2024", label: "2024" },
  { value: "2023", label: "2023" },
];

// Noise filter - removes junk entries
const NOISE_FILTER = ["no owner", "anonymous", "anonymously", "contributing towards", "confidential"];

/* =========================
   2. HELPERS
========================= */

// Universal "missing value" check - reuse everywhere
const isMissing = (v) => {
  if (v === null || v === undefined) return true;
  const s = String(v).trim().toLowerCase();
  return s === "" || s === "none" || s === "null" || s === "n/a" || s === "nan" || s === "0";
};

// Invalid buyer check (uses isMissing + length check)
const isInvalidBuyer = (name) => {
  if (isMissing(name)) return true;
  return name.trim().length < 2;
};

// Noise check
const isNoiseBuyer = (name) => {
  if (!name) return true;
  const lower = name.toLowerCase();
  return NOISE_FILTER.some(noise => lower.includes(noise));
};

// Fix encoding issues (expanded for Verra mojibake)
const fixEncoding = (str = "") => str
  .replace(/\\u221a\\u00a3/g, "ã")
  .replace(/\\u221a\\u00b0/g, "á")
  .replace(/\\u221a\\u00df/g, "ç")
  .replace(/\\u201a\\u00c4\\u00ec/g, "í")
  .replace(/√©/g, "é")
  .replace(/√†/g, "à")
  .replace(/√£/g, "ã")
  .replace(/√≠/g, "í")
  .replace(/√≥/g, "ó")
  .replace(/√∫/g, "ú")
  .replace(/√±/g, "ñ")
  .replace(/‚Äì/g, "–")
  .replace(/‚Äô/g, "'")
  .replace(/‚Äú/g, '"')
  .replace(/‚Äù/g, '"')
  .replace(/¬†/g, " ")
  .replace(/Ã©/g, "é")
  .replace(/Ã¡/g, "á")
  .replace(/Ã³/g, "ó")
  .replace(/Ã±/g, "ñ")
  .replace(/"/g, "")
  .trim();

// Extract buyer from text - multiple patterns (Upgrade B)
const extractBuyer = (text = "") => {
  if (isMissing(text)) return null;

  // Pattern priority order
  const patterns = [
    /on behalf of\s+([^.,;]+)/i,           // "on behalf of Company X"
    /retired for\s+([^.,;]+)/i,            // "retired for Company X"
    /beneficiary:\s*([^.,;]+)/i,           // "beneficiary: Company X"
    /in the name of\s+([^.,;]+)/i,         // "in the name of Company X"
    /for the benefit of\s+([^.,;]+)/i,     // "for the benefit of Company X"
    /retirement by\s+([^.,;]+)/i,          // "retirement by Company X"
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const extracted = match[1].trim();
      if (!isMissing(extracted)) return fixEncoding(extracted);
    }
  }
  return null;
};

<<<<<<< HEAD
// Legacy alias for compatibility


=======
>>>>>>> 96325aa (export to CSV function)
// Format date for display: "Oct 27, 2025"
const formatFullDate = (dateStr) => {
  const d = parseDate(dateStr);
  if (!d) return "N/A";
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

// Parse date for filtering/sorting
const parseDate = (dateStr) => {
  if (isMissing(dateStr)) return null;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    if (/^\d{4}$/.test(dateStr)) return new Date(`${dateStr}-01-01`);
    return null;
  }
  return date;
};

// Get retirement date string
const getDateStr = (r) => {
  return r.retirement_date || r["Retirement/Cancellation Date"] || r.status_effective || r["Status Effective"] || "";
};

// Date range filter
const isWithinDateRange = (r, dateRange) => {
  if (dateRange === "all") return true;

  const dateStr = getDateStr(r);
  const retDate = parseDate(dateStr);
  if (!retDate) return dateRange === "all"; // Only include invalid dates when showing all time

  const now = new Date();

  if (dateRange === "12m") {
    const cutoff = new Date(now.getFullYear(), now.getMonth() - 12, now.getDate());
    return retDate >= cutoff;
  }
  if (dateRange === "24m") {
    const cutoff = new Date(now.getFullYear(), now.getMonth() - 24, now.getDate());
    return retDate >= cutoff;
  }
  if (/^\d{4}$/.test(dateRange)) {
    return retDate.getFullYear() === parseInt(dateRange);
  }
  return true;
};

// Normalize volume to number
const normalizeVolume = (value) => {
  if (typeof value === "number") return value || 0;
  if (typeof value === "string") return parseInt(value.replace(/,/g, ""), 10) || 0;
  return 0;
};

// Get buyer identity (handles both registries, both old/new field formats)
const getBuyerIdentity = (r, registry) => {
  if (registry === "verra") {
    const details = r.retirement_details || r["Retirement Details"] || "";
    const beneficiary = r.retirement_beneficiary || r["Retirement Beneficiary"] || "";
    // Combine fields for better extraction hit rate
    const combined = `${beneficiary} ${details}`;
    const extracted = extractBuyer(combined); // already fixEncoded
    // Return extracted buyer, or beneficiary if valid, otherwise empty for filtering
    if (extracted) return extracted;
    if (!isMissing(beneficiary)) return fixEncoding(beneficiary);
    return "";
  } else {
    // CAR
    const details = r.retirement_details || r["Retirement Reason Details"] || "";
    const holder = r.account_holder || r["Account Holder"] || "";
    const extracted = extractBuyer(details); // already fixEncoded
    if (extracted) return extracted;
    if (!isMissing(holder)) return fixEncoding(holder);
    return "";
  }
};

// Get volume (handles both registries)
const getVolume = (r, registry) => {
  if (registry === "verra") {
    return normalizeVolume(r.quantity_issued || r["Quantity Issued"]);
  }
  return normalizeVolume(r.quantity_tonnes || r["Quantity of Offset Credits"]);
};

// Get project info
const getProjectInfo = (r) => {
  return {
    name: r.project_name || r["Name"] || r["Project Name"] || "Unknown Project",
    id: r.project_id || r["ID"] || r["Project ID"] || "N/A",
    type: (r.project_type || r["Project Type"] || "Unknown").split("-")[0].split("(")[0].trim()
  };
};

/* =========================
   3. STYLES
========================= */
const styles = {
  wrap: { background: "#f8fafc", minHeight: "100vh", padding: "2rem", fontFamily: "Inter, system-ui, sans-serif", color: "#0f172a" },
  container: { maxWidth: 1400, margin: "0 auto" },
  header: { marginBottom: "2rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" },
  headerLeft: { display: "flex", alignItems: "center", gap: "1rem" },
  headerIcon: { background: "#16a34a", padding: 12, borderRadius: 12, color: "white", display: "flex" },
  headerStats: { display: "flex", gap: "2rem", textAlign: "right" },
  statLabel: { fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" },
  statValue: { fontSize: "1.5rem", fontWeight: 700 },
  card: { background: "white", borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", overflow: "hidden" },
  toolbar: { padding: "1rem 1.5rem", borderBottom: "1px solid #e2e8f0", display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" },
  btn: (active) => ({
    padding: "0.5rem 1rem", borderRadius: 6, border: "none",
    background: active ? "#0f172a" : "#f1f5f9",
    color: active ? "white" : "#64748b",
    fontWeight: 600, cursor: "pointer", transition: "all 0.15s",
    display: "flex", alignItems: "center", gap: 6
  }),
  select: { padding: "0.5rem 0.75rem", borderRadius: 6, border: "1px solid #cbd5e1", background: "white", fontSize: "0.875rem", cursor: "pointer" },
  searchWrap: { position: "relative" },
  searchIcon: { position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" },
  searchInput: { padding: "0.5rem 1rem 0.5rem 2.25rem", borderRadius: 6, border: "1px solid #cbd5e1", width: 220 },
  th: { padding: "0.875rem 1rem", textAlign: "left", fontSize: "0.7rem", textTransform: "uppercase", color: "#64748b", fontWeight: 600, letterSpacing: "0.05em", cursor: "pointer", userSelect: "none" },
  td: { padding: "1rem", borderTop: "1px solid #f1f5f9", fontSize: "0.875rem", verticalAlign: "top" },
  badge: (bg, color) => ({
    display: "inline-block", padding: "2px 8px", borderRadius: 4,
    fontSize: "0.65rem", fontWeight: 700, background: bg, color: color, marginRight: 4, marginTop: 4
  }),
  projectName: { fontSize: "0.875rem", fontWeight: 500, maxWidth: 250, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  projectId: { fontSize: "0.7rem", color: "#64748b", marginTop: 2 },
  pagination: { padding: "1rem", display: "flex", justifyContent: "center", alignItems: "center", gap: "1rem", borderTop: "1px solid #e2e8f0" },
  pageBtn: { border: "none", background: "none", cursor: "pointer", padding: 4, display: "flex" }
};

/* =========================
   4. COMPONENT
========================= */
const RegistryDashboard = () => {
  const [registry, setRegistry] = useState("verra");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState({ key: "totalVolume", dir: "desc" });
  const [viewMode, setViewMode] = useState("focus");
  const [dateRange, setDateRange] = useState("all");

  const PER_PAGE = 10;

  // Reset page when filters change
  useEffect(() => setPage(1), [registry, search, viewMode, dateRange]);

  // --- DATA PROCESSING ---
  const buyers = useMemo(() => {
    const raw = registry === "verra" ? verraData : (carData.retirements || carData || []);
    const map = {};

    raw.forEach((r) => {
      // 1. Date filter
      if (!isWithinDateRange(r, dateRange)) return;

      // 2. Extract buyer name
      const name = getBuyerIdentity(r, registry);

      // 3. Filter invalid/noise
      if (isInvalidBuyer(name) || isNoiseBuyer(name)) return;

      // 4. Get data
      const vol = getVolume(r, registry);
      const dateStr = getDateStr(r);
      const project = getProjectInfo(r);
      const key = name.toLowerCase();

      // 5. Aggregate
      if (!map[key]) {
        map[key] = {
          name,
          totalVolume: 0,
          retirementCount: 0,
          latestDate: dateStr,
          latestProject: project,
          projectTypes: new Set()
        };
      }

      map[key].totalVolume += vol;
      map[key].retirementCount += 1;
      map[key].projectTypes.add(project.type);

      // Track most recent transaction
      const existingDate = parseDate(map[key].latestDate);
      const newDate = parseDate(dateStr);
      if (newDate && (!existingDate || newDate > existingDate)) {
        map[key].latestDate = dateStr;
        map[key].latestProject = project;
      }
    });

    // 6. Build final array with tags
    return Object.values(map).map(c => {
      const tags = [];
      const latestYear = parseDate(c.latestDate)?.getFullYear() || 0;

      if (c.retirementCount >= 3) tags.push({ label: "Repeat Buyer", bg: "#f3e8ff", color: "#7c3aed" });
      if (c.totalVolume >= 50000) tags.push({ label: "High Volume", bg: "#ffedd5", color: "#ea580c" });
      if (latestYear >= SALES_RULES.RECENT_YEAR) tags.push({ label: "Active", bg: "#dcfce7", color: "#16a34a" });

      const isTier1 = c.totalVolume >= SALES_RULES.MIN_VOLUME || c.retirementCount >= SALES_RULES.MIN_EVENTS;

      return {
        ...c,
        totalVolume: Math.round(c.totalVolume),
        projectTypes: Array.from(c.projectTypes).slice(0, 3),
        tags,
        isTier1
      };
    });
  }, [registry, dateRange]);

  // --- FILTER & SORT ---
  const filtered = useMemo(() => {
    let data = buyers.filter(b => {
      const matchesSearch = !search ||
        b.name.toLowerCase().includes(search.toLowerCase()) ||
        b.projectTypes.some(t => t.toLowerCase().includes(search.toLowerCase()));
      const matchesView = viewMode === "all" || b.isTier1;
      return matchesSearch && matchesView;
    });

    // Sort
    data.sort((a, b) => {
      let valA = a[sort.key];
      let valB = b[sort.key];

      // Handle date sorting
      if (sort.key === "latestDate") {
        valA = parseDate(valA)?.getTime() || 0;
        valB = parseDate(valB)?.getTime() || 0;
      }

      return sort.dir === "asc" ? valA - valB : valB - valA;
    });

    return data;
  }, [buyers, search, viewMode, sort]);

  // --- PAGINATION ---
  const totalPages = Math.ceil(filtered.length / PER_PAGE) || 1;
  const rows = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // --- HANDLERS ---
  const handleSort = (key) => {
    setSort(prev => ({
      key,
      dir: prev.key === key && prev.dir === "desc" ? "asc" : "desc"
    }));
  };

  // --- EXPORT TO CSV ---
  const exportToCSV = () => {
    // CSV headers
    const headers = [
      "Company Name",
      "Total Volume (tCO2e)",
      "Retirement Events",
      "Last Activity",
      "Recent Project",
      "Project ID",
      "Project Types",
      "Tags",
      "Registry",
      "Date Filter"
    ];

    // Build rows from filtered data (all filtered, not just current page)
    const csvRows = filtered.map(b => [
      `"${b.name.replace(/"/g, '""')}"`, // Escape quotes in names
      b.totalVolume,
      b.retirementCount,
      `"${formatFullDate(b.latestDate)}"`, // Quote date (contains comma)
      `"${(b.latestProject?.name || "N/A").replace(/"/g, '""')}"`,
      b.latestProject?.id || "N/A",
      `"${b.projectTypes.join(", ")}"`,
      `"${b.tags.map(t => t.label).join(", ")}"`,
      registry === "verra" ? "Verra" : "Climate Action Reserve",
      DATE_RANGES.find(d => d.value === dateRange)?.label || dateRange
    ]);

    // Combine headers and rows
    const csvContent = [
      headers.join(","),
      ...csvRows.map(row => row.join(","))
    ].join("\n");

    // Create and trigger download (BOM fixes encoding in Google Sheets)
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `buyer-intelligence-${registry}-${dateRange}-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const SortIcon = ({ column }) => (
    <ArrowUpDown size={12} style={{ marginLeft: 4, opacity: sort.key === column ? 1 : 0.3 }} />
  );

  // --- RENDER ---
  return (
    <div style={styles.wrap}>
      <div style={styles.container}>

        {/* HEADER */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <div style={styles.headerIcon}><Building2 size={24} /></div>
            <div>
              <h1 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 800 }}>Buyer Intelligence</h1>
              <p style={{ margin: 0, color: "#64748b", fontSize: "0.875rem" }}>Sales-Ready Lead List</p>
            </div>
          </div>
          <div style={styles.headerStats}>
            <div>
              <div style={styles.statLabel}>{viewMode === "focus" ? "Qualified Leads" : "Total Buyers"}</div>
              <div style={styles.statValue}>{filtered.length.toLocaleString()}</div>
            </div>
            <div>
              <div style={styles.statLabel}>Volume (tCO₂e)</div>
              <div style={{ ...styles.statValue, color: "#16a34a" }}>
                {(filtered.reduce((a, c) => a + c.totalVolume, 0) / 1_000_000).toFixed(1)}M
              </div>
            </div>
            <div>
              <div style={styles.statLabel}>Source</div>
              <div style={styles.statValue}>{registry === "verra" ? "Verra" : "CAR"}</div>
            </div>
          </div>
        </div>

        {/* MAIN CARD */}
        <div style={styles.card}>

          {/* TOOLBAR */}
          <div style={styles.toolbar}>
            {/* Registry Toggle */}
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setRegistry("verra")} style={styles.btn(registry === "verra")}>Verra</button>
              <button onClick={() => setRegistry("car")} style={styles.btn(registry === "car")}>CAR</button>
            </div>

            {/* Date Range */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 8 }}>
              <Calendar size={16} color="#64748b" />
              <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} style={styles.select}>
                {DATE_RANGES.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>

            {/* View Mode & Search */}
            <div style={{ display: "flex", gap: 8, marginLeft: "auto", alignItems: "center" }}>
              <button onClick={() => setViewMode("focus")} style={styles.btn(viewMode === "focus")}>
                <CheckCircle2 size={14} /> Key Accounts
              </button>
              <button onClick={() => setViewMode("all")} style={styles.btn(viewMode === "all")}>
                Show All
              </button>
              <div style={styles.searchWrap}>
                <Search size={16} style={styles.searchIcon} />
                <input
                  placeholder="Search companies..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={styles.searchInput}
                />
              </div>
              <button
                onClick={exportToCSV}
                style={{
                  ...styles.btn(false),
                  background: "#16a34a",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  gap: 6
                }}
                title="Export to CSV for Google Sheets"
              >
                <Download size={14} /> Export
              </button>
            </div>
          </div>

          {/* TABLE */}
          <table width="100%" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                <th style={styles.th}>Buyer Entity</th>
                <th style={styles.th}>Recent Project</th>
                <th style={{ ...styles.th, textAlign: "right" }} onClick={() => handleSort("totalVolume")}>
                  Volume <SortIcon column="totalVolume" />
                </th>
                <th style={{ ...styles.th, textAlign: "center" }} onClick={() => handleSort("retirementCount")}>
                  Events <SortIcon column="retirementCount" />
                </th>
                <th style={styles.th} onClick={() => handleSort("latestDate")}>
                  Last Activity <SortIcon column="latestDate" />
                </th>
                <th style={styles.th}>Interests</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>
                    No buyers found for the selected filters.
                  </td>
                </tr>
              ) : (
                rows.map(c => (
                  <tr key={c.name}>
                    <td style={styles.td}>
                      <div style={{ fontWeight: 700 }}>{c.name}</div>
                      <div style={{ marginTop: 4 }}>
                        {c.tags.map(t => (
                          <span key={t.label} style={styles.badge(t.bg, t.color)}>{t.label}</span>
                        ))}
                      </div>
                    </td>
                    <td style={styles.td}>
                      {c.latestProject.name === "Unknown Project" ? (
                        <div style={{ color: "#94a3b8", fontSize: "0.8rem", fontStyle: "italic" }}>
                          Project data not available
                        </div>
                      ) : (
                        <>
                          <div style={styles.projectName} title={c.latestProject.name}>{c.latestProject.name}</div>
                          <div style={styles.projectId}>ID: {c.latestProject.id}</div>
                        </>
                      )}
                    </td>
                    <td style={{ ...styles.td, textAlign: "right", fontWeight: 600, fontFamily: "monospace" }}>
                      {c.totalVolume.toLocaleString()}
                    </td>
                    <td style={{ ...styles.td, textAlign: "center" }}>{c.retirementCount}</td>
                    <td style={{ ...styles.td, color: "#64748b" }}>{formatFullDate(c.latestDate)}</td>
                    <td style={styles.td}>
                      {c.projectTypes.map(t => (
                        <span key={t} style={styles.badge("#f1f5f9", "#475569")}>{t}</span>
                      ))}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* PAGINATION */}
          <div style={styles.pagination}>
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              style={{ ...styles.pageBtn, opacity: page === 1 ? 0.3 : 1 }}
            >
              <ChevronLeft size={20} />
            </button>
            <span style={{ fontSize: "0.875rem", color: "#64748b" }}>
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
              style={{ ...styles.pageBtn, opacity: page === totalPages ? 0.3 : 1 }}
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegistryDashboard;
