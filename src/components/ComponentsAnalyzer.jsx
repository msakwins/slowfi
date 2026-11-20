// ─────────────────────────────────────────────────────────────────────────────
// Analyseur de composants : mémoire, carte graphique, firmware. Trois commandes
// à coller d'un bloc — les blocs sont reconnus à leurs champs, donc l'ordre et
// les collages partiels n'ont pas d'importance.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState } from "react";
import styled from "styled-components";
import { analyzeComponents } from "../lib/components.js";
import { Lead, Actions, Button, Ghost, Textarea, Command, SEVERITY } from "../ui/theme.js";
import { Verdict, VerdictHead, StatGrid, StatCell, Findings } from "../ui/verdict.jsx";

const COMMAND = [
  "Get-CimInstance Win32_PhysicalMemory | Format-List DeviceLocator,Capacity,Speed,ConfiguredClockSpeed",
  "Get-CimInstance Win32_VideoController | Format-List Name,DriverVersion,DriverDate",
  "Get-CimInstance Win32_BIOS | Format-List Manufacturer,SMBIOSBIOSVersion,ReleaseDate",
].join("\n");

// Exemple = une machine réelle : 32 Go vendus pour 2666 MHz mais appliqués à
// 2133 faute de profil XMP, pilote graphique figé depuis deux ans, BIOS d'origine.
const EXAMPLE = `DeviceLocator        : ChannelA-DIMM2
Capacity             : 17179869184
Speed                : 2666
ConfiguredClockSpeed : 2133

DeviceLocator        : ChannelB-DIMM2
Capacity             : 17179869184
Speed                : 2666
ConfiguredClockSpeed : 2133

Name          : NVIDIA GeForce GTX 1660 Ti
DriverVersion : 32.0.15.6094
DriverDate    : 14/08/2024 02:00:00

Manufacturer      : American Megatrends Inc.
SMBIOSBIOSVersion : 1303
ReleaseDate       : 20/03/2019 01:00:00`;

const Empty = styled.p`
  margin-top: 24px;
  font-size: 14px;
  color: #fb7185;
`;

export default function ComponentsAnalyzer() {
  const [raw, setRaw] = useState("");
  const [result, setResult] = useState(null);

  const run = (text) => setResult(analyzeComponents(text));

  const nothingFound =
    result && result.memory.length === 0 && result.gpus.length === 0 && !result.bios;
  const sev = result ? SEVERITY[result.severity] : null;
  const gpu = result?.gpus[0];
  const freq = result?.memory[0]?.configured ?? null;

  return (
    <>
      <Lead>
        Colle la sortie de ces trois commandes&nbsp;: elles décrivent la mémoire, la carte
        graphique et le firmware. Elles ne modifient rien, et tu peux n'en coller qu'une partie.
      </Lead>

      <Command>{COMMAND}</Command>

      <Textarea
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        placeholder="Colle ici la sortie des commandes Get-CimInstance…"
      />

      <Actions>
        <Button $primary onClick={() => run(raw)} disabled={!raw.trim()}>
          Analyser
        </Button>
        <Button
          onClick={() => {
            setRaw(EXAMPLE);
            run(EXAMPLE);
          }}
        >
          Charger un exemple
        </Button>
        {result && (
          <Ghost
            onClick={() => {
              setRaw("");
              setResult(null);
            }}
          >
            Réinitialiser
          </Ghost>
        )}
      </Actions>

      {nothingFound && (
        <Empty>
          Aucun composant reconnu. Vérifie d'avoir collé la sortie complète, avec un bloc{" "}
          <code>Clé : valeur</code> par composant.
        </Empty>
      )}

      {result && !nothingFound && (
        <Verdict $color={sev.color}>
          <VerdictHead color={sev.color} tag={gpu?.name}>
            {sev.label}
          </VerdictHead>

          <StatGrid $cols={4} $border>
            <StatCell k="Mémoire" value={result.totalGB} unit="Go" />
            <StatCell k="Barrettes" value={result.memory.length || null} />
            <StatCell k="Fréquence" value={freq} unit="MHz" />
            <StatCell k="BIOS" value={result.bios?.year} />
          </StatGrid>

          <div style={{ paddingTop: 4 }}>
            <Findings findings={result.findings} />
          </div>
        </Verdict>
      )}
    </>
  );
}
