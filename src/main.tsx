import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.js";
import "./index.css";
import { applyThemeColor, getStoredThemeColor } from "./lib/themeColor.js";

// Initialize runtime theme colors
applyThemeColor(getStoredThemeColor());

const rootElement = document.getElementById("root");
if (rootElement) {
 createRoot(rootElement).render(
 <StrictMode>
 <App />
 </StrictMode>,
 );
}
