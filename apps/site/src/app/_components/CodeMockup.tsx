'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';

type Tab = 'component' | 'flow';

interface TabConfig {
  id: Tab;
  filename: string;
  lang: string;
  lines: number;
  expectation: string;
  body: ReactNode;
}

const TABS: TabConfig[] = [
  {
    id: 'component',
    filename: 'AddToCart.tsx',
    lang: 'react',
    lines: 18,
    expectation: '✓ contract registered · 1 expectation',
    body: (
      <>
        <span className="text-[#8FB7E5]">import</span>{' '}<span>{'{ '}</span><span className="text-[#A8D5BA]">SayncButton</span>{' '}<span>{'}'} </span><span className="text-[#8FB7E5]">from</span>{' '}<span className="text-[#FCBF5E]">'saync-web/react'</span>;{`\n\n`}
        <span className="text-[#8FB7E5]">export function</span>{' '}<span className="text-[#A8D5BA]">AddToCartButton</span>({'{ productId }'}) {'{'}{`\n`}
        {`  `}<span className="text-[#8FB7E5]">return</span> ({`\n`}
        {`    `}<span className="text-[#C5A6FF]">{'<SayncButton'}</span>{`\n`}
        {`      `}<span className="text-[#8FB7E5]">name</span>=<span className="text-[#FCBF5E]">"add-to-cart"</span>{`\n`}
        {`      `}<span className="text-[#8FB7E5]">expects</span>={'{{'}{`\n`}
        {`        `}<span className="text-[#FCBF5E]">onClick</span>: {'{'}{`\n`}
        {`          `}<span className="text-[#FCBF5E]">apiCall</span>: {'{'}{`\n`}
        {`            `}<span className="text-[#FCBF5E]">method</span>: <span className="text-[#FCBF5E]">'POST'</span>,{`\n`}
        {`            `}<span className="text-[#FCBF5E]">url</span>: <span className="text-[#FCBF5E]">'/api/cart'</span>,{`\n`}
        {`            `}<span className="text-[#FCBF5E]">expectedStatus</span>: <span className="text-[#F18A6A]">200</span>,{`\n`}
        {`            `}<span className="text-[#FCBF5E]">maxDuration</span>: <span className="text-[#F18A6A]">500</span>,{`\n`}
        {`          `}{'}'},{`\n`}
        {`          `}<span className="text-[#FCBF5E]">responseShape</span>: {'{ '}<span className="text-[#FCBF5E]">cartCount</span>: <span className="text-[#FCBF5E]">'number'</span>{' }'},{`\n`}
        {`        `}{'}'},{`\n`}
        {`      `}{'}}'}{`\n`}
        {`      `}<span className="text-[#8FB7E5]">onClick</span>={'{() => addToCart(productId)}'}{`\n`}
        {`    >`}{`\n`}
        {`      Add to cart`}{`\n`}
        {`    `}<span className="text-[#C5A6FF]">{'</SayncButton>'}</span>{`\n`}
        {`  );`}{`\n`}
        {'}'}
      </>
    ),
  },
  {
    id: 'flow',
    filename: 'saync.flows.ts',
    lang: 'typescript',
    lines: 14,
    expectation: '✓ 1 flow registered · 5 steps',
    body: (
      <>
        <span className="text-[#8FB7E5]">import</span>{' '}<span>{'{ '}</span><span className="text-[#A8D5BA]">defineFlow</span>{' '}<span>{'}'} </span><span className="text-[#8FB7E5]">from</span>{' '}<span className="text-[#FCBF5E]">'saync-web'</span>;{`\n\n`}
        <span className="text-[#8FB7E5]">export const</span>{' '}<span className="text-[#A8D5BA]">flows</span> = [{`\n`}
        {`  `}<span className="text-[#A8D5BA]">defineFlow</span>({'{'}{`\n`}
        {`    `}<span className="text-[#8FB7E5]">name</span>: <span className="text-[#FCBF5E]">'checkout'</span>,{`\n`}
        {`    `}<span className="text-[#8FB7E5]">description</span>: <span className="text-[#FCBF5E]">'Add → cart → form → place order → /success'</span>,{`\n`}
        {`    `}<span className="text-[#8FB7E5]">steps</span>: [{`\n`}
        {`      {`} <span className="text-[#FCBF5E]">interact</span>: <span className="text-[#FCBF5E]">'add-to-cart'</span> {'}'},{`\n`}
        {`      {`} <span className="text-[#FCBF5E]">interact</span>: <span className="text-[#FCBF5E]">'open-cart'</span> {'}'},{`\n`}
        {`      {`} <span className="text-[#FCBF5E]">fill</span>: <span className="text-[#FCBF5E]">'email'</span>, <span className="text-[#FCBF5E]">with</span>: <span className="text-[#FCBF5E]">'demo@test.co'</span> {'}'},{`\n`}
        {`      {`} <span className="text-[#FCBF5E]">interact</span>: <span className="text-[#FCBF5E]">'place-order'</span> {'}'},{`\n`}
        {`      {`} <span className="text-[#FCBF5E]">expect</span>: {'{ '}<span className="text-[#FCBF5E]">url</span>: <span className="text-[#FCBF5E]">'/success'</span>{' }'} {'}'},{`\n`}
        {`    `}],{`\n`}
        {`  `}{'}'}),{`\n`}
        ];
      </>
    ),
  },
];

export function CodeMockup() {
  const [active, setActive] = useState<Tab>('component');
  const current = TABS.find((t) => t.id === active)!;

  return (
    <div className="bg-codeBg rounded-md overflow-hidden shadow-[0_24px_60px_-20px_rgba(15,23,42,0.35)] border border-[#1B2536]">
      {/* tab bar */}
      <div className="flex items-center border-b border-[#1B2536] bg-[#0A0F1A]">
        <div className="flex" role="tablist" aria-label="Code examples">
          {TABS.map((t) => {
            const isActive = t.id === active;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActive(t.id)}
                className={`px-4 py-2.5 text-[11px] font-mono border-r border-[#1B2536] transition-colors ${
                  isActive
                    ? 'text-white/85 bg-codeBg'
                    : 'text-white/35 hover:text-white/60 bg-transparent'
                }`}
              >
                {t.filename}
              </button>
            );
          })}
        </div>
        <span className="ml-auto pr-3 text-[10px] text-white/30 font-mono uppercase tracking-[0.1em]">
          {current.lang} · {current.lines} lines
        </span>
      </div>

      <pre
        role="tabpanel"
        className="px-5 py-4 font-mono text-[12.5px] leading-[1.65] text-white/90 overflow-x-auto whitespace-pre min-h-[420px]"
      >
        {current.body}
      </pre>

      {/* status footer */}
      <div className="border-t border-[#1B2536] bg-[#0A0F1A] px-4 py-2 flex items-center justify-between text-[11px] font-mono">
        <span className="text-sevPass">{current.expectation}</span>
        <span className="text-white/30">localhost:3777</span>
      </div>
    </div>
  );
}
