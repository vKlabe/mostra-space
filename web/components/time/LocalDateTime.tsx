"use client";

import { useEffect, useState } from "react";

export type LocalDateTimeFormat =
  | "date"
  | "date-short"
  | "date-medium"
  | "datetime"
  | "datetime-medium"
  | "datetime-long"
  | "datetime-long-no-year"
  | "datetime-weekday"
  | "datetime-weekday-no-year";

type Props = {
  value?: string | null;
  format?: LocalDateTimeFormat;
  timeZone?: string | null;
  locale?: string;
  fallback?: string;
  className?: string;
};

function getOptions(format: LocalDateTimeFormat): Intl.DateTimeFormatOptions {
  switch (format) {
    case "date":
      return { day: "2-digit", month: "long", year: "numeric" };
    case "date-short":
      return { day: "2-digit", month: "2-digit", year: "numeric" };
    case "date-medium":
      return { day: "2-digit", month: "short", year: "numeric" };
    case "datetime-medium":
      return { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" };
    case "datetime-long":
      return { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" };
    case "datetime-long-no-year":
      return { day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit" };
    case "datetime-weekday":
      return { weekday: "long", day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" };
    case "datetime-weekday-no-year":
      return { weekday: "long", day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit" };
    default:
      return { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" };
  }
}

export default function LocalDateTime({ value, format = "datetime", timeZone, locale = "it-IT", fallback = "—", className }: Props) {
  const [formatted, setFormatted] = useState(fallback);

  useEffect(() => {
    if (!value) { setFormatted(fallback); return; }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) { setFormatted(fallback); return; }
    try {
      const options = getOptions(format);
      if (timeZone) options.timeZone = timeZone;
      setFormatted(new Intl.DateTimeFormat(locale, options).format(date));
    } catch {
      setFormatted(fallback);
    }
  }, [fallback, format, locale, timeZone, value]);

  if (!value) return <span className={className}>{fallback}</span>;
  return <time dateTime={value} className={className}>{formatted}</time>;
}
