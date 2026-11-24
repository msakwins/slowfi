// ─────────────────────────────────────────────────────────────────────────────
// Page « Historique » : les analyses enregistrées sur l'appareil, et ce qui a
// changé depuis la précédente.
// ─────────────────────────────────────────────────────────────────────────────
import React from "react";
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
      {/* Le titre est posé par HistoryPanel, avec le bouton pour effacer. */}
      <HistoryPanel page={t.title} />
    </section>
  );
}
