# API Audit — Mountains Tech Backend

**Date:** 2025-08-07  
**Base path:** `c:\code\mountains_tech_backend\src`  
**Global prefix:** `api/v1`  
**Port (default):** 3000  
**Swagger:** `http://localhost:3000/api/docs`

---

## Summary Verdict

The backend is **largely complete** for a standard admin dashboard. The four items raised by the frontend developer are **all implemented**, but with one important nuance and two real gaps:

| Item raised by frontend | Status |
|---|---|
| `GET /api/tracking` → metrics by day/week | ✅ Implemented at `GET /api/v1/tracking` |
| `POST /api/tracking` → record events | ✅ Implemented at `POST /api/v1/tracking` |
| `GET /api/tracking/visitors` → active visitors | ✅ Implemented at `GET /api/v1/tracking/visitors` |
| `AuditInterceptor` capturing category, method, HTTP status, IP | ⚠️ **Schema supports it, interceptor is written correctly, but it is never applied to any controller** |
| `/admin/emails` module | ✅ Implemented at `GET|POST /api/v1/admin/emails/*` |

**Two real gaps found:**
1. `AuditInterceptor` is defined but never registered (`@UseInterceptors(AuditInterceptor)` appears on zero controllers). Audit logs will never be written.
2. `DELETE /api/v1/admin/contacts/:id` is missing — there is no way to hard-delete a contact message.

---

## Global Configuration

| Setting | Value |
|---|---|
| Global prefix | `api/v1` |
| CORS | Configurable via `CORS_ORIGINS` env var |
| Auth | JWT Bearer tokens (access: 15 min, refresh: 30 days) |
| Validation | `ValidationPipe` with `whitelist: true`, `forbidNonWhitelisted: true` |
| Response shape | All responses wrapped: `{ success, data, message }` via `TransformInterceptor` |

---

## Complete Route Table

All paths are relative to the global prefix `api/v1`. Full URL example: `GET http://localhost:3000/api/v1/auth/login`.

### Auth — `src/modules/auth/auth.controller.ts`

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| POST | `/auth/login` | No | — | Login, returns access + refresh tokens |
| POST | `/auth/refresh` | Refresh JWT | — | Renew access token |
| POST | `/auth/logout` | JWT | Any | Logout (client-side token disposal) |
| GET | `/auth/me` | JWT | Any | Authenticated user profile |
| POST | `/auth/forgot-password` | No | — | Request password reset email |
| POST | `/auth/reset-password` | No | — | Confirm password reset with token |

*Note: `forgot-password` and `reset-password` are in `src/modules/users/users.controller.ts` (PasswordResetController) but tagged as `Authentification`.*

---

### Health — `src/modules/health/health.controller.ts`

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/health` | No | — | API + DB status check |
| POST | `/health/test-mail` | No | — | Test SMTP delivery |

---

### Tracking — `src/modules/tracking/tracking.controller.ts`

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| POST | `/tracking` | No | — | Record a tracking event (page, referer, visitorId, event, metadata) |
| GET | `/tracking` | JWT | SUPER_ADMIN, ADMIN | Metrics by day for last 30 days + summary + top pages |
| GET | `/tracking/visitors` | JWT | SUPER_ADMIN, ADMIN | Active visitors (query param: `?minutes=5`) |

**POST body (CreateTrackingEventDto):**
```json
{
  "visitorId": "string (required)",
  "sessionId": "string (optional)",
  "page": "string (required)",
  "referer": "string (optional)",
  "event": "string (optional, default: page_view)",
  "metadata": "object (optional)"
}
```

---

### Users — `src/modules/users/users.controller.ts`

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/admin/users` | JWT | SUPER_ADMIN, ADMIN | Paginated list with filters (role, status, search) |
| GET | `/admin/users/:id` | JWT | SUPER_ADMIN, ADMIN | Single user detail |
| POST | `/admin/users` | JWT | SUPER_ADMIN, ADMIN | Create admin user |
| PATCH | `/admin/users/:id` | JWT | SUPER_ADMIN, ADMIN | Update user (partial) |
| DELETE | `/admin/users/:id` | JWT | SUPER_ADMIN, ADMIN | Soft-delete (status → INACTIVE) |

---

