"use client";

import { AwaresmithStale } from "@/components/awaresmith-stale";
import { useEffect } from "react";

export default function Error({ error }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.log("logging error:", error);
  }, [error]);

  // Aware Smith fork: blank for 1.5 s, then the stale page with a countdown back to sign-in.
  //
  // 2026-09-08 this rendered nothing at all, to hide the transient "Error in input stream" Next.js
  // throws on the security-key step while the browser is already navigating to the app. That hid
  // REAL errors too — a stale login request showed as a blank page with no way out (2026-09-15).
  // The delay keeps the flash hidden (the navigation wins); anything still here afterwards is real
  // and gets a way back. Drop this file when upstream fixes the race.
  return <AwaresmithStale delayMs={1500} />;
}
