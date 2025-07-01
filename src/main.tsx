import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";
import ToastProvider from "./components/ToastProvider.tsx";

createRoot(document.getElementById("root")!).render(
  <>
    <ToastProvider />
    <App />
  </>
);