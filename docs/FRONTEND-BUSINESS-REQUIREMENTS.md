# Frontend Business Requirements

This document describes the functionality required for the Risen One Consulting (ROC) Employee Portal frontend, derived from the current implementation and referenced features. It is organized by **page** and **persisting component** to support the frontend redesign effort.

---

## 1. Overview

The ROC Employee Portal is an internal web application for:

- **Authentication** via username/password (backend supports DynamoDB-backed login).
- **Daily status reporting (DSU)** — employees submit daily updates by project; leads/admins can view and manage team reports.
- **Navigation** to multiple functional areas from a home dashboard (some routes are not yet implemented).

The app uses **Angular** with **Angular Material**, a **serverless AWS backend** (Lambda + DynamoDB), and role-based access (**EMPLOYEE**, **LEAD**, **PM**, **ADMIN**, **INTERIM_LEAD**).

---

## 2. Authentication & Session

### 2.1 Requirements

| Requirement | Description | Current state |
|------------|-------------|---------------|
| **Login** | User authenticates with username and password; on success, redirect to `/home`. | Login form exists; frontend currently uses a stub (always succeeds). Backend Lambda validates against DynamoDB `users` table (key: `username`). |
| **Logout** | User can sign out; session is cleared and user is redirected to `/login`. | Implemented in header menu; `AuthService.logout()` navigates to `/login`. |
| **Session / user context** | Authenticated user’s identity and metadata (name, uuid, roles, assignments, etc.) must be available app-wide. | `AuthService` in `services/auth.service.ts` provides `getUser()` returning a Promise; currently returns **hardcoded** user (no real login integration). |
| **Route guard** | Unauthenticated users must not access protected routes; redirect to `/login` when not logged in. | Default route redirects `/` to `/login`; no explicit guard on `/home` or `/daily-status`. |
| **Role checks** | App must support checking roles for conditional UI and API access: `ADMIN`, `LEAD`, `PM`, `TESTER`, `INTERIM_LEAD`. | `AuthService` exposes `adminCheck()`, `leadCheck()`, `leadAdminCheck()`, `pmCheck()`, `pmAdminCheck()`, `testerCheck()`, `interimLeadCheck()`. |

### 2.2 User model (expected from backend / session)

- `uuid`, `id`, `name`, `firstName`, `lastName`, `email`
- `roles: string[]` (e.g. `['EMPLOYEE','LEAD']`)
- `assignments: string[]` (project UUIDs)
- `supervisorId` (for team hierarchies)
- `requestedPTO` (map of date → PTO request details) for daily status “PTO”/“SICK” display

---

## 3. Login Page

**Route:** `/login`  
**Component:** `LoginComponent`  
**Layout:** Full-page; no header/sidenav/footer.

### 3.1 Functionality

| Requirement | Description |
|------------|-------------|
| **Form fields** | Username (text), Password (password). Both required. |
| **Submit** | On “Login” click, call auth service `login(username, password)`. On success: navigate to `/home`. On failure: show error (e.g. “Invalid username or password”); currently only console logging. |
| **Branding** | Page title “Risen One Consulting” and “Employee Portal”; hero imagery and logo per current design. |
| **Validation** | Required validation on username and password; submit disabled or errors shown when empty. |

### 3.2 Out of scope for “requirements” doc

- Specific layout (grid, card, responsive behavior) — these are design decisions for the redesign.

---

## 4. Persistent Shell (Header, Sidenav, Footer)

These components wrap all authenticated content (hidden on `/login`).

### 4.1 Header (`app-header`)

| Requirement | Description |
|------------|-------------|
| **Logo** | ROC logo; click navigates to `/home`. |
| **Title** | “Risen One Consulting Employee Portal” (or equivalent). |
| **Navigation menu** | Hamburger/menu icon opens a menu with: Home, Daily Status, Team (submenu), Admin (submenu), Log Out. |
| **Team submenu** | Placeholder for lead-specific links (e.g. team daily status); currently “Blank” links. |
| **Admin submenu** | Placeholder for admin-specific links; currently “Blank” links. |
| **Log Out** | Calls `AuthService.logout()` and redirects to `/login`. |
| **User indicator** | Optional: show logged-in user (e.g. icon or name); component has `user` and `userphoto` but they are not wired to the shared auth user in the current code. |

### 4.2 Sidenav (`app-sidenav`)

