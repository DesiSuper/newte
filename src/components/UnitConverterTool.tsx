import React, { useState, useMemo } from 'react';
import {
  ArrowLeftRight,
  Scale,
  Ruler,
  Thermometer,
  Gauge,
  HardDrive,
  Clock,
  Box,
  Copy,
  Check,
  Zap,
} from 'lucide-react';

interface UnitConverterToolProps {
  theme: 'dark' | 'light';
}

type UnitCategory =
  | 'length'
  | 'weight'
  | 'temperature'
  | 'area'
  | 'volume'
  | 'speed'
  | 'storage'
  | 'time'
  | 'pressure';

interface UnitDef {
  id: string;
  name: string;
  symbol: string;
  toBase: (val: number) => number;
  fromBase: (baseVal: number) => number;
}

const CATEGORIES: { id: UnitCategory; name: string; icon: React.ElementType }[] = [
  { id: 'length', name: 'Length', icon: Ruler },
  { id: 'weight', name: 'Weight / Mass', icon: Scale },
  { id: 'temperature', name: 'Temperature', icon: Thermometer },
  { id: 'area', name: 'Area', icon: Box },
  { id: 'volume', name: 'Volume', icon: Box },
  { id: 'speed', name: 'Speed', icon: Gauge },
  { id: 'storage', name: 'Digital Storage', icon: HardDrive },
  { id: 'time', name: 'Time', icon: Clock },
  { id: 'pressure', name: 'Pressure', icon: Gauge },
];

