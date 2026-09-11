import React, { useState, useRef, useEffect } from 'react';
import { useTheme, THEMES } from '../context/ThemeContext';
import { Sun, Moon, Sparkles, Palette, Check } from 'lucide-react';
import { Button } from './ui/Button';

export const ThemeSelector = ({
  align = 'end',
  className = '',
  // Retrocompatibilidad con props directos si no se usa useTheme
  currentTheme: propTheme,
  onSelectTheme: propSetTheme,
}) => {
  const context = useTheme();
  const activeThemeId = propTheme || context.theme;
  const setActiveTheme = propSetTheme || context.setTheme;

  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const renderThemeIcon = (id, iconClass = 'h-4 w-4') => {
    switch (id) {
      case 'dark':
        return <Moon className={`${iconClass} text-indigo-400`} aria-hidden="true" />;
      case 'gold-teal':
        return <Sparkles className={`${iconClass} text-amber-400`} aria-hidden="true" />;
      case 'mint-fresh':
        return <Sparkles className={`${iconClass} text-emerald-500`} aria-hidden="true" />;
      case 'light':
      default:
        return <Sun className={`${iconClass} text-amber-500`} aria-hidden="true" />;
    }
  };

  const currentThemeObj = THEMES.find((t) => t.id === activeThemeId) || THEMES[0];

  return (
    <div ref={containerRef} className={`relative inline-block text-left ${className}`}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={`Tema visual actual: ${currentThemeObj.label}. Haz clic para cambiar tema.`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className="h-9 w-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/70 focus-visible:ring-2 focus-visible:ring-ring transition-colors"
      >
        {renderThemeIcon(activeThemeId)}
      </Button>

      {isOpen && (
        <div
          role="listbox"
          aria-label="Seleccionar tema visual"
          className={`absolute ${
            align === 'end' ? 'right-0' : 'left-0'
          } mt-2 w-64 rounded-2xl border border-border/80 bg-card/95 p-2 shadow-2xl backdrop-blur-xl animate-fadeIn z-50 focus:outline-none`}
        >
          <div className="flex items-center gap-2 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/50 mb-1">
            <Palette className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            <span>Temas Visuales</span>
          </div>

          <div className="space-y-1">
            {THEMES.map((item) => {
              const isSelected = item.id === activeThemeId;
              return (
                <button
                  key={item.id}
                  role="option"
                  aria-selected={isSelected}
                  type="button"
                  onClick={() => {
                    setActiveTheme(item.id);
                    setIsOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-xs font-medium transition-all ${
                    isSelected
                      ? 'bg-primary/10 text-foreground font-semibold ring-1 ring-primary/30'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Dual-color preview swatch */}
                    <div
                      className="relative h-6 w-6 rounded-full border border-border/80 shadow-inner flex overflow-hidden shrink-0"
                      aria-hidden="true"
                    >
                      <div
                        className="w-1/2 h-full"
                        style={{ backgroundColor: item.colors.bg }}
                      />
                      <div
                        className="w-1/2 h-full"
                        style={{ backgroundColor: item.colors.primary }}
                      />
                    </div>

                    <div className="flex flex-col text-left">
                      <span className="text-foreground font-medium leading-tight">
                        {item.name}
                      </span>
                      <span className="text-[10px] text-muted-foreground leading-tight">
                        {item.label}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {isSelected && (
                      <Check className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
