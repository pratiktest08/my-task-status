# PL India Workspace — Productivity Dashboard

Live productivity dashboard for PL India Product Team, connected to Google Sheets for real-time data.

## Features

- **Live Google Sheets integration** — Fetches data from 12 employee tabs + Status-Complete tab
- **Auto-refresh** every 5 minutes
- **User switcher** — Toggle between Manager view (all employees) and individual employee views
- **Charts & analytics** — Status pie, platform breakdown, timeline bar chart, owner distribution
- **Task management** — Sort by date/priority/project/status/owner, filter by time range
- **Team overview** — Employee cards with task counts and completion rates
- **Focus mode** — Shows highest priority task
- **Data source panel** — Shows connection status for each Google Sheet tab
- **AI insights** — Automated analysis of workload, completion rates, bottlenecks

## Tech Stack

- **React 18** + **Vite 5**
- **Recharts** for charts
- **Lucide React** for icons
- **Figtree** font (Google Fonts)
- Google Sheets CSV API for live data

## Quick Start

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

## Deploy to Vercel

### Option 1: Vercel CLI
```bash
npm i -g vercel
vercel
```

### Option 2: GitHub + Vercel
1. Push this project to a GitHub repo
2. Go to [vercel.com](https://vercel.com) → New Project
3. Import your GitHub repo
4. Vercel auto-detects Vite — click Deploy

### Option 3: Drag & Drop
1. Run `npm run build`
2. Drag the `dist/` folder to [vercel.com/new](https://vercel.com/new)

## Google Sheet Setup

The dashboard connects to this spreadsheet:
`https://docs.google.com/spreadsheets/d/1KZxSaMPMok6a08vzkz46MTVEAWvCh2V3kC2hq0xCY0U/edit`

**Important:** The sheet must be shared as **"Anyone with the link can view"** for live fetching to work.

### Sheet Structure

Each employee has their own tab with columns:
| Column | Field |
|--------|-------|
| A | Sr.No |
| B | Product / Project |
| C | Platform |
| D | Status |
| E | Complete date |
| F | Received Date |
| G | Dev UAT Date |
| H | Testing Comp Date |
| I | Owner |
| J | Description of work |

Employee tabs: Pratik, Sandeep, Vinita, Rohit, Hemang, Gulshan, Nikhil, Smita, Devesh, Kaushal, Abdul, Ninad

Completed tasks tab: Status-Complete

## Brand Guidelines

- **Font:** Figtree (Regular, Medium, SemiBold)
- **Colors:**
  - Navy: `#0F0F83`
  - Purple: `#4C4CCC`
  - Dark: `#272756`
  - Green: `#1FB15A`

## Project Structure

```
pl-dashboard/
├── public/
│   └── favicon.svg
├── src/
│   ├── config.js        # Constants, employee data, colors
│   ├── sheets.js        # Google Sheets fetch + CSV parser
│   ├── components.jsx   # Reusable UI components
│   ├── App.jsx          # Main app with all pages
│   ├── main.jsx         # React entry point
│   └── index.css        # Global styles
├── index.html
├── package.json
├── vite.config.js
├── vercel.json
└── README.md
```
