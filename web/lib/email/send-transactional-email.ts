import { createAdminClient } from "@/lib/supabase/admin";
import { getEmailFrom, getEmailReplyTo, getResend } from "@/lib/email/resend";

type SendTransactionalEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  templateKey: string;
  userId?: string | null;
  idempotencyKey?: string | null;
  metadata?: Record<string, unknown>;
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return JSON.stringify(error);
}

export async function sendTransactionalEmail({
  to,
  subject,
  html,
  text,
  templateKey,
  userId,
  idempotencyKey,
  metadata,
}: SendTransactionalEmailInput) {
  const admin = createAdminClient();
  const resend = getResend();
  const from = getEmailFrom();
  const replyTo = getEmailReplyTo();

  if (idempotencyKey) {
    const { data: existingLog } = await admin
      .from("email_logs")
      .select("id, status, provider_message_id")
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle<{
        id: string;
        status: string;
        provider_message_id: string | null;
      }>();

    if (existingLog?.status === "sent") {
      return {
        skipped: true,
        providerMessageId: existingLog.provider_message_id,
      };
    }
  }

  const { data: logRow, error: logInsertError } = await admin
    .from("email_logs")
    .insert({
      user_id: userId || null,
      to_email: to,
      from_email: from,
      reply_to: replyTo,
      subject,
      template_key: templateKey,
      idempotency_key: idempotencyKey || null,
      status: "pending",
      metadata: metadata || null,
    })
    .select("id")
    .single<{ id: string }>();

  if (logInsertError) {
    throw new Error(`Email log insert failed: ${logInsertError.message}`);
  }

  try {
    const { data, error } = await resend.emails.send({
      from,
      to: [to],
      subject,
      html,
      text,
      headers: replyTo ? { "Reply-To": replyTo } : undefined,
    });

    if (error) {
      throw new Error(getErrorMessage(error));
    }

    await admin
      .from("email_logs")
      .update({
        status: "sent",
        provider_message_id: data?.id || null,
        sent_at: new Date().toISOString(),
      })
      .eq("id", logRow.id);

    return {
      skipped: false,
      providerMessageId: data?.id || null,
    };
  } catch (error) {
    const errorMessage = getErrorMessage(error);

    await admin
      .from("email_logs")
      .update({
        status: "failed",
        error_message: errorMessage,
      })
      .eq("id", logRow.id);

    throw new Error(errorMessage);
  }
}