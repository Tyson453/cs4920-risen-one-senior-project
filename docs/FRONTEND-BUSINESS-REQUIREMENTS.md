# Frontend Business Requirements

This document describes the functionality required for the Risen One Consulting (ROC) Employee Portal frontend, derived from the current implementation and referenced features. It is organized by **page** and **persisting component** to support the frontend redesign effort.

---

## 1. Overview

The ROC Employee Portal is an internal web application for:

- **Authentication** via username/password (backend supports DynamoDB-backed login).
- **Daily status reporting (DSU)** — employees submit daily updates by project; leads/admins can view and manage team reports.
- **Navigation** to multiple functional areas from a home dashboard (some routes are not yet implemented).

The app uses **Angular** with **Angular Material**, a **serverless AWS backend** (Lambda + DynamoDB), and role-based access (**EMPLOYEE**, **LEAD**, **PM**, **ADMIN**, **INTERIM_LEAD**, **TESTER**).

Implemented feature areas include: authentication, daily status reporting, employee development (PDT) with full supervisor approval workflow, team summary, and a certification & training page (partial).

---

## 2. Authentication & Session

### 2.1 Requirements

| Requirement | Description | Current state |
|------------|-------------|---------------|
| **Login** | User authenticates with username and password; on success, redirect to `/home`. | ✅ Implemented. `LoginComponent` calls `AuthService.login()`; backend Lambda validates against DynamoDB `users` table via `UsernameIndex`. On success, JWT stored as `localStorage.authToken` and full user object stored as `localStorage.currentUser`. |
| **Logout** | User can sign out; session is cleared and user is redirected to `/login`. | ✅ Implemented. Logout button in sidenav calls `AuthService.signOut()`, clears `authToken` and `currentUser` from localStorage, navigates to `/login`. |
| **Session / user context** | Authenticated user’s identity and metadata (name, uuid, roles, assignments, etc.) must be available app-wide. | ✅ Implemented. `services/auth.service.ts` `getUser()` reads `localStorage.currentUser` (set at login) and returns a Promise resolving to the real user object. All role-check methods (`adminCheck`, etc.) read from this real session data. |
| **Route guard** | Unauthenticated users must not access protected routes; redirect to `/login` when not logged in. | ✅ Implemented. `AuthGuard` (`auth.guard.ts`) protects all authenticated routes by checking for `authToken`. `adminGuard` (`guards/admin.guard.ts`) additionally enforces ADMIN role on `/admin`. |
| **Role checks** | App must support checking roles for conditional UI and API access: `ADMIN`, `LEAD`, `PM`, `TESTER`, `INTERIM_LEAD`. | ✅ Implemented. `services/auth.service.ts` exposes `adminCheck()`, `leadCheck()`, `leadAdminCheck()`, `pmCheck()`, `pmAdminCheck()`, `testerCheck()`, `interimLeadCheck()` — all now resolve against real session data. |

### 2.2 User model (expected from backend / session)

