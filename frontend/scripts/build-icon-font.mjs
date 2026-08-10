/**
 * Genere une police Material Symbols reduite aux seules icones utilisees.
 *
 * La police complete pese pres de 4 Mo ; le sous-ensemble tient en quelques
 * kilo-octets. A relancer apres l'ajout d'une nouvelle icone :
 *
 *   npm run icons
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "src");
const FONT_DIR = path.join(SRC, "assets");
const FONT_FILE = "material-symbols-subset.woff2";
const CSS_FILE = path.join(SRC, "styles", "material-symbols.css");

const CODEPOINTS_URL =
  "https://raw.githubusercontent.com/google/material-design-icons/master/variablefont/" +
  "MaterialSymbolsOutlined%5BFILL%2CGRAD%2Copsz%2Cwght%5D.codepoints";

// Les icones sont parfois choisies dynamiquement (ternaires, tables de
// correspondance) : on retient donc toute chaine litterale dont le nom
// correspond a une icone existante, quitte a embarquer quelques glyphes en
// trop plutot que d'en oublier un.
const STRING_PATTERN = /["'`]([a-z][a-z0-9_]*)["'`]/g;

async function collectSourceFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return collectSourceFiles(full);
      return entry.name.endsWith(".jsx") || entry.name.endsWith(".js") ? [full] : [];
    })
  );
  return files.flat();
}

async function fetchAvailableIcons() {
  const response = await fetch(CODEPOINTS_URL);
  if (!response.ok) {
    throw new Error(`Liste des icones indisponible (${response.status})`);
  }
  const text = await response.text();
  return new Set(text.split("\n").map((line) => line.split(" ")[0]).filter(Boolean));
}

async function collectIconNames(available) {
  const files = await collectSourceFiles(SRC);
  const names = new Set();
  for (const file of files) {
    const content = await fs.readFile(file, "utf8");
    for (const match of content.matchAll(STRING_PATTERN)) {
      if (available.has(match[1])) names.add(match[1]);
    }
  }
  return [...names].sort();
}

/** Detecte les `<Icon name="..." />` dont le nom n'existe pas : ils seraient
 *  rendus en toutes lettres a l'ecran. */
async function reportUnknownIcons(available) {
  const files = await collectSourceFiles(SRC);
  const unknown = new Set();
  for (const file of files) {
    const content = await fs.readFile(file, "utf8");
    for (const match of content.matchAll(/<Icon[^>]*?\bname="([a-z0-9_]+)"/g)) {
      if (!available.has(match[1])) unknown.add(`${match[1]} (${path.relative(ROOT, file)})`);
    }
  }
  if (unknown.size) {
    console.warn(`Icones inconnues : ${[...unknown].join(", ")}`);
  }
}

async function main() {
  const available = await fetchAvailableIcons();
  await reportUnknownIcons(available);
  const names = await collectIconNames(available);
  if (!names.length) {
    throw new Error("Aucune icone detectee dans src/.");
  }

  const cssUrl =
    "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" +
    `&icon_names=${names.join(",")}&display=block`;

  // Le user-agent conditionne le format renvoye par Google Fonts : celui-ci
  // garantit un woff2 avec la police variable.
  const cssResponse = await fetch(cssUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
    },
  });
  if (!cssResponse.ok) {
    throw new Error(`Google Fonts a repondu ${cssResponse.status}`);
  }
  const css = await cssResponse.text();

  // Les polices sous-ensemblees sont servies sans extension de fichier.
  const fontUrl = css.match(/url\((https:\/\/[^)]+)\)/)?.[1];
  if (!fontUrl) {
    throw new Error("Aucune URL woff2 trouvee dans la reponse Google Fonts.");
  }

  const font = Buffer.from(await (await fetch(fontUrl)).arrayBuffer());
  await fs.mkdir(FONT_DIR, { recursive: true });
  await fs.mkdir(path.dirname(CSS_FILE), { recursive: true });
  await fs.writeFile(path.join(FONT_DIR, FONT_FILE), font);

  await fs.writeFile(
    CSS_FILE,
    `/* Genere par scripts/build-icon-font.mjs - ne pas modifier a la main.
   ${names.length} icones : ${names.join(", ")} */
@font-face {
  font-family: "Material Symbols Outlined";
  font-style: normal;
  font-weight: 100 700;
  /* block : n'affiche jamais le nom de la ligature en clair. */
  font-display: block;
  src: url("../assets/${FONT_FILE}") format("woff2");
}

.material-symbols-outlined {
  font-family: "Material Symbols Outlined";
  font-weight: normal;
  font-style: normal;
  line-height: 1;
  letter-spacing: normal;
  text-transform: none;
  display: inline-block;
  white-space: nowrap;
  word-wrap: normal;
  direction: ltr;
  -webkit-font-smoothing: antialiased;
  font-feature-settings: "liga";
}
`,
    "utf8"
  );

  const kb = (font.length / 1024).toFixed(1);
  console.log(`${names.length} icones -> src/assets/${FONT_FILE} (${kb} ko)`);
}

main().catch((error) => {
  console.error(error.message, error.cause ? `(${error.cause})` : "");
  process.exit(1);
});
