// ─────────────────────────────────────────────────────────────────────────────
// Après « vite build » : un fichier HTML par page et par langue, pour les
// moteurs de recherche et les aperçus de liens. Chaque fichier reprend
// dist/index.html avec son titre, sa description, son adresse officielle,
// ses adresses dans l'autre langue (hreflang), ses données structurées et un
// texte lisible sans exécuter le script. React remplace ce texte au
// chargement : rien ne change pour le visiteur.
// Écrit aussi dist/sitemap.xml, avec les deux langues de chaque page.
//
// Les adresses anglaises suivent EN_PATHS (src/ui/router.jsx) : à changer
// ensemble.
// ─────────────────────────────────────────────────────────────────────────────
import fs from "node:fs";
import path from "node:path";

const SITE = "https://www.slowfi.app";
const DIST = path.resolve("dist");
const TODAY = new Date().toISOString().slice(0, 10);

const APP = {
  "@type": "SoftwareApplication",
  name: "Slowfi",
  operatingSystem: "Windows, macOS, Linux",
  applicationCategory: "UtilitiesApplication",
  offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
};

/**
 * fr, en : adresse de la page dans chaque langue.
 * index : false pour une page sans contenu propre (historique vide pour un
 * nouveau visiteur) : servie, mais pas indexée.
 */
