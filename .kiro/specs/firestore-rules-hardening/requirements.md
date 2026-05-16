# Requirements Document

## Introduction

The Milk Trivia app is a React + Firebase web application that uses Firestore for user profiles, gameplay statistics, and real-time multiplayer duels. The current `firestore.rules` file authorizes any authenticated user to write any field on their own user document and to update any duel document, which exposes four exploitable gaps: self-promotion of XP/level/achievements, tampering with other players' duels, unbounded duel creation, and absence of field-shape validation.

This feature hardens the Firestore security rules to close those gaps while preserving the existing user experience (leaderboard reads, profile flow, duel matchmaking, and account deletion). The work is scoped to:

1. Restricting which user-document fields the client may write directly.
2. Restricting and validating duel updates by participant role and field ownership.
3. Constraining duel state transitions (`status`, `currentRound`) and immutability of identity fields.
4. Validating the shape and types of duel fields on create and update.
5. Establishing rate-limiting for duel creation, or documenting why it must live outside rules.
6. Adding emulator-based rules unit tests that prove the gaps are closed and that legitimate flows still work.

A non-goal is redesigning the data model. A secondary, partially in-scope concern is the corresponding client refactor required for any user-document field that becomes server-only — the spec must explore both the cloud-function-recompute path and the documented-tradeoff path and pick one.

## Glossary

- **Rules_Engine**: The Firestore security rules evaluator that authorizes each read, create, update, or delete request against `firestore.rules`.
- **User_Doc**: A document at path `users/{userId}` representing one player's profile, settings, and aggregated stats.
- **Duel_Doc**: A document at path `duels/{duelId}` representing one head-to-head multiplayer game between a host and a guest.
- **Host**: The authenticated user whose UID equals `Duel_Doc.hostUid`. Created the duel.
- **Guest**: The authenticated user whose UID equals `Duel_Doc.guestUid`. Joined an existing duel.
- **Participant**: A `Host` or `Guest` of a given `Duel_Doc`.
- **Client_Writable_User_Fields**: The set of `User_Doc` fields the client is permitted to write directly. Defined in Requirement 2.
- **Integrity_Fields**: The set of `User_Doc` fields that must not be writable by the client because they determine leaderboard ranking, XP, or achievement state. Defined in Requirement 2.
- **Host_Owned_Fields**: Duel fields a `Host` is allowed to mutate: `hostScore`, `hostAnswers`, `hostReady`.
- **Guest_Owned_Fields**: Duel fields a `Guest` is allowed to mutate: `guestScore`, `guestAnswers`, `guestReady`.
- **Shared_Fields**: Duel fields either `Participant` is allowed to mutate under constraint: `currentRound`, `status`.
- **Immutable_Duel_Fields**: Duel fields that may not change after the document is created or, for `guestUid`/`guestName`, after first being set to a non-null value: `hostUid`, `hostName`, `guestUid` (post-join), `guestName` (post-join), `questions`, `totalRounds`, `createdAt`.
- **Rules_Test_Suite**: An automated test suite using `@firebase/rules-unit-testing` that exercises `firestore.rules` against the Firestore emulator.
- **Server_Recompute_Path**: A design option in which `Integrity_Fields` are written only by a Cloud Function trigger that recomputes them from immutable session writes.
- **Documented_Tradeoff_Path**: A design option in which `Integrity_Fields` remain client-writable for now, with the gap explicitly documented and gated by a future migration.

## Requirements

### Requirement 1: Preserve existing legitimate flows

**User Story:** As a Milk Trivia player, I want my normal app interactions to keep working, so that the security tightening does not regress my experience.

#### Acceptance Criteria

1. THE Rules_Engine SHALL allow an authenticated user to read their own User_Doc.
2. THE Rules_Engine SHALL allow an authenticated user to delete their own User_Doc.
3. THE Rules_Engine SHALL allow any authenticated user to read any User_Doc when the read is part of a leaderboard query ordered by `xp`, `survivalBest`, or `speedBest` and limited to at most 50 results.
4. THE Rules_Engine SHALL allow any authenticated user to read any Duel_Doc.
5. THE Rules_Engine SHALL allow any authenticated user to create a Duel_Doc that satisfies the duel-shape validation defined in Requirement 5.
6. THE Rules_Engine SHALL allow the Host of a Duel_Doc to delete that Duel_Doc.
7. THE Rules_Engine SHALL allow a Participant to update Shared_Fields when the update satisfies the transition rules defined in Requirement 6.

