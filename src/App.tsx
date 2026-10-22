import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  Compass,
  FolderKanban,
  LayoutDashboard,
  MapPin,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Wallet,
  MessageSquareText,
  CheckCircle2,
  AlertTriangle,
  Phone,
  Mail,
  ExternalLink,
} from 'lucide-react';
import { NetworkStatusBanner, SmoothScroll } from './components/ui/index.ts';
import { useNetworkStatus } from './hooks/useNetworkStatus.ts';
import type {
  ExpenseCategory,
  ItineraryStop,
  RecoveryProposal,
  Transaction,
  Trip,
  WalletState,
  WhatIfComparisonResult,
} from './types/travel.ts';
import {
  calculateBudgetSummary,
  calculateFuelEstimate,
  calculateMaxTransportCharge,
  evaluateFeasibilityWarnings,
  isMileageBasedTransport,
  recalculateStopSchedule,
  undoWalletTransaction,
} from './utils/finance.ts';
import {
  clearAllDemoStorage,
  loadStoredTripsAndWallet,
  saveTripsToStorage,
  saveWalletToStorage,
} from './utils/storage.ts';
import {
  DashboardView,
  TripPlannerView,
  ExploreMapView,
  MyTripsView,
  WalletView,
  SpendingCoachView,
  RecoveryAndSimulatorView,
  YtrikaChatView,
  NotFoundView,
  type NavSection,
} from './components/index.ts';
import {
  getStoredLanguage,
  setStoredLanguage,
  translations,
  type Language,
} from './utils/i18n.ts';

const NAV_ITEMS: { id: NavSection; defaultLabel: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'dashboard', defaultLabel: 'Overview', icon: LayoutDashboard },
  { id: 'planner', defaultLabel: 'Plan a Trip', icon: Compass },
  { id: 'map', defaultLabel: 'Explore Map', icon: MapPin },
  { id: 'trips', defaultLabel: 'My Journeys', icon: FolderKanban },
  { id: 'wallet', defaultLabel: 'Travel Wallet', icon: Wallet },
  { id: 'coach', defaultLabel: 'Budget Guide', icon: Sparkles },
  { id: 'recovery', defaultLabel: 'Trip Adjuster', icon: RefreshCw },
  { id: 'chat', defaultLabel: 'Ask Ytrika', icon: MessageSquareText },
];

