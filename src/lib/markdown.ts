import GithubSlugger from "github-slugger";
import { toString } from "mdast-util-to-string";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import html from "remark-html";
import { visit } from "unist-util-visit";
import type { Heading, Root } from "mdast";

export type TocItem = {
  id: string;
  text: string;
  depth: number;
};

function collectHeadings(markdown: string) {
  const tree = remark().parse(markdown) as Root;
  const slugger = new GithubSlugger();
  const toc: TocItem[] = [];

  visit(tree, "heading", (node: Heading) => {
    if (node.depth < 2 || node.depth > 3) {
      return;
    }

    const text = toString(node).trim();

    if (!text) {
      return;
    }

    toc.push({
      id: slugger.slug(text),
      text,
      depth: node.depth,
    });
  });

  return toc;
}

function addHeadingIds() {
  return (tree: Root) => {
    const slugger = new GithubSlugger();

    visit(tree, "heading", (node: Heading) => {
      if (node.depth < 2 || node.depth > 3) {
        return;
      }

      const text = toString(node).trim();

      if (!text) {
        return;
      }

      node.data ??= {};
      node.data.hProperties = {
        ...(node.data.hProperties ?? {}),
        id: slugger.slug(text),
      };
    });
  };
}

export async function markdownToHtml(markdown: string) {
  const result = await remark()
    .use(addHeadingIds)
    .use(remarkGfm)
    .use(html, { sanitize: false })
    .process(markdown);
  return result.toString();
}

export async function markdownToHtmlWithToc(markdown: string) {
  const [contentHtml, toc] = await Promise.all([
    markdownToHtml(markdown),
    Promise.resolve(collectHeadings(markdown)),
  ]);

  return { contentHtml, toc };
}