| Requirement | Description |
|------------|-------------|
| **Main links** | Home, Daily Status, and placeholder “blank” link. |
| **Team section** | Expandable “Team” section; when expanded, show sub-items (e.g. team daily status); currently “blank”. |
| **Admin section** | Expandable “Admin” section; when expanded, show admin links; currently “blank”. |
| **Role-based visibility** | Optionally show Team/Admin sections only for LEAD/ADMIN/PM (flags exist on component but not fully wired). |

### 4.3 Footer (`app-footer`)

| Requirement | Description |
|------------|-------------|
| **Content** | Company info: “Risen One Consulting”, address (13401 Mission Road, Suite 207, Leawood, KS 66209), and contact email (hr@risen-one.com). |
| **Persistence** | Same footer on all authenticated pages. |

---

## 5. Home Page (Dashboard)

**Route:** `/home`  
**Component:** `HomeComponent`

### 5.1 Functionality

| Requirement | Description |
|------------|-------------|
| **User greeting** | “Welcome, {user.name}” (desktop and mobile variants). |
| **Profile link** | User photo/avatar is clickable and navigates to `/profile/{user.uuid}`. *Route/component not implemented.* |
| **Loading** | Show progress spinner while resolving user (e.g. `getUser()`). |
| **Dashboard cards** | Six (or more) action cards; each has icon, title, and primary action. |

### 5.2 Dashboard card actions (required behavior)

| Card | Title | Button / link | Route / behavior |
|------|--------|----------------|-------------------|
| 1 | DAILY STATUS | “Submit” | Navigate to `/daily-status`. |
| 2 | EMPLOYEE DEVELOPMENT | “View/Edit” | Navigate to `/reports/personal-dev`. *Not implemented.* |
| 3 | TIME OFF | “Submit” | Navigate to `/time-off`. *Not implemented.* |
| 4 | ROC TEAM PAGE | “View All” | Navigate to `/team-summary`. *Not implemented.* |
| 5 | PROJECTS | “View All” | Navigate to `/dashboard`. *Not implemented.* |
| 6 | CERTIFICATION & TRAINING | “View/Manage” | Navigate to `/certification`. *Not implemented.* |
| 7 | PORTAL SUPPORT | “Request Enhancement” / “Report a Bug” | External links (e.g. mailto or ticket system); hrefs currently empty. |

All of the above **routes and labels** are required from a product perspective; which cards to implement in the first phase of the redesign is a scope decision.

---

## 6. Daily Status Page

**Route:** `/daily-status` (optional route params: `uuid`, `role` for viewing another user’s reports as lead/admin/pm)  
**Component:** `DailyStatusComponent`

This is the main implemented feature: employees submit and view **Daily Status Updates (DSU)** by date; leads/admins can view team members’ reports.

### 6.1 Page-level requirements

| Requirement | Description |
|------------|-------------|
| **Title** | “{user.name}'s Daily Status” (with correct possessive). Page title (browser) set to “ROC Daily Status” or “ROC Reports \| {user.name}” when viewing another user. |
| **User context** | If route has `uuid` and it differs from logged-in user, load that user’s reports (lead/admin/pm viewing subordinate). Otherwise show logged-in user’s reports. |
| **Reports table** | Table columns: **Date**, **Project ID(s)** (or project names), **Submitted** (status). Rows are one per day in the selected date range (or per report). |
| **Status values** | **MISSING**, **IN-PROGRESS** (draft), **SUBMITTED**, **PTO**, **SICK**. PTO/SICK derived from `user.requestedPTO` (e.g. 8+ hours). |
| **Sorting** | Table sorted by date (newest first). |
| **Pagination** | Client-side pagination (e.g. 5, 10, 25 per page). |
| **Row click** | Clicking a row opens the **Report Review** dialog for that day’s report. |
| **Empty state** | When no data, show placeholder (e.g. illustration/message). |
| **Responsive** | On narrow screens (e.g. &lt; 800px), hide “projects” column and show “Update Range” in a modal instead of inline. |

### 6.2 Date range and filters

| Requirement | Description |
|------------|-------------|
| **Date range** | Start and end date pickers (MM/DD/YYYY). Default: about one month ago through today. |
| **Update Range** | Button to apply selected range; fetches reports for that range and refreshes table. Disabled when range invalid (e.g. start ≥ end). |
| **Run Report** | “Run Report” sends a **custom date-range report** via email for the selected range. Tooltip explains that an email will be sent. Button visually emphasized when range has changed. |
| **Mobile** | On mobile, “Update Range” opens **Update Date Range** modal instead of inline pickers. |

### 6.3 Actions (buttons)

