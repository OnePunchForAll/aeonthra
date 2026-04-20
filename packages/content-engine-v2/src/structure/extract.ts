import type { StructuralNode, SourceDocument, TrustTier } from "../contracts/types.ts";
import { contentProfileScore, hasChromeSignal } from "../noise/rules.ts";
import { deterministicHash } from "../utils/stable.ts";
import { normalizeText, splitSentences } from "../utils/text.ts";
import { collectNodeText, parseHtmlTree, walkHtmlTree, type HtmlAstNode } from "./html-tree.ts";

const CHROME_CLASS_HINTS = [
  "course-menu",
  "discussion-sidebar",
  "discussion-toolbar",
  "footer",
  "header",
  "module-sequence-footer",
  "screenreader-only",
  "sr-only",
  "visually-hidden"
] as const;

const CHROME_TAGS = new Set(["aside", "button", "footer", "form", "input", "nav", "noscript", "script", "style"]);
const HEADING_TAGS = new Set(["h1", "h2", "h3", "h4", "h5", "h6"]);
const PARAGRAPH_TAGS = new Set(["p"]);
const LIST_ITEM_TAGS = new Set(["li"]);
const DEFINITION_TERM_TAGS = new Set(["dt"]);
const DEFINITION_DETAIL_TAGS = new Set(["dd"]);
const QUOTE_TAGS = new Set(["blockquote"]);
const CAPTION_TAGS = new Set(["figcaption"]);
const TABLE_CELL_TAGS = new Set(["td", "th"]);
const CODE_TAGS = new Set(["code", "pre"]);
const MATH_TAGS = new Set(["math"]);
const CANDIDATE_ROOT_TAGS = new Set(["article", "body", "div", "main", "section"]);

function attrText(node: HtmlAstNode): string {
  return Object.values(node.attrs).join(" ").toLowerCase();
}

function nodeIsHidden(node: HtmlAstNode): boolean {
  return Boolean(node.attrs.hidden)
    || node.attrs["aria-hidden"] === "true"
    || attrText(node).includes("screenreader-only")
    || attrText(node).includes("sr-only")
    || attrText(node).includes("visually-hidden");
}

function nodeLooksChrome(node: HtmlAstNode): boolean {
  if (CHROME_TAGS.has(node.tagName) || nodeIsHidden(node)) {
    return true;
  }
  const attrs = attrText(node);
  return CHROME_CLASS_HINTS.some((hint) => attrs.includes(hint));
}

function scoreRoot(node: HtmlAstNode): number {
  const text = normalizeText(collectNodeText(node));
  const signals = contentProfileScore(text);
  const density = Math.min(10, Math.floor(text.length / 120));
  const canvasBonus = attrText(node).includes("show-content") || attrText(node).includes("user_content") ? 5 : 0;
  const chromePenalty = signals.admin * 2 + (signals.hardNoise ? 6 : 0);
  return density + signals.academic * 3 + canvasBonus - chromePenalty;
}

function chooseContentRoot(root: HtmlAstNode): HtmlAstNode {
  const candidates: HtmlAstNode[] = [];
  walkHtmlTree(root, (node) => {
    if (CANDIDATE_ROOT_TAGS.has(node.tagName) && !nodeLooksChrome(node)) {
      candidates.push(node);
    }
  });
  if (candidates.length === 0) {
    return root;
  }
  return candidates
    .slice()
    .sort((left, right) => scoreRoot(right) - scoreRoot(left) || collectNodeText(right).length - collectNodeText(left).length)[0] ?? root;
}

function nodeKind(tagName: string): StructuralNode["kind"] | null {
  if (HEADING_TAGS.has(tagName)) return "heading";
  if (PARAGRAPH_TAGS.has(tagName)) return "paragraph";
  if (CODE_TAGS.has(tagName)) return "paragraph";
  if (MATH_TAGS.has(tagName)) return "paragraph";
  if (LIST_ITEM_TAGS.has(tagName)) return "list-item";
  if (DEFINITION_TERM_TAGS.has(tagName)) return "definition-term";
  if (DEFINITION_DETAIL_TAGS.has(tagName)) return "definition-detail";
  if (QUOTE_TAGS.has(tagName)) return "quote";
  if (CAPTION_TAGS.has(tagName)) return "caption";
  if (TABLE_CELL_TAGS.has(tagName)) return "table-cell";
  return null;
}