### Dashboard — `src/modules/dashboard/dashboard.controller.ts` + `home.controller.ts`

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/admin/dashboard` | JWT | SUPER_ADMIN, ADMIN | Global stats: users, members, activities, events, projects, hackathons, newsletter, contacts |
| GET | `/public/home` | No | — | Homepage aggregate: activities, events, projects, members, partners |

---

### Activities — `src/modules/activities/activities.controller.ts`

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/public/activities` | No | — | Paginated published activities |
| GET | `/public/activities/:slug` | No | — | Single published activity |
| GET | `/admin/activities` | JWT | SUPER_ADMIN, ADMIN, EDITOR | All activities (all statuses) |
| GET | `/admin/activities/:id` | JWT | SUPER_ADMIN, ADMIN, EDITOR | Single activity by ID |
| POST | `/admin/activities` | JWT | SUPER_ADMIN, ADMIN, EDITOR | Create activity (status defaults to DRAFT) |
| PATCH | `/admin/activities/:id` | JWT | SUPER_ADMIN, ADMIN, EDITOR | Update activity (partial, status transitions) |
| DELETE | `/admin/activities/:id` | JWT | SUPER_ADMIN, ADMIN, EDITOR | Delete (only DRAFT or ARCHIVED) |

---

### Events — `src/modules/events/events.controller.ts`

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/public/events` | No | — | Paginated published events |
| GET | `/public/events/:slug` | No | — | Single published event |
| POST | `/public/events/:eventId/registrations` | No | — | Register participant to an event |
| GET | `/admin/events` | JWT | SUPER_ADMIN, ADMIN, EDITOR | All events |
| GET | `/admin/events/:id` | JWT | SUPER_ADMIN, ADMIN, EDITOR | Single event by ID |
| POST | `/admin/events` | JWT | SUPER_ADMIN, ADMIN, EDITOR | Create event |
| PATCH | `/admin/events/:id` | JWT | SUPER_ADMIN, ADMIN, EDITOR | Update event |
| DELETE | `/admin/events/:id` | JWT | SUPER_ADMIN, ADMIN, EDITOR | Delete event (blocked if PUBLISHED) |
| GET | `/admin/events/:id/registrations` | JWT | SUPER_ADMIN, ADMIN, EDITOR | List registrations for an event |

---

### Hackathons — `src/modules/hackathons/hackathons.controller.ts`

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/public/hackathons` | No | — | Published hackathons |
| GET | `/public/hackathons/:slug` | No | — | Single published hackathon |
| POST | `/public/hackathons/:hackathonId/teams` | No | — | Register a team |
| GET | `/public/hackathons/:hackathonId/teams` | No | — | List approved teams |
| GET | `/admin/hackathons` | JWT | SUPER_ADMIN, ADMIN, EDITOR | All hackathons |
| GET | `/admin/hackathons/:id` | JWT | SUPER_ADMIN, ADMIN, EDITOR | Single hackathon |
| POST | `/admin/hackathons` | JWT | SUPER_ADMIN, ADMIN, EDITOR | Create hackathon |
| PATCH | `/admin/hackathons/:id` | JWT | SUPER_ADMIN, ADMIN, EDITOR | Update hackathon |
| DELETE | `/admin/hackathons/:id` | JWT | SUPER_ADMIN, ADMIN, EDITOR | Delete hackathon (blocked if PUBLISHED) |
| GET | `/admin/hackathons/:id/teams` | JWT | SUPER_ADMIN, ADMIN, EDITOR | List teams with optional status filter |
| PATCH | `/admin/hackathons/teams/:teamId/status` | JWT | SUPER_ADMIN, ADMIN, EDITOR | Approve/reject a team |

---

### Members — `src/modules/members/members.controller.ts`

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/public/members` | No | — | Approved members (paginated) |
| GET | `/public/members/:slug` | No | — | Single member detail |
| POST | `/public/members/applications` | No | — | Submit membership application |
| GET | `/admin/members` | JWT | SUPER_ADMIN, ADMIN | All members |
| GET | `/admin/members/applications` | JWT | SUPER_ADMIN, ADMIN | All applications |
| GET | `/admin/members/:id` | JWT | SUPER_ADMIN, ADMIN | Single member |
| POST | `/admin/members` | JWT | SUPER_ADMIN, ADMIN | Create member directly (skip application flow) |
| PATCH | `/admin/members/:id/status` | JWT | SUPER_ADMIN, ADMIN | Approve/reject/suspend member |
| PATCH | `/admin/members/applications/:id/status` | JWT | SUPER_ADMIN, ADMIN | Process application (approve creates member) |

---

### Partners — `src/modules/partners/partners.controller.ts`

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/admin/partners` | JWT | SUPER_ADMIN, ADMIN | All partners |
| GET | `/admin/partners/:id` | JWT | SUPER_ADMIN, ADMIN | Single partner |
| POST | `/admin/partners` | JWT | SUPER_ADMIN, ADMIN | Create partner |
| PATCH | `/admin/partners/:id` | JWT | SUPER_ADMIN, ADMIN | Update partner |
| DELETE | `/admin/partners/:id` | JWT | SUPER_ADMIN, ADMIN | Delete partner |

