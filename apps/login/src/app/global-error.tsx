"use client";

import { ThemeWrapper } from "@/components/theme-wrapper";
import { useEffect } from "react";

// Aware Smith fork (2026-09-10): the ROOT error boundary renders nothing visible,
// same as the route boundary in (login)/error.tsx. When the transient
// "Error in input stream" escapes the route (the stream abort lands on the root
// layout while the browser is already navigating to the relying party), Next.js
// falls back to this component; upstream's red "Login Error / Try Again" box
// flashed here for the half second until the app painted. The error is logged;
// a persistent failure shows as a blank themed page (reload recovers). Drop when
// upstream fixes the race.
export default function GlobalError({ error }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.log("logging global error:", error);
  }, [error]);

  return (
    // global-error must include html and body tags
    <html>
      <body>
        <ThemeWrapper branding={undefined}>
          <div data-testid="login-global-error-boundary" className="min-h-screen" aria-hidden="true" />
        </ThemeWrapper>
      </body>
    </html>
  );
}