function headingLevel(tagName: string): number {
  return Number.parseInt(tagName.replace("h", ""), 10);
}

function trustTierForText(text: string): TrustTier {
  const signals = contentProfileScore(text);
  if ((signals.hardNoise || hasChromeSignal(text)) && signals.academic === 0) {
    return "rejected";
  }
  if (signals.academic > 0) {
    return "high";
  }
  if (signals.admin > 0) {
    return "low";
  }
  return "medium";
}

function nodeTextForExtraction(node: HtmlAstNode): string {
  const raw = collectNodeText(node).replace(/\r\n?/g, "\n");
  if (CODE_TAGS.has(node.tagName)) {
    return raw.trim();
  }
  if (MATH_TAGS.has(node.tagName)) {
    return raw.replace(/\s+/g, " ").trim();
  }
  return normalizeText(raw);
}

function buildStructuredPrelude(document: SourceDocument): StructuralNode[] {
  const nodes: StructuralNode[] = [];
  const trustTier = document.classification.titleTrust.state === "accepted" ? "high" : "low";
  nodes.push({
    id: `${document.item.id}:title`,
    sourceItemId: document.item.id,
    sourceKind: document.item.kind,
    kind: "structured-title",
    tagName: null,
    text: document.cleanedTitle,
    ordinalPath: [0],
    headingPath: document.cleanedTitle ? [document.cleanedTitle] : [],
    parentId: null,
    listDepth: 0,
    sourceField: "title",
    trustTier
  });
  if (document.item.moduleName || document.item.moduleKey) {
    nodes.push({
      id: `${document.item.id}:module`,
      sourceItemId: document.item.id,
      sourceKind: document.item.kind,
      kind: "structured-module",
      tagName: null,
      text: normalizeText(document.item.moduleName ?? document.item.moduleKey ?? ""),
      ordinalPath: [1],
      headingPath: document.cleanedTitle ? [document.cleanedTitle] : [],
      parentId: null,
      listDepth: 0,
      sourceField: document.item.moduleName ? "moduleName" : "moduleKey",
      trustTier: "medium"
    });
  }
  if (document.item.dueAt) {
    nodes.push({
      id: `${document.item.id}:dueAt`,
      sourceItemId: document.item.id,
      sourceKind: document.item.kind,
      kind: "structured-due-date",
      tagName: null,
      text: document.item.dueAt,
      ordinalPath: [2],
      headingPath: document.cleanedTitle ? [document.cleanedTitle] : [],
      parentId: null,
      listDepth: 0,
      sourceField: "dueAt",
      trustTier: document.classification.dateTrust.state === "accepted" ? "high" : "low"
    });
  }
  if (document.item.excerpt) {
    nodes.push({
      id: `${document.item.id}:excerpt`,
      sourceItemId: document.item.id,
      sourceKind: document.item.kind,
      kind: "excerpt",
      tagName: null,
      text: normalizeText(document.item.excerpt),
      ordinalPath: [3],
      headingPath: document.cleanedTitle ? [document.cleanedTitle] : [],
      parentId: null,
      listDepth: 0,
      sourceField: "excerpt",
      trustTier: document.classification.bodyTrust.state === "accepted" ? "medium" : "low"
    });
  }
  return nodes.filter((node) => Boolean(node.text));
}

