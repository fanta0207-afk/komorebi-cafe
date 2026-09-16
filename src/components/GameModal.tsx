"use client";

import { createPortal } from "react-dom";
import { useEffect, useRef, type KeyboardEvent, type ReactNode } from "react";

const focusable = "button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";

/**
 * Modal built from ordinary elements rather than HTMLDialogElement so it works
 * on iOS versions before Safari added native dialog support.
 */
export function GameModal({ children, className, label, labelledBy, onCancel, layerClassName = "" }: {
  children: ReactNode;
  className: string;
  label?: string;
  labelledBy?: string;
  onCancel?: () => void;
  layerClassName?: string;
}) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previouslyFocused.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const frame = window.requestAnimationFrame(() => {
      const modal = modalRef.current;
      const first = modal?.querySelector<HTMLElement>(focusable);
      (first || modal)?.focus({ preventScroll: true });
    });
    return () => {
      window.cancelAnimationFrame(frame);
      previouslyFocused.current?.focus?.({ preventScroll: true });
    };
  }, []);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape" && onCancel) {
      event.preventDefault();
      onCancel();
      return;
    }
    if (event.key !== "Tab") return;
    const items = Array.from(modalRef.current?.querySelectorAll<HTMLElement>(focusable) || []).filter(item => !item.hasAttribute("disabled"));
    if (!items.length) { event.preventDefault(); modalRef.current?.focus(); return; }
    const first = items[0], last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };

  return createPortal(
    <div className={`game-modal-layer ${layerClassName}`} onKeyDown={onKeyDown}>
      <div ref={modalRef} className={className} role="dialog" aria-modal="true" aria-label={label} aria-labelledby={labelledBy} tabIndex={-1}>
        {children}
      </div>
    </div>,
    document.body,
  );
}