export default function App() {
  const [language, setLanguage] = useState<Language>(() => getStoredLanguage());
  const [initialData] = useState(() => loadStoredTripsAndWallet());
  const [trips, setTrips] = useState<Trip[]>(initialData.trips);
  const [activeTripId, setActiveTripId] = useState<string>(
    initialData.activeTripId
  );
  const [wallet, setWallet] = useState<WalletState>(initialData.wallet);
  const [activeSection, setActiveSection] = useState<NavSection>('dashboard');
  const [gmpQuotaExceeded, setGmpQuotaExceeded] = useState(false);
  const [toast, setToast] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const network = useNetworkStatus();

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ type, message });
    setTimeout(() => {
      setToast((curr) => (curr?.message === message ? null : curr));
    }, 4000);
  };

  const handleLanguageChange = (nextLang: Language) => {
    setLanguage(nextLang);
    setStoredLanguage(nextLang);
  };

  // Listen for Google Maps Demo Key quota event (Section 8 of Google Maps skill)
  useEffect(() => {
    const handleQuotaExceeded = () => setGmpQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuotaExceeded);
    return () =>
      window.removeEventListener('gmp-quota-exceeded', handleQuotaExceeded);
  }, []);

  // Persist trips and wallet on change
  useEffect(() => {
    saveTripsToStorage(trips, activeTripId);
  }, [trips, activeTripId]);

  useEffect(() => {
    saveWalletToStorage(wallet);
  }, [wallet]);

  const activeTrip =
    trips.find((t) => t.id === activeTripId) || trips[0];

  const budgetSummary = calculateBudgetSummary(
    activeTrip,
    wallet.transactions
  );

  const updateActiveTrip = (updater: (t: Trip) => Trip) => {
    setTrips((prev) =>
      prev.map((t) => {
        if (t.id !== activeTrip.id) return t;
        const updated = updater(t);
        const recalculatedStops = recalculateStopSchedule(
          updated.preferences.startingCoordinates,
          updated.preferences.departureDateTime,
          updated.stops,
          updated.preferences
        );
        const fuel = calculateFuelEstimate(
          updated.preferences.startingCoordinates,
          recalculatedStops,
          updated.preferences
        );
        const warnings = evaluateFeasibilityWarnings(
          updated.preferences,
          recalculatedStops,
          fuel,
          wallet.transactions
        );
        return {
          ...updated,
          stops: recalculatedStops,
          fuelEstimate: fuel,
          warnings,
          updatedAt: new Date().toISOString(),
        };
      })
    );
  };

  const handleToggleStopCompleted = (stopId: string) => {
    updateActiveTrip((t) => ({
      ...t,
      stops: t.stops.map((s) =>
        s.stopId === stopId ? { ...s, completed: !s.completed } : s
      ),
    }));
  };

  const handleTripCreated = (newTrip: Trip) => {
    setTrips((prev) => [newTrip, ...prev]);
    setActiveTripId(newTrip.id);
    setActiveSection('dashboard');
    showToast(
      language === 'kn'
        ? `${newTrip.title} ಯಶಸ್ವಿಯಾಗಿ ರಚಿಸಲಾಗಿದೆ!`
        : `Trip "${newTrip.title}" planned successfully!`,
      'success'
    );
  };

  const handleAddStopToTrip = (newStop: ItineraryStop) => {
    updateActiveTrip((t) => ({
      ...t,
      stops: [...t.stops, newStop],
    }));
    showToast(
      language === 'kn'
        ? `${newStop.nameKn || newStop.name} ತಾಣವನ್ನು ಸೇರಿಸಲಾಗಿದೆ`
        : `Added stop "${newStop.name}" to trip`,
      'success'
    );
  };

  const handleRemoveStopFromTrip = (stopId: string) => {
    const stopToRemove = activeTrip.stops.find((s) => s.stopId === stopId);
    updateActiveTrip((t) => ({
      ...t,
      stops: t.stops.filter((s) => s.stopId !== stopId),
    }));
    showToast(
      language === 'kn'
        ? `${stopToRemove?.nameKn || stopToRemove?.name || 'ತಾಣ'} ತೆಗೆದುಹಾಕಲಾಗಿದೆ`
        : `Removed stop "${stopToRemove?.name || ''}" from trip`,
      'success'
    );
  };

  const handleUpdateLiveRouteMetrics = (
    stopId: string,
    distanceKm: number,
    durationMinutes: number,
    trafficAware: boolean
  ) => {
    setTrips((prev) =>
      prev.map((t) => {
        if (t.id !== activeTrip.id) return t;
        const updatedStops = t.stops.map((s) =>
          s.stopId === stopId
            ? {
                ...s,
                distanceFromPrevKm: distanceKm,
                travelMinutesFromPrev: durationMinutes,
                routeSource: 'live_routes_api' as const,
                trafficAware,
              }
            : s
        );
        const fuel = calculateFuelEstimate(
          t.preferences.startingCoordinates,
          updatedStops,
          t.preferences
        );
        const warnings = evaluateFeasibilityWarnings(
          t.preferences,
          updatedStops,
          fuel,
          wallet.transactions
        );
        return {
          ...t,
          stops: updatedStops,
          fuelEstimate: fuel,
          warnings,
          updatedAt: new Date().toISOString(),
        };
      })
    );
  };

  // Wallet Handlers
  const handleAddTopUp = (amountInr: number, description: string) => {
    const newTx: Transaction = {
      id: `tx-topup-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: 'top_up',
      amountInr,
      description,
      timestamp: new Date().toISOString(),
      isTripExpense: false,
      undone: false,
    };
    setWallet((prev) => ({
      ...prev,
      transactions: [...prev.transactions, newTx],
      lastUpdated: new Date().toISOString(),
    }));
    showToast(
      language === 'kn'
        ? `₹${amountInr.toLocaleString('en-IN')} ವಾಲೆಟ್‌ಗೆ ಜಮಾ ಮಾಡಲಾಗಿದೆ`
        : `Added ₹${amountInr.toLocaleString('en-IN')} to demo wallet`,
      'success'
    );
  };

  const handleAddExpense = (expense: {
    amountInr: number;
    category: ExpenseCategory;
    description: string;
    stopId?: string;
    isTripExpense: boolean;
  }) => {
    const newTx: Transaction = {
      id: `tx-exp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: 'expense',
      amountInr: expense.amountInr,
      category: expense.category,
      description: expense.description,
      timestamp: new Date().toISOString(),
      tripId: expense.isTripExpense ? activeTrip.id : undefined,
      stopId: expense.stopId,
      isTripExpense: expense.isTripExpense,
      undone: false,
    };
    setWallet((prev) => ({
      ...prev,
      transactions: [...prev.transactions, newTx],
      lastUpdated: new Date().toISOString(),
    }));
    showToast(
      language === 'kn'
        ? `₹${expense.amountInr.toLocaleString('en-IN')} ವೆಚ್ಚ ದಾಖಲಿಸಲಾಗಿದೆ`
        : `Recorded ₹${expense.amountInr.toLocaleString('en-IN')} expense`,
      'success'
    );
  };

  const handleUndoTransaction = (transactionId: string) => {
    const result = undoWalletTransaction(wallet.transactions, transactionId);
    if (result.success) {
      setWallet((prev) => ({
        ...prev,
        transactions: result.transactions,
        lastUpdated: new Date().toISOString(),
      }));
      showToast(
        language === 'kn'
          ? 'ವಹಿವಾಟನ್ನು ರದ್ದುಗೊಳಿಸಲಾಗಿದೆ'
          : 'Transaction undone successfully',
        'success'
      );
    } else {
      showToast(
        result.error ||
          (language === 'kn' ? 'ರದ್ದುಗೊಳಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ' : 'Could not undo transaction'),
        'error'
      );
    }
    return { success: result.success, error: result.error };
  };

  const handleResetWallet = () => {
    setWallet({
      version: 1,
      transactions: [],
      lastUpdated: new Date().toISOString(),
    });
    showToast(
      language === 'kn' ? 'ವಾಲೆಟ್ ಮರುಹೊಂದಿಸಲಾಗಿದೆ' : 'Travel wallet reset',
      'success'
    );
  };

  const handleApplyRecoveryProposal = (proposal: RecoveryProposal) => {
    updateActiveTrip((t) => {
      const nextMode = proposal.trigger.newTransportMode || t.preferences.transportMode;
      return {
        ...t,
        preferences: {
          ...t.preferences,
          transportMode: nextMode,
          vehicleMileageKmPerLitre: isMileageBasedTransport(nextMode)
            ? (nextMode === 'motorcycle' ? 42 : 16)
            : 0,
          fuelPricePerLitreInr: isMileageBasedTransport(nextMode)
            ? (t.preferences.fuelPricePerLitreInr || 103)
            : 0,
          maxTransportChargeInr: isMileageBasedTransport(nextMode)
            ? undefined
            : proposal.revisedFuelEstimate.maxChargeTotalInr,
        },
        stops: proposal.revisedStops,
        aiSummary: proposal.explanationSummary,
      };
    });
  };

  const handleApplyWhatIfScenario = (result: WhatIfComparisonResult) => {
    if (result.scenario.extraSpendInr && result.scenario.extraSpendInr > 0) {
      // Ensure wallet has sufficient demo funds for simulated extra spend to prevent negative balance
      const requiredTopUp = Math.max(
        0,
        result.scenario.extraSpendInr - budgetSummary.walletBalanceInr
      );
      if (requiredTopUp > 0) {
        handleAddTopUp(
          requiredTopUp,
          `Demo Auto-Credit for Scenario: ${result.scenario.label}`
        );
      }
      handleAddExpense({
        amountInr: result.scenario.extraSpendInr,
        category: 'Activities',
        description: `Applied Scenario: ${result.scenario.label}`,
        isTripExpense: true,
      });
    }
    updateActiveTrip((t) => {
      const nextMode =
        result.scenario.newTransportMode || t.preferences.transportMode;
      return {
        ...t,
        preferences: {
          ...t.preferences,
          transportMode: nextMode,
          vehicleMileageKmPerLitre: isMileageBasedTransport(nextMode)
            ? (nextMode === 'motorcycle' ? 42 : 16)
            : 0,
          fuelPricePerLitreInr: isMileageBasedTransport(nextMode)
            ? (t.preferences.fuelPricePerLitreInr || 103)
            : 0,
          maxTransportChargeInr: isMileageBasedTransport(nextMode)
            ? undefined
            : (t.preferences.maxTransportChargeInr ??
               calculateMaxTransportCharge(
                 result.simulated.fuelCostInr,
                 nextMode,
                 t.preferences.travellerCount
               ).maxChargeTotalInr),
          plannedBudgetInr: result.scenario.budgetReductionInr
            ? Math.max(
                500,
                t.preferences.plannedBudgetInr - result.scenario.budgetReductionInr
              )
            : t.preferences.plannedBudgetInr,
        },
        stops: result.simulated.stops,
      };
    });
  };

  return (
    <SmoothScroll>
      <div className="min-h-screen flex flex-col bg-[#090e17] text-slate-100 antialiased selection:bg-amber-500/25 selection:text-amber-200 overflow-x-hidden w-full max-w-full">
        {/* Network status listener notification for lost/restored connectivity */}
        <NetworkStatusBanner network={network} language={language} />

        {/* Real-Time Toast Notifications (Success & Error Messages) */}
        {toast && (
          <div
            role="alert"
            aria-live="polite"
            className={`fixed top-4 right-4 z-50 max-w-sm px-4 py-3 rounded-xl border shadow-2xl flex items-center gap-3 text-xs sm:text-sm font-medium transition-all backdrop-blur-xl ${
              toast.type === 'success'
                ? 'bg-emerald-950/95 border-emerald-500/50 text-emerald-200 shadow-emerald-950/60'
                : 'bg-rose-950/95 border-rose-500/50 text-rose-200 shadow-rose-950/60'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span className="flex-1 leading-snug">{toast.message}</span>
            <button
              type="button"
              onClick={() => setToast(null)}
              aria-label="Close notification"
              className="text-slate-400 hover:text-white transition-colors cursor-pointer p-0.5"
            >
              ✕
            </button>
          </div>
        )}

        {/* Required Google Maps Platform Demo Quota Banner (Only visible if quota reached) */}
        {gmpQuotaExceeded && (
          <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
            <span>
              Google Maps Platform quota reached. If you are the app owner, visit{' '}
              <a
                href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-semibold text-amber-950 hover:text-amber-800"
              >
                maps developer site
              </a>{' '}
              for instructions to update your account.
            </span>
          </div>
        )}

        {/* Main Content Viewport */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto pb-32">
          {/* Clean Breadcrumb Header for Sub-Views */}
          {activeSection !== 'dashboard' && (
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
              <button
                type="button"
                onClick={() => setActiveSection('dashboard')}
                className="flex items-center gap-2.5 text-white hover:text-amber-300 active:scale-[0.98] transition-all group cursor-pointer"
              >
                <div className="bg-white px-2 py-0.5 rounded shadow-sm border border-slate-200/40 flex items-center justify-center shrink-0">
                  <img
                    src="/assets/aistudio/image_81bf5380.png"
                    alt="Karnataka Tourism Logo"
                    className="h-5 w-auto object-contain transition-transform group-hover:scale-105"
                  />
                </div>
                <span className="text-xs sm:text-sm font-semibold font-display">
                  {translations[language].dashboard.backToOverview}
                </span>
              </button>

              <div className="flex flex-wrap items-center gap-2.5 sm:gap-4 text-xs font-mono text-slate-400 tabular-nums">
                <span className="hidden sm:inline">
                  {translations[language].common.district}: <strong className="text-white font-sans">{activeTrip.preferences.targetDistrict}</strong>
                </span>
                <span aria-hidden="true" className="hidden sm:inline text-slate-600">·</span>
                <span>
                  {translations[language].common.wallet}: <strong className="text-emerald-400">₹{budgetSummary.walletBalanceInr.toLocaleString('en-IN')}</strong>
                </span>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <span>
                  {translations[language].common.remaining}: <strong className="text-amber-300">₹{budgetSummary.remainingPlannedBudgetInr.toLocaleString('en-IN')}</strong>
                </span>

                {/* Subpage Language Switcher */}
                <div
                  role="group"
                  aria-label={translations[language].hero.languageSelect}
                  className="flex items-center gap-0.5 p-0.5 rounded-full bg-[#121927] border border-white/[0.08] ml-2 font-sans"
                >
                  <button
                    type="button"
                    onClick={() => handleLanguageChange('en')}
                    aria-pressed={language === 'en'}
                    className={`px-2.5 py-0.5 text-xs font-semibold rounded-full transition-all cursor-pointer ${
                      language === 'en'
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    English
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLanguageChange('kn')}
                    aria-pressed={language === 'kn'}
                    className={`px-2.5 py-0.5 text-xs font-semibold rounded-full transition-all cursor-pointer ${
                      language === 'kn'
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    ಕನ್ನಡ
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'dashboard' && (
            <DashboardView
              trip={activeTrip}
              budgetSummary={budgetSummary}
              onNavigate={setActiveSection}
              onToggleStopCompleted={handleToggleStopCompleted}
              language={language}
              onLanguageChange={handleLanguageChange}
            />
          )}

          {activeSection === 'planner' && (
            <TripPlannerView
              currentPreferences={activeTrip.preferences}
              transactions={wallet.transactions}
              onTripCreated={handleTripCreated}
            />
          )}

          {activeSection === 'map' && (
            <ExploreMapView
              trip={activeTrip}
              onAddStopToTrip={handleAddStopToTrip}
              onRemoveStopFromTrip={handleRemoveStopFromTrip}
              onUpdateLiveRouteMetrics={handleUpdateLiveRouteMetrics}
            />
          )}

          {activeSection === 'trips' && (
            <MyTripsView
              trips={trips}
              activeTrip={activeTrip}
              budgetSummary={budgetSummary}
              onSelectTrip={(id) => setActiveTripId(id)}
              onCreateTrip={handleTripCreated}
              onToggleStopCompleted={handleToggleStopCompleted}
            />
          )}

          {activeSection === 'wallet' && (
            <WalletView
              trip={activeTrip}
              transactions={wallet.transactions}
              budgetSummary={budgetSummary}
              onAddTopUp={handleAddTopUp}
              onAddExpense={handleAddExpense}
              onUndoTransaction={handleUndoTransaction}
              onResetWallet={handleResetWallet}
            />
          )}

          {activeSection === 'coach' && (
            <SpendingCoachView
              trip={activeTrip}
              transactions={wallet.transactions}
              budgetSummary={budgetSummary}
              onRecordRecommendedExpense={(exp) => {
                handleAddExpense(exp);
              }}
            />
          )}

          {activeSection === 'recovery' && (
            <RecoveryAndSimulatorView
              trip={activeTrip}
              transactions={wallet.transactions}
              budgetSummary={budgetSummary}
              onApplyRecoveryProposal={handleApplyRecoveryProposal}
              onApplyWhatIfScenario={handleApplyWhatIfScenario}
            />
          )}

          {activeSection === 'chat' && (
            <YtrikaChatView
              trip={activeTrip}
              budgetSummary={budgetSummary}
            />
          )}

          {activeSection === 'notfound' && (
            <NotFoundView
              onNavigate={setActiveSection}
              language={language}
            />
          )}
        </main>

        {/* Sleek Floating Bottom Navigation Dock with Sliding Spring Highlight & Horizontal Scroll Safety */}
        <nav
          aria-label="App Navigation"
          className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 p-1.5 rounded-full bg-[#0d1422]/90 backdrop-blur-xl border border-white/[0.08] shadow-2xl shadow-black/80 max-w-[96vw] overflow-x-auto no-scrollbar"
        >
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            const label =
              translations[language].nav[
                item.id as keyof typeof translations[typeof language]['nav']
              ] || item.defaultLabel;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveSection(item.id)}
                className={`relative flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 active:scale-[0.97] ${
                  isActive
                    ? 'text-slate-950 font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-white/[0.05]'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeDockTab"
                    className="absolute inset-0 rounded-full bg-amber-500 shadow-sm"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className={isActive ? 'inline' : 'hidden md:inline'}>
                    {label}
                  </span>
                </span>
              </button>
            );
          })}

          {/* Global Language Toggle Switcher inside floating dock */}
          <div className="h-5 w-px bg-white/[0.1] mx-1 shrink-0" />
          <button
            type="button"
            onClick={() => handleLanguageChange(language === 'en' ? 'kn' : 'en')}
            title={language === 'en' ? 'ಕನ್ನಡಕ್ಕೆ ಬದಲಾಯಿಸಿ' : 'Switch to English'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-amber-300 hover:text-white bg-slate-900/90 border border-amber-500/40 hover:bg-slate-800 active:scale-[0.96] transition-all cursor-pointer shrink-0"
          >
            <span>{language === 'en' ? 'ಕನ್ನಡ' : 'English'}</span>
          </button>
        </nav>

        {/* Minimalist, Human-Designed Mobile-Optimized Footer */}
        <footer className="border-t border-white/[0.08] bg-[#090e17]/95 px-4 sm:px-8 py-8 text-xs text-slate-400 space-y-6">
          <div className="max-w-7xl w-full mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            {/* Clickable Brand Logo & Mission */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setActiveSection('dashboard')}
                aria-label="Return to Overview"
                className="flex items-center gap-2.5 text-white hover:text-amber-300 transition-colors cursor-pointer group text-left"
              >
                <div className="bg-white px-2 py-0.5 rounded shadow-sm border border-slate-200/40 inline-flex items-center shrink-0 group-hover:scale-105 transition-transform">
                  <img
                    src="/assets/aistudio/image_81bf5380.png"
                    alt="Karnataka Tourism Logo"
                    className="h-5 w-auto object-contain"
                  />
                </div>
                <span className="text-sm font-bold font-display tracking-tight text-white group-hover:text-amber-300">
                  Yaatra Fit AI
                </span>
              </button>
              <p className="text-xs text-slate-400 max-w-md leading-relaxed font-sans">
                {language === 'kn'
                  ? 'ಕರ್ನಾಟಕದ ಪ್ರವಾಸ ಮಾರ್ಗದರ್ಶಿ, Google Maps ನೈಜ ಸಮಯದ ಮಾರ್ಗ ಅನ್ವೇಷಕ, ಮತ್ತು ಬಜೆಟ್ ಸಹಚರ.'
                  : 'Intelligent Karnataka itinerary planner, interactive Google Maps route tracker, and adaptive travel companion.'}
              </p>
            </div>

            {/* Direct Clickable Contact & Support Links */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 text-xs">
              {/* Clickable Phone Number */}
              <a
                href="tel:180042500100"
                title="24x7 Karnataka Tourism Toll-Free Helpline"
                className="flex items-center gap-2 text-slate-300 hover:text-amber-300 transition-colors"
              >
                <Phone className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">24x7 Helpline</div>
                  <span className="font-semibold text-slate-200">1800-425-00100</span>
                </div>
              </a>

              {/* Clickable Gmail Address */}
              <a
                href="mailto:chikkabilagodu@gmail.com"
                title="Email Travel Support"
                className="flex items-center gap-2 text-slate-300 hover:text-amber-300 transition-colors"
              >
                <Mail className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">Email Support</div>
                  <span className="font-semibold text-slate-200">chikkabilagodu@gmail.com</span>
                </div>
              </a>
            </div>
          </div>

          {/* Secondary verified government & legal links row */}
          <div className="max-w-7xl w-full mx-auto pt-6 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-400">
            <div className="font-mono tabular-nums">
              © {new Date().getFullYear()} Yaatra Fit AI · Karnataka Tourism Companion · All rights reserved.
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <a
                href="https://karnatakatourism.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-amber-300 transition-colors flex items-center gap-1"
              >
                <span>Karnataka Tourism</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>
              <a
                href="https://www.ksrtc.in/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-amber-300 transition-colors flex items-center gap-1"
              >
                <span>KSRTC Bus Booking</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>
              <a
                href="https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_mcp_codeassist_v1_aistudio"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-slate-200 underline"
              >
                Google Maps Terms
              </a>
              <button
                type="button"
                onClick={() => setActiveSection('notfound')}
                className="hover:text-amber-300 underline cursor-pointer"
                title="Preview custom 404 error page"
              >
                404 Page
              </button>
            </div>
          </div>
        </footer>
      </div>
    </SmoothScroll>
  );
}

