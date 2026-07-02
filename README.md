# Slowfi

Un diagnostiqueur de connexion Wi-Fi qui ne se contente pas de mesurer le débit :
il dit **quel composant coince** et **comment le réparer**.

L'utilisateur colle la sortie de `netsh wlan show interfaces` (Windows), l'app la
parse et produit un verdict lisible — bande, norme, signal, canal, débit réel
estimé, et la liste des problèmes avec leur correctif.

## Pourquoi

Les speed tests classiques (Speedtest, Fast.com) répondent à « combien ai-je de
débit ? ». Ils ne répondent pas à « pourquoi c'est lent et que faire ? ». C'est ce
trou que comble ce projet. Cas fondateur : un Wi-Fi coincé en 2,4 GHz qui plafonne
à ~55 Mbit/s au lieu de 355 en 5 GHz.

## Démarrer

```bash
npm install
npm run dev        # serveur de dev
npm run test       # tests en watch
npm run test:run   # tests une fois (CI)
npm run build      # build de production
```

## Architecture

Le projet sépare volontairement deux choses :

- `src/lib/diagnostic.js` — **le moteur**. Fonctions pures, zéro dépendance, zéro
  React, zéro réseau : `parseNetsh()`, `bandFromChannel()`, `diagnose()`. C'est là
  que vit l'expertise, sous forme de règles symptôme -> coupable -> correctif.
  C'est aussi la partie couverte par les tests.
- `src/components/DiagnoReseau.jsx` — **l'interface** (styled-components). Un simple
  habillage autour du moteur, remplaçable sans toucher à la logique.

Ajouter un cas de diagnostic = ajouter une règle dans `diagnose()` + un test dans
`src/lib/diagnostic.test.js`. Rien d'autre à modifier.

## Feuille de route

- [ ] Cas filaire : parser `Get-NetAdapter` et détecter un lien negocie a 100 Mbps
      (cable ou connecteur defaillant).
- [ ] Support macOS / Linux (les commandes systeme different).
- [ ] Test de debit reel via un petit backend Node (mesure de temps de
      telechargement) — ne se fait pas proprement en pur front.
- [ ] Version desktop (Tauri) capable de lancer `netsh` automatiquement, sans
      copier-coller manuel.

## Stack

React 19 · Vite · styled-components · Vitest

## Licence

MIT