### Requirement 2: Block client writes to integrity-critical user fields

**User Story:** As the operator of the leaderboard, I want the client to be unable to write XP, level, achievements, or aggregated stats directly, so that leaderboard rankings and achievement state are trustworthy.

#### Acceptance Criteria

1. THE Rules_Engine SHALL define Client_Writable_User_Fields as exactly: `displayName`, `settings`, `dailyGoal`, `missed`, `theme`, `sound`, `activeGame`, `updatedAt`, `createdAt`.
2. THE Rules_Engine SHALL define Integrity_Fields as exactly: `xp`, `level`, `title`, `totalAnswered`, `totalCorrect`, `streak`, `survivalBest`, `speedBest`, `achievements`, `sessions`, `questionStats`, `levelUp`, `dailyProgress`, `qotdHistory`, `dailyGoalDays`.
3. WHEN an authenticated user creates their own User_Doc, THE Rules_Engine SHALL allow the create only if every field present in the new document is either a Client_Writable_User_Field or an Integrity_Field initialized to its documented default value.
4. WHEN an authenticated user updates their own User_Doc, THE Rules_Engine SHALL reject the update if any Integrity_Field changes value.
5. IF a request to read, write, or delete any User_Doc has no authenticated principal, THEN THE Rules_Engine SHALL deny the request before evaluating ownership.
6. IF an authenticated user attempts to write or delete a User_Doc whose document ID does not equal the requester's UID, THEN THE Rules_Engine SHALL deny the request.
7. IF an authenticated user attempts to read a User_Doc whose document ID does not equal the requester's UID and the read is not part of a leaderboard query permitted by Requirement 1, THEN THE Rules_Engine SHALL deny the request.
7. THE Rules_Engine SHALL allow updates to Client_Writable_User_Fields when no Integrity_Field is being modified.

### Requirement 3: Choose and document the integrity-write path

**User Story:** As the maintainer, I want a single decided strategy for how Integrity_Fields get written, so that the rules and the client are consistent and the tradeoff is explicit.

#### Acceptance Criteria

1. THE Design_Document SHALL evaluate both the Server_Recompute_Path and the Documented_Tradeoff_Path.
2. THE Design_Document SHALL select exactly one of the two paths and record the rationale.
3. WHERE the Server_Recompute_Path is selected, THE Design_Document SHALL specify the Cloud Function trigger surface, the immutable client-writable input collection (for example `users/{uid}/sessions/{sessionId}`), and the rules that allow append-only writes to that input collection.
4. WHERE the Documented_Tradeoff_Path is selected, THE Design_Document SHALL record which Integrity_Fields remain client-writable, the residual risk, and the migration plan that would later move them server-side.
5. THE Design_Document SHALL list every client call site in `src/lib/storage.js` and `src/lib/firestoreService.js` that writes an Integrity_Field today and SHALL specify the replacement behavior under the chosen path.

### Requirement 4: Restrict duel updates to participants and their owned fields

**User Story:** As a duel participant, I want only the host and the guest of a duel to be able to modify it, and only their own scoring fields, so that opponents and bystanders cannot tamper with the game.

#### Acceptance Criteria

1. IF an authenticated user who is not a Participant of a Duel_Doc attempts to update that Duel_Doc, THEN THE Rules_Engine SHALL deny the update.
2. WHEN a Host updates a Duel_Doc, THE Rules_Engine SHALL deny the update if any field outside the union of Host_Owned_Fields and Shared_Fields changes value, regardless of which other fields are also being written.
3. WHEN a Guest updates a Duel_Doc, THE Rules_Engine SHALL deny the update if any field outside the union of Guest_Owned_Fields and Shared_Fields changes value, regardless of which other fields are also being written.
4. IF a Host attempts to modify any Guest_Owned_Field, THEN THE Rules_Engine SHALL deny the update.
5. IF a Guest attempts to modify any Host_Owned_Field, THEN THE Rules_Engine SHALL deny the update.
6. WHEN a Duel_Doc has `guestUid == null` and an authenticated user submits an update that sets `guestUid` to the requester's UID and sets `guestName` to a string, THE Rules_Engine SHALL allow the update provided the requester is not the Host and no other field outside `guestUid`, `guestName`, and `status` changes.
7. IF an authenticated user attempts to set `guestUid` on a Duel_Doc whose `guestUid` is already non-null, THEN THE Rules_Engine SHALL deny the update.
8. IF an authenticated user attempts to set `guestUid` to a value other than their own UID, THEN THE Rules_Engine SHALL deny the update.
9. IF an authenticated user who is not the Host attempts to delete a Duel_Doc, THEN THE Rules_Engine SHALL deny the delete.

