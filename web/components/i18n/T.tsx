"use client";

import { ReactNode } from "react";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import type { Messages } from "@/lib/i18n/dictionaries";

type TProps = {
  textKey: keyof Messages;
  fallback?: string;
  className?: string;
  suffix?: ReactNode;
  prefix?: ReactNode;
};

export default function T({
  textKey,
  fallback,
  className,
  prefix,
  suffix,
}: TProps) {
  const { t } = useLanguage();

  const content = (
    <>
      {prefix}
      {t(textKey, fallback)}
      {suffix}
    </>
  );

  if (className) {
    return <span className={className}>{content}</span>;
  }

  return content;
}