import React from 'react';
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  MapPin,
  PlusCircle,
  ShieldCheck,
  Users,
} from 'lucide-react';
import type { BudgetSummary, Trip } from '../types/travel.ts';
import {
  KARNATAKA_DISTRICTS,
  KARNATAKA_STARTING_HUBS,
} from '../data/karnatakaDestinations.ts';
import { buildDeterministicItinerary } from '../utils/finance.ts';
import { getDefaultPreferences } from '../utils/storage.ts';

interface MyTripsViewProps {
  trips: Trip[];
  activeTrip: Trip;
  budgetSummary: BudgetSummary;
  onSelectTrip: (tripId: string) => void;
  onCreateTrip: (trip: Trip) => void;
  onToggleStopCompleted: (stopId: string) => void;
}

export const MyTripsView: React.FC<MyTripsViewProps> = ({
  trips,
  activeTrip,
  budgetSummary,
  onSelectTrip,
  onCreateTrip,
  onToggleStopCompleted,
}) => {
  const activeStops = activeTrip.stops.filter((s) => !s.skipped);

  const handleQuickCreateDistrictTrip = (districtId: string) => {
    const basePrefs = getDefaultPreferences();
    const hubMap: Record<string, string> = {
      Mysuru: 'Mysuru Junction',
      Kodagu: 'Madikeri (Coorg Bus Stand)',
      Vijayanagara: 'Hosapete (Hampi Gateway)',
      Chikkamagaluru: 'Chikkamagaluru Town',
      'Uttara Kannada': 'Udupi Service Bus Stand',
      Udupi: 'Udupi Service Bus Stand',
      Shivamogga: 'Shivamogga Town',
      Hassan: 'Bengaluru (Majestic / MG Road)',
    };
    const startHub = hubMap[districtId] || 'Bengaluru (Majestic / MG Road)';
    const newTrip = buildDeterministicItinerary({
      ...basePrefs,
      startingLocation: startHub,
      startingCoordinates:
        KARNATAKA_STARTING_HUBS[startHub] ||
        KARNATAKA_STARTING_HUBS['Bengaluru (Majestic / MG Road)'],
      targetDistrict: districtId,
      mustVisitIds: [],
      avoidIds: [],
    });
    newTrip.title = `${districtId} Explorer Itinerary`;
    onCreateTrip(newTrip);
  };

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-8">
      <div className="border-b border-white/[0.08] pb-5 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-mono font-medium tracking-wider uppercase text-amber-400">
            Heritage Trails · Curated Karnataka Journeys
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-semibold text-white tracking-tight mt-1">
            My Karnataka Trips & Curated District Trails
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Inspect full stop timelines, cost verification metadata, group expense splits, and official tourism sources.
          </p>
        </div>

        {/* Saved Trips Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          {trips.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelectTrip(t.id)}
              className={`px-3.5 py-2 text-xs font-medium rounded-lg border transition-all active:scale-[0.98] whitespace-nowrap shrink-0 cursor-pointer font-display ${
                t.id === activeTrip.id
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-semibold shadow-sm'
                  : 'bg-[#101726] text-slate-300 border-white/[0.08] hover:bg-slate-800'
              }`}
            >
              {t.title}
            </button>
          ))}
        </div>
      </div>

      {/* Quick District Templates */}
      <section className="rounded-xl border border-white/[0.08] bg-[#101726] p-5 space-y-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xs font-display font-semibold text-white">
            Instant District Templates (Click to Generate & Switch)
          </h2>
          <span className="text-[11px] text-amber-400/90 font-mono">
            Modular 31-district architecture · 12 Verified Starting Hubs
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {KARNATAKA_DISTRICTS.slice(0, 8).map((dist) => (
            <button
              key={dist.id}
              type="button"
              onClick={() => handleQuickCreateDistrictTrip(dist.id)}
              className="px-3 py-1.5 text-xs font-medium bg-[#090e17] hover:bg-slate-800 text-slate-200 border border-white/[0.08] hover:border-amber-500/40 rounded-lg transition-all active:scale-[0.98] flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer shadow-sm"
            >
              <PlusCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>
                {dist.name} ({dist.nameKn})
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Complete Plan Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-xl border border-white/[0.08] bg-[#101726] shadow-sm hover:border-white/20 transition-colors">
          <div className="text-xs text-slate-400 font-medium">Trip Window</div>
          <div className="text-lg font-bold text-white font-mono tabular-nums mt-1">
            {activeTrip.preferences.tripDurationHours} hrs
          </div>
        </div>
        <div className="p-4 rounded-xl border border-white/[0.08] bg-[#101726] shadow-sm hover:border-white/20 transition-colors">
          <div className="text-xs text-slate-400 font-medium">Total Route Distance</div>
          <div className="text-lg font-bold text-white font-mono tabular-nums mt-1">
            {activeTrip.fuelEstimate.totalTripDistanceKm} km
          </div>
        </div>
        <div className="p-4 rounded-xl border border-white/[0.08] bg-[#101726] shadow-sm hover:border-amber-500/30 transition-colors">
          <div className="text-xs text-slate-400 font-medium">
            {activeTrip.fuelEstimate.pricingModel === 'max_charge'
              ? `Max ${
                  activeTrip.preferences.transportMode === 'public_transport'
                    ? 'Bus'
                    : activeTrip.preferences.transportMode === 'cab'
                    ? 'Cab'
                    : 'Transit'
                } Charge`
              : 'Est. Total Fuel'}
          </div>
          <div className="text-lg font-bold text-amber-300 font-mono tabular-nums mt-1">
            ₹{activeTrip.fuelEstimate.estimatedTotalFuelCostInr.toLocaleString('en-IN')}
          </div>
        </div>
        <div className="p-4 rounded-xl border border-white/[0.08] bg-[#101726] shadow-sm hover:border-emerald-500/30 transition-colors">
          <div className="text-xs text-slate-400 font-medium">Projected Total Spend</div>
          <div className="text-lg font-bold text-emerald-400 font-mono tabular-nums mt-1">
            ₹{budgetSummary.projectedFinalSpendingInr.toLocaleString('en-IN')}
          </div>
        </div>
        <div className="p-4 rounded-xl border border-white/[0.08] bg-[#101726] shadow-sm hover:border-white/20 transition-colors">
          <div className="text-xs text-slate-400 font-medium">Per-Person Est. Cost</div>
          <div className="text-lg font-bold text-white font-mono tabular-nums mt-1">
            ₹{budgetSummary.perPersonProjectedCostInr.toLocaleString('en-IN')}
          </div>
        </div>
        <div className="p-4 rounded-xl border border-white/[0.08] bg-[#101726] shadow-sm hover:border-sky-500/30 transition-colors">
          <div className="text-xs text-slate-400 font-medium">
            {activeTrip.fuelEstimate.pricingModel === 'max_charge'
              ? 'Return Max Fare'
              : 'Return Leg Fuel'}
          </div>
          <div className="text-lg font-bold text-sky-300 font-mono tabular-nums mt-1">
            ₹{budgetSummary.estimatedReturnJourneyFuelCostInr.toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {/* Detailed Stop-by-Stop Table / Cards */}
      <section className="rounded-xl border border-white/[0.08] bg-[#101726] p-6 space-y-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.08] pb-4">
          <div>
            <div className="text-[11px] font-mono text-amber-400 uppercase tracking-wider">Timeline</div>
            <h2 className="text-base font-display font-semibold text-white mt-0.5">
              Detailed Stop Schedule & Verification Provenance
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Every stop shows stable attraction ID, arrival/departure window, verification status, and official source.
            </p>
          </div>
          <div className="text-xs text-slate-400 font-mono tabular-nums">
            Group Size: {activeTrip.preferences.travellerCount} ({activeTrip.preferences.travellerStyle})
          </div>
        </div>

        <div className="divide-y divide-white/[0.06]">
          {activeStops.map((stop, idx) => (
            <div
              key={stop.stopId}
              className="py-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 max-w-3xl">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  <span className="font-mono tabular-nums text-amber-400 font-medium">
                    0{idx + 1} · ID: {stop.attractionId}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{stop.district} District</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">
                    Arrive {formatTime(stop.suggestedArrivalTime)} – Depart{' '}
                    {formatTime(stop.suggestedDepartureTime)} ({stop.estimatedVisitMinutes} mins)
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="capitalize text-emerald-400">
                    Price Status: {stop.costStatus}
                  </span>
                </div>

                <div className="text-base font-display font-semibold text-white">
                  {stop.name}{' '}
                  {stop.nameKn && (
                    <span className="text-sm font-normal text-slate-400 font-sans">
                      · {stop.nameKn}
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  {stop.recommendationReason}
                </p>

                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 pt-1">
                  <span className="font-mono tabular-nums">
                    Leg: {stop.distanceFromPrevKm} km ({stop.travelMinutesFromPrev} mins)
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    Interests: {stop.matchedInterests.join(', ')}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>Source: {stop.sourceName}</span>
                  {stop.sourceUrl && (
                    <a
                      href={stop.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-400 hover:underline inline-flex items-center gap-1 ml-0.5"
                    >
                      <span>Verify</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between lg:justify-end gap-5 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-white/[0.06]">
                <div className="text-left lg:text-right font-mono tabular-nums">
                  <div className="text-sm font-semibold text-white">
                    ₹{stop.estimatedStopCostGroupInr.toLocaleString('en-IN')} group
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    ₹{stop.estimatedStopCostPerPersonInr}/person (Entry ₹
                    {stop.entryCostPerPersonInr} + Food/Act ₹
                    {stop.foodAndActivityPerPersonInr})
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onToggleStopCompleted(stop.stopId)}
                  className={`px-3.5 py-2 text-xs font-semibold rounded-lg border transition-all active:scale-[0.98] whitespace-nowrap shrink-0 cursor-pointer font-display ${
                    stop.completed
                      ? 'bg-emerald-950/60 border-emerald-700/60 text-emerald-300 shadow-sm'
                      : 'bg-[#090e17] border-white/[0.08] text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {stop.completed ? 'Completed ✓' : 'Mark Visited'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Assumptions & Unverified Values Disclosure */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-2">
        <h3 className="text-xs font-semibold text-slate-300">
          Assumptions & Data Quality Notes
        </h3>
        <ul className="space-y-1 text-xs text-slate-400 list-disc list-inside">
          {activeTrip.assumptions.map((note, idx) => (
            <li key={idx}>{note}</li>
          ))}
        </ul>
      </section>
    </div>
  );
};