const PAGES = [
  {
    fr: "/",
    en: "/en",
    app: true,
    text: {
      fr: {
        title: "Slowfi — diagnostic de connexion et de matériel",
        description:
          "Test de débit et de latence, analyse du Wi-Fi, de la box, des disques, de la mémoire, du processeur, de la carte graphique et des périphériques. Gratuit, sans compte",
        body: `<h1>Diagnostic de connexion et de matériel</h1>
<p>Test de débit descendant et montant, de la latence et de la stabilité de la ligne, en Wi-Fi comme en Ethernet</p>
<h2>Diagnostic complet</h2>
<p>Contrôle du réseau local, du matériel et des périphériques : Wi-Fi, box et câblage, disques, mémoire, processeur, carte graphique, batterie, audio, caméra, Bluetooth et écrans</p>
<h2>Application</h2>
<p>Application gratuite pour Windows, macOS et Linux : analyses lancées directement, températures, usure des SSD et mises à jour des pilotes</p>`,
      },
      en: {
        title: "Slowfi — connection and hardware diagnostics",
        description:
          "Speed and latency test, analysis of Wi-Fi, router, drives, memory, processor, graphics card and devices. Free, no account",
        body: `<h1>Connection and hardware diagnostics</h1>
<p>Download and upload speed, latency and line stability test, over Wi-Fi or Ethernet</p>
<h2>Full diagnostic</h2>
<p>Checks the local network, hardware and devices: Wi-Fi, router and cabling, drives, memory, processor, graphics card, battery, audio, camera, Bluetooth and displays</p>
<h2>App</h2>
<p>Free app for Windows, macOS and Linux: analyses run directly, temperatures, SSD wear and driver updates</p>`,
      },
    },
  },
  {
    fr: "/application",
    en: "/en/app",
    app: true,
    text: {
      fr: {
        title: "Application Slowfi pour Windows, macOS et Linux",
        description:
          "Application gratuite de diagnostic de connexion, de matériel et de périphériques pour Windows, macOS et Linux : températures, usure des SSD, mises à jour des pilotes",
        body: `<h1>Application</h1>
<p>Diagnostic de connexion, de matériel et de périphériques pour Windows, macOS et Linux</p>
<h2>Uniquement dans l'application</h2>
<p>Analyses lancées directement, sans commande à copier. Températures, ventilateurs et usure des SSD. Mises à jour des pilotes graphiques, réseau et audio. Historique des analyses</p>
<h2>Téléchargement</h2>
<p>Gratuite, mises à jour automatiques. Aucune donnée personnelle n'est collectée</p>`,
      },
      en: {
        title: "Slowfi app for Windows, macOS and Linux",
        description:
          "Free connection, hardware and device diagnostics app for Windows, macOS and Linux: temperatures, SSD wear, driver updates",
        body: `<h1>App</h1>
<p>Connection, hardware and device diagnostics for Windows, macOS and Linux</p>
<h2>Only in the app</h2>
<p>Analyses run directly, with no command to copy. Temperatures, fans and SSD wear. Graphics, network and audio driver updates. Analysis history</p>
<h2>Download</h2>
<p>Free, with automatic updates. No personal data is collected</p>`,
      },
    },
  },
  {
    fr: "/diagnostic",
    en: "/en/diagnostic",
    text: {
      fr: {
        title: "Diagnostic complet du PC et du réseau — Slowfi",
        description:
          "Contrôle du Wi-Fi, de la box et du câblage, des disques, de la mémoire, du processeur, de la carte graphique, de la batterie et des appareils branchés",
        body: `<h1>Diagnostic complet</h1>
<p>Contrôle du réseau local, du matériel et des périphériques</p>
<h2>Réseau local</h2>
<p>Wi-Fi, box et câblage, comparés au débit mesuré</p>
<h2>Matériel</h2>
<p>Système, disques, mémoire, processeur, carte graphique, firmware et batterie</p>
<h2>Périphériques</h2>
<p>Audio, caméra, clavier, souris, Bluetooth et écrans</p>`,
      },
      en: {
        title: "Full PC and network diagnostic — Slowfi",
        description:
          "Checks Wi-Fi, router and cabling, drives, memory, processor, graphics card, battery and connected devices",
        body: `<h1>Full diagnostic</h1>
<p>Checks the local network, hardware and devices</p>
<h2>Local network</h2>
<p>Wi-Fi, router and cabling, compared with the measured speed</p>
<h2>Hardware</h2>
<p>System, drives, memory, processor, graphics card, firmware and battery</p>
<h2>Devices</h2>
<p>Audio, camera, keyboard, mouse, Bluetooth and displays</p>`,
      },
    },
  },
  {
    fr: "/historique",
    en: "/en/history",
    index: false,
    text: {
      fr: {
        title: "Historique — Slowfi",
        description: "Analyses enregistrées sur cet appareil",
        body: `<h1>Historique</h1>`,
      },
      en: {
        title: "History — Slowfi",
        description: "Analyses saved on this device",
        body: `<h1>History</h1>`,
      },
    },
  },
  {
    fr: "/depannage",
    en: "/en/troubleshooting",
    text: {
      fr: {
        title: "Dépannage du PC : clavier, son, Wi-Fi, lenteur — Slowfi",
        description:
          "Analyse ciblée d'un problème : clavier, souris, son, micro, caméra, Bluetooth, écran, imprimante, Wi-Fi, box, disque ou lenteur, avec les vérifications à faire",
        body: `<h1>Dépannage</h1>
<p>Choisir le problème : seule l'analyse qui le concerne est lancée</p>
<h2>Réseau</h2>
<p>Wi-Fi, box et Internet</p>
<h2>Ordinateur</h2>
<p>Lenteur, disque</p>
<h2>Périphériques</h2>
<p>Clavier, souris, son, micro, caméra, Bluetooth, écran, imprimante</p>`,
      },
      en: {
        title: "PC troubleshooting: keyboard, sound, Wi-Fi, slowness — Slowfi",
        description:
          "Targeted analysis of one problem: keyboard, mouse, sound, microphone, camera, Bluetooth, display, printer, Wi-Fi, router, drive or slowness, with the checks to make",
        body: `<h1>Troubleshooting</h1>
<p>Choose the problem: only the analysis that concerns it runs</p>
<h2>Network</h2>
<p>Wi-Fi, router and Internet</p>
<h2>Computer</h2>
<p>Slowness, drive</p>
<h2>Devices</h2>
<p>Keyboard, mouse, sound, microphone, camera, Bluetooth, display, printer</p>`,
      },
    },
  },
  {
    fr: "/confidentialite",
    en: "/en/privacy",
    text: {
      fr: {
        title: "Confidentialité et mentions légales — Slowfi",
        description:
          "Aucune donnée personnelle n'est collectée : aucun compte, aucun cookie, aucun outil de mesure d'audience. Les analyses s'exécutent sur l'appareil",
        body: `<h1>Confidentialité et mentions légales</h1>
<p>Aucune donnée personnelle n'est collectée : aucun compte, aucun cookie, aucun outil de mesure d'audience. Sur le site comme dans l'application, les analyses s'exécutent sur l'appareil</p>`,
      },
      en: {
        title: "Privacy and legal notice — Slowfi",
        description:
          "No personal data is collected: no account, no cookie, no audience measurement. Analyses run on the device",
        body: `<h1>Privacy and legal notice</h1>
<p>No personal data is collected: no account, no cookie, no audience measurement. On the website and in the app, analyses run on the device</p>`,
      },
    },
  },
];

