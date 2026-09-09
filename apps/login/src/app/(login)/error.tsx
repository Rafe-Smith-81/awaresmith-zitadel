"use client";

import { useEffect } from "react";

export default function Error({ error, reset }: any) {
  useEffect(() => {
    console.log("logging error:", error);
  }, [error]);

  // Aware Smith fork (2026-09-08): the route error boundary renders NOTHING.
  // On the U2F verify step Next.js throws a transient "Error in input stream"
  // while the browser is already navigating to the relying party; upstream's
  // red "Login Error / Try Again" box flashed for the half second until the app
  // painted. The failure is still logged above; a persistent error now shows as
  // a blank page (reload recovers). Drop this file when upstream fixes the race.
  return <div data-testid="login-error-boundary" className="min-h-screen" aria-hidden="true" />;
}
