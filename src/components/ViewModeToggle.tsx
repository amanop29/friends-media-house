import React from 'react';
import { Grid3x3, LayoutGrid, List, SlidersHorizontal } from 'lucide-react';
import { Button } from './ui/button';
import { GlassCard } from './GlassCard';
import { Slider } from './ui/slider';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover';
import { cn } from './ui/utils';

export type ViewMode = 'grid' | 'masonry' | 'list';
export type Orientation = 'all' | 'portrait' | 'landscape' | 'square';

interface ViewModeToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  density?: number;
  onDensityChange?: (density: number) => void;
  orientation?: Orientation;
  onOrientationChange?: (orientation: Orientation) => void;
  showDensity?: boolean;
  showOrientation?: boolean;
}

export function ViewModeToggle({
  viewMode,
  onViewModeChange,
  density = 4,
  onDensityChange,
  orientation = 'all',
  onOrientationChange,
  showDensity = true,
  showOrientation = true,
}: ViewModeToggleProps) {
  const viewModes: { value: ViewMode; icon: typeof Grid3x3; label: string }[] = [
    { value: 'grid', icon: Grid3x3, label: 'Grid' },
    { value: 'masonry', icon: LayoutGrid, label: 'Masonry' },
    { value: 'list', icon: List, label: 'List' },
  ];

  const orientations: { value: Orientation; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'portrait', label: 'Portrait' },
    { value: 'landscape', label: 'Landscape' },
    { value: 'square', label: 'Square' },
  ];

  return (
    <div className="flex items-center gap-2 md:gap-3 flex-wrap">
      {/* View Mode Buttons */}
      <GlassCard className="flex items-center p-1 gap-1">
        {viewModes.map(({ value, icon: Icon, label }) => (
          <Button
            key={value}
            variant="ghost"
            size="icon"
            onClick={() => onViewModeChange(value)}
            className={cn(
              'rounded-lg transition-colors',
              viewMode === value
                ? 'bg-[#C5A572] text-white hover:bg-[#B39563] hover:text-white'
                : 'text-[#707070] dark:text-[#A0A0A0] hover:bg-white/10 dark:hover:bg-black/20'
            )}
            title={label}
          >
            <Icon className="w-4 h-4" />
          </Button>
        ))}
      </GlassCard>

      {/* Density & Orientation Controls */}
      {(showDensity || showOrientation) && (
        <Popover>
          <PopoverTrigger
            className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-[#C5A572]/40 dark:border-white/10 text-[#707070] dark:text-[#A0A0A0] hover:bg-white/10 dark:hover:bg-black/20 transition-colors"
            title="Display Options"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </PopoverTrigger>
          <PopoverContent className="w-72 p-4 backdrop-blur-lg bg-white/90 dark:bg-black/90 border border-white/20 dark:border-white/10 rounded-xl shadow-lg">
            <div className="space-y-4">
              {/* Photo Density */}
              {showDensity && onDensityChange && (
                <div>
                  <label className="block text-sm text-[#2B2B2B] dark:text-white mb-3">
                    Photo Density: {density} columns
                  </label>
                  <Slider
                    value={[density]}
                    onValueChange={(value) => onDensityChange(value[0])}
                    min={2}
                    max={6}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-[#707070] dark:text-[#A0A0A0] mt-1">
                    <span>Sparse</span>
                    <span>Dense</span>
                  </div>
                </div>
              )}

              {/* Orientation Filter */}
              {showOrientation && onOrientationChange && (
                <div>
                  <label className="block text-sm text-[#2B2B2B] dark:text-white mb-2">
                    Filter by Orientation
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {orientations.map(({ value, label }) => (
                      <Button
                        key={value}
                        variant={orientation === value ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => onOrientationChange(value)}
                        className={
                          orientation === value
                            ? '!bg-[#C5A572] hover:!bg-[#B39563] !text-white text-sm'
                            : 'border-[#C5A572]/40 dark:border-white/10 text-[#707070] dark:text-[#A0A0A0] hover:bg-white/10 dark:hover:bg-black/20 text-sm'
                        }
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}