# Strenova Coach Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add secure role switching, coach-client collaboration, nutrition target history, editable programs and schedules, and bounded loading to the existing Strenova site.

**Architecture:** Retain the current single-page frontend and Supabase tables. Add one backward-compatible SQL migration with authenticated RPCs and RLS policies, a small testable frontend core module, and a browser adapter loaded by the existing index page. Keep the existing owner/Plus pathways untouched.

**Tech Stack:** HTML, CSS, browser JavaScript (ES modules), Node built-in test runner, Supabase PostgreSQL/RLS/RPC, GitHub Pages.

**Spec:** `docs/superpowers/specs/strenova-coach-management-design.md`

## Global Constraints
- Preserve the current design and working routes.
- Keep the `admin` role and owner/Plus authorization unchanged.
- Do not delete accounts, workout history, coach relationships, programs, or subscriptions.
- Role selection is limited to `athlete` and `coach`; the server derives identity from `auth.uid()`.
- All coach access is bounded by an active coach-athlete relationship.
- Do not broaden access to the full `user_profiles.profile` JSON.
- Do not generate calorie deficits or auto-calorie targets; disable automatic macro calculation for clients under 18.
- Use ordered pagination and bounded query limits; retain existing indexes until supported by query-plan evidence.
- Do not apply the migration to production or merge the branch before review.

## Review Focus
- An athlete with an existing active coach attempts a second connection; the request must not create a second active link.
- A stale coach attempts to update schedule or nutrition after the relationship ends; writes must fail.
- A normal user attempts to change their role to `admin`; the request must fail and preserve current roles.
- A client profile contains extra JSON keys; the coach RPC must not disclose them.
- A teen client opens nutrition editing; automatic calorie-to-macro calculation must remain unavailable.

---

### Task 1: Database role, relationship, nutrition, program and schedule safeguards

**Files:**
- Create: `supabase/migrations/20261114150000_strenova_coach_management.sql`
- Create: `supabase/tests/coach_management_contract.test.sql`
- Test: `tests/coach-management-contract.test.js`

**Interfaces:**
- Produces: `switch_account_role(p_role text)`, `request_coach_connection(p_invite_code text)`, `review_coach_connection(p_relationship_id uuid,p_action text)`, `coach_athlete_profile(p_athlete_id uuid)`, `coach_nutrition_targets`, `coach_nutrition_target_history`.
- Extends: RLS for coach-managed schedule rows, program days/exercises and nutrition targets.

- [ ] **Step 1: Write failing contract tests** for role allow-list, owner-bound coach actions, whitelisted profile fields, nutrition history trigger, schedule policy USING/WITH CHECK, and program child ownership.
- [ ] **Step 2: Run the tests** and verify they fail because the migration does not exist.
- [ ] **Step 3: Implement the additive migration**; preserve the legacy invite RPC and current owner/admin functions.
- [ ] **Step 4: Run contract tests** and SQL parsing/static checks.
- [ ] **Step 5: Review the complete migration** for schema qualification, grants, RLS and idempotency.

### Task 2: Testable browser logic for roles, nutrition and bounded queries

**Files:**
- Create: `coach-management-core.js`
- Test: `tests/coach-management-core.test.js`
- Modify: `package.json`

**Interfaces:**
- Produces: `calculateMacrosFromCalories`, `validateNutritionTarget`, `pageBounds`, `escapeHtml`.
- Browser adapter consumes these functions; all inputs are validated before network writes.

- [ ] **Step 1: Write failing Node tests** for macro arithmetic, invalid numbers, minor-client calculation guard, page boundaries and HTML escaping.
- [ ] **Step 2: Run tests** and verify missing-export failures.
- [ ] **Step 3: Implement the pure functions** without browser or network dependencies.
- [ ] **Step 4: Add `npm test` using Node's built-in test runner** and run the suite.
- [ ] **Step 5: Keep the test module isolated** from Supabase credentials and user data.

### Task 3: Trainer and athlete workflows in the existing UI

**Files:**
- Create: `coach-management.js`
- Modify: `index.html`
- Test: `tests/coach-management-ui-contract.test.js`

**Interfaces:**
- Consumes: the core functions from Task 2 and RPC/table interfaces from Task 1.
- Produces: profile role switch, request/accept/reject connection UI, paginated client list, whitelisted client detail, nutrition target editor/history, program editor/assignment, schedule editor/status, and athlete-side synced views.

- [ ] **Step 1: Write failing UI contract tests** for script inclusion, role controls, coach request states, client-only data access, schedule and nutrition actions.
- [ ] **Step 2: Run tests** and verify they fail before UI code is added.
- [ ] **Step 3: Add the browser adapter** using the existing theme and route structure.
- [ ] **Step 4: Wire the adapter into `index.html`** without rewriting the current app or touching owner-panel code.
- [ ] **Step 5: Run syntax and UI contract tests** and inspect every new action for an error/loading state.

### Task 4: Performance, security review and branch handoff

**Files:**
- Modify: `coach-management.js` and any focused tests.
- Review: all files changed in this branch.

- [ ] **Step 1: Verify bounded pagination and cache invalidation** for client lists, workout logs and schedules.
- [ ] **Step 2: Run all Node tests and static checks**.
- [ ] **Step 3: Re-read the migration and frontend as a separate security review**, focusing on the five Review Focus cases.
- [ ] **Step 4: Fix any Critical/Important finding with a failing test first**; record any deferred minor issue.
- [ ] **Step 5: Open a draft pull request** and report what remains blocked pending migration review and browser-based end-to-end tests.

---
