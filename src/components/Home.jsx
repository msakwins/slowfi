// ─────────────────────────────────────────────────────────────────────────────
// L'accueil : un test de débit disponible tout de suite, puis deux portes —
// la connexion d'un côté, le matériel de l'autre.
//
// La séparation existe parce que les deux enquêtes n'ont rien à voir : l'une
// regarde ce qui sort de la machine, l'autre ce qu'il y a dedans. Les mélanger
// dans une seule grille obligeait à trier mentalement avant de commencer.
// ─────────────────────────────────────────────────────────────────────────────
import React from "react";
import { Title, Lead, Grid, Card, Hint } from "../ui/theme.js";
import SpeedTest from "./SpeedTest.jsx";

const DOORS = [
  {
    family: "reseau",
    icon: "📡",
    title: "Connexion",
    blurb: "Internet, Wi-Fi, Ethernet, câbles, box.",
  },
  {
    family: "materiel",
    icon: "🧩",
    title: "Matériel",
    blurb: "Disques, mémoire, carte graphique, firmware.",
  },
];

export default function Home({ onOpen }) {
  return (
    <>
      <Title>Diagnostic de connexion et de matériel</Title>
      <Lead>
        Le test dure une vingtaine de secondes. S'il ne révèle rien, le coupable est ailleurs. Un
        disque plein ou une mémoire mal réglée pèsent autant qu'une mauvaise connexion, et ça ne se
        voit nulle part. Rien ne sort de ton navigateur.
      </Lead>

      <SpeedTest />

      <Hint>Pour aller plus loin&nbsp;:</Hint>

      <Grid>
        {DOORS.map((d) => (
          <Card key={d.family} onClick={() => onOpen(d.family)}>
            <div className="icon">{d.icon}</div>
            <p className="t">{d.title}</p>
            <p className="b">{d.blurb}</p>
          </Card>
        ))}
      </Grid>
    </>
  );
}
