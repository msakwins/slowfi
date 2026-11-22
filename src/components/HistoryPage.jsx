// ─────────────────────────────────────────────────────────────────────────────
// Page « Historique » : les analyses enregistrées sur l'appareil, et ce qui a
// changé depuis la précédente.
// ─────────────────────────────────────────────────────────────────────────────
import React from "react";
import { Title } from "../ui/theme.js";
import { useText } from "../ui/i18n.jsx";
import HistoryPanel from "../ui/HistoryPanel.jsx";

const TEXT = {
  fr: { title: "Historique" },
  en: { title: "History" },
};

export default function HistoryPage() {
  const t = useText(TEXT);
  return (
    <section>
      <Title>{t.title}</Title>
      <HistoryPanel page />
    </section>
  );
}