### Requirement 5: Validate duel field shapes on create and update

**User Story:** As the operator, I want duel documents to conform to a known shape, so that malformed writes cannot corrupt gameplay state or break clients reading the document.

#### Acceptance Criteria

1. WHEN a Duel_Doc is created, THE Rules_Engine SHALL allow the create only if all of the following hold: `hostUid` is a string equal to `request.auth.uid`; `hostName` is a string of length 1 through 40; `hostScore` equals 0; `hostAnswers` is an empty list; `hostReady` is `false`; `guestUid` is `null`; `guestName` is `null`; `guestScore` equals 0; `guestAnswers` is an empty list; `guestReady` is `false`; `questions` is a list of length 1 through 100; `currentRound` equals 0; `totalRounds` equals `questions.size()`; `status` equals `'waiting'`; `createdAt` equals `request.time` or is a server timestamp.
2. WHEN a Duel_Doc is updated, THE Rules_Engine SHALL independently validate `hostScore` and `guestScore` and SHALL reject the update if either field is present and is not an integer in the inclusive range 0 through `totalRounds`.
3. WHEN a Duel_Doc is updated, THE Rules_Engine SHALL independently validate `hostAnswers` and `guestAnswers` and SHALL reject the update if either field is present and is not a list whose size is in the inclusive range 0 through `totalRounds`.
4. WHEN a Duel_Doc is updated, THE Rules_Engine SHALL reject the update if `hostReady` or `guestReady` is present and is not a boolean.
5. WHEN a Duel_Doc is updated, THE Rules_Engine SHALL reject the update if `currentRound` is present and is not an integer in the inclusive range 0 through `totalRounds`.
6. WHEN a Duel_Doc is updated, THE Rules_Engine SHALL reject the update if `status` is present and is not one of the strings `'waiting'`, `'playing'`, `'finished'`.
7. IF any field not declared in the duel schema (the union of `hostUid`, `hostName`, `hostScore`, `hostAnswers`, `hostReady`, `guestUid`, `guestName`, `guestScore`, `guestAnswers`, `guestReady`, `questions`, `currentRound`, `totalRounds`, `status`, `createdAt`) is present on create or after update, THEN THE Rules_Engine SHALL deny the request.

### Requirement 6: Constrain duel state transitions and immutable identity fields

**User Story:** As a duel participant, I want the duel to only progress forward and identity-defining fields to be locked once set, so that an opponent cannot rewind the game or swap out the question set.

#### Acceptance Criteria

1. IF an update changes any field in Immutable_Duel_Fields, THEN THE Rules_Engine SHALL deny the update.
2. WHEN a Duel_Doc is updated, THE Rules_Engine SHALL reject the update if `currentRound` is present and its new value is less than `resource.data.currentRound`.
3. WHEN a Duel_Doc is updated, THE Rules_Engine SHALL reject the update if `currentRound` is present and its new value exceeds `resource.data.currentRound + 1`.
4. WHEN a Duel_Doc is updated, THE Rules_Engine SHALL reject the update if `status` is present and the transition from `resource.data.status` to the new value is not one of: `'waiting' → 'playing'`, `'playing' → 'finished'`, `'waiting' → 'finished'` (host abandons before guest joins), `'waiting' → 'waiting'`, `'playing' → 'playing'`, `'finished' → 'finished'`.
5. WHEN a Duel_Doc is updated, THE Rules_Engine SHALL reject the update if `hostScore` is present and its new value is less than `resource.data.hostScore`.
6. WHEN a Duel_Doc is updated, THE Rules_Engine SHALL reject the update if `guestScore` is present and its new value is less than `resource.data.guestScore`.
7. WHEN a Duel_Doc is updated, THE Rules_Engine SHALL reject the update if `hostAnswers` is present and its size is less than `resource.data.hostAnswers.size()`.
8. WHEN a Duel_Doc is updated, THE Rules_Engine SHALL reject the update if `guestAnswers` is present and its size is less than `resource.data.guestAnswers.size()`.

