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

## 10. Admin Page

**Route:** `/admin`  
**Component:** `AdminComponent`  
**Access:** ADMIN role only.

This page allows administrators to manage user accounts, including user details, roles, projects, start dates, and PM team assignments.

### 10.1 Page-level requirements

| Requirement | Description |
|------------|-------------|
| **Title** | "User Management" or "Manage Users". |
| **Role protection** | Only accessible to users with ADMIN role. Non-admin users attempting to access should be redirected to `/home`. |
| **Initial view** | Display a list of all users with columns: **Name**, **Email**, **State**, **Start Date**. |
| **List actions** | Each user row has an **Edit** button. Clicking opens the edit form for that user. |

### 10.2 Edit User Form

Opened when an admin clicks the "Edit" button on a user row.

| Requirement | Description |
|------------|-------------|
| **Read-only fields** | User UUID (for reference). |
| **Editable fields** | Name, Email, State, Start Date, Roles, Projects, PM Team. |
| **Roles field** | Multiselect dropdown; displays all available roles (EMPLOYEE, LEAD, PM, ADMIN, INTERIM_LEAD, TESTER). Admin can assign zero or more roles. |
| **Projects field** | Multiselect dropdown; displays all available projects (filtered by project status: Active). Admin can assign zero or more projects to the user. |
| **PM Team field** | Multiselect dropdown; displays all available team names. Admin can assign the user to zero or more PM teams. |
| **Form validation** | Name and Email are required; form submit disabled when invalid. State and Start Date should accept standard formats (e.g. state abbreviations, date picker for Start Date). |
| **Save button** | Submits the form; on success, shows a confirmation dialog (e.g. "User updated successfully") and returns to the user list. On error, shows standard error dialog. |
| **Cancel button** | Closes the form and returns to the user list without saving. |
| **Delete button** | Visible at the bottom or in a danger zone. Clicking shows a confirmation modal: "Are you sure you want to delete {user.name}? This action cannot be undone." On confirm, deletes the user and returns to list. On cancel, closes modal and stays in edit form. |

### 10.3 API contract (conceptual)

- **Get all users:** `getUsers()` returns array of user objects with fields: uuid, name, email, state, startDate, roles, assignments (projects), pmTeams.
- **Get available roles:** `getAvailableRoles()` returns array of role names.
- **Get available projects:** `getAllProjects()` returns array of active projects.
- **Get available PM teams:** `getAvailablePMTeams()` returns array of team names.
- **Update user:** `updateUser(uuid, userData)` with `userData`: `{ name, email, state, startDate, roles, projects, pmTeams }`.
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

### 11.7 Supervisor Actions (Future Implementation)

When proper authentication and role-based access is implemented:

| Requirement | Description |
|------------|-------------|
| **Supervisor view** | Supervisors can see a list of pending PDT approvals from their direct reports. |
| **Review PDT** | Supervisor can view the full PDT record. |
| **Approve** | Supervisor can approve the PDT; this adds their signature and changes status to APPROVED. Requires typing their full name as signature. |
| **Request Changes** | Supervisor can request changes; requires entering comments. Changes status to CHANGES_REQUESTED and notifies employee. |
| **Email notifications** | When PDT is submitted for approval, supervisor receives email with PDF attachment and link to review. |
| **Audit trail** | All status changes and actions are logged with timestamp and user ID. |

### 11.8 API Contract (PDTService)

Service: `PDTService` in `services/pdt.service.ts`

**Basic CRUD:**
- `getPDTRecords(userId: string): Observable<PDT[]>` — Get all PDT records for a user
- `getPDTRecord(pdtId: string): Observable<PDT>` — Get a specific PDT record
- `createPDT(pdt: Partial<PDT>): Observable<any>` — Create new PDT (returns `{ success: true, id }`)
- `updatePDT(pdtId: string, pdt: Partial<PDT>): Observable<any>` — Update existing PDT
- `deletePDT(pdtId: string): Observable<any>` — Delete PDT (only allowed for DRAFT status)

