const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//MostraSpace//Presentazione Lancio//IT
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:mostra-space-launch-20260915T180000@mostra.space
DTSTAMP:20260823T080000Z
DTSTART;TZID=Europe/Rome:20260915T180000
DTEND;TZID=Europe/Rome:20260915T190000
SUMMARY:Presentazione ufficiale MostraSpace
DESCRIPTION:Presentazione ufficiale di MostraSpace: una visita guidata live dall’interno di una galleria digitale. Pagina evento: https://mostra.space/launch
LOCATION:Online - mostra.space/launch
URL:https://mostra.space/launch
END:VEVENT
END:VCALENDAR`;

export async function GET() {
  return new Response(icsContent, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="presentazione-mostraspace.ics"',
      "Cache-Control": "public, max-age=3600",
    },
  });
}
