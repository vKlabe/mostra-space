import { redirect } from "next/navigation";
import T from "@/components/i18n/T";
import PremioRegistration from "@/components/premio/PremioRegistration";
import { getPremioSession } from "@/lib/premio/server";
import { PREMIO_DASHBOARD, PREMIO_PATH } from "@/lib/premio/config";
import { getSafePostAuthPath } from "@/lib/auth/safeNavigation";
import { NO_INDEX_METADATA } from "@/lib/seo/site";
export const dynamic = "force-dynamic";
export const metadata = { title: "Iscrizione al Premio Mostra.Space", ...NO_INDEX_METADATA };
export default async function PremioSignup({ searchParams }: { searchParams: Promise<{ next?: string; intent?: string }> }) {
  const query = await searchParams;
  const support = query.intent === "support";
  const candidate = getSafePostAuthPath(query.next, support ? PREMIO_PATH : PREMIO_DASHBOARD);
  const next = support && /^\/premiomostraspace\/\d{4}\/[^/?#]+(?:\?.*)?$/.test(candidate) ? candidate : support ? PREMIO_PATH : PREMIO_DASHBOARD;
  const { user } = await getPremioSession();
  if (user) redirect(next);
  return <main className="premio-wrap"><section className="grid gap-10 py-14 lg:grid-cols-2 lg:items-start"><div>
    <p className="museum-label">Premio Mostra.Space 2026</p><h1 className="mt-5 font-editorial text-5xl md:text-7xl"><T textKey={support ? "premio.supportTitle" : "premio.signupTitle"} /></h1>
    <p className="premio-note mt-6"><T textKey={support ? "premio.supportDescription" : "premio.signupDescription"} /></p><p className="premio-status mt-6"><T textKey="premio.freePromise" /></p>
  </div><PremioRegistration next={next} support={support} /></section></main>;
}
