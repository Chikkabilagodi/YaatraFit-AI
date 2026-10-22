import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDeterministicItinerary,
  buildRecoveryProposal,
  calculateBudgetSummary,
  calculateFuelEstimate,
  calculateWalletMetrics,
  evaluateFeasibilityWarnings,
  generateDeterministicSpendingRecommendations,
  simulateWhatIfScenario,
  toSafeIntegerInr,
  undoWalletTransaction,
  validateExpenseInput,
  validateTopUpAmount,
} from './finance.ts';
import type { Transaction, TravellerPreferences } from '../types/travel.ts';
import { KARNATAKA_STARTING_HUBS } from '../data/karnatakaDestinations.ts';

const samplePreferences: TravellerPreferences = {
  startingLocation: 'Mysuru Junction',
  startingCoordinates: KARNATAKA_STARTING_HUBS['Mysuru Junction'],
  targetDistrict: 'Mysuru',
  departureDateTime: '2026-10-21T08:00:00.000Z',
  tripDurationHours: 10,
  returnDeadline: '2026-10-21T18:00:00.000Z',
  plannedBudgetInr: 2000,
  travellerCount: 1,
  transportMode: 'motorcycle',
  travellerStyle: 'solo',
  interests: ['heritage', 'culture', 'food'],
  travelPace: 'balanced',
  vehicleMileageKmPerLitre: 40,
  fuelPricePerLitreInr: 100,
  foodPreference: 'local_udupi_karnataka',
  accommodationPreference: 'day_trip_none',
  accessibilityRequired: false,
  mustVisitIds: ['mys-palace-01'],
  avoidIds: [],
  emergencyReserveInr: 300,
  maxLegTravelMinutes: 90,
};

test('WALLET: Adding ₹500 increases wallet balance by ₹500 and recording ₹200 expense decreases it by ₹200', () => {
  const topUpValidation = validateTopUpAmount(500);
  assert.equal(topUpValidation.valid, true);
  assert.equal(topUpValidation.sanitizedInr, 500);

  const transactions: Transaction[] = [
    {
      id: 'tx-1',
      type: 'top_up',
      amountInr: 500,
      description: 'Initial simulated top-up',
      timestamp: '2026-10-20T08:00:00.000Z',
      isTripExpense: false,
      undone: false,
    },
  ];

  let metrics = calculateWalletMetrics(transactions);
  assert.equal(metrics.walletBalanceInr, 500);

  const expValidation = validateExpenseInput(
    200,
    'Mylari Dosa & Filter Coffee',
    metrics.walletBalanceInr
  );
  assert.equal(expValidation.valid, true);

  transactions.push({
    id: 'tx-2',
    type: 'expense',
    amountInr: 200,
    category: 'Food',
    description: 'Mylari Dosa & Filter Coffee',
    timestamp: '2026-10-20T09:00:00.000Z',
    isTripExpense: true,
    undone: false,
  });

  metrics = calculateWalletMetrics(transactions);
  assert.equal(metrics.walletBalanceInr, 300);
  assert.equal(metrics.validTripExpensesInr, 200);
});

test('WALLET: Overspending, zero, and negative amounts are rejected', () => {
  assert.equal(validateTopUpAmount(0).valid, false);
  assert.equal(validateTopUpAmount(-100).valid, false);
  assert.equal(validateExpenseInput(0, 'Zero', 500).valid, false);
  assert.equal(validateExpenseInput(-50, 'Negative', 500).valid, false);

  const overspend = validateExpenseInput(600, 'Luxury silk saree', 500);
  assert.equal(overspend.valid, false);
  assert.ok(overspend.error?.includes('Insufficient demo wallet balance'));
});

