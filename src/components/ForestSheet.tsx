"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { ForestIcon } from "./ForestArt";
export function ForestSheet({ title, children, onClose, className = "" }: {
    title: string;
    children: ReactNode;
    onClose?: () => void;
    className?: string;
}) {
    const ref = useRef<HTMLDialogElement>(null);
    const titleRef = useRef<HTMLHeadingElement>(null);
    useEffect(() => {
        const dialog = ref.current;
        dialog?.showModal();
        // Keep long loot lists at the beginning instead of jumping to the last action.
        titleRef.current?.focus({ preventScroll: true });
        if (dialog) dialog.scrollTop = 0;
        return () => dialog?.close();
    }, []);
    return <dialog ref={ref} className={`forest-sheet ${className}`} aria-label={title} onCancel={event => { event.preventDefault(); onClose?.(); }}>
    <header><span className="forest-sheet-handle"/><h2 ref={titleRef} tabIndex={-1}>{title}</h2>{onClose && <button className="forest-sheet-close" onClick={onClose} aria-label="閉じる"><ForestIcon name="close"/></button>}</header>
    <div className="forest-sheet-content">{children}</div>
  </dialog>;
}