*Note: No public `/public/partners` endpoint. Partners are served via `/public/home` aggregate only.*

---

### Projects — `src/modules/projects/projects.controller.ts`

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/public/projects` | No | — | Published projects (paginated) |
| GET | `/public/projects/:slug` | No | — | Single published project |
| GET | `/admin/projects` | JWT | SUPER_ADMIN, ADMIN, EDITOR | All projects |
| GET | `/admin/projects/:id` | JWT | SUPER_ADMIN, ADMIN, EDITOR | Single project |
| POST | `/admin/projects` | JWT | SUPER_ADMIN, ADMIN, EDITOR | Create project |
| PATCH | `/admin/projects/:id` | JWT | SUPER_ADMIN, ADMIN, EDITOR | Update project |
| DELETE | `/admin/projects/:id` | JWT | SUPER_ADMIN, ADMIN, EDITOR | Delete project (blocked if PUBLISHED) |

---

### Newsletter — `src/modules/newsletter/newsletter.controller.ts`

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| POST | `/public/newsletter/subscriptions` | No | — | Subscribe to newsletter |
| GET | `/public/newsletter/unsubscribe` | No | — | Unsubscribe via email link token (`?token=xxx`) |
| GET | `/admin/newsletter/subscribers` | JWT | SUPER_ADMIN, ADMIN, COMMUNICATION | List subscribers |
| DELETE | `/admin/newsletter/subscribers/:id` | JWT | SUPER_ADMIN, ADMIN, COMMUNICATION | Remove/unsubscribe a subscriber |

---

### Contacts — `src/modules/contacts/contacts.controller.ts`

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| POST | `/public/contact` | No | — | Submit contact message |
| GET | `/admin/contacts` | JWT | SUPER_ADMIN, ADMIN | List messages with status filter |
| PATCH | `/admin/contacts/:id/status` | JWT | SUPER_ADMIN, ADMIN | Update message status (NEW → IN_PROGRESS/SPAM/RESOLVED) |

**⚠️ Missing:** `DELETE /admin/contacts/:id` — no way to hard-delete a contact message.

---

### Announcements — `src/modules/announcements/announcements.controller.ts`

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/admin/announcements` | JWT | SUPER_ADMIN, ADMIN, COMMUNICATION | List campaigns |
| GET | `/admin/announcements/:id` | JWT | SUPER_ADMIN, ADMIN, COMMUNICATION | Campaign detail |
| GET | `/admin/announcements/:id/recipients` | JWT | SUPER_ADMIN, ADMIN, COMMUNICATION | Campaign recipients |
| POST | `/admin/announcements` | JWT | SUPER_ADMIN, ADMIN, COMMUNICATION | Create campaign |
| PATCH | `/admin/announcements/:id` | JWT | SUPER_ADMIN, ADMIN, COMMUNICATION | Update campaign (DRAFT/SCHEDULED only) |
| POST | `/admin/announcements/:id/send` | JWT | SUPER_ADMIN, ADMIN, COMMUNICATION | Send campaign immediately |
| POST | `/admin/announcements/:id/schedule` | JWT | SUPER_ADMIN, ADMIN, COMMUNICATION | Schedule campaign (`{ scheduledAt: ISO date }`) |
| POST | `/admin/announcements/:id/cancel` | JWT | SUPER_ADMIN, ADMIN, COMMUNICATION | Cancel scheduled campaign |

---

### Media — `src/modules/media/media.controller.ts`

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/admin/media` | JWT | SUPER_ADMIN, ADMIN, EDITOR | List uploaded files (paged, filter by mimeType) |
| POST | `/admin/media/upload` | JWT | SUPER_ADMIN, ADMIN, EDITOR | Upload file (multipart/form-data, max 10 MB) |
| PATCH | `/admin/media/:id` | JWT | SUPER_ADMIN, ADMIN, EDITOR | Update alt text |
| DELETE | `/admin/media/:id` | JWT | SUPER_ADMIN, ADMIN, EDITOR | Delete file (disk + DB) |

---

### Settings — `src/modules/settings/settings.controller.ts`

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/public/settings` | No | — | Public site settings (social links, contact info, etc.) |
| GET | `/admin/settings` | JWT | SUPER_ADMIN, ADMIN | All settings |
| PATCH | `/admin/settings` | JWT | SUPER_ADMIN, ADMIN | Bulk upsert settings (key/value pairs) |

---

