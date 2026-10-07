import React, { useState, useMemo } from 'react';
import {
  Receipt,
  FileSpreadsheet,
  Copy,
  Check,
  Plus,
  Trash2,
  Printer,
  Download,
  Building,
  ArrowRight,
  TrendingUp,
  Percent,
} from 'lucide-react';

interface GstCalculatorToolProps {
  theme: 'dark' | 'light';
}

type GstMode = 'exclusive' | 'inclusive' | 'invoice';

interface InvoiceItem {
  id: string;
  name: string;
  qty: number;
  rate: number;
  gstRate: number;
}

export function GstCalculatorTool({ theme }: GstCalculatorToolProps) {
  const [mode, setMode] = useState<GstMode>('exclusive');
  const [currency, setCurrency] = useState<string>('₹');

  // Single Calculation State
  const [amount, setAmount] = useState<string>('10000');
  const [gstRate, setGstRate] = useState<number>(18);
  const [customRate, setCustomRate] = useState<string>('18');
  const [isCustom, setIsCustom] = useState<boolean>(false);
  const [taxType, setTaxType] = useState<'intra' | 'inter'>('intra'); // intra = CGST+SGST, inter = IGST
  const [copied, setCopied] = useState<boolean>(false);

  // Multi-Item Invoice State
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([
    { id: '1', name: 'Software Consulting', qty: 1, rate: 25000, gstRate: 18 },
    { id: '2', name: 'Cloud Hosting Subscription', qty: 2, rate: 4500, gstRate: 18 },
    { id: '3', name: 'Hardware Security Key', qty: 3, rate: 1200, gstRate: 12 },
  ]);

  const activeRate = isCustom ? parseFloat(customRate) || 0 : gstRate;
  const parsedAmount = parseFloat(amount) || 0;

  // Single calculation computations
  const singleCalc = useMemo(() => {
    let net = 0;
    let gst = 0;
    let total = 0;

    if (mode === 'exclusive') {
      // Add GST: Amount is Net
      net = parsedAmount;
      gst = (net * activeRate) / 100;
      total = net + gst;
    } else {
      // Extract GST: Amount is Gross
      total = parsedAmount;
      net = (total * 100) / (100 + activeRate);
      gst = total - net;
    }

    const cgst = taxType === 'intra' ? gst / 2 : 0;
    const sgst = taxType === 'intra' ? gst / 2 : 0;
    const igst = taxType === 'inter' ? gst : 0;

    return {
      net,
      gst,
      total,
      cgst,
      sgst,
      igst,
      rate: activeRate,
    };
  }, [mode, parsedAmount, activeRate, taxType]);

  // Invoice calculations
  const invoiceCalc = useMemo(() => {
    let subtotal = 0;
    let totalGst = 0;
    let totalCgst = 0;
    let totalSgst = 0;

    const itemDetails = invoiceItems.map((item) => {
      const itemSubtotal = item.qty * item.rate;
      const itemGst = (itemSubtotal * item.gstRate) / 100;
      const itemTotal = itemSubtotal + itemGst;

      subtotal += itemSubtotal;
      totalGst += itemGst;
      if (taxType === 'intra') {
        totalCgst += itemGst / 2;
        totalSgst += itemGst / 2;
      }

      return {
        ...item,
        itemSubtotal,
        itemGst,
        itemTotal,
      };
    });

    const grandTotal = subtotal + totalGst;

    return {
      items: itemDetails,
      subtotal,
      totalGst,
      totalCgst,
      totalSgst,
      totalIgst: taxType === 'inter' ? totalGst : 0,
      grandTotal,
    };
  }, [invoiceItems, taxType]);

  // Copy Summary
  const handleCopySummary = () => {
    const summary = `GST Calculation (${mode === 'exclusive' ? 'Exclusive' : 'Inclusive'}):
Amount: ${currency}${parsedAmount.toLocaleString()}
GST Rate: ${singleCalc.rate}%
Net Pre-Tax: ${currency}${singleCalc.net.toFixed(2)}
Total GST: ${currency}${singleCalc.gst.toFixed(2)}
${taxType === 'intra' ? `CGST (${singleCalc.rate / 2}%): ${currency}${singleCalc.cgst.toFixed(2)}\nSGST (${singleCalc.rate / 2}%): ${currency}${singleCalc.sgst.toFixed(2)}` : `IGST (${singleCalc.rate}%): ${currency}${singleCalc.igst.toFixed(2)}`}
Total Gross: ${currency}${singleCalc.total.toFixed(2)}`;

    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Add Item to Invoice
  const addItem = () => {
    setInvoiceItems((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        name: 'New Item / Service',
        qty: 1,
        rate: 1000,
        gstRate: 18,
      },
    ]);
  };

  const removeItem = (id: string) => {
    setInvoiceItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateItem = (id: string, field: keyof InvoiceItem, val: string | number) => {
    setInvoiceItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return { ...item, [field]: val };
        }
        return item;
      })
    );
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Mode Selector Tabs */}
      <div className="p-3 rounded-2xl glass-card flex flex-wrap items-center justify-between gap-3">
        <div
          className={`flex items-center p-1 rounded-xl border text-xs ${
            theme === 'dark' ? 'bg-[#0D0F17] border-white/[0.08]' : 'bg-slate-100 border-slate-200'
          }`}
        >
          <button
            onClick={() => setMode('exclusive')}
            className={`px-3.5 py-1.5 rounded-lg transition-all font-semibold cursor-pointer ${
              mode === 'exclusive'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md'
                : theme === 'dark'
                ? 'text-slate-400 hover:text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            GST Exclusive (Add GST)
          </button>
          <button
            onClick={() => setMode('inclusive')}
            className={`px-3.5 py-1.5 rounded-lg transition-all font-semibold cursor-pointer ${
              mode === 'inclusive'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md'
                : theme === 'dark'
                ? 'text-slate-400 hover:text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            GST Inclusive (Remove GST)
          </button>
          <button
            onClick={() => setMode('invoice')}
            className={`px-3.5 py-1.5 rounded-lg transition-all font-semibold cursor-pointer flex items-center gap-1.5 ${
              mode === 'invoice'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md'
                : theme === 'dark'
                ? 'text-slate-400 hover:text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Multi-Item Invoice Builder</span>
          </button>
        </div>

        {/* Currency Selector */}
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-slate-400">Currency:</span>
          {['₹', '$', '€', '£'].map((curr) => (
            <button
              key={curr}
              onClick={() => setCurrency(curr)}
              className={`w-7 h-7 rounded-lg border font-bold text-xs cursor-pointer ${
                currency === curr
                  ? 'bg-amber-500 border-amber-400 text-white'
                  : theme === 'dark'
                  ? 'border-white/10 text-slate-400'
                  : 'border-slate-200 text-slate-600'
              }`}
            >
              {curr}
            </button>
          ))}
        </div>
      </div>

      {/* SINGLE CALCULATOR VIEW (Exclusive & Inclusive) */}
      {mode !== 'invoice' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Inputs Column (6 cols) */}
          <div className="lg:col-span-6 space-y-5">
            <div className="p-6 sm:p-7 rounded-3xl glass-card space-y-5">
              <div>
                <label className={`block text-xs font-semibold mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                  {mode === 'exclusive' ? 'Base / Net Amount' : 'Total Gross Invoice Amount'}
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-lg font-bold text-amber-500">{currency}</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className={`w-full pl-9 pr-4 py-3 rounded-2xl text-xl font-bold border focus:outline-none focus:ring-2 focus:ring-amber-500/20 ${
                      theme === 'dark'
                        ? 'bg-[#0D0F17] border-white/[0.09] text-white focus:border-amber-500'
                        : 'bg-white border-slate-300 text-slate-900 focus:border-amber-500'
                    }`}
                  />
                </div>

                {/* Quick Amount Chips */}
                <div className="flex items-center gap-1.5 pt-2 flex-wrap">
                  {[500, 1000, 5000, 10000, 25000, 50000].map((val) => (
                    <button
                      key={val}
                      onClick={() => setAmount(String(val))}
                      className="text-[11px] px-2.5 py-1 rounded-lg border border-white/10 text-slate-400 hover:text-amber-400 cursor-pointer"
                    >
                      {currency}{val.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              {/* GST Slab Rates */}
              <div>
                <label className={`block text-xs font-semibold mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                  GST Slab Rate
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {[
                    { rate: 0, label: '0% Nil' },
                    { rate: 5, label: '5%' },
                    { rate: 12, label: '12%' },
                    { rate: 18, label: '18% Std' },
                    { rate: 28, label: '28% Lux' },
                  ].map((slab) => (
                    <button
                      key={slab.rate}
                      type="button"
                      onClick={() => {
                        setGstRate(slab.rate);
                        setIsCustom(false);
                      }}
                      className={`py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        !isCustom && gstRate === slab.rate
                          ? 'bg-amber-500 border-amber-400 text-white shadow-md'
                          : theme === 'dark'
                          ? 'bg-[#0D0F17] border-white/[0.08] text-slate-400 hover:text-white'
                          : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {slab.label}
                    </button>
                  ))}
                </div>

                {/* Custom Rate Toggle */}
                <div className="flex items-center gap-2 pt-2.5">
                  <button
                    onClick={() => setIsCustom(!isCustom)}
                    className={`text-xs px-2.5 py-1 rounded-lg border font-semibold cursor-pointer ${
                      isCustom
                        ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                        : 'border-white/10 text-slate-400'
                    }`}
                  >
                    Custom %
                  </button>
                  {isCustom && (
                    <input
                      type="number"
                      value={customRate}
                      onChange={(e) => setCustomRate(e.target.value)}
                      placeholder="e.g. 3% for Gold"
                      className={`w-28 px-3 py-1 rounded-lg text-xs border ${
                        theme === 'dark' ? 'bg-[#0D0F17] border-white/10 text-white' : 'bg-white border-slate-300'
                      }`}
                    />
                  )}
                </div>
              </div>

              {/* State Transaction Type */}
              <div className="pt-2 border-t border-white/[0.08]">
                <label className={`block text-xs font-semibold mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                  Transaction Region
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setTaxType('intra')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-semibold cursor-pointer text-left ${
                      taxType === 'intra'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-400 font-bold'
                        : theme === 'dark'
                        ? 'bg-[#0D0F17] border-white/10 text-slate-400'
                        : 'bg-slate-100 border-slate-200 text-slate-600'
                    }`}
                  >
                    <div>Intra-State (Same State)</div>
                    <div className="text-[10px] opacity-75 font-normal">CGST ({singleCalc.rate / 2}%) + SGST ({singleCalc.rate / 2}%)</div>
                  </button>

                  <button
                    onClick={() => setTaxType('inter')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-semibold cursor-pointer text-left ${
                      taxType === 'inter'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-400 font-bold'
                        : theme === 'dark'
                        ? 'bg-[#0D0F17] border-white/10 text-slate-400'
                        : 'bg-slate-100 border-slate-200 text-slate-600'
                    }`}
                  >
                    <div>Inter-State (Outside)</div>
                    <div className="text-[10px] opacity-75 font-normal">IGST ({singleCalc.rate}%) Full</div>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Results Summary Card (6 cols) */}
          <div className="lg:col-span-6 space-y-4">
            <div className="p-6 sm:p-8 rounded-3xl glass-card space-y-5 border-2 border-amber-500/30">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                    <Receipt className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className={`text-base font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      GST Tax Breakdown Slip
                    </h4>
                    <span className="text-[11px] text-slate-400">
                      Rate Applied: {singleCalc.rate}%
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleCopySummary}
                  className="px-3 py-1.5 rounded-xl border border-white/10 text-xs font-semibold flex items-center gap-1.5 text-amber-400 hover:bg-white/5 cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy Slip'}</span>
                </button>
              </div>

              {/* Granular Line Items */}
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-black/10 text-xs">
                  <span className="text-slate-400">Net Pre-Tax Base:</span>
                  <span className="font-mono font-bold text-sm">{currency}{singleCalc.net.toFixed(2)}</span>
                </div>

                {taxType === 'intra' ? (
                  <>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-black/10 text-xs">
                      <span className="text-slate-400">Central Tax (CGST {singleCalc.rate / 2}%):</span>
                      <span className="font-mono font-bold text-amber-400 text-sm">+{currency}{singleCalc.cgst.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-black/10 text-xs">
                      <span className="text-slate-400">State / UT Tax (SGST {singleCalc.rate / 2}%):</span>
                      <span className="font-mono font-bold text-amber-400 text-sm">+{currency}{singleCalc.sgst.toFixed(2)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-black/10 text-xs">
                    <span className="text-slate-400">Integrated Tax (IGST {singleCalc.rate}%):</span>
                    <span className="font-mono font-bold text-amber-400 text-sm">+{currency}{singleCalc.igst.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs">
                  <span className="text-amber-400 font-semibold">Total GST Component:</span>
                  <span className="font-mono font-bold text-amber-400 text-sm">{currency}{singleCalc.gst.toFixed(2)}</span>
                </div>
              </div>

              {/* Total Final Gross Amount */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-mono text-amber-400 uppercase tracking-wider font-bold">
                    Gross Invoice Total
                  </span>
                  <div className="font-display text-3xl sm:text-4xl font-extrabold text-amber-500 mt-0.5">
                    {currency}{singleCalc.total.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MULTI-ITEM INVOICE BUILDER VIEW */}
      {mode === 'invoice' && (
        <div className="p-6 sm:p-8 rounded-3xl glass-card space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
            <div>
              <h3 className={`font-display text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                Itemized GST Invoice Generator
              </h3>
              <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                Add custom goods or services, specify quantities & slabs, and calculate ready totals
              </p>
            </div>

            <button
              onClick={addItem}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Item</span>
            </button>
          </div>

          {/* Invoice Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/[0.08] text-slate-400 font-mono text-[11px]">
                  <th className="py-2.5 px-3">Item / Description</th>
                  <th className="py-2.5 px-2 w-20">Qty</th>
                  <th className="py-2.5 px-3 w-28">Rate ({currency})</th>
                  <th className="py-2.5 px-2 w-24">GST %</th>
                  <th className="py-2.5 px-3 text-right">Pre-Tax</th>
                  <th className="py-2.5 px-3 text-right">GST Amount</th>
                  <th className="py-2.5 px-3 text-right">Total</th>
                  <th className="py-2.5 px-2 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {invoiceCalc.items.map((item) => (
                  <tr key={item.id} className="hover:bg-white/[0.02]">
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                        className={`w-full px-2.5 py-1.5 rounded-lg border text-xs ${
                          theme === 'dark' ? 'bg-[#0D0F17] border-white/10 text-white' : 'bg-white border-slate-300'
                        }`}
                      />
                    </td>
                    <td className="py-2.5 px-2">
                      <input
                        type="number"
                        min="1"
                        value={item.qty}
                        onChange={(e) => updateItem(item.id, 'qty', Number(e.target.value))}
                        className={`w-full px-2 py-1.5 rounded-lg border text-xs text-center ${
                          theme === 'dark' ? 'bg-[#0D0F17] border-white/10 text-white' : 'bg-white border-slate-300'
                        }`}
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="number"
                        value={item.rate}
                        onChange={(e) => updateItem(item.id, 'rate', Number(e.target.value))}
                        className={`w-full px-2.5 py-1.5 rounded-lg border text-xs ${
                          theme === 'dark' ? 'bg-[#0D0F17] border-white/10 text-white' : 'bg-white border-slate-300'
                        }`}
                      />
                    </td>
                    <td className="py-2.5 px-2">
                      <select
                        value={item.gstRate}
                        onChange={(e) => updateItem(item.id, 'gstRate', Number(e.target.value))}
                        className={`w-full px-2 py-1.5 rounded-lg border text-xs ${
                          theme === 'dark' ? 'bg-[#0D0F17] border-white/10 text-white' : 'bg-white border-slate-300'
                        }`}
                      >
                        <option value={0}>0%</option>
                        <option value={5}>5%</option>
                        <option value={12}>12%</option>
                        <option value={18}>18%</option>
                        <option value={28}>28%</option>
                      </select>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-medium">
                      {currency}{item.itemSubtotal.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-amber-400 font-medium">
                      +{currency}{item.itemGst.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold">
                      {currency}{item.itemTotal.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-1 rounded text-red-400 hover:text-red-300 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Invoice Summary Totals */}
          <div className="flex flex-col sm:flex-row justify-end pt-4 border-t border-white/[0.08]">
            <div className="w-full sm:w-80 space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal (Pre-Tax):</span>
                <span className="font-mono font-bold text-white">{currency}{invoiceCalc.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-amber-400">
                <span>Total GST:</span>
                <span className="font-mono font-bold">{currency}{invoiceCalc.totalGst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-base pt-2 border-t border-white/10 text-amber-500">
                <span>Grand Total:</span>
                <span className="font-mono">{currency}{invoiceCalc.grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
