import type { CSSProperties } from "react";
export type ForestIconName = "leaf" | "basket" | "home" | "book" | "coin" | "ticket" | "arrow" | "check" | "close" | "lock" | "spark" | "food" | "foot" | "search";
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
        foot: <><path d="m10 4-4 9 3 6 10 5c5 1 7-3 3-5l-8-5 2-9Z"/><path d="m7 13 7 2m-4-6 6 2M9 24h13"/></>,
        search: <><circle cx="12" cy="12" r="8"/><path d="m18 18 7 7"/></>,
        food: <><path d="M5 21V11c-5-7 5-10 9-6 4-4 14-1 9 6v10H5Z"/><path d="M9 12v4m5-6v6m5-4v4"/></>,
    };
    return <svg className={`forest-icon ${className}`} viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
export function ForestObject({kind,spent=false}:{kind:'box'|'herbs'|'mushrooms'|'note'|'berries'|'flowers'|'roots'|'leaves';spent?:boolean}) {
    const style={'--object-opacity':spent?.42:1} as CSSProperties;
    return <svg className="forest-object-art" style={style} viewBox="0 0 120 100" aria-hidden="true">
      <ellipse cx="60" cy="88" rx="40" ry="7" fill="#2d503b" opacity=".22"/>
      {kind==='box'?<g stroke="#846140" strokeWidth="2.5" strokeLinejoin="round"><path d="m25 40 67-3 4 46-66 5Z" fill="#c7a478"/><path d="m27 53 65-4m-64 18 66-5m-63 17 66-5M45 39l3 47m23-47 3 45"/><path d="m34 39 1-17 23 2 1 15" fill="#f0dfb3"/><path d="m65 38 2-14 16 1 5 11" fill="#9cad79"/></g>:kind==='note'?<g stroke="#967745" strokeWidth="2"><path d="m37 15 48 7-5 64-49-8Z" fill="#fff1c6"/><path d="m68 20-2 20 18-17" fill="#dec792"/><path d="m44 44 26 4m-27 7 21 4m-22 7 13 2"/></g>:<>
        <g stroke="#416e47" strokeWidth="2" fill="#7fa65b"><path d="M30 85C20 73 13 60 17 45c16 7 23 21 19 39Zm55 0c-3-19 4-30 17-42 6 18 0 32-11 43Z"/><path d="m20 53 12 30m67-33-10 34"/></g>
        {kind==='herbs'&&<g stroke="#3d7045" strokeWidth="2.5" fill="#92b974"><path d="M61 86V20m0 38C34 57 30 42 37 29c19 5 25 18 24 29Zm0-13c22-3 30-16 23-31-18 5-23 19-23 31Zm0 30c21-1 29-12 24-24-19 3-24 13-24 24Z"/><path d="m40 37 20 18m18-32-15 19"/></g>}
        {kind==='berries'&&<g stroke="#416e47" strokeWidth="2.5"><path d="M35 82 53 30m7 55 20-51"/><path d="M52 46c-22-11-29-2-21 12 12 0 20-5 21-12Zm20 10c20-20 28-14 25 1-10 8-17 8-25-1Z" fill="#70945c"/><g fill="#cf716c" stroke="#9b5556"><circle cx="51" cy="55" r="10"/><circle cx="65" cy="69" r="11"/><circle cx="80" cy="40" r="9"/></g><path d="m47 49 4-6 5 7m4 11 5-6 6 7" fill="#729959"/><circle cx="48" cy="54" r="2" fill="#ffdbb0" stroke="none"/></g>}
        {kind==='flowers'&&<g stroke="#58774a" strokeWidth="2"><path d="M47 86 43 42m22 44 12-58m-31 47 13-20"/><path d="m49 68 10-8-9-3Zm20-10 13-2-6-8Z" fill="#87a963"/><g fill="#f2b8b4" stroke="#bd827e"><circle cx="40" cy="35" r="10"/><circle cx="32" cy="45" r="9"/><circle cx="49" cy="45" r="9"/></g><circle cx="41" cy="43" r="6" fill="#eace83"/><g fill="#efdc9f" stroke="#b5a268"><circle cx="77" cy="24" r="8"/><circle cx="69" cy="31" r="8"/><circle cx="83" cy="33" r="8"/></g><circle cx="77" cy="31" r="5" fill="#d09a73"/></g>}
        {kind==='mushrooms'&&<g stroke="#825c45" strokeWidth="2.5"><path d="m43 61-2 22h22l-5-22" fill="#efe0bc"/><path d="M27 61c0-35 50-36 51 0Z" fill="#c58168"/><circle cx="43" cy="46" r="5" fill="#ffe7c1" stroke="none"/><circle cx="63" cy="51" r="4" fill="#ffe7c1" stroke="none"/><path d="m82 71-1 15h13l-3-15" fill="#e9d7b1"/><path d="M69 71c1-23 33-24 35 0Z" fill="#d4b37b"/></g>}
        {kind==='roots'&&<g stroke="#795d40" strokeWidth="3" strokeLinejoin="round"><path d="m42 10 37 1-4 41 24 28-24-4-12-15-13 16-24 9 15-29Z" fill="#ab8b5e"/><path d="m54 15-5 39-17 28m35-64-5 39 21 21m-27-42 8 4"/><path d="m42 67 15-14 18 9" fill="none" stroke="#80a063" strokeWidth="8"/><path d="m42 67 15-14 18 9" fill="none" stroke="#bfd2a3" strokeWidth="2"/></g>}
        {kind==='leaves'&&<g stroke="#8b7448" strokeWidth="2" strokeLinejoin="round"><path d="m24 64 24-30 10 23-14 26Z" fill="#bdac6c"/><path d="m43 79 23-39 12 17-14 32Z" fill="#d5bd78"/><path d="m66 75 24-27 9 23-18 18Z" fill="#9fb06f"/><path d="m28 80 20-35m3 41 16-33m6 31 18-24"/></g>}
      </>}
      <path d="m13 89 9-14 3 13m69 0 9-15 2 14" fill="none" stroke="#6d9254" strokeWidth="2"/>
    </svg>;
}
