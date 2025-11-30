import mermaid from 'mermaid';
import type { Theme } from '../contexts/ThemeContext';

/**
 * Maps application themes to mermaid theme configurations
 */
export function getMermaidTheme(appTheme: Theme): 'default' | 'dark' | 'neutral' {
  if (appTheme.includes('dark')) {
    return 'dark';
  }
  return 'default';
}

/**
 * Gets the primary color based on the application theme
 */
export function getMermaidPrimaryColor(appTheme: Theme): string {
  if (appTheme.startsWith('pink')) {
    return '#FF6DAA';
  }
  return '#1CB0F6';
}

/**
 * Initializes mermaid with theme-aware configuration
 */
export function initializeMermaid(appTheme: Theme): void {
  const isDark = appTheme.includes('dark');
  const primaryColor = getMermaidPrimaryColor(appTheme);

  mermaid.initialize({
    startOnLoad: false,
    theme: getMermaidTheme(appTheme),
    securityLevel: 'loose',
    themeVariables: {
      primaryColor,
      primaryTextColor: isDark ? '#F5F5F5' : '#3C3C3C',
      primaryBorderColor: primaryColor,
      lineColor: isDark ? '#B0B0B0' : '#777777',
      secondaryColor: isDark ? '#2A2A2A' : '#F7F7F7',
      tertiaryColor: isDark ? '#333333' : '#E5E5E5',
      background: isDark ? '#1A1A1A' : '#FFFFFF',
      mainBkg: isDark ? '#2A2A2A' : '#FFFFFF',
      nodeBorder: primaryColor,
      clusterBkg: isDark ? '#333333' : '#F7F7F7',
      titleColor: isDark ? '#F5F5F5' : '#3C3C3C',
      edgeLabelBackground: isDark ? '#2A2A2A' : '#FFFFFF',
    },
  });
}

/**
 * Renders mermaid code to SVG
 * @returns SVG string or throws error for invalid syntax
 */
export async function renderMermaid(code: string, id: string): Promise<string> {
  const { svg } = await mermaid.render(id, code);
  return svg;
}
