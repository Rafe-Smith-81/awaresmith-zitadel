"use client";

import { useEffect, useState } from "react";

// Aware Smith fork (2026-09-16): where a login that went stale ends up, instead of a blank page or
// Next's red "Login Error" box. Sign-in pages expire — a tab left open, a reloaded page after the
// login finished, a copied link, this app rebuilt under an open tab — and none of that is the
// person's fault. So the page says so, counts down, and restarts sign-in at the app, which hands
// out a fresh login request (and, with a live session, finishes it without asking anything).
//
// The app's own loop guard counts these restarts and stops at "Sign-in isn't working in this
// browser" after two, so a real outage cannot turn this into an endless loop.
//
// `delayMs` is for the error boundaries: on the security-key step Next.js throws a transient
// "Error in input stream" while the browser is ALREADY navigating to the app. Staying blank for a
// moment lets that navigation win, so the flash never shows; if we are still here after the delay,
// the error was real.

// Same origin as this login UI (it is served under the app at /ui/v2/login), so a path is enough.
const SIGNIN_PATH = "/account/signin";

export function AwaresmithStale({ delayMs = 0, seconds = 3 }: { delayMs?: number; seconds?: number }) {
  const [visible, setVisible] = useState(delayMs <= 0);
  const [left, setLeft] = useState(seconds);

  useEffect(() => {
    if (visible) return;
    const timer = setTimeout(() => setVisible(true), delayMs);
    return () => clearTimeout(timer);
  }, [visible, delayMs]);

  useEffect(() => {
    if (!visible) return;
    if (left <= 0) {
      window.location.replace(SIGNIN_PATH);
      return;
    }
    const timer = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(timer);
  }, [visible, left]);

  if (!visible) {
    return <div data-testid="login-error-boundary" className="min-h-screen" aria-hidden="true" />;
  }

  return (
    <div data-testid="awaresmith-stale" className="mx-auto flex w-full max-w-md flex-col space-y-4 px-4 py-8">
      <h1>Your sign-in went stale</h1>
      <p className="ztdl-p">
        Sign-in pages expire. This one was open too long, used in another tab, or started before a sign-out.
        We&apos;re sending you back to sign in.
      </p>
      <p className="ztdl-p font-semibold" aria-live="polite" data-testid="awaresmith-stale-countdown">
        {left > 0 ? `Trying again in ${left}…` : "Sending you now…"}
      </p>
      <div className="flex flex-row items-center gap-4">
        <a
          href={SIGNIN_PATH}
          data-testid="awaresmith-stale-go"
          className="rounded-md bg-primary-light-500 px-4 py-2 text-sm text-white dark:bg-primary-dark-500"
        >
          Go now
        </a>
        <a href="/" className="text-sm underline">
          Cancel
        </a>
      </div>
    </div>
  );
}
