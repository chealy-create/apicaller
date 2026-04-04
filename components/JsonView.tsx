"use client";

import { useState, useMemo } from "react";

interface JsonViewProps {
  data: unknown;
}

function tokenizeJson(
  jsonString: string
): Array<{ type: string; value: string }> {
  const tokens: Array<{ type: string; value: string }> = [];
  let i = 0;

  while (i < jsonString.length) {
    const char = jsonString[i];

    // Whitespace and structural characters
    if (/\s/.test(char)) {
      let ws = "";
      while (i < jsonString.length && /\s/.test(jsonString[i])) {
        ws += jsonString[i];
        i++;
      }
      tokens.push({ type: "whitespace", value: ws });
      continue;
    }

    if (char === "{" || char === "[") {
      tokens.push({ type: "bracket", value: char });
      i++;
      continue;
    }

    if (char === "}" || char === "]") {
      tokens.push({ type: "bracket", value: char });
      i++;
      continue;
    }

    if (char === ":" || char === ",") {
      tokens.push({ type: "punctuation", value: char });
      i++;
      continue;
    }

    // Strings
    if (char === '"') {
      let str = '"';
      i++;
      while (i < jsonString.length) {
        str += jsonString[i];
        if (jsonString[i] === '"' && jsonString[i - 1] !== "\\") {
          i++;
          break;
        }
        i++;
      }

      // Check if this is a key (followed by :) or a value
      let j = i;
      while (j < jsonString.length && /\s/.test(jsonString[j])) {
        j++;
      }
      const isKey =
        j < jsonString.length && jsonString[j] === ":" ? "key" : "string";

      tokens.push({ type: isKey, value: str });
      continue;
    }

    // Numbers, booleans, null
    if (/[\d\-tf]/.test(char)) {
      let token = "";
      while (
        i < jsonString.length &&
        /[\d\-.\w]/.test(jsonString[i])
      ) {
        token += jsonString[i];
        i++;
      }

      if (token === "true" || token === "false") {
        tokens.push({ type: "boolean", value: token });
      } else if (token === "null") {
        tokens.push({ type: "null", value: token });
      } else {
        tokens.push({ type: "number", value: token });
      }
      continue;
    }

    i++;
  }

  return tokens;
}

export default function JsonView({ data }: JsonViewProps) {
  const [copied, setCopied] = useState(false);

  const jsonString = JSON.stringify(data, null, 2);
  const tokens = useMemo(() => tokenizeJson(jsonString), [jsonString]);

  const lineCount = jsonString.split("\n").length;
  const sizeKB = (new Blob([jsonString]).size / 1024).toFixed(2);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const getColorClass = (type: string): string => {
    switch (type) {
      case "key":
        return "text-gray-700 font-semibold";
      case "string":
        return "text-green-600";
      case "number":
        return "text-blue-600";
      case "boolean":
        return "text-purple-600";
      case "null":
        return "text-gray-500";
      case "punctuation":
        return "text-gray-500";
      default:
        return "text-gray-900";
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="text-sm text-gray-600">
          <span className="font-medium">{lineCount}</span> lines •{" "}
          <span className="font-medium">{sizeKB}</span> KB
        </div>
        <button
          onClick={handleCopy}
          className="px-3 py-1 bg-white border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50 transition-colors"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <pre className="flex-1 overflow-auto p-4 text-xs font-mono text-gray-900 bg-white whitespace-pre-wrap break-words">
        {tokens.map((token, idx) => (
          <span key={idx} className={getColorClass(token.type)}>
            {token.value}
          </span>
        ))}
      </pre>
    </div>
  );
}
