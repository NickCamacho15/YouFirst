# Community Challenges (Opt‑In) — Implemented

**Date:** 2026-01-17  
**Scope:** Mobile + Supabase (Postgres/RLS/RPC)  
**Goal:** Allow users to **opt in/join community challenges** while keeping the existing “personal challenge” experience, and allow admins to publish challenges to **Group** or **Global** audiences.

---

## Summary (What shipped)

### 1) One unified “Create Challenge” flow

The app now has **one Create Challenge modal** that supports **Visibility**:

- **Personal**: creates a personal challenge (stored in `public.user_challenges`).
- **Group**: (admins in a group) publishes a community challenge to the admin’s group and **auto‑joins** the creator.
- **Global**: (admins) publishes a community challenge globally and **auto‑joins** the creator.

### 2) Community challenges are templates under the hood

Community challenges must be joinable by many users, so they’re represented as **templates**:

- Published templates live in `public.challenge_templates`.
- When a user taps **Join**, we clone the template into `public.user_challenges` (so all existing progress/calendar logic continues to work unchanged).

### 3) Security is enforced in the database

- **RLS** controls who can see and modify templates.
- A **Security Definer RPC** (`public.join_challenge_template`) performs “join” safely server-side and returns the resulting `user_challenges.id`.

---

## Database changes (Supabase Postgres)

### Migration: `docs/migrations/009-challenge-templates-and-join.sql`

Adds:

- `public.challenge_templates`
  - `scope`: `'global' | 'group'`
  - `status`: `'draft' | 'published' | 'archived'`
  - `start_mode`: `'rolling' | 'fixed'` (fixed requires `start_date`)
  - `rules`: `text[]`
  - indices for `status`, `(scope,status)`, `(group_id,status)` etc.
- `public.global_challenge_publishers` (optional allowlist; still supported)
- `public.user_challenges.template_id` (nullable) + unique constraint `(user_id, template_id)` to prevent double-joining the same template.
- RLS policies for templates (read published global, read published group for members, creator can read own, admins can manage group templates).
- RPC:
  - `public.join_challenge_template(p_template_id uuid) returns uuid`
  - Validates published + scope access
  - Computes start date (rolling = today; fixed = `start_date` with optional join window)
  - Inserts into `user_challenges` (idempotent on `(user_id, template_id)`)

**Note:** During rollout, a constraint-name collision was fixed by renaming internal check constraints to be idempotent.

### Migration: `docs/migrations/010-challenge-templates-global-admins.sql`

Updates:

- RLS policy `challenge_templates_cud_global_publisher` to allow **any admin** (`current_user_role()='admin'`) to create/publish **global** templates (allowlist remains as an additional option).

### Applied to production database

Migration `009` and `010` were executed via `psql` against the Supabase pooler.

Verification performed:

- `public.challenge_templates` exists
- `public.global_challenge_publishers` exists
- `public.user_challenges.template_id` exists
- `public.join_challenge_template(uuid)` exists
- Policy `challenge_templates_cud_global_publisher` contains the admin clause

---

## Mobile changes

### New file: `mobile/lib/challenge-templates.ts`

Adds client helpers:

- `listPublishedChallengeTemplates()`
- `joinChallengeTemplate(templateId)`
- `canPublishGlobalChallengeTemplates()` (still supported; admins are treated as allowed in UI)
- `createChallengeTemplate({ scope, groupId?, ... })`
- `setChallengeTemplateStatus(templateId, status)`

### Updated file: `mobile/lib/challenges.ts`

Extends `ChallengeRow`:

- `template_id?: string | null`

### Updated file: `mobile/screens/DisciplinesScreen.tsx`

Changes:

- Adds **Community** tab (with “glimmer/pulse dot” when unjoined community challenges exist).
- Community tab lists published templates and supports **Join**.
- **Create Challenge modal is unified** and includes a **Visibility** selector:
  - Personal / Group / Global
- For Group/Global:
  - Creates a template
  - Publishes immediately
  - Auto-joins creator
  - Returns user to the Challenge tab where the new joined challenge appears
- Admins automatically have “Global” publishing enabled in the UI.

---

## How to use (current UX)

### Join a community challenge

- **Disciplines → Community** → tap **Join** on a challenge card  
  The challenge appears in **Disciplines → Challenge** as a normal challenge.

### Create a personal challenge

- **Disciplines → Challenge** → “Start New Challenge”  
  In the modal, choose **Visibility: Personal** (default).

### Create a group community challenge (admin)

- Must be `users.role='admin'` and have `users.group_id` set  
- **Disciplines → Community** → “+” → **Visibility: Group** → Create  
  This publishes to the group and auto-joins the creator.

### Create a global community challenge (admin)

- Must be `users.role='admin'`  
- **Disciplines → Community** → “+” → **Visibility: Global** → Create  
  This publishes globally and auto-joins the creator.

---

## Follow-ups / Nice-to-haves

- Add “fixed start” inputs (start date / join deadline) to the unified modal (DB already supports it).
- Add edit/unpublish UI for templates (currently creation is “publish immediately” for simplicity).
- Add participant counts / leaderboard: derive from `user_challenges` where `template_id = ...`.

