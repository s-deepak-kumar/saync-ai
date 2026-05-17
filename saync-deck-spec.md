# Saync — Pitch Deck Specification

**Hackathon:** IBM Bob 48-hour build
**Runtime target:** 4 minutes (within 3–5 minute submission window)
**Format:** Slide deck (HTML, screen-recorded) + voiceover + pre-recorded demo captures
**Slides:** 8
**Aesthetic direction:** Editorial / magazine. Restrained, distinctive, confident.
**Judging criteria (each 25%):** Application of Technology · Presentation · Business Value · Originality

> **Doc maintenance note:** This file is the source of truth for the deck.
> Every quotation on Slide 2 and every statistic on Slide 3 is verified —
> see the Research Appendix (§6) for full attribution. Those quotations
> must not be reworded. Everything else uses plain English so anyone can
> follow it, including non-technical judges.

---

## 1. Locked decisions

1. **Narrative arc:** Hook → Voices (quote wall) → Scale (numbers) → Saync → How it works → Demo → Bob → Vision
2. **Hook style:** Lead with the problem ("AI agents can't really verify things")
3. **Evidence approach:** Two-slide one-two punch — emotional (real developer quotes) then intellectual (hard numbers)
4. **All quotes dated 2026** — recent, verifiable, post-AI-coding-mainstream
5. **Demo placement:** One centerpiece block, middle of deck (slide 6)
6. **Positioning line:** *"Most QA tools guess. Saync verifies."*
7. **Bob's narrative role:** Supporting actor (Saync is the product; Bob made building it possible in 48 hours)
8. **Closing ask:** Vision close — Saync is the future of QA, across React, mobile, and backend
9. **Architecture truth (added):** Saync is **local-first**. The whole product is one `npm install`. No SaaS, no signup, no keys — that's a distinct part of the pitch.

---

## 2. Design system

### Color palette

| Token | Hex | Usage |
|---|---|---|
| `--cream` | `#FBF7F2` | Primary slide background (slides 1–7) |
| `--terracotta` | `#C04E2C` | Primary accent on cream — italics, rules, stats |
| `--terracotta-bright` | `#E0784E` | Accent on dark slide (slide 8) |
| `--ink` | `#1A1410` | Primary text on cream; dark slide background |
| `--ink-soft` | `#3A2F26` | Secondary text on cream |
| `--muted` | `#8A7C70` | Meta text, labels, attributions |
| `--muted-soft` | `#B5A89C` | Meta text on dark slide |
| `--gold` | `#D4A574` | Roadmap labels on dark slide |
| `--rule` | `rgba(26, 20, 16, 0.12)` | Hairline rules on cream |
| `--rule-dark` | `rgba(251, 247, 242, 0.10)` | Hairline rules on dark |

### Typography

- **Display (headlines, pull quotes, quote wall):** Fraunces — variable serif, 300–500 weights, italic and roman. Italic reserved for emphasis on operative words, almost always in terracotta.
- **Body / UI:** Geist — clean grotesque, 300–700 weights
- **Mono / accents:** Geist Mono — eyebrows, code, labels, counters, attributions

### Layout

- Slide padding: 56px top/bottom, 88px left/right (40px / 56px on narrow viewports)
- Brand mark top-left every slide: 9px terracotta filled circle + "Saync" wordmark, Geist 13px weight 600
- Slide counter top-right: Geist Mono 11px, tabular-nums, format `XX / 08`
- Subtle grain texture across all slides: 5px radial dot pattern at 2.5% opacity
- Atmospheric gradient: terracotta ellipse top-right (cream slides), terracotta-bright ellipse bottom-left (dark slide)

### Motion

- Slide entrance: 0.55s `cubic-bezier(0.2, 0.85, 0.25, 1)` — 14px upward translate + opacity fade
- Progress bar: 2px terracotta strip at top, animates between slides

### Navigation

- → / Space / PageDown — next | ← / PageUp — previous | Home / End — first / last
- Keys 1–8 — direct jump
- Click right half — next; click left half — previous

---

## 3. Slide-by-slide

---

### SLIDE 1 — Hook

**Purpose:** Set tension in three seconds.
**Target duration:** ~25 seconds

#### Layout

Asymmetric, left-aligned. Headline dominates upper two-thirds. Subline beneath in a narrow column.

