export const PUSH_PREFERENCE_DEFAULTS = {
  pushEnabled: false,
  messagesEnabled: true,
  followersEnabled: true,
  favoritesEnabled: true,
  publicationsEnabled: true,
  invitationsEnabled: true,
  eventsEnabled: true,
  eventRemindersEnabled: true,
  galleryUpdatesEnabled: true,
  platformUpdatesEnabled: true,
} as const;

export type PushPreferences = {
  -readonly [Key in keyof typeof PUSH_PREFERENCE_DEFAULTS]: boolean;
};

export type ValidPushSubscription = {
  endpoint: string;
  p256dh: string;
  authKey: string;
  contentEncoding: "aes128gcm" | "aesgcm";
  deviceLabel: string | null;
  locale: string | null;
  timezone: string | null;
  expiresAt: string | null;
};

type ValidationResult<T> =
  | { success: true; value: T }
  | { success: false; code: string };

const PREFERENCE_COLUMN_BY_KEY = {
  pushEnabled: "push_enabled",
  messagesEnabled: "messages_enabled",
  followersEnabled: "followers_enabled",
  favoritesEnabled: "favorites_enabled",
  publicationsEnabled: "publications_enabled",
  invitationsEnabled: "invitations_enabled",
  eventsEnabled: "events_enabled",
  eventRemindersEnabled: "event_reminders_enabled",
  galleryUpdatesEnabled: "gallery_updates_enabled",
  platformUpdatesEnabled: "platform_updates_enabled",
} as const;

export type PushPreferenceDatabasePatch = Partial<
  Record<(typeof PREFERENCE_COLUMN_BY_KEY)[keyof typeof PREFERENCE_COLUMN_BY_KEY], boolean>
>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function optionalText(value: unknown, maximumLength: number) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const cleaned = value.trim();

  if (!cleaned || cleaned.length > maximumLength) {
    return undefined;
  }

  return cleaned;
}

function isBase64Url(value: string, minimumLength: number, maximumLength: number) {
  return (
    value.length >= minimumLength &&
    value.length <= maximumLength &&
    /^[A-Za-z0-9_-]+={0,2}$/.test(value)
  );
}

function validateEndpoint(value: unknown) {
  if (typeof value !== "string" || value.length > 4096) {
    return null;
  }

  try {
    const endpoint = new URL(value);

    if (
      endpoint.protocol !== "https:" ||
      endpoint.username ||
      endpoint.password ||
      !endpoint.hostname
    ) {
      return null;
    }

    return endpoint.toString();
  } catch {
    return null;
  }
}

function validateExpirationTime(value: unknown) {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== "number" || !Number.isFinite(value) || value <= Date.now()) {
    return undefined;
  }

  try {
    return new Date(value).toISOString();
  } catch {
    return undefined;
  }
}

export function validatePushSubscription(
  payload: unknown
): ValidationResult<ValidPushSubscription> {
  if (!isRecord(payload) || !isRecord(payload.subscription)) {
    return { success: false, code: "INVALID_SUBSCRIPTION" };
  }

  const subscription = payload.subscription;
  const keys = subscription.keys;
  const endpoint = validateEndpoint(subscription.endpoint);

  if (!endpoint || !isRecord(keys)) {
    return { success: false, code: "INVALID_SUBSCRIPTION" };
  }

  const p256dh = keys.p256dh;
  const authKey = keys.auth;

  if (
    typeof p256dh !== "string" ||
    !isBase64Url(p256dh, 40, 512) ||
    typeof authKey !== "string" ||
    !isBase64Url(authKey, 8, 256)
  ) {
    return { success: false, code: "INVALID_SUBSCRIPTION_KEYS" };
  }

  const deviceLabel = optionalText(payload.deviceLabel, 120);
  const locale = optionalText(payload.locale, 35);
  const timezone = optionalText(payload.timezone, 100);
  const expiresAt = validateExpirationTime(subscription.expirationTime);

  if (
    deviceLabel === undefined ||
    locale === undefined ||
    timezone === undefined ||
    expiresAt === undefined
  ) {
    return { success: false, code: "INVALID_SUBSCRIPTION_METADATA" };
  }

  const contentEncoding =
    payload.contentEncoding === undefined ? "aes128gcm" : payload.contentEncoding;

  if (contentEncoding !== "aes128gcm" && contentEncoding !== "aesgcm") {
    return { success: false, code: "INVALID_CONTENT_ENCODING" };
  }

  return {
    success: true,
    value: {
      endpoint,
      p256dh,
      authKey,
      contentEncoding,
      deviceLabel,
      locale,
      timezone,
      expiresAt,
    },
  };
}

export function validateSubscriptionSelector(
  payload: unknown
): ValidationResult<{ subscriptionId?: string; endpoint?: string }> {
  if (!isRecord(payload)) {
    return { success: false, code: "INVALID_PAYLOAD" };
  }

  if (typeof payload.subscriptionId === "string") {
    const subscriptionId = payload.subscriptionId.trim();

    if (
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        subscriptionId
      )
    ) {
      return { success: true, value: { subscriptionId } };
    }
  }

  const endpoint = validateEndpoint(payload.endpoint);

  if (endpoint) {
    return { success: true, value: { endpoint } };
  }

  return { success: false, code: "INVALID_SUBSCRIPTION_SELECTOR" };
}

export function validatePushPreferencePatch(
  payload: unknown
): ValidationResult<PushPreferenceDatabasePatch> {
  if (!isRecord(payload)) {
    return { success: false, code: "INVALID_PAYLOAD" };
  }

  const databasePatch: PushPreferenceDatabasePatch = {};
  let hasValue = false;

  for (const [key, column] of Object.entries(PREFERENCE_COLUMN_BY_KEY)) {
    if (!(key in payload)) {
      continue;
    }

    if (typeof payload[key] !== "boolean") {
      return { success: false, code: "INVALID_PREFERENCE_VALUE" };
    }

    databasePatch[column] = payload[key];
    hasValue = true;
  }

  if (!hasValue) {
    return { success: false, code: "EMPTY_PREFERENCE_UPDATE" };
  }

  return { success: true, value: databasePatch };
}

export function mapPushPreferences(row: Record<string, unknown> | null): PushPreferences {
  const result = { ...PUSH_PREFERENCE_DEFAULTS } as PushPreferences;

  if (!row) {
    return result;
  }

  for (const [key, column] of Object.entries(PREFERENCE_COLUMN_BY_KEY)) {
    if (typeof row[column] === "boolean") {
      result[key as keyof PushPreferences] = row[column] as boolean;
    }
  }

  return result;
}
