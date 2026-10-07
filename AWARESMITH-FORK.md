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
| `apps/login/package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `apps/login/next.config.mjs`, `apps/login/Dockerfile` | `next` + `@next/eslint-plugin-next` 16.2.11 → 16.3.8; override `sharp@<0.35.5` → `^0.35.5` (resolves 0.35.5); override `@grpc/grpc-js@<1.14.5` → `^1.14.5` (resolves 1.14.5); `images: { unoptimized: true }`; `experimental.useTypeScriptCli: false`; base image pinned `node:24-alpine@sha256:ebfe2f90…ec1c1` | as.4 |

**as.2 (2026-09-10) was presentational only**: both boundaries rendered nothing, to hide Next.js's
transient "Error in input stream" on the security-key step while the browser was already navigating
to the app. That also hid REAL errors — a stale login request showed a blank page with no way out.

**as.3 (2026-09-16) is not presentational only.** It changes what a failure DOES: the boundaries wait
1.5 s (the navigation wins, so the flash still never shows), then show the stale page and restart
sign-in at the app; `/login` redirects known-stale requests there too. The app's loop guard
(gateway `SigninRecovery`) stops restarts after two, so an outage cannot loop.
Plan: `awaresmith-gateway/SIGNIN-RECOVERY-PLAN.md` (K6, scenarios C1–C5).

**as.4 (2026-10-06) is a security rebuild, with no UI change.** The login app shipped next 16.2.11, which has
GHSA-2xp9-vwfh-vxw4. That's a CRITICAL unauthenticated RCE: a libheif heap overflow, reached through `sharp`
when `/_next/image` optimizes an AVIF. `/ui/v2/login/_next/image` is public. as.3 was safe only by accident,
because its glibc `sharp` prebuilt can't load on Alpine musl. as.4 moves next to 16.3.8 and sharp to 0.35.5.
A first as.4 cut on 16.3.3 still had GHSA-vcvr-r3jv-pc5j (CRITICAL, `next/og` RCE, fixed 16.3.6), so as.4
took 16.3.8, the latest 16.3.x (2026-09-30, no GitHub advisories). The same cut had `@grpc/grpc-js` 1.14.4,
with CVE-2026-101916 (HIGH, fixed 1.14.5). A workspace override now forces 1.14.5, which has no advisories.
It also sets `images.unoptimized` (the app never uses `next/image`), so `/_next/image` is a 404 whatever sharp
does. A standalone probe proved it: as.4 answers 404, and as.3 answered 400 from the live optimizer. The
`node:24-alpine` base is now pinned by its multi-arch index digest. `experimental.useTypeScriptCli: false`
keeps 16.2's build type check. 16.3 switched to plain `tsc` over the whole tsconfig, which fails on type
errors in upstream `*.test.ts` files that 16.2 skipped. 16.3.8 still defaults it to true: a plain `tsc`
run found 50 errors, all in `*.test.ts(x)` and none in app code. The lockfile changed only next, `@next/*`,
sharp, `@img/*` and `@grpc/grpc-js`, plus next's own `postcss@8.5.23` and the lint plugin's
`@eslint-community/eslint-utils@4.9.1`. The rest is pnpm peer-context re-keys with no version changes.
The lockfile integrity of next 16.3.8, sharp 0.35.5 and grpc-js 1.14.5 matches the npm registry's
`dist.integrity`.

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

as.4 was built in this container on the dev box (amd64), from an rsync of the tree without
`node_modules`, `.git` or `.next`:

- image `node:24@sha256:3d27e5c11e5786e309ec3e03f93ae536eb36e6e5eb3714d5eb3300a36157add0`
- `--user 1000:1000`, the tree mounted at `/src` as the workdir, `HOME` set to a writable `/tmp` dir
- corepack pnpm 10.30.3 (the root `packageManager`). Nested scripts call `pnpm` directly, so run
  `corepack enable --install-directory <dir>` and put that dir on `PATH`.
- `NODE_OPTIONS=--max-old-space-size=6144`
- for the login build: `NEXT_PUBLIC_BASE_PATH=/ui/v2/login`, `NEXT_OUTPUT_MODE=standalone`

as.4 ran its install with `--no-frozen-lockfile` to regenerate the lock, then copied `pnpm-lock.yaml` back.
The exact container invocation also lives in the wiki (gateway → "Login V2 image"). Peak ~1.2 GB RAM,
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

Trivy (as.4, 2026-10-06, HIGH/CRITICAL, trivy 0.74.0, DB 2026-10-06): 0 CRITICAL. All 8 HIGHs are in the
base image's bundled npm (`/usr/local/lib/node_modules/npm`): brace-expansion 5.0.7 ×4, http-cache-semantics,
ip-address, tar and undici. The app doesn't run npm. Nothing in the app's own `node_modules` is flagged.
as.4 clears GHSA-2xp9-vwfh-vxw4, GHSA-vcvr-r3jv-pc5j, CVE-2026-75604, CVE-2026-101916, both sharp HIGHs
and openssl CVE-2026-14456 (alpine 3.24.2). Tracked in `CI-DEFERRED.md`.
