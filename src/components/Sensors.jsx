// ─────────────────────────────────────────────────────────────────────────────
// Capteurs (application desktop seulement) : températures, usure des SSD,
// ventilateurs, puis suivi de la charge pendant une minute.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { Title, Lead, Button, SEVERITY, Pending } from "../ui/theme.js";
import { useText } from "../ui/i18n.jsx";
import { desktop } from "../ui/desktop.js";
import PartsToBuy from "../ui/PartsToBuy.jsx";
import { recommendParts } from "../lib/parts.js";
import { useLang } from "../ui/i18n.jsx";
import {
  sensorRows,
  disksNeedAdmin,
  seriesSummary,
  slowdownSummary,
} from "../lib/sensors.js";

const TEXT = {
  fr: {
    title: "Capteurs",
    lead: "Températures, usure des SSD et ventilateurs, lus directement sur cet ordinateur",
    reading: "Lecture des capteurs",
    temps: "Températures",
    wear: "Usure des SSD",
    fans: "Ventilateurs",
    zone: "Carte mère (zone thermique)",
    gpuFan: (name) => `${name}`,
    wearValue: (v) => `${v} % d'endurance consommée`,
    hours: (h) => `${h.toLocaleString("fr-FR")} heures d'utilisation`,
    heat: (m, crit) =>
      crit > 0
        ? `${duration(m, "fr")} au-dessus de sa température d'alerte, dont ${duration(crit, "fr")} au seuil critique`
        : m > 0
          ? `${duration(m, "fr")} au-dessus de sa température d'alerte depuis sa mise en service`
          : "jamais au-dessus de sa température d'alerte",
    mediaErrors: (n) =>
      `${n} erreur${n > 1 ? "s" : ""} de lecture enregistrée${n > 1 ? "s" : ""}`,
    spare: (p) => `réserve de cellules neuves à ${p} %`,
    alerts: {
      spare: "le SSD signale une réserve presque épuisée",
      temperature: "le SSD signale une température trop haute",
      reliability:
        "le SSD signale une fiabilité dégradée : sauvegarder les données",
      readOnly:
        "le SSD est passé en lecture seule : sauvegarder les données et le remplacer",
    },
    noFans:
      "Ventilateurs du processeur et du boîtier : lisibles seulement par le logiciel du fabricant de la carte mère",
    noSensors:
      "Aucun capteur lisible sans droits administrateur sur ce système",
    admin: "Lire les disques avec les droits administrateur",
    adminMac: "Lire les températures avec le mot de passe administrateur",
    adminNoteMac:
      "macOS demande le mot de passe administrateur pour lire les températures, les ventilateurs et le niveau de chauffe",
    diskState: "État des disques",
    smart: (v) => (/verified/i.test(v) ? "Vérifié" : "En défaut"),
    pressureName: "Niveau de chauffe du Mac",
    pressure: {
      Nominal: "Normal",
      Fair: "Élevé",
      Moderate: "Élevé",
      Serious: "Très élevé",
      Heavy: "Très élevé",
      Critical: "Critique",
      Trapping: "Critique",
      Sleeping: "Critique",
    },
    adminNote:
      "Windows demande une autorisation : la lecture de l'usure et de la température des disques l'exige sur cet ordinateur",
    reread: "Relire les capteurs",
    track: "Suivi sur une minute",
    trackLead:
      "Charge du processeur, de la mémoire et de la carte graphique, une mesure par seconde. Lancer un jeu ou un programme lent pendant le suivi pour voir ce qui sature",
    start: "Lancer le suivi",
    stop: "Arrêter",
    restart: "Relancer le suivi",
    series: {
      cpu: "Processeur",
      memory: "Mémoire",
      gpuLoad: "Carte graphique",
      gpuTemperature: "Température graphique",
    },
    summary: (s, unit) =>
      `${s.avg} ${unit} en moyenne, ${s.max} ${unit} au plus haut`,
    slowNone: "Carte graphique jamais ralentie pendant le suivi",
    slowThermal: (n) =>
      `Carte graphique ralentie par la chaleur pendant ${n} s : elle baisse sa vitesse pour ne pas surchauffer. Dépoussiérer la carte et vérifier que ses ventilateurs tournent`,
    slowPower: (n) =>
      `Carte graphique bridée par sa limite de consommation pendant ${n} s, comportement normal en pleine charge`,
  },
  en: {
    title: "Sensors",
    lead: "Temperatures, SSD wear and fans, read directly on this computer",
    reading: "Reading sensors",
    temps: "Temperatures",
    wear: "SSD wear",
    fans: "Fans",
    zone: "Motherboard (thermal zone)",
    gpuFan: (name) => `${name}`,
    wearValue: (v) => `${v}% of endurance used`,
    hours: (h) => `${h.toLocaleString("en-US")} hours of use`,
    heat: (m, crit) =>
      crit > 0
        ? `${duration(m, "en")} above its alert temperature, ${duration(crit, "en")} of it at the critical limit`
        : m > 0
          ? `${duration(m, "en")} above its alert temperature since first use`
          : "never above its alert temperature",
    mediaErrors: (n) => `${n} recorded read error${n > 1 ? "s" : ""}`,
    spare: (p) => `spare cells at ${p}%`,
    alerts: {
      spare: "the SSD reports its spare cells almost used up",
      temperature: "the SSD reports a temperature too high",
      reliability: "the SSD reports degraded reliability: back up the data",
      readOnly:
        "the SSD switched to read-only: back up the data and replace it",
    },
    noFans:
      "Processor and case fans: readable only by the motherboard maker's software",
    noSensors: "No sensor readable without administrator rights on this system",
    admin: "Read the drives with administrator rights",
    adminMac: "Read temperatures with the administrator password",
    adminNoteMac:
      "macOS asks for the administrator password to read temperatures, fans and heat level",
    diskState: "Drive status",
    smart: (v) => (/verified/i.test(v) ? "Verified" : "Failing"),
    pressureName: "Mac heat level",
    pressure: {
      Nominal: "Normal",
      Fair: "High",
      Moderate: "High",
      Serious: "Very high",
      Heavy: "Very high",
      Critical: "Critical",
      Trapping: "Critical",
      Sleeping: "Critical",
    },
    adminNote:
      "Windows asks for permission: reading drive wear and temperature requires it on this computer",
    reread: "Read the sensors again",
    track: "One-minute tracking",
    trackLead:
      "Processor, memory and graphics card load, one reading per second. Start a game or a slow program during tracking to see what saturates",
    start: "Start tracking",
    stop: "Stop",
    restart: "Track again",
    series: {
      cpu: "Processor",
      memory: "Memory",
      gpuLoad: "Graphics card",
      gpuTemperature: "Graphics temperature",
    },
    summary: (s, unit) =>
      `${s.avg} ${unit} on average, ${s.max} ${unit} at peak`,
    slowNone: "Graphics card never slowed down during tracking",
    slowThermal: (n) =>
      `Graphics card slowed down by heat for ${n} s: it lowers its speed to avoid overheating. Dust off the card and check that its fans spin`,
    slowPower: (n) =>
      `Graphics card held back by its power limit for ${n} s, normal at full load`,
  },
};