const esc = (s) =>
  s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
const url = (p) => SITE + (p === "/" ? "/" : p);

function replaceOnce(html, re, value, what) {
  if (!re.test(html)) throw new Error(`prerender : ${what} introuvable`);
  return html.replace(re, value);
}

function render(template, page, lang) {
  const t = page.text[lang];
  const self = url(page[lang]);
  let html = template;
  html = replaceOnce(html, /<html lang="[^"]*">/, `<html lang="${lang}">`, "<html>");
  html = replaceOnce(html, /<title>[^<]*<\/title>/, `<title>${esc(t.title)}</title>`, "<title>");
  html = replaceOnce(
    html,
    /<meta\s+name="description"\s+content="[^"]*"\s*\/>/,
    `<meta name="description" content="${esc(t.description)}" />`,
    "description",
  );
  html = replaceOnce(
    html,
    /<link rel="canonical" href="[^"]*" \/>/,
    [
      `<link rel="canonical" href="${self}" />`,
      `<link rel="alternate" hreflang="fr" href="${url(page.fr)}" />`,
      `<link rel="alternate" hreflang="en" href="${url(page.en)}" />`,
      `<link rel="alternate" hreflang="x-default" href="${url(page.fr)}" />`,
      page.index === false ? `<meta name="robots" content="noindex" />` : "",
    ]
      .filter(Boolean)
      .join("\n    "),
    "canonical",
  );
  html = replaceOnce(
    html,
    /<meta property="og:locale" content="[^"]*" \/>/,
    `<meta property="og:locale" content="${lang === "fr" ? "fr_FR" : "en_US"}" />\n    <meta property="og:locale:alternate" content="${lang === "fr" ? "en_US" : "fr_FR"}" />`,
    "og:locale",
  );
  html = replaceOnce(html, /<meta property="og:url" content="[^"]*" \/>/, `<meta property="og:url" content="${self}" />`, "og:url");
  html = replaceOnce(
    html,
    /<meta property="og:title" content="[^"]*" \/>/,
    `<meta property="og:title" content="${esc(t.title)}" />`,
    "og:title",
  );
  html = replaceOnce(
    html,
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/>/,
    `<meta property="og:description" content="${esc(t.description)}" />`,
    "og:description",
  );

  // Données structurées : le site, et l'application téléchargeable.
  const graph = [
    {
      "@type": "WebSite",
      name: "Slowfi",
      url: SITE + "/",
      inLanguage: ["fr", "en"],
    },
    {
      "@type": "WebPage",
      name: t.title,
      url: self,
      description: t.description,
      inLanguage: lang,
    },
    ...(page.app
      ? [
          {
            ...APP,
            url: url(page[lang]),
            downloadUrl: url(lang === "fr" ? "/application" : "/en/app"),
            description: t.description,
            inLanguage: lang,
          },
        ]
      : []),
  ];
  html = replaceOnce(
    html,
    /<script type="application\/ld\+json">[\s\S]*?<\/script>/,
    `<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@graph": graph })}</script>`,
    "JSON-LD",
  );

  html = replaceOnce(
    html,
    /<main class="static">[\s\S]*?<\/main>/,
    `<main class="static">\n${t.body}\n</main>`,
    "texte statique",
  );
  return html;
}

const template = fs.readFileSync(path.join(DIST, "index.html"), "utf8");
for (const page of PAGES) {
  for (const lang of ["fr", "en"]) {
    const p = page[lang];
    // « / » reste index.html ; « /en/app » devient en/app.html (cleanUrls).
    const file = p === "/" ? "index.html" : `${p.slice(1)}.html`;
    const out = path.join(DIST, file);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, render(template, page, lang));
  }
}

const entries = PAGES.filter((p) => p.index !== false).flatMap((page) =>
  ["fr", "en"].map(
    (lang) => `  <url>
    <loc>${url(page[lang])}</loc>
    <xhtml:link rel="alternate" hreflang="fr" href="${url(page.fr)}" />
    <xhtml:link rel="alternate" hreflang="en" href="${url(page.en)}" />
    <lastmod>${TODAY}</lastmod>
  </url>`,
  ),
);
fs.writeFileSync(
  path.join(DIST, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.join("\n")}
</urlset>
`,
);
console.log(`prerender : ${PAGES.length * 2} pages, sitemap.xml`);