const UNITS_CONFIG: Record<UnitCategory, UnitDef[]> = {
  length: [
    { id: 'm', name: 'Meter', symbol: 'm', toBase: (v) => v, fromBase: (b) => b },
    { id: 'km', name: 'Kilometer', symbol: 'km', toBase: (v) => v * 1000, fromBase: (b) => b / 1000 },
    { id: 'cm', name: 'Centimeter', symbol: 'cm', toBase: (v) => v * 0.01, fromBase: (b) => b / 0.01 },
    { id: 'mm', name: 'Millimeter', symbol: 'mm', toBase: (v) => v * 0.001, fromBase: (b) => b / 0.001 },
    { id: 'mi', name: 'Mile', symbol: 'mi', toBase: (v) => v * 1609.344, fromBase: (b) => b / 1609.344 },
    { id: 'yd', name: 'Yard', symbol: 'yd', toBase: (v) => v * 0.9144, fromBase: (b) => b / 0.9144 },
    { id: 'ft', name: 'Foot', symbol: 'ft', toBase: (v) => v * 0.3048, fromBase: (b) => b / 0.3048 },
    { id: 'in', name: 'Inch', symbol: 'in', toBase: (v) => v * 0.0254, fromBase: (b) => b / 0.0254 },
    { id: 'nmi', name: 'Nautical Mile', symbol: 'nmi', toBase: (v) => v * 1852, fromBase: (b) => b / 1852 },
  ],
  weight: [
    { id: 'kg', name: 'Kilogram', symbol: 'kg', toBase: (v) => v, fromBase: (b) => b },
    { id: 'g', name: 'Gram', symbol: 'g', toBase: (v) => v * 0.001, fromBase: (b) => b / 0.001 },
    { id: 'mg', name: 'Milligram', symbol: 'mg', toBase: (v) => v * 0.000001, fromBase: (b) => b / 0.000001 },
    { id: 't', name: 'Metric Ton', symbol: 't', toBase: (v) => v * 1000, fromBase: (b) => b / 1000 },
    { id: 'lb', name: 'Pound', symbol: 'lb', toBase: (v) => v * 0.45359237, fromBase: (b) => b / 0.45359237 },
    { id: 'oz', name: 'Ounce', symbol: 'oz', toBase: (v) => v * 0.028349523, fromBase: (b) => b / 0.028349523 },
    { id: 'st', name: 'Stone', symbol: 'st', toBase: (v) => v * 6.35029, fromBase: (b) => b / 6.35029 },
  ],
  temperature: [
    { id: 'c', name: 'Celsius', symbol: '°C', toBase: (v) => v, fromBase: (b) => b },
    { id: 'f', name: 'Fahrenheit', symbol: '°F', toBase: (v) => ((v - 32) * 5) / 9, fromBase: (b) => (b * 9) / 5 + 32 },
    { id: 'k', name: 'Kelvin', symbol: 'K', toBase: (v) => v - 273.15, fromBase: (b) => b + 273.15 },
  ],
  area: [
    { id: 'sqm', name: 'Square Meter', symbol: 'm²', toBase: (v) => v, fromBase: (b) => b },
    { id: 'sqkm', name: 'Square Kilometer', symbol: 'km²', toBase: (v) => v * 1000000, fromBase: (b) => b / 1000000 },
    { id: 'sqft', name: 'Square Foot', symbol: 'ft²', toBase: (v) => v * 0.092903, fromBase: (b) => b / 0.092903 },
    { id: 'acre', name: 'Acre', symbol: 'ac', toBase: (v) => v * 4046.856, fromBase: (b) => b / 4046.856 },
    { id: 'ha', name: 'Hectare', symbol: 'ha', toBase: (v) => v * 10000, fromBase: (b) => b / 10000 },
    { id: 'sqmi', name: 'Square Mile', symbol: 'mi²', toBase: (v) => v * 2589988.1, fromBase: (b) => b / 2589988.1 },
    { id: 'sqyd', name: 'Square Yard', symbol: 'yd²', toBase: (v) => v * 0.836127, fromBase: (b) => b / 0.836127 },
  ],
  volume: [
    { id: 'l', name: 'Liter', symbol: 'L', toBase: (v) => v, fromBase: (b) => b },
    { id: 'ml', name: 'Milliliter', symbol: 'mL', toBase: (v) => v * 0.001, fromBase: (b) => b / 0.001 },
    { id: 'gal', name: 'Gallon (US)', symbol: 'gal', toBase: (v) => v * 3.78541, fromBase: (b) => b / 3.78541 },
    { id: 'qt', name: 'Quart (US)', symbol: 'qt', toBase: (v) => v * 0.946353, fromBase: (b) => b / 0.946353 },
    { id: 'pt', name: 'Pint (US)', symbol: 'pt', toBase: (v) => v * 0.473176, fromBase: (b) => b / 0.473176 },
    { id: 'cup', name: 'Cup (US)', symbol: 'cup', toBase: (v) => v * 0.236588, fromBase: (b) => b / 0.236588 },
    { id: 'floz', name: 'Fluid Ounce (US)', symbol: 'fl oz', toBase: (v) => v * 0.0295735, fromBase: (b) => b / 0.0295735 },
    { id: 'm3', name: 'Cubic Meter', symbol: 'm³', toBase: (v) => v * 1000, fromBase: (b) => b / 1000 },
  ],
  speed: [
    { id: 'kmh', name: 'Kilometer per hour', symbol: 'km/h', toBase: (v) => v, fromBase: (b) => b },
    { id: 'mph', name: 'Miles per hour', symbol: 'mph', toBase: (v) => v * 1.60934, fromBase: (b) => b / 1.60934 },
    { id: 'ms', name: 'Meter per second', symbol: 'm/s', toBase: (v) => v * 3.6, fromBase: (b) => b / 3.6 },
    { id: 'kn', name: 'Knot', symbol: 'kn', toBase: (v) => v * 1.852, fromBase: (b) => b / 1.852 },
    { id: 'fts', name: 'Feet per second', symbol: 'ft/s', toBase: (v) => v * 1.09728, fromBase: (b) => b / 1.09728 },
  ],
  storage: [
    { id: 'b', name: 'Byte', symbol: 'B', toBase: (v) => v, fromBase: (b) => b },
    { id: 'kb', name: 'Kilobyte', symbol: 'KB', toBase: (v) => v * 1024, fromBase: (b) => b / 1024 },
    { id: 'mb', name: 'Megabyte', symbol: 'MB', toBase: (v) => v * 1024 * 1024, fromBase: (b) => b / (1024 * 1024) },
    { id: 'gb', name: 'Gigabyte', symbol: 'GB', toBase: (v) => v * 1024 ** 3, fromBase: (b) => b / 1024 ** 3 },
    { id: 'tb', name: 'Terabyte', symbol: 'TB', toBase: (v) => v * 1024 ** 4, fromBase: (b) => b / 1024 ** 4 },
    { id: 'pb', name: 'Petabyte', symbol: 'PB', toBase: (v) => v * 1024 ** 5, fromBase: (b) => b / 1024 ** 5 },
  ],
  time: [
    { id: 's', name: 'Second', symbol: 's', toBase: (v) => v, fromBase: (b) => b },
    { id: 'ms', name: 'Millisecond', symbol: 'ms', toBase: (v) => v * 0.001, fromBase: (b) => b / 0.001 },
    { id: 'min', name: 'Minute', symbol: 'min', toBase: (v) => v * 60, fromBase: (b) => b / 60 },
    { id: 'h', name: 'Hour', symbol: 'hr', toBase: (v) => v * 3600, fromBase: (b) => b / 3600 },
    { id: 'd', name: 'Day', symbol: 'day', toBase: (v) => v * 86400, fromBase: (b) => b / 86400 },
    { id: 'wk', name: 'Week', symbol: 'wk', toBase: (v) => v * 604800, fromBase: (b) => b / 604800 },
    { id: 'mo', name: 'Month (30d)', symbol: 'mo', toBase: (v) => v * 2592000, fromBase: (b) => b / 2592000 },
    { id: 'yr', name: 'Year (365d)', symbol: 'yr', toBase: (v) => v * 31536000, fromBase: (b) => b / 31536000 },
  ],
  pressure: [
    { id: 'pa', name: 'Pascal', symbol: 'Pa', toBase: (v) => v, fromBase: (b) => b },
    { id: 'bar', name: 'Bar', symbol: 'bar', toBase: (v) => v * 100000, fromBase: (b) => b / 100000 },
    { id: 'psi', name: 'Pound / sq inch', symbol: 'psi', toBase: (v) => v * 6894.76, fromBase: (b) => b / 6894.76 },
    { id: 'atm', name: 'Standard Atmosphere', symbol: 'atm', toBase: (v) => v * 101325, fromBase: (b) => b / 101325 },
    { id: 'torr', name: 'Torr (mmHg)', symbol: 'Torr', toBase: (v) => v * 133.322, fromBase: (b) => b / 133.322 },
  ],
};