/** Durée en minutes, lisible : « 45 min », « 5 h », « 3 jours ». */
function duration(min, lang) {
  if (min < 60) return `${min} min`;
  const h = Math.round(min / 60);
  if (h < 48) return `${h} h`;
  const d = Math.round(h / 24);
  return lang === "fr" ? `${d} jours` : `${d} days`;
}

const HARDWARE = {
  "--accent": "#f97316",
  "--accent-light": "#fb923c",
  "--accent-rgb": "249 115 22",
};

const SERIES = [
  { key: "cpu", color: "#f97316", unit: "%" },
  { key: "memory", color: "#a78bfa", unit: "%" },
  { key: "gpuLoad", color: "#22d3ee", unit: "%" },
  { key: "gpuTemperature", color: "#fb7185", unit: "°C" },
];

const SECONDS = 60;

const Section = styled.section``;

const Group = styled.p`
  margin: 28px 0 0;
  font-size: 12px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  font-weight: 500;
  color: #94a3b8;
`;

const Rows = styled.ul`
  margin: 10px 0 0;
  padding: 0;
  list-style: none;

  li {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 16px;
    padding: 9px 0;
    border-top: 1px solid #111a2e;
    font-size: 14px;
    color: #e2e8f0;
  }
  .sub {
    display: block;
    font-size: 13px;
    color: #64748b;
  }
  .value {
    flex: none;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
`;

