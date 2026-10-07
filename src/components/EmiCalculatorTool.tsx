import React, { useState, useMemo } from 'react';
import {
  Landmark,
  CreditCard,
  Coins,
  Copy,
  Check,
  TrendingDown,
  Calendar,
  FileSpreadsheet,
  Download,
  Percent,
  Zap,
  ArrowRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface EmiCalculatorToolProps {
  theme: 'dark' | 'light';
}

type LoanType = 'home' | 'car' | 'personal' | 'education' | 'custom';

interface YearSchedule {
  year: number;
  openingBalance: number;
  totalEmi: number;
  principalPaid: number;
  interestPaid: number;
  closingBalance: number;
}

export function EmiCalculatorTool({ theme }: EmiCalculatorToolProps) {
  const [loanType, setLoanType] = useState<LoanType>('home');
  const [currency, setCurrency] = useState<string>('₹');

  // Core Inputs
  const [principal, setPrincipal] = useState<number>(2500000);
  const [interestRate, setInterestRate] = useState<number>(8.5);
  const [tenureYears, setTenureYears] = useState<number>(20);
  const [tenureMode, setTenureMode] = useState<'years' | 'months'>('years');
  const [tenureMonths, setTenureMonths] = useState<number>(240);

  // Prepayment Simulator
  const [enablePrepay, setEnablePrepay] = useState<boolean>(false);
  const [monthlyExtra, setMonthlyExtra] = useState<number>(5000);

  // UI state
  const [copied, setCopied] = useState<boolean>(false);
  const [showFullSchedule, setShowFullSchedule] = useState<boolean>(false);

  // Apply Presets
  const applyPreset = (type: LoanType) => {
    setLoanType(type);
    switch (type) {
      case 'home':
        setPrincipal(3500000);
        setInterestRate(8.5);
        setTenureYears(20);
        setTenureMonths(240);
        break;
      case 'car':
        setPrincipal(800000);
        setInterestRate(9.2);
        setTenureYears(5);
        setTenureMonths(60);
        break;
      case 'personal':
        setPrincipal(300000);
        setInterestRate(12.5);
        setTenureYears(3);
        setTenureMonths(36);
        break;
      case 'education':
        setPrincipal(1200000);
        setInterestRate(10.0);
        setTenureYears(7);
        setTenureMonths(84);
        break;
      case 'custom':
        break;
    }
  };

  const totalMonths = tenureMode === 'years' ? tenureYears * 12 : tenureMonths;

  // Calculate Standard EMI & Amortization
  const emiData = useMemo(() => {
    const P = principal;
    const r = interestRate / 12 / 100; // Monthly interest rate
    const n = totalMonths;

    if (P <= 0 || r <= 0 || n <= 0) {
      return {
        emi: 0,
        totalInterest: 0,
        totalPayment: 0,
        principalPercent: 100,
        interestPercent: 0,
        yearlySchedule: [],
      };
    }

    // Standard EMI formula: E = P * r * (1+r)^n / ((1+r)^n - 1)
    const emi = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    const totalPayment = emi * n;
    const totalInterest = totalPayment - P;

    const principalPercent = (P / totalPayment) * 100;
    const interestPercent = (totalInterest / totalPayment) * 100;

    // Amortization Schedule by Year
    const yearlySchedule: YearSchedule[] = [];
    let currentBalance = P;

    for (let yr = 1; yr <= Math.ceil(n / 12); yr++) {
      let yrPrincipal = 0;
      let yrInterest = 0;
      let yrEmi = 0;
      const opening = currentBalance;

      const monthsInThisYear = Math.min(12, n - (yr - 1) * 12);

      for (let m = 1; m <= monthsInThisYear; m++) {
        if (currentBalance <= 0) break;
        const interestForMonth = currentBalance * r;
        const principalForMonth = Math.min(currentBalance, emi - interestForMonth);

        yrInterest += interestForMonth;
        yrPrincipal += principalForMonth;
        yrEmi += principalForMonth + interestForMonth;
        currentBalance -= principalForMonth;
      }

      yearlySchedule.push({
        year: yr,
        openingBalance: Math.round(opening),
        totalEmi: Math.round(yrEmi),
        principalPaid: Math.round(yrPrincipal),
        interestPaid: Math.round(yrInterest),
        closingBalance: Math.max(0, Math.round(currentBalance)),
      });
    }

    return {
      emi: Math.round(emi),
      totalInterest: Math.round(totalInterest),
      totalPayment: Math.round(totalPayment),
      principalPercent,
      interestPercent,
      yearlySchedule,
    };
  }, [principal, interestRate, totalMonths]);

  // Prepayment Impact Computation
  const prepayData = useMemo(() => {
    if (!enablePrepay || monthlyExtra <= 0) return null;

    const P = principal;
    const r = interestRate / 12 / 100;
    const baseEmi = emiData.emi;
    const totalMonthlyPayment = baseEmi + monthlyExtra;

    let balance = P;
    let monthsElapsed = 0;
    let totalInterestPaid = 0;

    while (balance > 0 && monthsElapsed < 1200) {
      monthsElapsed++;
      const interest = balance * r;
      totalInterestPaid += interest;
      const principalPaid = Math.min(balance, totalMonthlyPayment - interest);
      balance -= principalPaid;
    }

    const interestSaved = Math.max(0, emiData.totalInterest - totalInterestPaid);
    const monthsSaved = Math.max(0, totalMonths - monthsElapsed);

    return {
      newMonths: monthsElapsed,
      monthsSaved,
      yearsSaved: (monthsSaved / 12).toFixed(1),
      interestSaved: Math.round(interestSaved),
    };
  }, [enablePrepay, monthlyExtra, principal, interestRate, emiData, totalMonths]);

  // Copy Summary
  const handleCopySummary = () => {
    const text = `Loan EMI Calculation (${loanType.toUpperCase()} LOAN):
Principal: ${currency}${principal.toLocaleString()}
Interest Rate: ${interestRate}% p.a.
Tenure: ${tenureMode === 'years' ? `${tenureYears} Years` : `${tenureMonths} Months`}
Monthly EMI: ${currency}${emiData.emi.toLocaleString()}
Total Interest: ${currency}${emiData.totalInterest.toLocaleString()}
Total Amount Payable: ${currency}${emiData.totalPayment.toLocaleString()}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Export CSV
  const handleExportCsv = () => {
    let csv = 'Year,Opening Balance,Total EMI,Principal Paid,Interest Paid,Closing Balance\n';
    emiData.yearlySchedule.forEach((row) => {
      csv += `${row.year},${row.openingBalance},${row.totalEmi},${row.principalPaid},${row.interestPaid},${row.closingBalance}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `amortization_schedule_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Loan Type Presets Bar */}
      <div className="p-3 rounded-2xl glass-card flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs pb-1 scrollbar-thin">
          {[
            { id: 'home', label: 'Home Loan (8.5%)' },
            { id: 'car', label: 'Car Loan (9.2%)' },
            { id: 'personal', label: 'Personal Loan (12.5%)' },
            { id: 'education', label: 'Education Loan (10.0%)' },
            { id: 'custom', label: 'Custom Loan' },
          ].map((preset) => (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset.id as LoanType)}
              className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap font-semibold cursor-pointer ${
                loanType === preset.id
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md'
                  : theme === 'dark'
                  ? 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Currency Switcher */}
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-slate-400">Currency:</span>
          {['₹', '$', '€', '£'].map((c) => (
            <button
              key={c}
              onClick={() => setCurrency(c)}
              className={`w-7 h-7 rounded-lg border font-bold text-xs cursor-pointer ${
                currency === c
                  ? 'bg-emerald-500 border-emerald-400 text-white'
                  : theme === 'dark'
                  ? 'border-white/10 text-slate-400'
                  : 'border-slate-200 text-slate-600'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Main Inputs & Instant EMI Results Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Sliders & Inputs (6 cols) */}
        <div className="lg:col-span-6 space-y-5">
          <div className="p-6 sm:p-7 rounded-3xl glass-card space-y-6">
            {/* Principal Loan Amount */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>
                  Loan Amount (Principal)
                </span>
                <span className="font-mono text-emerald-400 font-bold text-sm">
                  {currency}{principal.toLocaleString()}
                </span>
              </div>
              <input
                type="number"
                min="10000"
                max="50000000"
                step="50000"
                value={principal}
                onChange={(e) => setPrincipal(Number(e.target.value))}
                className={`w-full px-4 py-2.5 rounded-xl text-base font-bold border focus:outline-none ${
                  theme === 'dark' ? 'bg-[#0D0F17] border-white/10 text-white' : 'bg-white border-slate-300'
                }`}
              />
              <input
                type="range"
                min="100000"
                max="10000000"
                step="50000"
                value={principal}
                onChange={(e) => setPrincipal(Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                <span>{currency}1 Lakh</span>
                <span>{currency}50 Lakh</span>
                <span>{currency}1 Crore</span>
              </div>
            </div>

            {/* Interest Rate Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>
                  Interest Rate (% p.a.)
                </span>
                <span className="font-mono text-emerald-400 font-bold text-sm">
                  {interestRate}%
                </span>
              </div>
              <input
                type="number"
                min="1"
                max="30"
                step="0.1"
                value={interestRate}
                onChange={(e) => setInterestRate(Number(e.target.value))}
                className={`w-full px-4 py-2.5 rounded-xl text-base font-bold border focus:outline-none ${
                  theme === 'dark' ? 'bg-[#0D0F17] border-white/10 text-white' : 'bg-white border-slate-300'
                }`}
              />
              <input
                type="range"
                min="5"
                max="20"
                step="0.1"
                value={interestRate}
                onChange={(e) => setInterestRate(Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>

            {/* Loan Tenure */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>
                  Loan Tenure
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setTenureMode('years')}
                    className={`text-[11px] px-2 py-0.5 rounded cursor-pointer ${
                      tenureMode === 'years'
                        ? 'bg-emerald-500 text-white font-bold'
                        : 'text-slate-400'
                    }`}
                  >
                    Years
                  </button>
                  <button
                    onClick={() => setTenureMode('months')}
                    className={`text-[11px] px-2 py-0.5 rounded cursor-pointer ${
                      tenureMode === 'months'
                        ? 'bg-emerald-500 text-white font-bold'
                        : 'text-slate-400'
                    }`}
                  >
                    Months
                  </button>
                </div>
              </div>

              {tenureMode === 'years' ? (
                <>
                  <input
                    type="range"
                    min="1"
                    max="30"
                    value={tenureYears}
                    onChange={(e) => {
                      const yr = Number(e.target.value);
                      setTenureYears(yr);
                      setTenureMonths(yr * 12);
                    }}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400">{tenureYears} Years</span>
                    <span className="text-slate-500">({tenureYears * 12} Installments)</span>
                  </div>
                </>
              ) : (
                <>
                  <input
                    type="range"
                    min="6"
                    max="360"
                    step="6"
                    value={tenureMonths}
                    onChange={(e) => {
                      const m = Number(e.target.value);
                      setTenureMonths(m);
                      setTenureYears(Math.round(m / 12));
                    }}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400">{tenureMonths} Months</span>
                    <span className="text-slate-500">({(tenureMonths / 12).toFixed(1)} Years)</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Highlighted EMI Cards & Donut Breakdown (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="p-6 sm:p-7 rounded-3xl glass-card space-y-5 border-2 border-emerald-500/30">
            {/* Top Monthly EMI Banner */}
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-bold">
                  Equated Monthly Installment (EMI)
                </span>
                <div className="font-display text-4xl sm:text-5xl font-extrabold text-emerald-500 mt-1">
                  {currency}{emiData.emi.toLocaleString()}
                  <span className="text-xs text-slate-400 font-mono ml-2 font-normal">/ month</span>
                </div>
              </div>

              <button
                onClick={handleCopySummary}
                className="px-3.5 py-2 rounded-xl border border-white/10 text-xs font-bold text-emerald-300 hover:bg-emerald-500/10 cursor-pointer flex items-center gap-1.5"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            {/* Total Interest & Total Payment */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-2xl bg-black/10 border border-white/5 space-y-1">
                <span className="text-[11px] text-slate-400 font-mono">Principal Amount</span>
                <div className="font-mono text-lg font-bold text-white">
                  {currency}{principal.toLocaleString()}
                </div>
                <div className="text-[10px] text-emerald-400 font-mono">
                  {emiData.principalPercent.toFixed(1)}% of total
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-black/10 border border-white/5 space-y-1">
                <span className="text-[11px] text-slate-400 font-mono">Total Interest</span>
                <div className="font-mono text-lg font-bold text-amber-400">
                  {currency}{emiData.totalInterest.toLocaleString()}
                </div>
                <div className="text-[10px] text-amber-400 font-mono">
                  {emiData.interestPercent.toFixed(1)}% of total
                </div>
              </div>
            </div>

            {/* Total Payment Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Total Amount Payable (P + I):</span>
                <span className="font-mono font-bold text-base text-white">
                  {currency}{emiData.totalPayment.toLocaleString()}
                </span>
              </div>

              {/* Progress bar ratio */}
              <div className="w-full h-3 rounded-full overflow-hidden bg-black/30 flex">
                <div
                  style={{ width: `${emiData.principalPercent}%` }}
                  className="bg-emerald-500 h-full transition-all duration-300"
                  title={`Principal: ${emiData.principalPercent.toFixed(1)}%`}
                />
                <div
                  style={{ width: `${emiData.interestPercent}%` }}
                  className="bg-amber-400 h-full transition-all duration-300"
                  title={`Interest: ${emiData.interestPercent.toFixed(1)}%`}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  Principal Share ({emiData.principalPercent.toFixed(1)}%)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                  Interest Share ({emiData.interestPercent.toFixed(1)}%)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Prepayment / Part-Payment Simulator Feature */}
      <div className="p-6 rounded-3xl glass-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center font-bold">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h4 className={`text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                Smart Prepayment Simulator
              </h4>
              <p className="text-[11px] text-slate-400">
                See how paying a small extra amount monthly reduces interest and cuts loan tenure
              </p>
            </div>
          </div>

          <button
            onClick={() => setEnablePrepay(!enablePrepay)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer ${
              enablePrepay
                ? 'bg-teal-500 border-teal-400 text-white'
                : 'border-white/10 text-slate-400'
            }`}
          >
            {enablePrepay ? 'Simulator Active' : 'Enable Simulator'}
          </button>
        </div>

        {enablePrepay && (
          <div className="p-4 rounded-2xl bg-black/10 border border-white/5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs">
                <span className="text-slate-400">Extra Monthly Payment:</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-bold text-teal-400 font-mono">+{currency}</span>
                  <input
                    type="number"
                    step="1000"
                    value={monthlyExtra}
                    onChange={(e) => setMonthlyExtra(Number(e.target.value))}
                    className="w-32 px-3 py-1.5 rounded-lg border text-xs font-mono font-bold bg-[#0D0F17] text-white"
                  />
                </div>
              </div>

              {prepayData && (
                <div className="grid grid-cols-2 gap-3 text-right">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase">Interest Saved</span>
                    <div className="font-mono text-base font-bold text-emerald-400">
                      {currency}{prepayData.interestSaved.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase">Tenure Reduced By</span>
                    <div className="font-mono text-base font-bold text-teal-400">
                      {prepayData.yearsSaved} Years ({prepayData.monthsSaved} mo)
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Amortization Schedule Table */}
      <div className="p-6 sm:p-7 rounded-3xl glass-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <h4 className={`text-base font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              Annual Amortization Schedule
            </h4>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="px-3 py-1.5 rounded-xl border border-white/10 text-xs font-semibold flex items-center gap-1.5 text-slate-300 hover:text-white cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={() => setShowFullSchedule(!showFullSchedule)}
              className="px-3 py-1.5 rounded-xl border border-white/10 text-xs font-semibold flex items-center gap-1.5 text-emerald-400 cursor-pointer"
            >
              {showFullSchedule ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              <span>{showFullSchedule ? 'Collapse' : 'Expand All Years'}</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-white/[0.08] text-slate-400 text-[11px]">
                <th className="py-2.5 px-3">Year</th>
                <th className="py-2.5 px-3">Opening Balance</th>
                <th className="py-2.5 px-3">Annual EMI</th>
                <th className="py-2.5 px-3">Principal Paid</th>
                <th className="py-2.5 px-3">Interest Paid</th>
                <th className="py-2.5 px-3 text-right">Closing Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {(showFullSchedule
                ? emiData.yearlySchedule
                : emiData.yearlySchedule.slice(0, 5)
              ).map((row) => (
                <tr key={row.year} className="hover:bg-white/[0.02]">
                  <td className="py-2.5 px-3 font-bold text-emerald-400">Year {row.year}</td>
                  <td className="py-2.5 px-3 text-slate-300">{currency}{row.openingBalance.toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-white">{currency}{row.totalEmi.toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-emerald-400 font-semibold">{currency}{row.principalPaid.toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-amber-400">{currency}{row.interestPaid.toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-right font-bold text-white">{currency}{row.closingBalance.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {!showFullSchedule && emiData.yearlySchedule.length > 5 && (
            <div className="text-center pt-3">
              <button
                onClick={() => setShowFullSchedule(true)}
                className="text-xs text-emerald-400 hover:underline cursor-pointer"
              >
                + View all {emiData.yearlySchedule.length} years
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
