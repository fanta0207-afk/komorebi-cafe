"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { ForestIcon } from "./ForestArt";
import { GameModal } from "./GameModal";
export function ForestSheet({ title, children, onClose, className = "" }: {
    title: string;
    children: ReactNode;
    onClose?: () => void;
    className?: string;
}) {
    const titleRef = useRef<HTMLHeadingElement>(null);
    useEffect(() => {
        // Keep long loot lists at the beginning instead of jumping to the last action.
        titleRef.current?.focus({ preventScroll: true });
    }, []);
    return <GameModal className={`forest-sheet ${className}`} label={title} onCancel={onClose} layerClassName="forest-modal-layer">
    <header><span className="forest-sheet-handle"/><h2 ref={titleRef} tabIndex={-1}>{title}</h2>{onClose && <button className="forest-sheet-close" onClick={onClose} aria-label="閉じる"><ForestIcon name="close"/></button>}</header>
    <div className="forest-sheet-content">{children}</div>
  </GameModal>;
}
