// ─────────────────────────────────────────────────────────────────────────────
// Matériel sans commande : disques, mémoire, carte graphique et BIOS relevés
// dans l'Explorateur, le Gestionnaire des tâches et les Informations système
// (Windows), ou dans les Réglages Système (macOS).
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { hardwareFromForm } from "../lib/manual.js";
import { useLang } from "../ui/i18n.jsx";
import { Ghost } from "../ui/theme.js";
import { GuideStep, Fields, Field, NumberInput } from "../ui/Form.jsx";

const TEXT = {
  fr: {
    windows: {
      disks: (
        <>
          Ouvrir l'<span className="path">Explorateur de fichiers › Ce PC</span>
          . Sous chaque disque : « X Go libres sur Y Go »
        </>
      ),
      memory: (
        <>
          Ouvrir le <span className="path">Gestionnaire des tâches</span> (Ctrl
          + Maj + Échap) › <span className="path">Performances › Mémoire</span>
        </>
      ),
      gpu: (
        <>
          Dans le même onglet, <span className="path">Performances › GPU</span>{" "}
          : ligne « Date du pilote »
        </>
      ),
      bios: (
        <>
          Menu Démarrer › taper{" "}
          <span className="path">Informations système</span> › ligne « Version
          du BIOS/Date »
        </>
      ),
    },
    mac: {
      disks: (
        <>
          Ouvrir{" "}
          <span className="path">
            Menu Pomme › Réglages Système › Général › Stockage
          </span>{" "}
          : « X Go disponibles sur Y Go »
        </>
      ),
      memory: (
        <>
          Ouvrir <span className="path">Menu Pomme › À propos de ce Mac</span> :
          ligne « Mémoire »
        </>
      ),
    },
    letter: "Lettre",
    free: "Libre",
    total: "Taille",
    gb: "Go",
    addDisk: "Ajouter un disque",
    removeDisk: "Retirer",
    memTotal: "Mémoire totale",
    memTotalMac: "Mémoire",
    speed: "Vitesse",
    slots: "Emplacements utilisés",
    slotsHint: "« 2 sur 4 » → 2",
    rated: "Fréquence annoncée",
    ratedHint: "facultatif, sur la fiche produit",
    year: "Année",
  },
  en: {
    windows: {
      disks: (
        <>
          Open <span className="path">File Explorer › This PC</span>. Under each
          drive: “X GB free of Y GB”
        </>
      ),
      memory: (
        <>
          Open <span className="path">Task Manager</span> (Ctrl + Shift + Esc) ›{" "}
          <span className="path">Performance › Memory</span>
        </>
      ),
      gpu: (
        <>
          In the same tab, <span className="path">Performance › GPU</span>:
          “Driver date” line
        </>
      ),
      bios: (
        <>
          Start menu › type <span className="path">System Information</span> ›
          “BIOS Version/Date” line
        </>
      ),
    },
    mac: {
      disks: (
        <>
          Open{" "}
          <span className="path">
            Apple menu › System Settings › General › Storage
          </span>
          : “X GB available of Y GB”
        </>
      ),
      memory: (
        <>
          Open <span className="path">Apple menu › About This Mac</span>:
          “Memory” line
        </>
      ),
    },
    letter: "Letter",
    free: "Free",
    total: "Size",
    gb: "GB",
    addDisk: "Add a drive",
    removeDisk: "Remove",
    memTotal: "Total memory",
    memTotalMac: "Memory",
    speed: "Speed",
    slots: "Slots used",
    slotsHint: "“2 of 4” → 2",
    rated: "Rated frequency",
    ratedHint: "optional, on the product sheet",
    year: "Year",
  },
};

// Lettre courte, puis les deux tailles.
const DiskRow = styled.div`
  display: grid;
  grid-template-columns: ${(p) => (p.$mac ? "1fr 1fr" : "72px 1fr 1fr auto")};
  gap: 12px;
  align-items: end;

  & + & {
    margin-top: 12px;
  }
  @media (max-width: 480px) {
    grid-template-columns: ${(p) => (p.$mac ? "1fr 1fr" : "64px 1fr 1fr")};
    button {
      grid-column: 1 / -1;
      justify-self: start;
    }
  }
`;