```
┌─────────────────────────────────────────────┐
│ ● Saync                          01 / 08    │
│                                             │
│                                             │
│  AI agents can't really                     │
│  verify things.                             │
│                                             │
│                                             │
│  They click. They scroll. They guess.       │
│  Then they tell you it worked.              │
│                                             │
└─────────────────────────────────────────────┘
```

#### Copy

- **Headline:** AI agents can't really *verify* things. ("verify" italic, weight 300, terracotta)
- **Subline:** They click. They scroll. They guess. Then they tell you it worked.

#### Typography

- Headline: Fraunces, weight 400, `clamp(64px, 9vw, 148px)`, line-height 0.94, letter-spacing -0.035em
- Subline: Geist, 19px, line-height 1.5, color `--ink-soft`, max-width 580px

#### Voiceover

> "AI agents can't really *verify* things. They click. They scroll. They guess. Then they tell you it worked."

**Delivery:** Slow. Pause after "verify." Each sentence in the subline gets its own beat.

---

### SLIDE 2 — Quote wall · The frustration

**Purpose:** Make the pain real. Let judges hear it from developers, in their own words, all from 2026.
**Target duration:** ~45 seconds

> **Editorial note:** Every quote on this slide is verbatim from a public,
> dated 2026 source. Do not edit or paraphrase. Sources are in §6.1.

#### Layout

Eyebrow + title at top. One hero quote takes the upper half (large, italic, with attribution). A hairline rule divides. Three smaller supporting quotes in a row below, each with attribution underneath.

```
┌─────────────────────────────────────────────┐
│ ● Saync                          02 / 08    │
│                                             │
│ — REAL VOICES, 2026                         │
│ What developers are actually saying.        │
│                                             │
│  "Two months ago, our QA lead quit. Just    │
│   walked out. Left a Slack message that     │
│   said 'good luck with the flaky tests'     │
│   and disappeared."                         │
│   — Engineering Lead · Medium · Jan 2026    │
│                                             │
│ ───────────────────────────────────────     │
│                                             │
│ "You build with    "Flaky tests are  "A test that   │
│  AI… everything    a silent          passed 5 min   │
│  works. So you     productivity      ago suddenly   │
│  deploy it. Then   killer that…      fails…"        │
│  something breaks" eroding trust"                   │
│  — Vibe Coder Blog — Tuist Eng       — DeFlaky Eng  │
│    Apr 2026        Jan 2026          Apr 2026       │
└─────────────────────────────────────────────┘
```

#### Copy

**Eyebrow:** — REAL VOICES, 2026 *(Geist Mono, terracotta, with hairline rule prefix)*

**Title (Fraunces 36px, weight 400, letter-spacing -0.02em, color ink):** What developers are actually saying.

**Hero quote (Fraunces italic, weight 400, clamp(28px, 3.2vw, 44px), line-height 1.25):**

> "Two months ago, our QA lead quit. Just walked out. Left a Slack message that said 'good luck with the flaky tests' and disappeared. We had 500 E2E tests in Cypress. Half of them failed randomly."

Hero attribution (Geist Mono, 12px, muted, with `—` prefix):
*— Engineering retrospective · Medium · January 2026*

**Hairline rule:** full-width, `--rule`, 32px vertical margin

**Three supporting quotes** (3-column grid, 32px gap):

Each quote: Fraunces italic, 16px, line-height 1.5, color `--ink-soft`, 2px terracotta left border, 18px padding-left.
Each attribution below: Geist Mono, 10.5px, `--muted`, uppercase, letter-spacing 0.08em, 16px margin-top.

**Column 1:**
> "You build something with AI. You click around, test every page, fill out forms, watch data flow in and out. Everything works. So you deploy it. And then something breaks."

*— Vibe Coder Blog · April 2026*

**Column 2:**
> "Flaky tests are a silent productivity killer that compounds over time, eroding trust in your test suite and frustrating developers who just want to ship their work."

*— Tuist Engineering · January 2026*

**Column 3:**
> "A test that passed five minutes ago suddenly fails, and when you re-run it, it passes again. No code changed. No configuration shifted."

*— DeFlaky Engineering · April 2026*

#### Typography summary

| Element | Font | Size | Weight | Color |
|---|---|---|---|---|
| Eyebrow | Geist Mono | 11px | 500 | terracotta |
| Title | Fraunces | 36–44px | 400 | ink |
| Hero quote | Fraunces italic | clamp(28px, 3.2vw, 44px) | 400 | ink |
| Hero attribution | Geist Mono | 12px | 500 | muted |
| Supporting quotes | Fraunces italic | 16px | 400 | ink-soft |
| Supporting attributions | Geist Mono | 10.5px | 500 | muted |

