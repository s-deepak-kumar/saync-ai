'use client';

import { createContext, useContext } from 'react';

export interface TabsContextValue {
  tabsId: string;
  tabsName: string;
  currentValue?: string;
  onSelect: (value: string) => void;
  registerTab: (tabId: string, value: string) => void;
  unregisterTab: (tabId: string) => void;
}

export const TabsContext = createContext<TabsContextValue | null>(null);

export function useTabsContext(): TabsContextValue | null {
  return useContext(TabsContext);
}
