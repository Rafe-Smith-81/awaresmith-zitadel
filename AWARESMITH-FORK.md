# awaresmith-zitadel — Aware Smith fork of `zitadel/zitadel`

Fleet member since 2026-09-09. Exists for ONE reason: to build our Login V2 image
`awaresmith/zitadel-login:v4.17.3-as.N`. Everything else in this repo is untouched upstream.

**Branch:** `awaresmith/v4.17.3` (default) — upstream tag `v4.17.3` + the patches below.
**Temporary by design:** drop this fork, the `ZITADEL_LOGIN_IMAGE` env and the image tag the moment
upstream fixes the race. Rebase + rebuild on every Zitadel version bump (login UI and core are
versioned together).

## The patches (presentational only — no logic changed)

| File | Change |
|---|---|
| `apps/login/src/app/(login)/error.tsx` | route error boundary renders a blank page |
| `apps/login/src/app/global-error.tsx` | root error boundary renders a blank themed page |

Why: on the U2F verify step Next.js throws a transient "Error in input stream" while the browser is
already navigating to the relying party (`/signin-oidc`). Upstream's red "Login Error / Try Again" box
painted for the half second until the app rendered. Login still succeeds. The error is still logged
to the browser console; a persistent failure shows as a blank page and a reload recovers.
Verified 2026-09-10 on dev by Rafe across repeated sign-in/sign-out loops.

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
