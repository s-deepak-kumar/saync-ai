import Link from "next/link";

export default function Sidebar() {
  return (
    <aside className="w-60 bg-card border-r border-border h-screen fixed left-0 top-0 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-terracotta" />
          <span className="font-fraunces text-xl font-medium">Saync</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        {/* Project Section */}
        <div className="mb-6">
          <div className="text-xs uppercase tracking-wider text-label mb-2 px-3">
            Project
          </div>
          <Link
            href="/"
            className="flex items-center px-3 py-2 rounded-md text-sm hover:bg-background transition-colors"
          >
            Overview
          </Link>
        </div>

        {/* Reports Section */}
        <div className="mb-6">
          <div className="text-xs uppercase tracking-wider text-label mb-2 px-3">
            Reports
          </div>
          <Link
            href="/issues"
            className="flex items-center px-3 py-2 rounded-md text-sm hover:bg-background transition-colors"
          >
            Issues
          </Link>
          <Link
            href="/contracts"
            className="flex items-center px-3 py-2 rounded-md text-sm hover:bg-background transition-colors"
          >
            Contracts
          </Link>
        </div>

        {/* Setup Section */}
        <div>
          <div className="text-xs uppercase tracking-wider text-label mb-2 px-3">
            Setup
          </div>
          <Link
            href="/setup"
            className="flex items-center px-3 py-2 rounded-md text-sm hover:bg-background transition-colors"
          >
            Configuration
          </Link>
        </div>
      </nav>
    </aside>
  );
}

// Made with Bob
