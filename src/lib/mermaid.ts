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
    // Improve text rendering and prevent truncation
    flowchart: {
      htmlLabels: true,
      useMaxWidth: false, // Don't constrain width - let it expand
      curve: 'basis',
      padding: 15,
      nodeSpacing: 50,
      rankSpacing: 50,
    },
    sequence: {
      useMaxWidth: false,
      boxMargin: 10,
      boxTextMargin: 5,
      noteMargin: 10,
      messageMargin: 35,
    },
    class: {
      useMaxWidth: false,
    },
    state: {
      useMaxWidth: false,
    },
    pie: {
      useMaxWidth: false,
    },
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
      // Improve text sizing
      fontSize: '14px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    },
  });
}

/**
 * Post-processes the SVG to fix viewBox and prevent text truncation.
 * Mermaid sometimes generates SVGs with viewBox that clips content.
 */
function fixSvgViewBox(svgString: string): string {
  // Parse the SVG
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, 'image/svg+xml');
  const svg = doc.querySelector('svg');
  
  if (!svg) return svgString;

  // Remove any max-width or width constraints that might clip content
  svg.style.maxWidth = 'none';
  svg.removeAttribute('width');
  
  // Get the actual bounding box of all content
  // We need to temporarily add to DOM to calculate bbox
  const tempContainer = document.createElement('div');
  tempContainer.style.position = 'absolute';
  tempContainer.style.visibility = 'hidden';
  tempContainer.style.left = '-9999px';
  tempContainer.appendChild(svg.cloneNode(true));
  document.body.appendChild(tempContainer);
  
  const tempSvg = tempContainer.querySelector('svg');
  if (tempSvg) {
    try {
      const bbox = tempSvg.getBBox();
      // Add padding around the content
      const padding = 20;
      const newViewBox = `${bbox.x - padding} ${bbox.y - padding} ${bbox.width + padding * 2} ${bbox.height + padding * 2}`;
      svg.setAttribute('viewBox', newViewBox);
      // Set height to auto to allow proper scaling
      svg.setAttribute('height', '100%');
      svg.style.minWidth = `${bbox.width + padding * 2}px`;
    } catch {
      // getBBox can fail if SVG is invalid, just return original
    }
  }
  
  document.body.removeChild(tempContainer);
  
  // Serialize back to string
  const serializer = new XMLSerializer();
  return serializer.serializeToString(svg);
}

/**
 * Renders mermaid code to SVG
 * @returns SVG string or throws error for invalid syntax
 */
export async function renderMermaid(code: string, id: string): Promise<string> {
  // Sanitize the code to fix common syntax issues
  const sanitizedCode = sanitizeMermaidCode(code);
  const { svg } = await mermaid.render(id, sanitizedCode);
  
  // Fix viewBox to prevent text truncation
  return fixSvgViewBox(svg);
}
