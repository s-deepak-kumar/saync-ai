# Saync Deck — Revisions Needed

Source compared: `Untitled presentation.txt` (current deck export) vs `saync-deck-spec.md` (source of truth).

**Headline issues:** Slide 7 lists a package (`@saync/backend`) that was deleted during the SaaS-to-local-first pivot — a judge clicking npm will not find it. Slide 4 uses slide 8's tagline ("contract layer for software") prematurely, defusing the close. Slide 5 is too abstract — it never names the install command or the localhost URL, both of which are core to the local-first pitch.

Five slides match the spec. Three slides (4, 5, 7) need real edits. Plus one truncation fix on slide 2 and a decision about the unnumbered thanks slide.

---

## Slide 1 — Hook

**Status:** Matches spec. No slide changes.

**Note:** Voiceover changes per the recording script (the "Tuesday story" cold open lands on this slide's headline as the punchline). Slide visual stays.

---

## Slide 2 — Quote wall

**Status:** Mostly correct. One verbatim issue.

**Problem:** Column 1 quote is paraphrased with an ellipsis:

> "You build something with AI. You click around... watch data flow in and out. Everything works. So you deploy it. And then something breaks."

The spec is explicit — quotes must be verbatim. Restore the missing middle clause.

**Change to:**

> "You build something with AI. You click around, test every page, fill out forms, watch data flow in and out. Everything works. So you deploy it. And then something breaks."

— *Vibe Coder Blog · April 2026*

If space is tight, shorten cleanly at a sentence boundary rather than with "...".

---

## Slide 3 — Numbers

**Status:** Matches spec. No changes.

---

## Slide 4 — Meet Saync

**Problem:** The subline currently reads:

> A contract layer for software. Declare what should happen — in your code. Saync proves it. In dev. In production. For every user.

Two issues:
1. "A contract layer for software" is slide 8's tagline. Using it here drains slide 8's closing line.
2. Wording is abstract ("Declare... proves it"). The spec uses concrete verbs.

**Change to:**

> Write what should happen — right in your code.
> Saync runs it. Catches what breaks.
> In dev. In production. For every user.

Keep the headline "Most QA tools guess. Saync verifies." exactly as-is.

---

## Slide 5 — How it works

All three steps are too abstract. None of them name the install command, the SDK count, or the dashboard URL — all of which are the proof points of the local-first pitch.

### Step 01

**Current:**
> Declare contracts inline. `<SayncButton>` and friends. Expectations live with the component — not in a separate test directory that drifts.

**Change to:**
> **Wrap a component. Write a promise.**
> `<SayncButton>` and friends — 38 wrapped primitives.
> Add an `expects={...}` prop. The promise lives next to the code, so it can't drift away from it.

### Step 02

**Current:**
> Agent verifies. Playwright reads the contracts, performs the actions, checks API calls and response shapes. In dev — instantly. In prod — continuously.

**Change to:**
> **The agent runs it.**
> One install — `npm install --save-dev saync-web`.
> One command — `saync start`.
> A real browser drives your app and checks every promise.
> On every save in dev. Once at build time in CI. Per real user in production.

### Step 03

**Current:**
> Dashboard surfaces results. Live stream. Per user. Per flow. Per step. Issues deduped across runs. The bug you couldn't reproduce — already captured.

**Change to:**
> **The dashboard shows the truth.**
> Local. Lives in your repo at `localhost:3777`.
> Side by side: what you expected, what really happened.
> No login. No cloud. No telemetry.

---

## Slide 6 — Demo

**Status:** Placeholder text is fine — gets replaced by the live screen capture during recording. Per the new script, the live demo runs from 2:30 to 4:05.

---

## Slide 7 — Built on Bob

This is the most important slide to fix. Two factual errors plus a story upgrade.

### Error 1 — Headline

**Current:** 48 hours. Four packages. **One agent.**

**Change to:** 48 hours. Four packages. **One install.**

"One install" is the local-first pitch. "One agent" is technically true but misses the point — and contradicts the prose that follows.

### Error 2 — Package list (CRITICAL)

The current slide lists `@saync/backend` as one of the four packages. **That package no longer exists.** It was deleted during the SaaS-to-local-first pivot. A judge searching npm will find nothing. The package on npm is `saync-web` — and that's what users actually install.

**Current list:**
```
@saync/core      registry · types
@saync/react     SDK
@saync/agent     verifier · CLI
@saync/backend   db · SSE stream      ← DOES NOT EXIST
```

**Change to:**
```
saync-web        dashboard · CLI · standalone server
@saync/core      types · registry · defineFlow
@saync/react     38 wrapped components
@saync/agent     Playwright runner
```

### Story upgrade — Prose

**Current:**
> Bob made the velocity possible. Deep repo context across the monorepo. SSE streaming, Drizzle schema, embedded backend mode — all built in two days. Not boilerplate. Real architectural work, reviewed and shipped.

The "SSE streaming, Drizzle schema, embedded backend mode" line is the *old* story — before the pivot. The pivot itself is a much stronger demonstration of Bob's velocity.

**Change to:**
> Bob made the velocity possible. Whole-repo context across the monorepo — schema, routes, agent, SDK, all in scope at once. **We built it as a SaaS first, then pivoted to local-first in half a day.** Deleted the separate backend, collapsed everything into Next.js Route Handlers, swapped runtimes, kept every line of the dashboard. That's not boilerplate. That's a real architectural rewrite, reviewed and shipped between Friday and Sunday.

---

## Slide 8 — Vision close

**Status:** Matches spec. No changes.

Make sure slide 4's subline change has shipped — otherwise this slide's "The contract layer for software" tagline lands as a repeat.

---

## Slide 9 — Thanks (not in spec)

This slide is a new addition outside the original 8-slide spec. Fine to keep — it's a clean coda for the hackathon submission.

Two small decisions:

1. **Slide counter:** The first 8 slides are numbered `01 / 08` through `08 / 08`. This 9th slide is unnumbered. Acceptable as-is (it reads as a coda outside the deck). Alternative: renumber everything to `/09`. Recommendation — leave unnumbered.

2. **Tagline line:** "Building the future of quality." is generic. Options:
   - Keep it — safe, neutral.
   - Drop it — let the gratitude block stand alone.
   - Replace with something more specific (e.g. "Made in 48 hours. Made for the long run.").

Recommendation — drop it. The gratitude block carries the slide.

---

## Priority order

If time is short, ship fixes in this order:

1. **Slide 7 package list** — factual error, `@saync/backend` doesn't exist on npm
2. **Slide 7 headline** — "One agent" → "One install"
3. **Slide 4 subline** — drop "contract layer" line to protect slide 8
4. **Slide 5 step 02** — add the install + start commands
5. **Slide 5 step 03** — name `localhost:3777` and the "no login, no cloud, no telemetry" line
6. **Slide 7 prose** — replace SSE/Drizzle list with the pivot story
7. **Slide 5 step 01** — add "38 wrapped primitives" and `expects={...}` prop
8. **Slide 2 column 1 quote** — fix the ellipsis to a verbatim quote
9. **Slide 9 tagline** — drop or replace the generic line (optional)

Items 1 and 2 are non-negotiable — they're factual errors a judge could catch in 30 seconds on npm. Items 3–7 are the difference between a generic deck and one that lands the local-first pitch.
