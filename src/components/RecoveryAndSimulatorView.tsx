import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  CloudRain,
  Compass,
  Loader2,
  RefreshCw,
  Sliders,
  Sparkles,
  Wallet,
} from 'lucide-react';
import type {
  BudgetSummary,
  RecoveryInput,
  RecoveryProposal,
  RecoveryTriggerReason,
  Transaction,
  TransportMode,
  Trip,
  WhatIfComparisonResult,
  WhatIfScenarioInput,
} from '../types/travel.ts';
import {
  buildRecoveryProposal,
  simulateWhatIfScenario,
} from '../utils/finance.ts';

interface RecoveryAndSimulatorViewProps {
  trip: Trip;
  transactions: Transaction[];
  budgetSummary: BudgetSummary;
  onApplyRecoveryProposal: (proposal: RecoveryProposal) => void;
  onApplyWhatIfScenario: (result: WhatIfComparisonResult) => void;
}

const WHAT_IF_PRESETS: WhatIfScenarioInput[] = [
  { type: 'spend_300', label: 'Spend an additional ₹300', extraSpendInr: 300 },
  { type: 'spend_500', label: 'Spend an additional ₹500', extraSpendInr: 500 },
  { type: 'lose_30m', label: 'Lose 30 minutes in traffic', lostMinutes: 30 },
  { type: 'lose_60m', label: 'Lose 60 minutes (1 hour)', lostMinutes: 60 },
  { type: 'lose_120m', label: 'Lose 120 minutes (2 hours)', lostMinutes: 120 },
  { type: 'remove_destination', label: 'Remove last optional destination' },
  { type: 'add_destination', label: 'Add another district destination' },
  {
    type: 'change_vehicle',
    label: 'Switch vehicle to Car (16 km/L)',
    newTransportMode: 'car',
  },
  {
    type: 'change_vehicle',
    label: 'Switch vehicle to Hired Cab (No mileage)',
    newTransportMode: 'cab',
  },
  {
    type: 'change_vehicle',
    label: 'Switch vehicle to Bus / KSRTC Transit',
    newTransportMode: 'public_transport',
  },
  {
    type: 'expensive_activity',
    label: 'Choose a premium activity (+₹350/person)',
  },
  {
    type: 'reduce_budget',
    label: 'Reduce available trip budget by ₹500',
    budgetReductionInr: 500,
  },
];

export const RecoveryAndSimulatorView: React.FC<
  RecoveryAndSimulatorViewProps
