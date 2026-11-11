"use client";
import { useEffect } from "react";

/** Mesmo comportamento de foco em todos os diálogos do módulo, inclusive modais empilhados. */
export function useSalesDialogs() {
  useEffect(() => {
    const previous = new Map<HTMLElement, HTMLElement | null>();
    const layer = (el: HTMLElement) => {
      let z = 0;
      for (
        let parent: HTMLElement | null = el;
        parent;
        parent = parent.parentElement
      )
        z = Math.max(z, Number(getComputedStyle(parent).zIndex) || 0);
      return z;
    };
    const dialogs = () =>
      [
        ...document.querySelectorAll<HTMLElement>(
          '[role="dialog"][aria-modal="true"]',
        ),
      ]
        .filter((el) => el.getClientRects().length > 0)
        .sort((a, b) => layer(a) - layer(b));
    const scan = () => {
      for (const [el, target] of previous)
        if (!el.isConnected) {
          previous.delete(el);
          if (target?.isConnected) target.focus();
        }
      const list = dialogs();
      const top = list[list.length - 1];
      if (top && !previous.has(top)) {
        previous.set(top, document.activeElement as HTMLElement | null);
        if (!top.contains(document.activeElement))
          (
            top.querySelector<HTMLElement>(
              'button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex="0"]',
            ) || top
          ).focus();
      }
    };
    const observer = new MutationObserver(scan);
    observer.observe(document.body, { childList: true, subtree: true });
    scan();
    const trap = (event: KeyboardEvent) => {
      const list = dialogs();
      const top = list[list.length - 1];
      if (!top) return;
      if (event.key === "Escape") {
        const close = [
          ...top.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"),
        ].find((button) =>
          /fechar|cancelar/i.test(
            button.getAttribute("aria-label") || button.textContent || "",
          ),
        );
        event.preventDefault();
        event.stopImmediatePropagation();
        if (close) close.click();
      }
      if (event.key === "Tab") {
        const items = [
          ...top.querySelectorAll<HTMLElement>(
            'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), iframe, [tabindex="0"]',
          ),
        ].filter((el) => el.getClientRects().length > 0);
        const first = items[0],
          last = items[items.length - 1];
        if (!items.length) {
          event.preventDefault();
          return;
        }
        if (
          !top.contains(document.activeElement) ||
          (!event.shiftKey && document.activeElement === last)
        ) {
          event.preventDefault();
          first.focus();
        } else if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        }
      }
    };
    document.addEventListener("keydown", trap, true);
    return () => {
      observer.disconnect();
      document.removeEventListener("keydown", trap, true);
    };
  }, []);
}