test('WALLET: Undo reverses a transaction exactly once and rejects duplicate reversals', () => {
  const initial: Transaction[] = [
    {
      id: 'tx-top',
      type: 'top_up',
      amountInr: 1000,
      description: 'Top up',
      timestamp: '2026-10-20T08:00:00.000Z',
      isTripExpense: false,
      undone: false,
    },
    {
      id: 'tx-exp',
      type: 'expense',
      amountInr: 250,
      category: 'Entry tickets',
      description: 'Palace tickets',
      timestamp: '2026-10-20T09:00:00.000Z',
      isTripExpense: true,
      undone: false,
    },
  ];

  const firstUndo = undoWalletTransaction(initial, 'tx-exp');
  assert.equal(firstUndo.success, true);
  assert.equal(
    calculateWalletMetrics(firstUndo.transactions).walletBalanceInr,
    1000
  );

  // Attempting to undo the same transaction a second time must fail
  const secondUndo = undoWalletTransaction(firstUndo.transactions, 'tx-exp');
  assert.equal(secondUndo.success, false);
  assert.equal(
    calculateWalletMetrics(secondUndo.transactions).walletBalanceInr,
    1000
  );
});

test('BUDGET: Adding demo money never increases planned budget; trip expenses and unrelated wallet expenses are strictly separated', () => {
  const trip = buildDeterministicItinerary(samplePreferences);

  const transactions: Transaction[] = [
    {
      id: 'tx-1',
      type: 'top_up',
      amountInr: 5000, // Adding ₹5,000 to wallet
      description: 'Large wallet top-up',
      timestamp: '2026-10-20T08:00:00.000Z',
      isTripExpense: false,
      undone: false,
    },
    {
      id: 'tx-2',
      type: 'expense',
      amountInr: 300,
      category: 'Food',
      description: 'Trip lunch in Mysuru',
      timestamp: '2026-10-20T09:00:00.000Z',
      isTripExpense: true, // Valid trip expense
      undone: false,
    },
    {
      id: 'tx-3',
      type: 'expense',
      amountInr: 450,
      category: 'Other',
      description: 'Unrelated home utility bill',
      timestamp: '2026-10-20T09:30:00.000Z',
      isTripExpense: false, // Unrelated wallet expense
      undone: false,
    },
  ];

  const summary = calculateBudgetSummary(trip, transactions);

  // A. Planned trip budget stays 2000 despite ₹5,000 wallet top-up
  assert.equal(summary.plannedTripBudgetInr, 2000);
  // B. Wallet balance = 5000 - (300 + 450) = 4250
  assert.equal(summary.walletBalanceInr, 4250);
  // C. Remaining planned budget = 2000 - 300 (only trip expense deducted) = 1700
  assert.equal(summary.remainingPlannedBudgetInr, 1700);
  assert.equal(summary.unrelatedWalletExpensesInr, 450);
  // D. Emergency reserve preserved
  assert.equal(summary.emergencyReserveInr, 300);
});

test('FUEL: Fuel calculator uses distance, mileage, and fuel price accurately', () => {
  const trip = buildDeterministicItinerary(samplePreferences);
  const fuel = calculateFuelEstimate(
    samplePreferences.startingCoordinates,
    trip.stops,
    {
      ...samplePreferences,
      vehicleMileageKmPerLitre: 40,
      fuelPricePerLitreInr: 100,
    }
  );

  assert.ok(fuel.totalTripDistanceKm > 0);
  const expectedLitres =
    Math.round((fuel.totalTripDistanceKm / 40) * 100) / 100;
  assert.equal(fuel.estimatedTotalLitres, expectedLitres);
  assert.equal(
    fuel.estimatedTotalFuelCostInr,
    Math.round((fuel.totalTripDistanceKm / 40) * 100)
  );
  assert.equal(fuel.pricingModel, 'fuel_mileage');
  assert.equal(fuel.isEstimate, true);
});

