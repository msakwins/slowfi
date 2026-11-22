// ─────────────────────────────────────────────────────────────────────────────
// Historique en ligne, chiffré dans le navigateur.
//
// Un code privé (« slow-7KQ4-M2XP-… ») donne deux choses, par empreinte :
// - un identifiant, seul connu du serveur, pour ranger le coffre ;
// - une clé AES-GCM, qui ne quitte jamais l'appareil.
// Le serveur ne reçoit que des données chiffrées : sans le code, ni Slowfi ni
// personne ne peut les lire. Perdre le code, c'est perdre l'historique.
// ─────────────────────────────────────────────────────────────────────────────

// Alphabet sans lettres ambiguës (pas de I, L, O, U).
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

const subtle = () => globalThis.crypto.subtle;
const encoder = new TextEncoder();

/** Nouveau code privé : 80 bits de hasard, en quatre groupes de quatre. */
export function newCode() {
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(10));
  let bits = "";
  for (const b of bytes) bits += b.toString(2).padStart(8, "0");
  let chars = "";
  for (let i = 0; i < 80; i += 5)
    chars += ALPHABET[parseInt(bits.slice(i, i + 5), 2)];
  return `slow-${chars.match(/.{4}/g).join("-")}`;
}

/** Code saisi → forme canonique, ou null s'il ne ressemble pas à un code. */
export function normalizeCode(input) {
  const raw = String(input ?? "")
    .toUpperCase()
    .replace(/^SLOW-?/, "")
    .replace(/[^0-9A-Z]/g, "")
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1");
  if (raw.length !== 16 || [...raw].some((c) => !ALPHABET.includes(c)))
    return null;
  return `slow-${raw.match(/.{4}/g).join("-")}`;
}

async function digest(text) {
  return new Uint8Array(await subtle().digest("SHA-256", encoder.encode(text)));
}

const hex = (bytes) =>
  [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");

/** Identifiant du coffre sur le serveur (ne permet pas de retrouver le code). */
export async function vaultId(code) {
  return hex(await digest(`slowfi-id:${code}`)).slice(0, 40);
}

async function vaultKey(code) {
  return subtle().importKey(
    "raw",
    await digest(`slowfi-key:${code}`),
    "AES-GCM",
    false,
    ["encrypt", "decrypt"],
  );
}

const toBase64 = (bytes) => {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
};
const fromBase64 = (text) =>
  Uint8Array.from(atob(text), (c) => c.charCodeAt(0));

/** Objet → texte chiffré (« iv.données », en base64). */
export async function seal(code, value) {
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const data = await subtle().encrypt(
    { name: "AES-GCM", iv },
    await vaultKey(code),
    encoder.encode(JSON.stringify(value)),
  );
  return `${toBase64(iv)}.${toBase64(new Uint8Array(data))}`;
}

/** Texte chiffré → objet ; rejette si le code ne correspond pas. */
export async function open(code, sealed) {
  const [iv, data] = String(sealed).split(".");
  const plain = await subtle().decrypt(
    { name: "AES-GCM", iv: fromBase64(iv) },
    await vaultKey(code),
    fromBase64(data),
  );
  return JSON.parse(new TextDecoder().decode(plain));
}

/** Fusion de deux historiques : un relevé par date, le plus récent en tête. */
export function mergeHistories(a, b, max = 50) {
  const byTime = new Map();
  for (const s of [...(a ?? []), ...(b ?? [])]) byTime.set(s.t, s);
  return [...byTime.values()].sort((x, y) => y.t - x.t).slice(0, max);
}
