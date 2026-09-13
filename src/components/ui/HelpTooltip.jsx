import React, { useState, useRef, useEffect, useId } from 'react';
import { HelpCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

export const HelpTooltip = ({ text, children, align = 'center', className }) => {
  const [isVisible, setIsVisible] = useState(false);
  const uid = useId();
  const tooltipId = `ht-${uid.replace(/:/g, '')}`;
  const containerRef = useRef(null);

  const content = text || children;

  useEffect(() => {
    if (!isVisible || !content) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setIsVisible(false);
      }
    };

    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsVisible(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isVisible, content]);

  if (!content) return null;

  const alignmentClasses = {
    center: 'left-1/2 -translate-x-1/2',
    left: 'left-0',
    right: 'right-0'
  };

  return (
    <div
      ref={containerRef}
      className={cn('relative inline-flex items-center align-middle', className)}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      <button
        type="button"
        aria-describedby={isVisible ? tooltipId : undefined}
        aria-label="Más información"
        onClick={() => setIsVisible(prev => !prev)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        className="inline-flex items-center justify-center p-0.5 rounded-full text-muted-foreground/70 hover:text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-colors cursor-help"
      >
        <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
      </button>

      {isVisible && (
        <div
          id={tooltipId}
          role="tooltip"
          className={cn(
            'absolute bottom-full mb-1.5 z-50 w-64 max-w-xs rounded-lg border border-border bg-popover p-2.5 text-xs text-popover-foreground shadow-md pointer-events-auto leading-relaxed animate-in fade-in zoom-in-95 duration-150',
            alignmentClasses[align] || alignmentClasses.center
          )}
        >
          {content}
        </div>
      )}
    </div>
  );
};
