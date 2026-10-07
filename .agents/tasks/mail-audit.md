# MailService Call-Site Audit

**Date:** 2026-07-10  
**Audited file:** `src/infrastructure/mail/mail.service.ts`  
**Scope:** all files under `src/` that inject or call `MailService`

---

## Summary

All 10 call sites across 6 files are **correct** — method names exist, required arguments are all supplied, and argument shapes match the declared signatures.  
Two minor observations worth noting:
1. **`sendMemberApplicationReview`** — the optional field `memberUrl` is never passed by the only caller. This is safe (it is typed `memberUrl?: string`) but the template will never receive a member URL link on approval emails.
2. **`sendAdminInvitation`** — the method is defined in `MailService` but is **never called anywhere** in the codebase. Either the feature is not yet wired up, or the method is dead code.

No mismatches, no missing required fields, no wrong property names were found.

---

## MailService Public Method Signatures (source of truth)

| Method | Required fields | Optional fields |
|---|---|---|
| `send(options, throwOnError?)` | `to`, `subject`, `template`, `context` | `throwOnError` (default `false`) |
| `sendMemberApplicationConfirmation(data)` | `to`, `representativeName`, `companyName`, `sectors`, `applicationId` | — |
| `sendMemberApplicationReview(data)` | `to`, `representativeName`, `companyName`, `approved` | `reviewComment`, `approvedAt`, `memberUrl` |
| `sendEventRegistrationConfirmation(data)` | `to`, `firstName`, `lastName`, `eventTitle`, `startAt`, `registrationId` | `endAt`, `location`, `eventUrl` |
| `sendHackathonTeamConfirmation(data)` | `to`, `leaderFirstName`, `leaderLastName`, `teamName`, `hackathonTitle`, `memberCount`, `teamId` | `projectIdea`, `registrationDeadline`, `startDate`, `endDate`, `hackathonUrl` |
| `sendContactNotification(data)` | `name`, `email`, `subject`, `message`, `messageId`, `receivedAt` | — |
| `sendAdminInvitation(data)` | `to`, `firstName`, `lastName`, `email`, `tempPassword`, `role` | — |
| `sendNewsletterSubscriptionConfirmation(data)` | `to`, `subscribedAt` | `firstName` |
| `sendAnnouncement(data)` | `to`, `subject`, `contentHtml`, `unsubscribeUrl` | `firstName` |
| `sendResetPassword(data)` | `to`, `firstName`, `lastName`, `email`, `resetUrl` | — |
| `sendHackathonTeamStatus(data)` | `to`, `leaderFirstName`, `leaderLastName`, `teamName`, `hackathonTitle`, `approved` | `reviewComment`, `startDate`, `endDate`, `hackathonUrl` |
| `sendNewsletterUnsubscribeConfirmation(data)` | `to`, `unsubscribedAt` | `firstName` |

---

## Call-Site Analysis

### 1. `src/modules/members/members.service.ts`

#### Call 1 — `sendMemberApplicationConfirmation` (line ~108)

```typescript
void this.mailService.sendMemberApplicationConfirmation({
  to: dto.representativeEmail,           // ✅ string
  representativeName: dto.representativeName, // ✅ string
  companyName: dto.companyName,          // ✅ string
  sectors: dto.sectors ?? [],            // ✅ string[]
  applicationId: String(doc._id),        // ✅ string
});
```

**Status: ✅ OK** — all required fields present, types correct.

---

#### Call 2 — `sendMemberApplicationReview` (line ~228)

```typescript
void this.mailService.sendMemberApplicationReview({
  to: application.representativeEmail,           // ✅ string
  representativeName: application.representativeName, // ✅ string
  companyName: application.companyName,          // ✅ string
  approved: dto.status === 'APPROVED',           // ✅ boolean
  reviewComment: dto.reviewComment,              // ✅ optional string
  approvedAt: dto.status === 'APPROVED' ? new Date().toLocaleDateString('fr-FR') : undefined, // ✅ optional string
  // memberUrl: NOT passed                        ⚠️ optional — OK but link won't appear in email
});
```

