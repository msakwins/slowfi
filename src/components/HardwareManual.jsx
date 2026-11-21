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
import { GuideStep, Fields, Field, NumberInput, Select } from "../ui/Form.jsx";

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
          : ligne « Date du pilote ». Puis clic droit sur le menu Démarrer ›{" "}
          <span className="path">
            Gestionnaire de périphériques › Cartes graphiques
          </span>{" "}
          : une icône sur la carte signale un problème
        </>
      ),
      bios: (
        <>
          Menu Démarrer › taper{" "}
          <span className="path">Informations système</span> › ligne « Version
          du BIOS/Date »
        </>
      ),
      system: (
        <>
          Dans le{" "}
          <span className="path">Gestionnaire des tâches › Performances</span> :
          le type du disque (C:) s'affiche en haut à droite de « Disque 0 » ou «
          Disque 1 », le « Temps d'activité » sous « Processeur ». Puis{" "}
          <span className="path">Paramètres › Système › Alimentation</span> : «
          Mode d'alimentation »
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
      system: (
        <>
          Ouvrir <span className="path">Réglages Système › Batterie</span> :
          ligne « Mode économie d'énergie »
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
    gpuDate: "Date du pilote",
    gpuState: "Icône sur la carte",
    gpuStates: [
      ["ok", "Aucune icône"],
      ["error", "Triangle jaune"],
      ["disabled", "Flèche vers le bas"],
    ],
    diskType: "Type du disque système",
    uptime: "Temps d'activité",
    uptimeHint: "le 1er nombre, en jours",
    power: "Mode d'alimentation",
    powerOptions: [
      ["saver", "Efficacité énergétique optimale"],
      ["normal", "Équilibré ou Performances optimales"],
    ],
    lowPower: "Mode économie d'énergie",
    lowPowerOptions: [
      ["saver", "Toujours"],
      ["normal", "Jamais ou Sur batterie uniquement"],
    ],
    pick: "Choisir…",
    linux: {
      disks: (
        <>
          Ouvrir <span className="path">Fichiers › Autres emplacements</span> :
          sous « Ordinateur », l'espace disponible et la taille
        </>
      ),
      about: (
        <>
          Ouvrir <span className="path">Paramètres › À propos</span> (Système ›
          À propos sur les versions récentes) : nom du système et mémoire
        </>
      ),
      activity: (
        <>
          Ouvrir le <span className="path">Moniteur système › Ressources</span>{" "}
          : pourcentages du processeur et de la mémoire. Puis{" "}
          <span className="path">Paramètres › Alimentation</span> : mode
          d'alimentation
        </>
      ),
      osName: "Nom du système",
      powerModes: [
        ["saver", "Économie d'énergie"],
        ["normal", "Équilibré ou Performance"],
      ],
    },
    boardMaker: "Fabricant de la carte mère",
    boardModel: "Produit de la carte mère",
    osWhere: {
      windows: (
        <>
          Ouvrir{" "}
          <span className="path">
            Paramètres › Système › Informations système
          </span>{" "}
          : lignes « Édition » et « Version ». Puis, dans le{" "}
          <span className="path">Gestionnaire des tâches › Processus</span>, les
          pourcentages en tête des colonnes « Processeur » et « Mémoire », et
          dans <span className="path">Applications de démarrage</span>, le
          nombre d'applications « Activé »
        </>
      ),
      mac: (
        <>
          Ouvrir <span className="path">Menu Pomme › À propos de ce Mac</span> :
          version de macOS. Puis{" "}
          <span className="path">Réglages Système › Batterie</span>, bouton ⓘ à
          côté de « État de la batterie » : capacité maximale
        </>
      ),
    },
    os: "Édition",
    osOptions: [
      ["w11-home", "Windows 11 Famille ou Professionnel"],
      ["w11-ent", "Windows 11 Entreprise ou Éducation"],
      ["w10", "Windows 10"],
    ],
    osVersion: "Version",
    macVersion: "Version de macOS",
    cpuLoad: "Processeur",
    memoryPct: "Mémoire",
    startupCount: "Applications « Activé »",
    batteryPct: "Capacité maximale",
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
          “Driver date” line. Then right-click the Start menu ›{" "}
          <span className="path">Device Manager › Display adapters</span>: an
          icon on the card signals a problem
        </>
      ),
      bios: (
        <>
          Start menu › type <span className="path">System Information</span> ›
          “BIOS Version/Date” line
        </>
      ),
      system: (
        <>
          In <span className="path">Task Manager › Performance</span>: the drive
          type (C:) shows at the top right of “Disk 0” or “Disk 1”, and “Up
          time” under “CPU”. Then{" "}
          <span className="path">Settings › System › Power</span>: “Power mode”
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
      system: (
        <>
          Open <span className="path">System Settings › Battery</span>: “Low
          Power Mode” line
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
    gpuDate: "Driver date",
    gpuState: "Icon on the card",
    gpuStates: [
      ["ok", "No icon"],
      ["error", "Yellow triangle"],
      ["disabled", "Down arrow"],
    ],
    diskType: "System drive type",
    uptime: "Up time",
    uptimeHint: "the first number, in days",
    power: "Power mode",
    powerOptions: [
      ["saver", "Best power efficiency"],
      ["normal", "Balanced or Best performance"],
    ],
    lowPower: "Low Power Mode",
    lowPowerOptions: [
      ["saver", "Always"],
      ["normal", "Never or Only on Battery"],
    ],
    pick: "Choose…",
    linux: {
      disks: (
        <>
          Open <span className="path">Files › Other Locations</span>: under
          “Computer”, the available space and the size
        </>
      ),
      about: (
        <>
          Open <span className="path">Settings › About</span> (System › About on
          recent versions): OS name and memory
        </>
      ),
      activity: (
        <>
          Open <span className="path">System Monitor › Resources</span>: CPU and
          memory percentages. Then{" "}
          <span className="path">Settings › Power</span>: power mode
        </>
      ),
      osName: "OS name",
      powerModes: [
        ["saver", "Power Saver"],
        ["normal", "Balanced or Performance"],
      ],
    },
    boardMaker: "BaseBoard Manufacturer",
    boardModel: "BaseBoard Product",
    osWhere: {
      windows: (
        <>
          Open <span className="path">Settings › System › About</span>:
          “Edition” and “Version” lines. Then, in{" "}
          <span className="path">Task Manager › Processes</span>, the
          percentages at the top of the “CPU” and “Memory” columns, and in{" "}
          <span className="path">Startup apps</span>, the number of “Enabled”
          apps
        </>
      ),
      mac: (
        <>
          Open <span className="path">Apple menu › About This Mac</span>: macOS
          version. Then <span className="path">System Settings › Battery</span>,
          ⓘ button next to “Battery Health”: maximum capacity
        </>
      ),
    },
    os: "Edition",
    osOptions: [
      ["w11-home", "Windows 11 Home or Pro"],
      ["w11-ent", "Windows 11 Enterprise or Education"],
      ["w10", "Windows 10"],
    ],
    osVersion: "Version",
    macVersion: "macOS version",
    cpuLoad: "CPU",
    memoryPct: "Memory",
    startupCount: "“Enabled” apps",
    batteryPct: "Maximum capacity",
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

/** @param {{ system: "windows"|"mac"|"linux", onResult: (r: object|null) => void }} props */
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
        disks: mac || system === "linux" ? disks.slice(0, 1) : disks,
        ...(mac
          ? {
              memory: f.memory,
              power: f.power,
              osVersion: f.osVersion,
              batteryPct: f.batteryPct,
            }
          : f),
      }),
    );
  }, [disks, f, system, mac, onResult]);

  const shown = mac ? disks.slice(0, 1) : disks;

  // Linux (GNOME : Ubuntu, Fedora…) : trois fenêtres suffisent.
  if (system === "linux") {
    const l = t.linux;
    return (
      <>
        <GuideStep n="1" where={l.disks}>
          <Fields>
            <Field label={t.free} hint={t.gb}>
              <NumberInput
                value={disks[0]?.free}
                onChange={setDisk(0, "free")}
                placeholder="120"
              />
            </Field>
            <Field label={t.total} hint={t.gb}>
              <NumberInput
                value={disks[0]?.total}
                onChange={setDisk(0, "total")}
                placeholder="512"
              />
            </Field>
          </Fields>
        </GuideStep>
        <GuideStep n="2" where={l.about}>
          <Fields>
            <Field label={l.osName}>
              <input
                type="text"
                autoComplete="off"
                placeholder={
                  lang === "fr" ? "ex. Ubuntu 24.04" : "e.g. Ubuntu 24.04"
                }
                value={f.osVersion ?? ""}
                onChange={(e) => set("osVersion")(e.target.value)}
              />
            </Field>
            <Field label={t.memTotalMac} hint={t.gb}>
              <NumberInput
                value={f.memory}
                onChange={set("memory")}
                placeholder="16"
              />
            </Field>
          </Fields>
        </GuideStep>
        <GuideStep n="3" where={l.activity}>
          <Fields>
            <Field label={t.cpuLoad} hint="%">
              <NumberInput
                value={f.cpuLoad}
                onChange={set("cpuLoad")}
                placeholder="12"
              />
            </Field>
            <Field label={t.memoryPct} hint="%">
              <NumberInput
                value={f.memoryPct}
                onChange={set("memoryPct")}
                placeholder="45"
              />
            </Field>
            <Field label={t.power}>
              <Select
                value={f.power}
                onChange={set("power")}
                options={l.powerModes}
                placeholder={t.pick}
              />
            </Field>
          </Fields>
        </GuideStep>
      </>
    );
  }

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
              <Field label={t.gpuDate}>
                <NumberInput
                  value={f.gpuYear}
                  onChange={set("gpuYear")}
                  placeholder="07/11/2026"
                />
              </Field>
              <Field label={t.gpuState}>
                <Select
                  value={f.gpuState}
                  onChange={set("gpuState")}
                  options={t.gpuStates}
                  placeholder={t.pick}
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
              <Field label={t.boardMaker}>
                <input
                  type="text"
                  autoComplete="off"
                  value={f.boardMaker ?? ""}
                  onChange={(e) => set("boardMaker")(e.target.value)}
                />
              </Field>
              <Field label={t.boardModel}>
                <input
                  type="text"
                  autoComplete="off"
                  value={f.boardModel ?? ""}
                  onChange={(e) => set("boardModel")(e.target.value)}
                />
              </Field>
            </Fields>
          </GuideStep>
        </>
      )}
      <GuideStep n={mac ? "3" : "5"} where={w.system}>
        <Fields>
          {mac ? (
            <Field label={t.lowPower}>
              <Select
                value={f.power}
                onChange={set("power")}
                options={t.lowPowerOptions}
                placeholder={t.pick}
              />
            </Field>
          ) : (
            <>
              <Field label={t.diskType}>
                <Select
                  value={f.diskType}
                  onChange={set("diskType")}
                  options={[
                    ["SSD", "SSD"],
                    ["HDD", "HDD"],
                  ]}
                  placeholder={t.pick}
                />
              </Field>
              <Field label={t.uptime} hint={t.uptimeHint}>
                <NumberInput
                  value={f.uptime}
                  onChange={set("uptime")}
                  placeholder="3"
                />
              </Field>
              <Field label={t.power}>
                <Select
                  value={f.power}
                  onChange={set("power")}
                  options={t.powerOptions}
                  placeholder={t.pick}
                />
              </Field>
            </>
          )}
        </Fields>
      </GuideStep>
      <GuideStep n={mac ? "4" : "6"} where={t.osWhere[system]}>
        <Fields>
          {mac ? (
            <>
              <Field label={t.macVersion}>
                <NumberInput
                  value={f.osVersion}
                  onChange={set("osVersion")}
                  placeholder="15.6"
                />
              </Field>
              <Field label={t.batteryPct} hint="%">
                <NumberInput
                  value={f.batteryPct}
                  onChange={set("batteryPct")}
                  placeholder="88"
                />
              </Field>
            </>
          ) : (
            <>
              <Field label={t.os}>
                <Select
                  value={f.os}
                  onChange={set("os")}
                  options={t.osOptions}
                  placeholder={t.pick}
                />
              </Field>
              <Field label={t.osVersion}>
                <input
                  type="text"
                  autoComplete="off"
                  placeholder={lang === "fr" ? "ex. 24H2" : "e.g. 24H2"}
                  value={f.osVersion ?? ""}
                  onChange={(e) => set("osVersion")(e.target.value)}
                />
              </Field>
              <Field label={t.cpuLoad} hint="%">
                <NumberInput
                  value={f.cpuLoad}
                  onChange={set("cpuLoad")}
                  placeholder="12"
                />
              </Field>
              <Field label={t.memoryPct} hint="%">
                <NumberInput
                  value={f.memoryPct}
                  onChange={set("memoryPct")}
                  placeholder="45"
                />
              </Field>
              <Field label={t.startupCount}>
                <NumberInput
                  value={f.startupCount}
                  onChange={set("startupCount")}
                  placeholder="8"
                />
              </Field>
            </>
          )}
        </Fields>
      </GuideStep>
    </>
  );
}
