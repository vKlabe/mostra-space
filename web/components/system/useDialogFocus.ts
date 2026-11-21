"use client";

import { useEffect, useRef } from "react";

const openDialogs: HTMLElement[] = [];
const focusable = "a[href], button, input, select, textarea, summary, [tabindex], [contenteditable='true']";

function topDialog() {
  return openDialogs.reduce<HTMLElement | undefined>((top, dialog) => {
    const layer = (element: HTMLElement) => Number(getComputedStyle(element.parentElement ?? element).zIndex) || 0;
    return !top || layer(dialog) >= layer(top) ? dialog : top;
  }, undefined);
}

export function useDialogFocus<Element extends HTMLElement = HTMLElement>(open: boolean) {
  const ref = useRef<Element>(null);

  useEffect(() => {
    const panel = ref.current;
    if (!open || !panel) return;
    const dialog = panel;

    const previous = document.activeElement;
    openDialogs.push(dialog);
    const isActive = () => topDialog() === dialog;
    if (isActive()) dialog.focus({ preventScroll: true });

    function containFocus(event: FocusEvent) {
      if (isActive() && event.target instanceof Node && !dialog.contains(event.target)) {
        dialog.focus({ preventScroll: true });
      }
    }

    function cycleTab(event: KeyboardEvent) {
      if (event.key !== "Tab" || !isActive()) return;
      const options = [...dialog.querySelectorAll<HTMLElement>(focusable)].filter(
        (element) => element.tabIndex >= 0 && !element.matches(":disabled") &&
          !element.closest("[inert]") && element.getClientRects().length > 0 &&
          getComputedStyle(element).visibility !== "hidden",
      );
      const current = options.indexOf(document.activeElement as HTMLElement);
      const atBoundary = event.shiftKey ? current <= 0 : current < 0 || current === options.length - 1;
      if (!atBoundary && options.length > 0) return;

      event.preventDefault();
      const next = event.shiftKey ? options.at(-1) : options[0];
      (next ?? dialog).focus();
    }

    document.addEventListener("focusin", containFocus);
    document.addEventListener("keydown", cycleTab);

    return () => {
      document.removeEventListener("focusin", containFocus);
      document.removeEventListener("keydown", cycleTab);
      const wasActive = isActive();
      openDialogs.splice(openDialogs.indexOf(dialog), 1);
      if (!wasActive) return;
      const remainingDialog = topDialog();
      if (previous instanceof HTMLElement && previous.isConnected &&
        (!remainingDialog || remainingDialog.contains(previous))) {
        previous.focus({ preventScroll: true });
      } else if (remainingDialog?.isConnected) {
        remainingDialog.focus({ preventScroll: true });
      }
    };
  }, [open]);

  return ref;
}
