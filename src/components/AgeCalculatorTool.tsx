import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Clock,
  Heart,
  Sparkles,
  Cake,
  Copy,
  Check,
  RefreshCw,
  Sun,
  Globe,
  Hourglass,
  Compass,
  Zap,
} from 'lucide-react';

interface AgeCalculatorToolProps {
  theme: 'dark' | 'light';
}

interface CalculatedAge {
  isFuture: false;
  years: number;
  months: number;
  days: number;
  totalMonths: number;
  totalWeeks: number;
  remDaysAfterWeeks: number;
  totalDays: number;
  totalHours: number;
  totalMinutes: number;
  totalSeconds: number;
  daysUntilBday: number;
  hoursUntilBday: number;
  minutesUntilBday: number;
  secondsUntilBday: number;
  nextBdayDayName: string;
  turningAge: number;
  halfBdayFormatted: string;
  zodiac: { name: string; symbol: string; element: string; desc: string };
  chineseAnimal: string;
  heartbeats: number;
  breaths: number;
  hoursSlept: number;
  daysToCentenary: number;
  planetary: { planet: string; ratio: number; symbol: string; age: string }[];
}

type AgeDataResult = CalculatedAge | { isFuture: true } | null;

export function AgeCalculatorTool({ theme }: AgeCalculatorToolProps) {
  // Input: Date of Birth (default: 25 years ago)
  const defaultDob = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 25);
    return d.toISOString().split('T')[0];
  }, []);

  const [dob, setDob] = useState<string>(defaultDob);
  const [targetDate, setTargetDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [includeTime, setIncludeTime] = useState<boolean>(false);
  const [birthTime, setBirthTime] = useState<string>('09:30');
  const [copied, setCopied] = useState<boolean>(false);
  const [now, setNow] = useState<Date>(new Date());

  // Live timer tick every second for real-time live age
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Compute precise age differences
  const ageData = useMemo<AgeDataResult>(() => {
    if (!dob) return null;

    const [bYear, bMonth, bDay] = dob.split('-').map(Number);
    let birth = new Date(bYear, bMonth - 1, bDay);
    if (includeTime && birthTime) {
      const [h, m] = birthTime.split(':').map(Number);
      birth.setHours(h || 0, m || 0, 0, 0);
    }

    const [tYear, tMonth, tDay] = targetDate.split('-').map(Number);
    let target = new Date(tYear, tMonth - 1, tDay);

    // If target date is today, use current live time
    const isToday = targetDate === new Date().toISOString().split('T')[0];
    if (isToday) {
      target = now;
    } else {
      target.setHours(23, 59, 59, 999);
    }

    if (birth > target) {
      return { isFuture: true };
    }

    // Exact Years, Months, Days calculation
    let years = target.getFullYear() - birth.getFullYear();
    let months = target.getMonth() - birth.getMonth();
    let days = target.getDate() - birth.getDate();

    if (days < 0) {
      months -= 1;
      const prevMonth = new Date(target.getFullYear(), target.getMonth(), 0);
      days += prevMonth.getDate();
    }

    if (months < 0) {
      years -= 1;
      months += 12;
    }

    // Total milliseconds
    const diffMs = target.getTime() - birth.getTime();
    const totalSeconds = Math.floor(diffMs / 1000);
    const totalMinutes = Math.floor(totalSeconds / 60);
    const totalHours = Math.floor(totalMinutes / 60);
    const totalDays = Math.floor(totalHours / 24);
    const totalWeeks = Math.floor(totalDays / 7);
    const remDaysAfterWeeks = totalDays % 7;
    const totalMonths = years * 12 + months;

    // Next Birthday calculation
    const currentYear = now.getFullYear();
    let nextBday = new Date(currentYear, bMonth - 1, bDay);
    if (nextBday < now) {
      nextBday = new Date(currentYear + 1, bMonth - 1, bDay);
    }
    const msUntilBday = nextBday.getTime() - now.getTime();
    const daysUntilBday = Math.floor(msUntilBday / (1000 * 60 * 60 * 24));
    const hoursUntilBday = Math.floor((msUntilBday / (1000 * 60 * 60)) % 24);
    const minutesUntilBday = Math.floor((msUntilBday / (1000 * 60)) % 60);
    const secondsUntilBday = Math.floor((msUntilBday / 1000) % 60);

    const bdayDaysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const nextBdayDayName = bdayDaysOfWeek[nextBday.getDay()];
    const turningAge = nextBday.getFullYear() - bYear;

    // Half birthday (6 months later)
    const halfBday = new Date(bYear, bMonth - 1 + 6, bDay);
    const halfBdayFormatted = halfBday.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

    // Zodiac Sign
    const getZodiac = (m: number, d: number) => {
      const signs = [
        { name: 'Capricorn', symbol: '♑', element: 'Earth', desc: 'Ambitious & Disciplined', start: [1, 1], end: [1, 19] },
        { name: 'Aquarius', symbol: '♒', element: 'Air', desc: 'Innovative & Humanitarian', start: [1, 20], end: [2, 18] },
        { name: 'Pisces', symbol: '♓', element: 'Water', desc: 'Intuitive & Artistic', start: [2, 19], end: [3, 20] },
        { name: 'Aries', symbol: '♈', element: 'Fire', desc: 'Courageous & Energetic', start: [3, 21], end: [4, 19] },
        { name: 'Taurus', symbol: '♉', element: 'Earth', desc: 'Reliable & Grounded', start: [4, 20], end: [5, 20] },
        { name: 'Gemini', symbol: '♊', element: 'Air', desc: 'Curious & Expressive', start: [5, 21], end: [6, 20] },
        { name: 'Cancer', symbol: '♋', element: 'Water', desc: 'Protective & Empathetic', start: [6, 21], end: [7, 22] },
        { name: 'Leo', symbol: '♌', element: 'Fire', desc: 'Warm-hearted & Charismatic', start: [7, 23], end: [8, 22] },
        { name: 'Virgo', symbol: '♍', element: 'Earth', desc: 'Analytical & Methodical', start: [8, 23], end: [9, 22] },
        { name: 'Libra', symbol: '♎', element: 'Air', desc: 'Harmonious & Diplomatic', start: [9, 23], end: [10, 22] },
        { name: 'Scorpio', symbol: '♏', element: 'Water', desc: 'Passionate & Resourceful', start: [10, 23], end: [11, 21] },
        { name: 'Sagittarius', symbol: '♐', element: 'Fire', desc: 'Generous & Philosophical', start: [11, 22], end: [12, 21] },
        { name: 'Capricorn', symbol: '♑', element: 'Earth', desc: 'Ambitious & Disciplined', start: [12, 22], end: [12, 31] },
      ];

      for (const s of signs) {
        if (
          (m === s.start[0] && d >= s.start[1]) ||
          (m === s.end[0] && d <= s.end[1])
        ) {
          return s;
        }
      }
      return signs[0];
    };

    const zodiac = getZodiac(bMonth, bDay);

    // Chinese Zodiac (Cycle based on 1900 = Rat)
    const chineseZodiacAnimals = [
      'Rat', 'Ox', 'Tiger', 'Rabbit', 'Dragon', 'Snake',
      'Horse', 'Goat', 'Monkey', 'Rooster', 'Dog', 'Pig'
    ];
    const chineseAnimal = chineseZodiacAnimals[(bYear - 1900) % 12] || 'Dragon';

    // Fun Biological stats
    const heartbeats = totalMinutes * 78; // average 78 bpm
    const breaths = totalMinutes * 16; // average 16 breaths/min
    const hoursSlept = Math.round(totalDays * 8); // 8 hrs per night
    const daysToCentenary = Math.max(0, 36525 - totalDays);

    // Planetary Ages
    const planetary = [
      { planet: 'Mercury', ratio: 0.2408, symbol: '☿' },
      { planet: 'Venus', ratio: 0.6152, symbol: '♀' },
      { planet: 'Mars', ratio: 1.8808, symbol: '♂' },
      { planet: 'Jupiter', ratio: 11.862, symbol: '♃' },
      { planet: 'Saturn', ratio: 29.447, symbol: '♄' },
    ].map((p) => ({
      ...p,
      age: ((years + months / 12 + days / 365) / p.ratio).toFixed(1),
    }));

    return {
      isFuture: false,
      years,
      months,
      days,
      totalMonths,
      totalWeeks,
      remDaysAfterWeeks,
      totalDays,
      totalHours,
      totalMinutes,
      totalSeconds,
      daysUntilBday,
      hoursUntilBday,
      minutesUntilBday,
      secondsUntilBday,
      nextBdayDayName,
      turningAge,
      halfBdayFormatted,
      zodiac,
      chineseAnimal,
      heartbeats,
      breaths,
      hoursSlept,
      daysToCentenary,
      planetary,
    };
  }, [dob, targetDate, includeTime, birthTime, now]);

  // Copy Summary
  const handleCopySummary = () => {
    if (!ageData || ageData.isFuture) return;
    const textToCopy = `Age Summary:
Exact Age: ${ageData.years} Years, ${ageData.months} Months, ${ageData.days} Days
Total Days: ${ageData.totalDays.toLocaleString()} days
Next Birthday: in ${ageData.daysUntilBday} days (Turning ${ageData.turningAge} on a ${ageData.nextBdayDayName})
Zodiac: ${ageData.zodiac.name} (${ageData.zodiac.symbol} - ${ageData.zodiac.element})
Estimated Heartbeats: ${ageData.heartbeats.toLocaleString()}`;

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Input Card */}
      <div className="p-6 sm:p-8 rounded-3xl glass-card space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center font-bold shadow-inner">
              <Cake className="w-6 h-6" />
            </div>
            <div>
              <h3 className={`font-display text-xl sm:text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                Smart Age & Life Calculator
              </h3>
              <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                Down-to-the-second precision with zodiac insights, milestones, and planetary age breakdown
              </p>
            </div>
          </div>

          {/* Quick Year Presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-[11px] font-mono ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Quick:</span>
            {[18, 21, 25, 30, 40, 50].map((yr) => (
              <button
                key={yr}
                onClick={() => {
                  const d = new Date();
                  d.setFullYear(d.getFullYear() - yr);
                  setDob(d.toISOString().split('T')[0]);
                }}
                className={`text-[11px] px-2 py-1 rounded-lg border font-mono transition-colors cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-white/[0.03] border-white/[0.08] text-slate-300 hover:border-amber-500/50 hover:text-amber-400'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-amber-400 hover:text-amber-600'
                }`}
              >
                {yr}y ago
              </button>
            ))}
          </div>
        </div>

        {/* Form Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {/* Birth Date Input */}
          <div className="space-y-2">
            <label className={`block text-xs font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
              Date of Birth
            </label>
            <div className="relative">
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className={`w-full px-4 py-3 rounded-2xl text-sm border focus:outline-none focus:ring-2 focus:ring-amber-500/20 font-medium ${
                  theme === 'dark'
                    ? 'bg-[#0D0F17] border-white/[0.09] text-white focus:border-amber-500/70'
                    : 'bg-white border-slate-300 text-slate-900 focus:border-amber-500'
                }`}
              />
            </div>
          </div>

          {/* Age As Of Date Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className={`text-xs font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                Age As Of Date
              </label>
              <button
                type="button"
                onClick={() => setTargetDate(new Date().toISOString().split('T')[0])}
                className="text-[11px] text-amber-500 hover:underline cursor-pointer"
              >
                Today
              </button>
            </div>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className={`w-full px-4 py-3 rounded-2xl text-sm border focus:outline-none focus:ring-2 focus:ring-amber-500/20 font-medium ${
                theme === 'dark'
                  ? 'bg-[#0D0F17] border-white/[0.09] text-white focus:border-amber-500/70'
                  : 'bg-white border-slate-300 text-slate-900 focus:border-amber-500'
              }`}
            />
          </div>

          {/* Optional Birth Time Toggle */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className={`text-xs font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                Birth Time (Optional)
              </label>
              <button
                type="button"
                onClick={() => setIncludeTime(!includeTime)}
                className={`text-[11px] font-semibold ${includeTime ? 'text-amber-500' : 'text-slate-400'}`}
              >
                {includeTime ? 'Enabled' : 'Disabled'}
              </button>
            </div>
            {includeTime ? (
              <input
                type="time"
                value={birthTime}
                onChange={(e) => setBirthTime(e.target.value)}
                className={`w-full px-4 py-3 rounded-2xl text-sm border focus:outline-none font-medium ${
                  theme === 'dark'
                    ? 'bg-[#0D0F17] border-white/[0.09] text-white'
                    : 'bg-white border-slate-300 text-slate-900'
                }`}
              />
            ) : (
              <button
                type="button"
                onClick={() => setIncludeTime(true)}
                className={`w-full py-3 rounded-2xl border border-dashed text-xs text-center transition-colors cursor-pointer ${
                  theme === 'dark'
                    ? 'border-white/10 hover:border-amber-500/50 text-slate-400'
                    : 'border-slate-300 hover:border-amber-500 text-slate-500'
                }`}
              >
                + Add exact birth time for precision
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Results Section */}
      {ageData && !ageData.isFuture && (
        <div className="space-y-6">
          {/* Hero Banner: Exact Age in Large Typography */}
          <div
            className={`p-8 sm:p-10 rounded-3xl glass-card relative overflow-hidden text-center sm:text-left border-2 ${
              theme === 'dark'
                ? 'border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-[#12141D] to-[#0A0C12]'
                : 'border-amber-400/50 bg-gradient-to-br from-amber-50 via-white to-orange-50/30'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="space-y-2">
                <span className="text-xs font-mono font-bold tracking-widest uppercase text-amber-500">
                  Exact Age Today
                </span>
                <div className="flex flex-wrap items-baseline gap-3">
                  <span className="font-display text-4xl sm:text-6xl font-extrabold text-amber-500 tracking-tight">
                    {ageData.years}
                  </span>
                  <span className={`text-xl font-bold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    Years
                  </span>
                  <span className="font-display text-4xl sm:text-6xl font-extrabold text-amber-500 tracking-tight ml-2">
                    {ageData.months}
                  </span>
                  <span className={`text-xl font-bold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    Months
                  </span>
                  <span className="font-display text-4xl sm:text-6xl font-extrabold text-amber-500 tracking-tight ml-2">
                    {ageData.days}
                  </span>
                  <span className={`text-xl font-bold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    Days
                  </span>
                </div>
                <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  Born on {new Date(dob).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>

              {/* Copy Summary Button */}
              <button
                onClick={handleCopySummary}
                className={`px-5 py-3 rounded-2xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shrink-0 ${
                  theme === 'dark'
                    ? 'bg-[#181B26] hover:bg-[#222738] border-white/10 text-white'
                    : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-800'
                }`}
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied Summary' : 'Share / Copy Stats'}</span>
              </button>
            </div>
          </div>

          {/* Next Birthday & Countdown Banner */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Next Birthday Countdown */}
            <div className="p-6 rounded-3xl glass-card space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
                    <Cake className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className={`text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      Next Birthday Countdown
                    </h4>
                    <span className="text-[11px] text-slate-400">
                      Turning {ageData.turningAge} on a {ageData.nextBdayDayName}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 text-center pt-1">
                <div className={`p-3 rounded-2xl border ${theme === 'dark' ? 'bg-[#0D0F17] border-white/[0.06]' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="font-mono text-xl sm:text-2xl font-bold text-rose-500">{ageData.daysUntilBday}</div>
                  <div className="text-[10px] text-slate-400 font-mono">Days</div>
                </div>
                <div className={`p-3 rounded-2xl border ${theme === 'dark' ? 'bg-[#0D0F17] border-white/[0.06]' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="font-mono text-xl sm:text-2xl font-bold text-rose-500">{ageData.hoursUntilBday}</div>
                  <div className="text-[10px] text-slate-400 font-mono">Hours</div>
                </div>
                <div className={`p-3 rounded-2xl border ${theme === 'dark' ? 'bg-[#0D0F17] border-white/[0.06]' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="font-mono text-xl sm:text-2xl font-bold text-rose-500">{ageData.minutesUntilBday}</div>
                  <div className="text-[10px] text-slate-400 font-mono">Minutes</div>
                </div>
                <div className={`p-3 rounded-2xl border ${theme === 'dark' ? 'bg-[#0D0F17] border-white/[0.06]' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="font-mono text-xl sm:text-2xl font-bold text-rose-500">{ageData.secondsUntilBday}</div>
                  <div className="text-[10px] text-slate-400 font-mono">Seconds</div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-2 border-t border-white/[0.06] text-slate-400">
                <span>Half-Birthday:</span>
                <span className="font-bold text-slate-200">{ageData.halfBdayFormatted}</span>
              </div>
            </div>

            {/* Zodiac & Astrological Signs */}
            <div className="p-6 rounded-3xl glass-card space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className={`text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    Zodiac & Astrology Profile
                  </h4>
                  <span className="text-[11px] text-slate-400">Astrological sign and natural element</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className={`p-4 rounded-2xl border space-y-1 ${theme === 'dark' ? 'bg-[#0D0F17] border-white/[0.06]' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">{ageData.zodiac.symbol}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold">
                      {ageData.zodiac.element}
                    </span>
                  </div>
                  <div className={`font-bold text-base ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    {ageData.zodiac.name}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    {ageData.zodiac.desc}
                  </p>
                </div>

                <div className={`p-4 rounded-2xl border space-y-1 ${theme === 'dark' ? 'bg-[#0D0F17] border-white/[0.06]' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="text-2xl">🏮</div>
                  <span className="text-[10px] font-mono text-slate-400 uppercase">Chinese Zodiac</span>
                  <div className={`font-bold text-base ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    Year of the {ageData.chineseAnimal}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Lunar cycle calendar
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Granular Time Equivalents */}
          <div className="p-6 rounded-3xl glass-card space-y-4">
            <h4 className={`text-sm font-bold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              <Hourglass className="w-4 h-4 text-amber-500" />
              <span>Complete Lifetime in Different Units</span>
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: 'Total Months', value: ageData.totalMonths.toLocaleString() },
                { label: 'Total Weeks', value: `${ageData.totalWeeks.toLocaleString()}w + ${ageData.remDaysAfterWeeks}d` },
                { label: 'Total Days', value: ageData.totalDays.toLocaleString() },
                { label: 'Total Hours', value: ageData.totalHours.toLocaleString() },
                { label: 'Total Minutes', value: ageData.totalMinutes.toLocaleString() },
                { label: 'Total Seconds', value: ageData.totalSeconds.toLocaleString(), live: true },
              ].map((item) => (
                <div
                  key={item.label}
                  className={`p-3.5 rounded-2xl border text-center ${
                    theme === 'dark' ? 'bg-[#0D0F17] border-white/[0.06]' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className={`font-mono text-base font-bold truncate ${item.live ? 'text-amber-500' : theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    {item.value}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{item.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Life Milestones & Planetary Ages */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Biological Milestones */}
            <div className="p-6 rounded-3xl glass-card space-y-4">
              <h4 className={`text-sm font-bold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                <Heart className="w-4 h-4 text-red-500" />
                <span>Biological Estimations</span>
              </h4>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-black/10">
                  <span className="text-slate-400">Total Heartbeats:</span>
                  <span className="font-mono font-bold text-red-400">{ageData.heartbeats.toLocaleString()} beats</span>
                </div>
                <div className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-black/10">
                  <span className="text-slate-400">Total Breaths Taken:</span>
                  <span className="font-mono font-bold text-sky-400">{ageData.breaths.toLocaleString()} breaths</span>
                </div>
                <div className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-black/10">
                  <span className="text-slate-400">Time Spent Sleeping:</span>
                  <span className="font-mono font-bold text-indigo-400">{ageData.hoursSlept.toLocaleString()} hours ({(ageData.hoursSlept / 8760).toFixed(1)} yrs)</span>
                </div>
                <div className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-black/10">
                  <span className="text-slate-400">Days to 100th Birthday:</span>
                  <span className="font-mono font-bold text-amber-400">{ageData.daysToCentenary.toLocaleString()} days remaining</span>
                </div>
              </div>
            </div>

            {/* Planetary Ages */}
            <div className="p-6 rounded-3xl glass-card space-y-4">
              <h4 className={`text-sm font-bold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                <Globe className="w-4 h-4 text-teal-400" />
                <span>Your Age on Other Planets</span>
              </h4>

              <div className="grid grid-cols-5 gap-2 text-center">
                {ageData.planetary.map((p) => (
                  <div
                    key={p.planet}
                    className={`p-3 rounded-2xl border ${
                      theme === 'dark' ? 'bg-[#0D0F17] border-white/[0.06]' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="text-xl mb-1">{p.symbol}</div>
                    <div className="font-mono font-bold text-teal-400 text-sm">{p.age}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{p.planet}</div>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 text-center italic">
                Calculated based on each planet's orbital revolution period around the sun
              </p>
            </div>
          </div>
        </div>
      )}

      {/* If future date selected */}
      {ageData && ageData.isFuture && (
        <div className="p-8 rounded-3xl glass-card text-center text-rose-400 space-y-2">
          <p className="font-bold text-base">Date of Birth cannot be in the future!</p>
          <p className="text-xs text-slate-400">Please select a valid historical birth date.</p>
        </div>
      )}
    </div>
  );
}
