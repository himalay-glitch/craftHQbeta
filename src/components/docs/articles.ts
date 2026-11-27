import type { MarkdownInstance } from "astro";

// The Docs articles (Shubham, 26 Nov): the live site's Guide, word for word (docs/CRAFTHQ_DOCS_SPEC.md). One Markdown
// file per article in src/content/docs/, and its file name is its address: statuses.md is /docs/statuses. At the top
// of each file: its name in the Articles list (`title`), the page's heading (`h1`), the read time (`minutes`), the line
// on the Previous/Next cards (`summary`) and its place in the list (`order`). Below that: the intro, then one `## `
// heading per section. This file cuts each rendered article into those parts for GuidePage.astro, so the words stay
// in the Markdown and editing an article never means touching a component.

export interface DocSection {
  /** The section's link, made from its heading's words, number included: "1. Before your first story" is
   *  #1-before-your-first-story. Anything can link straight to one: /docs/statuses#7-who-moves-what. */
  id: string;
  /** The heading's words, for "On this page". */
  title: string;
  /** The heading as Markdown rendered it (it could hold inline code or emphasis). */
  headingHtml: string;
  /** Everything under the heading, up to the next one. */
  html: string;
}

export interface DocArticle {
  /** Its address under /docs: the file name. */
  slug: string;
  title: string;
  h1: string;
  minutes: number;
  summary: string;
  order: number;
  /** The intro: everything above the first section. */
  lede: string;
  sections: DocSection[];
}

type ArticleFile = MarkdownInstance<Record<string, unknown>>;

const files = import.meta.glob<ArticleFile>("/src/content/docs/*.md", { eager: true });

/** The live site's ids (spec §2): lowercase, punctuation dropped, each run of spaces and hyphens one hyphen. */
export const sectionId = (words: string) =>
  words
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/[\s-]+/g, "-")
    .replace(/^-|-$/g, "");

/** A heading's HTML as plain words: tags dropped, the entities Markdown writes turned back into characters. */
const plain = (html: string) =>
  html
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .trim();

function field<T extends string | number>(file: string, data: Record<string, unknown>, key: string, type: "string" | "number"): T {
  const value = data[key];
  if (typeof value !== type || (typeof value === "string" && !value.trim())) {
    throw new Error(`src/content/docs/${file}: the front matter needs \`${key}\` (a ${type}).`);
  }
  return value as T;
}

async function read(path: string, file: ArticleFile): Promise<DocArticle> {
  const name = path.slice(path.lastIndexOf("/") + 1);
  const data = file.frontmatter;
  // A table wider than the column scrolls inside its own box, not the page (guide.css).
  const html = (await file.compiledContent())
    .replace(/<table>/g, '<div class="guide-table"><table>')
    .replace(/<\/table>/g, "</table></div>");

  // One section per `## ` heading. Markdown's own ids are set aside for the live site's: it doubles the hyphen
  // where a dash stood ("2-thinking--new-and-planning" against "2-thinking-new-and-planning").
  const headings = [...html.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/g)];
  const taken = new Set<string>();
  const sections = headings.map((heading, i): DocSection => {
    const headingHtml = (heading[1] ?? "").trim();
    const title = plain(headingHtml);
    const base = sectionId(title);
    let id = base;
    for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
    taken.add(id);
    const start = heading.index + heading[0].length;
    const end = headings[i + 1]?.index ?? html.length;
    return { id, title, headingHtml, html: html.slice(start, end).trim() };
  });

  return {
    slug: name.replace(/\.md$/, ""),
    title: field(name, data, "title", "string"),
    h1: field(name, data, "h1", "string"),
    minutes: field(name, data, "minutes", "number"),
    summary: field(name, data, "summary", "string"),
    order: field(name, data, "order", "number"),
    lede: html.slice(0, headings[0]?.index ?? html.length).trim(),
    sections,
  };
}

let loaded: Promise<DocArticle[]> | undefined;

/** Every article, in their `order`. */
export function loadArticles(): Promise<DocArticle[]> {
  loaded ??= Promise.all(Object.entries(files).map(([path, file]) => read(path, file))).then((list) =>
    list.sort((a, b) => a.order - b.order),
  );
  return loaded;
}
