import { NextResponse } from "next/server";

type ApiErrorOptions = {
  status?: number;
  details?: unknown;
  code?: string;
};

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    { status }
  );
}

export function apiError(message: string, options: ApiErrorOptions = {}) {
  const status = options.status || 500;

  return NextResponse.json(
    {
      success: false,
      error: message,
      code: options.code || null,
      details: normalizeDetails(options.details),
    },
    { status }
  );
}

export function apiUnauthorized(message = "Unauthorized") {
  return apiError(message, {
    status: 401,
    code: "UNAUTHORIZED",
  });
}

export function apiForbidden(message = "Accesso negato.") {
  return apiError(message, {
    status: 403,
    code: "FORBIDDEN",
  });
}

export function apiBadRequest(message = "Richiesta non valida.", details?: unknown) {
  return apiError(message, {
    status: 400,
    code: "BAD_REQUEST",
    details,
  });
}

export function apiNotFound(message = "Risorsa non trovata.") {
  return apiError(message, {
    status: 404,
    code: "NOT_FOUND",
  });
}

function normalizeDetails(details: unknown) {
  if (!details) {
    return null;
  }

  if (details instanceof Error) {
    return details.message;
  }

  if (typeof details === "string") {
    return details;
  }

  if (
    typeof details === "object" &&
    details !== null &&
    "message" in details &&
    typeof (details as { message?: unknown }).message === "string"
  ) {
    return (details as { message: string }).message;
  }

  return details;
}