**Status: ✅ OK** (with observation)  
All four required fields are present. `memberUrl` is intentionally optional and its absence is valid. The approval email template will not include a direct link to the member profile page unless this field is added in a future iteration.

---

### 2. `src/infrastructure/queues/announcement.processor.ts`

#### Call 3 — `sendAnnouncement` (line ~94)

```typescript
await this.mailService.sendAnnouncement({
  to: recipient.email,          // ✅ string
  firstName: recipient.firstName, // ✅ optional string
  subject: announcement.subject,  // ✅ string
  contentHtml: announcement.contentHtml, // ✅ string
  unsubscribeUrl,                 // ✅ string (built from publicUrl + token)
});
```

**Status: ✅ OK** — all required fields present, optional `firstName` supplied.

---

### 3. `src/modules/health/health.controller.ts`

#### Call 4 — `send` (line ~60)

```typescript
await this.mailService.send(
  {
    to: dto.to,                               // ✅ string
    subject: 'Test email - Mountains Tech',   // ✅ string
    template: 'contact-acknowledgment',       // ✅ string
    context: {
      name: 'Test',
      subject: 'Test email depuis le backend',
      messageId: 'TEST-001',
      receivedAt: new Date().toLocaleString('fr-FR'),
    },                                         // ✅ Record<string, unknown>
  },
  true,                                        // ✅ throwOnError = true
);
```

**Status: ✅ OK** — both parameters fully match `send(options: SendMailOptions, throwOnError = false)`.

---

### 4. `src/modules/newsletter/newsletter.service.ts`

#### Calls 5 & 6 — `sendNewsletterSubscriptionConfirmation` (lines ~31 and ~48)

Both calls are identical in shape:

```typescript
void this.mailService.sendNewsletterSubscriptionConfirmation({
  to: dto.email,                                    // ✅ string
  firstName: dto.firstName,                          // ✅ optional string
  subscribedAt: new Date().toLocaleDateString('fr-FR'), // ✅ string
});
```

**Status: ✅ OK** — required `to` and `subscribedAt` present, optional `firstName` supplied.

---

#### Calls 7 & 8 — `sendNewsletterUnsubscribeConfirmation` (lines ~65 and ~84)

Both calls are identical in shape (one in `unsubscribe`, one in `unsubscribeByToken`):

```typescript
void this.mailService.sendNewsletterUnsubscribeConfirmation({
  to: sub.email,                                      // ✅ string
  firstName: sub.firstName,                           // ✅ optional string
  unsubscribedAt: new Date().toLocaleDateString('fr-FR'), // ✅ string
});
```

**Status: ✅ OK** — required `to` and `unsubscribedAt` present, optional `firstName` supplied.

---

### 5. `src/modules/contacts/contacts.service.ts`

#### Call 9 — `sendContactNotification` (line ~29)

```typescript
void this.mailService.sendContactNotification({
  name: dto.name,         // ✅ string
  email: dto.email,       // ✅ string
  subject: dto.subject,   // ✅ string
  message: dto.message,   // ✅ string
  messageId: String(doc._id), // ✅ string
  receivedAt: new Date().toLocaleString('fr-FR'), // ✅ string
});
```

**Status: ✅ OK** — all six required fields present.

---

### 6. `src/modules/events/events.service.ts`

#### Call 10 — `sendEventRegistrationConfirmation` (line ~123)

```typescript
void this.mailService.sendEventRegistrationConfirmation({
  to: dto.email,                              // ✅ string
  firstName: dto.firstName,                   // ✅ string
  lastName: dto.lastName,                     // ✅ string
  eventTitle: event.title,                    // ✅ string
  startAt: event.startAt.toLocaleString('fr-FR'), // ✅ string
  endAt: event.endAt?.toLocaleString('fr-FR'),   // ✅ optional string
  location: event.location ?? 'À définir',    // ✅ optional string
  registrationId: String(doc._id),            // ✅ string
  // eventUrl: NOT passed                      ℹ️ optional — OK
});
```