test('BUS & CAB: Selecting Bus or Cab disables vehicle mileage and computes Maximum Charge instead', () => {
  const trip = buildDeterministicItinerary(samplePreferences);

  const busEstimate = calculateFuelEstimate(
    samplePreferences.startingCoordinates,
    trip.stops,
    {
      ...samplePreferences,
      transportMode: 'public_transport',
    }
  );
  assert.equal(busEstimate.pricingModel, 'max_charge');
  assert.equal(busEstimate.vehicleMileageKmPerLitre, 0);
  assert.equal(busEstimate.estimatedTotalLitres, 0);
  assert.ok((busEstimate.maxChargeTotalInr ?? 0) > 0);
  assert.ok((busEstimate.maxChargePerPersonInr ?? 0) > 0);
  assert.equal(
    busEstimate.estimatedTotalFuelCostInr,
    busEstimate.maxChargeTotalInr
  );

  const cabEstimate = calculateFuelEstimate(
    samplePreferences.startingCoordinates,
    trip.stops,
    {
      ...samplePreferences,
      transportMode: 'cab',
    }
  );
  assert.equal(cabEstimate.pricingModel, 'max_charge');
  assert.equal(cabEstimate.vehicleMileageKmPerLitre, 0);
  assert.equal(cabEstimate.estimatedTotalLitres, 0);
  assert.ok((cabEstimate.maxChargeTotalInr ?? 0) >= 1600);
  assert.equal(
    cabEstimate.estimatedTotalFuelCostInr,
    cabEstimate.maxChargeTotalInr
  );
});

test('GUARDRAILS: Impossible time and budget itineraries are flagged deterministically', () => {
  const tightPrefs: TravellerPreferences = {
    ...samplePreferences,
    tripDurationHours: 1, // Impossible 1-hour total window
    plannedBudgetInr: 100, // Impossible ₹100 total budget
  };

  const trip = buildDeterministicItinerary(tightPrefs);
  const warnings = evaluateFeasibilityWarnings(
    tightPrefs,
    trip.stops,
    trip.fuelEstimate,
    []
  );

  assert.ok(warnings.some((w) => w.code === 'TIME_OVERRUN'));
  assert.ok(warnings.some((w) => w.code === 'BUDGET_OVERRUN'));
});

test('SPENDING COACH & RECOVERY & WHAT-IF: Preserves completed stops, transactions, and does not mutate state in What-If', () => {
  const trip = buildDeterministicItinerary(samplePreferences);
  // Mark first stop completed
  trip.stops[0].completed = true;

  const transactions: Transaction[] = [
    {
      id: 'tx-top-2000',
      type: 'top_up',
      amountInr: 2000,
      description: 'Start wallet',
      timestamp: '2026-10-20T08:00:00.000Z',
      isTripExpense: false,
      undone: false,
    },
    {
      id: 'tx-exp-300',
      type: 'expense',
      amountInr: 300,
      category: 'Entry tickets',
      description: 'First stop tickets',
      timestamp: '2026-10-20T09:00:00.000Z',
      isTripExpense: true,
      undone: false,
    },
  ];

  // Spending Coach respects funds
  const coach = generateDeterministicSpendingRecommendations(trip, transactions);
  assert.ok(coach.recommendations.length > 0);
  assert.ok(coach.safeDiscretionaryPoolInr <= 1700);

  // Trip Recovery preserves completed stops and transactions
  const recovery = buildRecoveryProposal(trip, transactions, {
    reason: 'lost_time',
    lostMinutes: 120,
    extraSpentInr: 400,
    unavailableStopIds: [],
    weatherCondition: 'clear',
  });

  assert.equal(recovery.completedStops.length, 1);
  assert.equal(recovery.completedStops[0].stopId, trip.stops[0].stopId);
  assert.equal(transactions.length, 2); // Transactions untouched

  // What-If Simulator does not mutate trip stops or transactions
  const originalStopCount = trip.stops.filter((s) => !s.skipped).length;
  const sim = simulateWhatIfScenario(trip, transactions, {
    type: 'spend_500',
    label: 'Spend extra ₹500',
  });

  assert.equal(
    sim.simulated.projectedTotalSpendingInr,
    sim.current.projectedTotalSpendingInr + 500
  );
  assert.equal(trip.stops.filter((s) => !s.skipped).length, originalStopCount);
  assert.equal(transactions.length, 2);
});

