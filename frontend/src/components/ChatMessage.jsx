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
        <strong key={index} className={isUser ? "font-semibold text-white" : "font-semibold text-primary"}>
          {bold[1]}
        </strong>
      );
    }

    const inlineCode = part.match(/^`([^`]+)`$/);
    if (inlineCode) {
      return (
        <code
          key={index}
          className={`rounded px-1.5 py-0.5 font-mono text-[12px] ${
            isUser ? "bg-white/20 text-white" : "bg-slate-200/80 text-slate-800"
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
          className={`underline underline-offset-2 break-all ${
            isUser ? "text-white" : "text-accent"
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
          className={`underline underline-offset-2 break-all ${
            isUser ? "text-white" : "text-accent"
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
    <div className="overflow-hidden rounded-xl border border-slate-700 bg-[#0f172a] text-slate-100 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-700 px-3 py-1.5 text-[11px] uppercase tracking-wide text-slate-300">
        <span>{language || "bash"}</span>
        <span className="text-slate-500">commande</span>
      </div>
      <pre className="overflow-x-auto px-3 py-3 font-mono text-[12px] leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export default function ChatMessage({ content, role }) {
  const isUser = role === "user";
  const blocks = parseBlocks(content);

  return (
    <div
      className={`max-w-3xl rounded-2xl px-4 py-3 text-sm leading-relaxed ${
        isUser ? "ml-auto bg-accent text-white" : "bg-surface text-slate-700"
      }`}
    >
      <div className="space-y-3">
        {blocks.map((block, index) => {
          if (block.type === "code") {
            return <CodeBlock key={index} language={block.language} code={block.code} />;
          }

          if (block.type === "heading") {
            return (
              <p key={index} className={`font-semibold ${isUser ? "text-white" : "text-primary"}`}>
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
              <div key={index} className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="min-w-full text-left text-xs text-slate-700">
                  <thead className="bg-primary/95 text-white">
                    <tr>
                      {block.headers.map((header, headerIndex) => (
                        <th key={headerIndex} className="px-3 py-2 font-semibold whitespace-nowrap">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, rowIndex) => (
                      <tr key={rowIndex} className={rowIndex % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                        {block.headers.map((_, cellIndex) => (
                          <td key={cellIndex} className="px-3 py-2 align-top border-t border-slate-100">
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
