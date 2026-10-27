# ziki-rollcall

**Agent Roll Call**: when you come back to Ziki, your agents line up and each says, in one sentence, what it did while you were away. Then they get out of your way.

This is a design demo (HNG15 Week 5, Team Vulcan) built on a copy of the real Ziki dashboard. It runs on **mock data only**: no database, no sign-in, no API.

> The UI is copied from [Zedu-Endor/issue-tracker](https://github.com/Zedu-Endor/issue-tracker) for an HNG15 design demo, with mock data. Ziki's MIT license notice is in [`LICENSE-ZIKI`](./LICENSE-ZIKI).

## What is here

| Route | What it is |
| --- | --- |
| `/dashboard` | Ziki's dashboard, with the roll call card above the stat cards and a small "Demo controls" strip on top |
| `/issues` | Ziki's issues list (Inbox, tabs, filters, rows) over mock rows |
| `/settings` | Ziki's Settings, Preferences section, with the **Agent roll call** switch |
| anything else | A "Not part of this demo" page, so no link in the header ends on a 404 |

## How the copy was made

- 113 files are byte-for-byte copies from the reference repo (styles, theme tokens, fonts, the app header, the overview components, the shell pieces and the lib helpers they use).
- The backend is gone. `requireUser`, Prisma and the loaders are replaced by [`lib/mock-data.ts`](./lib/mock-data.ts) and [`lib/mock-issues.ts`](./lib/mock-issues.ts). Server actions (`app/actions/*`) are mocks that keep the same names, so the copied components did not have to change. `@prisma/client` is a type-only shim ([`lib/prisma-client-shim.ts`](./lib/prisma-client-shim.ts)).
- Small edits to copied files: `components/agent-graphic.tsx` (optional `gesture`, eye, sleep and antenna hooks; the plain robot is unchanged) and `components/dashboard-agents.tsx` (two `data-` attributes so robots can land on their row).

## The roll call

All of it is in [`components/roll-call/`](./components/roll-call).

- **Arrival (about 1.5s, once per return):** the card fades in and rises from `scale(0.96)`. Robots hop in from the left one by one and step forward as their lines appear. A robot that needs you raises a hand; one that did work waves once.
- **Only on hover, tap or "Got it" (never on load):** a robot's eyes follow the cursor (2px at most, fine pointers only); tapping the sleeping robot opens one eye for 2s with "Nothing to report"; tapping the raised hand slides the question card out; "Got it" makes every robot salute, turns its antenna light green, and flies it into its row in "Your agents" before the card folds away.
- **Motion rules:** transform and opacity only, Ziki's `cubic-bezier(0.2, 0.7, 0.2, 1)`, nothing loops. With `prefers-reduced-motion` (or the "Preview reduced motion" demo control) the card is text only and "Got it" hides it at once.
- **Off switch:** the card's "Don't show this" link, or Settings → Preferences. State is saved in `localStorage`.

## Run it

```bash
pnpm install
pnpm dev        # http://localhost:3001
pnpm build
```