// Une carte par composant : son nom, sa valeur en grand, une jauge à la
// couleur de son niveau.
const Cards = styled.ul`
  margin: 12px 0 0;
  padding: 0;
  list-style: none;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: 12px;

  li {
    padding: 14px 16px 16px;
    border-radius: 14px;
    border: 1px solid #1e293b;
    background: #0b1220;
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
  }
  .name {
    font-size: 13px;
    color: #94a3b8;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .value {
    font-size: 26px;
    font-weight: 700;
    letter-spacing: -0.02em;
    font-variant-numeric: tabular-nums;
    color: var(--level);
  }
  .gauge {
    height: 6px;
    border-radius: 6px;
    background: #111a2e;
    overflow: hidden;
  }
  .gauge div {
    height: 100%;
    border-radius: 6px;
    background: var(--level);
    box-shadow: 0 0 10px var(--level);
    transition: width 0.4s;
  }
  .sub {
    margin-top: 4px;
    font-size: 12px;
    line-height: 1.5;
    color: #64748b;
  }
`;

const Note = styled.p`
  margin: 10px 0 0;
  font-size: 13px;
  line-height: 1.6;
  color: #64748b;
  max-width: 62ch;
`;

const Chart = styled.svg`
  display: block;
  width: 100%;
  height: 160px;
  margin-top: 16px;
  border-radius: 12px;
  background: #0b1220;
`;

const Legend = styled.ul`
  margin: 12px 0 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 6px;
  font-size: 14px;
  color: #e2e8f0;

  li::before {
    content: "";
    display: inline-block;
    width: 8px;
    height: 8px;
    margin-right: 10px;
    border-radius: 50%;
    background: var(--dot);
  }
  .sub {
    color: #64748b;
  }
`;

/** Courbes du suivi : 0–100 sur l'axe vertical, une minute en largeur. */
function LineChart({ samples }) {
  const W = 600;
  const H = 160;
  const x = (i) => (i / (SECONDS - 1)) * W;
  const y = (v) => H - 8 - (Math.min(v, 100) / 100) * (H - 16);
  return (
    <Chart
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {[25, 50, 75].map((g) => (
        <line
          key={g}
          x1="0"
          x2={W}
          y1={y(g)}
          y2={y(g)}
          stroke="#1e293b"
          strokeWidth="1"
        />
      ))}
      {SERIES.map(({ key, color }) => {
        const points = samples
          .map((s, i) => (s[key] == null ? null : `${x(i)},${y(s[key])}`))
          .filter(Boolean);
        if (points.length < 2) return null;
        return (
          <polyline
            key={key}
            points={points.join(" ")}
            fill="none"
            stroke={color}
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
          />
        );
      })}
    </Chart>
  );
}

/** Ralentissements de la carte graphique pendant le suivi. */
function Slowdown({ samples, t }) {
  const slow = slowdownSummary(samples);
  if (!slow) return null;
  return (
    <>
      {slow.thermal > 0 && (
        <Note style={{ color: SEVERITY.warning.color }}>
          {t.slowThermal(slow.thermal)}
        </Note>
      )}
      {slow.power > 0 && <Note>{t.slowPower(slow.power)}</Note>}
      {slow.thermal === 0 && slow.power === 0 && <Note>{t.slowNone}</Note>}
    </>
  );
}

