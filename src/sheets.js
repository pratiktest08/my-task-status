import { BASE_URL, EMPLOYEE_TABS, COMPLETED_TAB } from './config';

/**
 * Parse CSV text into 2D array of strings.
 * Handles quoted fields, escaped quotes, and multiline values.
 */
export function parseCSV(text) {
  const lines = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === '\n' && !inQuotes) {
      lines.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  if (current) lines.push(current);

  return lines.map(line => {
    const cells = [];
    let cell = "";
    let q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (q && line[i + 1] === '"') { cell += '"'; i++; }
        else { q = !q; }
      } else if (c === ',' && !q) {
        cells.push(cell.trim());
        cell = "";
      } else {
        cell += c;
      }
    }
    cells.push(cell.trim());
    return cells;
  });
}

/**
 * Fetch a single sheet tab as CSV and return parsed rows.
 */
export async function fetchSheetTab(tabName) {
  const url = `${BASE_URL}${encodeURIComponent(tabName)}`;
  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const text = await resp.text();
    return parseCSV(text);
  } catch (err) {
    console.warn(`[Sheets] Tab "${tabName}" failed:`, err.message);
    return null;
  }
}

/**
 * Map a CSV row to a task object.
 * 
 * Google Sheet columns:
 *   A (0): Sr.No
 *   B (1): Product / Project
 *   C (2): Platform
 *   D (3): Status
 *   E (4): Complete date
 *   F (5): Received Date
 *   G (6): Dev UAT Date
 *   H (7): Testing Comp Date
 *   I (8): Owner
 *   J (9): Description of work
 */
export function mapRowToTask(row, fallbackOwner, empId, isCompleted = false) {
  const srNo = row[0] || "";
  const project = row[1] || "";
  const platform = row[2] || "";
  const rawStatus = row[3] || "";
  const completeDate = row[4] || "";
  const receivedDate = row[5] || "";
  const devUAT = row[6] || "";
  const testDate = row[7] || "";
  const owner = row[8] || fallbackOwner;
  const description = (row[9] || "").replace(/"/g, "").trim();

  // Skip empty rows
  if (!project && !description) return null;

  // Normalize status
  const statusLower = rawStatus.toLowerCase();
  let status;
  if (isCompleted || statusLower.includes("complete") || statusLower.includes("closed")) {
    status = "Completed";
  } else if (statusLower.includes("progress")) {
    status = "In Progress";
  } else if (statusLower.includes("hold")) {
    status = "On Hold";
  } else if (statusLower.includes("review")) {
    status = "Given for Review";
  } else {
    status = rawStatus || "Pending";
  }

  // Determine priority
  const descLower = (description || "").toLowerCase();
  let priority = "Medium";
  if (descLower.includes("critical") || rawStatus.toLowerCase().includes("critical")) {
    priority = "Critical";
  } else if (descLower.includes("urgent") || platform?.toLowerCase().includes("trading") || project?.toLowerCase().includes("revamp")) {
    priority = "High";
  }

  return {
    id: `${empId}-${srNo || Math.random().toString(36).slice(2, 8)}`,
    srNo,
    title: project,
    project: platform || project,
    platform,
    status,
    priority,
    assignee: empId,
    owner,
    received: receivedDate,
    completeDate,
    devUAT,
    testDate,
    dueDate: completeDate || devUAT || receivedDate || "",
    description,
    progress: status === "Completed" ? 100 : Math.floor(Math.random() * 60 + 20),
    critical: priority === "Critical",
    involved: [owner || fallbackOwner].filter(Boolean),
  };
}

/**
 * Fetch all employee tabs + Status-Complete tab.
 * Returns { tasks: Task[], status: Record<string, TabStatus> }
 */
export async function fetchAllSheetData() {
  const allTasks = [];
  const status = {};

  // 1. Fetch each employee's pending tasks tab
  for (const employee of EMPLOYEE_TABS) {
    try {
      const rows = await fetchSheetTab(employee.name);
      if (rows && rows.length > 1) {
        status[employee.name] = { ok: true, count: rows.length - 1 };
        for (let i = 1; i < rows.length; i++) {
          const task = mapRowToTask(rows[i], employee.name, employee.id, false);
          if (task && task.title) allTasks.push(task);
        }
      } else {
        status[employee.name] = { ok: false, count: 0 };
      }
    } catch (e) {
      status[employee.name] = { ok: false, error: e.message };
    }
  }

  // 2. Fetch Status-Complete tab (all completed tasks)
  try {
    const rows = await fetchSheetTab(COMPLETED_TAB);
    if (rows && rows.length > 1) {
      status[COMPLETED_TAB] = { ok: true, count: rows.length - 1 };
      for (let i = 1; i < rows.length; i++) {
        const ownerName = rows[i][8] || "";
        const empMatch = EMPLOYEE_TABS.find(
          e => e.name.toLowerCase() === ownerName.toLowerCase().trim()
        );
        const task = mapRowToTask(rows[i], ownerName, empMatch?.id || "EMP001", true);
        if (task && task.title) allTasks.push(task);
      }
    } else {
      status[COMPLETED_TAB] = { ok: false, count: 0 };
    }
  } catch (e) {
    status[COMPLETED_TAB] = { ok: false, error: e.message };
  }

  return { tasks: allTasks, status };
}
