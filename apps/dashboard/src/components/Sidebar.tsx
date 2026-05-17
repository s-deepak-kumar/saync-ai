'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  AlertOctagon,
  PlayCircle,
  GitMerge,
  Radio,
  Wrench,
  Settings as SettingsIcon,
  type LucideIcon,
} from 'lucide-react';
import ModeBadge from './ModeBadge';
import ConnectedDot from './ConnectedDot';

interface NavItem {
  href: string;
  text: string;
  icon: LucideIcon;
  exact?: boolean;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const sections: NavSection[] = [
  {
    label: 'Overview',
    items: [{ href: '/', text: 'Dashboard', icon: LayoutDashboard, exact: true }],
  },
  {
    label: 'Test results',
    items: [
      { href: '/issues', text: 'Issues', icon: AlertOctagon },
      { href: '/runs',   text: 'Runs',   icon: PlayCircle },
      { href: '/flows',  text: 'Flows',  icon: GitMerge },
    ],
  },
  {
    label: 'Production',
    items: [{ href: '/violations', text: 'Violations', icon: Radio }],
  },
  {
    label: 'Settings',
    items: [
      { href: '/setup',    text: 'Install',  icon: Wrench },
      { href: '/settings', text: 'Settings', icon: SettingsIcon },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[220px] bg-sidebar text-white h-screen fixed left-0 top-0 flex flex-col border-r border-sidebarBorder">
      <div className="px-5 py-5 border-b border-sidebarBorder">
        <Link href="/" className="flex items-center gap-2.5 mb-4">
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ backgroundColor: '#D4502A' }}
          />
          <span className="font-fraunces text-[18px] tracking-tighter text-white">
            Saync
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <ModeBadge />
          <ConnectedDot />
        </div>
      </div>

      <nav className="flex-1 px-2 py-3 overflow-y-auto">
        {sections.map((section) => (
          <div key={section.label} className="mb-5">
            <div className="text-[10px] uppercase font-medium tracking-wider text-sidebarMuted px-3 mb-1.5">
              {section.label}
            </div>
            <ul className="space-y-px">
              {section.items.map((item) => {
                const active = item.exact
                  ? pathname === item.href
                  : pathname === item.href || pathname.startsWith(item.href + '/');
                const Icon = item.icon;
                return (
                  <li key={item.href} className="relative">
                    {active && (
                      <span
                        aria-hidden
                        className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r-sm"
                        style={{ backgroundColor: '#D4502A' }}
                      />
                    )}
                    <Link
                      href={item.href}
                      className={`flex items-center gap-2.5 px-3 py-1.5 rounded text-[13px] transition-colors ${
                        active
                          ? 'bg-sidebarActive text-white'
                          : 'text-white/70 hover:bg-sidebarHover hover:text-white'
                      }`}
                    >
                      <Icon size={14} strokeWidth={1.75} />
                      {item.text}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