| Requirement | Visibility | Action |
|------------|------------|--------|
| **Add Report** | Only when viewing **own** reports (`realUser === user`) | Opens **Add/Edit Report** dialog (Report Dialog). |
| **Update Range** | Desktop: inline; Mobile: button that opens modal | Apply date range or open **Update Date Range** modal. |
| **Return to Overview** | LEAD | Link to `/team/team-daily-status`. |
| **Return to Overview** | ADMIN | Link to `/admin/admin-daily-status`. |
| **Return to Overview** | PM | Link to `/pm/pm-daily-status`. |
| **Current Monthly Report** | All | Trigger “current month” report email. |
| **Previous Monthly Report** | All | Trigger “previous month” report email. |

*Overview routes above are not implemented; buttons are present and must navigate when those pages exist.*

### 6.4 Data loading

- Load **user** (from route or current user), **reports** (via `getReportsNew(userId, pageSize, startRange, endRange)`), and **projects** (for mapping project IDs to names).
- Combine report rows with PTO days in range so that days with 8+ hours PTO/sick show as PTO/SICK even without a DSU.
- Show global loading spinner during load; close when table is ready.

---

## 7. Report Dialog (Add / Edit Report)

**Component:** `ReportDialogComponent`  
**Opened from:** Daily Status page (“Add Report”) or Report Review (“Edit”).

### 7.1 Functionality

| Requirement | Description |
|------------|-------------|
| **Mode** | **Add:** default to today’s date and empty project text. **Edit:** prefill with existing report (date, project text, project status). |
| **Display** | User name and date (read-only). One section per **assigned project** (filtered by user’s `assignments`; exclude “Inactive” projects). |
| **Project sections** | Per project: text area for report text (required), and optionally **Project Status** (Healthy / Attention / Urgent) for LEAD/PM. |
| **Project status** | Radio options: Healthy (green), Attention (yellow), Urgent (red). Only shown for users with role LEAD or PM. |
| **Default project** | If user has no assignments, show a single “Onboarding” (or default) project. |
| **Save Draft** | Submit with `draft: true`; report not emailed; show success “saved as draft”. Only show for new or currently draft reports. |
| **Submit** | Submit with `draft: false`; save report and send email to team lead; show success “emailed to your team lead”. |
| **Cancel** | Close dialog without saving. |
| **Validation** | Submit disabled when form invalid (e.g. missing required report text). Save Draft disabled when form not dirty. |
| **Errors** | On API error, show standard error dialog (e.g. “Error saving report”). |

### 7.2 API contract (conceptual)

- **Create/update report:** e.g. `createReport(params, userId, date)` with `params`: `{ draft, projects: [{ projectId, reportText, reportStatus? }] }`.
- **Send email:** `sendEmail({ uuid, text, date })` after successful submit.

---

## 8. Report Review Dialog (View Report)

**Component:** `ReportReviewComponent`  
**Opened from:** Daily Status table row click.

### 8.1 Functionality

| Requirement | Description |
|------------|-------------|
| **Title** | “{user.name}'s Report ({report.date})”. |
| **Content** | Submitter name; date submitted; project(s); full report text (per project); for leads, project status per project. |
| **Admin** | If viewer is admin, show submitter’s email. |
| **Layout** | Desktop: side-by-side metadata and report text; mobile: stacked layout. |
| **Close** | “Close” button closes dialog. |
| **Delete** | Visible when `role != ''` (e.g. lead/admin/pm). Deletes report and shows success; dialog closes. |
| **Options menu** | “Options” dropdown: **Edit** (ADMIN or report owner) opens Report Dialog with this report; **Export to PDF** (placeholder; export logic commented out). |
| **Loading** | Show loading indicator until report/user data ready. |

### 8.2 API

- **Delete:** `deleteReport(userId, date)`.
- **Edit:** Opens `ReportDialogComponent` with `data: { report, user }`.

---

## 9. Update Date Range Modal

**Component:** `UpdateDateRangeComponent`  
**Opened from:** Daily Status (mobile “Update Range” or when date range is changed with “Run Report” flow).

### 9.1 Functionality

| Requirement | Description |
|------------|-------------|
| **Fields** | Start date and end date (date pickers, MM/DD/YYYY). |
| **Submit** | Close dialog and return `{ startRange, endRange }` to parent; parent updates range and refreshes table. |
| **Custom Range (export)** | When `data.showExport` is true, “Custom Range” returns `{ startRange, endRange, exportRange: true }` so parent can trigger custom report email. |
| **Cancel** | Close without applying. |
| **Validation** | Submit/Custom Range disabled when range invalid (e.g. start ≥ end). |

---

## 10. Referenced but Not Yet Implemented Pages

