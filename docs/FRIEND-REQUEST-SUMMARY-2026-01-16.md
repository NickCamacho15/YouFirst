# Friend Request Summary (2026-01-16)

Source: copy/pasted text message from your friend (product stakeholder).

## High-level intent
- **Ship soon**: He feels the app “seems ready to go” and wants to either (a) do a final polish push, then beta test, or (b) “send it” and start onboarding users/club and marketing.
- **Monetization**: Wants to start generating revenue via subscriptions, and later discuss **profit-share on subscriptions**.
- **Community-first**: Wants the experience to feel like a single shared community board so challenges can be pushed to everyone and users can opt-in.

## Requested product changes (explicit list)

### 1) Remove Meditation page from Mind tab
- **Request**: “Take off the meditation page on the mind tab.”
- **Reason given**: “Just reading and screen tracking.”
- **Interpretation**: Hide/remove Meditation from navigation/UI (and possibly disable the page entirely).

### 2) Rules page: allow deleting a rule
- **Request**: “On the rules page - have it so someone can delete a rule.”
- **Interpretation**: Add a delete action (UI + backend) for rules.
- **Open detail**: Who can delete? (Admin only vs any user’s own rule).

### 3) Challenge page: opt-in community challenge pushed by admin
- **Request**: “Would there be a way for people to opt-into a community challenge? So admin page pushes a challenge out… allow someone to opt in/join.”
- **UI callout**: The “horizontal tab” for an active/new challenge should be a **unique color/glimmer** to draw attention.
- **Interpretation**:
  - Admin can publish/push a challenge.
  - Users can **join/opt-in** to that challenge.
  - Challenge display should visually emphasize “new/active”.

### 4) Discipline > Rules page: align-left text
- **Request**: “See what a align-left would look like for the writing… aligned like the goals page.”
- **Interpretation**: Adjust typography/layout so rules text is left-aligned and visually matches Goals styling.

### 5) Calendar tab: make the streak counter more “gamified”
- **Request**: “STREAK counter in the top right… more gamified, maybe a medallion that had a fire emoji and counter?”
- **Interpretation**: Update the streak UI component (badge/medallion styling + iconography).

### 6) Update gradient colors
- **Request**: “On the gradient - instead of red to green… dull green to vibrant electric green.”
- **Interpretation**: Replace current red→green gradient with muted green→electric green gradient across the relevant UI (likely streak/progress visuals).

## Directional / roadmap requests (from the longer paragraph)

### A) “Same community-board” for everyone (simplicity)
- **Request**: “Make things as simple as possible. So everyone who comes to it actually will be a part of the same community-board.”
- **Goal**: Make it easy to push shared challenges (strength, wall-ball, fitness) to a single audience.
- **Timing hint**: Mentions challenges that “start starting in 7 days” (scheduled start).

### B) Workouts pre-uploaded; keep Workout tab the same for everyone (for now)
- **Request**: “Have the workouts pre-uploaded.”
- **Request**: “For now keep the workout tab the same for everyone… whatever backend dashboard uploads and launches those we’ll keep it to that for now.”
- **Interpretation**:
  - Centralized content publishing: admin uploads workouts; users see the same set.
  - No personalization/segmentation required initially.

### C) Workout submission + leaderboard (nice-to-have / future feature)
- **Request**: “Send a video of the app we use for crossfit… if one you upload it goes into a leader-board that’d be sweet.”
- **Interpretation**:
  - Users can upload some proof/result (video? or completion?) for a workout.
  - Submissions feed into a leaderboard.
- **Open details**: What is ranked (time, reps, weight, completion streak, etc.), and what does “upload” mean (video file vs link vs logged stats).

## Launch / business notes (non-technical but impacts scope)
- **Final push budget question**: “lmk if $1,000 for this final push would be sufficient.”
- **Next step**: “Then can talk profit-share model on the subs!”
- **Launch decision**: Beta test first vs ship and start onboarding/marketing immediately.

## Additional requirements from follow-up messages (Jan 2)

### 1) App startup friction / glitch when opening
- **Request**: “Slight friction with opening and have it glitch through to the auto-open into the home page.”
- **Interpretation**: There is a visible UX glitch during app launch / initial routing (likely auth + home redirect). Wants it smoother and more reliable.

### 2) Stay signed-in / “auto open like IG or Whoop”
- **Request**: After a user is “submitted as a member”… the app should “stay auto open like IG or Whoop.”
- **Interpretation**: Persistent session / remember-me behavior so returning users land directly in the app without repeated friction (until they explicitly sign out).

### 3) Membership onboarding: access code + card-on-file + recurring billing
- **Request**: “Once you’re submitted as a member, so access code or whatever, upload a card… and we can then charge card reoccurring unless cancelled?”
- **Interpretation**:
  - Gated onboarding (invite/access code or equivalent approval).
  - Collect payment method (card on file).
  - Subscription-style recurring charges with cancellation flow.
- **Note**: This has major implications for auth, billing provider integration, and account lifecycle.

### 4) Ship ASAP; simplest UI; admin posts workouts/challenges
- **Request**: “Would be HUGE if we could get the app pushed out. Simplest form, user can interface with all pages, and we can post workouts / challenges from the back.”
- **Interpretation**: Prioritize release speed; keep UX simple; maintain centralized admin publishing for workouts/challenges.

## Clarifications to ask (to prevent scope creep)
- **Meditation removal**:
  - Remove from navigation only, or remove feature entirely (including backend/data)?
- **Rule deletion**:
  - Who can delete rules? Admin only, or users can delete their own rules?
  - Is delete soft-delete (recoverable) or permanent?
- **Community challenges**:
  - Can a user join multiple challenges at once?
  - What data is tracked per challenge (daily check-ins, score, streak, completion)?
  - Does “start in 7 days” require scheduled publishing + countdown UI?
- **Challenge visual emphasis**:
  - Which “horizontal tab” is he referring to (top tabs, filter chips, or challenge carousel)?
- **Workout leaderboard**:
  - What is the submission type (video upload, link, numbers)?
  - What is the leaderboard metric and timeframe (weekly, all-time, per challenge)?
- **Workout content**:
  - Where does the “backend dashboard” live today (web admin? supabase table?) and what fields need to be added/changed?

- **App launch glitch**:
  - When exactly does it glitch (cold start vs returning from background), and on which platforms (iOS/Android/web)?
  - Can you share a screen recording so we can pinpoint the route/auth transition?
- **Stay signed-in**:
  - Should the app ever require re-auth (token expiry), or is “always signed in” acceptable until manual sign-out?
- **Membership + billing**:
  - Is “access code” the gate, or do you want admin approval (invite-only) instead?
  - What billing provider do you want (Stripe is typical), and is it app-store IAP (iOS/Android) or direct card billing?
  - What are the subscription tiers/pricing, trial, and cancellation/refund rules?

## Suggested scope grouping (optional, for planning)
- **Quick polish (likely small)**: remove meditation page, align-left rules text, streak badge styling, green gradient update.
- **Medium feature**: rule deletion (requires auth/permissions + data update).
- **Larger feature**: admin-pushed community challenges with opt-in + highlighting + scheduling.
- **Future**: workout submissions + leaderboard.