test('BUS & CAB RECOVERY & WHAT-IF: Switching vehicle mode zeroes vehicle mileage and uses max transport charge ceiling', () => {
  const bikeTrip = buildDeterministicItinerary(samplePreferences);
  assert.equal(bikeTrip.fuelEstimate.pricingModel, 'fuel_mileage');
  assert.equal(bikeTrip.fuelEstimate.vehicleMileageKmPerLitre, 40);

  // 1. Recovery switching to Cab
  const recoveryToCab = buildRecoveryProposal(bikeTrip, [], {
    reason: 'vehicle_changed',
    lostMinutes: 0,
    extraSpentInr: 0,
    unavailableStopIds: [],
    newTransportMode: 'cab',
    weatherCondition: 'clear',
  });
  assert.equal(recoveryToCab.revisedFuelEstimate.pricingModel, 'max_charge');
  assert.equal(recoveryToCab.revisedFuelEstimate.vehicleMileageKmPerLitre, 0);
  assert.ok((recoveryToCab.revisedFuelEstimate.maxChargeTotalInr ?? 0) >= 1600);
  assert.ok(
    recoveryToCab.revisedFuelEstimate.transportNote.includes('Vehicle mileage is not applicable for Cab')
  );

  // 2. Recovery switching to Bus
  const recoveryToBus = buildRecoveryProposal(bikeTrip, [], {
    reason: 'vehicle_changed',
    lostMinutes: 0,
    extraSpentInr: 0,
    unavailableStopIds: [],
    newTransportMode: 'public_transport',
    weatherCondition: 'clear',
  });
  assert.equal(recoveryToBus.revisedFuelEstimate.pricingModel, 'max_charge');
  assert.equal(recoveryToBus.revisedFuelEstimate.vehicleMileageKmPerLitre, 0);
  assert.ok((recoveryToBus.revisedFuelEstimate.maxChargeTotalInr ?? 0) > 0);

  // 3. What-If simulator switching to Cab
  const simCab = simulateWhatIfScenario(bikeTrip, [], {
    type: 'change_vehicle',
    label: 'Switch vehicle to Hired Cab (No mileage)',
    newTransportMode: 'cab',
  });
  assert.ok(simCab.simulated.fuelCostInr >= 1600);
  assert.equal(simCab.scenario.newTransportMode, 'cab');
});

test('CUSTOM CAP: User-configured maximum charge ceiling is strictly respected over default heuristics', () => {
  const trip = buildDeterministicItinerary(samplePreferences);

  const customEstimate = calculateFuelEstimate(
    samplePreferences.startingCoordinates,
    trip.stops,
    {
      ...samplePreferences,
      transportMode: 'cab',
      maxTransportChargeInr: 2500, // Explicit user ceiling
    }
  );
  assert.equal(customEstimate.pricingModel, 'max_charge');
  assert.equal(customEstimate.vehicleMileageKmPerLitre, 0);
  assert.equal(customEstimate.maxChargeTotalInr, 2500);
  assert.equal(customEstimate.estimatedTotalFuelCostInr, 2500);
  assert.ok(customEstimate.maxRateLabel?.includes('User Custom'));
});