#### Voiceover (plain English)

> "Here's what developers are actually saying in 2026. *'Our QA lead quit. Left a Slack message — good luck with the flaky tests — and walked out.'* And: *'You build with AI, click through everything, deploy it, and then something breaks.'* And: *'Flaky tests are a silent productivity killer.'* This isn't one team. This is everywhere."

**Delivery:** Read the hero quote with weight. Quote the three supporting lines briefly, almost rapid-fire — the cumulative effect is the point.

---

### SLIDE 3 — Numbers · The scale

**Purpose:** Validate the frustration with hard data. After hearing real developers, hear the numbers behind them.
**Target duration:** ~30 seconds

> **Editorial note:** Every number on this slide is from a named, public
> source — see §6.2. Do not change a single digit.

#### Layout

Eyebrow + title at top. Three massive numbers in a horizontal row, each with a one-line caption. Supporting smaller stats in a bottom strip.

```
┌─────────────────────────────────────────────┐
│ ● Saync                          03 / 08    │
│                                             │
│ — THE SCALE                                 │
│ This isn't anecdotal.                       │
│                                             │
│  84%          46%          16%              │
│  use AI       don't trust  of Google's      │
│  coding tools the output   tests are flaky  │
│                                             │
│ ─────────────────────────────────────       │
│ 287 Cypress tests = 5 months · 10.4% QA     │
│ time on env setup · 7.8% on flaky tests     │
└─────────────────────────────────────────────┘
```

#### Copy

**Eyebrow:** — THE SCALE *(Geist Mono, terracotta)*

**Title (Fraunces, weight 400, clamp(48px, 5.4vw, 80px), letter-spacing -0.025em):** This isn't *anecdotal.* ("anecdotal" italic, terracotta)

**Three big-number cells (grid-template-columns: repeat(3, 1fr), gap 48px, margin-top 64px):**

Each cell:
- Number: Fraunces, weight 400, `clamp(96px, 11vw, 168px)`, line-height 0.9, letter-spacing -0.04em, color terracotta, font-variant-numeric tabular-nums
- Caption: Geist 17px, line-height 1.4, color ink-soft, max-width 220px, margin-top 16px
- Source line: Geist Mono 10px, muted, uppercase, letter-spacing 0.1em, margin-top 20px

| Number | Caption | Source |
|---|---|---|
| **84%** | of developers use AI coding tools | Stack Overflow Survey 2025 |
| **46%** | don't trust what AI produces | Stack Overflow Survey 2025 |
| **16%** | of Google's own tests are flaky | DeFlaky · 2026 |

**Hairline rule** below the three numbers, 48px above and below.

**Bottom strip (3-column grid, smaller stats):**

Each: Geist Mono 13px label + Geist 14px stat + tiny source.

| Stat | Source |
|---|---|
| **287 Cypress tests · 5 months to write** | Medium engineering retrospective · March 2026 |
| **10.4% of QA bandwidth lost to test env setup** | LambdaTest "Future of QA" · 2026 |
| **7.8% lost to fixing flaky tests** | LambdaTest "Future of QA" · 2026 |

#### Voiceover (plain English)

> "This isn't rare. Eighty-four percent of developers now use AI to write code. Forty-six percent don't trust the output. Sixteen percent of Google's own tests are flaky — and they have whole teams just managing that. One team needed five months to write two hundred and eighty-seven Cypress tests. Another report says teams lose nearly a fifth of their QA time just to broken test setup and flaky tests. The problem is everywhere."

**Delivery:** Numbers should land like punches. Slight pause between each. Don't smile.

#### Honest note

Stack Overflow Developer Survey 2025 is the most recent comprehensive industry survey available. The 84% / 46% figures use 2025 data because no equivalent 2026 survey has published yet. Every other stat on the slide is from 2026 sources.

---

### SLIDE 4 — Meet Saync

**Purpose:** The reveal. After hearing frustration and seeing scale, this is the answer.
**Target duration:** ~20 seconds

#### Layout

Pull quote left-aligned, dominates the slide. Subline beneath.

```
┌─────────────────────────────────────────────┐
│ ● Saync                          04 / 08    │
│                                             │
│                                             │
│  Most QA tools guess.                       │
│  Saync verifies.                            │
│                                             │
│                                             │
│  Write what should happen — in your code.   │
│  Saync runs it. Catches what breaks.        │
│  In dev. In production. For every user.     │
│                                             │
└─────────────────────────────────────────────┘
```

