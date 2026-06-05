import { Resend } from "resend";

type SendGalleryInquiryEmailParams = {
  to: string;
  galleryTitle: string;
  gallerySlug: string;
  inquiryName: string;
  inquiryEmail: string;
  inquiryMessage: string | null;
  artworkTitle?: string | null;
};

const resendApiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.RESEND_FROM_EMAIL || "Art Portal <onboarding@resend.dev>";

export async function sendGalleryInquiryEmail({
  to,
  galleryTitle,
  gallerySlug,
  inquiryName,
  inquiryEmail,
  inquiryMessage,
  artworkTitle,
}: SendGalleryInquiryEmailParams) {
  if (!resendApiKey) {
    console.warn("[Email] RESEND_API_KEY assente. Email non inviata.");
    return {
      sent: false,
      reason: "missing_api_key",
    };
  }

  const resend = new Resend(resendApiKey);

  const subject = artworkTitle
    ? `Nuova richiesta per l'opera: ${artworkTitle}`
    : `Nuova richiesta per la galleria: ${galleryTitle}`;

  const publicGalleryUrl = `/gallerie/${gallerySlug}`;

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
      <h1 style="font-size: 22px; margin-bottom: 12px;">
        Nuova richiesta ricevuta
      </h1>

      <p>
        Hai ricevuto una nuova richiesta dal portale Art Portal.
      </p>

      <hr style="border: none; border-top: 1px solid #ddd; margin: 24px 0;" />

      <p><strong>Galleria:</strong> ${galleryTitle}</p>
      <p><strong>Link pubblico:</strong> ${publicGalleryUrl}</p>

      ${
        artworkTitle
          ? `<p><strong>Opera richiesta:</strong> ${artworkTitle}</p>`
          : `<p><strong>Tipo richiesta:</strong> richiesta generale sulla galleria</p>`
      }

      <hr style="border: none; border-top: 1px solid #ddd; margin: 24px 0;" />

      <p><strong>Nome:</strong> ${inquiryName}</p>
      <p><strong>Email:</strong> ${inquiryEmail}</p>

      <p><strong>Messaggio:</strong></p>
      <div style="background: #f6f6f6; padding: 16px; border-radius: 12px;">
        ${(inquiryMessage || "Nessun messaggio.").replace(/\n/g, "<br />")}
      </div>

      <p style="margin-top: 24px;">
        Puoi rispondere direttamente a questa email oppure aprire la dashboard richieste.
      </p>
    </div>
  `;

  const text = `
Nuova richiesta ricevuta

Galleria: ${galleryTitle}
Link pubblico: ${publicGalleryUrl}
${artworkTitle ? `Opera richiesta: ${artworkTitle}` : "Tipo richiesta: richiesta generale sulla galleria"}

Nome: ${inquiryName}
Email: ${inquiryEmail}

Messaggio:
${inquiryMessage || "Nessun messaggio."}
  `;

  const result = await resend.emails.send({
    from: fromEmail,
    to,
    subject,
    html,
    text,
    replyTo: inquiryEmail,
  });

  if (result.error) {
    console.error("[Email] Errore invio Resend:", result.error);

    return {
      sent: false,
      reason: "resend_error",
      error: result.error,
    };
  }

  return {
    sent: true,
    id: result.data?.id || null,
  };
}