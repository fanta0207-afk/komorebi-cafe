import type { Metadata } from "next";
import CafeGame from "../src/components/CafeGame";

export const metadata: Metadata = {
  title: "こもれび喫茶｜春の試作版",
  description: "小さな喫茶店を育てながら、街の人と少しずつ仲良くなるゲーム。",
};

export default function Home() {
  return <CafeGame/>;
}