#### Copy

- **Pull quote:** Most QA tools guess. [line break] Saync *verifies.* ("verifies" italic, terracotta, weight 300)
- **Subline:** Write what should happen — **right in your code.** Saync runs it. Catches what breaks. In dev. In production. For every user.

#### Typography

- Pull quote: Fraunces, weight 400, `clamp(56px, 7.4vw, 116px)`, line-height 0.98
- Subline: Geist 20px, line-height 1.55, max-width 720px

#### Voiceover (plain English)

> "Most QA tools guess. Saync *verifies*. You write what should happen — right in your code, next to the button or the form. Saync runs your app, checks every promise, and catches what breaks. In dev. In production. For every user."

**Delivery:** Pause for a full beat after "verifies."

---

### SLIDE 5 — How it works

**Purpose:** Concrete mechanism. Three steps, each tangible.
**Target duration:** ~50 seconds

#### Layout

Eyebrow + headline top. Three equal columns, each with top hairline rule (full ink), step number, sub-headline, body.

```
┌─────────────────────────────────────────────┐
│ ● Saync                          05 / 08    │
│                                             │
│ THE MECHANISM                               │
│ How it works.                               │
│                                             │
│ ───────────  ───────────  ───────────       │
│ 01           02           03                │
│ Wrap a       The agent    The dashboard     │
│ component.   runs it.     shows the truth.  │
│ [body]       [body]       [body]            │
└─────────────────────────────────────────────┘
```

#### Copy

- **Eyebrow:** The mechanism
- **Headline:** How it *works.* ("works" italic terracotta)

**Step 01 — Wrap a component. Write a promise.**
Use `<SayncButton>` (and friends — 38 wrapped primitives in total). Add an `expects={...}` prop saying what should happen. The promise lives next to the code, so it can't drift away from it.

**Step 02 — The agent runs it.**
One install — `npm install --save-dev saync-web`. One command — `saync start`. A Playwright-driven agent boots your dev server, clicks every button, fills every form, checks the actual network calls. On every save in dev. Once at build time in CI. Continuously, per real user, in production.

**Step 03 — The dashboard shows the truth.**
Local. Lives in your repo at `localhost:3777`. Failed promises group into issues, same shape as Sentry. Each one shows what you expected and what really happened, side by side. No login. No cloud. No telemetry.

#### Typography

- Step headlines: Fraunces, weight 500, 28px, line-height 1.18
- Step bodies: Geist 15px, line-height 1.6, color `--ink-soft`
- Step numbers: Geist Mono 13px, terracotta, letter-spacing 0.08em
- Code (`<SayncButton>`): Geist Mono, terracotta tint, thin terracotta border
- Top rule: 1px solid `--ink`

#### Voiceover (plain English)

> "Three steps. First — wrap a component and write the promise. SayncButton, SayncForm, SayncInput. The promise lives right next to the code. Second — the agent runs it. One npm install, one command. A real browser drives your app and checks every promise. In dev, in CI, and in production. Third — a local dashboard shows the truth. Side by side: what you expected, what really happened. No cloud. No login. Everything lives in your repo."

---

### SLIDE 6 — Demo

**Purpose:** Show, don't tell. The product moment.
**Target duration:** ~40 seconds (longest single slide)

#### Layout

Eyebrow + headline upper-left. Full-bleed video frame fills the bottom two-thirds.

```
┌─────────────────────────────────────────────┐
│ ● Saync                          06 / 08    │
│                                             │
│ ─── DEMO                                    │
│ Live verification.                          │
│                                             │
│ ┌─────────────────────────────────────┐    │
│ │      [SCREEN CAPTURE PLAYS]          │    │
│ └─────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
```

#### Copy (on slide)

- **Eyebrow:** ─── DEMO (mono, terracotta, 36px hairline rule prefix)
- **Headline:** Live *verification.* ("verification" italic terracotta)
- **Frame placeholder:** "— Screen capture · VO narrates the flow —" (visible only while recording, replaced in final video)

#### Demo capture shot list

> **Note:** uses the actual commands a real user would run today — `npm install saync-web` and `npm run saync`. Dashboard lives at `localhost:3777` (the Saync default). The demo app sits at `localhost:5174` (Vite).