**Approval Workflow:**
- `submitPDTForApproval(pdtId: string): Observable<any>` — Submit PDT to supervisor; changes status to PENDING_APPROVAL and triggers email
- `approvePDT(pdtId: string, supervisorSignature: string): Observable<any>` — Supervisor approves PDT; changes status to APPROVED
- `requestPDTChanges(pdtId: string, changeComments: string): Observable<any>` — Supervisor requests changes; changes status to CHANGES_REQUESTED
- `sendPDTApprovalEmail(pdtId: string, supervisorEmail: string): Observable<any>` — Send approval email with PDF to supervisor
- `getPendingApprovals(supervisorId: string): Observable<PDT[]>` — Get all pending PDTs for a supervisor to review
- `auditDevelopments(userId: string): Observable<any>` — Get audit log of PDT changes

**Current Implementation Status:**
- All service methods are implemented as **stubs** returning mock data via `of()` Observable
- No backend integration yet; methods return success immediately
- Full implementation requires backend Lambda functions and DynamoDB table for PDT records

### 11.9 Backend Requirements (Future Implementation)

When implementing backend:

1. **DynamoDB Table:** `personalDevelopmentTraining` (or `pdt`)
   - Partition key: `userId` (string)
   - Sort key: `pdtId` (string) or `createdTimestamp` (string)
   - GSI on `status` for filtering pending approvals
   - GSI on `supervisorId` for supervisor queries

2. **Lambda Functions:**
   - `getPDTRecords` — Query PDTs by userId
   - `createPDT` — Create new PDT record
   - `updatePDT` — Update existing PDT
   - `deletePDT` — Delete PDT (with status validation)
   - `submitForApproval` — Change status and trigger email
   - `approvePDT` — Supervisor approval action
   - `requestChanges` — Supervisor request changes action
   - `sendApprovalEmail` — Send email via SES with PDF attachment

3. **PDF Generation:**
   - Generate PDF from PDT record data
   - Include all goals, action plan, and signatures
   - Attach to approval email

4. **Email Notifications:**
   - Template for "PDT Submitted for Approval" (to supervisor)
   - Template for "PDT Approved" (to employee)
   - Template for "Changes Requested on PDT" (to employee)

### 11.10 Current Implementation (Phase 1)

**What is implemented:**
- ✅ Full UI for creating/editing PDT records
- ✅ Form with all required fields (goals, development needs, action plan, signatures)
- ✅ List view with table of PDT records
- ✅ Empty state when no records exist
- ✅ Form validation on all required fields
- ✅ Save/Cancel functionality
- ✅ Loading spinner and success/error dialogs
- ✅ Responsive design (mobile and desktop)
- ✅ Routing: `/reports/personal-dev`
- ✅ PDTService with all stub methods
- ✅ Integration with AuthService and DialogService

**What is NOT implemented (future phases):**
- ❌ Status field and workflow (DRAFT → PENDING → APPROVED)
- ❌ "Submit for Approval" action
- ❌ Supervisor approval UI
- ❌ Email notifications
- ❌ PDF generation
- ❌ Backend API endpoints
- ❌ Supervisor comments field
- ❌ Audit trail
- ❌ Role-based access (distinguishing supervisors from employees)

**Note:** Because proper authentication and role-based access are not yet implemented in the portal, the approval workflow cannot be fully functional. The current implementation allows all employees to view and edit their own PDT records as drafts. The full approval workflow will be enabled once:
1. Real authentication is implemented (not stub login)
2. User roles and supervisor relationships are properly defined
3. Backend endpoints for PDT are created
4. Email service (SES) is configured

---

## 12. Referenced but Not Yet Implemented Pages

These are **required from a product/navigation perspective** (links exist on Home or Daily Status) but have **no routes or components** yet. The redesign should account for them.