These are **required from a product/navigation perspective** (links exist on Home or Daily Status) but have **no routes or components** yet. The redesign should account for them.

| Route | Description (intent) |
|-------|------------------------|
| `/profile/:uuid` | User profile (view/edit own or others’ profile). |
| `/reports/personal-dev` | Employee development reports — view/edit. |
| `/time-off` | Time-off (PTO/sick) submission. |
| `/team-summary` | ROC team summary view. |
| `/dashboard` | Projects list/dashboard. |
| `/certification` | Certification and training — view/manage. |
| `/team/team-daily-status` | Lead view of team daily status. |
| `/admin/admin-daily-status` | Admin view of daily status. |
| `/pm/pm-daily-status` | PM view of daily status. |

---

## 11. Shared Components & Global Behavior

### 11.1 Dialogs (DialogService)

| Component | Purpose |
|-----------|---------|
| **Save Success** | Success message (e.g. “Daily Status Saved!”, “Email Sent”). |
| **Confirmation modal** | Yes/No confirmations (e.g. disable user). |
| **Confirm redirect** | Confirm before navigating away. |
| **Generic error** | Standard error message; used by `standardError()` / `standardInputError()`. |
| **Progress spinner** | Global loading overlay; `openSpinner()` / `closeSpinner()`. |

### 11.2 Error handling

- **standardError(err, title, bodyText):** Close spinner, show error dialog: “Error {title}” and “We ran into an error {bodyText}. Please try again…”.
- **standardInputError:** Same but with custom body text (e.g. validation messages).

### 11.3 Constants (roc-constants)

- API route segments (e.g. EMP_ROUTES, ADMIN_ROUTES, APIS).
- Form validators (alpha, numeric, date, etc.).
- Confirmation modal messages, modal widths, snackbar timeout.
- **DEFAULT_PROJECT** (e.g. “Onboarding”) when user has no assignments.

---

## 12. Data & API Summary

### 12.1 Backend (existing)

- **Login:** POST with `{ username, password }`; validates against DynamoDB `users` (key `username` in login handler; note: import-data uses `uuid` for users table — confirm key alignment).
- **Import data:** POST to seed users, projects, and daily reports.
- **Tables:** `users`, `projects`, `dailyStatus` (see serverless.yml).

### 12.2 Frontend services (intended API surface)

- **Auth:** Login, logout, getUser, role checks (stub/mock in places).
- **Daily reports:** getReportsNew, createReport, deleteReport, addUserToReportsTable, getMonthlyList, sendEmail; **getAllProjects**.
- **Projects:** getProjects, getProjectInfo, addProject, editProject, deleteProject.
- **Users:** getUserInfo(uuid), getUsers (for leads/admins).

Many of these currently return **mock data** or `of([])`; the redesign should assume real endpoints will be implemented to match these contracts.

### 12.3 Key entities

- **User:** uuid, name, email, roles, assignments, supervisorId, requestedPTO, etc.
- **Project:** uuid, projectName, projectFullName, status (Active/Inactive), etc.
- **Daily report:** uuid, userId, date, projects: [{ projectId, reportText, reportStatus }], reportStatus (boolean submitted flag).

---

## 13. Roles & Permissions (Summary)

| Role | Typical capabilities |
|------|-----------------------|
| **EMPLOYEE** | Own daily status (add, edit draft, submit); view own reports; monthly/custom report emails. |
| **LEAD** | Everything for direct reports (view reports, edit, delete); project status on reports; “Return to Overview” → team daily status. |
| **PM** | Similar to lead for their team; project status on reports; “Return to Overview” → pm daily status. |
| **ADMIN** | Full access: view/edit/delete any report; see submitter email in review; user/project management (when implemented); “Return to Overview” → admin daily status. |
| **INTERIM_LEAD** | Treated separately in role checks (e.g. interimLeadCheck). |
| **TESTER** | Flag for tester-specific features (e.g. visibility of test tools). |

---

## 14. Non-Functional / Redesign Notes

- **Responsive:** Daily Status and Report Review have explicit mobile behavior (column hiding, modal for date range). Header uses a hamburger menu. All new pages should be responsive.
- **Accessibility:** Use semantic HTML and ARIA where appropriate; ensure keyboard and screen-reader support for dialogs and forms.
- **Loading & errors:** Use DialogService spinner and standard error/success dialogs consistently.
- **i18n:** Not specified; assume English for now unless product requests otherwise.

---

*This document reflects the behavior and structure present in the codebase and backend as of the last review. Gaps between “required” behavior and current implementation (e.g. stub auth, missing routes) are called out so the redesign can prioritize and implement them.*
