import React from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Compass,
  Fuel,
  MapPin,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Wallet,
} from 'lucide-react';
import type { BudgetSummary, Trip } from '../types/travel.ts';
import { KARNATAKA_DISTRICTS } from '../data/karnatakaDestinations.ts';
import { IllustrationBanner } from './IllustrationBanner.tsx';
import { MysorePalaceHero } from './MysorePalaceHero.tsx';
import { translations, type Language } from '../utils/i18n.ts';
import { SpotlightCard } from './ui/SpotlightCard.tsx';
import { WeatherForecastWidget } from './WeatherForecastWidget.tsx';

export type NavSection =
  | 'dashboard'
  | 'planner'
  | 'map'
  | 'trips'
  | 'wallet'
  | 'coach'
  | 'recovery'
  | 'chat'
  | 'notfound';

interface DashboardViewProps {
  trip: Trip;
  budgetSummary: BudgetSummary;
  onNavigate: (section: NavSection) => void;
  onToggleStopCompleted: (stopId: string) => void;
  language?: Language;
  onLanguageChange?: (lang: Language) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  trip,
  budgetSummary,
  onNavigate,
  onToggleStopCompleted,
  language = 'en',
  onLanguageChange,
}) => {
  const t = translations[language].dashboard;
  const districtInfo = KARNATAKA_DISTRICTS.find(
    (d) => d.id.toLowerCase() === trip.preferences.targetDistrict.toLowerCase()
  );

  const activeStops = trip.stops.filter((s) => !s.skipped);
  const completedCount = activeStops.filter((s) => s.completed).length;
  const nextStop = activeStops.find((s) => !s.completed);

  const destinationCoords =
    activeStops[0]?.coordinates ||
    districtInfo?.center ||
    trip.preferences.startingCoordinates;
  const destinationName =
    language === 'kn' && districtInfo?.nameKn
      ? districtInfo.nameKn
      : trip.preferences.targetDistrict;

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString(language === 'kn' ? 'kn-IN' : 'en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-8">
      {/* Mysore Palace Hero describing Yaatra Fit AI in Karnataka with illuminated Amba Vilas background */}
      <MysorePalaceHero
        onNavigate={onNavigate}
        hasStops={activeStops.length > 0}
        language={language}
        onLanguageChange={onLanguageChange}
      />

      {/* Active Trip Header (Only rendered when user has active stops or custom plan) */}
      {activeStops.length > 0 && (
        <div className="relative rounded-xl border border-white/[0.08] bg-[#101726]/85 overflow-hidden">
          <IllustrationBanner
            district={trip.preferences.targetDistrict}
            className="h-44 w-full border-0 rounded-none"
          />
          <div className="p-6 md:p-8 -mt-20 relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2 text-xs text-amber-300 font-medium">
                <span>
                  {language === 'kn'
                    ? districtInfo?.nameKn || 'ಕರ್ನಾಟಕ'
                    : districtInfo?.region || 'Karnataka Expedition'}
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  {language === 'kn'
                    ? `${trip.preferences.travellerCount} ಪ್ರವಾಸಿಗರು (${trip.preferences.travellerStyle.replace('_', ' ')})`
                    : `${trip.preferences.travellerCount} Traveller(s) (${trip.preferences.travellerStyle.replace('_', ' ')})`}
                </span>
                <span aria-hidden="true">·</span>
                <span className="capitalize">
                  {trip.preferences.transportMode.replace('_', ' ')}
                </span>
              </div>
              <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white font-display">
                {trip.title}
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed font-sans">
                {trip.aiSummary || districtInfo?.tagline}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => onNavigate('recovery')}
                className="px-4 py-2 text-xs font-semibold bg-amber-500 text-slate-950 rounded-lg hover:bg-amber-400 active:scale-[0.98] transition-all flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer shadow-sm"
              >
                <RefreshCw className="w-4 h-4" />
                <span>{language === 'kn' ? 'ಪ್ರವಾಸ ಹೊಂದಾಣಿಕೆ' : 'Adapt Itinerary'}</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('coach')}
                className="px-4 py-2 text-xs font-semibold bg-slate-800/90 text-slate-100 border border-white/[0.08] rounded-lg hover:bg-slate-700 active:scale-[0.98] transition-all flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>{language === 'kn' ? 'ವೆಚ್ಚ ಮಾರ್ಗದರ್ಶಿ' : 'Spending Coach'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Section 11: 5 Strictly Separated Financial Ledger Metrics */}
      <section aria-labelledby="financial-separation-heading" className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2
              id="financial-separation-heading"
              className="text-base font-bold text-white font-display"
            >
              {t.budgetHeading}
            </h2>
            <p className="text-xs text-slate-400">
              {t.budgetSub}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('wallet')}
            className="text-xs font-medium text-amber-400 hover:text-amber-300 active:scale-[0.98] transition-all flex items-center gap-1 whitespace-nowrap shrink-0 self-start sm:self-auto cursor-pointer"
          >
            <span>{t.openWallet}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          {/* A. Planned Trip Budget */}
          <SpotlightCard
            spotlightColor="rgba(245, 158, 11, 0.08)"
            className="p-4 bg-[#101726]/90 border-white/[0.08] space-y-1.5"
          >
            <div className="text-xs text-slate-400 font-medium">{t.plannedBudget}</div>
            <div
              data-testid="metric-planned-budget"
              className="text-2xl font-bold text-white font-mono tabular-nums tracking-tight"
            >
              ₹{budgetSummary.plannedTripBudgetInr.toLocaleString('en-IN')}
            </div>
            <div className="text-xs text-slate-400 font-mono tabular-nums">
              ₹{budgetSummary.perPersonPlannedBudgetInr.toLocaleString('en-IN')} {language === 'kn' ? '/ ಪ್ರತಿ ವ್ಯಕ್ತಿಗೆ' : '/ person limit'}
            </div>
          </SpotlightCard>

          {/* B. Simulated Wallet Balance */}
          <SpotlightCard
            spotlightColor="rgba(16, 185, 129, 0.08)"
            className="p-4 bg-[#101726]/90 border-white/[0.08] space-y-1.5"
          >
            <div className="text-xs text-slate-400 font-medium">{t.walletBalance}</div>
            <div
              data-testid="metric-wallet-balance"
              className="text-2xl font-bold text-emerald-400 font-mono tabular-nums tracking-tight"
            >
              ₹{budgetSummary.walletBalanceInr.toLocaleString('en-IN')}
            </div>
            <div className="text-xs text-slate-400 font-mono tabular-nums">
              {language === 'kn'
                ? `ಸೇರಿಸಿದ್ದು ₹${budgetSummary.totalValidTopUpsInr.toLocaleString('en-IN')} · ಖರ್ಚು ₹${budgetSummary.totalValidWalletExpensesInr.toLocaleString('en-IN')}`
                : `Added ₹${budgetSummary.totalValidTopUpsInr.toLocaleString('en-IN')} · Spent ₹${budgetSummary.totalValidWalletExpensesInr.toLocaleString('en-IN')}`}
            </div>
          </SpotlightCard>

          {/* C. Remaining Planned Budget */}
          <SpotlightCard
            spotlightColor="rgba(245, 158, 11, 0.08)"
            className="p-4 bg-[#101726]/90 border-white/[0.08] space-y-1.5"
          >
            <div className="text-xs text-slate-400 font-medium">{t.remainingBudget}</div>
            <div
              data-testid="metric-remaining-budget"
              className={`text-2xl font-bold font-mono tabular-nums tracking-tight ${
                budgetSummary.remainingPlannedBudgetInr < 0
                  ? 'text-rose-400'
                  : 'text-amber-300'
              }`}
            >
              ₹{budgetSummary.remainingPlannedBudgetInr.toLocaleString('en-IN')}
            </div>
            <div className="text-xs text-slate-400 font-mono tabular-nums">
              {language === 'kn'
                ? `ವೆಚ್ಚವಾದ ಮೊತ್ತ: ₹${budgetSummary.validTripExpensesInr.toLocaleString('en-IN')}`
                : `Trip expenses logged: ₹${budgetSummary.validTripExpensesInr.toLocaleString('en-IN')}`}
            </div>
          </SpotlightCard>

          {/* D. Emergency Reserve */}
          <SpotlightCard
            spotlightColor="rgba(56, 189, 248, 0.08)"
            className="p-4 bg-[#101726]/90 border-white/[0.08] space-y-1.5"
          >
            <div className="text-xs text-slate-400 font-medium">{t.emergencyReserve}</div>
            <div
              data-testid="metric-emergency-reserve"
              className="text-2xl font-bold text-sky-300 font-mono tabular-nums tracking-tight"
            >
              ₹{budgetSummary.emergencyReserveInr.toLocaleString('en-IN')}
            </div>
            <div className="text-xs text-slate-400">
              {budgetSummary.isEmergencyReserveIntact
                ? (language === 'kn' ? 'ತುರ್ತು ಪ್ರಯಾಣಕ್ಕೆ ಸುರಕ್ಷಿತವಾಗಿದೆ' : 'Protected for return & contingencies')
                : (language === 'kn' ? 'ಎಚ್ಚರಿಕೆ: ತುರ್ತು ನಿಧಿಯ ಬಳಕೆ ಸಂಭವ' : 'Warning: Projected spend dips into reserve')}
            </div>
          </SpotlightCard>

          {/* E. Estimated Remaining Trip Cost */}
          <SpotlightCard
            spotlightColor="rgba(148, 163, 184, 0.08)"
            className="p-4 bg-[#101726]/90 border-white/[0.08] space-y-1.5"
          >
            <div className="text-xs text-slate-400 font-medium">{t.remainingCosts}</div>
            <div
              data-testid="metric-remaining-cost"
              className="text-2xl font-bold text-white font-mono tabular-nums tracking-tight"
            >
              ₹{budgetSummary.estimatedRemainingTripCostInr.toLocaleString('en-IN')}
            </div>
            <div className="text-xs text-slate-400 font-mono tabular-nums">
              Stops ₹{budgetSummary.estimatedFoodAndActivitiesRemainingInr.toLocaleString('en-IN')} ·{' '}
              {trip.fuelEstimate.pricingModel === 'max_charge'
                ? `Max Fare ₹${budgetSummary.estimatedRemainingFuelCostInr.toLocaleString('en-IN')}`
                : `Fuel ₹${budgetSummary.estimatedRemainingFuelCostInr.toLocaleString('en-IN')}`}
            </div>
          </SpotlightCard>
        </div>
      </section>

      {/* Feasibility Guardrails & Route Telemetry Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 columns: Active Itinerary & Next Stop */}
        <div className="lg:col-span-7 rounded-xl border border-white/[0.08] bg-[#101726]/85 p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-white/[0.06]">
            <div>
              <h2 className="text-base font-bold text-white font-display">
                {t.timelineHeading} ({completedCount}/{activeStops.length} {language === 'kn' ? 'ತಾಣಗಳು ಮುಗಿದಿವೆ' : 'Stops Completed'})
              </h2>
              <p className="text-xs text-slate-400">
                {t.departureFrom} {trip.preferences.startingLocation} · {t.returnBy}{' '}
                <span className="font-mono tabular-nums">
                  {formatTime(trip.preferences.returnDeadline)}
                </span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('map')}
              className="px-3 py-1.5 text-xs font-medium bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 border border-white/[0.08] rounded-lg active:scale-[0.98] transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer shadow-sm"
            >
              <Compass className="w-3.5 h-3.5 text-emerald-400" />
              <span>{t.viewMap}</span>
            </button>
          </div>

          {nextStop && (
            <div className="p-4 rounded-lg border border-emerald-500/30 bg-emerald-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-xs text-emerald-300 font-medium">
                  {t.nextStop} · {language === 'kn' ? 'ಆಗಮನ' : 'Arrival'} {formatTime(nextStop.suggestedArrivalTime)}
                </div>
                <div className="text-base font-semibold text-white font-display">
                  {language === 'kn' ? (nextStop.nameKn || nextStop.name) : nextStop.name}
                </div>
                <div className="text-xs text-slate-300 font-mono tabular-nums">
                  {nextStop.distanceFromPrevKm} km leg · {nextStop.travelMinutesFromPrev} mins transit ·{' '}
                  {nextStop.estimatedVisitMinutes} mins visit · Est. ₹
                  {nextStop.estimatedStopCostGroupInr.toLocaleString('en-IN')}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onToggleStopCompleted(nextStop.stopId)}
                className="px-3.5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg active:scale-[0.98] transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 self-start sm:self-center cursor-pointer shadow-sm"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{t.markCompleted}</span>
              </button>
            </div>
          )}

          {activeStops.length === 0 ? (
            <div className="py-8 px-6 rounded-xl border border-dashed border-slate-800 bg-slate-950/40 text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
                <Compass className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-white">
                  {t.noStopsTitle}
                </h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  {t.noStopsDesc}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => onNavigate('planner')}
                  className="px-4 py-2 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg transition-colors cursor-pointer"
                >
                  {t.addStopsBtn}
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('map')}
                  className="px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg transition-colors cursor-pointer"
                >
                  {t.exploreMapBtn}
                </button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80">
              {activeStops.map((stop, index) => (
                <div
                  key={stop.stopId}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      <span className="font-mono tabular-nums text-amber-400 font-semibold">
                        {language === 'kn' ? `ತಾಣ 0${index + 1}` : `Stop 0${index + 1}`}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">
                        {formatTime(stop.suggestedArrivalTime)} –{' '}
                        {formatTime(stop.suggestedDepartureTime)}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="capitalize">{stop.costStatus}</span>
                      {stop.isReplacement && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-emerald-400 font-medium">
                            {language === 'kn' ? 'ಬದಲಿ ತಾಣ' : 'Recovery Replacement'}
                          </span>
                        </>
                      )}
                    </div>
                    <div className="text-sm font-semibold text-white">
                      {language === 'kn' ? (stop.nameKn || stop.name) : stop.name}
                    </div>
                    <div className="text-xs text-slate-400">
                      {stop.recommendationReason}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0 self-end sm:self-center">
                    <div className="text-right font-mono tabular-nums">
                      <div className="text-sm font-semibold text-slate-100">
                        ₹{stop.estimatedStopCostGroupInr.toLocaleString('en-IN')}
                      </div>
                      <div className="text-xs text-slate-400">
                        ₹{stop.estimatedStopCostPerPersonInr}{language === 'kn' ? '/ವ್ಯಕ್ತಿ' : '/person'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onToggleStopCompleted(stop.stopId)}
                      aria-label={
                        stop.completed
                          ? `Mark ${stop.name} as uncompleted`
                          : `Mark ${stop.name} as completed`
                      }
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        stop.completed
                          ? 'bg-emerald-950/60 border-emerald-700 text-emerald-300'
                          : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                      }`}
                    >
                      {stop.completed ? t.completed : t.complete}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right 5 columns: Vehicle Fuel Calculator & Guardrail Alerts */}
        <div className="lg:col-span-5 space-y-6">
          {/* Fuel & Route Distance Summary */}
          <div className="rounded-xl border border-white/[0.08] bg-[#101726]/85 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-2">
                <Fuel className="w-4 h-4 text-amber-400" />
                <h2 className="text-base font-bold text-white font-display">
                  {trip.fuelEstimate.pricingModel === 'max_charge'
                    ? t.transitBreakdown
                    : t.vehicleFuelEstimates}
                </h2>
              </div>
              <span className="text-xs text-slate-400 capitalize">
                {trip.preferences.transportMode === 'public_transport'
                  ? (language === 'kn' ? 'ಬಸ್ / ಕೆಎಸ್ಆರ್‌ಟಿಸಿ' : 'Bus / KSRTC')
                  : trip.preferences.transportMode === 'cab'
                  ? (language === 'kn' ? 'ಟ್ಯಾಕ್ಸಿ / ಕ್ಯಾಬ್' : 'Cab / Hired Taxi')
                  : trip.preferences.transportMode.replace('_', ' ')}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-[#090e17]/80 border border-white/[0.06]">
                <div className="text-slate-400">{language === 'kn' ? 'ಮುಖ್ಯ ಮಾರ್ಗದ ದೂರ' : 'One-Way Forward Route'}</div>
                <div className="text-base font-semibold text-white font-mono tabular-nums mt-0.5">
                  {trip.fuelEstimate.oneWayDistanceKm} km
                </div>
              </div>
              <div className="p-3 rounded-lg bg-[#090e17]/80 border border-white/[0.06]">
                <div className="text-slate-400">{language === 'kn' ? 'ಹಿಂತಿರುಗುವ ದೂರ' : 'Return Leg to Origin'}</div>
                <div className="text-base font-semibold text-white font-mono tabular-nums mt-0.5">
                  {trip.fuelEstimate.returnDistanceKm} km
                </div>
              </div>
              <div className="p-3 rounded-lg bg-[#090e17]/80 border border-white/[0.06]">
                <div className="text-slate-400">{language === 'kn' ? 'ಒಟ್ಟು ಪ್ರವಾಸದ ದೂರ' : 'Total Trip Distance'}</div>
                <div className="text-base font-semibold text-amber-300 font-mono tabular-nums mt-0.5">
                  {trip.fuelEstimate.totalTripDistanceKm} km
                </div>
                <div className="text-slate-400 font-mono tabular-nums mt-0.5">
                  {language === 'kn' ? 'ಬಾಕಿ:' : 'Remaining:'} {trip.fuelEstimate.remainingDistanceKm} km
                </div>
              </div>
              <div className="p-3 rounded-lg bg-[#090e17]/80 border border-white/[0.06]">
                <div className="text-slate-400">
                  {trip.fuelEstimate.pricingModel === 'max_charge'
                    ? (language === 'kn' ? 'ಗರಿಷ್ಠ ಸಾರಿಗೆ ಶುಲ್ಕ' : 'Max Transit Charge')
                    : (language === 'kn' ? 'ಅಂದಾಜು ಒಟ್ಟು ಇಂಧನ ವೆಚ್ಚ' : 'Est. Total Fuel Cost')}
                </div>
                <div className="text-base font-semibold text-emerald-400 font-mono tabular-nums mt-0.5">
                  ₹{trip.fuelEstimate.estimatedTotalFuelCostInr.toLocaleString('en-IN')}
                </div>
                <div className="text-slate-400 font-mono tabular-nums mt-0.5">
                  {trip.fuelEstimate.pricingModel === 'max_charge'
                    ? `Max ₹${(
                        trip.fuelEstimate.maxChargePerPersonInr ?? 0
                      ).toLocaleString('en-IN')}${language === 'kn' ? '/ವ್ಯಕ್ತಿ' : '/person'}`
                    : `${trip.fuelEstimate.estimatedTotalLitres} L @ ₹${trip.fuelEstimate.fuelPricePerLitreInr}/L`}
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              {trip.fuelEstimate.transportNote}
            </p>
          </div>

          {/* 3-Day Weather Forecast & Packing Advisory */}
          <WeatherForecastWidget
            districtName={destinationName}
            coordinates={destinationCoords}
            language={language}
          />

          {/* Feasibility Guardrail Warnings */}
          <div className="rounded-xl border border-white/[0.08] bg-[#101726]/85 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <h2 className="text-base font-bold text-white font-display">
                  {t.tripSafety}
                </h2>
              </div>
              <span className="text-xs text-slate-400 font-mono tabular-nums">
                {t.activeNotices(trip.warnings.length)}
              </span>
            </div>

            {trip.warnings.length === 0 ? (
              <div className="p-4 rounded-lg bg-emerald-950/20 border border-emerald-800/40 text-xs text-emerald-200 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">{t.allClear}</div>
                  <p className="text-slate-300 mt-0.5 leading-relaxed font-sans">
                    {t.allClearDesc(trip.preferences.tripDurationHours, trip.preferences.emergencyReserveInr)}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {trip.warnings.map((warn) => (
                  <div
                    key={warn.id}
                    className={`p-3.5 rounded-lg border text-xs space-y-1.5 ${
                      warn.severity === 'critical'
                        ? 'bg-rose-950/30 border-rose-800/60 text-rose-200'
                        : warn.severity === 'warning'
                        ? 'bg-amber-950/30 border-amber-800/60 text-amber-200'
                        : 'bg-[#090e17]/80 border-white/[0.06] text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-semibold">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        [{warn.severity.toUpperCase()}] {warn.title}
                      </span>
                    </div>
                    <p className="text-slate-300 leading-relaxed font-sans">{warn.message}</p>
                    <p className="text-slate-400 font-sans">
                      {language === 'kn' ? 'ಶಿಫಾರಸು:' : 'Recommendation:'} {warn.remediation}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => onNavigate('recovery')}
                className="px-3 py-2 text-xs font-medium bg-slate-800/90 hover:bg-slate-700/90 text-amber-300 border border-white/[0.08] rounded-lg active:scale-[0.98] transition-all whitespace-nowrap shrink-0 cursor-pointer shadow-sm"
              >
                {language === 'kn' ? 'ಪ್ರವಾಸ ಹೊಂದಾಣಿಕೆ ಮತ್ತು ಸಿಮ್ಯುಲೇಟರ್' : 'Open Trip Recovery & What-If Simulator'}
              </button>
              <button
                type="button"
                onClick={() => onNavigate('planner')}
                className="px-3 py-2 text-xs font-medium bg-slate-900/90 hover:bg-slate-800/90 text-slate-300 border border-white/[0.08] rounded-lg active:scale-[0.98] transition-all whitespace-nowrap shrink-0 cursor-pointer"
              >
                {language === 'kn' ? 'ಪ್ರವಾಸದ ನಿಯತಾಂಕಗಳನ್ನು ಬದಲಾಯಿಸಿ' : 'Edit Trip Parameters'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
