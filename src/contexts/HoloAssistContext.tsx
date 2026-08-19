import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

// Ported from src/contexts/HoloAssistContext.tsx — just visibility flags, unchanged.
interface HoloAssistContextType {
  showBubble: boolean;
  setShowBubble: (show: boolean) => void;
}

const HoloAssistContext = createContext<HoloAssistContextType | undefined>(undefined);

export function HoloAssistProvider({ children }: { children: ReactNode }) {
  const [showBubble, setShowBubble] = useState(true);
  return <HoloAssistContext.Provider value={{ showBubble, setShowBubble }}>{children}</HoloAssistContext.Provider>;
}

export function useHoloAssistContext() {
  const context = useContext(HoloAssistContext);
  if (!context) throw new Error('useHoloAssistContext must be used within HoloAssistProvider');
  return context;
}
