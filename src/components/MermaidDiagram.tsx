import { useEffect, useState, useRef, useId } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { initializeMermaid, renderMermaid } from '../lib/mermaid';
import { AlertTriangle } from 'lucide-react';

interface MermaidDiagramProps {
  code: string;
  className?: string;
}

interface MermaidError {
  message: string;
  originalCode: string;
}

export function MermaidDiagram({ code, className = '' }: MermaidDiagramProps) {
  const { theme } = useTheme();
  const [svg, setSvg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<MermaidError | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const uniqueId = useId();
  const diagramId = `mermaid-${uniqueId.replace(/:/g, '-')}`;

  useEffect(() => {
    let isMounted = true;

    const renderDiagram = async () => {
      if (!code.trim()) {
        setLoading(false);
        setError({ message: 'Empty diagram code', originalCode: code });
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Initialize mermaid with current theme
        initializeMermaid(theme);

        // Render the diagram
        const renderedSvg = await renderMermaid(code.trim(), diagramId);

        if (isMounted) {
          setSvg(renderedSvg);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to render diagram';
          setError({
            message: errorMessage,
            originalCode: code,
          });
          setSvg(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    renderDiagram();

    return () => {
      isMounted = false;
    };
  }, [code, theme, diagramId]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-4 rounded-lg bg-[var(--color-neutral-surface)] ${className}`}>
        <div className="animate-pulse text-[var(--color-neutral-text-muted)]">
          Loading diagram...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`rounded-lg border border-[var(--color-accent-red)] bg-[var(--color-neutral-surface)] ${className}`}>
        <div className="flex items-center gap-2 p-3 border-b border-[var(--color-neutral-border)] text-[var(--color-accent-red)]">
          <AlertTriangle size={16} />
          <span className="text-sm font-medium">Diagram Error</span>
        </div>
        <div className="p-3">
          <p className="text-sm text-[var(--color-neutral-text-muted)] mb-2">
            {error.message}
          </p>
          <pre className="text-xs bg-[var(--color-neutral-surface-dark)] p-3 rounded overflow-x-auto">
            <code className="text-[var(--color-neutral-text)]">{error.originalCode}</code>
          </pre>
        </div>
      </div>
    );
  }

  if (svg) {
    return (
      <div
        ref={containerRef}
        className={`mermaid-diagram overflow-x-auto p-4 rounded-lg bg-[var(--color-neutral-surface)] ${className}`}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    );
  }

  return null;
}
