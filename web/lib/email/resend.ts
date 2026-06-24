import { Resend } from "resend";

let resendInstance: Resend | null = null;

export function getResend() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("Missing RESEND_API_KEY environment variable.");
  }

  if (!resendInstance) {
    resendInstance = new Resend(process.env.RESEND_API_KEY);
  }

  return resendInstance;
}

export function getEmailFrom() {
  const from = process.env.EMAIL_FROM;

  if (!from) {
    throw new Error("Missing EMAIL_FROM environment variable.");
  }

  return from;
}

export function getEmailReplyTo() {
  return process.env.EMAIL_REPLY_TO || null;
}