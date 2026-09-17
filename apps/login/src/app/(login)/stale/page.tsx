import { AwaresmithStale } from "@/components/awaresmith-stale";
import { DynamicTheme } from "@/components/dynamic-theme";
import { getServiceConfig } from "@/lib/service-url";
import { getBrandingSettings } from "@/lib/zitadel";
import { Metadata } from "next";
import { headers } from "next/headers";

// Aware Smith fork (2026-09-16): the landing page for a login request that is unknown, already
// finished or unreadable. /login redirects here instead of answering with raw JSON.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Your sign-in went stale" };
}

export default async function Page() {
  const _headers = await headers();
  const { serviceConfig } = getServiceConfig(_headers);
  // Branding is a nicety here; a failure to load it must not stop the page that gets people out.
  const branding = await getBrandingSettings({ serviceConfig }).catch(() => undefined);

  return (
    <DynamicTheme branding={branding}>
      <AwaresmithStale />
    </DynamicTheme>
  );
}