- `uuid`, `id`, `name`, `firstName`, `lastName`, `email`
- `roles: string[]` (e.g. `['EMPLOYEE','LEAD']`)
- `assignments: string[]` (project UUIDs)
- `teamName?: string | null` (organizational team name)
- `pmTeams: string[]` (PM team names the user belongs to)
- `supervisorId?: string` (UUID of the user's direct supervisor; assigned by admin)
- `requestedPTO` (map of date → PTO request details) for daily status "PTO"/"SICK" display

### 2.3 Team Structure

The application supports two types of teams:

**Organizational Teams** (grouped by `teamName`):
- Each user has an optional `teamName` attribute (string or null)
- Users with the same `teamName` belong to the same organizational team
- Examples: "Engineering", "Design", etc.
- A user can only belong to one organizational team
- The `teamName` field is defined in the DynamoDB schema with a Global Secondary Index (`TeamNameIndex`)

**PM Teams** (project-based teams):
- Each user has a `pmTeams` array containing PM team names
- PM teams are project-based groups (e.g., "PR22 Team", "PR33 Team", "Project Alpha")
- A user can belong to multiple PM teams
- PM teams are not stored separately; they are derived from user records (any unique value in the `pmTeams` array creates a PM team)

**Database Schema Notes**:
- DynamoDB is schema-less; only attributes used as keys or in Global Secondary Indexes need to be defined in `serverless.yml`
- The `teamName` attribute is defined with a GSI because it's used for querying users by organizational team
- Other user fields (like `firstName`, `roles`, `pmTeams`, etc.) do not need to be in AttributeDefinitions

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
| **User indicator** | Optional: show logged-in user (e.g. icon or name); not yet wired. |

> **Note:** The hamburger/navigation menu has been removed from the header. Navigation and logout have been moved to the sidenav (`app-sidenav`).

### 4.2 Sidenav (`app-sidenav`)

| Requirement | Description |
|------------|-------------|
| **Main links** | Home, Daily Status, Team. |
| **Admin link** | ✅ Shown only to users with ADMIN role (`*ngIf=”isAdmin”`); hidden for all other roles. |
| **Log Out** | ✅ Logout button pinned to the bottom of the sidenav; calls `AuthService.signOut()`, clears session, and redirects to `/login`. |
| **Team section** | Expandable “Team” section with sub-items (e.g. team daily status) — not yet implemented. |

### 4.3 Footer (`app-footer`)

| Requirement | Description |
|------------|-------------|
| **Content** | Company info: “Risen One Consulting”, address (13401 Mission Road, Suite 207, Leawood, KS 66209), and contact email (<hr@risen-one.com>). |
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
| **Dashboard cards** | Six (or more) action cards; each has icon, title, and primary action. Cards support **drag-and-drop reordering** with order persisted to `localStorage`. |

### 5.2 Dashboard card actions (required behavior)

| Card | Title | Button / link | Route / behavior |
|------|--------|----------------|-------------------|
| 1 | DAILY STATUS | “Submit” | Navigate to `/daily-status`. ✅ Implemented. |
| 2 | EMPLOYEE DEVELOPMENT | “View/Edit” | Navigate to `/reports/personal-dev`. ✅ Implemented. |
| 3 | TIME OFF | “Submit” | Navigate to `/time-off`. *Not implemented.* |
| 4 | ROC TEAM PAGE | “View All” | Navigate to `/team-summary`. ✅ Implemented. |
| 5 | PROJECTS | “View All” | Navigate to `/projects`. *Not implemented.* |
| 6 | CERTIFICATION & TRAINING | “View/Manage” | Navigate to `/certification-training`. ✅ Route exists; UI is stub (real data not wired). |
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

## 10. Admin Page

**Route:** `/admin`  
**Component:** `AdminComponent`  
**Access:** ADMIN role only.

This page allows administrators to manage user accounts, including user details, roles, projects, start dates, and PM team assignments.

### 10.1 Page-level requirements

| Requirement | Description |
|------------|-------------|
| **Title** | "User Management" or "Manage Users". |
| **Role protection** | ✅ Implemented. `adminGuard` enforces ADMIN role at the router level; runtime check in component provides a fallback. Admin link in sidenav is hidden for non-admins. |
| **Initial view** | Display a list of all users with columns: **Name**, **Email**, **State**, **Start Date**. |
| **List actions** | Each user row has an **Edit** button. Clicking opens the edit form for that user. |

### 10.2 Edit User Form

Opened when an admin clicks the "Edit" button on a user row.

| Requirement | Description |
|------------|-------------|
| **Read-only fields** | User UUID (for reference). |
| **Editable fields** | Name, Email, State, Start Date, Roles, Projects, PM Team, Supervisor. |
| **Roles field** | Multiselect dropdown; displays all available roles (EMPLOYEE, LEAD, PM, ADMIN, INTERIM_LEAD, TESTER). Admin can assign zero or more roles. |
| **Projects field** | Multiselect dropdown; displays all available projects (filtered by project status: Active). Admin can assign zero or more projects to the user. |
| **PM Team field** | Multiselect dropdown; displays all available team names. Admin can assign the user to zero or more PM teams. |
| **Supervisor field** | ✅ Implemented. Single-select dropdown populated with users who have LEAD or PM role. Stores selected user's UUID as `supervisorId` on the employee record. Required for PDT approval workflow. |
| **Form validation** | Name and Email are required; form submit disabled when invalid. State and Start Date should accept standard formats (e.g. state abbreviations, date picker for Start Date). |
| **Save button** | Submits the form; on success, shows a confirmation dialog (e.g. "User updated successfully") and returns to the user list. On error, shows standard error dialog. |
| **Cancel button** | Closes the form and returns to the user list without saving. |
| **Delete button** | Visible at the bottom or in a danger zone. Clicking shows a confirmation modal: "Are you sure you want to delete {user.name}? This action cannot be undone." On confirm, deletes the user and returns to list. On cancel, closes modal and stays in edit form. |

### 10.3 API contract (conceptual)

- **Get all users:** `getUsers()` returns array of user objects with fields: uuid, name, email, state, startDate, roles, assignments (projects), pmTeams, supervisorId.
- **Get available roles:** `getAvailableRoles()` returns array of role names.
- **Get available projects:** `getAllProjects()` returns array of active projects.
- **Get available PM teams:** `getAvailablePMTeams()` returns array of team names.
- **Update user:** ✅ `updateUser(uuid, userData)` — `PUT /users/{uuid}`; `userData` fields: `{ name, email, state, startDate, startYear, roles, assignments, pmTeams, supervisorId, teamName, maxHours, maxSickHours }`. Backend handler: `update-user.js`.
- **Delete user:** `deleteUser(uuid)`.

---

## 11. Employee Development Page (Personal Development Training)

**Route:** `/reports/personal-dev`
**Component:** `EmployeeDevelopmentComponent`
**Access:** All employees.

This page allows employees to create and manage their **Personal Development Training (PDT)** records, which track professional development goals, development needs, and action plans. The page supports an approval workflow where employees create PDT records and submit them to their supervisor for review and signature.

### 11.1 Page-level requirements

| Requirement | Description |
|------------|-------------|
| **Title** | "Personal Development Training" or "Employee Development". |
| **Initial view** | Display a table listing all PDT records for the current user with columns: **Created Date**, **Employee Name**, **Status**, **Actions**. |
| **Status field** | Each PDT record has a status: **DRAFT**, **PENDING_APPROVAL**, **APPROVED**, **CHANGES_REQUESTED**. |
| **Empty state** | When user has no PDT records, show friendly message with icon and "Create Your First PDT" button. |
| **Loading** | Show progress spinner while loading PDT records. |
| **Responsive** | Table should be responsive; on mobile, consider stacked card layout instead of table. |

### 11.2 PDT Record Structure

Based on the PDT interface in `models/pdt.ts`:

| Field | Type | Description | Required |
|-------|------|-------------|----------|
| `id` | string | Unique identifier for the PDT record | Auto-generated |
| `empName` | string | Employee's full name (auto-filled from user context) | Yes |
| `shortTermGoals` | string | Goals for next 3-6 months | Yes |
| `mediumTermGoals` | string | Goals for next 6-12 months | Yes |
| `longTermGoals` | string | Goals for 1-3 years | Yes |
| `developmentNeeds` | string | Skills, knowledge, or experiences to develop | Yes |
| `actionPlan` | string | Specific steps to achieve goals | Yes |
| `empSignature` | string | Employee's signature (typed full name) | Yes |
| `superSignature` | string | Supervisor's signature (typed full name) | No (filled by supervisor) |
| `createdDate` | string | Date PDT was created (MM/DD/YYYY) | Auto-generated |
| `createdTimestamp` | string | ISO timestamp when created | Auto-generated |
| `status` | string | Current approval status (see 11.3) | Auto-managed |
| `supervisorComments` | string | Comments from supervisor (for changes requested) | Optional |

### 11.3 PDT Status Workflow

The PDT follows an approval workflow with these statuses:

1. **DRAFT** (initial state):
   - Employee is creating/editing the PDT
   - All fields are editable by employee
   - Can be saved as draft (no supervisor notification)
   - Supervisor signature field is disabled/empty

2. **PENDING_APPROVAL** (after "Submit for Approval"):
   - Employee has completed and submitted the PDT
   - Form is locked for employee (read-only)
   - Supervisor is notified via email with PDF attachment
   - Supervisor can approve or request changes
   - Email includes link to review/approve (when portal-based approval is implemented)

3. **CHANGES_REQUESTED** (supervisor action):
   - Supervisor reviewed and requested changes
   - Form becomes editable again for employee
   - `supervisorComments` field contains feedback
   - Employee can revise and re-submit

4. **APPROVED** (supervisor action):
   - Supervisor has reviewed and approved
   - `superSignature` field is populated
   - Form is locked (read-only) for both parties
   - Record is finalized and archived

**Status transitions:**
- DRAFT → PENDING_APPROVAL (employee "Submit for Approval")
- PENDING_APPROVAL → APPROVED (supervisor approves)
- PENDING_APPROVAL → CHANGES_REQUESTED (supervisor requests changes)
- CHANGES_REQUESTED → DRAFT (employee revises)
- DRAFT → PENDING_APPROVAL (employee re-submits)

### 11.4 List View (Table)

| Requirement | Description |
|------------|-------------|
| **Columns** | Created Date, Employee Name, Status (badge/chip), Actions. |
| **Status display** | Visual indicators: Draft (gray), Pending (yellow), Approved (green), Changes Requested (orange). |
| **Action buttons** | **Edit** (for DRAFT/CHANGES_REQUESTED), **View** (for PENDING_APPROVAL/APPROVED), **Delete** (for DRAFT only). |
| **Create button** | "Create New PDT" button at top of page; opens create form. |
| **Sorting** | Default sort by Created Date (newest first). |
| **Filtering** | Future enhancement: filter by status. |

### 11.5 Create/Edit Form

Opened when user clicks "Create New PDT" or "Edit" on a draft PDT.

| Requirement | Description |
|------------|-------------|
| **Form title** | "Create Personal Development Training Record" or "Edit Personal Development Training Record". |
| **Layout** | Vertical form with labeled sections; textareas for goals and action plan. |
| **Employee Name** | Auto-filled from current user; displayed but disabled (read-only). |
| **Goal fields** | Three textareas (4 rows each): Short Term Goals, Medium Term Goals, Long Term Goals. All required with placeholder text. |
| **Development Needs** | Textarea (4 rows) for skills/knowledge to develop. Required. |
| **Action Plan** | Textarea (5 rows) for specific steps to achieve goals. Required. |
| **Signatures section** | Separated section at bottom. Employee Signature is text input (required); Supervisor Signature is disabled (filled later by supervisor). |
| **Validation** | All required fields must be filled; show inline errors (mat-error) on blur or submit attempt. |
| **Save Draft** | Button to save form as DRAFT without submitting for approval. Shows success message. Only visible for DRAFT status. |
| **Submit for Approval** | Button to submit PDT to supervisor; changes status to PENDING_APPROVAL, locks form, and triggers email to supervisor. Disabled if form invalid. |
| **Cancel** | Returns to list view without saving. |

### 11.6 View Form (Read-Only)

Opened when user clicks "View" on a PENDING_APPROVAL or APPROVED PDT.

| Requirement | Description |
|------------|-------------|
| **Form title** | "Personal Development Training Record". |
| **Layout** | Same as edit form but all fields are read-only (disabled). |
| **Status badge** | Display current status prominently at top. |
| **Supervisor comments** | If status is CHANGES_REQUESTED, display supervisor's comments in a highlighted section. |
| **Actions** | "Back to List" button. If CHANGES_REQUESTED, show "Edit" button to allow employee to make changes. |

### 11.7 Supervisor Actions

**Prerequisites in place:**
- ✅ Real authentication — login stores user object (roles, supervisorId) in session
- ✅ Role checks read real session data (`adminCheck`, `leadCheck`, etc.)
- ✅ `supervisorId` field supported in backend (`create-user.js`, `update-user.js`) and assignable via Admin UI
- ✅ Backend Lambda functions for employee-side and supervisor-side PDT workflow are implemented

**Implemented:**

| Requirement | Description |
|------------|-------------|
| **Supervisor view** | ✅ Users with LEAD, PM, or ADMIN roles see a "Pending Approvals" button in the page header with a count badge. Clicking toggles a separate table of PENDING_APPROVAL records from their direct reports. |
| **Review PDT** | ✅ Supervisor clicks "Review" on any pending record; the full PDT form opens in read-only mode. |
| **Approve** | ✅ Inline approve panel beneath the read-only form; supervisor types their full name as signature and confirms. Status transitions PENDING_APPROVAL → APPROVED. |
| **Request Changes** | ✅ Inline request-changes panel (mutually exclusive with approve panel); supervisor enters comments and confirms. Status transitions PENDING_APPROVAL → CHANGES_REQUESTED. |
| **Backend detection** | ✅ Backend (`get-pending-approvals.js`) scans the table for PENDING_APPROVAL records where `supervisorId` matches the JWT user's uuid. `submit-pdt.js` looks up and stores `supervisorId` from the users table at submission time. |

**Not yet implemented:**

| Requirement | Description |
|------------|-------------|
| **Email notifications** | When PDT is submitted for approval, supervisor receives email with PDF attachment and link to review. |
| **Audit trail** | All status changes and actions are logged with timestamp and user ID. |

### 11.8 API Contract (PDTService)

Service: `PDTService` in `services/pdt.service.ts`

**All methods are real HTTP calls (no stubs):**
- `getPDTRecords(userId: string): Observable<PDT[]>` — GET `/pdt/{userId}`; returns records sorted newest-first
- `createPDT(pdt: Partial<PDT>): Observable<any>` — POST `/pdt`; backend sets status=DRAFT and generates pdtId; returns `{ success: true, id }`
- `updatePDT(pdtId: string, pdt: Partial<PDT>): Observable<any>` — PUT `/pdt/{pdtId}`; only allowed for DRAFT/CHANGES_REQUESTED
- `deletePDT(pdtId: string): Observable<any>` — DELETE `/pdt/{pdtId}`; only allowed for DRAFT
- `submitPDTForApproval(pdtId: string): Observable<any>` — POST `/pdt/{pdtId}/submit`; transitions DRAFT/CHANGES_REQUESTED → PENDING_APPROVAL; backend looks up and stores `supervisorId` from the users table
- `getPendingApprovals(): Observable<PDT[]>` — GET `/pdt/supervisor/pending`; returns PENDING_APPROVAL records where `supervisorId` matches JWT user
- `approvePDT(pdtId: string, supervisorSignature: string): Observable<any>` — POST `/pdt/{pdtId}/approve`; sets superSignature, transitions → APPROVED
- `requestPDTChanges(pdtId: string, comments: string): Observable<any>` — POST `/pdt/{pdtId}/request-changes`; sets supervisorComments, transitions → CHANGES_REQUESTED

**Not yet implemented:**
- `sendPDTApprovalEmail(pdtId: string, supervisorEmail: string): Observable<any>` — Send approval email with PDF to supervisor
- `auditDevelopments(userId: string): Observable<any>` — Get audit log of PDT changes

### 11.9 Backend Implementation

**DynamoDB Table:** `personalDevelopmentTraining`
- Partition key: `pdtId` (string, UUID generated server-side via `crypto.randomUUID()`)
- GSI `UserIdIndex` on `userId` — used to query all PDTs for a given employee
- Table defined in `serverless.yml`; IAM permissions granted to all Lambda functions

**Lambda Functions (implemented in `backend/src/handlers/`):**

| Handler | Method | Path | Status guard |
|---------|--------|------|--------------|
| `get-pdt-records.js` | GET | `/pdt/{userId}` | None |
| `create-pdt.js` | POST | `/pdt` | None (always creates as DRAFT) |
| `update-pdt.js` | PUT | `/pdt/{pdtId}` | Rejects if status ∉ {DRAFT, CHANGES_REQUESTED} |
| `delete-pdt.js` | DELETE | `/pdt/{pdtId}` | Rejects if status ≠ DRAFT |
| `submit-pdt.js` | POST | `/pdt/{pdtId}/submit` | Rejects if status ∉ {DRAFT, CHANGES_REQUESTED}; looks up and stores supervisorId |
| `get-pending-approvals.js` | GET | `/pdt/supervisor/pending` | Scans for PENDING_APPROVAL where supervisorId matches JWT uuid |
| `approve-pdt.js` | POST | `/pdt/{pdtId}/approve` | Rejects if status ≠ PENDING_APPROVAL; sets superSignature, status → APPROVED |
| `request-pdt-changes.js` | POST | `/pdt/{pdtId}/request-changes` | Rejects if status ≠ PENDING_APPROVAL; sets supervisorComments, status → CHANGES_REQUESTED |

**Lambda Functions (not yet implemented — future phases):**
- `sendApprovalEmail` — Send email via SES with PDF attachment when PDT is submitted for approval

**PDF Generation (not yet implemented):**
- Generate PDF from PDT record data including all goals, action plan, and signatures
- Attach to approval email

**Email Notifications (not yet implemented):**
- Template for "PDT Submitted for Approval" (to supervisor)
- Template for "PDT Approved" (to employee)
- Template for "Changes Requested on PDT" (to employee)

### 11.10 Current Implementation (Phase 2)

**What is implemented:**
- ✅ Full UI for creating/editing PDT records
- ✅ Form with all required fields (goals, development needs, action plan, signatures)
- ✅ List view with status column and color-coded badges (gray/yellow/green/orange)
- ✅ Status-aware action buttons: Edit (DRAFT/CHANGES_REQUESTED), View (PENDING_APPROVAL/APPROVED), Delete (DRAFT only)
- ✅ Empty state when no records exist
- ✅ Form validation on all required fields
- ✅ Save Draft and Submit for Approval buttons with appropriate enable/disable logic
- ✅ View-only form for PENDING_APPROVAL and APPROVED records (all fields disabled)
- ✅ Supervisor comments banner shown on CHANGES_REQUESTED records
- ✅ "Edit & Resubmit" shortcut from view-only form when status is CHANGES_REQUESTED
- ✅ Delete confirmation dialog before removing a draft
- ✅ Loading spinner and success/error dialogs
- ✅ Responsive design (mobile and desktop); form actions stack vertically on small screens
- ✅ Routing: `/reports/personal-dev`
- ✅ PDTService with real HTTP calls (no stubs); normalizes `pdtId` → `id` from backend response
- ✅ Integration with AuthService (awaits user Promise before loading records) and DialogService
- ✅ DynamoDB table `personalDevelopmentTraining` defined in `serverless.yml`
- ✅ Eight Lambda functions covering full employee and supervisor workflow (see section 11.9)
- ✅ Backend status validation (update/delete/submit/approve/request-changes enforce allowed statuses server-side)
- ✅ Real authentication — session reads actual user roles and `supervisorId`
- ✅ `supervisorId` assignable via Admin UI; stored in DynamoDB user record
- ✅ **Supervisor-facing UI:** "Pending Approvals" button with count badge for users with LEAD/PM/ADMIN roles
- ✅ **Supervisor pending list:** Table showing PENDING_APPROVAL records from direct reports
- ✅ **Inline Approve panel:** Supervisor enters typed signature; transitions PDT to APPROVED
- ✅ **Inline Request Changes panel:** Supervisor enters comments; transitions PDT to CHANGES_REQUESTED (panels are mutually exclusive)

**What is NOT implemented (next phase):**
- ❌ Email notifications via SES (on submit, approve, or changes requested)
- ❌ PDF generation and attachment
- ❌ Audit trail (log of all status transitions)
- ❌ Table filtering by status

**Note:** The full end-to-end workflow — employee creates/edits/submits, supervisor approves or requests changes, employee revises and resubmits — is implemented. Remaining work is email notification and PDF generation.

---

## 12. Team Summary Page

**Route:** `/team-summary`
**Component:** `TeamSummaryComponent`
**Access:** All authenticated users (view differs based on role).

This page displays team information in two views: an admin view showing all organizational and PM teams, and a non-admin view showing the user's teammates.

### 12.1 Page-level requirements

| Requirement | Description |
|------------|-------------|
| **Title** | "ROC Team Summary". |
| **Role-based view** | Admins see all teams (organizational and PM teams); non-admins see only their teammates (same organizational team or same PM teams). |
| **Loading** | Show global loading spinner while fetching team data. |
| **Data sources** | Fetch users via `UserApiService.getTeamsForAdmin()` (admin) or `UserApiService.getTeammates(teamName, pmTeams)` (non-admin); fetch projects for mapping project UUIDs to names. |

### 12.2 Admin View

Visible when user has ADMIN role.

| Requirement | Description |
|------------|-------------|
| **Organizational Teams** | Section showing organizational teams grouped by `teamName`. Each team displayed as an expandable panel. |
| **Team panels** | Panel header shows team name (or "Unassigned" if teamName is null) and member count. Collapsed by default. |
| **Team table** | When expanded, shows table with columns: Name, Email, Roles, Projects, Start Date. |
| **Empty state** | If no organizational teams exist, show message "No organizational teams found." |
| **PM Teams** | Section showing PM teams grouped by PM team name. Each team displayed as an expandable panel. |
| **PM team panels** | Panel header shows PM team name and member count. Same table structure as organizational teams. |
| **PM empty state** | If no PM teams exist, show message "No PM teams found." |

### 12.3 Non-Admin View

Visible when user does NOT have ADMIN role.

| Requirement | Description |
|------------|-------------|
| **Title** | "Your Team". |
| **Team table** | Flat table (no panels) showing teammates with columns: Name, Email, Roles, Projects, Start Date. |
| **Teammate filtering** | If user has PM team assignments (`pmTeams` array not empty), show users in any of those PM teams. Otherwise, show users with the same `teamName`. |
| **Empty state** | When no teammates, show placeholder image (RisenOneCat.gif) and message "No teammates to display." |

### 12.4 Data Display

| Requirement | Description |
|------------|-------------|
| **Roles display** | Show user's roles as comma-separated list (e.g., "EMPLOYEE, LEAD"). Display "—" if no roles. |
| **Projects display** | Map project UUIDs in user's `assignments` array to project names using project data. Show as comma-separated list. Display "—" if no projects. |
| **Start date display** | Show as "MM/DD/YYYY" if both `startDate` and `startYear` exist; otherwise show whichever is available. Display "—" if neither exists. |

### 12.5 Team Grouping Logic

**Organizational Teams** (Admin view):
- Group users by their `teamName` field
- Each unique `teamName` creates one organizational team
- Users with `teamName: null` are grouped into "Unassigned" team

**PM Teams** (Admin view):
- Iterate through all users' `pmTeams` arrays
- Each unique PM team name creates one PM team
- A user can appear in multiple PM teams

**Teammates** (Non-admin view):
- If current user has PM teams: filter to users who share at least one PM team
- If current user has no PM teams: filter to users with the same `teamName`
- Excludes the current user themselves (shows only teammates)

### 12.6 API Contract (UserApiService)

**For admins:**
```typescript
getTeamsForAdmin(): Promise<AdminTeamData>
// Returns: { orgTeams: OrgTeamGroup[], pmTeams: PmTeamGroup[] }
// OrgTeamGroup: { teamName: string | null, users: TeamSummaryUser[] }
// PmTeamGroup: { teamId: string, teamName: string, users: TeamSummaryUser[] }
```

**For non-admins:**
```typescript
getTeammates(teamName: string | null, pmTeamNames?: string[]): Promise<TeamSummaryUser[]>
// teamName: Current user's organizational team name
// pmTeamNames: Current user's PM team names (optional)
// Returns: Array of users who are teammates
```

### 12.7 Current Implementation Status

**What is implemented:**
- ✅ Full UI with admin and non-admin views
- ✅ Organizational teams and PM teams sections (admin view)
- ✅ Expandable panels for team grouping
- ✅ Table display with all required columns
- ✅ Empty states for no teams/no teammates
- ✅ Responsive design
- ✅ Project name mapping
- ✅ Team grouping by teamName and pmTeams
- ✅ Routing: `/team-summary`
- ✅ Real backend API endpoints (`get-teammates.js` for non-admins, `get-teams-admin.js` for admins); no more mock data

**What is NOT implemented:**
- ❌ Real-time team updates
- ❌ Search/filter functionality
- ❌ Export team roster to CSV/PDF
- ❌ Team management (add/remove members) - this belongs in Admin page

---

## 13. Certification & Training Page

**Route:** `/certification-training`
**Component:** `CertificationTrainingComponent`
**Access:** All authenticated users.

This page allows employees to view and manage their certifications and training records. Backend Lambda functions and DynamoDB tables have been created; the frontend currently displays stub data (real API integration is pending).

### 13.1 Page-level requirements

| Requirement | Description |
|------------|-------------|
| **Title** | "Certification & Training". |
| **Search** | Filter list by name/keyword (client-side). |
| **Add button** | "Add" button in header; opens a form dialog to add a new certification or training record. *Dialog not yet implemented.* |
| **List view** | Table/card list showing all certifications and training items for the current user. |
| **Empty state** | When user has no records, show friendly message. |

### 13.2 Record Structure

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier |
| `name` | string | Certification or training name |
| `type` | string | "Certification" or "Course" |
| `icon` | string | Material icon name |
| `status` | string | "Active", "Completed", "Due soon", etc. |

### 13.3 Backend Implementation

**DynamoDB Tables:** Separate tables for certifications and trainings (defined in `serverless.yml`).

**Lambda Functions (implemented in `backend/src/handlers/`):**

| Handler | Method | Path |
|---------|--------|------|
| `get-certifications.js` | GET | `/certifications/{userId}` |
| `create-certification.js` | POST | `/certifications` |
| `get-trainings.js` | GET | `/trainings/{userId}` |
| `create-training.js` | POST | `/trainings` |

### 13.4 Current Implementation Status

**What is implemented:**
- ✅ Routing: `/certification-training`
- ✅ Basic page UI with search filter and Add button
- ✅ List/card display of items with icon, name, type, and status
- ✅ Backend Lambda functions for get and create (certifications and trainings)
- ✅ DynamoDB tables defined in `serverless.yml`

**What is NOT implemented:**
- ❌ Frontend service integration — component shows hardcoded stub data; real API calls not wired
- ❌ Add/edit dialog for creating new records through the UI
- ❌ Delete functionality
- ❌ Status management (e.g. renew, mark complete)
- ❌ Update Lambda functions (PUT)
- ❌ Delete Lambda functions (DELETE)

---

## 14. Referenced but Not Yet Implemented Pages

These are **required from a product/navigation perspective** (links exist on Home or Daily Status) but have **no routes or components** yet (or exist only as stubs). The redesign should account for them.

| Route | Description (intent) | Status |
|-------|------------------------|--------|
| `/profile/:uuid` | User profile (view/edit own or others' profile). | ❌ No route/component. |
| `/time-off` | Time-off (PTO/sick) submission. | ❌ No route/component. |
| `/projects` | Projects list/dashboard. | ❌ No route/component. |
| `/certification-training` | Certification and training — view/manage. | ⚠️ Route and basic UI exist; backend ready but not wired (see Section 13). |
| `/team/team-daily-status` | Lead view of team daily status. | ❌ No route/component. |
| `/admin/admin-daily-status` | Admin view of daily status. | ❌ No route/component. |
| `/pm/pm-daily-status` | PM view of daily status. | ❌ No route/component. |

---

## 15. Shared Components & Global Behavior

### 14.1 Dialogs (DialogService)

| Component | Purpose |
|-----------|---------|
| **Save Success** | Success message (e.g. “Daily Status Saved!”, “Email Sent”). |
| **Confirmation modal** | Yes/No confirmations (e.g. disable user). |
| **Confirm redirect** | Confirm before navigating away. |
| **Generic error** | Standard error message; used by `standardError()` / `standardInputError()`. |
| **Progress spinner** | Global loading overlay; `openSpinner()` / `closeSpinner()`. |

### 14.2 Error handling

- **standardError(err, title, bodyText):** Close spinner, show error dialog: "Error {title}" and "We ran into an error {bodyText}. Please try again…".
- **standardInputError:** Same but with custom body text (e.g. validation messages).

### 14.3 Constants (roc-constants)

- API route segments (e.g. EMP_ROUTES, ADMIN_ROUTES, APIS).
- Form validators (alpha, numeric, date, etc.).
- Confirmation modal messages, modal widths, snackbar timeout.
- **DEFAULT_PROJECT** (e.g. “Onboarding”) when user has no assignments.

---

## 16. Data & API Summary

### 16.1 Backend (existing)

- **Login:** POST with `{ username, password }`; validates against DynamoDB `users` (key `username` in login handler; note: import-data uses `uuid` for users table — confirm key alignment).
- **Import data:** POST to seed users, projects, and daily reports.
- **Tables:** `users`, `projects`, `dailyStatus`, `personalDevelopmentTraining`, plus tables for certifications and trainings (see serverless.yml).

### 16.2 Frontend services (API surface — real vs stub)

| Service area | Methods | Status |
|---|---|---|
| **Auth** | login, logout, getUser, role checks | ✅ Real |
| **Daily reports** | getReportsNew, createReport, deleteReport, getMonthlyList, sendEmail, getAllProjects | ✅ Real |
| **Projects** | getProjects, getProjectInfo, addProject, editProject, deleteProject | ✅ Real |
| **Users** | getUserInfo, getUsers, updateUser, deleteUser | ✅ Real |
| **Team Summary** | getTeamsForAdmin(), getTeammates(teamName, pmTeamNames) | ✅ Real (real backend endpoints) |
| **PDT** | getPDTRecords, createPDT, updatePDT, deletePDT, submitPDTForApproval, getPendingApprovals, approvePDT, requestPDTChanges | ✅ Real |
| **PDT** | sendPDTApprovalEmail, auditDevelopments | ❌ Not yet implemented |
| **Certifications/Trainings** | get, create | ❌ Backend exists; frontend service not wired (component shows stub data) |

### 16.3 Key entities

- **User:** uuid, name, email, roles, assignments, teamName, pmTeams, supervisorId, requestedPTO, maxHours, maxSickHours, etc.
- **Project:** uuid, projectName, projectFullName, status (Active/Inactive), etc.
- **Daily report:** uuid, userId, date, projects: [{ projectId, reportText, reportStatus }], reportStatus (boolean submitted flag).
- **PDT:** id, empName, shortTermGoals, mediumTermGoals, longTermGoals, developmentNeeds, actionPlan, empSignature, superSignature, createdDate, createdTimestamp, status, supervisorComments, supervisorId, userId.
- **OrgTeamGroup:** teamName (string | null), users (TeamSummaryUser[]) — represents an organizational team.
- **PmTeamGroup:** teamId (string), teamName (string), users (TeamSummaryUser[]) — represents a PM team.
- **CertItem:** id, name, type ("Certification" | "Course"), icon, status.

---

## 17. Roles & Permissions (Summary)

| Role | Typical capabilities |
|------|-----------------------|
| **EMPLOYEE** | Own daily status (add, edit draft, submit); view own reports; monthly/custom report emails; create and manage own PDT records. |
| **LEAD** | Everything for direct reports (view reports, edit, delete); project status on reports; "Return to Overview" → team daily status; approve/request changes on direct reports' PDT records. |
| **PM** | Similar to lead for their team; project status on reports; "Return to Overview" → pm daily status. |
| **ADMIN** | Full access: view/edit/delete any report; see submitter email in review; user/project management (when implemented); "Return to Overview" → admin daily status. |
| **INTERIM_LEAD** | Treated separately in role checks (e.g. interimLeadCheck). |
| **TESTER** | Flag for tester-specific features (e.g. visibility of test tools). |

**PDT-specific permissions:**
- **EMPLOYEE:** Create, edit (DRAFT/CHANGES_REQUESTED), view (all statuses), delete (DRAFT only), submit for approval.
- **LEAD/PM (as supervisor):** View direct reports' PDTs, approve, request changes, view all submitted PDTs from team.
- **ADMIN:** View all PDTs across organization, audit trail access.

---

## 18. Non-Functional / Redesign Notes

- **Responsive:** Daily Status and Report Review have explicit mobile behavior (column hiding, modal for date range). Header uses a hamburger menu. All new pages should be responsive.
- **Accessibility:** Use semantic HTML and ARIA where appropriate; ensure keyboard and screen-reader support for dialogs and forms.
- **Loading & errors:** Use DialogService spinner and standard error/success dialogs consistently.
- **i18n:** Not specified; assume English for now unless product requests otherwise.

---

*This document reflects the behavior and structure present in the codebase and backend as of March 2026. Gaps between “required” behavior and current implementation are called out so the team can prioritize and implement them.*
