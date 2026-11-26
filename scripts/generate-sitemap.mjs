#!/usr/bin/env node
/*
 * Генерация sitemap.xml для https://vmesteproshe.github.io/
 *
 * Запуск: node scripts/generate-sitemap.mjs
 * Параметры подключения: SUPABASE_URL и SUPABASE_ANON_KEY из окружения,
 * при их отсутствии — из локального config.js (файл не изменяется).
 * Зависимостей и npm-пакетов нет: используются только встроенные модули Node.js.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SITE_URL = "https://vmesteproshe.github.io";
const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PAGE_SIZE = 1000;

// Статические страницы указываем только если соответствующий файл есть в репозитории.
const STATIC_PAGES = [
  { file: "index.html", path: "/" },
  { file: "about.html", path: "/about.html" },
  { file: "calculator.html", path: "/calculator.html" },
  { file: "templates.html", path: "/templates.html" }
];

function readConfigFile() {
  const source = readFileSync(join(PROJECT_ROOT, "config.js"), "utf8");
  const value = (name) => {
    const match = source.match(new RegExp(name + "\\s*:\\s*([\"'])([\\s\\S]*?)\\1"));
    return match ? match[2].trim() : "";
  };
  return { url: value("SUPABASE_URL"), key: value("SUPABASE_ANON_KEY") };
}

function getCredentials() {
  let fromConfig = { url: "", key: "" };
  try {
    fromConfig = readConfigFile();
  } catch (error) {
    // Продолжаем: значения могут быть заданы переменными окружения.
  }

  const url = String(process.env.SUPABASE_URL || fromConfig.url || "").trim();
  const key = String(process.env.SUPABASE_ANON_KEY || fromConfig.key || "").trim();

  if (!/^https?:\/\//i.test(url) || !key) {
    throw new Error(
      "Нужны SUPABASE_URL и SUPABASE_ANON_KEY (переменные окружения или config.js)."
    );
  }
  if (/YOUR-PROJECT|YOUR_SUPABASE|YOUR_ANON|PLACEHOLDER|PASTE_/i.test(url + " " + key)) {
    throw new Error("В SUPABASE_URL / SUPABASE_ANON_KEY остались значения-заглушки.");
  }

  return { url: url.replace(/\/+$/, ""), key };
}

async function fetchPublishedPosts({ url, key }) {
  const now = new Date();
  const scheduleFilter = `(publish_at.is.null,publish_at.lte.${now.toISOString()})`;
  const posts = [];

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const params = new URLSearchParams({
      select: "id,created_at,publish_at,updated_at",
      status: "eq.published",
      or: scheduleFilter,
      order: "created_at.desc",
      limit: String(PAGE_SIZE),
      offset: String(offset)
    });

    const response = await fetch(`${url}/rest/v1/posts?${params.toString()}`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Accept: "application/json"
      },
      signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Supabase REST вернул ${response.status}: ${detail.slice(0, 300)}`);
    }

    const batch = await response.json();
    if (!Array.isArray(batch)) throw new Error("Supabase REST вернул не массив статей.");
    posts.push(...batch);
    if (batch.length < PAGE_SIZE) break;
  }

  // Повторная проверка на всякий случай: RLS и фильтр запроса должны делать то же самое.
  return posts.filter((post) => {
    if (!post || !post.id) return false;
    if (!post.publish_at) return true;
    const time = new Date(post.publish_at).getTime();
    return !Number.isFinite(time) || time <= now.getTime();
  });
}

function formatLastmod(post, fallbackDate) {
  const values = [post.updated_at, post.publish_at, post.created_at];
  for (const value of values) {
    if (!value) continue;
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 10);
  }
  return fallbackDate;
}

function xmlEscape(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildSitemap(entries) {
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
  ];

  for (const entry of entries) {
    lines.push("  <url>");
    lines.push(`    <loc>${xmlEscape(entry.loc)}</loc>`);
    if (entry.lastmod) lines.push(`    <lastmod>${entry.lastmod}</lastmod>`);
    lines.push("  </url>");
  }

  lines.push("</urlset>", "");
  return lines.join("\n");
}

async function main() {
  const credentials = getCredentials();
  const posts = await fetchPublishedPosts(credentials);
  const today = new Date().toISOString().slice(0, 10);

  const staticEntries = STATIC_PAGES
    .filter((page) => existsSync(join(PROJECT_ROOT, page.file)))
    .map((page) => ({ loc: SITE_URL + page.path, lastmod: "" }));

  const postEntries = posts
    .map((post) => ({
      loc: `${SITE_URL}/?post=${encodeURIComponent(post.id)}`,
      lastmod: formatLastmod(post, today)
    }))
    .sort((a, b) => b.lastmod.localeCompare(a.lastmod) || a.loc.localeCompare(b.loc));

  const sitemap = buildSitemap(staticEntries.concat(postEntries));
  writeFileSync(join(PROJECT_ROOT, "sitemap.xml"), sitemap, "utf8");
  console.log(
    `sitemap.xml создан: статических страниц — ${staticEntries.length}, статей — ${postEntries.length}.`
  );
}

main().catch((error) => {
  console.error("Не удалось сгенерировать sitemap.xml:", error.message);
  process.exitCode = 1;
});
