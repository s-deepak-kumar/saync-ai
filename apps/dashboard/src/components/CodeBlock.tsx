interface CodeBlockProps {
  code: string;
  language?: string;
  highlightLines?: number[];
  variant?: "default" | "success";
}

export default function CodeBlock({
  code,
  language = "typescript",
  highlightLines = [],
  variant = "default",
}: CodeBlockProps) {
  const lines = code.trim().split("\n");

  const bgColor = variant === "success" ? "bg-green-950" : "bg-slate-900";
  const borderColor = variant === "success" ? "border-green-800" : "border-slate-800";

  return (
    <div className={`${bgColor} ${borderColor} border rounded-lg overflow-hidden`}>
      <div className="px-4 py-2 border-b border-slate-800 flex items-center justify-between">
        <span className="text-xs font-mono text-slate-400">{language}</span>
      </div>
      <div className="overflow-x-auto">
        <pre className="p-4">
          <code className="font-mono text-sm text-slate-100">
            {lines.map((line, index) => {
              const lineNumber = index + 1;
              const isHighlighted = highlightLines.includes(lineNumber);
              const highlightBg = variant === "success" ? "bg-green-900/30" : "bg-red-900/30";

              return (
                <div
                  key={index}
                  className={`${isHighlighted ? highlightBg : ""} -mx-4 px-4`}
                >
                  <span className="inline-block w-8 text-slate-600 select-none">
                    {lineNumber}
                  </span>
                  <span className="ml-4">{line}</span>
                </div>
              );
            })}
          </code>
        </pre>
      </div>
    </div>
  );
}

// Made with Bob
