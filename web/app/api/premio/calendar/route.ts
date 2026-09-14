import { getPremioEdition } from "@/lib/premio/server";
export const dynamic = "force-dynamic";
function stamp(value: string) { return new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z"); }
export async function GET() {
  const edition = await getPremioEdition();
  if (!edition?.published) return new Response(null, { status: 404 });
  const content = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Mostra.Space//Premio//IT", "CALSCALE:GREGORIAN", "BEGIN:VEVENT",
    `UID:premio-${edition.year}@mostra.space`, `DTSTAMP:${stamp(edition.updated_at)}`, `DTSTART:${stamp(edition.ceremony_at)}`,
    `DTEND:${stamp(new Date(Date.parse(edition.ceremony_at) + 3600000).toISOString())}`, `SUMMARY:Premiazione Mostra.Space ${edition.year}`,
    "URL:https://mostra.space/premiomostraspace/evento", "DESCRIPTION:Scopri i tre artisti vincitori del Premio Mostra.Space.", "END:VEVENT", "END:VCALENDAR", ""].join("\r\n");
  return new Response(content, { headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": 'attachment; filename="premio-mostraspace.ics"', "Cache-Control": "no-store" } });
}
