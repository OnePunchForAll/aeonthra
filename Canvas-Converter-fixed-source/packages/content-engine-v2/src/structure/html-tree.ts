type HtmlAstNode = {
  tagName: string;
  attrs: Record<string, string>;
  children: HtmlAstNode[];
  textParts: string[];
  parent: HtmlAstNode | null;
};

const VOID_TAGS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"
]);

function parseAttributes(token: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const attrText = token
    .replace(/^<\/?[a-z0-9:-]+\s*/i, "")
    .replace(/\/?>$/, "")
    .trim();
  const attrPattern = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  for (const match of attrText.matchAll(attrPattern)) {
    const name = match[1]?.toLowerCase();
    const value = match[2] ?? match[3] ?? match[4] ?? "";
    if (name) {
      attrs[name] = value;
    }
  }
  return attrs;
}

export function parseHtmlTree(html: string): HtmlAstNode {
  const root: HtmlAstNode = {
    tagName: "document",
    attrs: {},
    children: [],
    textParts: [],
    parent: null
  };
  const stack: HtmlAstNode[] = [root];
  const tokens = html.match(/<!--[\s\S]*?-->|<\/?[^>]+>|[^<]+/g) ?? [];

  for (const token of tokens) {
    if (!token || token.startsWith("<!--")) {
      continue;
    }
    if (token.startsWith("</")) {
      const closingTag = token.replace(/^<\//, "").replace(/>$/, "").trim().toLowerCase();
      while (stack.length > 1) {
        const current = stack.pop();
        if (current?.tagName === closingTag) {
          break;
        }
      }
      continue;
    }
    if (token.startsWith("<")) {
      const openMatch = token.match(/^<([a-zA-Z0-9:-]+)/);
      const tagName = openMatch?.[1]?.toLowerCase();
      if (!tagName) {
        continue;
      }
      const node: HtmlAstNode = {
        tagName,
        attrs: parseAttributes(token),
        children: [],
        textParts: [],
        parent: stack[stack.length - 1] ?? null
      };
      stack[stack.length - 1]?.children.push(node);
      const selfClosing = token.endsWith("/>") || VOID_TAGS.has(tagName);
      if (!selfClosing) {
        stack.push(node);
      }
      continue;
    }
    stack[stack.length - 1]?.textParts.push(token);
  }

  return root;
}

export function collectNodeText(node: HtmlAstNode): string {
  return [
    ...node.textParts,
    ...node.children.map((child) => collectNodeText(child))
  ].join(" ");
}

export function walkHtmlTree(
  node: HtmlAstNode,
  visitor: (node: HtmlAstNode) => void
): void {
  visitor(node);
  node.children.forEach((child) => walkHtmlTree(child, visitor));
}

export type { HtmlAstNode };
