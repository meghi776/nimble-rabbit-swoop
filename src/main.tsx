import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";
import ToastProvider from "./components/ToastProvider.tsx"; // Import ToastProvider

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ToastProvider /> {/* Add ToastProvider here */}
    <App />
  </React.StrictMode>
);