**Status: ✅ OK** — all six required fields present, two optionals supplied, one optional `eventUrl` omitted (valid).

---

### 7. `src/modules/hackathons/hackathons.service.ts`

#### Call 11 — `sendHackathonTeamConfirmation` (line ~127)

```typescript
void this.mailService.sendHackathonTeamConfirmation({
  to: dto.leader.email,                  // ✅ string
  leaderFirstName: dto.leader.firstName, // ✅ string
  leaderLastName: dto.leader.lastName,   // ✅ string
  teamName: dto.teamName,                // ✅ string
  hackathonTitle: hackathon.title,       // ✅ string
  memberCount: 1 + (dto.members?.length ?? 0), // ✅ number
  projectIdea: dto.projectIdea,          // ✅ optional string
  teamId: String(doc._id),              // ✅ string
  registrationDeadline: hackathon.registrationDeadline?.toLocaleDateString('fr-FR'), // ✅ optional string
  startDate: hackathon.startDate?.toLocaleDateString('fr-FR'),  // ✅ optional string
  endDate: hackathon.endDate?.toLocaleDateString('fr-FR'),      // ✅ optional string
  // hackathonUrl: NOT passed             ℹ️ optional — OK
});
```

**Status: ✅ OK** — all seven required fields present, optionals supplied or omitted validly.

---

#### Call 12 — `sendHackathonTeamStatus` (line ~303)

```typescript
void this.mailService.sendHackathonTeamStatus({
  to: team.leader.email,                 // ✅ string
  leaderFirstName: team.leader.firstName, // ✅ string
  leaderLastName: team.leader.lastName,  // ✅ string
  teamName: team.teamName,               // ✅ string
  hackathonTitle: hackathon?.title ?? '', // ✅ string
  approved: dto.status === 'APPROVED',   // ✅ boolean
  reviewComment: dto.reviewComment,      // ✅ optional string
  startDate: hackathon?.startDate?.toLocaleDateString('fr-FR'), // ✅ optional string
  endDate: hackathon?.endDate?.toLocaleDateString('fr-FR'),     // ✅ optional string
  // hackathonUrl: NOT passed             ℹ️ optional — OK
});
```

**Status: ✅ OK** — all six required fields present, optionals supplied or omitted validly.

---

### 8. `src/modules/users/users.controller.ts` (`PasswordResetController`)

#### Call 13 — `sendResetPassword` (line ~191)

```typescript
void this.mailService.sendResetPassword({
  to: result.user.email,          // ✅ string
  firstName: result.user.firstName, // ✅ string
  lastName: result.user.lastName,   // ✅ string
  email: result.user.email,         // ✅ string
  resetUrl,                         // ✅ string (built from adminUrl + token)
});
```

**Status: ✅ OK** — all five required fields present.

---

## Consolidated Results Table

