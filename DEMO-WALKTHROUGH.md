# Saync demo — step-by-step runbook

A scripted walkthrough you can record (or do live). Goal: prove the
story **"AI ships broken code; you miss bugs in manual testing; Saync
catches them automatically."**

Every prompt below is copy-paste-ready. Use any AI assistant: Claude,
Cursor, ChatGPT, Copilot Chat. The instructions assume Claude/ChatGPT
in a fresh web chat; adapt the "paste into the chat" steps for Cursor's
inline edits if that's your tool.

---

## The narrative arc

| Beat | What the viewer sees |
|---|---|
| 1 | Dev asks an AI to build a small shop feature. AI delivers code. |
| 2 | Dev runs it. Manually clicks the Buy button — page looks normal. Submits the login form with empty fields — it submits anyway. Dev shrugs. |
| 3 | Dev installs `saync-web`, asks the same AI to wrap the components with Saync (using the LLM context download). AI does it in one shot. |
| 4 | Dev runs `npm run saync`. The agent drives the app. Three contracts fail. Each one is a real bug the manual test missed. |
| 5 | Dev clicks "Generate report". Claude/WatsonX explains the root cause + suggests a fix. |

End-to-end: ~5 minutes of recording.

---

## Step 0 — Setup (one time, off-camera)

```bash
# Fresh project, somewhere visible on your machine
cd ~/Desktop && rm -rf saync-shop-demo
npx create-next-app@latest saync-shop-demo \
  --typescript --tailwind --app --src-dir --no-eslint \
  --import-alias "@/*" --use-npm --no-turbopack
cd saync-shop-demo

# Install Saync
npm install --save-dev saync-web

# Install Chromium for the agent (one-time per machine)
npx playwright install chromium

# BYOK LLM — pick one. Anthropic is fastest to set up. ROTATE keys after recording.
echo "ANTHROPIC_API_KEY=sk-ant-xxxxxxxx" > .env
chmod 600 .env

# Add the saync scripts. Open package.json and add inside "scripts":
#   "saync":     "saync start",
#   "saync:run": "saync run"
```

Then download the LLM context file so you can paste it into the AI:

```bash
# Easiest: download from npmjs (always matches the published version)
curl -o saync-llm.md https://unpkg.com/saync-web/public/saync-llm.md
# OR boot saync once and grab it from the local dashboard
# npm run saync   # then in another shell:  curl -o saync-llm.md http://localhost:3777/saync-llm.md
```

Keep `saync-llm.md` on your desktop or anywhere you can paste from.

---

## Step 1 — Open a fresh AI chat

Claude.ai, ChatGPT, or Cursor — your pick. Use a **new conversation**
so there's no leaked context.

---

## Step 2 — PROMPT 1: ask the AI for a small shop feature (no Saync yet)

> Paste this into the AI as your first message.

```
You are pair-programming with me on a fresh Next.js 14 app (App
Router, TypeScript, Tailwind). I want a small bookstore page.

Please produce code for THREE files only:

1. `src/app/page.tsx`
   - A heading "Bookstore"
   - One book card showing the title "The Pragmatic Programmer", price
     $24.99, and a "Buy now" button
   - A separate <form> with email + password inputs and a "Log in"
     submit button. On success, navigate to `/account` using
     `useRouter().push`.
   - Below the form, a small "Cart: N items" badge. Fetch the count
     from `/api/cart-count` on mount.
   - Use `'use client'` since we need React state and fetch.
   - Keep the file under 80 lines. No try/catch on fetch, no
     response.ok checks, no input validation attributes. Just write
     the minimum code that "works on the happy path".

2. `src/app/api/buy/route.ts`
   - POST handler that returns `{ orderId: 'ord-' + Date.now() }`
     with HTTP 200.

3. `src/app/api/login/route.ts`
   - POST handler that returns `{ token: 'jwt-' + Date.now(), user: { id: 1 } }`
     with HTTP 200.

Do NOT generate /api/cart-count — we'll deal with that later.
Do NOT use any UI library other than Tailwind.
Output each file in its own fenced code block with the path as the
first comment.
```

The AI will give you three files. **Save them to disk verbatim** —
don't edit. The "minimum code that works on the happy path"
instruction is what produces the bugs we want to catch.

---

## Step 3 — Run the app manually (the failed dev-test moment)

```bash
npm run dev
```

Open <http://localhost:3000>. On camera, do these three things, in
this order:

| Try this | What happens | What it should reveal |
|---|---|---|
| Click "Buy now" | Nothing visible changes. No error. The button looks like it worked. | The dev shrugs, assumes the purchase went through. |
| Submit the login form with **empty** email and password fields | The form submits anyway. No HTML5 validation triggers. | Required-field validation is missing — but the dev didn't notice because the API returns 200. |
| Look at the Cart badge | It probably shows "Cart: NaN items" or "Cart: undefined items" because `/api/cart-count` doesn't exist (404 → JSON parse fails). | The dev *might* notice this one. Pretend they don't. |

Stop the dev server. Time to add Saync.

---

## Step 4 — PROMPT 2: paste Saync's LLM context to teach the AI

> In the **same chat**, paste this as one message. The placeholder
> `<<<PASTE saync-llm.md HERE>>>` should be replaced with the actual
> contents of `saync-llm.md` (the file you downloaded in Step 0).

```
Here is the complete Saync context. Read it carefully — you'll use
it in my next prompt.

<<<PASTE saync-llm.md HERE>>>
```

Wait for the AI to acknowledge it understood. One sentence is fine.

---

## Step 5 — PROMPT 3: ask the AI to wrap the existing code with Saync

> Paste this immediately after the AI acknowledges the context.

