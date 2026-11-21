# Slowfi

Un diagnostiqueur de connexion et de matériel qui ne se contente pas de mesurer :
il dit **quel composant coince** et **comment le réparer**.

Deux enquêtes, séparées parce qu'elles n'ont rien à voir :

- **Connexion** — un test de débit lancé depuis le navigateur (débit descendant,
  montant, latence, variation), puis l'analyse du Wi-Fi à partir de la sortie de
  `netsh wlan show interfaces` : bande, norme, signal, canal, débit réel estimé.
- **Matériel** — l'analyse des disques (espace libre, intégrité des volumes via
  `Get-Volume`) et des composants (mémoire, carte graphique, âge du BIOS).

Chaque problème détecté arrive avec son explication et son correctif. Les
commandes à coller sont en lecture seule, et leur sortie ne quitte pas le
navigateur.

## Pourquoi

Les speed tests classiques répondent à « combien ai-je de débit ? ». Ils ne
répondent pas à « pourquoi c'est lent, et que faire ? ». Cas fondateur : un Wi-Fi
coincé en 2,4 GHz qui plafonne à ~55 Mb/s au lieu de 355 en 5 GHz. Et quand la
ligne va bien, la lenteur vient souvent d'ailleurs : un disque plein ou un
firmware ancien pèsent autant qu'une mauvaise connexion.

## Démarrer

```bash
npm install
npm run dev        # serveur de dev
npm run test       # tests en watch
npm run test:run   # tests une fois (CI)
npm run lint       # oxlint
npm run build      # build de production
```

## Architecture

Le projet sépare volontairement le moteur de l'interface.

**`src/lib/` — le moteur.** Fonctions pures, sans React ; chaque domaine a son
fichier et ses tests. C'est là que vit l'expertise, sous forme de règles
symptôme → coupable → correctif.

| Fichier | Rôle |
| --- | --- |
| `speedtest.js` | Mesure du débit et de la latence contre `speed.cloudflare.com` (seul module qui touche au réseau) |
| `connection.js` | Verdict sur les chiffres du test de débit |
| `diagnostic.js` | Wi-Fi : `netsh` (Windows) ou `system_profiler` (macOS), règles, détection du filaire, comparaison avec le débit mesuré |
| `storage.js` | Stockage : `Get-Volume` (Windows) ou `diskutil` (macOS) |
| `components.js` | Mémoire, carte graphique, firmware (mémoire seule sur macOS) |
| `powershell.js` | Lecture commune des sorties `Format-List` de PowerShell |
| `summary.js` | Résumé du test de débit, à copier |
| `en.js` | Version anglaise des constats, par identifiant |
| `linux.js` | Lecture des sorties Linux, appelée par chaque moteur |
| `platform.js` | Version du système et fin de support, batterie, démarrage |
| `activity.js` | Charge du processeur et de la mémoire, programmes gourmands |
| `devices.js` | Périphériques et appareils en erreur |
| `ethernet.js` | Vitesse et duplex de la liaison filaire |
| `report.js` | Résumé en texte d'une analyse, à copier |
| `examples.js` | Sorties d'exemple, affichées sur la page et reprises par les tests |

**`src/components/` — l'interface** (styled-components). L'application tient
sur une page (`Home.jsx`) : le test de débit, puis les analyses approfondies
qui s'ouvrent sur place — `NetworkAnalysis.jsx` (Wi-Fi) et
`HardwareAnalysis.jsx` (disques et composants, en une seule commande), avec
une commande Windows et une commande macOS. Les vérifications manuelles
(`ManualChecks.jsx`) et la page de confidentialité (`Legal.jsx`) sont des
pages à part, liées depuis le pied de page. Les éléments partagés (thème,
logo, verdicts, étape copier-coller `PasteStep.jsx`, flèche, compteur animé)
sont dans `src/ui/`.

Ajouter un cas de diagnostic = ajouter une règle dans le module concerné + un
test à côté. Rien d'autre à modifier.

## Ton des textes

Les textes ne tutoient pas l'utilisateur : infinitif ou impératif
(« Tester en filaire… », « Analyser le matériel »).

## Feuille de route

- [x] Cas filaire : vitesse de la liaison Ethernet (`Get-NetAdapter`, `ifconfig`).
- [x] Support macOS (Wi-Fi, disque, mémoire).
- [x] Support Linux (commandes sans droits root, sortie forcée en anglais par
      `LC_ALL=C`, saisie guidée pour GNOME).
- [x] Analyse complète : une seule commande pour la connexion, le matériel et
      les périphériques, au choix.
- [ ] Version desktop (Tauri) capable de lancer les commandes automatiquement,
      sans copier-coller manuel.

### Réservé à l'application desktop

Ce qu'un site ne peut pas obtenir, même par copier-coller : ces mesures
demandent des droits administrateur ou un accès direct au matériel, et
attendront l'application.

- [x] Températures : carte graphique NVIDIA (nvidia-smi), zone thermique de la
      carte mère et disques sous Windows, capteurs hwmon sous Linux.
- [x] Usure des SSD : `Get-StorageReliabilityCounter`, relancé avec les droits
      administrateur si Windows l'exige.
- [x] Ventilateurs : carte graphique NVIDIA, et hwmon sous Linux. Ceux du
      processeur et du boîtier restent illisibles sous Windows sans le logiciel
      du fabricant de la carte mère.
- [x] Suivi sur une minute : processeur, mémoire, carte graphique.
- [ ] macOS : les capteurs demandent `sudo powermetrics`.

## Déploiement

Vercel (`vercel.json`) : build Vite, sortie dans `dist/`. La CI GitHub Actions
lance les tests et le build à chaque push sur `main`.

## Application desktop

Electron (`electron/`) : la même page, servie en local, qui lance elle-même
les lectures de l'analyse au lieu de demander un copier-coller.

- `npm run app` : construit le site et ouvre l'application.
- `npm run app:dist` : installateur du système courant, dans `release/`.
- `npx electron . --smoke` : vérification rapide (page, lecture par le shell,
  analyse du matériel), utilisée aussi par la CI.
- Version : changer `version` dans `package.json`, puis pousser un tag
  `v0.x.y`. Le workflow `Desktop` construit les installateurs Windows, macOS
  et Linux et les joint à un brouillon de release GitHub, à publier à la main.
- Les installateurs ne sont pas encore signés : Windows SmartScreen et macOS
  Gatekeeper affichent un avertissement à la première ouverture.

## Stack

React 19 · Vite · styled-components · Vitest · oxlint · Electron

## Licence

MIT