/** @param {{ system: "windows"|"mac", onResult: (r: object|null) => void }} props */
export default function HardwareManual({ system, onResult }) {
  const { lang } = useLang();
  const t = TEXT[lang];
  const w = t[system];
  const mac = system === "mac";
  const [disks, setDisks] = useState([{ name: "C" }]);
  const [f, setF] = useState({});
  const set = (k) => (v) => setF((prev) => ({ ...prev, [k]: v }));
  const setDisk = (i, k) => (v) =>
    setDisks((prev) => prev.map((d, j) => (j === i ? { ...d, [k]: v } : d)));

  useEffect(() => {
    onResult(
      hardwareFromForm({
        platform: system,
        disks: mac ? disks.slice(0, 1) : disks,
        ...(mac ? { memory: f.memory } : f),
      }),
    );
  }, [disks, f, system, mac, onResult]);

  const shown = mac ? disks.slice(0, 1) : disks;

  return (
    <>
      <GuideStep n="1" where={w.disks}>
        {shown.map((d, i) => (
          <DiskRow key={i} $mac={mac}>
            {!mac && (
              <Field label={t.letter}>
                <input
                  type="text"
                  maxLength={2}
                  value={d.name ?? ""}
                  onChange={(e) => setDisk(i, "name")(e.target.value)}
                />
              </Field>
            )}
            <Field label={t.free} hint={t.gb}>
              <NumberInput
                value={d.free}
                onChange={setDisk(i, "free")}
                placeholder="120"
              />
            </Field>
            <Field label={t.total} hint={t.gb}>
              <NumberInput
                value={d.total}
                onChange={setDisk(i, "total")}
                placeholder="476"
              />
            </Field>
            {!mac && i > 0 && (
              <Ghost
                style={{ fontSize: 13 }}
                onClick={() =>
                  setDisks((prev) => prev.filter((_, j) => j !== i))
                }
              >
                {t.removeDisk}
              </Ghost>
            )}
          </DiskRow>
        ))}
        {!mac && (
          <div style={{ marginTop: 6, marginLeft: -8, fontSize: 13 }}>
            <Ghost onClick={() => setDisks((prev) => [...prev, { name: "" }])}>
              + {t.addDisk}
            </Ghost>
          </div>
        )}
      </GuideStep>

      <GuideStep n="2" where={w.memory}>
        {mac ? (
          <Fields>
            <Field label={t.memTotalMac} hint={t.gb}>
              <NumberInput
                value={f.memory}
                onChange={set("memory")}
                placeholder="16"
              />
            </Field>
          </Fields>
        ) : (
          <Fields>
            <Field label={t.memTotal} hint={t.gb}>
              <NumberInput
                value={f.memory}
                onChange={set("memory")}
                placeholder="16"
              />
            </Field>
            <Field label={t.speed} hint="MHz">
              <NumberInput
                value={f.speed}
                onChange={set("speed")}
                placeholder="3200"
              />
            </Field>
            <Field label={t.slots} hint={t.slotsHint}>
              <NumberInput
                value={f.slots}
                onChange={set("slots")}
                placeholder="2"
              />
            </Field>
            <Field label={t.rated} hint={t.ratedHint}>
              <NumberInput
                value={f.rated}
                onChange={set("rated")}
                placeholder="3200"
              />
            </Field>
          </Fields>
        )}
      </GuideStep>

      {!mac && (
        <>
          <GuideStep n="3" where={w.gpu}>
            <Fields>
              <Field label={t.year}>
                <NumberInput
                  value={f.gpuYear}
                  onChange={set("gpuYear")}
                  placeholder="2025"
                />
              </Field>
            </Fields>
          </GuideStep>
          <GuideStep n="4" where={w.bios}>
            <Fields>
              <Field label={t.year}>
                <NumberInput
                  value={f.biosYear}
                  onChange={set("biosYear")}
                  placeholder="2023"
                />
              </Field>
            </Fields>
          </GuideStep>
        </>
      )}
    </>
  );
}