```
Good. Now retrofit the bookstore page from earlier with Saync
contracts. Three concrete changes:

1. Wrap the entire `src/app/page.tsx` in `<Saync.Provider mode="log">`.

2. Replace the "Buy now" button with `<SayncButton>` declaring a
   contract:
     name="buy-now"
     expects.onClick.apiCall = {
       method: 'POST',
       url: '/api/buy',
       expectedStatus: 200,
       maxDuration: 1000
     }
     expects.onClick.responseShape = { orderId: 'string' }

3. Replace the login `<form>` with `<SayncForm>`, the email and
   password `<input>`s with `<SayncInput>`. Declare:
     SayncForm:
       name="login"
       expects.onSubmit.apiCall = { method: 'POST', url: '/api/login', expectedStatus: 200 }
     SayncInput (email):
       name="email", type="email"
       expects.validation = { required: true }
     SayncInput (password):
       name="password", type="password"
       expects.validation = { required: true, minLength: 8 }

Also create `saync.flows.ts` at the repo root with ONE flow:
   name: "buy-now"
   steps: [
     { interact: 'buy-now' },
     { wait: 500 }
   ]

Important: do NOT change the JSX `required` or `minLength` attributes
on the inputs themselves. Leave them as plain `<input>` props
without those attributes. Saync will catch the mismatch — that's
the point of the demo.

Output the full updated `src/app/page.tsx` and the new
`saync.flows.ts` in two code blocks.
```

This prompt is the trick of the whole demo: **the contract says
the inputs are required + min-length-8, but the JSX never sets those
attributes.** Saync will flag the divergence between *what the
developer declared* and *what the DOM actually does*.

Save both files to disk verbatim. Don't fix the contract / JSX
mismatch — it's the demo.

---

## Step 6 — Add a `saync.config.ts` to your repo root

> Type this into a new file `saync.config.ts` (or ask the AI in one
> more prompt). Keep it short.

```ts
export default {
  appUrl: 'http://localhost:3000',  // Next.js dev port
  port: 3777,                       // Saync dashboard port
  mode: 'local' as const,
  watch: ['src/**/*.{ts,tsx}'],
};
```

---

## Step 7 — Boot Saync + run the agent

Open two terminal tabs:

```bash
# tab 1 — your Next.js app
npm run dev
```

```bash
# tab 2 — Saync (in local mode, this also boots the watcher)
npm run saync
```

Open <http://localhost:3777> in a browser. You'll see the
**OnboardingHero** because there are no runs yet.

Now trigger the agent — open a **third** terminal tab:

```bash
npm run saync:run
```

Watch the dashboard at `localhost:3777`. On the run-detail page (it
auto-navigates after one run), the **Live pill pulses** and contracts
stream in. Three of them fail:

| Contract | Why it fails |
|---|---|
| `Login.email.change` | Declared `validation.required = true` but the `<input>` has no `required` attribute. |
| `Login.password.change` | Same — plus `minLength: 8` not on the DOM. |
| `Login.submit` *(maybe)* | The form may submit before the agent's network capture window closes — race condition that a real production reporter would catch on real users too. |

**These are the bugs your manual test missed.**

---

## Step 8 — Click "Generate report" on the failed issue

On the dashboard, click one of the failed contracts to open the issue
detail page. Scroll down to the **AI analysis** section. Click
**Generate report**.

Claude (or whichever provider you configured in `.env`) returns a
markdown report in ~10–15 seconds with:

- **Root cause:** declared validation rules don't appear on the DOM
- **Suggested fix:** an actual TSX diff adding `required` and
  `minLength={8}` to the input attributes
- **Related checks:** other contracts to verify (form submit,
  resetAfterSubmit, etc.)

Click **Download .md** if you want to keep the report.

---

## Step 9 — Apply the fix (optional victory lap)

> Paste this one last prompt to wrap the demo.

```
Here is the Saync issue report:

<<<PASTE THE MARKDOWN FROM THE DASHBOARD HERE>>>

Apply the suggested fix to `src/app/page.tsx`. Only output the diff
or the changed lines — don't re-emit the whole file.
```

Save the change. Saync's local-mode watcher re-runs the agent
automatically. Switch back to the dashboard — the failing contracts
turn green. **End the recording here.**

---

## Total time on camera

| Beat | Real time |
|---|---|
| Prompt 1 → AI delivers the naive feature | ~30s of AI response + 15s typing |
| Manual testing → "looks fine to me" shrug | ~20s |
| Prompt 2 + 3 → AI wraps with Saync | ~45s |
| `npm run saync` boot | ~3s |
| Agent run + live SSE updates | ~15s |
| "Generate report" → Claude markdown | ~12s |
| Apply fix → contracts go green | ~15s |
| **Total raw footage** | **~2.5 minutes** |

After light editing (trim AI thinking time, skip empty `npm install`
output) you'll land at the 90–150 second mark.

---

## Avoid these on camera

- **Don't show your `.env`** — your Anthropic key is in it.
- **Don't paste the same prompts to a public LLM that's logged** if
  the demo code includes anything sensitive. (The demo above is
  fully synthetic — fine to use anywhere.)
- **Don't accept the AI's first response if it auto-fixed the bug.**
  Modern frontier models sometimes add `required` to inputs even
  when the prompt explicitly says not to. If that happens, re-prompt:
  *"You added `required` to the inputs — remove it. The whole point
  is that Saync should catch the divergence, not that the JSX is
  already correct."*

---

## Why this demo lands

It's the IBM Bob hackathon thesis in 2 minutes:

1. **AI writes code that looks right.**
2. **Humans miss what AI missed.**
3. **A contract layer catches the gap automatically.**

Saync isn't competing with the AI. It's the verification layer that
makes shipping AI-generated code safe. That's the closing line of
your voiceover if you want one.