export function UnitConverterTool({ theme }: UnitConverterToolProps) {
  const [category, setCategory] = useState<UnitCategory>('length');
  const [fromUnitId, setFromUnitId] = useState<string>('m');
  const [toUnitId, setToUnitId] = useState<string>('ft');
  const [fromValue, setFromValue] = useState<string>('1');
  const [copied, setCopied] = useState<boolean>(false);
  const [precision, setPrecision] = useState<number>(4);

  // Switch category
  const handleCategoryChange = (cat: UnitCategory) => {
    setCategory(cat);
    const units = UNITS_CONFIG[cat];
    setFromUnitId(units[0].id);
    setToUnitId(units[1] ? units[1].id : units[0].id);
  };

  // Units list for current category
  const units = UNITS_CONFIG[category];
  const fromDef = units.find((u) => u.id === fromUnitId) || units[0];
  const toDef = units.find((u) => u.id === toUnitId) || units[1] || units[0];

  // Bidirectional calculations
  const parsedFrom = parseFloat(fromValue) || 0;
  const baseValue = fromDef.toBase(parsedFrom);
  const convertedValue = toDef.fromBase(baseValue);

  // Format number
  const formatNumber = (num: number) => {
    if (isNaN(num)) return '0';
    if (Math.abs(num) < 0.0001 && num !== 0) {
      return num.toExponential(4);
    }
    const factor = Math.pow(10, precision);
    return (Math.round(num * factor) / factor).toLocaleString(undefined, {
      maximumFractionDigits: precision,
    });
  };

  // Swap From & To
  const handleSwap = () => {
    const tempUnit = fromUnitId;
    setFromUnitId(toUnitId);
    setToUnitId(tempUnit);
  };

  // Copy result
  const handleCopy = () => {
    const text = `${formatNumber(parsedFrom)} ${fromDef.symbol} = ${formatNumber(convertedValue)} ${toDef.symbol}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // All Units Comparison Table
  const comparisonList = useMemo(() => {
    return units.map((u) => {
      const val = u.fromBase(baseValue);
      return {
        unit: u,
        value: formatNumber(val),
      };
    });
  }, [units, baseValue, precision]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Category Navigation Pills */}
      <div className="p-3 rounded-2xl glass-card">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin text-xs">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = category === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => handleCategoryChange(cat.id)}
                className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 font-medium cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white font-bold shadow-md shadow-sky-950/20'
                    : theme === 'dark'
                    ? 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Primary Converter Card */}
      <div className="p-6 sm:p-8 rounded-3xl glass-card space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
          <div>
            <h3 className={`font-display text-xl sm:text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              {CATEGORIES.find((c) => c.id === category)?.name} Converter
            </h3>
            <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
              Instant bidirectional precision conversion with complete unit spectrum
            </p>
          </div>

          {/* Quick value chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-[11px] font-mono ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Quick:</span>
            {[1, 5, 10, 25, 50, 100].map((val) => (
              <button
                key={val}
                onClick={() => setFromValue(String(val))}
                className={`text-[11px] px-2 py-1 rounded-lg border font-mono transition-colors cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-white/[0.03] border-white/[0.08] text-slate-300 hover:border-sky-500 hover:text-sky-400'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-sky-500 hover:text-sky-600'
                }`}
              >
                {val}
              </button>
            ))}
          </div>
        </div>

        {/* Input & Output Row with Swap Button in Center */}
        <div className="grid grid-cols-1 md:grid-cols-11 gap-4 items-center">
          {/* FROM Unit Box (5 cols) */}
          <div className="md:col-span-5 space-y-2">
            <label className={`text-xs font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
              From Unit
            </label>
            <div className="space-y-2">
              <input
                type="number"
                value={fromValue}
                onChange={(e) => setFromValue(e.target.value)}
                className={`w-full px-4 py-3.5 rounded-2xl text-xl font-bold border focus:outline-none focus:ring-2 focus:ring-sky-500/20 ${
                  theme === 'dark'
                    ? 'bg-[#0D0F17] border-white/[0.09] text-white focus:border-sky-500'
                    : 'bg-white border-slate-300 text-slate-900 focus:border-sky-500'
                }`}
              />
              <select
                value={fromUnitId}
                onChange={(e) => setFromUnitId(e.target.value)}
                className={`w-full px-3 py-2.5 rounded-xl text-xs font-medium border ${
                  theme === 'dark'
                    ? 'bg-[#0D0F17] border-white/[0.09] text-white'
                    : 'bg-white border-slate-300 text-slate-900'
                }`}
              >
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.symbol})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* SWAP BUTTON (1 col) */}
          <div className="md:col-span-1 flex items-center justify-center pt-5">
            <button
              onClick={handleSwap}
              className={`p-3.5 rounded-2xl border transition-all hover:scale-110 active:scale-95 cursor-pointer shadow-md ${
                theme === 'dark'
                  ? 'bg-sky-500/10 border-sky-500/30 text-sky-400 hover:bg-sky-500/20'
                  : 'bg-sky-50 border-sky-200 text-sky-600 hover:bg-sky-100'
              }`}
              title="Swap units"
            >
              <ArrowLeftRight className="w-5 h-5" />
            </button>
          </div>

          {/* TO Unit Box (5 cols) */}
          <div className="md:col-span-5 space-y-2">
            <label className={`text-xs font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
              To Converted Unit
            </label>
            <div className="space-y-2">
              <div
                className={`w-full px-4 py-3.5 rounded-2xl text-xl font-bold border flex items-center justify-between ${
                  theme === 'dark'
                    ? 'bg-sky-500/10 border-sky-500/30 text-sky-300'
                    : 'bg-sky-50 border-sky-200 text-sky-700'
                }`}
              >
                <span className="truncate">{formatNumber(convertedValue)}</span>
                <span className="text-sm font-mono opacity-80 shrink-0 ml-2">{toDef.symbol}</span>
              </div>
              <select
                value={toUnitId}
                onChange={(e) => setToUnitId(e.target.value)}
                className={`w-full px-3 py-2.5 rounded-xl text-xs font-medium border ${
                  theme === 'dark'
                    ? 'bg-[#0D0F17] border-white/[0.09] text-white'
                    : 'bg-white border-slate-300 text-slate-900'
                }`}
              >
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.symbol})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Bottom Formula & Copy Banner */}
        <div className="p-4 rounded-2xl border border-white/10 bg-black/10 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs font-mono text-slate-400">
            1 {fromDef.name} = {formatNumber(toDef.fromBase(fromDef.toBase(1)))} {toDef.name}s
          </div>

          <div className="flex items-center gap-3">
            {/* Precision dropdown */}
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span>Decimals:</span>
              <select
                value={precision}
                onChange={(e) => setPrecision(Number(e.target.value))}
                className={`px-2 py-1 rounded-lg border text-xs ${
                  theme === 'dark' ? 'bg-[#0D0F17] border-white/10 text-white' : 'bg-white border-slate-300'
                }`}
              >
                <option value={2}>2</option>
                <option value={4}>4</option>
                <option value={6}>6</option>
              </select>
            </div>

            <button
              onClick={handleCopy}
              className={`px-3.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                theme === 'dark' ? 'bg-white/10 hover:bg-white/15 text-white' : 'bg-white hover:bg-slate-100 text-slate-800'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Complete Unit Spectrum Matrix Card */}
      <div className="p-6 rounded-3xl glass-card space-y-4">
        <h4 className={`text-sm font-bold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
          <Zap className="w-4 h-4 text-sky-400" />
          <span>All Equivalent Units for {formatNumber(parsedFrom)} {fromDef.symbol}</span>
        </h4>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {comparisonList.map((item) => (
            <div
              key={item.unit.id}
              onClick={() => setToUnitId(item.unit.id)}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                toUnitId === item.unit.id
                  ? 'border-sky-500 bg-sky-500/10 shadow-sm'
                  : theme === 'dark'
                  ? 'bg-[#0D0F17] border-white/[0.06] hover:border-white/20'
                  : 'bg-slate-50 border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-semibold text-slate-400">{item.unit.name}</span>
                <span className="font-mono text-[10px] text-sky-400 font-bold">{item.unit.symbol}</span>
              </div>
              <div className={`font-mono text-base font-bold truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                {item.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
