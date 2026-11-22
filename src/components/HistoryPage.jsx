// ─────────────────────────────────────────────────────────────────────────────
// Page « Historique » de l'application : les analyses enregistrées, ce qui a
// changé depuis la précédente, et la copie en ligne chiffrée.
// ─────────────────────────────────────────────────────────────────────────────
import React from "react";
import { Title, Lead } from "../ui/theme.js";
import { useText } from "../ui/i18n.jsx";
import HistoryPanel from "../ui/HistoryPanel.jsx";

const TEXT = {
  fr: {
    title: "Historique",
    lead: "Analyses enregistrées et changements entre deux diagnostics",
  },
  en: {
    title: "History",
    lead: "Saved analyses and changes between two diagnostics",
  },
};

export default function HistoryPage() {
  const t = useText(TEXT);
  return (
    <section>
      <Title>{t.title}</Title>
      <Lead>{t.lead}</Lead>
      <HistoryPanel page />
    </section>
  );
}
