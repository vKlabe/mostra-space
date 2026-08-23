const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//MostraSpace//Launch Presentation//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:mostra-space-launch-20260915T180000@mostra.space
DTSTAMP:20260823T073500Z
DTSTART;TZID=Europe/Rome:20260915T180000
DTEND;TZID=Europe/Rome:20260915T190000
SUMMARY:MostraSpace Launch Presentation
DESCRIPTION:Official MostraSpace presentation: a live guided presentation from inside a digital gallery. Landing page: https://mostra.space/launch
LOCATION:Online - mostra.space/launch
URL:https://mostra.space/launch
END:VEVENT
END:VCALENDAR`;

export async function GET() {
  return new Response(icsContent, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="mostra-space-launch.ics"',
      "Cache-Control": "public, max-age=3600",
    },
  });
}
