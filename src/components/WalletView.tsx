import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Plus,
  RotateCcw,
  ShieldAlert,
  Trash2,
  Undo2,
  Wallet,
} from 'lucide-react';
import type {
  BudgetSummary,
  ExpenseCategory,
  Transaction,
  Trip,
} from '../types/travel.ts';
import {
  validateExpenseInput,
  validateTopUpAmount,
} from '../utils/finance.ts';

interface WalletViewProps {
  trip: Trip;
  transactions: Transaction[];
  budgetSummary: BudgetSummary;
  onAddTopUp: (amountInr: number, description: string) => void;
  onAddExpense: (expense: {
    amountInr: number;
    category: ExpenseCategory;
    description: string;
    stopId?: string;
    isTripExpense: boolean;
  }) => void;
  onUndoTransaction: (transactionId: string) => {
    success: boolean;
    error?: string;
  };
  onResetWallet: () => void;
}

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Food',
  'Fuel and transport',
  'Accommodation',
  'Entry tickets',
  'Activities',
  'Shopping',
  'Other',
];

const PRESET_TOPUPS = [200, 500, 1000, 2000];

export const WalletView: React.FC<WalletViewProps> = ({
  trip,
  transactions,
  budgetSummary,
  onAddTopUp,
  onAddExpense,
  onUndoTransaction,
  onResetWallet,
}) => {
  const [topUpInput, setTopUpInput] = useState('0');
  const [topUpDesc, setTopUpDesc] = useState('Simulated travel top-up');

  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] =
    useState<ExpenseCategory>('Food');
  const [expenseDesc, setExpenseDesc] = useState('');
  const [selectedStopId, setSelectedStopId] = useState<string>('');
  const [isTripExpense, setIsTripExpense] = useState<boolean>(true);

  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [feedback, setFeedback] = useState<{
    type: 'error' | 'success';
    message: string;
  } | null>(null);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  const formatTxTime = (iso?: string) => {
    if (!iso) return '--:--';
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return '--:--';
      return d.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '--:--';
    }
  };

  const handlePresetTopUp = (amount: number) => {
    setFeedback(null);
    const check = validateTopUpAmount(amount);
    if (!check.valid) {
      setFeedback({ type: 'error', message: check.error || 'Invalid amount' });
      return;
    }
    onAddTopUp(check.sanitizedInr, `Preset Demo Top-Up (+₹${check.sanitizedInr})`);
    setFeedback({
      type: 'success',
      message: `Added ₹${check.sanitizedInr.toLocaleString('en-IN')} to demo wallet. Planned trip budget (₹${budgetSummary.plannedTripBudgetInr.toLocaleString('en-IN')}) remains unchanged.`,
    });
  };

  const handleCustomTopUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    const num = Number(topUpInput);
    const check = validateTopUpAmount(num);
    if (!check.valid) {
      setFeedback({
        type: 'error',
        message: check.error || 'Invalid top-up amount.',
      });
      return;
    }
    onAddTopUp(
      check.sanitizedInr,
      topUpDesc.trim() || `Custom Demo Top-Up (+₹${check.sanitizedInr})`
    );
    setTopUpInput('');
    setFeedback({
      type: 'success',
      message: `Added ₹${check.sanitizedInr.toLocaleString('en-IN')} simulated funds to wallet.`,
    });
  };

  const handleExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    const num = Number(expenseAmount);
    const check = validateExpenseInput(
      num,
      expenseDesc,
      budgetSummary.walletBalanceInr
    );
    if (!check.valid) {
      setFeedback({
        type: 'error',
        message: check.error || 'Invalid expense.',
      });
      return;
    }

    onAddExpense({
      amountInr: check.sanitizedInr,
      category: expenseCategory,
      description: expenseDesc.trim(),
      stopId: selectedStopId || undefined,
      isTripExpense,
    });

    setExpenseAmount('');
    setExpenseDesc('');
    setFeedback({
      type: 'success',
      message: isTripExpense
        ? `Recorded ₹${check.sanitizedInr.toLocaleString('en-IN')} trip expense (${expenseCategory}). Both wallet balance and remaining planned budget updated.`
        : `Recorded ₹${check.sanitizedInr.toLocaleString('en-IN')} non-trip wallet expense. Deducted from wallet balance without charging your planned trip budget.`,
    });
  };

  const handleUndo = (txId: string) => {
    setFeedback(null);
    const res = onUndoTransaction(txId);
    if (!res.success) {
      setFeedback({
        type: 'error',
        message: res.error || 'Could not undo transaction.',
      });
    } else {
      setFeedback({
        type: 'success',
        message: 'Transaction reversed safely.',
      });
    }
  };

  const filteredTransactions = transactions.filter((tx) => {
    if (categoryFilter === 'ALL') return true;
    if (categoryFilter === 'TOP_UP') return tx.type === 'top_up';
    return tx.category === categoryFilter;
  });

  return (
    <div className="space-y-8">
      {/* Header + Mandatory DEMO WALLET Notice */}
      <div className="border-b border-white/[0.08] pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-mono font-medium tracking-wider uppercase text-amber-400">
            Simulated Sandbox · Zero Real Currency Risk
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-semibold text-white tracking-tight mt-1">
            Simulated Travel Wallet & Expense Ledger
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Add simulated funds, log categorized trip or personal expenses, undo mistakes once, and verify separate budget accounting.
          </p>
        </div>

        <div>
          {!confirmResetOpen ? (
            <button
              type="button"
              onClick={() => setConfirmResetOpen(true)}
              className="px-3.5 py-2 text-xs font-medium bg-[#101726] hover:bg-rose-950/40 text-slate-300 hover:text-rose-200 border border-white/[0.08] hover:border-rose-800/50 rounded-lg transition-all active:scale-[0.98] flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Demo Wallet</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 bg-rose-950/40 border border-rose-800/50 rounded-lg p-1.5 backdrop-blur-sm">
              <span className="text-xs text-rose-200 px-2 font-medium">
                Confirm full wallet reset?
              </span>
              <button
                type="button"
                onClick={() => {
                  onResetWallet();
                  setConfirmResetOpen(false);
                  setFeedback({
                    type: 'success',
                    message: 'Demo wallet reset to ₹0 balance.',
                  });
                }}
                className="px-2.5 py-1 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded active:scale-95 transition-all cursor-pointer"
              >
                Confirm Reset
              </button>
              <button
                type="button"
                onClick={() => setConfirmResetOpen(false)}
                className="px-2.5 py-1 text-xs text-slate-300 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          role="status"
          className={`p-4 rounded-xl border text-xs flex items-center justify-between gap-3 ${
            feedback.type === 'error'
              ? 'bg-rose-950/30 border-rose-800/60 text-rose-200'
              : 'bg-emerald-950/20 border-emerald-800/50 text-emerald-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span className="leading-relaxed">{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs underline text-slate-300 hover:text-white cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Separated Financial Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-white/[0.08] bg-[#101726] shadow-sm relative overflow-hidden group hover:border-emerald-500/30 transition-colors">
          <div className="text-xs text-slate-400 font-medium">Available Wallet Balance</div>
          <div
            data-testid="wallet-balance-display"
            className="text-2xl font-bold text-emerald-400 font-mono tabular-nums mt-1.5"
          >
            ₹{budgetSummary.walletBalanceInr.toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-slate-400 font-mono tabular-nums mt-1">
            Total Added: ₹{budgetSummary.totalValidTopUpsInr.toLocaleString('en-IN')}
          </div>
        </div>

        <div className="p-4 rounded-xl border border-white/[0.08] bg-[#101726] shadow-sm relative overflow-hidden group hover:border-white/20 transition-colors">
          <div className="text-xs text-slate-400 font-medium">Total Wallet Spending</div>
          <div
            data-testid="wallet-total-spent"
            className="text-2xl font-bold text-white font-mono tabular-nums mt-1.5"
          >
            ₹{budgetSummary.totalValidWalletExpensesInr.toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-slate-400 font-mono tabular-nums mt-1">
            Trip: ₹{budgetSummary.validTripExpensesInr.toLocaleString('en-IN')} · Non-Trip: ₹{budgetSummary.unrelatedWalletExpensesInr.toLocaleString('en-IN')}
          </div>
        </div>

        <div className="p-4 rounded-xl border border-white/[0.08] bg-[#101726] shadow-sm relative overflow-hidden group hover:border-amber-500/30 transition-colors">
          <div className="text-xs text-slate-400 font-medium">Planned Trip Budget (Fixed)</div>
          <div
            data-testid="wallet-planned-budget"
            className="text-2xl font-bold text-white font-mono tabular-nums mt-1.5"
          >
            ₹{budgetSummary.plannedTripBudgetInr.toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Independent of demo top-ups
          </div>
        </div>

        <div className="p-4 rounded-xl border border-white/[0.08] bg-[#101726] shadow-sm relative overflow-hidden group hover:border-amber-500/30 transition-colors">
          <div className="text-xs text-slate-400 font-medium">Remaining Planned Budget</div>
          <div
            data-testid="wallet-remaining-planned-budget"
            className={`text-2xl font-bold font-mono tabular-nums mt-1.5 ${
              budgetSummary.remainingPlannedBudgetInr < 0
                ? 'text-rose-400'
                : 'text-amber-300'
            }`}
          >
            ₹{budgetSummary.remainingPlannedBudgetInr.toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-slate-400 font-mono tabular-nums mt-1">
            Reserve target: ₹{budgetSummary.emergencyReserveInr.toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {/* Two-Column Forms: Add Demo Funds & Record Expense */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 5 columns: Add Simulated Funds */}
        <div className="lg:col-span-5 rounded-xl border border-white/[0.08] bg-[#101726] p-6 space-y-5">
          <div>
            <div className="text-[11px] font-mono text-amber-400 uppercase tracking-wider">01. Funds</div>
            <h2 className="text-base font-display font-semibold text-white mt-0.5">
              Add Simulated Money
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
              Instant demo top-ups. Never connects to real bank accounts or UPI.
            </p>
          </div>

          <div className="space-y-2">
            <span className="block text-xs font-medium text-slate-300">
              Quick Preset Top-Ups
            </span>
            <div className="grid grid-cols-4 gap-2">
              {PRESET_TOPUPS.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => handlePresetTopUp(amt)}
                  className="py-2 px-3 text-xs font-semibold font-mono tabular-nums bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-700/40 hover:border-emerald-600 rounded-lg transition-all active:scale-[0.97] cursor-pointer"
                >
                  +₹{amt}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleCustomTopUpSubmit} className="space-y-4 pt-4 border-t border-white/[0.08]">
            <div>
              <label
                htmlFor="custom-topup-amount"
                className="block text-xs font-medium text-slate-300 mb-1.5"
              >
                Custom Top-Up Amount (INR ₹)
              </label>
              <input
                id="custom-topup-amount"
                type="number"
                min={1}
                max={500000}
                value={topUpInput}
                onChange={(e) => setTopUpInput(e.target.value)}
                placeholder="0"
                className="w-full rounded-lg border border-white/[0.1] bg-[#090e17] px-3.5 py-2.5 text-sm text-white font-mono tabular-nums focus:border-amber-400 focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label
                htmlFor="custom-topup-desc"
                className="block text-xs font-medium text-slate-300 mb-1.5"
              >
                Top-Up Note
              </label>
              <input
                id="custom-topup-desc"
                type="text"
                value={topUpDesc}
                onChange={(e) => setTopUpDesc(e.target.value)}
                className="w-full rounded-lg border border-white/[0.1] bg-[#090e17] px-3.5 py-2.5 text-xs text-white focus:border-amber-400 focus:outline-none transition-colors"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add Custom Simulated Funds</span>
            </button>
          </form>
        </div>

        {/* Right 7 columns: Record Categorized Expense */}
        <div className="lg:col-span-7 rounded-xl border border-white/[0.08] bg-[#101726] p-6 space-y-5">
          <div>
            <div className="text-[11px] font-mono text-amber-400 uppercase tracking-wider">02. Ledger</div>
            <h2 className="text-base font-display font-semibold text-white mt-0.5">
              Record Travel or Personal Wallet Expense
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
              Validates against available wallet balance (₹{budgetSummary.walletBalanceInr.toLocaleString('en-IN')}) and updates budgets deterministically.
            </p>
          </div>

          <form onSubmit={handleExpenseSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="expense-amount-input"
                  className="block text-xs font-medium text-slate-300 mb-1.5"
                >
                  Expense Amount (INR ₹)
                </label>
                <input
                  id="expense-amount-input"
                  type="number"
                  min={1}
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  placeholder="e.g. 200"
                  className="w-full rounded-lg border border-white/[0.1] bg-[#090e17] px-3.5 py-2.5 text-sm text-white font-mono tabular-nums focus:border-amber-400 focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label
                  htmlFor="expense-category-select"
                  className="block text-xs font-medium text-slate-300 mb-1.5"
                >
                  Expense Category
                </label>
                <select
                  id="expense-category-select"
                  value={expenseCategory}
                  onChange={(e) =>
                    setExpenseCategory(e.target.value as ExpenseCategory)
                  }
                  className="w-full rounded-lg border border-white/[0.1] bg-[#090e17] px-3.5 py-2.5 text-sm text-white focus:border-amber-400 focus:outline-none transition-colors"
                >
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="expense-description-input"
                  className="block text-xs font-medium text-slate-300 mb-1.5"
                >
                  Description
                </label>
                <input
                  id="expense-description-input"
                  type="text"
                  value={expenseDesc}
                  onChange={(e) => setExpenseDesc(e.target.value)}
                  placeholder="e.g. Masala Dosa & Filter Coffee at MTR"
                  className="w-full rounded-lg border border-white/[0.1] bg-[#090e17] px-3.5 py-2.5 text-xs text-white focus:border-amber-400 focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label
                  htmlFor="expense-stop-select"
                  className="block text-xs font-medium text-slate-300 mb-1.5"
                >
                  Associate with Itinerary Stop (Optional)
                </label>
                <select
                  id="expense-stop-select"
                  value={selectedStopId}
                  onChange={(e) => setSelectedStopId(e.target.value)}
                  className="w-full rounded-lg border border-white/[0.1] bg-[#090e17] px-3.5 py-2.5 text-xs text-white focus:border-amber-400 focus:outline-none transition-colors"
                >
                  <option value="">General Trip / Unassigned Stop</option>
                  {trip.stops
                    .filter((s) => !s.skipped)
                    .map((s) => (
                      <option key={s.stopId} value={s.stopId}>
                        {s.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="pt-1">
              <label className="flex items-center gap-2.5 text-xs text-slate-200 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isTripExpense}
                  onChange={(e) => setIsTripExpense(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-0 focus:ring-offset-0"
                />
                <span className="leading-relaxed">
                  Count towards Active Trip Budget (Uncheck if this is an unrelated personal wallet expense)
                </span>
              </label>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg transition-all active:scale-[0.98] cursor-pointer shadow-sm font-display tracking-wide"
            >
              Record Expense in Ledger
            </button>
          </form>
        </div>
      </div>

      {/* Transaction History & Category Filter */}
      <section className="rounded-xl border border-white/[0.08] bg-[#101726] p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
          <div>
            <div className="text-[11px] font-mono text-amber-400 uppercase tracking-wider">03. History</div>
            <h2 className="text-base font-display font-semibold text-white mt-0.5">
              Transaction Ledger ({filteredTransactions.length})
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Each transaction has a stable ID, timestamp, category, and one-time Undo safeguard.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {['ALL', 'TOP_UP', ...EXPENSE_CATEGORIES].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all active:scale-[0.97] whitespace-nowrap shrink-0 cursor-pointer ${
                  categoryFilter === cat
                    ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                    : 'bg-[#090e17] text-slate-400 hover:text-white border border-white/[0.08]'
                }`}
              >
                {cat === 'ALL' ? 'All' : cat === 'TOP_UP' ? 'Top-Ups' : cat}
              </button>
            ))}
          </div>
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No transactions match this filter. Use the forms above to add demo funds or log an expense.
          </div>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {[...filteredTransactions].reverse().map((tx) => (
              <div
                key={tx.id}
                className={`py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  tx.undone ? 'opacity-40' : ''
                }`}
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                    <span className="font-mono tabular-nums">
                      {formatTxTime(tx.timestamp)}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {tx.type === 'top_up' ? 'Simulated Top-Up' : tx.category}
                    </span>
                    {tx.type === 'expense' && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>
                          {tx.isTripExpense
                            ? 'Trip Budget Expense'
                            : 'Unrelated Personal Expense'}
                        </span>
                      </>
                    )}
                    {tx.undone && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-rose-400 font-semibold">
                          UNDONE / REVERSED
                        </span>
                      </>
                    )}
                  </div>
                  <div className="text-sm font-medium text-white">
                    {tx.description}
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0 self-end sm:self-center">
                  <div
                    className={`text-sm font-semibold font-mono tabular-nums ${
                      tx.undone
                        ? 'line-through text-slate-500'
                        : tx.type === 'top_up'
                        ? 'text-emerald-400'
                        : 'text-amber-300'
                    }`}
                  >
                    {tx.type === 'top_up' ? '+' : '-'}₹
                    {tx.amountInr.toLocaleString('en-IN')}
                  </div>

                  <button
                    type="button"
                    disabled={tx.undone}
                    onClick={() => handleUndo(tx.id)}
                    aria-label={`Undo transaction ${tx.description}`}
                    className="px-2.5 py-1 text-xs font-medium bg-[#090e17] hover:bg-slate-800 disabled:opacity-40 text-slate-200 border border-white/[0.08] rounded-md flex items-center gap-1 whitespace-nowrap shrink-0 transition-all active:scale-95 cursor-pointer"
                  >
                    <Undo2 className="w-3 h-3" />
                    <span>{tx.undone ? 'Undone' : 'Undo'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