export default function Sensors() {
  const t = useText(TEXT);
  const { lang } = useLang();
  const [data, setData] = useState(null);
  const [adminBusy, setAdminBusy] = useState(false);
  const [samples, setSamples] = useState([]);
  const [tracking, setTracking] = useState(false);
  const stopRef = useRef(false);

  const read = async () => {
    setData(null);
    setData(await desktop.sensors());
  };

  useEffect(() => {
    read();
    return () => {
      stopRef.current = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const readAsAdmin = async () => {
    setAdminBusy(true);
    try {
      const res = await desktop.sensorsAdmin();
      // Windows : les disques relus ; macOS : températures, ventilateurs et
      // niveau de chauffe.
      if (Array.isArray(res)) setData((d) => ({ ...d, disks: res }));
      else if (res) setData((d) => ({ ...d, ...res }));
    } finally {
      setAdminBusy(false);
    }
  };

  const track = async () => {
    stopRef.current = false;
    setTracking(true);
    setSamples([]);
    const withGpu = (data?.gpus ?? []).length > 0;
    await desktop.sample(false); // point de départ du calcul de charge
    for (let i = 0; i < SECONDS && !stopRef.current; i++) {
      const started = Date.now();
      // La carte graphique une seconde sur deux : nvidia-smi prend du temps.
      const s = await desktop.sample(withGpu && i % 2 === 0);
      setSamples((prev) => [...prev, s]);
      await new Promise((r) =>
        setTimeout(r, Math.max(0, 1000 - (Date.now() - started))),
      );
    }
    setTracking(false);
  };

  const rows = data ? sensorRows(data) : [];
  const temps = rows.filter((r) => ["gpu", "zone", "disk"].includes(r.kind));
  const wear = rows.filter((r) => r.kind === "wear");
  const fans = rows.filter((r) => ["gpuFan", "fan"].includes(r.kind));

  // Zone ACPI de Windows (\_TZ.TZ00) : nommée « carte mère ».
  const name = (r) =>
    r.kind === "zone" && r.name.startsWith("\\")
      ? t.zone
      : r.kind === "pressure"
        ? t.pressureName
        : r.name;
  const smartRows = rows.filter((r) => r.kind === "smart");
  const pressureRow = rows.find((r) => r.kind === "pressure");
  const row = (r, value, sub) => (
    <li key={`${r.kind}-${r.name}`}>
      <span>
        {name(r)}
        {sub && <span className="sub">{sub}</span>}
      </span>
      <span
        className="value"
        style={{ color: SEVERITY[r.level]?.color ?? "#e2e8f0" }}
      >
        {value}
      </span>
    </li>
  );

  // Carte : jauge remplie à pct (0 à 100).
  const card = (r, value, pct, sub) => (
    <li
      key={`${r.kind}-${r.name}`}
      style={{ "--level": SEVERITY[r.level]?.color ?? "#e2e8f0" }}
    >
      <span className="name" title={name(r)}>
        {name(r)}
      </span>
      <span className="value">{value}</span>
      {pct != null && (
        <span className="gauge" aria-hidden="true">
          <div style={{ width: `${Math.max(3, Math.min(100, pct))}%` }} />
        </span>
      )}
      {sub && <span className="sub">{sub}</span>}
    </li>
  );

  return (
    <Section style={HARDWARE}>
      <Title>{t.title}</Title>
      <Lead>{t.lead}</Lead>

      {!data ? (
        <Pending>{t.reading}</Pending>
      ) : (
        <>
          {rows.length === 0 && <Note>{t.noSensors}</Note>}
          {temps.length > 0 && (
            <>
              <Group>{t.temps}</Group>
              <Cards>
                {/* Jauge sur 100 °C. */}
                {temps.map((r) =>
                  card(r, `${Math.round(r.value)} °C`, r.value),
                )}
                {pressureRow &&
                  card(
                    pressureRow,
                    t.pressure[pressureRow.value] ?? pressureRow.value,
                    null,
                  )}
              </Cards>
            </>
          )}
          {wear.length > 0 && (
            <>
              <Group>{t.wear}</Group>
              <Cards>
                {wear.map((r) =>
                  card(
                    r,
                    `${r.value} %`,
                    r.value,
                    [
                      t.wearValue(r.value),
                      r.extra?.hours && t.hours(r.extra.hours),
                      r.extra?.heatMinutes != null &&
                        t.heat(r.extra.heatMinutes, r.extra.criticalMinutes),
                      r.extra?.mediaErrors > 0 &&
                        t.mediaErrors(r.extra.mediaErrors),
                      // La réserve seulement quand elle a commencé à servir.
                      r.extra?.spare != null &&
                        r.extra.spare < 100 &&
                        t.spare(r.extra.spare),
                      ...(r.extra?.alerts ?? []).map((a) => t.alerts[a]),
                    ]
                      .filter(Boolean)
                      .join(", "),
                  ),
                )}
              </Cards>
            </>
          )}
          {smartRows.length > 0 && (
            <>
              <Group>{t.diskState}</Group>
              <Rows>{smartRows.map((r) => row(r, t.smart(r.value)))}</Rows>
            </>
          )}
          {disksNeedAdmin(data) && (
            <>
              <Note>
                {data.platform === "mac" ? t.adminNoteMac : t.adminNote}
              </Note>
              <div style={{ marginTop: 12 }}>
                <Button onClick={readAsAdmin} disabled={adminBusy}>
                  {data.platform === "mac" ? t.adminMac : t.admin}
                </Button>
              </div>
            </>
          )}
          <Group>{t.fans}</Group>
          {fans.length > 0 && (
            <Cards>
              {fans.map((r) =>
                card(
                  r,
                  r.unit === "%" ? `${r.value} %` : `${r.value} ${r.unit}`,
                  r.unit === "%" ? r.value : null,
                ),
              )}
            </Cards>
          )}
          {data.platform === "windows" && <Note>{t.noFans}</Note>}
        </>
      )}

      <Group>{t.track}</Group>
      <Note>{t.trackLead}</Note>
      <div style={{ marginTop: 14 }}>
        {tracking ? (
          <Button
            onClick={() => {
              stopRef.current = true;
            }}
          >
            {t.stop}
          </Button>
        ) : (
          <Button $primary onClick={track} disabled={!data}>
            {samples.length ? t.restart : t.start}
          </Button>
        )}
      </div>
      {samples.length > 1 && (
        <>
          <LineChart samples={samples} />
          <Legend>
            {SERIES.map(({ key, color, unit }) => {
              const s = seriesSummary(samples.map((p) => p[key]));
              if (!s) return null;
              return (
                <li key={key} style={{ "--dot": color }}>
                  {t.series[key]}{" "}
                  <span className="sub">{t.summary(s, unit)}</span>
                </li>
              );
            })}
          </Legend>
          <Slowdown samples={samples} t={t} />
        </>
      )}

      {/* SSD usés, carte qui chauffe pendant le suivi : pièces à prévoir. */}
      {data && (
        <PartsToBuy
          parts={recommendParts(
            {
              disks: (data.disks ?? []).map((d) => ({
                name: d.name,
                mediaType: d.media,
                busType: d.bus,
                health: "Healthy",
                size: d.size,
              })),
              ssdHealth: rows
                .filter((r) => r.kind === "wear")
                .map((r) => ({
                  name: r.name,
                  wear: r.value,
                  alerts: r.extra?.alerts ?? [],
                  spare: r.extra?.spare ?? null,
                })),
              gpuOverheating: (slowdownSummary(samples)?.thermal ?? 0) > 0,
            },
            lang,
          )}
        />
      )}
    </Section>
  );
}