| # | Caller file | Method called | Arguments | Status |
|---|---|---|---|---|
| 1 | `modules/members/members.service.ts` | `sendMemberApplicationConfirmation` | to, representativeName, companyName, sectors, applicationId | ✅ OK |
| 2 | `modules/members/members.service.ts` | `sendMemberApplicationReview` | to, representativeName, companyName, approved, reviewComment, approvedAt *(memberUrl omitted)* | ✅ OK ⚠️ note |
| 3 | `infrastructure/queues/announcement.processor.ts` | `sendAnnouncement` | to, firstName, subject, contentHtml, unsubscribeUrl | ✅ OK |
| 4 | `modules/health/health.controller.ts` | `send` | to, subject, template, context, throwOnError=true | ✅ OK |
| 5 | `modules/newsletter/newsletter.service.ts` | `sendNewsletterSubscriptionConfirmation` | to, firstName, subscribedAt (re-subscribe path) | ✅ OK |
| 6 | `modules/newsletter/newsletter.service.ts` | `sendNewsletterSubscriptionConfirmation` | to, firstName, subscribedAt (new subscribe path) | ✅ OK |
| 7 | `modules/newsletter/newsletter.service.ts` | `sendNewsletterUnsubscribeConfirmation` | to, firstName, unsubscribedAt (`unsubscribe` method) | ✅ OK |
| 8 | `modules/newsletter/newsletter.service.ts` | `sendNewsletterUnsubscribeConfirmation` | to, firstName, unsubscribedAt (`unsubscribeByToken` method) | ✅ OK |
| 9 | `modules/contacts/contacts.service.ts` | `sendContactNotification` | name, email, subject, message, messageId, receivedAt | ✅ OK |
| 10 | `modules/events/events.service.ts` | `sendEventRegistrationConfirmation` | to, firstName, lastName, eventTitle, startAt, endAt, location, registrationId | ✅ OK |
| 11 | `modules/hackathons/hackathons.service.ts` | `sendHackathonTeamConfirmation` | to, leaderFirstName, leaderLastName, teamName, hackathonTitle, memberCount, projectIdea, teamId, registrationDeadline, startDate, endDate | ✅ OK |
| 12 | `modules/hackathons/hackathons.service.ts` | `sendHackathonTeamStatus` | to, leaderFirstName, leaderLastName, teamName, hackathonTitle, approved, reviewComment, startDate, endDate | ✅ OK |
| 13 | `modules/users/users.controller.ts` | `sendResetPassword` | to, firstName, lastName, email, resetUrl | ✅ OK |

---

## Observations & Recommendations

### ⚠️ Observation 1 — `memberUrl` never passed to `sendMemberApplicationReview`

**File:** `src/modules/members/members.service.ts`, call at `updateApplicationStatus`  
**Impact:** Low. The field is optional so no runtime error occurs. However, when an application is approved, the template `member-application-review.hbs` cannot render a "view your member profile" link because `memberUrl` will be `undefined`. If the template currently guards this with a Handlebars `{{#if memberUrl}}` block, the email silently skips the link. If it renders it unconditionally, it will show an empty href.  
**Recommendation:** Build and pass `memberUrl` once the member record exists (the slug is available after `promoteApplicationToMember` runs), e.g.:

```typescript
memberUrl: dto.status === 'APPROVED'
  ? `${this.siteUrl}/members/${slug}`
  : undefined,
```

This requires either returning the slug from `promoteApplicationToMember` or doing a lookup after the fact.

---

### ℹ️ Observation 2 — `sendAdminInvitation` defined but never called

**File:** `src/infrastructure/mail/mail.service.ts`  
**Impact:** None at runtime. The method is dead code.  
**Recommendation:** Either wire it up in `UsersService.create` (or a dedicated invitation flow), or remove it to avoid confusion. The corresponding template `admin-invitation.hbs` likely also has no active caller.

---

### ℹ️ Observation 3 — `hackathonUrl` and `eventUrl` never passed

Both `sendHackathonTeamConfirmation`, `sendHackathonTeamStatus`, and `sendEventRegistrationConfirmation` accept an optional URL back to the resource on the public site. None of the callers supply it. This mirrors observation 1 — templates that use `{{#if hackathonUrl}}` / `{{#if eventUrl}}` will silently omit the link. Not a bug, but the emails lack a CTA link to the event/hackathon page.

---

## Conclusion

**No functional bugs were found.** Every call site uses the correct method name and supplies all required arguments with the correct types. The only actionable issue is that the optional `memberUrl` field on approval emails is never populated, which means approved members do not receive a clickable link to their profile. Everything else is working as designed.
