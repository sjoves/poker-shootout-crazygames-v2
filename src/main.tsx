import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// === CrazyGames technical compliance ===

// Prevent page scrolling via mouse wheel inside the game iframe
window.addEventListener('wheel', (e) => e.preventDefault(), { passive: false });

// Prevent arrow keys and spacebar from scrolling the page
window.addEventListener('keydown', (e) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
    e.preventDefault();
  }
}, { passive: false });

// Disable right-click context menu
window.addEventListener('contextmenu', (e) => e.preventDefault());

createRoot(document.getElementById("root")!).render(<App />);
