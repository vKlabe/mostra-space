"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getSafePostAuthPath } from "@/lib/auth/safeNavigation";

function loginHref(path: string) {
  return `/auth/login?next=${encodeURIComponent(getSafePostAuthPath(path))}`;
}

export default function ContextualSignInLink({
  children,
  className,
  anchor = "",
  describedBy,
}: {
  children: ReactNode;
  className: string;
  anchor?: "#catalogo" | "#stato" | "";
  describedBy?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const href = loginHref(`${pathname}${anchor}`);

  return (
    <Link
      href={href}
      prefetch={false}
      className={className}
      aria-describedby={describedBy}
      onNavigate={(event) => {
        const { pathname, search, hash } = window.location;
        const currentHref = loginHref(`${pathname}${search}${hash || anchor}`);
        if (currentHref !== href) {
          event.preventDefault();
          router.push(currentHref);
        }
      }}
    >
      {children}
    </Link>
  );
}
