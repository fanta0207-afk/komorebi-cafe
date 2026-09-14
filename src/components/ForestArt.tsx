import type { CSSProperties } from "react";
export type ForestIconName = "leaf" | "basket" | "home" | "book" | "coin" | "ticket" | "arrow" | "check" | "close" | "lock" | "spark" | "food";
export function ForestIcon({ name, className = "" }: {
    name: ForestIconName;
    className?: string;
}) {
    const paths: Record<ForestIconName, React.ReactNode> = {
        leaf: <><path d="M6 19C2 7 10 3 21 3c0 11-4 18-15 16Z"/><path d="m4 22 12-12m-9 6 7 1m-4-4V8"/></>,
        basket: <><path d="M3 10h22l-3 14H6L3 10Z"/><path d="M8 10c0-10 12-10 12 0M9 14l1 6m4-6v6m5-6-1 6M2 10h24"/></>,
        home: <><path d="m3 12 11-9 11 9M6 11v13h16V11M11 24v-8h6v8"/><path d="M5 4h4v3"/></>,
        book: <><path d="M14 6C10 3 5 3 2 5v18c4-2 8-2 12 0 4-2 8-2 12 0V5c-3-2-8-2-12 1v17"/><path d="M6 9h4m-4 4h4m8-4h4m-4 4h4"/></>,
        coin: <><circle cx="14" cy="14" r="10"/><circle cx="14" cy="14" r="7"/><path d="M17 10c-6-3-8 6-2 8l3-1"/></>,
        ticket: <><path d="M3 7h22v6c-5 0-5 5 0 5v4H3v-4c5 0 5-5 0-5V7Z"/><path d="M18 8v2m0 3v2m0 3v2M8 10h5"/></>,
        arrow: <path d="M4 14h19m-7-7 7 7-7 7"/>,
        check: <path d="m5 14 6 6L23 7"/>,
        close: <path d="m7 7 14 14M21 7 7 21"/>,
        lock: <><rect x="6" y="12" width="16" height="13" rx="3"/><path d="M9 12V7a5 5 0 0 1 10 0v5m-5 5v3"/></>,
        spark: <><path d="m14 2 3 9 9 3-9 3-3 9-3-9-9-3 9-3 3-9Z"/></>,
        food: <><path d="M5 21V11c-5-7 5-10 9-6 4-4 14-1 9 6v10H5Z"/><path d="M9 12v4m5-6v6m5-4v4"/></>,
    };
    return <svg className={`forest-icon ${className}`} viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
export function ForestObject({ kind, spent = false }: {
    kind: "box" | "herbs" | "mushrooms" | "note";
    spent?: boolean;
}) {
    const style = { "--object-opacity": spent ? .5 : 1 } as CSSProperties;
    return <svg className="forest-object-art" style={style} viewBox="0 0 120 100" aria-hidden="true">
    <ellipse cx="60" cy="87" rx="43" ry="8" fill="#446346" opacity=".2"/>
    {kind === "note" ? <g stroke="#866d44" strokeWidth="2" strokeLinejoin="round"><path d="m38 15 48 7-5 62-48-7Z" fill="#fff3ce"/><path d="m68 20-2 20 18-17" fill="#e6d1a0"/><path d="m44 44 26 4m-27 7 21 4m-22 7 13 2"/><path d="m38 86-3-18m2 10-13-8m14 5 11-12" stroke="#718a57"/></g> : <>
      <g stroke="#526b40" strokeWidth="2" fill="#77955e"><path d="M25 85C20 65 23 51 13 40c19 2 28 24 24 44Z"/><path d="M93 86c-3-25 1-35 11-49 6 20 0 42-11 49Z"/><path d="m21 53 9 31m73-34-9 32"/></g>
      {kind === "herbs" && <g stroke="#4e6b42" strokeWidth="2" fill="#8caa6e"><path d="M62 78V27m0 28c-21 0-28-10-23-23 16 2 23 14 23 23Zm0-10c18-2 28-13 22-26-15 3-22 16-22 26Z"/><path d="M63 69c20 0 26-10 23-22-15 1-23 10-23 22Z"/><circle cx="44" cy="38" r="5" fill="#cb756b"/><circle cx="75" cy="30" r="5" fill="#cb756b"/></g>}
      {kind === "mushrooms" && <g stroke="#866646" strokeWidth="2"><path d="m47 60-3 21h19l-4-21" fill="#eee0be"/><path d="M32 61c0-32 45-33 44 0Z" fill="#bb8170"/><circle cx="46" cy="48" r="4" fill="#f8e9cb" stroke="none"/><circle cx="63" cy="53" r="3" fill="#f8e9cb" stroke="none"/><path d="m79 72-1 13h12l-2-13" fill="#eee0be"/><path d="M68 72c2-21 30-20 31 0Z" fill="#ceac76"/></g>}
      <g stroke="#937647" strokeWidth="2" strokeLinejoin="round"><path d={kind === "box" ? "m28 43 64-5 5 46-65 4Z" : "m28 64 48 5-4 21-43-4Z"} fill="#b99865"/><path d={kind === "box" ? "m30 56 62-5m-61 16 64-5m-62 16 63-5m-44-29 3 43m22-44 3 41" : "m30 76 44 5m-34-15-1 21m21-18-2 20"} fill="none"/>{kind === "box" && <><path d="m36 43 1-14 24 1-1 12" fill="#e0c999"/><path d="m62 40 3-15 16 1 4 13" fill="#8a9d62"/><path d="m44 28-2-9m4 9 3-7" stroke="#688654"/></>}</g>
      <path d="m15 89 7-15 4 12m69 1 6-15 2 12" fill="none" stroke="#708d56" strokeWidth="2"/>
    </>}
  </svg>;
}