> = ({
  trip,
  transactions,
  budgetSummary,
  onApplyRecoveryProposal,
  onApplyWhatIfScenario,
}) => {
  const [activeMode, setActiveMode] = useState<'recovery' | 'simulator'>(
    'recovery'
  );

  // Adaptive Trip Recovery State
  const [reason, setReason] = useState<RecoveryTriggerReason>('lost_time');
  const [lostMinutes, setLostMinutes] = useState<number>(60);
  const [extraSpentInr, setExtraSpentInr] = useState<number>(300);
  const [weatherCondition, setWeatherCondition] = useState<
    'clear' | 'heavy_rain' | 'extreme_heat'
  >('clear');
  const [unavailableStopIds, setUnavailableStopIds] = useState<string[]>([]);
  const [newVehicle, setNewVehicle] = useState<TransportMode>(
    trip.preferences.transportMode
  );

  const [proposal, setProposal] = useState<RecoveryProposal>(() =>
    buildRecoveryProposal(trip, transactions, {
      reason: 'lost_time',
      lostMinutes: 60,
      extraSpentInr: 300,
      unavailableStopIds: [],
      weatherCondition: 'clear',
    })
  );
  const [isComputingRecovery, setIsComputingRecovery] = useState(false);
  const [appliedBanner, setAppliedBanner] = useState<string | null>(null);

  // What-If Simulator State
  const [selectedScenario, setSelectedScenario] =
    useState<WhatIfScenarioInput>(WHAT_IF_PRESETS[1]);
  const [whatIfResult, setWhatIfResult] = useState<WhatIfComparisonResult>(() =>
    simulateWhatIfScenario(trip, transactions, WHAT_IF_PRESETS[1])
  );

  const handleGenerateRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedBanner(null);
    const trigger: RecoveryInput = {
      reason,
      lostMinutes: Number(lostMinutes) || 0,
      extraSpentInr: Number(extraSpentInr) || 0,
      unavailableStopIds,
      newTransportMode:
        reason === 'vehicle_changed' ? newVehicle : trip.preferences.transportMode,
      weatherCondition,
    };

    setIsComputingRecovery(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);
    try {
      const res = await fetch('/api/ai/recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({ trip, transactions, trigger }),
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        if (data.proposal) {
          setProposal(data.proposal);
          return;
        }
      }
      const det = buildRecoveryProposal(trip, transactions, trigger);
      setProposal(det);
    } catch {
      clearTimeout(timeoutId);
      const det = buildRecoveryProposal(trip, transactions, trigger);
      setProposal(det);
    } finally {
      setIsComputingRecovery(false);
    }
  };

  const handleSelectScenario = (scen: WhatIfScenarioInput) => {
    setSelectedScenario(scen);
    setWhatIfResult(simulateWhatIfScenario(trip, transactions, scen));
  };

  const toggleUnavailableStop = (stopId: string) => {
    setUnavailableStopIds((prev) =>
      prev.includes(stopId)
        ? prev.filter((id) => id !== stopId)
        : [...prev, stopId]
    );
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
      {/* Header & Mode Switcher */}
      <div className="border-b border-white/[0.08] pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-mono font-medium tracking-wider uppercase text-amber-400">
            Resilience · Dynamic Itinerary Recovery
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-semibold text-white tracking-tight mt-1">
            Adaptive Trip Recovery & What-If Simulator
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Recalculate your remaining route when time, money, weather, or plans change—and compare before accepting.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-[#101726] border border-white/[0.08] rounded-xl self-start sm:self-auto shadow-sm">
          <button
            type="button"
            onClick={() => setActiveMode('recovery')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-all active:scale-[0.98] whitespace-nowrap shrink-0 cursor-pointer font-display ${
              activeMode === 'recovery'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Adaptive Recovery Engine
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('simulator')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-all active:scale-[0.98] whitespace-nowrap shrink-0 cursor-pointer font-display ${
              activeMode === 'simulator'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            What-If Simulator
          </button>
        </div>
      </div>

      {appliedBanner && (
        <div
          role="status"
          className="p-4 rounded-xl border border-emerald-800 bg-emerald-950/30 text-emerald-200 text-xs flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{appliedBanner}</span>
        </div>
      )}

      {activeMode === 'recovery' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 5 columns: Disruption Trigger Form */}
          <form
            onSubmit={handleGenerateRecovery}
            className="lg:col-span-5 rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-5"
          >
            <div>
              <h2 className="text-base font-semibold text-white">
                01. Report Disruption or Plan Change
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Completed stops and recorded wallet transactions are strictly preserved.
              </p>
            </div>

            <div>
              <label
                htmlFor="recovery-reason-select"
                className="block text-xs font-medium text-slate-300 mb-1.5"
              >
                Primary Recovery Trigger
              </label>
              <select
                id="recovery-reason-select"
                value={reason}
                onChange={(e) => {
                  const val = e.target.value as RecoveryTriggerReason;
                  setReason(val);
                  if (val === 'bad_weather') setWeatherCondition('heavy_rain');
                }}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-amber-400 focus:outline-none"
              >
                <option value="lost_time">Lost Time / Traffic Delay</option>
                <option value="overspent">Spent More Than Expected</option>
                <option value="wallet_decreased">Wallet Balance Decreased</option>
                <option value="attraction_unavailable">
                  Attraction Closed / Unavailable
                </option>
                <option value="bad_weather">Heavy Rain / Adverse Weather</option>
                <option value="vehicle_changed">Changed Vehicle Mode</option>
                <option value="group_preferences_changed">
                  Group Changed Pace / Interests
                </option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="lost-minutes-input"
                  className="block text-xs font-medium text-slate-300 mb-1.5"
                >
                  Time Lost (Minutes)
                </label>
                <input
                  id="lost-minutes-input"
                  type="number"
                  min={0}
                  max={480}
                  step={15}
                  value={lostMinutes}
                  onChange={(e) => setLostMinutes(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white font-mono tabular-nums focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="extra-spent-input"
                  className="block text-xs font-medium text-slate-300 mb-1.5"
                >
                  Unplanned Extra Spend (₹)
                </label>
                <input
                  id="extra-spent-input"
                  type="number"
                  min={0}
                  step={50}
                  value={extraSpentInr}
                  onChange={(e) => setExtraSpentInr(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white font-mono tabular-nums focus:border-amber-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="weather-select"
                  className="block text-xs font-medium text-slate-300 mb-1.5"
                >
                  Weather Condition
                </label>
                <select
                  id="weather-select"
                  value={weatherCondition}
                  onChange={(e) =>
                    setWeatherCondition(
                      e.target.value as 'clear' | 'heavy_rain' | 'extreme_heat'
                    )
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
                >
                  <option value="clear">Clear / Normal</option>
                  <option value="heavy_rain">
                    Heavy Rain (Skip outdoor waterfalls/peaks)
                  </option>
                  <option value="extreme_heat">Extreme Midday Heat</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="recovery-vehicle-select"
                  className="block text-xs font-medium text-slate-300 mb-1.5"
                >
                  Vehicle for Remaining Route
                </label>
                <select
                  id="recovery-vehicle-select"
                  value={newVehicle}
                  onChange={(e) =>
                    setNewVehicle(e.target.value as TransportMode)
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
                >
                  <option value="motorcycle">Motorcycle / Scooter</option>
                  <option value="car">Car / SUV (Own Vehicle)</option>
                  <option value="public_transport">Bus (KSRTC / Public Transport)</option>
                  <option value="cab">Cab / Hired Taxi</option>
                  <option value="mixed">Mixed (Bus + Cab/Auto)</option>
                </select>
              </div>
            </div>

            {/* Mark specific uncompleted stop unavailable */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <span className="block text-xs font-medium text-slate-300">
                Mark Any Uncompleted Stop as Closed / Unavailable:
              </span>
              <div className="space-y-1.5">
                {trip.stops
                  .filter((s) => !s.completed && !s.skipped)
                  .map((stop) => {
                    const isMarked = unavailableStopIds.includes(stop.stopId);
                    return (
                      <button
                        key={stop.stopId}
                        type="button"
                        onClick={() => toggleUnavailableStop(stop.stopId)}
                        className={`w-full text-left px-3 py-2 rounded-lg border text-xs flex items-center justify-between transition-colors cursor-pointer ${
                          isMarked
                            ? 'bg-rose-950/40 border-rose-700 text-rose-200'
                            : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <span className="truncate">{stop.name}</span>
                        <span className="font-mono text-xs shrink-0 ml-2">
                          {isMarked ? 'Marked Closed' : 'Open'}
                        </span>
                      </button>
                    );
                  })}
              </div>
            </div>

            <button
              type="submit"
              disabled={isComputingRecovery}
              className="w-full py-2.5 px-4 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              {isComputingRecovery ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Computing Trip Recovery...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  <span>Calculate Trip Recovery Proposal</span>
                </>
              )}
            </button>
          </form>

          {/* Right 7 columns: Before-and-After Comparison & Confirmation */}
          <div className="lg:col-span-7 rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-base font-semibold text-white">
                  02. Before-and-After Recovery Comparison
                </h2>
                <p className="text-xs text-slate-400">
                  Review retained, skipped, and replacement stops before applying to your active trip.
                </p>
              </div>
              <button
                type="button"
                disabled={isComputingRecovery}
                onClick={() => {
                  onApplyRecoveryProposal(proposal);
                  setAppliedBanner(
                    'Revised recovery itinerary applied! Completed stops and wallet transactions were preserved.'
                  );
                }}
                className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Confirm & Apply Recovered Itinerary
              </button>
            </div>

            {/* Explanation Summary */}
            <div className="p-4 rounded-lg border border-amber-800/60 bg-amber-950/20 text-xs text-slate-200 space-y-2">
              <div className="font-semibold text-amber-300">
                Why This Revised Plan Works ({proposal.generationSource === 'gemini_ai' ? 'Gemini + Deterministic Verified' : 'Deterministic Recovery Engine'})
              </div>
              <p className="leading-relaxed">{proposal.explanationSummary}</p>
            </div>

            {/* Before vs After Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono tabular-nums">
              <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800">
                <div className="text-slate-400">Original Projected Spend</div>
                <div className="text-sm font-semibold text-slate-300 mt-0.5">
                  ₹{proposal.originalEstimatedTotalCostInr.toLocaleString('en-IN')}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800">
                <div className="text-slate-400">Revised Projected Spend</div>
                <div className="text-sm font-semibold text-emerald-400 mt-0.5">
                  ₹{proposal.revisedProjectedFinalSpendingInr.toLocaleString('en-IN')}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800">
                <div className="text-slate-400">Remaining Time Window</div>
                <div className="text-sm font-semibold text-white mt-0.5">
                  {proposal.availableRemainingMinutes} mins
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800">
                <div className="text-slate-400">Revised Route Time</div>
                <div className="text-sm font-semibold text-amber-300 mt-0.5">
                  {proposal.revisedRemainingMinutes} mins
                </div>
              </div>
            </div>

            {/* Retained, Skipped, and Replacement Breakdown */}
            <div className="space-y-4">
              {proposal.completedStops.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold text-emerald-400">
                    Preserved Completed Stops ({proposal.completedStops.length})
                  </div>
                  {proposal.completedStops.map((s) => (
                    <div
                      key={s.stopId}
                      className="p-2.5 rounded bg-slate-950/60 border border-slate-800 text-xs text-slate-300 flex justify-between"
                    >
                      <span>✓ {s.name}</span>
                      <span className="font-mono">Completed</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-1.5">
                <div className="text-xs font-semibold text-white">
                  Retained Upcoming Stops ({proposal.retainedStops.length})
                </div>
                {proposal.retainedStops.length === 0 ? (
                  <div className="text-xs text-slate-400">
                    No original uncompleted stops fit the new constraints.
                  </div>
                ) : (
                  proposal.retainedStops.map((s) => (
                    <div
                      key={s.stopId}
                      className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 text-xs flex flex-wrap items-center justify-between gap-2"
                    >
                      <div>
                        <span className="font-semibold text-white">{s.name}</span>
                        <span className="text-slate-400 ml-2 font-mono tabular-nums">
                          New Arrival: {formatTime(s.suggestedArrivalTime)}
                        </span>
                      </div>
                      <span className="font-mono tabular-nums text-amber-300">
                        ₹{s.estimatedStopCostGroupInr} group
                      </span>
                    </div>
                  ))
                )}
              </div>

              {proposal.skippedStops.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold text-rose-400">
                    Skipped Destinations ({proposal.skippedStops.length})
                  </div>
                  {proposal.skippedStops.map((s) => (
                    <div
                      key={s.stopId}
                      className="p-2.5 rounded-lg bg-rose-950/20 border border-rose-900/50 text-xs text-rose-200 flex justify-between"
                    >
                      <span className="line-through">{s.name}</span>
                      <span className="font-mono tabular-nums">
                        Saved ₹{s.estimatedStopCostGroupInr} & {s.estimatedVisitMinutes}m
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {proposal.replacementStops.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold text-emerald-400">
                    Replacement Stops Added ({proposal.replacementStops.length})
                  </div>
                  {proposal.replacementStops.map((s) => (
                    <div
                      key={s.stopId}
                      className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-800/60 text-xs text-emerald-100 flex flex-wrap items-center justify-between gap-2"
                    >
                      <div>
                        <span className="font-semibold">+ {s.name}</span>
                        <span className="text-emerald-300/80 ml-2 font-mono tabular-nums">
                          Arrive {formatTime(s.suggestedArrivalTime)} ({s.estimatedVisitMinutes}m)
                        </span>
                      </div>
                      <span className="font-mono tabular-nums text-emerald-300">
                        ₹{s.estimatedStopCostGroupInr} group ({s.costStatus})
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Change Log */}
            <div className="border-t border-slate-800 pt-4 space-y-1.5">
              <div className="text-xs font-semibold text-slate-300">
                What Changed & Why:
              </div>
              <ul className="space-y-1 text-xs text-slate-400 list-disc list-inside">
                {proposal.changeLog.map((entry, idx) => (
                  <li key={idx}>{entry}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : (
        /* Section 15: Interactive What-If Trip Simulator */
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
            <div>
              <h2 className="text-base font-semibold text-white">
                01. Select a What-If Scenario to Preview (Does Not Modify Saved State Until Applied)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Test spending shocks, delays, vehicle changes, or stop adjustments using deterministic planner rules.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {WHAT_IF_PRESETS.map((scen) => (
                <button
                  key={scen.type}
                  type="button"
                  onClick={() => handleSelectScenario(scen)}
                  className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    selectedScenario.type === scen.type
                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-semibold'
                      : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  {scen.label}
                </button>
              ))}
            </div>
          </div>

          {/* Side-by-Side Comparison */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-base font-semibold text-white">
                  02. Side-by-Side Comparison: Current Plan vs. “{whatIfResult.scenario.label}”
                </h2>
                <p className="text-xs text-slate-300 mt-1">
                  {whatIfResult.summaryExplanation}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onApplyWhatIfScenario(whatIfResult);
                  setAppliedBanner(
                    `Applied scenario "${whatIfResult.scenario.label}" to active trip.`
                  );
                }}
                className="px-4 py-2 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Apply Scenario to Trip
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-2.5 px-3 font-medium">Metric</th>
                    <th className="py-2.5 px-3 font-medium text-right">
                      Current Saved Plan
                    </th>
                    <th className="py-2.5 px-3 font-medium text-right">
                      Simulated What-If Plan
                    </th>
                    <th className="py-2.5 px-3 font-medium text-right">
                      Impact / Delta
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 font-mono tabular-nums">
                  <tr>
                    <td className="py-3 px-3 font-sans text-slate-200">
                      Estimated Total Spending
                    </td>
                    <td className="py-3 px-3 text-right text-white">
                      ₹{whatIfResult.current.projectedTotalSpendingInr.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-3 text-right text-amber-300 font-semibold">
                      ₹{whatIfResult.simulated.projectedTotalSpendingInr.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-300">
                      {whatIfResult.simulated.projectedTotalSpendingInr -
                        whatIfResult.current.projectedTotalSpendingInr >=
                      0
                        ? '+'
                        : ''}
                      ₹
                      {(
                        whatIfResult.simulated.projectedTotalSpendingInr -
                        whatIfResult.current.projectedTotalSpendingInr
                      ).toLocaleString('en-IN')}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-3 font-sans text-slate-200">
                      Wallet Balance Impact
                    </td>
                    <td className="py-3 px-3 text-right text-emerald-400">
                      ₹{whatIfResult.current.walletBalanceInr.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-3 text-right text-emerald-300">
                      ₹{whatIfResult.simulated.walletBalanceInr.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-300">
                      ₹
                      {(
                        whatIfResult.simulated.walletBalanceInr -
                        whatIfResult.current.walletBalanceInr
                      ).toLocaleString('en-IN')}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-3 font-sans text-slate-200">
                      Remaining Planned Budget
                    </td>
                    <td className="py-3 px-3 text-right text-white">
                      ₹{whatIfResult.current.remainingPlannedBudgetInr.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-3 text-right text-amber-300">
                      ₹{whatIfResult.simulated.remainingPlannedBudgetInr.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-300">
                      ₹
                      {(
                        whatIfResult.simulated.remainingPlannedBudgetInr -
                        whatIfResult.current.remainingPlannedBudgetInr
                      ).toLocaleString('en-IN')}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-3 font-sans text-slate-200">
                      {trip.fuelEstimate.pricingModel === 'max_charge'
                        ? `Maximum ${
                            trip.preferences.transportMode === 'public_transport'
                              ? 'Bus'
                              : trip.preferences.transportMode === 'cab'
                              ? 'Cab'
                              : 'Transit'
                          } Charge`
                        : 'Estimated Fuel Cost'}
                    </td>
                    <td className="py-3 px-3 text-right text-white">
                      ₹{whatIfResult.current.fuelCostInr.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-3 text-right text-white">
                      ₹{whatIfResult.simulated.fuelCostInr.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-300">
                      ₹
                      {(
                        whatIfResult.simulated.fuelCostInr -
                        whatIfResult.current.fuelCostInr
                      ).toLocaleString('en-IN')}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-3 font-sans text-slate-200">
                      Total Travel + Sightseeing Time
                    </td>
                    <td className="py-3 px-3 text-right text-white">
                      {whatIfResult.current.totalTravelMinutes +
                        whatIfResult.current.totalVisitMinutes}{' '}
                      mins
                    </td>
                    <td className="py-3 px-3 text-right text-white">
                      {whatIfResult.simulated.totalTravelMinutes +
                        whatIfResult.simulated.totalVisitMinutes}{' '}
                      mins
                    </td>
                    <td className="py-3 px-3 text-right text-slate-300">
                      {whatIfResult.simulated.totalTravelMinutes +
                        whatIfResult.simulated.totalVisitMinutes -
                        (whatIfResult.current.totalTravelMinutes +
                          whatIfResult.current.totalVisitMinutes)}{' '}
                      mins
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-3 font-sans text-slate-200">
                      Number of Active Destinations
                    </td>
                    <td className="py-3 px-3 text-right text-white">
                      {whatIfResult.current.destinationCount}
                    </td>
                    <td className="py-3 px-3 text-right text-white">
                      {whatIfResult.simulated.destinationCount}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-300 font-sans">
                      {whatIfResult.destinationsGained.length > 0
                        ? `+ ${whatIfResult.destinationsGained.join(', ')}`
                        : whatIfResult.destinationsLost.length > 0
                        ? `- ${whatIfResult.destinationsLost.join(', ')}`
                        : 'Unchanged'}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-3 font-sans text-slate-200">
                      Return Deadline Feasibility
                    </td>
                    <td className="py-3 px-3 text-right font-sans">
                      {whatIfResult.current.meetsReturnDeadline
                        ? 'Feasible ✓'
                        : 'Overrun !'}
                    </td>
                    <td className="py-3 px-3 text-right font-sans font-semibold">
                      {whatIfResult.simulated.meetsReturnDeadline
                        ? 'Feasible ✓'
                        : 'Breaches Deadline !'}
                    </td>
                    <td className="py-3 px-3 text-right font-sans">
                      {whatIfResult.simulated.preservesReserve
                        ? 'Reserve Intact'
                        : 'Dips into Reserve'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
