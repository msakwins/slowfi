// ─────────────────────────────────────────────────────────────────────────────
// Page « Confidentialité et mentions légales ». Dit précisément ce qui sort du
// navigateur (le test de débit, vers Cloudflare) et ce qui n'en sort pas (tout
// ce qui est collé dans les analyses). À tenir à jour si un service tiers
// (statistiques, polices, API) est ajouté un jour.
// ─────────────────────────────────────────────────────────────────────────────
import React from "react";
import styled from "styled-components";
import { Title, Lead } from "../ui/theme.js";
import { useLang } from "../ui/i18n.jsx";

const Body = styled.div`
  color: #94a3b8;
  font-size: 15px;
  line-height: 1.8;
  max-width: 62ch;

  h2 {
    margin: 40px 0 8px;
    font-size: 12px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    font-weight: 600;
    color: #64748b;
  }
  p {
    margin: 0;
  }
  p + p {
    margin-top: 10px;
  }
  code {
    font-family: ui-monospace, "SFMono-Regular", Menlo, monospace;
    font-size: 0.85em;
    color: #67e8f9;
  }
  strong {
    color: #e2e8f0;
    font-weight: 600;
  }
  a {
    color: #22d3ee;
    text-decoration: none;
  }
  a:hover {
    text-decoration: underline;
  }
`;

// Une version par langue plutôt qu'une table de phrases : le texte juridique
// se relit d'un bloc, et ses deux versions n'ont pas à suivre la même découpe.
export default function Legal() {
  return useLang().lang === "en" ? <LegalEn /> : <LegalFr />;
}

const SOURCE = "https://github.com/msakwins/slowfi";

function LegalEn() {
  return (
    <>
      <Title>Privacy and legal notice</Title>
      <Lead>
        No account, no cookies, no audience tracking. The analyses run in the
        browser
      </Lead>

      <Body>
        <h2>Connection test</h2>
        <p>
          The speed test downloads and uploads test data to{" "}
          <strong>Cloudflare</strong> servers (speed.cloudflare.com). As with
          any connection to a website, Cloudflare receives the IP address and
          browser type. No result is sent to Slowfi
        </p>
        <p>
          The results are kept in this browser&apos;s storage to build the test
          history. They never leave the device, and the “Clear history” button
          deletes them
        </p>

        <h2>Local network and hardware analyses</h2>
        <p>
          The pasted text (output of the Windows or macOS commands) is read by
          the browser, on the device. It is not sent to any server and
          disappears when the page is closed
        </p>
        <p>
          The suggested commands only read information: they change no settings
        </p>

        <h2>Fixes</h2>
        <p>
          Fixes are given for guidance only. Any changes (firmware or BIOS
          updates, router settings) remain the responsibility of the person
          making them
        </p>

        <h2>Source code</h2>
        <p>
          The code is public and can be reviewed on{" "}
          <a href={SOURCE} target="_blank" rel="noreferrer">
            GitHub
          </a>
          , under the MIT licence
        </p>

        <h2>Publisher</h2>
        <p>
          Site published by a private individual, on a non-professional basis.
          In accordance with article 6, III, 2 of the French law of 21 June 2004
          (LCEN), their identity has been provided to the host
        </p>

        <h2>Hosting</h2>
        <p>
          Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, United States
          <br />
          vercel.com
        </p>
      </Body>
    </>
  );
}

function LegalFr() {
  return (
    <>
      <Title>Confidentialité et mentions légales</Title>
      <Lead>
        Aucun compte, aucun cookie, aucun outil de mesure d'audience. Les
        analyses s'exécutent dans le navigateur
      </Lead>

      <Body>
        <h2>Test de connexion</h2>
        <p>
          Le test de débit télécharge et envoie des données de test vers les
          serveurs de <strong>Cloudflare</strong> (speed.cloudflare.com). Comme
          pour toute connexion à un site, Cloudflare reçoit l'adresse IP et le
          type de navigateur. Aucun résultat n'est transmis à Slowfi
        </p>
        <p>
          Les résultats sont gardés dans le stockage de ce navigateur pour
          constituer l'historique des tests. Ils ne quittent jamais l'appareil,
          et le bouton « Effacer l'historique » les supprime
        </p>

        <h2>Analyses du réseau local et du matériel</h2>
        <p>
          Le texte collé (résultat des commandes Windows ou macOS) est lu par le
          navigateur, sur l'appareil. Il n'est envoyé à aucun serveur et
          disparaît à la fermeture de la page
        </p>
        <p>
          Les commandes proposées se contentent de lire des informations : elles
          ne modifient aucun réglage
        </p>

        <h2>Correctifs</h2>
        <p>
          Les correctifs sont donnés à titre indicatif. Les manipulations (mise
          à jour de firmware, de BIOS, réglages de la box) restent sous la
          responsabilité de la personne qui les effectue
        </p>

        <h2>Code source</h2>
        <p>
          Le code est public et vérifiable sur{" "}
          <a href={SOURCE} target="_blank" rel="noreferrer">
            GitHub
          </a>
          , sous licence MIT
        </p>

        <h2>Éditeur</h2>
        <p>
          Site édité par un particulier, à titre non professionnel. Conformément
          à l'article 6, III, 2 de la loi du 21 juin 2004 (LCEN), son identité
          est communiquée à l'hébergeur
        </p>

        <h2>Hébergement</h2>
        <p>
          Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis
          <br />
          vercel.com
        </p>
      </Body>
    </>
  );
}
