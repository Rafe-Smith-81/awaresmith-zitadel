# awaresmith-zitadel — Aware Smith fork of `zitadel/zitadel`

Fleet member since 2026-09-09. Exists for ONE reason: to build our Login V2 image
`awaresmith/zitadel-login:v4.17.3-as.N`. Everything outside `apps/login` is untouched upstream.

**Branch:** `awaresmith/v4.17.3` (default) — upstream tag `v4.17.3` + the patches below.
**Temporary by design:** drop this fork, the `ZITADEL_LOGIN_IMAGE` env and the image tag the moment
upstream fixes the race. Rebase + rebuild on every Zitadel version bump (login UI and core are
versioned together).

## The patches

| File | Change | Since |
|---|---|---|
| `apps/login/src/components/awaresmith-stale.tsx` | **new** — "Your sign-in went stale", 3-second countdown, then `/account/signin` on the same origin; optional blank delay | as.3 |
| `apps/login/src/app/(login)/error.tsx` | route error boundary: blank 1.5 s, then the stale component | as.2 → as.3 |
| `apps/login/src/app/global-error.tsx` | root error boundary: same | as.2 → as.3 |
| `apps/login/src/app/(login)/stale/page.tsx` | **new** — themed page that renders the stale component | as.3 |
| `apps/login/src/app/login/route.ts` | missing / unknown / already-finished / unreadable login request → redirect to `/stale` instead of raw JSON 400/500 | as.3 |

**as.2 (2026-09-10) was presentational only**: both boundaries rendered nothing, to hide Next.js's
transient "Error in input stream" on the security-key step while the browser was already navigating
to the app. That also hid REAL errors — a stale login request showed a blank page with no way out.

**as.3 (2026-09-16) is not presentational only.** It changes what a failure DOES: the boundaries wait
1.5 s (the navigation wins, so the flash still never shows), then show the stale page and restart
sign-in at the app; `/login` redirects known-stale requests there too. The app's loop guard
(gateway `SigninRecovery`) stops restarts after two, so an outage cannot loop.
Plan: `awaresmith-gateway/SIGNIN-RECOVERY-PLAN.md` (K6, scenarios C1–C5).

## Build (what `apps/login/Dockerfile` does NOT do)

The Dockerfile only packages a prebuilt `.next/standalone`. Build it in a node:24 container from
the repo root (no Node on the host):

```
pnpm install --frozen-lockfile --filter "." --filter "@zitadel/login..."
pnpm --filter @zitadel/proto generate
pnpm --filter @zitadel/client build
pnpm --filter @zitadel/login build
```

Then `docker build -f apps/login/Dockerfile -t awaresmith/zitadel-login:v4.17.3-as.N apps/login`.
The exact container invocation lives in the wiki (gateway → "Login V2 image"). Peak ~1.2 GB RAM,
~10 min; cap `NODE_OPTIONS=--max-old-space-size` on the 4 GB Docker VM.

**Arch:** the bundle is NOT portable — `pnpm install` pulls `sharp`'s native module for the build
host (`@img/sharp-linux-arm64` on a Mac). Build the bundle AND the image on the target arch: on the
sales box (amd64) run the same node:24 container against the rsynced source, then `docker build`
there. A `--platform linux/amd64` image built from a Mac bundle would ship arm64 `sharp`.

## Where it is used

- `awaresmith-infra/docker-compose.yml`: `image: ${ZITADEL_LOGIN_IMAGE:-<stock ghcr pin>}`
- dev: `awaresmith-infra/.env` → `ZITADEL_LOGIN_IMAGE=awaresmith/zitadel-login:v4.17.3-as.N`
- sales: `deploy-sales-slice.sh env` writes the same into `sales.env`; the image is shipped with
  `docker save | ssh … docker load` (no registry). See TEST-HARNESS → sales slice.

Trivy: same findings as the stock image (identical source): openssl CVE-2026-14456 (alpine 3.24),
brace-expansion / ip-address / tar (bundled npm). Tracked in `CI-DEFERRED.md`.
