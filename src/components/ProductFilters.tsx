import React, { useEffect, useMemo, useRef, useState } from "react";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";

interface ProductFiltersProps {
  priceRange: [number, number];
  onPriceChange: (value: [number, number]) => void;
  categories: string[];
  selectedCategories: string[];
  onCategoryChange: (category: string) => void;
  colors: string[];
  selectedColors: string[];
  onColorChange: (color: string) => void;
  sortBy: string;
  onSortChange: (value: string) => void;
  applyMode?: "immediate" | "manual";
}

export const ProductFilters: React.FC<ProductFiltersProps> = ({
  priceRange,
  onPriceChange,
  categories,
  selectedCategories,
  onCategoryChange,
  colors,
  selectedColors,
  onColorChange,
  sortBy,
  onSortChange,
  applyMode = "immediate",
}) => {
  /* -------------------------
     Constants & presets
     ------------------------- */
  const SLIDER_MIN = 0;
  const SLIDER_MAX = 10000; 
  const SLIDER_STEP = 50;

  const rangeOptions: Array<[number, number]> = [
    [0, 1000],
    [1000, 3000],
    [3000, 5000],
    [5000, 7500],
    [7500, 10000],
  ];

  const presets = useMemo(
    () =>
      rangeOptions.map(([min, max]) => ({
        id: `${min}-${max}`,
        label: `Rs ${min} - Rs ${max}`,
        value: [min, max] as [number, number],
      })),
    []
  );

  /* -------------------------
     Local state
     ------------------------- */
  const [localRange, setLocalRange] = useState<[number, number]>(priceRange);
  
  const getPresetId = (r: [number, number]) =>
    presets.find((p) => p.value[0] === r[0] && p.value[1] === r[1])?.id ?? "custom";
    
  const [selectedPreset, setSelectedPreset] = useState<string>(getPresetId(priceRange));

  useEffect(() => {
    setLocalRange(priceRange);
    setSelectedPreset(getPresetId(priceRange));
  }, [priceRange[0], priceRange[1]]);

  /* -------------------------
     Debounce logic
     ------------------------- */
  const debounceRef = useRef<number | null>(null);
  const DEBOUNCE_MS = 500; // Slightly longer debounce for better typing experience

  function flushDebounce(range: [number, number]) {
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    onPriceChange(range);
  }

  function scheduleDebouncedUpdate(range: [number, number]) {
    if (applyMode === "manual") return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      debounceRef.current = null;
      onPriceChange(range);
    }, DEBOUNCE_MS);
  }

  /* -------------------------
     Handlers
     ------------------------- */
  function handlePresetSelect(id: string) {
    setSelectedPreset(id);
    if (id === "custom") return;
    
    const preset = presets.find((p) => p.id === id);
    if (!preset) return;
    setLocalRange(preset.value);
    
    if (applyMode === "manual") return;
    flushDebounce(preset.value);
  }

  function handleSliderChange(newVal: [number, number]) {
    setLocalRange(newVal);
    setSelectedPreset(getPresetId(newVal));
    if (applyMode === "immediate") scheduleDebouncedUpdate(newVal);
  }

  // Improved Input Logic: Allows free typing, validates on change
  function handleMinInputChange(v: string) {
    const num = v === "" ? 0 : parseInt(v.replace(/[^\d]/g, ""), 10);
    if (isNaN(num)) return;

    // Constrain the value so it doesn't break logic, but don't force step-rounding while typing
    const newMin = Math.min(Math.max(SLIDER_MIN, num), localRange[1]);
    const updated: [number, number] = [newMin, localRange[1]];
    
    setLocalRange(updated);
    setSelectedPreset(getPresetId(updated));
    if (applyMode === "immediate") scheduleDebouncedUpdate(updated);
  }

  function handleMaxInputChange(v: string) {
    const num = v === "" ? 0 : parseInt(v.replace(/[^\d]/g, ""), 10);
    if (isNaN(num)) return;

    // Allow user to type up to SLIDER_MAX
    const newMax = Math.min(num, SLIDER_MAX);
    const updated: [number, number] = [localRange[0], newMax];
    
    setLocalRange(updated);
    setSelectedPreset(getPresetId(updated));
    if (applyMode === "immediate") scheduleDebouncedUpdate(updated);
  }

  function handleApply() {
    flushDebounce(localRange);
    setSelectedPreset(getPresetId(localRange));
  }

  function handleClear() {
    const reset: [number, number] = [SLIDER_MIN, SLIDER_MAX];
    setLocalRange(reset);
    setSelectedPreset(getPresetId(reset));
    flushDebounce(reset);
  }

  const displayValue = (v: number) => `Rs ${v}`;

  return (
    <Card className="p-6 space-y-6 sticky top-24">
      {/* Sort */}
      <div>
        <Label className="text-sm font-semibold mb-3 block">Sort By</Label>
        <Select value={sortBy} onValueChange={onSortChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="featured">Featured</SelectItem>
            <SelectItem value="price-low">Price: Low to High</SelectItem>
            <SelectItem value="price-high">Price: High to Low</SelectItem>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="popular">Most Popular</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Price Range */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <Label className="text-sm font-semibold">Price</Label>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleClear}
              className="text-xs px-2 py-1 border rounded hover:bg-gray-50"
            >
              Clear
            </button>
            {applyMode === "manual" && (
              <button
                type="button"
                onClick={handleApply}
                className="text-xs px-2 py-1 bg-primary text-white rounded hover:brightness-95"
              >
                Apply
              </button>
            )}
          </div>
        </div>

        {/* Preset dropdown */}
        <div className="mb-3">
          <Select value={selectedPreset} onValueChange={handlePresetSelect}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {presets.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.label}
                </SelectItem>
              ))}
              <SelectItem value="custom">
                Custom: {displayValue(localRange[0])} - {displayValue(localRange[1])}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Numeric inputs - USER CAN TYPE HERE */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1">
            <Label className="text-xs">Min</Label>
            <input
              type="text"
              inputMode="numeric"
              value={localRange[0] === 0 && localRange[0] !== priceRange[0] ? "" : localRange[0]}
              onChange={(e) => handleMinInputChange(e.target.value)}
              placeholder="0"
              className="w-full border rounded px-2 py-1 text-sm focus:ring-2 focus:ring-primary outline-none"
              aria-label="Minimum price"
            />
          </div>
          <div className="flex item-centre text-sm font-medium pt-5">—</div>
          <div className="flex-1">
            <Label className="text-xs">Max</Label>
            <input
              type="text"
              inputMode="numeric"
              value={localRange[1] === 0 && localRange[1] !== priceRange[1] ? "" : localRange[1]}
              onChange={(e) => handleMaxInputChange(e.target.value)}
              placeholder="10000"
              className="w-full border rounded px-2 py-1 text-sm focus:ring-2 focus:ring-primary outline-none"
              aria-label="Maximum price"
            />
          </div>
        </div>

        {/* Slider */}
        <div>
          <div className="mb-2 text-xs text-muted-foreground">
            {displayValue(localRange[0])} — {displayValue(localRange[1])}
          </div>
          <Slider
            min={SLIDER_MIN}
            max={SLIDER_MAX}
            step={SLIDER_STEP}
            value={localRange}
            onValueChange={(v) => handleSliderChange(v as [number, number])}
            className="mt-2"
            aria-label="Price range slider"
          />
        </div>
      </div>

      {/* Categories */}
      <div>
        <Label className="text-sm font-semibold mb-3 block">Categories</Label>
        <div className="space-y-2">
          {categories.map((category) => (
            <div key={category} className="flex items-center space-x-2">
              <Checkbox
                id={category}
                checked={selectedCategories.includes(category)}
                onCheckedChange={() => onCategoryChange(category)}
              />
              <label
                htmlFor={category}
                className="text-sm cursor-pointer leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {category}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Colors */}
      <div>
        <Label className="text-sm font-semibold mb-3 block">Colors</Label>
        <div className="grid grid-cols-6 gap-2">
          {colors.map((color) => (
            <button
              key={color}
              onClick={() => onColorChange(color)}
              className={`w-10 h-10 rounded-full border-2 transition-all ${
                selectedColors.includes(color) ? "border-primary scale-110" : "border-border hover:scale-105"
              }`}
              style={{ backgroundColor: ((): string => {
                const map: Record<string, string> = {
                  Black: "#000000",
                  White: "#FFFFFF",
                  Brown: "#8B4513",
                  Beige: "#F5F5DC",
                  Green: "#228B22",
                  Orange: "#FF8C00",
                };
                return map[color] ?? color;
              })() }}
              title={color}
              aria-label={`Filter by color ${color}`}
            />
          ))}
        </div>
      </div>
    </Card>
  );
};