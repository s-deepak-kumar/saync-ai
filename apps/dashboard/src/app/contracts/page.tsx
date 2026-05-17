import Link from "next/link";

interface Contract {
  id: string;
  name: string;
  component: string;
  checks: string[];
  status: "pass" | "fail" | "warn";
}

export default function ContractsPage() {
  // Mock data - in a real implementation, this would come from the registry
  const contracts: Contract[] = [
    {
      id: "1",
      name: "SayncButton.loading",
      component: "SayncButton",
      checks: ["state", "ui"],
      status: "fail",
    },
    {
      id: "2",
      name: "SayncButton.disabled",
      component: "SayncButton",
      checks: ["state", "ui"],
      status: "pass",
    },
    {
      id: "3",
      name: "SayncButton.onClick",
      component: "SayncButton",
      checks: ["api"],
      status: "pass",
    },
    {
      id: "4",
      name: "Form.validation",
      component: "Form",
      checks: ["state", "ui"],
      status: "pass",
    },
    {
      id: "5",
      name: "Modal.closeOnEscape",
      component: "Modal",
      checks: ["ui", "timing"],
      status: "pass",
    },
    {
      id: "6",
      name: "API.timeout",
      component: "APIClient",
      checks: ["api", "timing"],
      status: "fail",
    },
  ];

  const passCount = contracts.filter((c) => c.status === "pass").length;
  const failCount = contracts.filter((c) => c.status === "fail").length;
  const warnCount = contracts.filter((c) => c.status === "warn").length;

  return (
    <div className="p-8">
      {/* Breadcrumb */}
      <div className="text-sm text-muted mb-4">
        <Link href="/" className="hover:text-ink">Projects</Link>
        <span className="mx-2">/</span>
        <Link href="/" className="hover:text-ink">Demo App</Link>
        <span className="mx-2">/</span>
        <span className="text-ink">Contracts</span>
      </div>

      {/* Page Header */}
      <div className="mb-8">
        <h1 className="font-fraunces text-5xl font-medium tracking-tighter mb-2">
          Contracts
        </h1>
        <p className="text-muted">
          All declared contracts in your application
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="text-sm text-muted mb-2">Total Contracts</div>
          <div className="font-fraunces text-4xl font-medium tracking-tighter">
            {contracts.length}
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="text-sm text-muted mb-2">Passing</div>
          <div className="font-fraunces text-4xl font-medium tracking-tighter text-green-600">
            {passCount}
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="text-sm text-muted mb-2">Failing</div>
          <div className="font-fraunces text-4xl font-medium tracking-tighter text-red-600">
            {failCount}
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="text-sm text-muted mb-2">Warnings</div>
          <div className="font-fraunces text-4xl font-medium tracking-tighter text-yellow-600">
            {warnCount}
          </div>
        </div>
      </div>

      {/* Contracts Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-background border-b border-border">
            <tr>
              <th className="text-left text-xs uppercase tracking-wider text-label font-medium px-6 py-3">
                Contract Name
              </th>
              <th className="text-left text-xs uppercase tracking-wider text-label font-medium px-6 py-3">
                Component
              </th>
              <th className="text-left text-xs uppercase tracking-wider text-label font-medium px-6 py-3">
                Checks
              </th>
              <th className="text-left text-xs uppercase tracking-wider text-label font-medium px-6 py-3">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {contracts.map((contract) => (
              <tr key={contract.id} className="hover:bg-background/50 transition-colors">
                <td className="px-6 py-4">
                  <span className="font-mono text-sm font-medium">{contract.name}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm">{contract.component}</span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    {contract.checks.map((check) => (
                      <span
                        key={check}
                        className={`text-xs px-2 py-1 rounded font-medium ${getCheckColor(
                          check
                        )}`}
                      >
                        {check}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        contract.status === "pass"
                          ? "bg-green-500"
                          : contract.status === "fail"
                          ? "bg-red-500"
                          : "bg-yellow-500"
                      }`}
                    />
                    <span
                      className={`text-sm font-medium ${
                        contract.status === "pass"
                          ? "text-green-700"
                          : contract.status === "fail"
                          ? "text-red-700"
                          : "text-yellow-700"
                      }`}
                    >
                      {contract.status === "pass"
                        ? "Passing"
                        : contract.status === "fail"
                        ? "Failing"
                        : "Warning"}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function getCheckColor(check: string): string {
  const colors: Record<string, string> = {
    state: "bg-blue-100 text-blue-800",
    api: "bg-purple-100 text-purple-800",
    ui: "bg-green-100 text-green-800",
    timing: "bg-orange-100 text-orange-800",
    layout: "bg-pink-100 text-pink-800",
  };
  return colors[check] || "bg-gray-100 text-gray-800";
}

// Made with Bob
