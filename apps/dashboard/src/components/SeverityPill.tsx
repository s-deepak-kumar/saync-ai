interface SeverityPillProps {
  severity: "critical" | "high" | "medium" | "low";
  className?: string;
}

export default function SeverityPill({ severity, className = "" }: SeverityPillProps) {
  const colors = {
    critical: "bg-red-100 text-red-800 border-red-200",
    high: "bg-orange-100 text-orange-800 border-orange-200",
    medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
    low: "bg-blue-100 text-blue-800 border-blue-200",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${colors[severity]} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {severity.charAt(0).toUpperCase() + severity.slice(1)}
    </span>
  );
}

// Made with Bob
