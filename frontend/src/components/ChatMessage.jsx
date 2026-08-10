import { animate, utils } from "animejs";
import { useLayoutEffect, useRef } from "react";

import { DURATION, EASE, prefersReducedMotion } from "../motion";

function stripNoise(text) {
  const boldParts = [];
  let value = String(text || "").replace(/\*\*([^*]+)\*\*/g, (_, inner) => {
    const token = `__BOLD_${boldParts.length}__`;
    boldParts.push(inner);
    return token;
  });

  value = value
    .replace(/#{1,6}\s*/g, "")
    .replace(/[{}]/g, "")
    .replace(/\(\s*\)/g, "")
    .replace(/\*/g, "")
    .replace(/^\s*[•]\s+/, "")
    .trim();

  boldParts.forEach((inner, index) => {
    value = value.replace(`__BOLD_${index}__`, `**${inner}**`);
  });
  return value;
}

function renderInline(text, isUser) {
  const source = stripNoise(text);

  // Découpe : gras, liens markdown, URLs nues, code inline
  const tokenRegex =
    /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\((https?:\/\/[^)\s]+)\)|https?:\/\/[^\s)<]+)/g;
  const parts = source.split(tokenRegex).filter((part) => part !== undefined && part !== "");

  return parts.map((part, index) => {
    const bold = part.match(/^\*\*([^*]+)\*\*$/);
    if (bold) {
      return (
        <strong
          key={index}
          className={isUser ? "font-semibold text-on-primary" : "font-semibold text-primary"}
        >
          {bold[1]}
        </strong>
      );
    }

    const inlineCode = part.match(/^`([^`]+)`$/);
    if (inlineCode) {
      return (
        <code
          key={index}
          className={`rounded px-1.5 py-0.5 font-data-mono text-[12px] ${
            isUser
              ? "bg-on-primary/15 text-on-primary"
              : "bg-surface-container-lowest text-primary-container"
          }`}
        >
          {inlineCode[1]}
        </code>
      );
    }

    const mdLink = part.match(/^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/);
    if (mdLink) {
      return (
        <a
          key={index}
          href={mdLink[2]}
          target="_blank"
          rel="noreferrer"
          className={`break-all underline underline-offset-2 ${
            isUser ? "text-on-primary" : "text-primary-container"
          }`}
        >
          {mdLink[1]}
        </a>
      );
    }

    if (/^https?:\/\//.test(part)) {
      return (
        <a
          key={index}
          href={part.replace(/[.,;:!?)]+$/, "")}
          target="_blank"
          rel="noreferrer"
          className={`break-all underline underline-offset-2 ${
            isUser ? "text-on-primary" : "text-primary-container"
          }`}
        >
          {part.replace(/[.,;:!?)]+$/, "")}
        </a>
      );
    }

    return <span key={index}>{part}</span>;
  });
}

function isTableSeparator(line) {
  return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
}

function isTableRow(line) {
  return line.includes("|") && !isTableSeparator(line);
}

function parseTableRow(line) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => stripNoise(cell.trim().replace(/\*\*/g, "")));
}

function parseBlocks(content) {
  const lines = String(content || "").split("\n");
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    // Bloc de code ```bash ... ```
    const fence = trimmed.match(/^```(\w+)?\s*$/);
    if (fence) {
      const language = (fence[1] || "bash").toLowerCase();
      i += 1;
      const codeLines = [];
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i += 1;
      }
      if (i < lines.length && lines[i].trim().startsWith("```")) {
        i += 1;
      }
      blocks.push({ type: "code", language, code: codeLines.join("\n").trimEnd() });
      continue;
    }

    // Tableau markdown
    if (
      isTableRow(trimmed) &&
      i + 1 < lines.length &&
      isTableSeparator(lines[i + 1].trim())
    ) {
      const headers = parseTableRow(trimmed);
      i += 2;
      const rows = [];
      while (i < lines.length && isTableRow(lines[i].trim())) {
        rows.push(parseTableRow(lines[i]));
        i += 1;
      }
      blocks.push({ type: "table", headers, rows });
      continue;
    }

    if (isTableRow(trimmed) && trimmed.startsWith("|")) {
      const rows = [];
      while (i < lines.length && isTableRow(lines[i].trim())) {
        if (!isTableSeparator(lines[i].trim())) {
          rows.push(parseTableRow(lines[i]));
        }
        i += 1;
      }
      if (rows.length >= 2) {
        blocks.push({ type: "table", headers: rows[0], rows: rows.slice(1) });
      } else if (rows.length === 1) {
        blocks.push({ type: "paragraph", text: rows[0].join(" - ") });
      }
      continue;
    }

    if (/^(-|\d+\.)\s+/.test(trimmed)) {
      const items = [];
      while (i < lines.length && /^(-|\d+\.)\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^(-|\d+\.)\s+/, ""));
        i += 1;
      }
      blocks.push({ type: "list", items });
      continue;
    }

    if (/^#{1,6}\s+/.test(trimmed)) {
      blocks.push({ type: "heading", text: trimmed.replace(/^#{1,6}\s+/, "") });
      i += 1;
      continue;
    }

    if (/^-{3,}$/.test(trimmed)) {
      i += 1;
      continue;
    }

    blocks.push({ type: "paragraph", text: trimmed });
    i += 1;
  }

  return blocks;
}

function CodeBlock({ language, code }) {
  return (
    <div className="overflow-hidden rounded border border-outline-variant/50 bg-surface-container-lowest">
      <div className="flex items-center justify-between border-b border-outline-variant/30 px-sm py-1.5 font-label-caps text-label-caps uppercase text-on-surface-variant">
        <span>{language || "bash"}</span>
        <span className="text-outline">commande</span>
      </div>
      <pre className="overflow-x-auto px-sm py-sm font-data-mono text-[12px] leading-relaxed text-primary-container">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export default function ChatMessage({ content, role }) {
  const isUser = role === "user";
  const blocks = parseBlocks(content);
  const bubbleRef = useRef(null);

  // La bulle arrive du cote de son auteur : le fil de discussion reste lisible
  // même quand plusieurs réponses s'enchaînent.
  useLayoutEffect(() => {
    const bubble = bubbleRef.current;
    if (!bubble || prefersReducedMotion()) return;

    utils.set(bubble, { opacity: 0 });
    animate(bubble, {
      opacity: [0, 1],
      translateY: [10, 0],
      translateX: [isUser ? 16 : -16, 0],
      duration: DURATION.base,
      ease: EASE.out,
      onComplete: () => {
        bubble.style.removeProperty("opacity");
        bubble.style.removeProperty("transform");
      },
    });
  }, [isUser]);

  return (
    <div
      ref={bubbleRef}
      className={`max-w-3xl rounded px-md py-sm leading-relaxed ${
        isUser
          ? "ml-auto bg-primary-container text-on-primary"
          : "border border-outline-variant/30 bg-surface-container-low text-on-surface-variant"
      }`}
    >
      <div className="space-y-3">
        {blocks.map((block, index) => {
          if (block.type === "code") {
            return <CodeBlock key={index} language={block.language} code={block.code} />;
          }

          if (block.type === "heading") {
            return (
              <p
                key={index}
                className={`font-semibold ${isUser ? "text-on-primary" : "text-primary"}`}
              >
                {renderInline(block.text, isUser)}
              </p>
            );
          }

          if (block.type === "list") {
            return (
              <ul key={index} className="space-y-1.5">
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex} className="flex gap-2">
                    <span className="shrink-0">-</span>
                    <span>{renderInline(item, isUser)}</span>
                  </li>
                ))}
              </ul>
            );
          }

          if (block.type === "table") {
            return (
              <div
                key={index}
                className="overflow-x-auto rounded border border-outline-variant/30 bg-surface-container-lowest"
              >
                <table className="min-w-full text-left font-data-mono text-[12px] text-on-surface-variant">
                  <thead className="bg-surface-variant/40 text-on-surface">
                    <tr>
                      {block.headers.map((header, headerIndex) => (
                        <th key={headerIndex} className="whitespace-nowrap px-sm py-base font-semibold">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, rowIndex) => (
                      <tr key={rowIndex} className="border-t border-outline-variant/20">
                        {block.headers.map((_, cellIndex) => (
                          <td key={cellIndex} className="px-sm py-base align-top">
                            {row[cellIndex] || "-"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          }

          return <p key={index}>{renderInline(block.text, isUser)}</p>;
        })}
      </div>
    </div>
  );
}