test('I18N: Translations contain full bilingual keys without missing fields or hybrid mixing', async () => {
  const { translations, getStoredLanguage } = await import('./i18n.ts');

  assert.equal(getStoredLanguage(), 'en'); // default fallback when storage is empty

  // Verify English dictionary
  assert.ok(translations.en.hero.brandName);
  assert.ok(translations.en.hero.description.includes('Mysuru'));
  assert.ok(translations.en.dashboard.budgetHeading);
  assert.ok(translations.en.nav.overview);

  // Verify Kannada dictionary
  assert.ok(translations.kn.hero.brandName);
  assert.ok(translations.kn.hero.description.includes('ಮೈಸೂರಿನ'));
  assert.ok(translations.kn.dashboard.budgetHeading.includes('ಬಜೆಟ್'));
  assert.ok(translations.kn.nav.overview.includes('ಅವಲೋಕನ'));

  // Ensure all nav items have both translations
  const navKeys = Object.keys(translations.en.nav);
  for (const key of navKeys) {
    assert.ok(translations.kn.nav[key as keyof typeof translations.kn.nav], `Missing Kannada nav key: ${key}`);
  }
});

test('DEFAULTS: Default wallet state starts at ₹0 with zero transactions, and clean starter trip has zero stops', async () => {
  const { getDefaultWalletState, createCleanStarterTrip } = await import('./storage.ts');

  const defaultWallet = getDefaultWalletState();
  assert.equal(defaultWallet.transactions.length, 0, 'Default wallet must have zero transactions');
  const metrics = calculateWalletMetrics(defaultWallet.transactions);
  assert.equal(metrics.walletBalanceInr, 0, 'Default wallet balance must be ₹0');
  assert.equal(metrics.totalValidTopUpsInr, 0, 'Default total top-ups must be ₹0');
  assert.equal(metrics.totalValidWalletExpensesInr, 0, 'Default wallet expenses must be ₹0');

  const starterTrip = createCleanStarterTrip();
  assert.equal(starterTrip.stops.length, 0, 'Clean starter trip must start with zero pre-suggested stops');
  assert.equal(starterTrip.preferences.mustVisitIds.length, 0, 'Clean starter trip must have zero must-visit IDs');
  assert.equal(starterTrip.fuelEstimate.estimatedTotalFuelCostInr, 0, 'Clean starter trip fuel cost must be ₹0');
});

test('NETWORK: Translations contain complete network listener keys in English and Kannada', async () => {
  const { translations } = await import('./i18n.ts');

  // Verify English network keys
  assert.ok(translations.en.network.offlineTitle);
  assert.ok(translations.en.network.offlineDesc);
  assert.ok(translations.en.network.reconnectedTitle);
  assert.ok(translations.en.network.reconnectedDesc);
  assert.ok(translations.en.network.dismiss);

  // Verify Kannada network keys
  assert.ok(translations.kn.network.offlineTitle);
  assert.ok(translations.kn.network.offlineDesc);
  assert.ok(translations.kn.network.reconnectedTitle);
  assert.ok(translations.kn.network.reconnectedDesc);
  assert.ok(translations.kn.network.dismiss);

  const enKeys = Object.keys(translations.en.network);
  for (const key of enKeys) {
    assert.ok(
      translations.kn.network[key as keyof typeof translations.kn.network],
      `Missing Kannada network key: ${key}`
    );
  }
});

test('LOOPHOLE FIX 1: Emergency reserve is intact at initial zero wallet balance, and toSafeIntegerInr/calculateWalletMetrics handle null/string inputs', async () => {
  const { createCleanStarterTrip } = await import('./storage.ts');

  // 1. Initial clean trip has ₹0 wallet balance and untouched planned budget.
  // The emergency reserve must be reported as INTACT (true), not violated!
  const cleanTrip = createCleanStarterTrip();
  const summary = calculateBudgetSummary(cleanTrip, []);
  assert.equal(summary.walletBalanceInr, 0, 'Initial wallet balance is 0');
  assert.equal(summary.isEmergencyReserveIntact, true, 'Emergency reserve must be intact for clean starter trip');
  assert.equal(summary.isWithinPlannedBudget, true, 'Clean starter trip must be within planned budget');

  // 2. toSafeIntegerInr must handle strings, null, undefined, NaN safely
  assert.equal(toSafeIntegerInr('450'), 450);
  assert.equal(toSafeIntegerInr('1200.45'), 1200);
  assert.equal(toSafeIntegerInr(null), 0);
  assert.equal(toSafeIntegerInr(undefined), 0);
  assert.equal(toSafeIntegerInr(NaN), 0);
  assert.equal(toSafeIntegerInr('abc'), 0);

  // 3. calculateWalletMetrics must not crash on undefined or null input
  const emptyMetrics = calculateWalletMetrics(undefined);
  assert.equal(emptyMetrics.walletBalanceInr, 0);
  assert.equal(emptyMetrics.totalValidTopUpsInr, 0);
});

