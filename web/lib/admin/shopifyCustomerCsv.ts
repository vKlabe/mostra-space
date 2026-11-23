const shopifyHeaders = [
  "First Name",
  "Last Name",
  "Email",
  "Accepts Email Marketing",
  "Default Address Company",
  "Default Address Address1",
  "Default Address Address2",
  "Default Address City",
  "Default Address Province Code",
  "Default Address Country Code",
  "Default Address Zip",
  "Default Address Phone",
  "Phone",
  "Accepts SMS Marketing",
  "Accepts WhatsApp Marketing",
  "Tags",
  "Note",
  "Tax Exempt",
] as const;

export type ShopifyCustomerProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  display_name: string | null;
};

const romeDate = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Rome",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const romeOffset = new Intl.DateTimeFormat("en", {
  timeZone: "Europe/Rome",
  timeZoneName: "longOffset",
});

export function shopifyExportDate(now: Date) {
  return romeDate.format(now);
}

export function shopifyExportStart(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date.startsWith("0000")) return null;

  const midnightUtc = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(midnightUtc.getTime()) || midnightUtc.toISOString().slice(0, 10) !== date) {
    return null;
  }

  const offset = romeOffset.formatToParts(midnightUtc)
    .find((part) => part.type === "timeZoneName")?.value;
  if (!offset) return null;

  const localMidnight = new Date(`${date}T00:00:00${offset.slice(3)}`);
  return Number.isNaN(localMidnight.getTime()) ? null : localMidnight.toISOString();
}

function csvCell(value: string) {
  // Quoting alone does not prevent spreadsheet software from evaluating a formula.
  const safeValue = /^\s*[=+@-]/.test(value) || /^[\t\r\n]/.test(value)
    ? `'${value}`
    : value;
  return /[",\r\n]/.test(safeValue) ? `"${safeValue.replaceAll('"', '""')}"` : safeValue;
}

export const shopifyCustomerCsvHeader = shopifyHeaders.join(",");

export function shopifyCustomerCsvRow(profile: ShopifyCustomerProfile) {
  const email = profile.email?.trim() ?? "";
  const fullName = profile.full_name?.trim() ?? "";
  const displayName = profile.display_name?.trim() ?? "";
  const [firstName, ...lastName] = fullName
    ? fullName.split(/\s+/)
    : [displayName === email ? "" : displayName];

  // Account registration does not collect consent for any marketing channel.
  const values: Partial<Record<(typeof shopifyHeaders)[number], string>> = {
    "First Name": firstName,
    "Last Name": lastName.join(" "),
    Email: email,
    "Accepts Email Marketing": "no",
    "Accepts SMS Marketing": "no",
    "Accepts WhatsApp Marketing": "no",
    "Tax Exempt": "no",
  };
  return shopifyHeaders.map((column) => csvCell(values[column] ?? "")).join(",");
}