### Emails — `src/modules/emails/admin-emails.controller.ts`

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/admin/emails/templates` | JWT | SUPER_ADMIN, ADMIN | List available email templates |
| POST | `/admin/emails/send` | JWT | SUPER_ADMIN, ADMIN | Send any email via a template |
| POST | `/admin/emails/test` | JWT | SUPER_ADMIN, ADMIN | Send a test email |
| POST | `/admin/emails/invite-admin` | JWT | SUPER_ADMIN, ADMIN | Send admin invitation email |

---

### Audit Logs — `src/infrastructure/audit/audit.controller.ts`

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/admin/audit-logs` | JWT | SUPER_ADMIN only | List audit logs with filters: resource, userId, category, method, statusCode |

---

### App Root — `src/app.controller.ts`

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/` (no prefix) | No | — | Returns "Hello World!" — dev/health stub |

*Note: Root GET does not use the `api/v1` prefix.*

---

## Detailed Gap Analysis

### 🔴 Critical Gap — AuditInterceptor is never applied

**File:** `src/common/interceptors/audit.interceptor.ts`

The `AuditInterceptor` class is fully implemented: it reads `AUDIT_KEY` metadata from the handler, captures `method`, `path`, `statusCode`, `ip`, `userAgent`, `category`, and calls `AuditService.log()`. The `AuditLog` schema (`src/schemas/audit-log.schema.ts`) has indexed fields for all of these. The `AuditService.findAll()` already accepts `category`, `method`, and `statusCode` filters, and the `AuditController` exposes them.

**However:** a grep across the entire codebase found zero occurrences of `@UseInterceptors(AuditInterceptor)` or `@SetMetadata(AUDIT_KEY, ...)` on any controller. The interceptor is never registered, so **no audit logs are ever written** despite the full infrastructure being in place.

**Fix needed:** Either register `AuditInterceptor` as a global interceptor in `main.ts`, or apply `@UseInterceptors(AuditInterceptor)` and `@SetMetadata(AUDIT_KEY, { action: '...', resource: '...', category: '...' })` on the admin controllers that should be audited.

---

### 🟡 Minor Gap — DELETE endpoint missing for contacts

**File:** `src/modules/contacts/contacts.controller.ts`

The `ContactAdminController` has `GET` (list) and `PATCH` (status change), but no `DELETE`. Admins can archive/spam messages via status changes but cannot permanently remove one.

---

### 🟡 Minor Gap — No standalone public `/public/partners` list endpoint

Partners are returned only via the homepage aggregate (`GET /api/v1/public/home`). If the frontend ever needs a paginated partner list independently, it is not available. The admin CRUD exists at `/admin/partners/*`.

---

### 🟡 Observation — Members have no PATCH (edit) route

`MembersAdminController` has `POST` (create), `GET` (list/detail), `PATCH :id/status` (status change), but no `PATCH :id` for general field edits (companyName, logoUrl, sectors, etc.). This is a design choice (status workflow only) but worth confirming with the frontend.

---

### ✅ All Modules Registered in AppModule Have Controllers

Every module imported in `AppModule` has at least one controller:

| Module | Controller(s) |
|---|---|
| AuthModule | `AuthController`, `PasswordResetController` |
| UsersModule | `UsersController` |
| ActivitiesModule | `ActivitiesPublicController`, `ActivitiesAdminController` |
| EventsModule | `EventsPublicController`, `EventsAdminController` |
| HackathonsModule | `HackathonsPublicController`, `HackathonsAdminController` |
| MembersModule | `MembersPublicController`, `MembersAdminController` |
| PartnersModule | `PartnersAdminController` |
| ProjectsModule | `ProjectsPublicController`, `ProjectsAdminController` |
| NewsletterModule | `NewsletterPublicController`, `NewsletterAdminController` |
| ContactsModule | `ContactPublicController`, `ContactAdminController` |
| AnnouncementsModule | `AnnouncementsController` |
| MediaModule | `MediaController` |
| SettingsModule | `SettingsPublicController`, `SettingsAdminController` |
| DashboardModule | `DashboardController`, `HomeController` |
| HealthModule | `HealthController` |
| TrackingModule | `TrackingController` |
| EmailsModule | `AdminEmailsController` |
| AuditModule (infra) | `AuditController` |

Infrastructure modules (StorageModule, MailModule, QueuesModule) are service-only, no controllers expected.

---

## Recommendations

1. **Fix AuditInterceptor (Priority: High)** — Register it globally in `main.ts` with `app.useGlobalInterceptors(new AuditInterceptor(auditService, reflector))`, or apply it at the controller level with `@SetMetadata`. Without this the entire audit log system is a no-op.

2. **Add DELETE /admin/contacts/:id (Priority: Low)** — Simple hard-delete method in `ContactAdminController` + `ContactsService`.

3. **Confirm PATCH /admin/members/:id intent (Priority: Low)** — If admins need to edit member details (not just status), a general update route is missing.

4. **Consider /public/partners endpoint (Priority: Very Low)** — Only needed if the frontend renders a standalone partners page beyond the homepage.
