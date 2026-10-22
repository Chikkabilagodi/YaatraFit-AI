import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Utensils,
  Wallet,
} from 'lucide-react';
import type {
  BudgetSummary,
  ExpenseCategory,
  SpendingRecommendation,
  Transaction,
  Trip,
} from '../types/travel.ts';
import { generateDeterministicSpendingRecommendations } from '../utils/finance.ts';

interface SpendingCoachViewProps {
  trip: Trip;
  transactions: Transaction[];
  budgetSummary: BudgetSummary;
  onRecordRecommendedExpense: (expense: {
    amountInr: number;
    category: ExpenseCategory;
    description: string;
    isTripExpense: boolean;
  }) => void;
}

export const SpendingCoachView: React.FC<SpendingCoachViewProps> = ({
  trip,
  transactions,
  budgetSummary,
  onRecordRecommendedExpense,
}) => {
  const initial = generateDeterministicSpendingRecommendations(
    trip,
    transactions
  );
  const [recommendations, setRecommendations] = useState<
    SpendingRecommendation[]
  >(initial.recommendations);
  const [categoryCaps, setCategoryCaps] = useState<
    Record<ExpenseCategory, number>
  >(initial.categoryCaps);
  const [safePoolInr, setSafePoolInr] = useState<number>(
    initial.safeDiscretionaryPoolInr
  );
  const [returnFuelCommitmentInr, setReturnFuelCommitmentInr] = useState<number>(
    initial.returnFuelCommitmentInr
  );
  const [coachHeadline, setCoachHeadline] = useState<string>(
    `You have ₹${initial.safeDiscretionaryPoolInr.toLocaleString(
      'en-IN'
    )} available for discretionary spending after locking ₹${initial.returnFuelCommitmentInr.toLocaleString(
      'en-IN'
    )} return transit and ₹${budgetSummary.emergencyReserveInr.toLocaleString(
      'en-IN'
    )} emergency reserve.`
  );
  const [localSavingTip, setLocalSavingTip] = useState<string>(
    `Prioritize authentic ${trip.preferences.targetDistrict} tiffin rooms and combined ASI heritage tickets to keep per-person costs low.`
  );
  const [loadingAi, setLoadingAi] = useState(false);
  const [loggedId, setLoggedId] = useState<string | null>(null);

  const refreshCoach = async () => {
    const det = generateDeterministicSpendingRecommendations(trip, transactions);
    setRecommendations(det.recommendations);
    setCategoryCaps(det.categoryCaps);
    setSafePoolInr(det.safeDiscretionaryPoolInr);
    setReturnFuelCommitmentInr(det.returnFuelCommitmentInr);

    setLoadingAi(true);
    try {
      const res = await fetch('/api/ai/spending-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trip, transactions }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.coachHeadline) setCoachHeadline(data.coachHeadline);
        if (data.localSavingTip) setLocalSavingTip(data.localSavingTip);
      }
    } catch {
      // Deterministic recommendations remain displayed
    } finally {
      setLoadingAi(false);
    }
  };

  useEffect(() => {
    refreshCoach();
  }, [trip.id, transactions.length]);

  return (
    <div className="space-y-8">
      <div className="border-b border-white/[0.08] pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-mono font-medium tracking-wider uppercase text-amber-400">
            Advisory · Context-Aware Spend Guidance
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-semibold text-white tracking-tight mt-1">
            AI Spending Coach — “What Should I Spend On Next?”
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Personalised next-spend guidance using your remaining wallet funds, planned budget, emergency reserve, and return fuel needs.
          </p>
        </div>

        <button
          type="button"
          onClick={refreshCoach}
          disabled={loadingAi}
          className="px-4 py-2 text-xs font-semibold bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 rounded-lg transition-all active:scale-[0.98] flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer font-display shadow-sm"
        >
          {loadingAi ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
          <span>Recalculate Advice</span>
        </button>
      </div>

      {/* Coach Headline Banner */}
      <div className="rounded-xl border border-amber-500/20 bg-[#101726] p-6 space-y-3 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 font-mono">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>Active Financial & Route Advisory ({trip.preferences.targetDistrict})</span>
        </div>
        <p className="text-base sm:text-lg font-medium text-white leading-relaxed font-display">
          {coachHeadline}
        </p>
        <p className="text-xs text-slate-300 leading-relaxed font-sans">
          <span className="text-amber-400/90 font-medium">Local Saving Strategy:</span> {localSavingTip}
        </p>
      </div>

      {/* Category Spending Caps Strip */}
      <section className="space-y-3">
        <div className="text-[11px] font-mono text-amber-400 uppercase tracking-wider">01. Guardrails</div>
        <h2 className="text-base font-display font-semibold text-white">
          Recommended Category Spending Caps (Protecting ₹
          {budgetSummary.emergencyReserveInr.toLocaleString('en-IN')} Reserve & ₹
          {returnFuelCommitmentInr.toLocaleString('en-IN')}{' '}
          {trip.fuelEstimate.pricingModel === 'max_charge'
            ? 'Return Transit Fare'
            : 'Return Fuel'}
          )
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {(Object.entries(categoryCaps) as [ExpenseCategory, number][])
            .filter(([cat]) => cat !== 'Other')
            .map(([cat, capInr]) => (
              <div
                key={cat}
                className="p-3.5 rounded-xl border border-white/[0.08] bg-[#101726] shadow-sm hover:border-white/20 transition-colors"
              >
                <div className="text-xs text-slate-400 truncate font-medium">{cat}</div>
                <div className="text-lg font-bold text-white font-mono tabular-nums mt-1">
                  ₹{capInr.toLocaleString('en-IN')}
                </div>
                <div className="text-xs text-slate-400 font-mono tabular-nums mt-0.5">
                  ₹{Math.round(capInr / Math.max(1, trip.preferences.travellerCount))}/person
                </div>
              </div>
            ))}
        </div>
      </section>

      {/* Ranked Next-Spend Recommendations */}
      <section className="space-y-4">
        <div className="text-[11px] font-mono text-amber-400 uppercase tracking-wider">02. Recommendations</div>
        <h2 className="text-base font-display font-semibold text-white">
          Personalised Next-Spend Recommendations
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {recommendations.map((rec) => (
            <div
              key={rec.id}
              className="rounded-xl border border-white/[0.08] bg-[#101726] p-6 flex flex-col justify-between gap-5 shadow-sm hover:border-amber-500/30 transition-colors"
            >
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  <span className="text-amber-400 font-medium">{rec.category}</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {rec.costVerified ? 'Verified Tariff' : 'Estimated Price'}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">
                    {rec.distanceKm} km ({rec.travelDurationMinutes}m transit)
                  </span>
                  {rec.activityDurationMinutes > 0 && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">
                        {rec.activityDurationMinutes}m activity
                      </span>
                    </>
                  )}
                </div>

                <h3 className="text-base font-display font-semibold text-white">
                  {rec.title}
                </h3>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {rec.whySuitable}
                </p>

                <div className="grid grid-cols-2 gap-3 pt-2 text-xs font-mono tabular-nums">
                  <div className="p-3 rounded-lg bg-[#090e17] border border-white/[0.08]">
                    <div className="text-slate-400">Wallet Balance After</div>
                    <div
                      className={`font-semibold text-sm mt-1 ${
                        budgetSummary.walletBalanceInr === 0
                          ? 'text-amber-400'
                          : rec.walletBalanceAfterInr >= 0
                          ? 'text-emerald-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {budgetSummary.walletBalanceInr === 0
                        ? `Top-up ₹${rec.estimatedCostGroupInr} needed`
                        : `₹${rec.walletBalanceAfterInr.toLocaleString('en-IN')}`}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-[#090e17] border border-white/[0.08]">
                    <div className="text-slate-400">Planned Budget After</div>
                    <div
                      className={`font-semibold text-sm mt-1 ${
                        rec.remainingPlannedBudgetAfterInr >= 0
                          ? 'text-amber-300'
                          : 'text-rose-400'
                      }`}
                    >
                      ₹{rec.remainingPlannedBudgetAfterInr.toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  Note: {rec.uncertaintyNote}
                </p>
              </div>

              <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between gap-3">
                <div className="font-mono tabular-nums">
                  <div className="text-sm font-semibold text-white">
                    ₹{rec.estimatedCostGroupInr.toLocaleString('en-IN')} group
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    ₹{rec.estimatedCostPerPersonInr}/person ·{' '}
                    {rec.preservesEmergencyReserve
                      ? 'Reserve Safe'
                      : 'Dips into Reserve'}
                  </div>
                </div>

                {rec.estimatedCostGroupInr > 0 &&
                  rec.recommendationType !== 'transport_saving' && (
                    <button
                      type="button"
                      disabled={
                        rec.estimatedCostGroupInr >
                        budgetSummary.walletBalanceInr
                      }
                      title={
                        rec.estimatedCostGroupInr > budgetSummary.walletBalanceInr
                          ? `Wallet balance (₹${budgetSummary.walletBalanceInr}) is lower than this expense. Top up your demo wallet in Travel Wallet to record.`
                          : undefined
                      }
                      onClick={() => {
                        onRecordRecommendedExpense({
                          amountInr: rec.estimatedCostGroupInr,
                          category: rec.category,
                          description: rec.title,
                          isTripExpense: true,
                        });
                        setLoggedId(rec.id);
                      }}
                      className="px-3.5 py-2 text-xs font-semibold bg-[#090e17] hover:bg-slate-800 disabled:opacity-50 text-amber-300 border border-white/[0.08] hover:border-amber-500/40 rounded-lg transition-all active:scale-[0.98] whitespace-nowrap shrink-0 cursor-pointer shadow-sm"
                    >
                      {loggedId === rec.id
                        ? 'Logged to Wallet ✓'
                        : rec.estimatedCostGroupInr > budgetSummary.walletBalanceInr
                        ? `Requires ₹${rec.estimatedCostGroupInr} in Wallet`
                        : `Spend ₹${rec.estimatedCostGroupInr} Now`}
                    </button>
                  )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
