import Link from "next/link";
import T from "@/components/i18n/T";
import { getVisiblePremio } from "@/lib/premio/server";
import { PREMIO_PATH } from "@/lib/premio/config";
import { createPublicMetadata, NO_INDEX_METADATA } from "@/lib/seo/site";
export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const { edition } = await getVisiblePremio();
  return { ...createPublicMetadata({ title: "Regolamento · Premio Mostra.Space", description: "Regolamento, requisiti, calendario e criteri del Premio Mostra.Space.", path: `${PREMIO_PATH}/regolamento` }), ...(!edition.published ? NO_INDEX_METADATA : {}) };
}
export default async function RulesPage() {
  const { edition, preview } = await getVisiblePremio();
  return <main className="premio-wrap py-12"><Link className="premio-text-link" href={PREMIO_PATH}>← {edition.title}</Link><h1 className="mt-8 font-editorial text-5xl"><T textKey="premio.rules" /></h1>
    {(edition.published && edition.rules_approved) || preview ? <><p className="premio-note mt-5">{edition.rules_version} · {edition.organizer}</p><div className="premio-rules mt-8">{edition.rules_text}</div></> : <p className="premio-status mt-8"><T textKey="premio.rulesSoon" /></p>}
  </main>;
}