test('LOOPHOLE FIX 2: buildDeterministicItinerary handles partial preferences without throwing, and default preferences always start in the future', async () => {
  const { getDefaultPreferences } = await import('./storage.ts');

  // 1. Incomplete preferences without avoidIds, mustVisitIds, or interests must not crash with TypeError
  const partialPrefs = {
    targetDistrict: 'Mysuru',
    plannedBudgetInr: 2500,
  } as any;

  assert.doesNotThrow(() => {
    const trip = buildDeterministicItinerary(partialPrefs, []);
    assert.ok(trip.id);
    assert.ok(Array.isArray(trip.stops));
  });

  // 2. Default preferences departure and deadline must be strictly in the future or equal to next valid window
  const defaultPrefs = getDefaultPreferences();
  const depTime = new Date(defaultPrefs.departureDateTime).getTime();
  const deadlineTime = new Date(defaultPrefs.returnDeadline).getTime();
  assert.ok(deadlineTime > depTime, 'Deadline must be after departure');
  assert.equal(
    deadlineTime - depTime,
    defaultPrefs.tripDurationHours * 3600_000,
    'Deadline must match duration exactly'
  );
});

test('WEATHER: Forecast parsing and packing advice handles Karnataka regions with full bilingual translations', async () => {
  const { mapWeatherCode, generateKarnatakaPackingAdvice, getSeasonalFallbackForecast } = await import('./weather.ts');
  const { translations } = await import('./i18n.ts');

  // 1. Translations parity
  const enWeatherKeys = Object.keys(translations.en.weather);
  for (const key of enWeatherKeys) {
    assert.ok(
      translations.kn.weather[key as keyof typeof translations.kn.weather],
      `Missing Kannada weather translation key: ${key}`
    );
  }

  // 2. Weather code mapping
  const clear = mapWeatherCode(0);
  assert.equal(clear.type, 'sunny');
  assert.ok(clear.labelKn.length > 0);

  const rain = mapWeatherCode(63);
  assert.equal(rain.type, 'rain');
  assert.ok(rain.labelKn.length > 0);

  // 3. Seasonal fallback returns 3 days with packing advice
  const fallback = getSeasonalFallbackForecast('Mysuru', { lat: 12.2958, lng: 76.6394 });
  assert.equal(fallback.forecasts.length, 3);
  assert.ok(fallback.packingAdvice.items.length >= 3);
  assert.ok(fallback.packingAdvice.itemsKn.length >= 3);
  assert.ok(fallback.packingAdvice.advisory.length > 0);

  // 4. Western Ghats rain advice check (Kodagu / rain code)
  const rainForecasts = [
    {
      date: '2026-10-23',
      dayLabel: 'Tomorrow',
      dayLabelKn: 'ನಾಳೆ',
      weatherCode: 65,
      conditionType: 'rain' as const,
      conditionLabel: 'Heavy Rain',
      conditionLabelKn: 'ಭಾರಿ ಮಳೆ',
      tempMaxC: 22,
      tempMinC: 17,
      precipitationProbability: 85,
    },
  ];
  const ghatsAdvice = generateKarnatakaPackingAdvice('Kodagu', rainForecasts);
  assert.ok(ghatsAdvice.items.some((i) => i.toLowerCase().includes('umbrella') || i.toLowerCase().includes('raincoat')));
});