| Time | What's on screen | Action |
|---|---|---|
| 0:00–0:08 | VS Code, React component file | Camera focuses on a `<SayncButton>` wrapper. The `expects={{ onClick: { apiCall: ... } }}` block is highlighted briefly so judges see exactly what a "promise" looks like. |
| 0:08–0:14 | Terminal | Developer runs `npm run saync`. The CLI boots the Saync dashboard, the app probe, and the file watcher. One process. |
| 0:14–0:22 | Browser (chromium), demo app | The agent autonomously opens the demo app, clicks "Add to Cart", types into a form, walks a `saync.flows.ts` flow end-to-end. |
| 0:22–0:30 | Saync dashboard at localhost:3777 | Run completes. Three contracts pass, one fails — the API returned the wrong shape. The failing card appears in the runs list with a red severity strip. |
| 0:30–0:40 | Failed issue expanded | Full context: error message, `expected vs observed` side-by-side, the step that broke, the browser screenshot, the stack frame from the dev server. Judges see this is a *real* tool with real data, not a mockup. |

#### Voiceover (synchronized to demo)

> "Watch this. A developer wraps a button with a Saync promise — clicking it should POST to slash-api-slash-cart and return an item count. They run one command. The agent opens a real browser, drives the app, checks every promise. It catches that the API came back with the wrong shape — silently, no error thrown — and surfaces it in the dashboard with the full trace: which step, what was expected, what really happened, even a screenshot."

---

### SLIDE 7 — Built on Bob

**Purpose:** Anchor the 25% "Application of Technology" judging criterion.
**Target duration:** ~25 seconds

> **Editorial note (changed):** Previous version listed `@saync/backend`
> as one of four packages. We collapsed that service into Next.js Route
> Handlers during the local-first pivot — the live shape on npm is now
> `saync-web` + three SDK packages. The voiceover here highlights both
> the four packages **and** the pivot itself as a Bob-velocity win.

#### Layout

Eyebrow + headline top. Below: 1.2 / 1 ratio two-column. Left: prose paragraph. Right: dark ink code-block listing the four packages.

```
┌─────────────────────────────────────────────┐
│ ● Saync                          07 / 08    │
│                                             │
│ BUILT ON BOB                                │
│ 48 hours. Four packages. One install.       │
│                                             │
│ Bob made the velocity      ┌────────────┐  │
│ possible. Whole-repo       │ ON NPM:    │  │
│ context. SaaS to local-    │ saync-web  │  │
│ first in half a day.       │ @saync/    │  │
│ One npm install, one       │   core     │  │
│ process, zero servers.     │   react    │  │
│                            │   agent    │  │
│                            └────────────┘  │
└─────────────────────────────────────────────┘
```

#### Copy

- **Eyebrow:** Built on Bob
- **Headline:** 48 hours. *Four packages.* One install.
- **Prose:** Bob made the velocity possible. Whole-repo context across the monorepo — schema, routes, agent, SDK, all in scope at once. **We built it as a SaaS first, then pivoted to local-first in half a day.** Deleted the separate backend, collapsed everything into Next.js Route Handlers, swapped runtimes, kept every line of the dashboard. That's not boilerplate — that's a real architectural rewrite, reviewed and shipped between Friday and Sunday.
- **Code block (dark, mono):**
  - Header: `— ON NPM`
  - `saync-web` — dashboard · CLI · standalone server
  - `@saync/core` — types · registry · `defineFlow`
  - `@saync/react` — 38 wrapped components
  - `@saync/agent` — Playwright runner

#### Visual treatment of code block