function walkStructuredRoot(
  node: HtmlAstNode,
  sourceItemId: string,
  sourceKind: StructuralNode["sourceKind"],
  trail: number[],
  parentId: string | null,
  headingPath: string[],
  listDepth: number,
  listContainerTag: "ul" | "ol" | null,
  nodes: StructuralNode[]
): void {
  if (nodeLooksChrome(node)) {
    return;
  }

  let nextHeadingPath = headingPath.slice();
  const text = nodeTextForExtraction(node);
  const kind = nodeKind(node.tagName);
  const nodeId = `${sourceItemId}:${deterministicHash({ trail, tag: node.tagName })}`;

  if (kind && text) {
    if (kind === "heading") {
      const level = headingLevel(node.tagName);
      nextHeadingPath = nextHeadingPath.slice(0, Math.max(0, level - 1));
      nextHeadingPath[level - 1] = text;
    }
    const trustTier = trustTierForText(text);
    nodes.push({
      id: nodeId,
      sourceItemId,
      sourceKind,
      kind,
      tagName: node.tagName,
      text,
      ordinalPath: trail,
      headingPath: nextHeadingPath.filter(Boolean),
      parentId,
      listDepth,
      listContainerTag: kind === "list-item" ? listContainerTag : null,
      trustTier
    });
  }

  node.children.forEach((child, index) => {
    const nextListDepth = child.tagName === "ul" || child.tagName === "ol" ? listDepth + 1 : listDepth;
    const nextListContainerTag =
      child.tagName === "ul" || child.tagName === "ol"
        ? child.tagName
        : listContainerTag;
    walkStructuredRoot(
      child,
      sourceItemId,
      sourceKind,
      [...trail, index],
      kind ? nodeId : parentId,
      nextHeadingPath,
      nextListDepth,
      nextListContainerTag,
      nodes
    );
  });
}

function extractHtmlNodes(document: SourceDocument): StructuralNode[] {
  if (!document.item.html) {
    return [];
  }
  const root = parseHtmlTree(document.item.html);
  const contentRoot = chooseContentRoot(root);
  const nodes: StructuralNode[] = buildStructuredPrelude(document);
  walkStructuredRoot(contentRoot, document.item.id, document.item.kind, [10], null, document.item.headingTrail.slice(0, 6), 0, null, nodes);
  return nodes.filter((node) => node.text.length > 0);
}

function extractPlainTextNodes(document: SourceDocument): StructuralNode[] {
  const nodes: StructuralNode[] = buildStructuredPrelude(document);
  const headingPath = document.item.headingTrail.length > 0
    ? document.item.headingTrail.map((entry) => normalizeText(entry)).filter(Boolean)
    : document.cleanedTitle ? [document.cleanedTitle] : [];
  const paragraphs = document.cleanedText.split(/\n{2,}/).map((entry) => normalizeText(entry)).filter(Boolean);
  const blocks = paragraphs.length > 0 ? paragraphs : splitSentences(document.cleanedText);
  blocks.forEach((block, index) => {
    const lines = block.split(/\n+/).map((entry) => normalizeText(entry)).filter(Boolean);
    const isList = lines.length > 1 && lines.every((line) => /^[-*•\d]/.test(line) || line.length > 20);
    if (isList) {
      lines.forEach((line, lineIndex) => {
        nodes.push({
          id: `${document.item.id}:plain-list:${index}:${lineIndex}`,
          sourceItemId: document.item.id,
          sourceKind: document.item.kind,
          kind: "list-item",
          tagName: null,
          text: line.replace(/^[-*•\d.)\s]+/, "").trim(),
          ordinalPath: [20, index, lineIndex],
          headingPath,
          parentId: null,
          listDepth: 1,
          trustTier: trustTierForText(line)
        });
      });
      return;
    }
    nodes.push({
      id: `${document.item.id}:plain-paragraph:${index}`,
      sourceItemId: document.item.id,
      sourceKind: document.item.kind,
      kind: "paragraph",
      tagName: null,
      text: block,
      ordinalPath: [20, index],
      headingPath,
      parentId: null,
      listDepth: 0,
      trustTier: trustTierForText(block)
    });
  });
  return nodes.filter((node) => node.text.length > 0);
}

export function extractStructuralNodes(document: SourceDocument): StructuralNode[] {
  const htmlNodes = extractHtmlNodes(document)
    .filter((node) => !nodeLooksChrome({ tagName: node.tagName ?? "", attrs: {}, children: [], textParts: [node.text], parent: null }));
  const contentNodes = htmlNodes.filter((node) => node.kind !== "structured-title" && node.kind !== "excerpt");
  const preserveStructuredContexts = contentNodes.some((node) =>
    node.tagName === "pre"
    || node.tagName === "code"
    || node.tagName === "math"
    || (node.kind === "list-item" && Boolean(node.listContainerTag))
  );
  if (contentNodes.length >= 2 || preserveStructuredContexts) {
    return htmlNodes;
  }
  return extractPlainTextNodes(document);
}
