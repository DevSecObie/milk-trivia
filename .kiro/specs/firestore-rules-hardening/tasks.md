# Implementation Plan: Firestore Rules Hardening

## Overview

This plan implements the rules hardening described in `design.md`. Tasks are ordered security-first: the bootstrap of test infrastructure happens in parallel in Wave 0, the new `firestore.rules` is authored in Wave 1 against that infrastructure, the rules-unit-test suites land in parallel in Wave 2, the small client runtime guard ships in Wave 3, local verification + checkpoint runs in Wave 4, and production deploy + post-deploy monitoring close out Wave 5.

The design uses JavaScript (Vite/React + Vitest), so all implementation tasks are written in JavaScript. No language selection question is needed.

The tests under Wave 2 reference R-numbered names (e.g. `R2.4`, `R4.6`, `R6.4`) so the test file is self-documenting against the requirements document. The "rules deny arbitrary integrity-field writes" tests called out in Requirement 8.3 are deferred per the design's [Integrity-Write Path Decision](./design.md#integrity-write-path-decision); they are written as `it.todo(...)` placeholders in this iteration and are explicitly NOT to be authored as full assertions, since they will only pass once the future Server_Recompute_Path migration lands.

## Tasks

- [x] 1. Bootstrap rules test infrastructure
  - [x] 1.1 Add Firestore emulator block to `firebase.json`
    - Edit `firebase.json` to add the `emulators` block exactly as specified in design.md → [`firebase.json` — emulator config](./design.md#firebasejson--emulator-config) (Firestore on port 8080, UI disabled, `singleProjectMode: true`).
    - Do not modify the existing `firestore` or `hosting` blocks.
    - _Requirements: 8.1, 8.12_

  - [x] 1.2 Add devDependencies and `test:rules` script to `package.json`
    - Add `firebase-tools`, `@firebase/rules-unit-testing`, and `vitest` to `devDependencies` per design.md → [`package.json` — additions](./design.md#packagejson--additions).
    - Add the script: `"test:rules": "firebase emulators:exec --only firestore --project=demo-milk-trivia \"vitest run tests/rules\""`.
    - Run `npm install` to update `package-lock.json`.
    - _Requirements: 8.1, 8.2, 8.12_

  - [x] 1.3 Create `tests/rules/helpers.js` test helper
    - Create the file at `tests/rules/helpers.js` with the exact content specified in design.md → [Rules test suite layout](./design.md#rules-test-suite-layout) (`getTestEnv`, `resetTestEnv`, `teardown`, `dbAs`, `seed`).
    - _Requirements: 8.1, 8.12_

- [x] 2. Author the new `firestore.rules` content
  - [x] 2.1 Replace `firestore.rules` with the proposed content
    - Replace the entire contents of `firestore.rules` with the rules block specified in design.md → [`firestore.rules` — proposed content](./design.md#firestorerules--proposed-content).
    - Include all helper functions (`isAuthed`, `isSelf`, the user-doc field-set helpers, the duel field-set helpers, role helpers, shape validation, transition predicates, join handshake) exactly as written.
    - Do NOT add any rules predicates that are not in the design block.
    - The `users/{userId}` `allow update` rule MUST use `integrityFieldsValid()` as defined in the design (the looser predicate that only forbids unknown fields), not the stricter `!changedKeys().hasAny(integrityFields())` form, because this iteration uses the Documented_Tradeoff_Path.
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 2.1, 2.2, 2.3, 2.5, 2.6, 2.7, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8_

- [x] 3. Author the rules unit test suites
  - [x] 3.1 Create `tests/rules/firestore.rules.test.js` with the users-doc suite
    - Create `tests/rules/firestore.rules.test.js` with the imports, `beforeAll` / `beforeEach` / `afterAll` lifecycle hooks, and a top-level `describe('users/{uid} rules', ...)` suite, following the signature sketch in design.md → [Rules test suite layout](./design.md#rules-test-suite-layout).
    - Inside the users suite, write the following named `it(...)` cases as full assertions using `assertSucceeds` / `assertFails`:
      - `R1.1: owner can read own user doc`
      - `R1.2: owner can delete own user doc`
      - `R1.3: authenticated user can read another user's doc (leaderboard read)`
      - `R2.5: unauthenticated user cannot read any user doc`
      - `R2.6: cross-uid write is denied`
      - `R2.7: rejects user-doc update with unknown field (e.g. isAdmin)`
      - `R2.1: owner can update each Client_Writable_User_Field (displayName, settings, dailyGoal, theme, sound, missed, activeGame, updatedAt)`
      - `R2.3: rejects user-doc create with an Integrity_Field at non-default value (e.g. xp: 999)`
      - `R2.3: allows user-doc create when Integrity_Fields are at documented defaults`
    - Add the deferred Requirement-2.4 / Requirement-8.3 tests as `it.todo(...)` placeholders only — DO NOT write full assertions for these. Specifically, add:
      - `it.todo('R2.4: rejects user-doc update that increases xp — deferred to Server_Recompute_Path migration')`
      - `it.todo('R2.4: rejects user-doc update that increases level — deferred to Server_Recompute_Path migration')`
      - `it.todo('R2.4: rejects user-doc update that increases survivalBest — deferred to Server_Recompute_Path migration')`
      - `it.todo('R2.4: rejects user-doc update that increases speedBest — deferred to Server_Recompute_Path migration')`
      - `it.todo('R8.3: rejects arbitrary Integrity_Field writes — deferred to Server_Recompute_Path migration')`
    - Add a comment block above the `it.todo` group pointing to design.md → [Residual risk under the chosen path](./design.md#residual-risk-under-the-chosen-path) so future readers understand why these are placeholders.
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.3, 2.5, 2.6, 2.7, 8.3, 8.4_

  - [x] 3.2 Add the duel-create suite
    - In the same file, append `describe('duels/{duelId} create rules', ...)` with these `it(...)` cases:
      - `R5.1: allows valid duel create with all required fields at correct defaults`
      - `R5.1 / R4.1: rejects create when hostUid != request.auth.uid`
      - `R5.1: rejects create with hostScore != 0`
      - `R5.1: rejects create with empty questions list`
      - `R5.1: rejects create with questions list of size > 100`
      - `R5.7: rejects create with an extra unknown field`
      - `R5.1: rejects create when totalRounds != questions.size()`
      - `R5.1: rejects create with status != 'waiting'`
      - `R5.1: rejects create with non-null guestUid at create time`
    - Use `seed(...)` from helpers when arrange-state needs to bypass rules.
    - _Requirements: 5.1, 5.7, 8.10_

  - [x] 3.3 Add the duel-update participants/owned-fields suite
    - Append `describe('duels/{duelId} update rules — participants', ...)` with:
      - `R4.2: host can update hostScore, hostAnswers, hostReady (host-owned)`
      - `R1.7: host can update currentRound and status (shared, valid transition)`
      - `R4.4: host cannot modify guestScore`
      - `R4.4: host cannot modify guestAnswers`
      - `R4.4: host cannot modify guestReady`
      - `R4.3: guest can update guestScore, guestAnswers, guestReady (guest-owned)`
      - `R4.5: guest cannot modify hostScore`
      - `R4.5: guest cannot modify hostAnswers`
      - `R4.5: guest cannot modify hostReady`
      - `R4.1: non-participant authenticated user cannot update any field`
      - `R8.5: unauthenticated user cannot update any field`
    - _Requirements: 1.7, 4.1, 4.2, 4.3, 4.4, 4.5, 8.5, 8.6_

  - [x] 3.4 Add the duel-join handshake suite
    - Append `describe('duels/{duelId} update rules — join handshake', ...)` with:
      - `R4.6: third-party user can claim a waiting duel by setting guestUid=self and guestName`
      - `R4.6: rejects join when an additional non-join field is also being changed`
      - `R4.6: host cannot self-join (host setting guestUid=self is denied)`
      - `R4.8: rejects setting guestUid to a uid other than request.auth.uid`
      - `R4.7: rejects overwriting an already-non-null guestUid (R8.9)`
    - _Requirements: 4.6, 4.7, 4.8, 8.9_

  - [x] 3.5 Add the duel-immutability and transitions suite
    - Append `describe('duels/{duelId} update rules — immutability and transitions', ...)` with:
      - `R6.1: rejects mutation of hostUid (R8.8)`
      - `R6.1: rejects mutation of hostName`
      - `R6.1: rejects mutation of questions (R8.8)`
      - `R6.1: rejects mutation of totalRounds (R8.8)`
      - `R6.1: rejects mutation of createdAt (R8.8)`
      - `R6.4: rejects status transition playing -> waiting`
      - `R6.4: rejects status transition finished -> playing`
      - `R6.4: rejects status transition finished -> waiting`
      - `R6.4: allows status transition waiting -> playing`
      - `R6.4: allows status transition playing -> finished`
      - `R6.4: allows status transition waiting -> finished (host abandons)`
      - `R6.2: currentRound cannot decrease (R8.7)`
      - `R6.3: currentRound cannot increase by more than 1 (R8.7)`
      - `R6.5: hostScore cannot decrease`
      - `R6.6: guestScore cannot decrease`
      - `R6.7: hostAnswers size cannot decrease`
      - `R6.8: guestAnswers size cannot decrease`
      - `R5.2: rejects update with hostScore > totalRounds`
      - `R5.5: rejects update with currentRound > totalRounds`
      - `R5.6: rejects update with status not in {'waiting','playing','finished'}`
    - _Requirements: 5.2, 5.3, 5.4, 5.5, 5.6, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 8.7, 8.8_

  - [x] 3.6 Add the duel-delete suite and the legitimate-end-to-end-flow suite
    - Append `describe('duels/{duelId} delete rules', ...)` with:
      - `R1.6 / R4.9: host can delete own duel`
      - `R4.9: guest cannot delete duel`
      - `R4.9: non-participant cannot delete duel`
    - Append `describe('legitimate end-to-end flows', ...)` covering the Requirement 8.11 path:
      - `R8.11: full duel lifecycle (create -> guest joins -> alternating answer submissions -> status finishes) is allowed under the new rules`
    - _Requirements: 1.6, 4.9, 8.11_

- [x] 4. Add the client-side runtime guard in `saveUserData`
  - [x] 4.1 Add an `allKnownUserFields` whitelist guard in `firestoreService.js → saveUserData`
    - Per design.md → [Client refactor surface](./design.md#client-refactor-surface) call site #2, add a runtime assertion in `saveUserData(uid, data)` that throws if any key in `data` is not in `allKnownUserFields` (the union of `Client_Writable_User_Fields` and `Integrity_Fields` from Requirements 2.1 and 2.2).
    - Define the whitelist as a module-level constant in `firestoreService.js` so it can be reused by future callers.
    - The throw should be a clear `Error` with a message naming the offending key (e.g. `"saveUserData: unknown field 'isAdmin' is not in allKnownUserFields"`), so a future regression fails loudly in dev rather than producing a silent `permission-denied` from rules in prod.
    - Do NOT change any other call site in this iteration. Per the chosen Documented_Tradeoff_Path, `addSession`, `updateUserFields`, and the `storage.js` integrity-field writers continue to function unchanged.
    - _Requirements: 2.1, 2.2, 9.1, 9.2_

- [x] 5. Verify the leaderboard 50-cap is still enforced client-side
  - [x] 5.1 Confirm `getLeaderboard` caps results at 50
    - Open `src/lib/firestoreService.js → getLeaderboard` and confirm the existing `limit(maxResults)` clause is intact and that `maxResults` defaults to 50.
    - Because `maxResults` is a caller-provided parameter, also confirm no caller passes a value greater than 50. Search for `getLeaderboard(` across the repo; if any call site passes a numeric argument > 50 (or could, via user input), clamp the value with `const cap = Math.min(50, maxResults)` and use `cap` in the `limit(...)` call.
    - This satisfies Requirement 1.3, which is enforced client-side per design.md → [`firestore.rules` — proposed content](./design.md#firestorerules--proposed-content) note on the user-doc `allow read` rule.
    - _Requirements: 1.3_

- [x] 6. Local verification checkpoint
  - [x] 6.1 Run the rules unit test suite locally
    - Run `npm run test:rules` and confirm all enabled tests pass. The `it.todo(...)` placeholders from task 3.1 should appear as pending, not as failures.
    - If any test fails, fix the rules predicate or the test (whichever is wrong per design.md), do not weaken the rules to satisfy a buggy test.
    - _Requirements: 8.1, 8.2, 8.12_

  - [ ]* 6.2 Manual smoke against the Firestore emulator
    - With the emulator still running (or via a fresh `firebase emulators:start --only firestore`), use a quick `node` REPL or a scratch script to: (a) create a user doc with defaults, (b) update `displayName`, (c) attempt to update `xp` (note: succeeds under Documented_Tradeoff_Path; this is the documented residual risk, not a regression), (d) attempt to update `isAdmin` (must fail), (e) create a duel, join from a second auth context, submit a host answer and a guest answer, finish the duel, delete the duel as host.
    - Capture any unexpected `permission-denied` errors and reconcile them with the design before proceeding to deploy.
    - _Requirements: 8.11_

  - [x] 6.3 Checkpoint - Ensure all tests pass
    - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Documentation
  - [x] 7.1 Add a "Rules tests" section to `README.md`
    - Add a short README section describing how to run `npm run test:rules`, the Node ≥ 20 requirement (per design.md → [`package.json` — additions](./design.md#packagejson--additions)), and a one-line note that the suite uses the local Firestore emulator with no real Firebase credentials.
    - Link from this section to `tests/rules/firestore.rules.test.js` and to `.kiro/specs/firestore-rules-hardening/design.md`.
    - _Requirements: 8.1, 8.12_

- [x] 8. Production deploy
  - [x] 8.1 Deploy `firestore.rules` to production
    - Per design.md → [Deployment Plan](./design.md#deployment-plan), run `firebase deploy --only firestore:rules`.
    - Verify in the Firebase console (Firestore → Rules) that the new rules content matches `firestore.rules` from this branch.
    - The hosting deploy is not gated by this spec; defer it unless the runtime guard from task 4.1 is needed in production at the same time.
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

  - [ ]* 8.2 Post-deploy monitoring
    - Per design.md → [Post-deploy monitoring](./design.md#post-deploy-monitoring), watch the Firebase console Firestore usage panel for `permission-denied` spikes for the first 24 hours.
    - Self-test the deployed app in two incognito profiles end-to-end (host duel, join, finish, delete; update display name; view leaderboard). Confirm no unexpected denies in the browser console.
    - If any legitimate flow fails, treat as P0 and roll back per design.md → [Rollback](./design.md#rollback).
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

## Notes

- Tasks marked with `*` are optional manual / verification tasks (manual smoke, post-deploy monitoring). They are not implemented by the coding agent; a human runs them.
- Each task references specific requirement clauses (Requirements 1–9) for traceability.
- Test cases under tasks 3.1–3.6 carry `R{requirement}.{clause}` prefixes (e.g. `R2.4`, `R4.6`, `R6.4`) so the test names are self-documenting against the requirements document.
- The `it.todo(...)` placeholders in task 3.1 are deliberate per the design's chosen Documented_Tradeoff_Path; they MUST NOT be written as full assertions until the future `integrity-fields-server-recompute` migration lands.
- Property-based tests are intentionally not included; per design.md → [Why no property-based tests](./design.md#why-no-property-based-tests), this spec covers configuration validation that is better tested by enumerated examples.
- Checkpoints (task 6.3) ensure incremental validation before the rules change reaches production.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["3.1", "3.2", "3.3", "3.4", "3.5", "3.6"] },
    { "id": 3, "tasks": ["4.1", "5.1", "7.1"] },
    { "id": 4, "tasks": ["6.1", "6.2"] },
    { "id": 5, "tasks": ["8.1", "8.2"] }
  ]
}
```