- Background: `--ink` (#1A1410), padding: 28px 32px, border-radius: 4px
- Box-shadow: `0 24px 48px -24px rgba(26, 20, 16, 0.35)`
- Package names: terracotta-bright (#E0784E)
- Descriptions: muted-soft (#B5A89C), 12px

#### Voiceover (plain English)

> "Forty-eight hours. Four packages on npm. One install. Bob made it possible. It saw the whole monorepo at once — schema, routes, agent, SDK. We even built it as a hosted SaaS first. Then we pivoted to local-first in half a day. Deleted the backend, moved everything into Next.js, swapped the runtime, kept the entire dashboard. That's not boilerplate. That's a real rewrite, shipped between Friday and Sunday."

---

### SLIDE 8 — Vision close

**Purpose:** Leave them with the future. The slide they remember.
**Target duration:** ~30 seconds
**Background:** Dark — `--ink` (#1A1410) with subtle grain

#### Layout

```
┌─────────────────────────────────────────────┐
│ ● Saync                          08 / 08    │
│                                             │
│  Saync.                                     │
│  The contract layer for software.           │
│                                             │
│  ─────────────────────────────              │
│  ─ TODAY            React on the web.       │
│  ─ TOMORROW         React Native. Flutter…  │
│  ─ THE DAY AFTER    Backend services…       │
│                                             │
│  Deterministic. Continuous. Per user.       │
│  The bugs nobody sees — surfaced before…    │
└─────────────────────────────────────────────┘
```

#### Copy

- **Wordmark:** Saync*.* (period in terracotta-bright italic, weight 300)
- **Tagline:** The contract layer for *software.* ("software" italic gold)
- **Roadmap (top border `--rule-dark`):**
  - `— TODAY` (mono, gold) — React on the web.
  - `— TOMORROW` — React Native. Flutter. Native iOS & Android.
  - `— THE DAY AFTER` — Backend services. Any language.
- **Closer (Fraunces italic, weight 300, muted-soft):** Deterministic. Continuous. Per user. Per flow. The bugs nobody sees — *surfaced before they ship.*

#### Typography

- Wordmark: Fraunces, weight 400, `clamp(120px, 17vw, 260px)`, line-height 0.88
- Tagline: Fraunces, weight 300, `clamp(28px, 3.2vw, 52px)`
- Roadmap labels: Geist Mono 11px, gold, letter-spacing 0.16em
- Roadmap content: Geist 19px, cream
- Closer: Fraunces italic 18px, max-width 620px

#### Voiceover (plain English)

> "Saync. The contract layer for software. Today, it's React on the web. Tomorrow — React Native, Flutter, native iOS and Android. The day after — backend services, in any language. The same idea everywhere: write the promise next to the code. Saync proves it. Per user. Per step. Every time. The bugs nobody sees — *caught before they ship.*"

**Delivery:** Slower than every other slide. Let each roadmap line land separately. Full beat of silence after the closing line.

---

## 4. Total runtime budget

| Slide | Title | Target |
|---|---|---|
| 01 | Hook | 0:25 |
| 02 | Quote wall · The frustration | 0:45 |
| 03 | Numbers · The scale | 0:30 |
| 04 | Meet Saync | 0:20 |
| 05 | How it works | 0:50 |
| 06 | Demo | 0:40 |
| 07 | Built on Bob | 0:25 |
| 08 | Vision close | 0:30 |
| | **Total** | **~4:25** |

Inside the 3–5 minute window with ~5 seconds of natural pause buffer.

---

## 5. Production checklist

- [ ] **Record the demo for slide 6.** Use the published `saync-web` from npm — run `npm install --save-dev saync-web` in a fresh Vite + React project, then `npm run saync`. Follow the shot list above. The result is automatically a clean, realistic capture.
- [ ] **Optional:** capture one Bob session screenshot for slide 7 (showing whole-repo context — schema + routes + SDK on screen at once).
- [ ] **Voiceover recording** — flat-tone delivery, slower than instinct. Pauses are deliberate. Avoid technical jargon that wasn't already on the slide.
- [ ] **Export deck** — either screen recording of the HTML deck or static 1920×1080 frames, depending on submission format.
- [ ] **Sanity-check every link** in §6 before publishing the deck. If a 2026 article goes offline, swap in one of the reserve quotes (§6.3).

---

## 6. Research appendix — quotes & sources (all 2026)

Every quote on Slide 2 is verifiable. Full attribution below. Judges can verify everything.

### 6.1 Slide 2 quotes — used on the deck

#### Hero quote

> "Two months ago, our QA lead quit. Just walked out. Left a Slack message that said 'good luck with the flaky tests' and disappeared. We had 500 E2E tests in Cypress. Half of them failed randomly. The other half took 45 minutes to run."

- **Publication:** Medium — *Let's Code Future*
- **Article:** "Cypress vs Playwright: I Ran 500 E2E Tests in Both. Here's What Broke."
- **Date:** January 17, 2026
- **URL:** https://medium.com/lets-code-future/cypress-vs-playwright-i-ran-500-e2e-tests-in-both-heres-what-broke-2afc448470ee
- **Context:** Engineering manager describing their team's actual experience after their QA lead quit. Real names abstracted in the original but the situation is named and specific.

#### Supporting quote 1 (Column 1)

> "You build something with AI. You click around, test every page, fill out forms, watch data flow in and out. Everything works. So you deploy it. And then something breaks."

- **Publication:** Vibe Coder Blog
- **Article:** "Localhost vs Production and Why Your App Breaks Online"
- **Date:** April 5, 2026
- **URL:** https://blog.vibecoder.me/understanding-localhost-vs-production
- **Context:** Captures the AI-coding-and-test-by-hand loop that Saync is built to replace

#### Supporting quote 2 (Column 2)

> "Flaky tests are a silent productivity killer that compounds over time, eroding trust in your test suite and frustrating developers who just want to ship their work."

- **Publication:** Tuist Engineering Blog
- **Article:** "Stop Flaky Tests from Blocking Your PRs"
- **Date:** January 27, 2026
- **URL:** https://tuist.dev/blog/2026/01/27/flaky-tests
- **Context:** Engineering team writing about the universal frustration with existing E2E test suites

#### Supporting quote 3 (Column 3)

> "A test that passed five minutes ago suddenly fails, and when you re-run it, it passes again. No code changed. No configuration shifted. The test simply decided to fail for no apparent reason."

- **Publication:** DeFlaky Engineering Blog
- **Article:** "What Are Flaky Tests? The Complete Guide for QA Engineers (2026)"
- **Date:** April 7, 2026
- **URL:** https://deflaky.com/blog/what-are-flaky-tests
- **Context:** Distilled universal pain — every QA engineer has lived this

### 6.2 Slide 3 numbers — sources

#### Big numbers

| Stat | Source | URL |
|---|---|---|
| **84%** of developers use AI coding tools | Stack Overflow Developer Survey 2025 (49,000+ respondents, 177 countries) | https://survey.stackoverflow.co/2025/ |
| **46%** don't trust the output | Stack Overflow Developer Survey 2025 (inverse of 60% favorable AI sentiment, down from 70%+ in 2024) | same |
| **16%** of Google's tests are flaky | Cited by DeFlaky (April 2026) referencing Google's published flaky-test research | https://deflaky.com/blog/what-are-flaky-tests |

*Note: Stack Overflow Survey 2025 is the most recent comprehensive industry survey available; no 2026 equivalent has been published yet. All other Slide 3 stats are from 2026 sources.*

#### Supporting stats

| Stat | Source | Date | URL |
|---|---|---|---|
| **287 Cypress tests, 5 months to write** | Medium — *"End-to-End Testing: Playwright vs Cypress in Real Projects"* | March 2026 | https://navanathjadhav.medium.com/end-to-end-testing-playwright-vs-cypress-in-real-projects-07b3790e5ab3 |
| **10.4% of QA bandwidth on test environment setup** | LambdaTest "Future of Quality Assurance" Report | 2026 | https://lambdatest.com/resources/LambdaTest_FutureOfQualityAssuranceReport.pdf |
| **7.8% on flaky test maintenance** | LambdaTest "Future of QA" Report | 2026 | same |

### 6.3 Reserve 2026 quotes (available for alternates or longer-form material)

These are verified 2026 quotes not currently on the deck but available if any quote needs to be swapped:

#### "Tests aren't trusted, so devs ignore them"

> "When flaky tests become common, developers stop trusting the test suite. 'It's probably just that flaky test' becomes the default assumption when CI fails. Real bugs slip through because the signal has been drowned out by noise."

- **Publication:** Tuist Engineering Blog (same source as Slide 2 Column 2)
- **Date:** January 27, 2026

#### "Manual testing forever loop"

> "You'll be doing manual testing over and over again."

- **Publication:** Katalon — "Front-End Test Automation: How to Automate UI Testing the Right Way"
- **Date:** February 5, 2026
- **URL:** https://katalon.com/resources-center/blog/automated-front-end-testing

#### "The IKEA furniture analogy"

> "If you're in the world of software development, you've likely experienced this frustration. But even if you're not, imagine trying to assemble IKEA furniture with instructions that change every time you look at them — that's what flaky tests feel like to developers."

- **Publication:** Tuskr — "Flaky Tests: How to Avoid the Downward Spiral"
- **Date:** February 19, 2026
- **URL:** https://tuskr.app/article/flaky-tests-how-to-avoid-the-downward-spiral-of-bad-tests-and-bad-code

#### "Velocity vs quality tradeoff"

> "This friction delays feedback loops. Developers wait for test results that are held up by 'flaky' infrastructure. Business leaders see a growing QA budget without a corresponding increase in software quality."

- **Publication:** Medium — *"Self-Healing Test Automation: Ending the Flaky Test Problem in AI-Driven QA"* by Bugraptors
- **Date:** March 2026
- **URL:** https://medium.com/@bugraptorsQAcompany/self-healing-test-automation-ending-the-flaky-test-problem-in-ai-driven-qa-174dc16c3889

### 6.4 Honest caveats

- **No raw Reddit thread quotes.** Reddit searches via standard search engines returned too few clean, attributable threads to cite. Every quote above is from a named engineering source with a public URL — same kind of raw venting, stronger attribution than anonymous Reddit usernames.
- **No quotes invented or paraphrased.** Every quote is verbatim from the linked source.
- **All quotes are 2026.** Per your direction, all developer messages on the deck post-date 2025.
- **All numbers are from named, reputable sources** (Stack Overflow, LambdaTest, named engineering blogs with public URLs). No vendor-marketing-blog stats used as primary citations.
- **The one 2025 number (Stack Overflow Survey)** is included only because no comparable 2026 industry survey has been published — and that's the survey 49,000 developers across 177 countries actually answered, which is hard to beat for credibility.

---

## 7. Glossary for non-technical judges

A handful of terms appear on the deck or in the voiceover. If a judge isn't a developer, this is the cheat sheet:

| Term | Plain meaning |
|---|---|
| **Contract / promise** | A short, written claim about what a piece of UI should do (which API to call, how fast, what the response should look like). |
| **Agent** | A small program that opens your app in a real browser, drives every promised behavior, and checks whether it happens. |
| **Playwright** | An open-source browser-automation library by Microsoft. Saync uses it as the engine inside the agent. |
| **Flaky test** | A test that passes sometimes and fails other times without any code change. The #1 frustration in modern testing. |
| **Dashboard** | A web page that lists every run, every failure, and the gap between what was promised and what really happened. Lives at `localhost:3777`. |
| **Flow** | A small file listing a multi-step user journey (login, checkout, etc.) that the agent walks through end-to-end. |
| **Local-first** | The whole product runs inside the developer's own laptop / repo. No cloud, no signup, no telemetry. |

---

## 8. What changed in this version of the spec

| Section | Was | Now |
|---|---|---|
| §1 locked decisions | 8 items, no architecture decision called out | 9 items — added the "local-first" architectural truth as decision #9 |
| Slide 5 step 02 | "Playwright reads the contracts, performs the actions, checks API calls and response shapes" | Adds the actual install command (`npm install --save-dev saync-web`) and boot command (`saync start`) so judges see how lightweight the setup really is |
| Slide 5 step 03 | "Live stream. Per user. Per flow…" | Names the local dashboard URL `localhost:3777` and the side-by-side `expected vs observed` view; calls out "no login, no cloud, no telemetry" |
| Slide 6 demo shot list | Used `pnpm test:saync` (old command) | Uses `npm run saync` (the published flow). References `saync.flows.ts`. Dashboard URL is `localhost:3777`. Demo app on `localhost:5174` (Vite default). |
| Slide 6 voiceover | Generic Playwright reference | Plain English; describes wrong-shape API + screenshot capture explicitly |
| Slide 7 packages | Listed `@saync/backend` (a package that no longer exists) | Lists the live npm map: `saync-web` + `@saync/core` + `@saync/react` + `@saync/agent`. The headline becomes "48 hours. Four packages. One install." |
| Slide 7 prose | "SSE streaming, Drizzle schema, embedded backend mode" | Tells the **SaaS-to-local-first pivot** story — we built one architecture, deleted the server tier, rebuilt as local-first in half a day. Stronger Bob-velocity proof. |
| Slide 8 closer | "surfaced before they ship" | Same; voiceover slightly simpler |
| §5 production checklist | "Record the demo, optional Bob screenshot" | Adds the exact commands to record against the published package; adds link-sanity-check step |
| §7 glossary | (didn't exist) | New — plain-English definitions of 7 terms in case a judge isn't a developer |
| Voiceovers | Some used jargon ("contract", "anecdotal", "Playwright agent") inline | Rewritten in plain spoken English while keeping every technical term that was already on the slide. Judges hear "promise" / "wrong shape" / "side by side" instead of dense vocabulary. |

The verified 2026 quotes (§6.1) and statistics (§6.2) are **unchanged**. Those are the deck's evidence base and must stay verbatim.
