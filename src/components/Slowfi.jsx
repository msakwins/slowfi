// ─────────────────────────────────────────────────────────────────────────────
// Coquille de l'application : le logo, puis l'unique page. Les analyses
// s'ouvrent sur place, il n'y a plus de navigation.
// ─────────────────────────────────────────────────────────────────────────────
import React from "react";
import { GlobalStyle, Page } from "../ui/theme.js";
import Logo from "../ui/Logo.jsx";
import Home from "./Home.jsx";

export { GlobalStyle };

export default function Slowfi() {
  return (
    <Page>
      <Logo />
      <Home />
    </Page>
  );
}
