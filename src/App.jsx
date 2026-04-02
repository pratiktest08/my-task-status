import { useState, useEffect, useMemo, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Area, AreaChart,
} from "recharts";
import {
  LayoutDashboard, CheckSquare, Users, Target, Database, Brain,
  Zap, LogOut, Search, ChevronRight, ChevronDown, RefreshCw,
  Wifi, WifiOff, Loader, AlertTriangle, Clock, Award,
  TrendingUp, Moon, User, Filter,
} from "lucide-react";

import { BRAND, PIE_COLORS, EMPLOYEE_TABS, SHEET_ID, REFRESH_INTERVAL, TASKS_PER_PAGE } from "./config";
import { fetchAllSheetData } from "./sheets";
import { Badge, Priority, ProgressBar, Avatar, Pills, MetricCard } from "./components";

export default function App() {
  // No login — open directly with manager view
  const [currentEmp, setCurrentEmp] = useState(null); // null = manager, string = employee ID
  const [sec, setSec] = useState("dashboard");
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastFetch, setLastFetch] = useState(null);
  const [fetchStatus, setFetchStatus] = useState({});
  const [search, setSearch] = useState("");
  const [taskView, setTaskView] = useState("all");
  const [selEmp, setSelEmp] = useState(null);
  const [pg, setPg] = useState(0);
  const [sidebar, setSidebar] = useState(true);
  const [expandedTask, setExpandedTask] = useState(null);
  const [sortBy, setSortBy] = useState("date");
  const [timeRange, setTimeRange] = useState("all");
  const [showUserPicker, setShowUserPicker] = useState(false);

  const isManager = !currentEmp;
  const empObj = currentEmp ? EMPLOYEE_TABS.find(e => e.id === currentEmp) : null;

  // ===== FETCH ALL DATA =====
  const doFetch = useCallback(async () => {
    setLoading(true);
    const result = await fetchAllSheetData();
    setTasks(result.tasks);
    setFetchStatus(result.status);
    setLastFetch(new Date());
    setLoading(false);
  }, []);

  useEffect(() => { doFetch(); }, [doFetch]);
  useEffect(() => {
    const iv = setInterval(doFetch, REFRESH_INTERVAL);
    return () => clearInterval(iv);
  }, [doFetch]);

  // ===== COMPUTED DATA =====
  const myTasks = useMemo(() => {
    if (isManager && !selEmp) return tasks;
    const empId = selEmp || currentEmp;
    const empName = EMPLOYEE_TABS.find(e => e.id === empId)?.name?.toLowerCase();
    return tasks.filter(t => t.assignee === empId || t.owner?.toLowerCase() === empName);
  }, [tasks, isManager, currentEmp, selEmp]);

  const filtered = useMemo(() => {
    let t = [...myTasks];
    if (taskView === "pending") t = t.filter(tk => tk.status !== "Completed");
    else if (taskView === "completed") t = t.filter(tk => tk.status === "Completed");
    if (search) t = t.filter(tk =>
      [tk.title, tk.project, tk.owner, tk.description, tk.platform]
        .some(f => (f || "").toLowerCase().includes(search.toLowerCase()))
    );
    if (timeRange !== "all") {
      const now = new Date();
      const cut = new Date();
      if (timeRange === "week") cut.setDate(now.getDate() - 7);
      else if (timeRange === "month") cut.setMonth(now.getMonth() - 1);
      else if (timeRange === "quarter") cut.setMonth(now.getMonth() - 3);
      else if (timeRange === "year") cut.setFullYear(now.getFullYear() - 1);
      t = t.filter(tk => {
        const d = new Date(tk.dueDate || tk.received);
        return !isNaN(d) && d >= cut;
      });
    }
    const sorters = {
      date: (a, b) => new Date(b.dueDate || b.received || 0) - new Date(a.dueDate || a.received || 0),
      priority: (a, b) => {
        const o = { Critical: 0, High: 1, Medium: 2, Low: 3 };
        return (o[a.priority] || 3) - (o[b.priority] || 3);
      },
      project: (a, b) => (a.project || "").localeCompare(b.project || ""),
      status: (a, b) => (a.status || "").localeCompare(b.status || ""),
      owner: (a, b) => (a.owner || "").localeCompare(b.owner || ""),
    };
    t.sort(sorters[sortBy] || sorters.date);
    return t;
  }, [myTasks, search, taskView, sortBy, timeRange]);

  const paged = useMemo(() => filtered.slice(pg * TASKS_PER_PAGE, (pg + 1) * TASKS_PER_PAGE), [filtered, pg]);
  const totalPages = Math.ceil(filtered.length / TASKS_PER_PAGE);

  const stats = useMemo(() => ({
    total: myTasks.length,
    done: myTasks.filter(x => x.status === "Completed").length,
    pend: myTasks.filter(x => x.status !== "Completed").length,
    crit: myTasks.filter(x => x.critical && x.status !== "Completed").length,
  }), [myTasks]);

  // Chart data
  const statusPie = useMemo(() => {
    const s = {};
    filtered.forEach(t => { s[t.status] = (s[t.status] || 0) + 1; });
    return Object.entries(s).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  const projPie = useMemo(() => {
    const p = {};
    filtered.forEach(t => { const k = t.platform || t.project || "Other"; p[k] = (p[k] || 0) + 1; });
    return Object.entries(p).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  const ownerChart = useMemo(() => {
    const o = {};
    filtered.forEach(t => { if (t.owner) o[t.owner] = (o[t.owner] || 0) + 1; });
    return Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, count]) => ({ name, count }));
  }, [filtered]);

  const monthlyChart = useMemo(() => {
    const m = {};
    filtered.forEach(t => {
      const raw = t.received || t.dueDate;
      if (!raw) return;
      const d = new Date(raw);
      if (isNaN(d)) return;
      const k = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      m[k] = (m[k] || 0) + 1;
    });
    return Object.entries(m).map(([month, count]) => ({ month, count }));
  }, [filtered]);

  const totalFetched = Object.values(fetchStatus).reduce((s, v) => s + (v.count || 0), 0);
  const tabsOk = Object.values(fetchStatus).filter(v => v.ok).length;

  // ===== LOADING SCREEN =====
  if (loading && tasks.length === 0) return (
    <div style={{ minHeight: "100vh", background: BRAND.bg, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 20 }}>
      <div style={{ width: 68, height: 68, borderRadius: 18, background: `${BRAND.navy}12`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader size={32} color={BRAND.navy} className="spinning" />
      </div>
      <div style={{ textAlign: "center" }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: BRAND.navy, margin: "0 0 6px" }}>Fetching live data...</h2>
        <p style={{ fontSize: 15, color: BRAND.sub, margin: 0 }}>Connecting to {EMPLOYEE_TABS.length} employee sheets + Status-Complete</p>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 7, justifyContent: "center", maxWidth: 440 }}>
        {EMPLOYEE_TABS.map(e => (
          <span key={e.id} style={{ padding: "5px 12px", borderRadius: 8, background: BRAND.card, border: `1px solid ${BRAND.border}`, fontSize: 13, color: BRAND.sub }}>{e.name}</span>
        ))}
        <span style={{ padding: "5px 12px", borderRadius: 8, background: BRAND.okBg, border: `1px solid ${BRAND.green}30`, fontSize: 13, color: BRAND.green, fontWeight: 600 }}>Status-Complete</span>
      </div>
    </div>
  );

  // ===== NAV ITEMS =====
  const navs = [
    { id: "dashboard", l: "Dashboard", ic: LayoutDashboard },
    { id: "tasks", l: currentEmp ? "My tasks" : "All tasks", ic: CheckSquare },
    { id: "team", l: "Team", ic: Users },
    { id: "focus", l: "Focus mode", ic: Target },
    { id: "data", l: "Data source", ic: Database },
    { id: "insights", l: "AI insights", ic: Brain },
  ];

  // ===== CONNECTION BAR =====
  const ConnBar = () => (
    <div style={{
      display: "flex", alignItems: "center", gap: 8, padding: "8px 14px",
      background: totalFetched > 0 ? BRAND.okBg : BRAND.warnBg,
      borderRadius: 10, border: `1px solid ${totalFetched > 0 ? BRAND.green : BRAND.warn}25`,
      marginBottom: 16,
    }}>
      {totalFetched > 0 ? <Wifi size={14} color={BRAND.green} /> : <WifiOff size={14} color={BRAND.warn} />}
      <span style={{ fontSize: 13, fontWeight: 600, color: totalFetched > 0 ? BRAND.green : BRAND.warn }}>
        {totalFetched > 0 ? "Live" : "Offline"}
      </span>
      <span style={{ fontSize: 13, color: BRAND.sub }}>{totalFetched} rows · {tabsOk} tabs</span>
      {lastFetch && <span style={{ fontSize: 12, color: BRAND.muted, marginLeft: "auto" }}>Updated {lastFetch.toLocaleTimeString()}</span>}
      <button onClick={doFetch} disabled={loading} style={{
        display: "flex", alignItems: "center", gap: 4,
        padding: "5px 12px", borderRadius: 7,
        border: `1px solid ${BRAND.border}`, background: BRAND.card,
        fontSize: 13, fontWeight: 600, color: BRAND.navy,
      }}>
        <RefreshCw size={13} className={loading ? "spinning" : ""} />
        {loading ? "Fetching..." : "Refresh"}
      </button>
    </div>
  );

  // ================================================================
  //                         PAGES
  // ================================================================

  // ===== DASHBOARD =====
  const Dashboard = () => (
    <div className="fade-in">
      <ConnBar />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        <MetricCard icon={CheckSquare} label="Total tasks" value={stats.total} sub="From Google Sheets" />
        <MetricCard icon={Award} label="Completed" value={stats.done} sub={`${stats.total ? Math.round(stats.done / stats.total * 100) : 0}% rate`} accent={BRAND.green} />
        <MetricCard icon={Clock} label="Active" value={stats.pend} accent={BRAND.warn} />
        <MetricCard icon={AlertTriangle} label="Critical" value={stats.crit} accent={BRAND.danger} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <div style={{ background: BRAND.card, borderRadius: 14, padding: 20, border: `1px solid ${BRAND.border}` }}>
          <h4 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 12px" }}>By status</h4>
          <ResponsiveContainer width="100%" height={190}>
            <PieChart><Pie data={statusPie} cx="50%" cy="50%" innerRadius={48} outerRadius={74} paddingAngle={2} dataKey="value">
              {statusPie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
            </Pie><Tooltip contentStyle={{ borderRadius: 8, fontSize: 13 }} /></PieChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", marginTop: 8 }}>
            {statusPie.map((d, i) => (
              <span key={i} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: BRAND.sub }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: PIE_COLORS[i % PIE_COLORS.length] }} />
                {d.name} ({d.value})
              </span>
            ))}
          </div>
        </div>
        <div style={{ background: BRAND.card, borderRadius: 14, padding: 20, border: `1px solid ${BRAND.border}` }}>
          <h4 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 12px" }}>By platform</h4>
          <ResponsiveContainer width="100%" height={190}>
            <PieChart><Pie data={projPie} cx="50%" cy="50%" innerRadius={48} outerRadius={74} paddingAngle={1} dataKey="value">
              {projPie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
            </Pie><Tooltip contentStyle={{ borderRadius: 8, fontSize: 13 }} /></PieChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 8 }}>
            {projPie.slice(0, 6).map((d, i) => (
              <span key={i} style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, color: BRAND.sub }}>
                <span style={{ width: 7, height: 7, borderRadius: 2, background: PIE_COLORS[i] }} />
                {d.name?.length > 16 ? d.name.slice(0, 16) + "…" : d.name}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <div style={{ background: BRAND.card, borderRadius: 14, padding: 20, border: `1px solid ${BRAND.border}` }}>
          <h4 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 12px" }}>Timeline</h4>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={monthlyChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: BRAND.muted }} axisLine={false} tickLine={false} interval={1} />
              <YAxis tick={{ fontSize: 11, fill: BRAND.muted }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 13 }} />
              <Bar dataKey="count" fill={BRAND.green} radius={[4, 4, 0, 0]} name="Tasks" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ background: BRAND.card, borderRadius: 14, padding: 20, border: `1px solid ${BRAND.border}` }}>
          <h4 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 12px" }}>By owner</h4>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={ownerChart} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 11, fill: BRAND.muted }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: BRAND.sub }} width={70} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 13 }} />
              <Bar dataKey="count" fill={BRAND.purple} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );

  // ===== TASKS PAGE =====
  const TasksPage = () => {
    const doneC = myTasks.filter(t => t.status === "Completed").length;
    const pendC = myTasks.filter(t => t.status !== "Completed").length;
    return (
      <div className="fade-in">
        <ConnBar />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 18 }}>
          <MetricCard icon={CheckSquare} label="Total" value={stats.total} />
          <MetricCard icon={Award} label="Done" value={stats.done} accent={BRAND.green} />
          <MetricCard icon={Clock} label="Active" value={stats.pend} accent={BRAND.warn} />
          <MetricCard icon={AlertTriangle} label="Critical" value={stats.crit} accent={BRAND.danger} />
        </div>

        {/* Charts Row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 18 }}>
          <div style={{ background: BRAND.card, borderRadius: 14, padding: 16, border: `1px solid ${BRAND.border}` }}>
            <h4 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 10px" }}>Status breakdown</h4>
            <ResponsiveContainer width="100%" height={150}>
              <PieChart><Pie data={statusPie} cx="50%" cy="50%" innerRadius={38} outerRadius={58} paddingAngle={2} dataKey="value">
                {statusPie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie><Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} /></PieChart>
            </ResponsiveContainer>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
              {statusPie.map((d, i) => (
                <span key={i} style={{ fontSize: 11, color: BRAND.sub, display: "flex", alignItems: "center", gap: 3 }}>
                  <span style={{ width: 7, height: 7, borderRadius: 2, background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  {d.name} ({d.value})
                </span>
              ))}
            </div>
          </div>
          <div style={{ background: BRAND.card, borderRadius: 14, padding: 16, border: `1px solid ${BRAND.border}` }}>
            <h4 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 10px" }}>Platform distribution</h4>
            <ResponsiveContainer width="100%" height={150}>
              <PieChart><Pie data={projPie.slice(0, 6)} cx="50%" cy="50%" innerRadius={38} outerRadius={58} paddingAngle={1} dataKey="value">
                {projPie.slice(0, 6).map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie><Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} /></PieChart>
            </ResponsiveContainer>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, justifyContent: "center" }}>
              {projPie.slice(0, 5).map((d, i) => (
                <span key={i} style={{ fontSize: 10, color: BRAND.sub, display: "flex", alignItems: "center", gap: 3 }}>
                  <span style={{ width: 6, height: 6, borderRadius: 2, background: PIE_COLORS[i] }} />{d.name?.slice(0, 15)}
                </span>
              ))}
            </div>
          </div>
          <div style={{ background: BRAND.card, borderRadius: 14, padding: 16, border: `1px solid ${BRAND.border}` }}>
            <h4 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 10px" }}>Top owners</h4>
            <ResponsiveContainer width="100%" height={165}>
              <BarChart data={ownerChart.slice(0, 6)} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 11, fill: BRAND.muted }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: BRAND.sub }} width={60} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="count" fill={BRAND.purple} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          <div style={{ display: "flex", borderRadius: 9, border: `1px solid ${BRAND.border}`, overflow: "hidden" }}>
            {["all", "pending", "completed"].map(v => (
              <button key={v} onClick={() => { setTaskView(v); setPg(0); }} style={{
                padding: "8px 14px", border: "none",
                background: taskView === v ? BRAND.navy : "transparent",
                color: taskView === v ? "#fff" : BRAND.sub,
                fontSize: 13, fontWeight: 600,
              }}>
                {v === "all" ? `All (${stats.total})` : v === "pending" ? `Active (${pendC})` : `Done (${doneC})`}
              </button>
            ))}
          </div>
          <div style={{ flex: 1, minWidth: 160, position: "relative" }}>
            <Search size={15} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: BRAND.muted }} />
            <input value={search} onChange={e => { setSearch(e.target.value); setPg(0); }} placeholder="Search tasks, projects, people..."
              style={{ width: "100%", padding: "8px 13px 8px 32px", borderRadius: 9, border: `1px solid ${BRAND.border}`, fontSize: 13, background: BRAND.card, boxSizing: "border-box" }} />
          </div>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${BRAND.border}`, fontSize: 13, background: BRAND.card }}>
            <option value="date">Sort: Date</option><option value="priority">Sort: Priority</option>
            <option value="project">Sort: Project</option><option value="status">Sort: Status</option>
            <option value="owner">Sort: Owner</option>
          </select>
          <select value={timeRange} onChange={e => { setTimeRange(e.target.value); setPg(0); }} style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${BRAND.border}`, fontSize: 13, background: BRAND.card }}>
            <option value="all">All time</option><option value="week">This week</option>
            <option value="month">This month</option><option value="quarter">This quarter</option>
            <option value="year">This year</option>
          </select>
          {isManager && (
            <select value={selEmp || ""} onChange={e => { setSelEmp(e.target.value || null); setPg(0); }} style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${BRAND.border}`, fontSize: 13, background: BRAND.card }}>
              <option value="">All team</option>
              {EMPLOYEE_TABS.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          )}
        </div>
        <div style={{ fontSize: 13, color: BRAND.muted, marginBottom: 10 }}>
          Showing {filtered.length} tasks · sorted by {sortBy}{timeRange !== "all" ? ` · ${timeRange}` : ""}
        </div>

        {/* Task List */}
        <div style={{ background: BRAND.card, borderRadius: 14, border: `1px solid ${BRAND.border}`, overflow: "hidden" }}>
          {paged.map(t => {
            const open = expandedTask === t.id;
            return (
              <div key={t.id} style={{ borderBottom: `1px solid ${BRAND.border}` }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isManager ? "2.5fr 85px 85px 75px 24px" : "2.8fr 85px 75px 24px",
                    alignItems: "center", padding: "12px 18px", cursor: "pointer",
                    transition: "background 0.1s",
                  }}
                  onClick={() => setExpandedTask(open ? null : t.id)}
                  onMouseEnter={e => e.currentTarget.style.background = "#fafbfe"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: BRAND.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {t.title}
                    </div>
                    <div style={{ fontSize: 12, color: BRAND.muted, display: "flex", gap: 6, marginTop: 2 }}>
                      <span>{t.platform || t.project}</span>
                      {t.owner && <><span>·</span><span style={{ color: BRAND.navy, fontWeight: 500 }}>{t.owner}</span></>}
                      <span>· {t.received}</span>
                    </div>
                  </div>
                  {isManager && <span style={{ fontSize: 13, color: BRAND.sub, fontWeight: 500 }}>{t.owner}</span>}
                  <Badge status={t.status} />
                  <Priority priority={t.priority} />
                  <ChevronRight size={15} color={BRAND.muted} style={{ transform: open ? "rotate(90deg)" : "none", transition: "0.2s" }} />
                </div>
                {open && (
                  <div style={{ padding: "0 18px 16px", background: "#fafbfe" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 14, marginBottom: 12 }}>
                      <div>
                        <div style={{ fontWeight: 600, color: BRAND.sub, fontSize: 13, marginBottom: 4 }}>Description</div>
                        <div style={{ fontSize: 14, color: BRAND.text, lineHeight: 1.6 }}>{t.description || "No description available"}</div>
                      </div>
                      <div style={{ fontSize: 13 }}>
                        {[
                          ["Sr No", t.srNo], ["Platform", t.platform], ["Received", t.received],
                          ["Completed", t.completeDate || "—"], ["Dev UAT", t.devUAT || "—"], ["Testing", t.testDate || "—"],
                        ].map(([label, val]) => (
                          <div key={label} style={{ marginBottom: 5 }}>
                            <span style={{ color: BRAND.sub, fontWeight: 600 }}>{label}:</span>{" "}
                            <span style={{ color: BRAND.text }}>{val}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: BRAND.sub, fontSize: 13, marginBottom: 4 }}>Owner</div>
                      <Pills people={[t.owner].filter(Boolean)} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div style={{ padding: 40, textAlign: "center", color: BRAND.muted, fontSize: 15 }}>
              {loading ? "Fetching data from Google Sheets..." : "No tasks found matching your filters"}
            </div>
          )}
          {totalPages > 1 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 18px", borderTop: `1px solid ${BRAND.border}`, background: "#fafbfe" }}>
              <span style={{ fontSize: 13, color: BRAND.sub }}>{pg * TASKS_PER_PAGE + 1}–{Math.min((pg + 1) * TASKS_PER_PAGE, filtered.length)} of {filtered.length}</span>
              <div style={{ display: "flex", gap: 5 }}>
                <button onClick={() => setPg(Math.max(0, pg - 1))} disabled={pg === 0} style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${BRAND.border}`, background: "transparent", fontSize: 13 }}>Prev</button>
                <span style={{ fontSize: 13, color: BRAND.sub, padding: "5px 8px" }}>{pg + 1} / {totalPages}</span>
                <button onClick={() => setPg(Math.min(totalPages - 1, pg + 1))} disabled={pg >= totalPages - 1} style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${BRAND.border}`, background: "transparent", fontSize: 13 }}>Next</button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ===== TEAM =====
  const TeamPage = () => (
    <div className="fade-in">
      <ConnBar />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 14 }}>
        {EMPLOYEE_TABS.map(e => {
          const et = tasks.filter(t => t.owner?.toLowerCase() === e.name.toLowerCase() || t.assignee === e.id);
          const dn = et.filter(t => t.status === "Completed").length;
          return (
            <div key={e.id} style={{ background: BRAND.card, borderRadius: 14, border: `1px solid ${BRAND.border}`, padding: 18, cursor: "pointer", transition: "box-shadow 0.2s" }}
              onClick={() => { setCurrentEmp(e.id); setSec("tasks"); setTaskView("all"); setPg(0); setSelEmp(null); }}
              onMouseEnter={ev => ev.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.06)"}
              onMouseLeave={ev => ev.currentTarget.style.boxShadow = "none"}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <Avatar name={e.name} size={42} />
                <div><div style={{ fontWeight: 600, fontSize: 16 }}>{e.name}</div><div style={{ fontSize: 13, color: BRAND.sub }}>{e.title}</div></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                <div style={{ textAlign: "center", padding: "8px 0", background: "#f8f9fc", borderRadius: 8 }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: BRAND.navy }}>{et.length}</div>
                  <div style={{ fontSize: 12, color: BRAND.muted }}>Total</div>
                </div>
                <div style={{ textAlign: "center", padding: "8px 0", background: BRAND.okBg, borderRadius: 8 }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: BRAND.green }}>{dn}</div>
                  <div style={{ fontSize: 12, color: BRAND.muted }}>Done</div>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 5 }}>
                <span style={{ color: BRAND.sub }}>Completion</span>
                <span style={{ fontWeight: 600, color: BRAND.navy }}>{et.length ? Math.round(dn / et.length * 100) : 0}%</span>
              </div>
              <ProgressBar value={et.length ? Math.round(dn / et.length * 100) : 0} height={7} />
            </div>
          );
        })}
      </div>
    </div>
  );

  // ===== FOCUS =====
  const FocusPage = () => {
    const active = filtered.filter(t => t.status !== "Completed").sort((a, b) => {
      const o = { Critical: 0, High: 1, Medium: 2, Low: 3 };
      return (o[a.priority] || 3) - (o[b.priority] || 3);
    });
    const top = active[0];
    if (!top) return <div style={{ textAlign: "center", padding: 60, color: BRAND.muted, fontSize: 16 }}>No active tasks found</div>;
    return (
      <div className="fade-in" style={{ maxWidth: 540, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 22 }}>
          <div style={{ width: 60, height: 60, borderRadius: "50%", background: `${BRAND.navy}10`, display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
            <Target size={28} color={BRAND.navy} />
          </div>
          <h2 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 700, color: BRAND.navy }}>Focus mode</h2>
          <p style={{ margin: 0, fontSize: 15, color: BRAND.sub }}>Highest priority task first</p>
        </div>
        <div style={{ background: BRAND.card, borderRadius: 18, border: `2px solid ${BRAND.navy}20`, padding: 24 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}><Priority priority={top.priority} /><Badge status={top.status} /></div>
          <h3 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 700 }}>{top.title}</h3>
          <p style={{ margin: "0 0 14px", fontSize: 15, color: BRAND.sub, lineHeight: 1.6 }}>{top.description || "No description"}</p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {[top.platform || top.project, `Owner: ${top.owner}`, `Received: ${top.received}`].map((s, i) => (
              <span key={i} style={{ background: "#f8f9fc", padding: "5px 12px", borderRadius: 8, fontSize: 13, color: BRAND.sub }}>{s}</span>
            ))}
          </div>
        </div>
        {active.length > 1 && (
          <div style={{ marginTop: 18 }}>
            <h4 style={{ fontSize: 15, fontWeight: 600, color: BRAND.sub, margin: "0 0 10px" }}>Up next ({active.length - 1} remaining)</h4>
            {active.slice(1, 6).map(t => (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: `1px solid ${BRAND.border}` }}>
                <Priority priority={t.priority} />
                <span style={{ flex: 1, fontSize: 14 }}>{t.title}</span>
                <Badge status={t.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ===== DATA SOURCE =====
  const DataPage = () => (
    <div className="fade-in">
      <h3 style={{ fontSize: 18, fontWeight: 700, color: BRAND.navy, margin: "0 0 16px" }}>Google Sheets live data</h3>
      <div style={{ background: BRAND.card, borderRadius: 14, border: `1px solid ${BRAND.border}`, padding: 20, marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <Database size={22} color={BRAND.navy} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 16 }}>Connected spreadsheet</div>
            <a href={`https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: BRAND.purple, wordBreak: "break-all" }}>
              docs.google.com/spreadsheets/d/{SHEET_ID.slice(0, 24)}...
            </a>
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {[
            { val: totalFetched, label: "Rows fetched", bg: BRAND.okBg, bc: BRAND.green, fc: BRAND.green },
            { val: tabsOk, label: "Tabs connected", bg: BRAND.infoBg, bc: BRAND.info, fc: BRAND.info },
            { val: tasks.length, label: "Tasks parsed", bg: "#f8f9fc", bc: BRAND.border, fc: BRAND.navy },
          ].map((m, i) => (
            <div key={i} style={{ padding: "12px 18px", background: m.bg, borderRadius: 12, border: `1px solid ${m.bc}25` }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: m.fc }}>{m.val}</div>
              <div style={{ fontSize: 13, color: BRAND.sub }}>{m.label}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ background: BRAND.card, borderRadius: 14, border: `1px solid ${BRAND.border}`, overflow: "hidden" }}>
        <div style={{ padding: "12px 18px", background: "#f8f9fc", borderBottom: `1px solid ${BRAND.border}`, display: "grid", gridTemplateColumns: "1fr 100px 80px", fontSize: 14, fontWeight: 600, color: BRAND.sub }}>
          <span>Sheet tab</span><span>Status</span><span>Rows</span>
        </div>
        {Object.entries(fetchStatus).map(([name, s]) => (
          <div key={name} style={{ display: "grid", gridTemplateColumns: "1fr 100px 80px", padding: "11px 18px", borderBottom: `1px solid ${BRAND.border}`, alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Avatar name={name} size={28} />
              <span style={{ fontWeight: 500, fontSize: 14 }}>{name}</span>
            </div>
            <div>
              {s.ok
                ? <span style={{ color: BRAND.green, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}><Wifi size={13} />Connected</span>
                : <span style={{ color: BRAND.warn, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}><WifiOff size={13} />Failed</span>}
            </div>
            <span style={{ fontSize: 15, fontWeight: 600 }}>{s.count || 0}</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 18, padding: 18, background: BRAND.infoBg, borderRadius: 14, border: `1px solid ${BRAND.info}25`, fontSize: 14, color: BRAND.sub, lineHeight: 1.7 }}>
        <div style={{ fontWeight: 600, color: BRAND.info, marginBottom: 6, fontSize: 15 }}>How it works</div>
        Data is fetched live from each employee tab using the Google Sheets <code style={{ background: "#e8eaf0", padding: "2px 6px", borderRadius: 4, fontSize: 13 }}>gviz/tq</code> CSV export endpoint. The app auto-refreshes every 5 minutes. Any edits in your Google Sheet will reflect here on the next refresh.
        <div style={{ marginTop: 10, fontWeight: 600, color: BRAND.info }}>Requirement</div>
        The Google Sheet must be shared as "Anyone with the link can view" for live fetching to work.
      </div>
      <button onClick={doFetch} disabled={loading} style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 7, padding: "13px 24px", borderRadius: 11, border: "none", background: BRAND.navy, color: "#fff", fontSize: 15, fontWeight: 600 }}>
        <RefreshCw size={17} className={loading ? "spinning" : ""} />
        {loading ? "Fetching..." : "Refresh all data now"}
      </button>
    </div>
  );

  // ===== AI INSIGHTS =====
  const InsightsPage = () => (
    <div className="fade-in">
      <ConnBar />
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: `${BRAND.purple}12`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Brain size={22} color={BRAND.purple} />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: BRAND.navy }}>AI insights</h3>
          <p style={{ margin: 0, fontSize: 14, color: BRAND.sub }}>Analysis of {tasks.length} live rows from Google Sheets</p>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {[
          { ic: AlertTriangle, t: "Workload analysis", c: BRAND.danger, bg: BRAND.dangerBg, tx: `${stats.pend} active tasks across ${tabsOk - 1} employees. Highest load: ${ownerChart[0]?.name} (${ownerChart[0]?.count} tasks). Consider workload redistribution.` },
          { ic: TrendingUp, t: "Completion rate", c: BRAND.green, bg: BRAND.okBg, tx: `${stats.done} of ${stats.total} completed (${stats.total ? Math.round(stats.done / stats.total * 100) : 0}%). ${statusPie.length} different status types actively tracked.` },
          { ic: Award, t: "Top platform", c: BRAND.info, bg: BRAND.infoBg, tx: `Most tasks on "${projPie[0]?.name}" (${projPie[0]?.value})${projPie[1] ? `, followed by "${projPie[1]?.name}" (${projPie[1]?.value})` : ""}.` },
          { ic: Database, t: "Data quality", c: BRAND.purple, bg: "#f5f0ff", tx: `${tabsOk} of ${Object.keys(fetchStatus).length} sheet tabs connected. ${totalFetched} CSV rows fetched → ${tasks.length} valid tasks parsed. Next refresh in 5 min.` },
        ].map((item, i) => (
          <div key={i} style={{ background: item.bg, borderRadius: 14, padding: 18, border: `1px solid ${item.c}20` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <item.ic size={16} color={item.c} />
              <span style={{ fontWeight: 600, color: item.c, fontSize: 14 }}>{item.t}</span>
            </div>
            <p style={{ margin: 0, fontSize: 14, color: BRAND.sub, lineHeight: 1.6 }}>{item.tx}</p>
          </div>
        ))}
      </div>
    </div>
  );

  // ===== PAGE ROUTER =====
  const titles = {
    dashboard: currentEmp ? `${empObj?.name}'s Dashboard` : "Manager dashboard",
    tasks: currentEmp ? `${empObj?.name}'s Tasks` : "All tasks",
    team: "Team overview",
    data: "Data source",
    insights: "AI insights",
    focus: "Focus mode",
  };
  const pages = { dashboard: Dashboard, tasks: TasksPage, team: TeamPage, data: DataPage, insights: InsightsPage, focus: FocusPage };
  const Page = pages[sec] || Dashboard;

  // ===== MAIN LAYOUT =====
  return (
    <div style={{ minHeight: "100vh", background: BRAND.bg }}>
      {/* SIDEBAR */}
      <div style={{
        width: sidebar ? 224 : 62, background: BRAND.navy,
        height: "100vh", position: "fixed", left: 0, top: 0, zIndex: 100,
        display: "flex", flexDirection: "column", transition: "width 0.3s", overflow: "hidden",
      }}>
        <div style={{ padding: sidebar ? "16px 14px" : "16px 11px", display: "flex", alignItems: "center", gap: 9, borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: "pointer" }} onClick={() => setSidebar(!sidebar)}>
            <Zap size={16} color="#fff" />
          </div>
          {sidebar && (
            <div>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>PL India</div>
              <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 12 }}>Live · {tasks.length} tasks</div>
            </div>
          )}
        </div>
        <div style={{ flex: 1, padding: "10px 7px", display: "flex", flexDirection: "column", gap: 2 }}>
          {navs.map(n => (
            <button key={n.id} onClick={() => { setSec(n.id); setPg(0); }} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: sidebar ? "10px 13px" : "10px 14px", borderRadius: 10,
              border: "none",
              background: sec === n.id ? "rgba(255,255,255,0.15)" : "transparent",
              color: sec === n.id ? "#fff" : "rgba(255,255,255,0.55)",
              fontSize: 14, fontWeight: sec === n.id ? 600 : 400,
              justifyContent: sidebar ? "flex-start" : "center",
            }}>
              <n.ic size={17} />{sidebar && <span>{n.l}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div style={{ marginLeft: sidebar ? 224 : 62, transition: "margin-left 0.3s" }}>
        {/* HEADER */}
        <header style={{
          background: BRAND.card, borderBottom: `1px solid ${BRAND.border}`,
          padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between",
          position: "sticky", top: 0, zIndex: 50,
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: BRAND.navy }}>{titles[sec]}</h2>
            <p style={{ margin: 0, fontSize: 13, color: BRAND.sub }}>
              {currentEmp ? empObj?.title : `${EMPLOYEE_TABS.length} employees`} · {new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Live indicator */}
            <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 8, background: totalFetched > 0 ? BRAND.okBg : BRAND.warnBg, border: `1px solid ${totalFetched > 0 ? BRAND.green : BRAND.warn}20` }}>
              {totalFetched > 0 ? <Wifi size={13} color={BRAND.green} /> : <WifiOff size={13} color={BRAND.warn} />}
              <span style={{ fontSize: 13, fontWeight: 600, color: totalFetched > 0 ? BRAND.green : BRAND.warn }}>{totalFetched > 0 ? "Live" : "Offline"}</span>
            </div>
            {/* User Switcher */}
            <div style={{ position: "relative" }}>
              <button onClick={() => setShowUserPicker(!showUserPicker)} style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "6px 12px", borderRadius: 10,
                border: `1px solid ${BRAND.border}`, background: BRAND.card,
              }}>
                <Avatar name={currentEmp ? empObj?.name || "?" : "Rajesh Sir"} size={30} />
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: BRAND.text }}>{currentEmp ? empObj?.name : "Manager view"}</div>
                  <div style={{ fontSize: 12, color: BRAND.muted }}>{currentEmp ? empObj?.title : "All employees"}</div>
                </div>
                <ChevronDown size={15} color={BRAND.muted} />
              </button>
              {showUserPicker && (
                <div style={{
                  position: "absolute", top: "100%", right: 0, marginTop: 6,
                  width: 260, background: BRAND.card, borderRadius: 14,
                  border: `1px solid ${BRAND.border}`, boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
                  zIndex: 200, overflow: "hidden",
                }}>
                  <button onClick={() => { setCurrentEmp(null); setSelEmp(null); setShowUserPicker(false); setPg(0); }} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "12px 16px", border: "none",
                    background: !currentEmp ? `${BRAND.navy}08` : "transparent",
                    color: BRAND.text, width: "100%", fontSize: 14, borderBottom: `1px solid ${BRAND.border}`,
                  }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: `${BRAND.navy}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Users size={15} color={BRAND.navy} />
                    </div>
                    <div style={{ textAlign: "left" }}>
                      <div style={{ fontWeight: 600 }}>Manager view</div>
                      <div style={{ fontSize: 12, color: BRAND.muted }}>All employees</div>
                    </div>
                  </button>
                  <div style={{ maxHeight: 300, overflow: "auto" }}>
                    {EMPLOYEE_TABS.map(e => (
                      <button key={e.id} onClick={() => { setCurrentEmp(e.id); setSelEmp(null); setShowUserPicker(false); setPg(0); setSec("dashboard"); }} style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "10px 16px", border: "none",
                        background: currentEmp === e.id ? `${BRAND.purple}08` : "transparent",
                        color: BRAND.text, width: "100%", fontSize: 14, borderBottom: `1px solid ${BRAND.border}`,
                      }}>
                        <Avatar name={e.name} size={30} />
                        <div style={{ textAlign: "left" }}>
                          <div style={{ fontWeight: 500 }}>{e.name}</div>
                          <div style={{ fontSize: 12, color: BRAND.muted }}>{e.title}</div>
                        </div>
                        <span style={{ marginLeft: "auto", fontSize: 12, color: BRAND.muted }}>
                          {tasks.filter(t => t.owner?.toLowerCase() === e.name.toLowerCase() || t.assignee === e.id).length}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>
        {showUserPicker && <div style={{ position: "fixed", inset: 0, zIndex: 150 }} onClick={() => setShowUserPicker(false)} />}
        <main style={{ padding: 22 }}><Page /></main>
      </div>
    </div>
  );
}
