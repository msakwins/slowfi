# Slowfi

Test de débit et diagnostic de connexion et de matériel, sur
[slowfi.app](https://www.slowfi.app).

## Fonctionnalités

- **Test de débit** : débit descendant et montant, latence, variation.
- **Réseau local** : bande, norme, signal et canal Wi-Fi, vitesse de la liaison
  Ethernet, comparaison avec le débit mesuré.
- **Matériel** : système, disques, mémoire, processeur, carte graphique,
  firmware, batterie.
- **Périphériques** : audio, caméra, clavier, souris, Bluetooth, écrans.

Chaque anomalie détectée est accompagnée d'une explication et d'un correctif.

Windows, macOS et Linux. Commandes en lecture seule, analyse effectuée dans le
navigateur, aucune donnée collectée.

## Application desktop

Mêmes analyses, lancées directement par l'application, sans copier-coller.
Fonctions supplémentaires :

- Températures de la carte graphique, de la carte mère et des disques.
- Usure des SSD.
- Ventilateur de la carte graphique.
- Suivi de la charge du processeur, de la mémoire et de la carte graphique sur
  une minute.
- Mises à jour des pilotes : site du fabricant (NVIDIA) ou catalogue Windows
  Update, recherche assistée sur les sites AMD, Intel et Realtek.

Téléchargement : [slowfi.app/application](https://www.slowfi.app/application)
ou [dernière version](https://github.com/msakwins/slowfi/releases/latest).

Installateurs non signés : Windows SmartScreen et macOS Gatekeeper affichent
un avertissement à la première ouverture.

## Développement

```bash
npm install
npm run dev        # serveur de développement
npm run test       # tests en continu
npm run test:run   # tests, une exécution (CI)
npm run lint       # oxlint
npm run build      # build de production, dans dist/
npm run app        # build, puis ouverture de l'application desktop
npm run app:dist   # installateur du système courant, dans release/
```

Vérification de l'application desktop : `npx electron . --smoke` (affichage de
la page, lecture par le shell, analyse du matériel, pilotes, capteurs).

## Architecture

**`src/lib/` : moteurs d'analyse.** Fonctions pures, sans React, un fichier et
ses tests par domaine. Chaque règle associe un symptôme, une cause et un
correctif.

| Fichier | Rôle |
| --- | --- |
| `speedtest.js` | Mesure du débit et de la latence via `speed.cloudflare.com` |
| `connection.js` | Verdict sur le résultat du test de débit |
| `diagnostic.js` | Wi-Fi : lecture de `netsh` (Windows) et `system_profiler` (macOS), règles, comparaison avec le débit mesuré |
| `ethernet.js` | Vitesse et duplex de la liaison filaire |
| `storage.js` | Stockage : `Get-Volume` (Windows), `diskutil` (macOS) |
| `components.js` | Mémoire, carte graphique, firmware |
| `system.js` | Disque de démarrage, dernier redémarrage, mode d'alimentation |
| `platform.js` | Version du système, fin de support, batterie, programmes au démarrage |
| `activity.js` | Charge du processeur et de la mémoire, programmes les plus gourmands |
| `devices.js` | Périphériques et appareils en erreur |
| `linux.js` | Lecture des sorties Linux, appelée par chaque moteur |
| `powershell.js` | Lecture des sorties `Format-List` de PowerShell |
| `manual.js` | Saisie guidée : valeurs relevées à la main converties pour les moteurs |
| `commands.js` | Assemblage des commandes à copier, script de l'application desktop |
| `drivers.js` | Pilotes installés et comparaison avec Windows Update |
| `catalog.js` | Lecture du catalogue Microsoft Update |
| `vendors.js` | Sites des fabricants de pilotes |
| `driverLookup.js` | Recherche d'un pilote, commune au site et à l'application |
| `aiDriver.js` | Lecture assistée (Google Gemini) des pages de pilotes AMD, Intel et Realtek |
| `sensors.js` | Lecture des capteurs de l'application desktop |
| `download.js` | Liens de téléchargement, d'après la dernière version publiée |
| `summary.js`, `report.js` | Résumés en texte brut, à copier |
| `en.js` | Version anglaise des constats |
| `examples.js` | Sorties d'exemple, affichées sur la page et reprises par les tests |

**`src/components/` et `src/ui/` : interface** (React, styled-components).
L'accueil (`Home.jsx`) présente le test de débit (`SpeedTest.jsx`), puis le
diagnostic approfondi (`CombinedAnalysis.jsx`) : choix des analyses, commande à
copier ou saisie guidée, résultats. Pages séparées : vérifications manuelles
(`ManualChecks.jsx`), application (`AppPage.jsx`), confidentialité
(`Legal.jsx`).

**`api/` : fonctions Vercel.** Recherche de pilotes (`drivers.js`) et lecture
assistée des sites fabricants (`driver-ai.js`, clé `GEMINI_API_KEY`).

**`electron/` : application desktop.** Affichage du site en local, exécution
des lectures par le shell du système (`main.cjs`), capteurs (`sensors.cjs`).

Ajout d'un cas de diagnostic : une règle dans le moteur concerné et un test
associé.

## Rédaction

Textes à l'infinitif ou à l'impératif, sans tutoiement (« Tester en filaire »,
« Analyser le matériel »).

## Déploiement

- **Site** : Vercel, à chaque push sur `main`. La CI GitHub Actions exécute
  les tests et le build.
- **Application desktop** : mise à jour de `version` dans `package.json`, puis
  push d'un tag `v0.x.y`. Le workflow `Desktop` construit les installateurs
  Windows, macOS et Linux et les joint à une release publiée d'office.
  Les applications installées s'y mettent à jour d'elles-mêmes.

## Feuille de route

- [ ] Capteurs sous macOS (`sudo powermetrics`).
- [ ] Signature des installateurs Windows et macOS.

## Stack

React 19 · Vite · styled-components · Vitest · oxlint · Electron

## Licence

MIT
