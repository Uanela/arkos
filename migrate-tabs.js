#!/usr/bin/env node

/**
 * migrate-tabs.js
 *
 * Converte a sintaxe de Tabs do Docusaurus para os componentes Tab/Tabs do Fumadocs.
 *
 * Uso:
 *   node migrate-tabs.js                  → processa todos os .md/.mdx em packages/docs/docs
 *   node migrate-tabs.js --dry-run        → mostra o que seria alterado sem modificar ficheiros
 *   node migrate-tabs.js --file caminho   → processa apenas um ficheiro específico
 *
 * Exemplo de conversão:
 *
 *   ANTES (Docusaurus):
 *   import Tabs from '@theme/Tabs';
 *   import TabItem from '@theme/TabItem';
 *
 *   <Tabs groupId="versao">
 *     <TabItem value="v1" label="Versão 1" default>
 *       Conteúdo aqui
 *     </TabItem>
 *   </Tabs>
 *
 *   DEPOIS (Fumadocs):
 *   import { Tab, Tabs } from 'fumadocs-ui/components/tabs';
 *
 *   <Tabs>
 *     <Tab value="v1" label="Versão 1">
 *       Conteúdo aqui
 *     </Tab>
 *   </Tabs>
 */

const fs = require("fs");
const path = require("path");

// ─── Configuração ────────────────────────────────────────────────────────────

const DOCS_DIR = path.resolve("packages/docs/docs");
const NEW_IMPORT = `import { Tab, Tabs } from 'fumadocs-ui/components/tabs';`;

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

function convertTabs(content) {
  let changed = false;

  // 1. Remove imports antigos do Docusaurus
  const hasOldImports =
    content.includes("from '@theme/Tabs'") ||
    content.includes("from '@theme/TabItem'") ||
    content.includes('from "@theme/Tabs"') ||
    content.includes('from "@theme/TabItem"');

  if (!hasOldImports && !content.includes("<TabItem")) {
    return { converted: content, changed: false };
  }

  let converted = content;

  // 2. Remove as duas linhas de import antigas (qualquer combinação de aspas)
  converted = converted.replace(/import Tabs from ['"]@theme\/Tabs['"];\r?\n/g, "");
  converted = converted.replace(/import TabItem from ['"]@theme\/TabItem['"];\r?\n/g, "");

  // 3. Substitui <TabItem ... > por <Tab ... > (abrindo)
  // Remove o atributo "default" que não existe no Fumadocs
  converted = converted.replace(/<TabItem(\s[^>]*)?\s+default(\s[^>]*)?>/g, (match, before, after) => {
    const attrs = ((before || "") + (after || "")).trim();
    return `<Tab ${attrs}>`.replace(/\s+>/, ">");
  });

  // Substitui restantes <TabItem ...> sem atributo default
  converted = converted.replace(/<TabItem/g, "<Tab");

  // 4. Substitui </TabItem> por </Tab>
  converted = converted.replace(/<\/TabItem>/g, "</Tab>");

  // 5. Remove o atributo groupId do <Tabs> (não existe no Fumadocs)
  converted = converted.replace(/<Tabs\s+groupId=["'][^"']*["']\s*>/g, "<Tabs>");
  converted = converted.replace(/<Tabs\s+groupId=["'][^"']*["']/g, "<Tabs");

  changed = converted !== content;

  return { converted, changed };
}

function ensureImport(content) {
  // Se o novo import já existir, não adiciona de novo
  if (content.includes(NEW_IMPORT)) return content;

  // Só adiciona se o ficheiro usa <Tab ou <Tabs
  if (!content.includes("<Tab") && !content.includes("<Tabs")) return content;

  // Insere depois do frontmatter
  const frontmatterRegex = /^(---[\s\S]*?---\r?\n)/;
  const match = content.match(frontmatterRegex);

  if (match) {
    return content.replace(frontmatterRegex, `$1\n${NEW_IMPORT}\n`);
  }

  return `${NEW_IMPORT}\n\n${content}`;
}

function processFile(filePath, dryRun) {
  const original = fs.readFileSync(filePath, "utf-8");
  const { converted, changed } = convertTabs(original);

  if (!changed) return false;

  const withImport = ensureImport(converted);
  const relPath = path.relative(process.cwd(), filePath);

  if (dryRun) {
    console.log(`\n📄 ${relPath}  [dry-run — não modificado]`);
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

  console.log("🔄 Migração Docusaurus Tabs → Fumadocs Tab/Tabs");
  console.log("================================================");
  if (dryRun) console.log("⚠️  Modo dry-run activado — nenhum ficheiro será modificado\n");

  const files = singleFile ? [path.resolve(singleFile)] : getAllMdxFiles(DOCS_DIR);

  console.log(`📁 ${files.length} ficheiros encontrados\n`);

  let modifiedCount = 0;

  for (const file of files) {
    const wasModified = processFile(file, dryRun);
    if (wasModified) modifiedCount++;
  }

  console.log("\n================================================");
  if (dryRun) {
    console.log(`📋 ${modifiedCount} ficheiro(s) seriam modificados.`);
  } else {
    console.log(`✅ Migração concluída! ${modifiedCount} ficheiro(s) modificado(s).`);
    if (modifiedCount > 0) {
      console.log("\n📌 Próximos passos:");
      console.log("  1. Revê as alterações com: git diff");
      console.log("  2. Faz commit: git commit -am 'docs: migrate Tabs/TabItem to fumadocs Tab/Tabs component'");
      console.log("  3. Faz push e abre um Pull Request para o repositório original");
    }
  }
}

main();
