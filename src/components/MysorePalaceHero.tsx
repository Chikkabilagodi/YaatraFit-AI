import React from 'react';
import {
  Compass,
  MapPin,
  Sparkles,
  Wallet,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
} from 'lucide-react';
import type { NavSection } from './DashboardView.tsx';
import { translations, type Language } from '../utils/i18n.ts';
import { SpotlightCard } from './ui/SpotlightCard.tsx';

interface MysorePalaceHeroProps {
  onNavigate: (section: NavSection) => void;
  hasStops?: boolean;
  language?: Language;
  onLanguageChange?: (lang: Language) => void;
}

export const MysorePalaceHero: React.FC<MysorePalaceHeroProps> = ({
  onNavigate,
  hasStops = false,
  language = 'en',
  onLanguageChange,
}) => {
  const t = translations[language].hero;
  return (
    <div className="relative rounded-2xl border border-white/[0.08] bg-[#0c121e] overflow-hidden shadow-2xl">
      {/* Clean Dark Ambient Backdrop with Radiant Subtle Glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0c121e] via-[#090e17] to-[#050811]" />
      <div className="absolute inset-0 bg-radial-at-t from-amber-500/10 via-transparent to-[#090e17]/85 pointer-events-none" />


      {/* Karnataka State Map (Rajyotsava Yellow & Red) Silhouette with Radiant Ambient Glow & Light Visuals */}
      <div
        className="absolute right-0 top-0 bottom-0 w-full sm:w-2/3 lg:w-1/2 pointer-events-none select-none overflow-hidden flex items-center justify-center sm:justify-end pr-0 sm:pr-6 lg:pr-10 z-[2]"
        aria-hidden="true"
      >
        {/* Layered ambient lighting effects */}
        <div className="absolute w-72 h-72 sm:w-96 sm:h-96 rounded-full bg-radial from-amber-500/20 via-red-600/10 to-transparent blur-3xl -top-8 -right-8 pointer-events-none" />
        <div className="absolute w-60 h-60 rounded-full bg-radial from-amber-400/15 via-transparent to-transparent blur-2xl bottom-6 right-16 pointer-events-none" />

        {/* Karnataka State Map Silhouette Graphic */}
        <div className="relative h-[85%] max-h-[440px] w-auto aspect-[3/4] flex items-center justify-center opacity-30 sm:opacity-40 lg:opacity-50 transition-all duration-700">
          <img
            src="/assets/aistudio/image_4a7e4179.png"
            alt="Karnataka State Map Silhouette"
            className="h-full w-full object-contain filter drop-shadow-[0_0_25px_rgba(245,158,11,0.4)] drop-shadow-[0_0_35px_rgba(220,38,38,0.25)] select-none"
            loading="eager"
            decoding="async"
          />
        </div>
      </div>

      {/* Hero Content */}
      <div className="relative z-10 p-4 sm:p-8 lg:p-10 max-w-5xl space-y-6">
        {/* Zero-Pill Unboxed Metadata Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2 text-slate-300">
            {/* Clickable Logo navigating to Overview */}
            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              aria-label="Karnataka Tourism Home"
              className="bg-white px-2 py-0.5 rounded shadow-sm border border-slate-200/40 inline-flex items-center shrink-0 hover:scale-105 active:scale-95 transition-transform cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              <img
                src="/assets/aistudio/image_81bf5380.png"
                alt="Karnataka Tourism Logo"
                className="h-5 w-auto object-contain"
              />
            </button>
            <span className="text-amber-400 font-semibold tracking-wide">
              {t.taglineBadge}
            </span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="flex items-center gap-1.5 text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>{t.trustBadge}</span>
            </span>
            <span aria-hidden="true" className="hidden md:inline text-slate-600">·</span>
            {/* Clickable Helpline Phone */}
            <a
              href="tel:180042500100"
              title="24x7 Karnataka Tourism Toll-Free Helpline"
              className="hidden md:inline-flex items-center gap-1 text-slate-400 hover:text-amber-300 transition-colors cursor-pointer"
            >
              <span className="text-amber-400">📞</span> 1800-425-00100
            </a>
            <span aria-hidden="true" className="hidden lg:inline text-slate-600">·</span>
            {/* Clickable Gmail Contact */}
            <a
              href="mailto:chikkabilagodu@gmail.com"
              title="Official Travel Desk Contact"
              className="hidden lg:inline-flex items-center gap-1 text-slate-400 hover:text-amber-300 transition-colors cursor-pointer"
            >
              <span className="text-amber-400">✉️</span> chikkabilagodu@gmail.com
            </a>
          </div>

          {/* Interactive Language Switcher Segmented Control */}
          {onLanguageChange && (
            <div
              role="group"
              aria-label={t.languageSelect}
              className="flex items-center gap-1 p-1 rounded-full bg-[#121927]/90 border border-white/[0.08] shadow-sm backdrop-blur-sm"
            >
              <button
                type="button"
                onClick={() => onLanguageChange('en')}
                aria-pressed={language === 'en'}
                className={`px-3 py-1 text-xs font-semibold rounded-full transition-all cursor-pointer ${
                  language === 'en'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => onLanguageChange('kn')}
                aria-pressed={language === 'kn'}
                className={`px-3 py-1 text-xs font-semibold rounded-full transition-all cursor-pointer ${
                  language === 'kn'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                ಕನ್ನಡ
              </button>
            </div>
          )}
        </div>

        {/* Hero Title & Description */}
        <div className="space-y-3">
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-[1.15] text-balance font-display">
            {t.titlePrefix}{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-amber-200">
              {t.brandName}
            </span>
          </h1>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-3xl font-sans">
            {t.description}
          </p>
        </div>

        {/* 4 Pillars with Tactile SpotlightCards (Freedom, Clarity, Transit, Recovery) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          {/* Pillar 1: Freedom */}
          <SpotlightCard
            spotlightColor="rgba(245, 158, 11, 0.12)"
            className="p-4 bg-[#101726]/85 border-white/[0.08] space-y-1.5"
          >
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{t.freedomTitle}</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {t.freedomDesc}
            </p>
          </SpotlightCard>

          {/* Pillar 2: Transparent Budget */}
          <SpotlightCard
            spotlightColor="rgba(16, 185, 129, 0.12)"
            className="p-4 bg-[#101726]/85 border-white/[0.08] space-y-1.5"
          >
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
              <Wallet className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{t.budgetTitle}</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {t.budgetDesc}
            </p>
          </SpotlightCard>

          {/* Pillar 3: Road & Bus Timing */}
          <SpotlightCard
            spotlightColor="rgba(56, 189, 248, 0.12)"
            className="p-4 bg-[#101726]/85 border-white/[0.08] space-y-1.5"
          >
            <div className="flex items-center gap-2 text-xs font-semibold text-sky-300">
              <Clock className="w-4 h-4 text-sky-400 shrink-0" />
              <span>{t.transitTitle}</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {t.transitDesc}
            </p>
          </SpotlightCard>

          {/* Pillar 4: Flexible Trip Adjuster */}
          <SpotlightCard
            spotlightColor="rgba(168, 85, 247, 0.12)"
            className="p-4 bg-[#101726]/85 border-white/[0.08] space-y-1.5"
          >
            <div className="flex items-center gap-2 text-xs font-semibold text-purple-300">
              <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
              <span>{t.recoveryTitle}</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {t.recoveryDesc}
            </p>
          </SpotlightCard>
        </div>

        {/* Primary Call-to-Action Bar with Tactile Button Micro-Interactions */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-white/[0.08]">
          <button
            type="button"
            onClick={() => onNavigate('planner')}
            className="px-5 py-2.5 text-xs sm:text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg shadow-md hover:shadow-amber-500/20 active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer font-sans"
          >
            <Compass className="w-4 h-4" />
            <span>{t.ctaPlan}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onNavigate('map')}
            className="px-4 py-2.5 text-xs sm:text-sm font-semibold bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-white/[0.08] rounded-lg active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer"
          >
            <MapPin className="w-4 h-4 text-amber-400" />
            <span>{t.ctaMap}</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('chat')}
            className="px-4 py-2.5 text-xs sm:text-sm font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>{t.ctaChat}</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('wallet')}
            className="px-4 py-2.5 text-xs sm:text-sm font-medium text-slate-300 hover:text-white hover:bg-white/[0.06] rounded-lg active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer ml-auto"
          >
            <Wallet className="w-4 h-4 text-emerald-400" />
            <span>{t.ctaWallet}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

