import { createRoot } from "react-dom/client";
import CafeGame from "./components/CafeGame";
import "../app/globals.css";

const root = document.getElementById("root");
if (!root) throw new Error("Game root is missing");
createRoot(root).render(<CafeGame publicBuild />);
