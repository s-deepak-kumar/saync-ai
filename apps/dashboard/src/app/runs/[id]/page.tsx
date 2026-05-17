import Link from "next/link";

interface PageProps {
  params: {
    id: string;
  };
}

interface LogEntry {
  id: string;
  timestamp: string;
  type: "pass" | "fail" | "warn" | "running";
  contract: string;
  action: string;
  detail: string;
}

export default function LiveRunPage({ params }: PageProps) {
  // Mock data for the live run
  const run = {
    id: params.id,
    title: "Full test suite",
    status: "running",
    progress: 18,
    total: 24,
    percentage: 75,
    currentViewport: "desktop",
  };

  const logEntries: LogEntry[] = [
    {
      id: "1",
      timestamp: "14:32:01",
      type: "pass",
      contract: "SayncButton.disabled",
      action: "Verified disabled state",
      detail: "Button correctly shows disabled styling and prevents clicks",
    },
    {
      id: "2",
      timestamp: "14:32:03",
      type: "pass",
      contract: "SayncButton.onClick",
      action: "Verified click handler",
      detail: "onClick callback fires correctly",
    },
    {
      id: "3",
      timestamp: "14:32:05",
      type: "fail",
      contract: "SayncButton.loading",
      action: "Verified loading state",
      detail: "Loading prop not passed to component",
    },
    {
      id: "4",
      timestamp: "14:32:07",
      type: "pass",
      contract: "Form.validation",
      action: "Verified form validation",
      detail: "Required fields show error messages",
    },
    {
      id: "5",
      timestamp: "14:32:09",
      type: "running",
      contract: "Modal.closeOnEscape",
      action: "Testing escape key behavior",
      detail: "Simulating escape key press...",
    },
  ];

  return (
    <div className="p-8">
      {/* Breadcrumb */}
      <div className="text-sm text-muted mb-4">
        <Link href="/" className="hover:text-ink">Projects</Link>
        <span className="mx-2">/</span>
        <Link href="/" className="hover:text-ink">Demo App</Link>
        <span className="mx-2">/</span>
        <span className="text-ink">Live Run</span>
      </div>

      {/* Page Header with Running Indicator */}
      <div className="flex items-center gap-4 mb-8">
        <h1 className="font-fraunces text-5xl font-medium tracking-tighter">
          {run.title}
        </h1>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 border border-green-200 rounded-full">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm font-medium text-green-800">Running</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted">
            {run.progress} of {run.total} contracts verified
          </span>
          <span className="font-mono text-sm font-medium">{run.percentage}%</span>
        </div>
        <div className="h-2 bg-background rounded-full overflow-hidden">
          <div
            className="h-full bg-terracotta transition-all duration-500"
            style={{ width: `${run.percentage}%` }}
          />
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-2 gap-8">
        {/* Left: Browser Preview */}
        <div>
          <h2 className="font-fraunces text-xl font-medium mb-4">Live Preview</h2>
          
          {/* Mock Browser Frame */}
          <div className="bg-card border border-border rounded-lg overflow-hidden shadow-lg">
            {/* Browser Chrome */}
            <div className="bg-slate-100 border-b border-border px-4 py-3 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <div className="flex-1 mx-4">
                <div className="bg-white border border-border rounded px-3 py-1 text-xs font-mono text-muted">
                  http://localhost:5173
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  className={`px-3 py-1 text-xs rounded ${
                    run.currentViewport === "desktop"
                      ? "bg-ink text-white"
                      : "bg-white border border-border text-muted"
                  }`}
                >
                  Desktop
                </button>
                <button
                  className={`px-3 py-1 text-xs rounded ${
                    run.currentViewport === "mobile"
                      ? "bg-ink text-white"
                      : "bg-white border border-border text-muted"
                  }`}
                >
                  Mobile
                </button>
              </div>
            </div>

            {/* Mock App Content */}
            <div className="bg-white p-8 min-h-[500px]">
              <div className="max-w-md mx-auto">
                <h1 className="text-2xl font-bold mb-6">Demo App</h1>
                
                <div className="space-y-4">
                  <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg">
                    <div className="text-sm text-gray-500 mb-2">Counter: 5</div>
                    
                    {/* Button with pulsing ring - currently being tested */}
                    <div className="relative inline-block">
                      <div className="absolute -inset-2 bg-terracotta/20 rounded-lg animate-pulse" />
                      <button className="relative bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
                        Increment
                      </button>
                      {/* Cursor indicator */}
                      <div className="absolute -right-6 top-1/2 -translate-y-1/2">
                        <svg
                          className="w-5 h-5 text-terracotta"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="text-xs text-gray-500 mb-2">Form Example</div>
                    <input
                      type="text"
                      placeholder="Enter text..."
                      className="w-full px-3 py-2 border border-gray-300 rounded mb-2"
                    />
                    <button className="bg-gray-200 text-gray-700 px-4 py-2 rounded text-sm">
                      Submit
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Activity Log */}
        <div>
          <h2 className="font-fraunces text-xl font-medium mb-4">Activity Log</h2>
          
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="max-h-[600px] overflow-y-auto">
              <div className="divide-y divide-border">
                {logEntries.map((entry) => (
                  <div key={entry.id} className="p-4 hover:bg-background/50 transition-colors">
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className="flex-shrink-0 mt-1">
                        {entry.type === "pass" && (
                          <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                            <svg
                              className="w-3 h-3 text-green-600"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </div>
                        )}
                        {entry.type === "fail" && (
                          <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center">
                            <svg
                              className="w-3 h-3 text-red-600"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </div>
                        )}
                        {entry.type === "warn" && (
                          <div className="w-5 h-5 rounded-full bg-yellow-100 flex items-center justify-center">
                            <span className="text-yellow-600 text-xs font-bold">!</span>
                          </div>
                        )}
                        {entry.type === "running" && (
                          <div className="w-5 h-5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-muted">
                            {entry.timestamp}
                          </span>
                          <span className="text-xs font-mono bg-background px-2 py-0.5 rounded">
                            {entry.contract}
                          </span>
                        </div>
                        <div className="font-medium text-sm mb-1">{entry.action}</div>
                        <div className="text-xs text-muted">{entry.detail}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Made with Bob