### Requirement 7: Rate-limit duel creation

**User Story:** As the operator, I want a per-user cap on how fast duels can be created, so that a malicious client cannot flood the `duels` collection.

#### Acceptance Criteria

1. THE Design_Document SHALL evaluate enforcing a rate limit inside `firestore.rules` against enforcing it via App Check or Cloud Functions.
2. THE Design_Document SHALL select exactly one enforcement mechanism and record the rationale.
3. WHERE the rate limit is enforced inside `firestore.rules` as the primary mechanism, THE Rules_Engine SHALL reject a Duel_Doc create from a Host whose most recent Duel_Doc, ordered by `createdAt`, was created less than 10 seconds ago. (Note: this requires a per-user counter document the client cannot bypass; design must specify how.)
4. WHERE the rate limit is enforced outside `firestore.rules` as the primary mechanism, THE Design_Document SHALL specify the enforcement surface (App Check throttling, Cloud Function pre-check, or both) and THE Rules_Engine SHALL still enforce a backup rate limit that rejects Duel_Doc creates from a Host whose most recent Duel_Doc was created less than 2 seconds ago.
5. THE Design_Document SHALL record a target rate limit value (suggested default: at most 1 duel created per 10 seconds per UID) and the operational signal that would cause that value to be revisited.

### Requirement 8: Provide an automated rules test suite

**User Story:** As a maintainer, I want automated tests that exercise `firestore.rules` against the emulator, so that regressions in the gaps closed by this spec are caught in CI.

#### Acceptance Criteria

1. THE Rules_Test_Suite SHALL be implemented using `@firebase/rules-unit-testing` and run against the Firestore emulator.
2. THE Rules_Test_Suite SHALL run via a single npm script and SHALL exit with a non-zero status code if any test fails.
3. THE Rules_Test_Suite SHALL include a test that proves an authenticated user cannot increase any field listed in Integrity_Fields on their own User_Doc.
4. THE Rules_Test_Suite SHALL include a test that proves an authenticated user can update each field listed in Client_Writable_User_Fields on their own User_Doc.
5. THE Rules_Test_Suite SHALL include a test that proves a non-Participant authenticated user cannot update any field of a Duel_Doc.
6. THE Rules_Test_Suite SHALL include a test that proves a Host cannot modify any Guest_Owned_Field, and a Guest cannot modify any Host_Owned_Field.
7. THE Rules_Test_Suite SHALL include a test that proves `currentRound` cannot decrease and cannot increase by more than 1 in a single update.
8. THE Rules_Test_Suite SHALL include a test that proves `questions`, `hostUid`, `totalRounds`, and `createdAt` cannot be modified after create.
9. THE Rules_Test_Suite SHALL include a test that proves a second user cannot overwrite an existing non-null `guestUid`.
10. THE Rules_Test_Suite SHALL include a test that proves a Duel_Doc create with a malformed shape (for example `hostScore: 5` at create, or a `questions` list of length 0, or an unexpected extra field) is rejected.
11. THE Rules_Test_Suite SHALL include a test that proves the legitimate flows in Requirement 1 (own-doc read, leaderboard read, duel create, host delete, normal score progression to `'finished'`) are allowed.
12. THE Rules_Test_Suite SHALL run in CI using only the local Firestore emulator and SHALL NOT require credentials, project IDs, service-account keys, or any other configuration tied to a live Firebase project.

### Requirement 9: Document client refactor surface

**User Story:** As a developer applying this spec, I want a precise list of client call sites that must change, so that the rules tightening does not silently break the app at runtime.

#### Acceptance Criteria

1. THE Design_Document SHALL list every call to `setDoc`, `updateDoc`, and `runTransaction` in `src/lib/firestoreService.js` and `src/lib/storage.js` that writes any field in Integrity_Fields.
2. FOR EACH call site listed in acceptance criterion 1, THE Design_Document SHALL specify the replacement behavior under the path chosen in Requirement 3.
3. THE Design_Document SHALL list every duel write call site (`createDuel`, `joinDuel`, `submitDuelAnswer`, `deleteDuel`) and SHALL state which acceptance criteria from Requirements 4, 5, and 6 each call site must satisfy after the rules change.
4. WHERE the chosen path requires Cloud Functions, THE Design_Document SHALL flag the new operational dependency (Functions deployment, billing tier change to Blaze) as a precondition.