| Route | Description (intent) |
|-------|------------------------|
| `/profile/:uuid` | User profile (view/edit own or others' profile). |
| `/time-off` | Time-off (PTO/sick) submission. |
| `/team-summary` | ROC team summary view. |
| `/dashboard` | Projects list/dashboard. |
| `/certification` | Certification and training — view/manage. |
| `/team/team-daily-status` | Lead view of team daily status. |
| `/admin/admin-daily-status` | Admin view of daily status. |
| `/pm/pm-daily-status` | PM view of daily status. |

---

## 13. Shared Components & Global Behavior

### 13.1 Dialogs (DialogService)

| Component | Purpose |
|-----------|---------|
| **Save Success** | Success message (e.g. “Daily Status Saved!”, “Email Sent”). |
| **Confirmation modal** | Yes/No confirmations (e.g. disable user). |
| **Confirm redirect** | Confirm before navigating away. |
| **Generic error** | Standard error message; used by `standardError()` / `standardInputError()`. |
| **Progress spinner** | Global loading overlay; `openSpinner()` / `closeSpinner()`. |

### 13.2 Error handling

- **standardError(err, title, bodyText):** Close spinner, show error dialog: "Error {title}" and "We ran into an error {bodyText}. Please try again…".
- **standardInputError:** Same but with custom body text (e.g. validation messages).

### 13.3 Constants (roc-constants)

- API route segments (e.g. EMP_ROUTES, ADMIN_ROUTES, APIS).
- Form validators (alpha, numeric, date, etc.).
- Confirmation modal messages, modal widths, snackbar timeout.
- **DEFAULT_PROJECT** (e.g. “Onboarding”) when user has no assignments.

---

## 14. Data & API Summary

### 14.1 Backend (existing)

- **Login:** POST with `{ username, password }`; validates against DynamoDB `users` (key `username` in login handler; note: import-data uses `uuid` for users table — confirm key alignment).
- **Import data:** POST to seed users, projects, and daily reports.
- **Tables:** `users`, `projects`, `dailyStatus` (see serverless.yml).

### 14.2 Frontend services (intended API surface)

- **Auth:** Login, logout, getUser, role checks (stub/mock in places).
- **Daily reports:** getReportsNew, createReport, deleteReport, addUserToReportsTable, getMonthlyList, sendEmail; **getAllProjects**.
- **Projects:** getProjects, getProjectInfo, addProject, editProject, deleteProject.
- **Users:** getUserInfo(uuid), getUsers (for leads/admins).
- **PDT:** getPDTRecords, createPDT, updatePDT, deletePDT, submitPDTForApproval, approvePDT, requestPDTChanges, sendPDTApprovalEmail, getPendingApprovals, auditDevelopments.

Many of these currently return **mock data** or `of([])`; the redesign should assume real endpoints will be implemented to match these contracts.

### 14.3 Key entities

- **User:** uuid, name, email, roles, assignments, supervisorId, requestedPTO, etc.
- **Project:** uuid, projectName, projectFullName, status (Active/Inactive), etc.
- **Daily report:** uuid, userId, date, projects: [{ projectId, reportText, reportStatus }], reportStatus (boolean submitted flag).
- **PDT:** id, empName, shortTermGoals, mediumTermGoals, longTermGoals, developmentNeeds, actionPlan, empSignature, superSignature, createdDate, createdTimestamp, status, supervisorComments.

---

## 15. Roles & Permissions (Summary)

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

## 16. Non-Functional / Redesign Notes

- **Responsive:** Daily Status and Report Review have explicit mobile behavior (column hiding, modal for date range). Header uses a hamburger menu. All new pages should be responsive.
- **Accessibility:** Use semantic HTML and ARIA where appropriate; ensure keyboard and screen-reader support for dialogs and forms.
- **Loading & errors:** Use DialogService spinner and standard error/success dialogs consistently.
- **i18n:** Not specified; assume English for now unless product requests otherwise.

---

*This document reflects the behavior and structure present in the codebase and backend as of the last review. Gaps between “required” behavior and current implementation (e.g. stub auth, missing routes) are called out so the redesign can prioritize and implement them.*
