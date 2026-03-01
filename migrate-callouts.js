const fs = require("fs");
const path = require("path");

// ─── Configuração ────────────────────────────────────────────────────────────

const DOCS_DIR = path.resolve("packages/docs/docs"); // directório raiz dos docs
const IMPORT_LINE = `import { Callout } from 'fumadocs-ui/components/callout';`;

// Mapeamento dos tipos suportados pelo Fumadocs
// https://fumadocs.vercel.app/docs/ui/components/callout
const SUPPORTED_TYPES = ["info", "warn", "error", "tip", "note", "caution", "danger", "warning"];

// Normalização: alguns tipos do Docusaurus → tipo do Fumadocs
const TYPE_MAP = {
  tip: "tip",
  info: "info",
  note: "info",
  caution: "warn",
  warning: "warn",
  danger: "error",
  error: "error",
};

// ─── Funções auxiliares ──────────────────────────────────────────────────────

function getAllMdxFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) {
    console.error(`❌ Directório não encontrado: ${dir}`);
    console.error(`   Certifica-te que estás na raiz do projecto arkos.`);
    process.exit(1);
  }
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...getAllMdxFiles(fullPath));
    } else if (entry.name.endsWith(".mdx") || entry.name.endsWith(".md")) {
      results.push(fullPath);
    }
  }
  return results;
}

function convertCallouts(content) {
  // Regex que captura blocos :::tipo [título opcional] ... :::
  // Suporta múltiplas linhas dentro do bloco
  const calloutRegex = /^:::([\w]+)([^\n]*)\n([\s\S]*?)^:::/gm;

  let changed = false;
  const converted = content.replace(calloutRegex, (match, rawType, rawTitle, body) => {
    const type = rawType.trim().toLowerCase();
    const fumadocsType = TYPE_MAP[type];

    if (!fumadocsType) {
      // Tipo desconhecido — não altera
      console.warn(`   ⚠️  Tipo desconhecido ignorado: :::${type}`);
      return match;
    }

    changed = true;
    const title = rawTitle.trim();
    const titleAttr = title ? ` title="${title}"` : "";
    // Remove linha em branco extra no início/fim do corpo
    const trimmedBody = body.replace(/^\n/, "").replace(/\n$/, "");

    return `<Callout type="${fumadocsType}"${titleAttr}>\n${trimmedBody}\n</Callout>`;
  });

  return { converted, changed };
}

function ensureImport(content) {
  // Se o import já existir, não adiciona de novo
  if (content.includes(IMPORT_LINE)) return content;

  // Insere o import depois do frontmatter (bloco --- ... ---)
  const frontmatterRegex = /^(---[\s\S]*?---\n)/;
  const match = content.match(frontmatterRegex);

  if (match) {
    return content.replace(frontmatterRegex, `$1\n${IMPORT_LINE}\n`);
  }

  // Sem frontmatter: insere no início
  return `${IMPORT_LINE}\n\n${content}`;
}

function processFile(filePath, dryRun) {
  const original = fs.readFileSync(filePath, "utf-8");
  const { converted, changed } = convertCallouts(original);

  if (!changed) return false;

  const withImport = ensureImport(converted);

  const relPath = path.relative(process.cwd(), filePath);

  if (dryRun) {
    console.log(`\n📄 ${relPath}  [dry-run — não modificado]`);
    // Mostra um diff simples
    const originalLines = original.split("\n");
    const newLines = withImport.split("\n");
    newLines.forEach((line, i) => {
      if (line !== originalLines[i]) {
        console.log(`  + ${line}`);
      }
    });
  } else {
    fs.writeFileSync(filePath, withImport, "utf-8");
    console.log(`  ✅ ${relPath}`);
  }

  return true;
}

// ─── Ponto de entrada ────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const fileIdx = args.indexOf("--file");
  const singleFile = fileIdx !== -1 ? args[fileIdx + 1] : null;

  console.log("🔄 Migração Docusaurus → Fumadocs Callouts");
  console.log("==========================================");
  if (dryRun) console.log("⚠️  Modo dry-run activado — nenhum ficheiro será modificado\n");

  const files = singleFile ? [path.resolve(singleFile)] : getAllMdxFiles(DOCS_DIR);

  console.log(`📁 ${files.length} ficheiros encontrados em ${singleFile ? "caminho especificado" : DOCS_DIR}\n`);

  let modifiedCount = 0;

  for (const file of files) {
    const wasModified = processFile(file, dryRun);
    if (wasModified) modifiedCount++;
  }

  console.log("\n==========================================");
  if (dryRun) {
    console.log(`📋 ${modifiedCount} ficheiro(s) seriam modificados.`);
  } else {
    console.log(`✅ Migração concluída! ${modifiedCount} ficheiro(s) modificado(s).`);
    if (modifiedCount > 0) {
      console.log("\n📌 Próximos passos:");
      console.log("  1. Revê as alterações com: git diff");
      console.log("  2. Testa o projecto com: npm run dev");
      console.log("  3. Faz commit: git commit -am 'docs: migrate callouts to fumadocs Callout component'");
      console.log("  4. Faz push e abre um Pull Request para o repositório original");
    }
  }
}

main();
