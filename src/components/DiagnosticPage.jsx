// ─────────────────────────────────────────────────────────────────────────────
// Page « Diagnostic » de l'application : le diagnostic approfondi, lancé
// depuis le bouton de l'accueil avec les analyses choisies.
// ─────────────────────────────────────────────────────────────────────────────
import React from "react";
import { Title, NeonText } from "../ui/theme.js";
import { useText } from "../ui/i18n.jsx";
import CombinedAnalysis from "./CombinedAnalysis.jsx";

const TEXT = {
  fr: { title: "Diagnostic approfondi" },
  en: { title: "In-depth diagnostic" },
};

export default function DiagnosticPage() {
  const t = useText(TEXT);
  return (
    <section>
      <Title>
        <NeonText>{t.title}</NeonText>
      </Title>
      <CombinedAnalysis autoStart />
    </section>
  );
}
