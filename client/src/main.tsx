import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Block problematic external connections and errors
window.addEventListener('error', function(e) {
  if (e.message && (e.message.includes('content-all') || e.message.includes('translator') || e.message.includes('microsoft'))) {
    console.log('🚫 Blocked external connection error:', e.message);
    e.preventDefault();
    return true;
  }
});

window.addEventListener('unhandledrejection', function(e) {
  if (e.reason && e.reason.message && e.reason.message.includes('content-all')) {
    console.log('🚫 Blocked content-all promise rejection');
    e.preventDefault();
    return true;
  }
});

// ⚡ Removed Service Worker operations for faster startup

// Remove loading screen when React app starts
const removeLoadingScreen = () => {
  const loadingScreen = document.querySelector('.loading-screen');
  if (loadingScreen) {
    loadingScreen.remove();
    console.log('✅ Loading screen removed');
  }
};

// Initialize React app
const rootElement = document.getElementById("root")!;
const root = createRoot(rootElement);

// Remove loading screen immediately when React starts
removeLoadingScreen();

root.render(<App />);

// Backup removal after a short delay
setTimeout(removeLoadingScreen, 100);
