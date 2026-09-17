"use client";

import { AwaresmithStale } from "@/components/awaresmith-stale";
import { ThemeWrapper } from "@/components/theme-wrapper";
import { useEffect } from "react";

// Aware Smith fork: the ROOT error boundary, same treatment as (login)/error.tsx — blank for
// 1.5 s so the transient "Error in input stream" never flashes, then the stale page with a
// countdown back to sign-in. Next.js falls back here when the stream abort lands on the root
// layout, and when a rebuilt login app no longer knows an open tab's server action.
// Drop when upstream fixes the race.
export default function GlobalError({ error }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.log("logging global error:", error);
  }, [error]);

  return (
    // global-error must include html and body tags
    <html>
      <body>
        <ThemeWrapper branding={undefined}>
          <AwaresmithStale delayMs={1500} />
        </ThemeWrapper>
      </body>
    </html>
  );
}
