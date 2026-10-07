import React, { useState } from 'react';
import {
  Percent,
  TrendingUp,
  TrendingDown,
  Copy,
  Check,
  RefreshCw,
  Tag,
  ArrowRight,
  Divide,
  DollarSign,
  Calculator,
  ArrowLeftRight,
} from 'lucide-react';

interface PercentageCalculatorToolProps {
  theme: 'dark' | 'light';
}

type CalcMode = 'basic' | 'share' | 'change' | 'add_sub' | 'discount' | 'margin' | 'fraction';

export function PercentageCalculatorTool({ theme }: PercentageCalculatorToolProps) {
  const [mode, setMode] = useState<CalcMode>('basic');
  const [copied, setCopied] = useState<boolean>(false);

  // Mode 1: What is X% of Y?
  const [m1Percent, setM1Percent] = useState<string>('15');
  const [m1Value, setM1Value] = useState<string>('240');

  // Mode 2: X is what % of Y?
  const [m2Part, setM2Part] = useState<string>('45');
  const [m2Total, setM2Total] = useState<string>('180');

  // Mode 3: Percentage Increase / Decrease from X to Y
  const [m3From, setM3From] = useState<string>('80');
  const [m3To, setM3To] = useState<string>('120');

  // Mode 4: Add / Subtract %
  const [m4Base, setM4Base] = useState<string>('100');
  const [m4Percent, setM4Percent] = useState<string>('18');
  const [m4Op, setM4Op] = useState<'add' | 'sub'>('add');

  // Mode 5: Discount Calculator
  const [m5Price, setM5Price] = useState<string>('150');
  const [m5Discount, setM5Discount] = useState<string>('25');
  const [m5ExtraCoupon, setM5ExtraCoupon] = useState<string>('0');

  // Mode 6: Profit Margin & Markup
  const [m6Cost, setM6Cost] = useState<string>('50');
  const [m6Revenue, setM6Revenue] = useState<string>('80');

  // Mode 7: Fraction to Percentage
  const [m7Num, setM7Num] = useState<string>('3');
  const [m7Den, setM7Den] = useState<string>('8');

  // Clipboard copy helper
  const copyResult = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Mode Navigation Tabs */}
      <div className="p-3 rounded-2xl glass-card">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin text-xs">
          {[
            { id: 'basic', label: 'X% of Y', icon: Percent },
            { id: 'share', label: 'X is what % of Y', icon: Calculator },
            { id: 'change', label: '% Increase / Decrease', icon: TrendingUp },
            { id: 'add_sub', label: 'Value ± %', icon: ArrowLeftRight },
            { id: 'discount', label: 'Discount & Sale', icon: Tag },
            { id: 'margin', label: 'Profit & Margin', icon: DollarSign },
            { id: 'fraction', label: 'Fraction to %', icon: Divide },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = mode === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setMode(tab.id as CalcMode)}
                className={`px-3 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 font-medium cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold shadow-md shadow-emerald-950/20'
                    : theme === 'dark'
                    ? 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mode 1: What is X% of Y? */}
      {mode === 'basic' && (() => {
        const p = parseFloat(m1Percent) || 0;
        const v = parseFloat(m1Value) || 0;
        const result = (p / 100) * v;

        return (
          <div className="p-6 sm:p-8 rounded-3xl glass-card space-y-6">
            <div className="space-y-1">
              <h3 className={`font-display text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                What is X% of Y?
              </h3>
              <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                Calculate the percentage value of any number or dollar amount
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className={`text-xs font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                  Percentage (X%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={m1Percent}
                    onChange={(e) => setM1Percent(e.target.value)}
                    className={`w-full px-4 py-3 rounded-2xl text-sm border focus:outline-none font-bold ${
                      theme === 'dark' ? 'bg-[#0D0F17] border-white/[0.09] text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                  <span className="absolute right-4 top-3.5 text-slate-400 font-bold">%</span>
                </div>
                {/* Quick Chips */}
                <div className="flex items-center gap-1.5 pt-1">
                  {[5, 10, 15, 18, 20, 25, 50].map((chip) => (
                    <button
                      key={chip}
                      onClick={() => setM1Percent(String(chip))}
                      className="text-[11px] px-2 py-0.5 rounded border border-white/10 text-slate-400 hover:text-emerald-400 cursor-pointer"
                    >
                      {chip}%
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className={`text-xs font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                  Total Number (Y)
                </label>
                <input
                  type="number"
                  value={m1Value}
                  onChange={(e) => setM1Value(e.target.value)}
                  className={`w-full px-4 py-3 rounded-2xl text-sm border focus:outline-none font-bold ${
                    theme === 'dark' ? 'bg-[#0D0F17] border-white/[0.09] text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>
            </div>

            {/* Result Display */}
            <div className="p-6 rounded-2xl border-2 border-emerald-500/30 bg-emerald-500/10 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider">Calculated Result</span>
                <div className="font-display text-4xl sm:text-5xl font-extrabold text-emerald-500 mt-1">
                  {Number.isInteger(result) ? result : result.toFixed(2)}
                </div>
                <p className="text-xs text-slate-400 mt-1 font-mono">
                  Formula: ({p} / 100) × {v} = {result.toFixed(2)}
                </p>
              </div>

              <button
                onClick={() => copyResult(String(result))}
                className="px-4 py-2.5 rounded-xl border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2 hover:bg-emerald-500/20 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy Result'}</span>
              </button>
            </div>
          </div>
        );
      })()}

      {/* Mode 2: X is what % of Y? */}
      {mode === 'share' && (() => {
        const part = parseFloat(m2Part) || 0;
        const total = parseFloat(m2Total) || 0;
        const percent = total !== 0 ? (part / total) * 100 : 0;

        return (
          <div className="p-6 sm:p-8 rounded-3xl glass-card space-y-6">
            <div className="space-y-1">
              <h3 className={`font-display text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                X is what percent of Y?
              </h3>
              <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                Find out what percentage a portion represents of the whole
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className={`text-xs font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                  Part / Portions (X)
                </label>
                <input
                  type="number"
                  value={m2Part}
                  onChange={(e) => setM2Part(e.target.value)}
                  className={`w-full px-4 py-3 rounded-2xl text-sm border focus:outline-none font-bold ${
                    theme === 'dark' ? 'bg-[#0D0F17] border-white/[0.09] text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="space-y-2">
                <label className={`text-xs font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                  Total Whole (Y)
                </label>
                <input
                  type="number"
                  value={m2Total}
                  onChange={(e) => setM2Total(e.target.value)}
                  className={`w-full px-4 py-3 rounded-2xl text-sm border focus:outline-none font-bold ${
                    theme === 'dark' ? 'bg-[#0D0F17] border-white/[0.09] text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>
            </div>

            <div className="p-6 rounded-2xl border-2 border-emerald-500/30 bg-emerald-500/10 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider">Percentage Share</span>
                <div className="font-display text-4xl sm:text-5xl font-extrabold text-emerald-500 mt-1">
                  {percent.toFixed(2)}%
                </div>
                <p className="text-xs text-slate-400 mt-1 font-mono">
                  Formula: ({part} / {total}) × 100 = {percent.toFixed(2)}%
                </p>
              </div>

              <button
                onClick={() => copyResult(`${percent.toFixed(2)}%`)}
                className="px-4 py-2.5 rounded-xl border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2 hover:bg-emerald-500/20 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
        );
      })()}

      {/* Mode 3: Percentage Increase / Decrease */}
      {mode === 'change' && (() => {
        const from = parseFloat(m3From) || 0;
        const to = parseFloat(m3To) || 0;
        const diff = to - from;
        const changePercent = from !== 0 ? (diff / from) * 100 : 0;
        const isIncrease = diff >= 0;

        return (
          <div className="p-6 sm:p-8 rounded-3xl glass-card space-y-6">
            <div className="space-y-1">
              <h3 className={`font-display text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                Percentage Change (Increase / Decrease)
              </h3>
              <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                Find out the percentage growth or reduction from an original value to a final value
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className={`text-xs font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                  Original Value (From)
                </label>
                <input
                  type="number"
                  value={m3From}
                  onChange={(e) => setM3From(e.target.value)}
                  className={`w-full px-4 py-3 rounded-2xl text-sm border focus:outline-none font-bold ${
                    theme === 'dark' ? 'bg-[#0D0F17] border-white/[0.09] text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="space-y-2">
                <label className={`text-xs font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                  New Value (To)
                </label>
                <input
                  type="number"
                  value={m3To}
                  onChange={(e) => setM3To(e.target.value)}
                  className={`w-full px-4 py-3 rounded-2xl text-sm border focus:outline-none font-bold ${
                    theme === 'dark' ? 'bg-[#0D0F17] border-white/[0.09] text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>
            </div>

            <div
              className={`p-6 rounded-2xl border-2 flex flex-col sm:flex-row items-center justify-between gap-4 ${
                isIncrease
                  ? 'border-emerald-500/30 bg-emerald-500/10'
                  : 'border-rose-500/30 bg-rose-500/10'
              }`}
            >
              <div>
                <span className={`text-xs font-mono uppercase tracking-wider ${isIncrease ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isIncrease ? 'Percentage Increase' : 'Percentage Decrease'}
                </span>
                <div className={`font-display text-4xl sm:text-5xl font-extrabold mt-1 flex items-center gap-2 ${
                  isIncrease ? 'text-emerald-500' : 'text-rose-500'
                }`}>
                  {isIncrease ? <TrendingUp className="w-8 h-8" /> : <TrendingDown className="w-8 h-8" />}
                  <span>{Math.abs(changePercent).toFixed(2)}%</span>
                </div>
                <p className="text-xs text-slate-400 mt-1 font-mono">
                  Absolute difference: {diff >= 0 ? `+${diff}` : diff}
                </p>
              </div>

              <button
                onClick={() => copyResult(`${isIncrease ? '+' : ''}${changePercent.toFixed(2)}%`)}
                className="px-4 py-2.5 rounded-xl border border-white/20 text-xs font-bold flex items-center gap-2 hover:bg-white/10 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Copy</span>
              </button>
            </div>
          </div>
        );
      })()}

      {/* Mode 4: Add / Subtract % */}
      {mode === 'add_sub' && (() => {
        const base = parseFloat(m4Base) || 0;
        const pct = parseFloat(m4Percent) || 0;
        const delta = (pct / 100) * base;
        const finalVal = m4Op === 'add' ? base + delta : base - delta;

        return (
          <div className="p-6 sm:p-8 rounded-3xl glass-card space-y-6">
            <div className="space-y-1">
              <h3 className={`font-display text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                Add or Subtract Percentage (Value ± %)
              </h3>
              <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                Easily add sales tax/GST or deduct discount percentages from an amount
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
              <div className="space-y-2">
                <label className={`text-xs font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                  Initial Base Value
                </label>
                <input
                  type="number"
                  value={m4Base}
                  onChange={(e) => setM4Base(e.target.value)}
                  className={`w-full px-4 py-3 rounded-2xl text-sm border focus:outline-none font-bold ${
                    theme === 'dark' ? 'bg-[#0D0F17] border-white/[0.09] text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="space-y-2">
                <label className={`text-xs font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                  Operation
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setM4Op('add')}
                    className={`py-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      m4Op === 'add'
                        ? 'bg-emerald-500 border-emerald-400 text-white'
                        : theme === 'dark'
                        ? 'bg-[#0D0F17] border-white/10 text-slate-400'
                        : 'bg-slate-100 border-slate-200 text-slate-600'
                    }`}
                  >
                    + Add % (Tax)
                  </button>
                  <button
                    onClick={() => setM4Op('sub')}
                    className={`py-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      m4Op === 'sub'
                        ? 'bg-rose-500 border-rose-400 text-white'
                        : theme === 'dark'
                        ? 'bg-[#0D0F17] border-white/10 text-slate-400'
                        : 'bg-slate-100 border-slate-200 text-slate-600'
                    }`}
                  >
                    - Subtract % (Off)
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className={`text-xs font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                  Percentage Rate
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={m4Percent}
                    onChange={(e) => setM4Percent(e.target.value)}
                    className={`w-full px-4 py-3 rounded-2xl text-sm border focus:outline-none font-bold ${
                      theme === 'dark' ? 'bg-[#0D0F17] border-white/[0.09] text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                  <span className="absolute right-4 top-3.5 text-slate-400 font-bold">%</span>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl border-2 border-emerald-500/30 bg-emerald-500/10 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider">Final Computed Value</span>
                <div className="font-display text-4xl sm:text-5xl font-extrabold text-emerald-500 mt-1">
                  {finalVal.toFixed(2)}
                </div>
                <p className="text-xs text-slate-400 mt-1 font-mono">
                  {m4Op === 'add' ? `Added ${delta.toFixed(2)} (+${pct}%)` : `Deducted ${delta.toFixed(2)} (-${pct}%)`}
                </p>
              </div>

              <button
                onClick={() => copyResult(finalVal.toFixed(2))}
                className="px-4 py-2.5 rounded-xl border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2 hover:bg-emerald-500/20 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Copy</span>
              </button>
            </div>
          </div>
        );
      })()}

      {/* Mode 5: Discount & Sale */}
      {mode === 'discount' && (() => {
        const price = parseFloat(m5Price) || 0;
        const disc = parseFloat(m5Discount) || 0;
        const coupon = parseFloat(m5ExtraCoupon) || 0;

        const mainSavings = (disc / 100) * price;
        const priceAfterMain = price - mainSavings;
        const extraSavings = (coupon / 100) * priceAfterMain;
        const finalPrice = priceAfterMain - extraSavings;
        const totalSaved = mainSavings + extraSavings;

        return (
          <div className="p-6 sm:p-8 rounded-3xl glass-card space-y-6">
            <div className="space-y-1">
              <h3 className={`font-display text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                Discount & Savings Calculator
              </h3>
              <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                Calculate exact sale prices and see how much money you save
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className={`text-xs font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                  Original Price ($ / ₹)
                </label>
                <input
                  type="number"
                  value={m5Price}
                  onChange={(e) => setM5Price(e.target.value)}
                  className={`w-full px-4 py-3 rounded-2xl text-sm border focus:outline-none font-bold ${
                    theme === 'dark' ? 'bg-[#0D0F17] border-white/[0.09] text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="space-y-2">
                <label className={`text-xs font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                  Discount Rate (%)
                </label>
                <input
                  type="number"
                  value={m5Discount}
                  onChange={(e) => setM5Discount(e.target.value)}
                  className={`w-full px-4 py-3 rounded-2xl text-sm border focus:outline-none font-bold ${
                    theme === 'dark' ? 'bg-[#0D0F17] border-white/[0.09] text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="space-y-2">
                <label className={`text-xs font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                  Extra Coupon (% optional)
                </label>
                <input
                  type="number"
                  value={m5ExtraCoupon}
                  onChange={(e) => setM5ExtraCoupon(e.target.value)}
                  className={`w-full px-4 py-3 rounded-2xl text-sm border focus:outline-none font-bold ${
                    theme === 'dark' ? 'bg-[#0D0F17] border-white/[0.09] text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-6 rounded-2xl border-2 border-emerald-500/30 bg-emerald-500/10">
                <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider">Final Price You Pay</span>
                <div className="font-display text-4xl font-extrabold text-emerald-500 mt-1">
                  ${finalPrice.toFixed(2)}
                </div>
              </div>

              <div className="p-6 rounded-2xl border-2 border-amber-500/30 bg-amber-500/10">
                <span className="text-xs font-mono text-amber-400 uppercase tracking-wider">Total You Save</span>
                <div className="font-display text-4xl font-extrabold text-amber-500 mt-1">
                  ${totalSaved.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Mode 6: Profit Margin & Markup */}
      {mode === 'margin' && (() => {
        const cost = parseFloat(m6Cost) || 0;
        const rev = parseFloat(m6Revenue) || 0;
        const profit = rev - cost;
        const margin = rev !== 0 ? (profit / rev) * 100 : 0;
        const markup = cost !== 0 ? (profit / cost) * 100 : 0;

        return (
          <div className="p-6 sm:p-8 rounded-3xl glass-card space-y-6">
            <div className="space-y-1">
              <h3 className={`font-display text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                Profit Margin & Markup Calculator
              </h3>
              <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                Business profit margin, markup percentage, and net gain
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className={`text-xs font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                  Cost of Goods (Cost Price)
                </label>
                <input
                  type="number"
                  value={m6Cost}
                  onChange={(e) => setM6Cost(e.target.value)}
                  className={`w-full px-4 py-3 rounded-2xl text-sm border focus:outline-none font-bold ${
                    theme === 'dark' ? 'bg-[#0D0F17] border-white/[0.09] text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="space-y-2">
                <label className={`text-xs font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                  Selling Price (Revenue)
                </label>
                <input
                  type="number"
                  value={m6Revenue}
                  onChange={(e) => setM6Revenue(e.target.value)}
                  className={`w-full px-4 py-3 rounded-2xl text-sm border focus:outline-none font-bold ${
                    theme === 'dark' ? 'bg-[#0D0F17] border-white/[0.09] text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl border border-white/10 bg-black/10 text-center">
                <span className="text-xs text-slate-400">Gross Profit</span>
                <div className="font-display text-3xl font-bold text-emerald-500 mt-1">
                  ${profit.toFixed(2)}
                </div>
              </div>
              <div className="p-5 rounded-2xl border border-white/10 bg-black/10 text-center">
                <span className="text-xs text-slate-400">Profit Margin %</span>
                <div className="font-display text-3xl font-bold text-teal-400 mt-1">
                  {margin.toFixed(2)}%
                </div>
              </div>
              <div className="p-5 rounded-2xl border border-white/10 bg-black/10 text-center">
                <span className="text-xs text-slate-400">Markup %</span>
                <div className="font-display text-3xl font-bold text-sky-400 mt-1">
                  {markup.toFixed(2)}%
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Mode 7: Fraction to Percentage */}
      {mode === 'fraction' && (() => {
        const num = parseFloat(m7Num) || 0;
        const den = parseFloat(m7Den) || 1;
        const pct = den !== 0 ? (num / den) * 100 : 0;

        return (
          <div className="p-6 sm:p-8 rounded-3xl glass-card space-y-6">
            <div className="space-y-1">
              <h3 className={`font-display text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                Fraction to Percentage
              </h3>
              <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                Convert any fraction into its equivalent percentage
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className={`text-xs font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                  Numerator (Top)
                </label>
                <input
                  type="number"
                  value={m7Num}
                  onChange={(e) => setM7Num(e.target.value)}
                  className={`w-full px-4 py-3 rounded-2xl text-sm border focus:outline-none font-bold ${
                    theme === 'dark' ? 'bg-[#0D0F17] border-white/[0.09] text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="space-y-2">
                <label className={`text-xs font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                  Denominator (Bottom)
                </label>
                <input
                  type="number"
                  value={m7Den}
                  onChange={(e) => setM7Den(e.target.value)}
                  className={`w-full px-4 py-3 rounded-2xl text-sm border focus:outline-none font-bold ${
                    theme === 'dark' ? 'bg-[#0D0F17] border-white/[0.09] text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>
            </div>

            <div className="p-6 rounded-2xl border-2 border-emerald-500/30 bg-emerald-500/10 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider">Converted Percentage</span>
                <div className="font-display text-4xl sm:text-5xl font-extrabold text-emerald-500 mt-1">
                  {pct.toFixed(2)}%
                </div>
                <p className="text-xs text-slate-400 mt-1 font-mono">
                  {num}/{den} = {(num / den).toFixed(4)} = {pct.toFixed(2)}%
                </p>
              </div>

              <button
                onClick={() => copyResult(`${pct.toFixed(2)}%`)}
                className="px-4 py-2.5 rounded-xl border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2 hover:bg-emerald-500/20 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Copy</span>
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
