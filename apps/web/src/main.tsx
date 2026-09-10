import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { product } from "@sei/shared";

import "./styles.css";

function App() {
  return (
    <main className="foundation-shell">
      <section aria-labelledby="product-name" className="foundation-card">
        <img
          alt="Sei abstract compass mark"
          className="brand-mark"
          src="/sei-mark.svg"
        />
        <p className="eyebrow">Repository foundation</p>
        <h1 id="product-name">{product.fullName}</h1>
        <p>{product.tagline}</p>
        <p className="muted">
          The dashboard arrives in M4. The shared foundation is ready.
        </p>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
