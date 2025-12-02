import { useEffect, useState, useRef, useId, useCallback } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { initializeMermaid, renderMermaid } from '../lib/mermaid';
import { AlertTriangle, Maximize2, Minimize2, ZoomIn, ZoomOut, RotateCcw, Download } from 'lucide-react';

interface MermaidDiagramProps {
  code: string;
  className?: string;
}

interface MermaidError {
  message: string;
  originalCode: string;
}

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;

export function MermaidDiagram({ code, className = '' }: MermaidDiagramProps) {
  const { theme } = useTheme();
  const [svg, setSvg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<MermaidError | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const uniqueId = useId();
  const diagramId = `mermaid-${uniqueId.replace(/:/g, '-')}`;

  // Render the mermaid diagram
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
        initializeMermaid(theme);
        const renderedSvg = await renderMermaid(code.trim(), diagramId);

        if (isMounted) {
          setSvg(renderedSvg);
          setError(null);
          // Reset zoom and pan when diagram changes
          setZoom(1);
          setPan({ x: 0, y: 0 });
        }
      } catch (err) {
        if (isMounted) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to render diagram';
          setError({ message: errorMessage, originalCode: code });
          setSvg(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    renderDiagram();
    return () => { isMounted = false; };
  }, [code, theme, diagramId]);

  // Handle zoom
  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + ZOOM_STEP, MAX_ZOOM));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev - ZOOM_STEP, MIN_ZOOM));
  }, []);

  const handleResetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Handle mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      setZoom(prev => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev + delta)));
    }
  }, []);

  // Handle pan (drag)
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) { // Left click only
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
    if (!isFullscreen) {
      // Reset view when entering fullscreen
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
  }, [isFullscreen]);

  // Download diagram as PNG
  const handleDownload = useCallback(async () => {
    if (!svg || !svgContainerRef.current) return;

    try {
      const svgElement = svgContainerRef.current.querySelector('svg');
      if (!svgElement) return;

      // Clone the SVG to avoid modifying the original
      const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;
      
      // Get actual dimensions from the SVG
      const bbox = svgElement.getBBox();
      const svgWidth = bbox.width + bbox.x + 40;
      const svgHeight = bbox.height + bbox.y + 40;
      
      // Set explicit dimensions on the cloned SVG
      clonedSvg.setAttribute('width', String(svgWidth));
      clonedSvg.setAttribute('height', String(svgHeight));
      clonedSvg.setAttribute('viewBox', `${bbox.x - 20} ${bbox.y - 20} ${svgWidth} ${svgHeight}`);
      
      // Add background rect
      const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      bgRect.setAttribute('x', String(bbox.x - 20));
      bgRect.setAttribute('y', String(bbox.y - 20));
      bgRect.setAttribute('width', String(svgWidth));
      bgRect.setAttribute('height', String(svgHeight));
      bgRect.setAttribute('fill', theme.includes('dark') ? '#1A1A1A' : '#FFFFFF');
      clonedSvg.insertBefore(bgRect, clonedSvg.firstChild);

      // Serialize SVG with proper XML declaration
      const serializer = new XMLSerializer();
      let svgString = serializer.serializeToString(clonedSvg);
      
      // Add XML declaration and fix namespace issues
      if (!svgString.includes('xmlns=')) {
        svgString = svgString.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
      }

      // Create canvas with proper dimensions
      const canvas = document.createElement('canvas');
      const scale = 2; // Higher resolution for crisp output
      canvas.width = svgWidth * scale;
      canvas.height = svgHeight * scale;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Create image from SVG
      const img = new Image();
      
      // Use data URL instead of blob URL for better compatibility
      const svgBase64 = btoa(unescape(encodeURIComponent(svgString)));
      const dataUrl = `data:image/svg+xml;base64,${svgBase64}`;

      img.onload = () => {
        // Scale context for higher resolution
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0);

        // Create download link
        const link = document.createElement('a');
        link.download = `diagram-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png', 1.0);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      };

      img.onerror = (err) => {
        console.error('Failed to load SVG image:', err);
        // Fallback: download as SVG
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml' });
        const link = document.createElement('a');
        link.download = `diagram-${Date.now()}.svg`;
        link.href = URL.createObjectURL(svgBlob);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
      };

      img.src = dataUrl;
    } catch (err) {
      console.error('Failed to download diagram:', err);
    }
  }, [svg, theme]);

  // Close fullscreen on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-6 rounded-xl bg-[var(--color-neutral-surface)] border border-[var(--color-neutral-border)] ${className}`}>
        <div className="flex items-center gap-3 text-[var(--color-neutral-text-muted)]">
          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span>Rendering diagram...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`rounded-xl border border-[var(--color-accent-red)]/30 bg-[var(--color-neutral-surface)] overflow-hidden ${className}`}>
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--color-neutral-border)] bg-[var(--color-accent-red)]/10">
          <AlertTriangle size={16} className="text-[var(--color-accent-red)]" />
          <span className="text-sm font-medium text-[var(--color-accent-red)]">Diagram Error</span>
        </div>
        <div className="p-4">
          <p className="text-sm text-[var(--color-neutral-text-muted)] mb-3">{error.message}</p>
          <details className="group">
            <summary className="text-xs text-[var(--color-primary)] cursor-pointer hover:underline">
              Show diagram code
            </summary>
            <pre className="mt-2 text-xs bg-[var(--color-neutral-bg)] p-3 rounded-lg overflow-x-auto border border-[var(--color-neutral-border)]">
              <code className="text-[var(--color-neutral-text)]">{error.originalCode}</code>
            </pre>
          </details>
        </div>
      </div>
    );
  }

  if (!svg) return null;

  const diagramContent = (
    <div
      ref={svgContainerRef}
      className={`mermaid-diagram-content ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      style={{
        transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
        transformOrigin: 'center center',
        transition: isDragging ? 'none' : 'transform 0.2s ease-out',
      }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );

  const controls = (
    <div className="mermaid-controls flex items-center gap-1 p-1 rounded-lg bg-[var(--color-neutral-bg)]/90 backdrop-blur-sm border border-[var(--color-neutral-border)] shadow-sm">
      <button
        onClick={handleZoomOut}
        disabled={zoom <= MIN_ZOOM}
        className="p-1.5 rounded hover:bg-[var(--color-neutral-surface)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        title="Zoom out"
      >
        <ZoomOut size={16} className="text-[var(--color-neutral-text-muted)]" />
      </button>
      <span className="text-xs text-[var(--color-neutral-text-muted)] min-w-[3rem] text-center">
        {Math.round(zoom * 100)}%
      </span>
      <button
        onClick={handleZoomIn}
        disabled={zoom >= MAX_ZOOM}
        className="p-1.5 rounded hover:bg-[var(--color-neutral-surface)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        title="Zoom in"
      >
        <ZoomIn size={16} className="text-[var(--color-neutral-text-muted)]" />
      </button>
      <div className="w-px h-4 bg-[var(--color-neutral-border)] mx-1" />
      <button
        onClick={handleResetView}
        className="p-1.5 rounded hover:bg-[var(--color-neutral-surface)] transition-colors"
        title="Reset view"
      >
        <RotateCcw size={16} className="text-[var(--color-neutral-text-muted)]" />
      </button>
      <button
        onClick={handleDownload}
        className="p-1.5 rounded hover:bg-[var(--color-neutral-surface)] transition-colors"
        title="Download as PNG"
      >
        <Download size={16} className="text-[var(--color-neutral-text-muted)]" />
      </button>
      <button
        onClick={toggleFullscreen}
        className="p-1.5 rounded hover:bg-[var(--color-neutral-surface)] transition-colors"
        title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
      >
        {isFullscreen ? (
          <Minimize2 size={16} className="text-[var(--color-neutral-text-muted)]" />
        ) : (
          <Maximize2 size={16} className="text-[var(--color-neutral-text-muted)]" />
        )}
      </button>
    </div>
  );

  // Fullscreen modal
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-[var(--color-neutral-bg)]/95 backdrop-blur-sm flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-neutral-border)]">
          <span className="text-sm font-medium text-[var(--color-neutral-text)]">Diagram View</span>
          {controls}
        </div>
        <div
          ref={containerRef}
          className="flex-1 overflow-hidden flex items-center justify-center"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {diagramContent}
        </div>
        <div className="p-2 text-center text-xs text-[var(--color-neutral-text-muted)] border-t border-[var(--color-neutral-border)]">
          Drag to pan • Ctrl+Scroll to zoom • Press Esc to exit
        </div>
      </div>
    );
  }

  // Normal inline view
  return (
    <div className={`mermaid-diagram-wrapper group relative rounded-xl border border-[var(--color-neutral-border)] bg-[var(--color-neutral-surface)] overflow-hidden ${className}`}>
      {/* Controls - visible on hover */}
      <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        {controls}
      </div>
      
      {/* Diagram container */}
      <div
        ref={containerRef}
        className="mermaid-diagram-container overflow-auto p-4 min-h-[200px] max-h-[600px]"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div className="flex items-center justify-center min-w-full">
          {diagramContent}
        </div>
      </div>
      
      {/* Hint for interaction */}
      <div className="absolute bottom-2 left-2 text-xs text-[var(--color-neutral-text-muted)] opacity-0 group-hover:opacity-60 transition-opacity pointer-events-none">
        Hover for controls
      </div>
    </div>
  );
}
