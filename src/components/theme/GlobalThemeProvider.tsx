'use client';

import React, { useEffect } from 'react';
import { applySystemTheme, getStoredSystemTheme } from '@/data/colorPalettes';
import { SystemThemeConfig } from '@/types/homeConfig';

interface GlobalThemeProviderProps {
  children: React.ReactNode;
  initialTheme?: SystemThemeConfig;
}

export function GlobalThemeProvider({ children, initialTheme }: GlobalThemeProviderProps) {
  useEffect(() => {
    // 1. Aplica o tema salvo no localStorage ou o inicial fornecido
    const current = initialTheme || getStoredSystemTheme();
    applySystemTheme(current);

    // 2. Ouve atualizações de outras abas ou componentes
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'tke_system_theme' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          applySystemTheme(parsed);
        } catch {
          // ignore
        }
      }
    };

    const handleCustomChange = (e: Event) => {
      const customEvent = e as CustomEvent<SystemThemeConfig>;
      if (customEvent.detail) {
        // já aplicado, mas garante estado
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('tke_theme_change', handleCustomChange);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('tke_theme_change', handleCustomChange);
    };
  }, [initialTheme]);

  return <>{children}</>;
}
