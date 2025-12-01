import mermaid from 'mermaid';
import type { Theme } from '../contexts/ThemeContext';

/**
 * Sanitizes mermaid code to fix common syntax issues
 * - Properly quotes node labels containing special characters
 * - Fixes bracket mismatches
 */
export function sanitizeMermaidCode(code: string): string {
  // Split into lines for processing
  const lines = code.split('\n');
  const sanitizedLines = lines.map(line => {
    // Skip empty lines, comments, and diagram type declarations
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith('%%') || 
        /^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|journey|gitGraph|mindmap|timeline|quadrantChart|sankey|xychart|block)/i.test(trimmedLine) ||
        /^(subgraph|end|direction|participant|actor|note|loop|alt|opt|par|critical|break|rect|activate|deactivate|title|section)(\s|$)/i.test(trimmedLine)) {
      return line;
    }

    // Fix node definitions with labels containing special characters
    // Pattern: A[Label with (special) chars] or A(Label) or A{Label} or A((Label))
    let result = line;

    // Fix square bracket labels: A[Label] -> A["Label"] if label has special chars
    result = result.replace(/(\w+)\[([^\]"]+)\]/g, (match, nodeId, label) => {
      // Check if label contains special characters that need quoting
      if (/[(),.:;'"!?<>{}]/.test(label) && !label.startsWith('"')) {
        // Escape any existing quotes and wrap in quotes
        const escapedLabel = label.replace(/"/g, "'");
        return `${nodeId}["${escapedLabel}"]`;
      }
      return match;
    });

    // Fix round bracket labels: A(Label) -> A("Label") if label has special chars
    result = result.replace(/(\w+)\(([^)"]+)\)(?!\))/g, (match, nodeId, label) => {
      if (/[[\]{}.,;:'"!?<>]/.test(label) && !label.startsWith('"')) {
        const escapedLabel = label.replace(/"/g, "'");
        return `${nodeId}("${escapedLabel}")`;
      }
      return match;
    });

    // Fix curly bracket labels: A{Label} -> A{"Label"} if label has special chars
    result = result.replace(/(\w+)\{([^}"]+)\}/g, (match, nodeId, label) => {
      if (/[[\]().,;:'"!?<>]/.test(label) && !label.startsWith('"')) {
        const escapedLabel = label.replace(/"/g, "'");
        return `${nodeId}{"${escapedLabel}"}`;
      }
      return match;
    });

    // Fix double round bracket labels (circles): A((Label))
    result = result.replace(/(\w+)\(\(([^)"]+)\)\)/g, (match, nodeId, label) => {
      if (/[[\]{}.,;:'"!?<>]/.test(label) && !label.startsWith('"')) {
        const escapedLabel = label.replace(/"/g, "'");
        return `${nodeId}(("${escapedLabel}"))`;
      }
      return match;
    });

    // Fix edge labels: -->|Label| -> -->|"Label"| if label has special chars
    result = result.replace(/-->\|([^|"]+)\|/g, (match, label) => {
      if (/[[\]{}().,;:'"!?<>]/.test(label) && !label.startsWith('"')) {
        const escapedLabel = label.replace(/"/g, "'");
        return `-->|"${escapedLabel}"|`;
      }
      return match;
    });

    return result;
  });

  return sanitizedLines.join('\n');
}

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
  // Sanitize the code to fix common syntax issues
  const sanitizedCode = sanitizeMermaidCode(code);
  const { svg } = await mermaid.render(id, sanitizedCode);
  return svg;
}
