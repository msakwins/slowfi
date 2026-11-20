// ─────────────────────────────────────────────────────────────────────────────
// Analyseur de stockage : même geste que l'analyseur Wi-Fi — on colle la sortie
// d'une commande, on parse, on diagnostique. Ici `Get-Volume`, qui connaît à la
// fois l'espace libre et l'intégrité du système de fichiers.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState } from "react";
import styled from "styled-components";
import { diagnoseStorage } from "../lib/storage.js";
import { Lead, Actions, Button, Ghost, Textarea, SEVERITY } from "../ui/theme.js";
import { Verdict, VerdictHead, StatGrid, StatCell, Findings } from "../ui/verdict.jsx";

const COMMAND =
  "Get-Volume | Where-Object DriveLetter | Format-List DriveLetter,FileSystemLabel,Size,SizeRemaining,HealthStatus,OperationalStatus";

// Exemple = une machine réelle : disque système à 13,7 % avec une MFT abîmée
// passée inaperçue six semaines, et disque de données saturé à 4,8 %.
const EXAMPLE = `DriveLetter       : C
FileSystemLabel   :
Size              : 249382825984
SizeRemaining     : 34285633536
HealthStatus      : Warning
OperationalStatus : Full Repair Needed

DriveLetter       : G
FileSystemLabel   : HDD
Size              : 966367641600
SizeRemaining     : 45969080320
HealthStatus      : Healthy
OperationalStatus : OK`;

const Command = styled.pre`
  margin: 0 0 20px;
  padding: 14px 16px;
  overflow-x: auto;
  background: #0f172a;
  border: 1px solid #1e293b;
  border-radius: 12px;
  font-family: ui-monospace, "SFMono-Regular", Menlo, monospace;
  font-size: 12px;
  line-height: 1.6;
  color: #67e8f9;
`;

const Empty = styled.p`
  margin-top: 24px;
  font-size: 14px;
  color: #fb7185;
`;

export default function StorageAnalyzer() {
  const [raw, setRaw] = useState("");
  const [result, setResult] = useState(null);

  const run = (text) => setResult(diagnoseStorage(text));

  return (
    <>
      <Lead>
        Sous Windows, ouvre PowerShell et colle ci-dessous le résultat de cette commande. Elle
        n'écrit rien&nbsp;: elle lit la taille, l'espace libre et l'intégrité de chaque volume.
      </Lead>

      <Command>{COMMAND}</Command>

      <Textarea
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        placeholder="Colle ici la sortie de Get-Volume…"
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

      {result && result.volumes.length === 0 && (
        <Empty>
          Aucun volume reconnu. Vérifie d'avoir collé la sortie complète de la commande, avec un
          bloc <code>Clé : valeur</code> par disque.
        </Empty>
      )}

      {result &&
        result.volumes.map((v) => {
          const sev = SEVERITY[v.severity];
          return (
            <Verdict key={v.driveLetter} $color={sev.color}>
              <VerdictHead color={sev.color} tag={v.label || `Disque ${v.driveLetter}`}>
                {`${v.driveLetter}: — ${sev.label}`}
              </VerdictHead>

              <StatGrid $cols={3} $border>
                <StatCell k="Taille" value={v.sizeGB} unit="Go" />
                <StatCell k="Libre" value={v.freeGB} unit="Go" />
                <StatCell k="Part libre" value={v.pct} unit="%" />
              </StatGrid>

              <div style={{ paddingTop: 4 }}>
                <Findings findings={v.findings} />
              </div>
            </Verdict>
          );
        })}
    </>
  );
}
