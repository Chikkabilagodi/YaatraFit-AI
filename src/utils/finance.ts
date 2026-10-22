import type {
  BudgetSummary,
  Destination,
  ExpenseCategory,
  FeasibilityWarning,
  FuelEstimate,
  InterestCategory,
  ItineraryStop,
  LatLngLiteral,
  RecoveryInput,
  RecoveryProposal,
  SpendingRecommendation,
  Transaction,
  TransportMode,
  TravellerPreferences,
  Trip,
  WhatIfComparisonResult,
  WhatIfScenarioInput,
} from '../types/travel.ts';
import { KARNATAKA_DESTINATIONS } from '../data/karnatakaDestinations.ts';

/**
 * Converts rupees to integer paise to prevent floating-point drift, then rounds back to integer rupees.
 * Safely coerces strings or finite numbers, returning 0 for null, undefined, or invalid inputs.
 */
export function toSafeIntegerInr(amount: number | string | null | undefined): number {
  if (amount === null || amount === undefined) return 0;
  const num = typeof amount === 'number' ? amount : Number(amount);
  if (!Number.isFinite(num)) return 0;
  return Math.round(Math.round(num * 100) / 100);
}

/**
 * Great-circle Haversine distance multiplied by a 1.28 Karnataka road winding factor
 * when live Routes API geometry is not yet loaded.
 */
export function estimateRoadDistanceKm(
  a?: LatLngLiteral | null,
  b?: LatLngLiteral | null
): number {
  const safeA: LatLngLiteral =
    a && typeof a.lat === 'number' && typeof a.lng === 'number' && Number.isFinite(a.lat) && Number.isFinite(a.lng)
      ? a
      : { lat: 12.9716, lng: 77.5946 };
  const safeB: LatLngLiteral =
    b && typeof b.lat === 'number' && typeof b.lng === 'number' && Number.isFinite(b.lat) && Number.isFinite(b.lng)
      ? b
      : { lat: 12.9716, lng: 77.5946 };
  if (safeA.lat === safeB.lat && safeA.lng === safeB.lng) {
    return 0.5;
  }
  const R = 6371;
  const dLat = ((safeB.lat - safeA.lat) * Math.PI) / 180;
  const dLng = ((safeB.lng - safeA.lng) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos((safeA.lat * Math.PI) / 180) *
      Math.cos((safeB.lat * Math.PI) / 180) *
      sinLng *
      sinLng;
  const straightKm = 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return Math.max(0.5, Math.round(straightKm * 1.28 * 10) / 10);
}

/**
 * Estimates travel minutes based on Karnataka road averages per transport mode
 * when live Routes API is unavailable.
 * Note: Motorcycle is treated as two-wheeled motorised transport, NOT bicycle.
 */
export function estimateTravelMinutes(
  distanceKm: number,
  mode: TransportMode
): number {
  const avgSpeedKmh: Record<TransportMode, number> = {
    motorcycle: 44, // Two-wheeled motorised highway/ghat blend
    car: 48,
    cab: 46, // Hired taxi / cab
    public_transport: 34, // KSRTC / town buses including stops
    mixed: 38,
    walking: 4.8,
  };
  const speed = avgSpeedKmh[mode] || 40;
  return Math.max(5, Math.round((distanceKm / speed) * 60));
}

/**
 * Returns true only for personal vehicles where mileage (km/L) and fuel price apply.
 * Returns false for Bus (public_transport), Cab (cab), Mixed (mixed), and Walking (walking).
 */
export function isMileageBasedTransport(mode: TransportMode): boolean {
  return mode === 'motorcycle' || mode === 'car';
}

/**
 * Computes the Maximum Transport Charge for Bus, Cab, or Mixed transport modes
 * where vehicle mileage is not applicable.
 */
export function calculateMaxTransportCharge(
  distanceKm: number,
  mode: TransportMode,
  travellerCount: number,
  customMaxChargeInr?: number
): {
  maxChargeTotalInr: number;
  maxChargePerPersonInr: number;
  maxRateLabel: string;
} {
  const safeTravellers = Math.max(1, travellerCount);
  const safeDistKm = Math.max(10, distanceKm);

  if (mode === 'walking') {
    return {
      maxChargeTotalInr: 0,
      maxChargePerPersonInr: 0,
      maxRateLabel: 'Walking Trail (₹0 Charge)',
    };
  }

  if (mode === 'public_transport') {
    // KSRTC / State Bus maximum fare ceiling (~₹2.2/km per person, minimum ₹80/person)
    const defaultPerPerson = Math.max(80, toSafeIntegerInr(safeDistKm * 2.2));
    const defaultGroupTotal = defaultPerPerson * safeTravellers;
    const isCustom = Boolean(customMaxChargeInr && customMaxChargeInr > 0);
    const total = isCustom
      ? toSafeIntegerInr(customMaxChargeInr!)
      : defaultGroupTotal;
    return {
      maxChargeTotalInr: total,
      maxChargePerPersonInr: toSafeIntegerInr(total / safeTravellers),
      maxRateLabel: isCustom
        ? `User Custom Maximum Cap (₹${total.toLocaleString('en-IN')})`
        : 'Max Bus Fare Ceiling (KSRTC ~₹2.2/km/person)',
    };
  }

  if (mode === 'cab') {
    // Hired Cab / Taxi maximum charge ceiling: Sedan ₹15/km + ₹300 driver bata (1-4 pax) or SUV ₹22/km + ₹400 bata (5+ pax)
    const vehiclesNeeded = Math.max(1, Math.ceil(safeTravellers / 6));
    const perKmRate = safeTravellers <= 4 ? 15 : 22;
    const driverBata = (safeTravellers <= 4 ? 300 : 400) * vehiclesNeeded;
    const minDayPackage = (safeTravellers <= 4 ? 1600 : 2400) * vehiclesNeeded;
    const computedCabMax = Math.max(
      minDayPackage,
      toSafeIntegerInr(safeDistKm * perKmRate * vehiclesNeeded + driverBata)
    );
    const isCustom = Boolean(customMaxChargeInr && customMaxChargeInr > 0);
    const total = isCustom
      ? toSafeIntegerInr(customMaxChargeInr!)
      : computedCabMax;
    return {
      maxChargeTotalInr: total,
      maxChargePerPersonInr: toSafeIntegerInr(total / safeTravellers),
      maxRateLabel: isCustom
        ? `User Custom Maximum Cap (₹${total.toLocaleString('en-IN')})`
        : safeTravellers <= 4
        ? 'Max Cab Charge Ceiling (Sedan ₹15/km + ₹300 Driver Bata)'
        : 'Max SUV Cab Charge Ceiling (₹22/km + ₹400 Driver Bata)',
    };
  }

  // 'mixed' (Bus + Local Auto/Cab)
  const defaultMixedTotal =
    Math.max(110, toSafeIntegerInr(safeDistKm * 2.6)) * safeTravellers + 150;
  const isCustom = Boolean(customMaxChargeInr && customMaxChargeInr > 0);
  const total = isCustom
    ? toSafeIntegerInr(customMaxChargeInr!)
    : defaultMixedTotal;
  return {
    maxChargeTotalInr: total,
    maxChargePerPersonInr: toSafeIntegerInr(total / safeTravellers),
    maxRateLabel: isCustom
      ? `User Custom Maximum Cap (₹${total.toLocaleString('en-IN')})`
      : 'Max Bus + Local Cab/Auto Charge Ceiling',
  };
}

/**
 * Section 13: Vehicle-Aware Routing, Fuel Calculator & Bus/Cab Maximum Charge Engine
 * - Personal vehicle (motorcycle / car): fuelLitres = routeDistanceKm / vehicleMileageKmPerLitre; fuelCost = fuelLitres * fuelPricePerLitre
 * - Bus / Cab / Mixed: Does NOT suggest vehicle mileage; calculates Maximum Charge for the route.
 */
export function calculateFuelEstimate(
  origin?: LatLngLiteral | null,
  stops: ItineraryStop[] = [],
  preferences?: TravellerPreferences
): FuelEstimate {
  const safePrefs: TravellerPreferences = preferences || ({
    startingLocation: 'Bengaluru',
    startingCoordinates: { lat: 12.9716, lng: 77.5946 },
    targetDistrict: 'Mysuru',
    departureDateTime: new Date().toISOString(),
    tripDurationHours: 10,
    returnDeadline: new Date(Date.now() + 36000000).toISOString(),
    plannedBudgetInr: 2000,
    travellerCount: 2,
    transportMode: 'motorcycle',
    travellerStyle: 'couple',
    interests: ['heritage'],
    travelPace: 'balanced',
    vehicleMileageKmPerLitre: 40,
    fuelPricePerLitreInr: 103,
    foodPreference: 'local_udupi_karnataka',
    accommodationPreference: 'day_trip_none',
    accessibilityRequired: false,
    mustVisitIds: [],
    avoidIds: [],
    emergencyReserveInr: 350,
    maxLegTravelMinutes: 90,
  } as TravellerPreferences);

  const safeOrigin: LatLngLiteral =
    origin && Number.isFinite(origin.lat) && Number.isFinite(origin.lng)
      ? origin
      : safePrefs.startingCoordinates && Number.isFinite(safePrefs.startingCoordinates.lat)
      ? safePrefs.startingCoordinates
      : { lat: 12.9716, lng: 77.5946 };

  const activeStops = (Array.isArray(stops) ? stops : []).filter((s) => !s.skipped);
  const mileage = Math.max(1, safePrefs.vehicleMileageKmPerLitre || 40);
  const fuelPrice = Math.max(1, safePrefs.fuelPricePerLitreInr || 103);

  let oneWayDistanceKm = 0;
  let completedDistanceKm = 0;
  let remainingForwardDistanceKm = 0;

  let prevCoord = safeOrigin;
  let lastStopCoord = safeOrigin;

  for (const stop of activeStops) {
    const legKm =
      stop.distanceFromPrevKm > 0
        ? stop.distanceFromPrevKm
        : estimateRoadDistanceKm(prevCoord, stop.coordinates);
    oneWayDistanceKm += legKm;
    if (stop.completed) {
      completedDistanceKm += legKm;
    } else {
      remainingForwardDistanceKm += legKm;
    }
    prevCoord = stop.coordinates;
    lastStopCoord = stop.coordinates;
  }

  const returnDistanceKm =
    activeStops.length > 0 ? estimateRoadDistanceKm(lastStopCoord, safeOrigin) : 0;

  const totalTripDistanceKm =
    Math.round((oneWayDistanceKm + returnDistanceKm) * 10) / 10;
  const remainingDistanceKm =
    Math.round((remainingForwardDistanceKm + returnDistanceKm) * 10) / 10;

  if (safePrefs.transportMode === 'walking') {
    return {
      oneWayDistanceKm: Math.round(oneWayDistanceKm * 10) / 10,
      returnDistanceKm: Math.round(returnDistanceKm * 10) / 10,
      totalTripDistanceKm,
      completedDistanceKm: Math.round(completedDistanceKm * 10) / 10,
      remainingDistanceKm,
      vehicleMileageKmPerLitre: 0,
      fuelPricePerLitreInr: 0,
      estimatedTotalLitres: 0,
      estimatedRemainingLitres: 0,
      estimatedTotalFuelCostInr: 0,
      estimatedRemainingFuelCostInr: 0,
      pricingModel: 'max_charge',
      maxChargeTotalInr: 0,
      maxChargePerPersonInr: 0,
      maxRateLabel: 'Walking Trail (₹0 Charge)',
      isEstimate: true,
      transportNote: 'Walking mode selected — ₹0 transport charge (no vehicle mileage applicable).',
    };
  }

  if (!isMileageBasedTransport(safePrefs.transportMode)) {
    const { maxChargeTotalInr, maxChargePerPersonInr, maxRateLabel } =
      calculateMaxTransportCharge(
        totalTripDistanceKm,
        safePrefs.transportMode,
        safePrefs.travellerCount,
        safePrefs.maxTransportChargeInr
      );
    const remainingRatio =
      totalTripDistanceKm > 0
        ? Math.min(1, remainingDistanceKm / totalTripDistanceKm)
        : 1;
    const remainingFare = toSafeIntegerInr(maxChargeTotalInr * remainingRatio);

    const modeName =
      safePrefs.transportMode === 'public_transport'
        ? 'Bus (KSRTC / Public Transit)'
        : safePrefs.transportMode === 'cab'
        ? 'Cab / Hired Taxi'
        : 'Mixed (Bus + Local Cab/Auto)';

    return {
      oneWayDistanceKm: Math.round(oneWayDistanceKm * 10) / 10,
      returnDistanceKm: Math.round(returnDistanceKm * 10) / 10,
      totalTripDistanceKm,
      completedDistanceKm: Math.round(completedDistanceKm * 10) / 10,
      remainingDistanceKm,
      vehicleMileageKmPerLitre: 0,
      fuelPricePerLitreInr: 0,
      estimatedTotalLitres: 0,
      estimatedRemainingLitres: 0,
      estimatedTotalFuelCostInr: maxChargeTotalInr,
      estimatedRemainingFuelCostInr: remainingFare,
      pricingModel: 'max_charge',
      maxChargeTotalInr,
      maxChargePerPersonInr,
      maxRateLabel,
      isEstimate: true,
      transportNote: `Maximum ${modeName} charge: ₹${maxChargeTotalInr.toLocaleString(
        'en-IN'
      )} total (₹${maxChargePerPersonInr.toLocaleString(
        'en-IN'
      )}/person across ${totalTripDistanceKm} km round-trip). Vehicle mileage is not applicable for ${modeName}.`,
    };
  }

  const estimatedTotalLitres =
    Math.round((totalTripDistanceKm / mileage) * 100) / 100;
  const estimatedRemainingLitres =
    Math.round((remainingDistanceKm / mileage) * 100) / 100;

  const estimatedTotalFuelCostInr = toSafeIntegerInr(
    (totalTripDistanceKm / mileage) * fuelPrice
  );
  const estimatedRemainingFuelCostInr = toSafeIntegerInr(
    (remainingDistanceKm / mileage) * fuelPrice
  );

  return {
    oneWayDistanceKm: Math.round(oneWayDistanceKm * 10) / 10,
    returnDistanceKm: Math.round(returnDistanceKm * 10) / 10,
    totalTripDistanceKm,
    completedDistanceKm: Math.round(completedDistanceKm * 10) / 10,
    remainingDistanceKm,
    vehicleMileageKmPerLitre: mileage,
    fuelPricePerLitreInr: fuelPrice,
    estimatedTotalLitres,
    estimatedRemainingLitres,
    estimatedTotalFuelCostInr,
    estimatedRemainingFuelCostInr,
    pricingModel: 'fuel_mileage',
    isEstimate: true,
    transportNote: `Estimated ${safePrefs.transportMode} fuel at ${mileage} km/L and ₹${fuelPrice}/L. Actual mileage varies with ghats, traffic, and load.`,
  };
}

/**
 * Section 10: Wallet validation & operations
 */
export function calculateWalletMetrics(transactions?: Transaction[]) {
  let totalValidTopUpsInr = 0;
  let totalValidWalletExpensesInr = 0;
  let validTripExpensesInr = 0;
  let unrelatedWalletExpensesInr = 0;

  const safeList = Array.isArray(transactions) ? transactions : [];
  for (const tx of safeList) {
    if (!tx || tx.undone) continue;
    const amt = toSafeIntegerInr(tx.amountInr);
    if (amt <= 0) continue;

    if (tx.type === 'top_up') {
      totalValidTopUpsInr += amt;
    } else if (tx.type === 'expense') {
      totalValidWalletExpensesInr += amt;
      if (tx.isTripExpense) {
        validTripExpensesInr += amt;
      } else {
        unrelatedWalletExpensesInr += amt;
      }
    }
  }

  const walletBalanceInr = totalValidTopUpsInr - totalValidWalletExpensesInr;

  return {
    totalValidTopUpsInr,
    totalValidWalletExpensesInr,
    validTripExpensesInr,
    unrelatedWalletExpensesInr,
    walletBalanceInr,
  };
}

export function validateTopUpAmount(amountInr: number): {
  valid: boolean;
  sanitizedInr: number;
  error?: string;
} {
  if (typeof amountInr !== 'number' || !Number.isFinite(amountInr)) {
    return { valid: false, sanitizedInr: 0, error: 'Please enter a valid numeric amount.' };
  }
  const sanitized = toSafeIntegerInr(amountInr);
  if (sanitized <= 0) {
    return { valid: false, sanitizedInr: 0, error: 'Top-up amount must be greater than ₹0.' };
  }
  if (sanitized > 500000) {
    return {
      valid: false,
      sanitizedInr: 0,
      error: 'Demo wallet top-up cannot exceed ₹5,00,000 in a single transaction.',
    };
  }
  return { valid: true, sanitizedInr: sanitized };
}

export function validateExpenseInput(
  amountInr: number,
  description: string,
  currentWalletBalanceInr: number
): {
  valid: boolean;
  sanitizedInr: number;
  error?: string;
} {
  if (typeof amountInr !== 'number' || !Number.isFinite(amountInr)) {
    return { valid: false, sanitizedInr: 0, error: 'Please enter a valid expense amount.' };
  }
  const sanitized = toSafeIntegerInr(amountInr);
  if (sanitized <= 0) {
    return { valid: false, sanitizedInr: 0, error: 'Expense amount must be greater than ₹0.' };
  }
  if (!description || description.trim().length < 2) {
    return { valid: false, sanitizedInr: 0, error: 'Please enter a short description for the expense.' };
  }
  if (sanitized > currentWalletBalanceInr) {
    return {
      valid: false,
      sanitizedInr: 0,
      error: `Insufficient demo wallet balance (Available: ₹${currentWalletBalanceInr.toLocaleString('en-IN')}, Requested: ₹${sanitized.toLocaleString('en-IN')}).`,
    };
  }
  return { valid: true, sanitizedInr: sanitized };
}

/**
 * Undo a transaction safely exactly once.
 * Also prevents undoing a top-up if doing so would make the wallet balance negative.
 */
export function undoWalletTransaction(
  transactions: Transaction[],
  transactionId: string
): {
  success: boolean;
  transactions: Transaction[];
  error?: string;
} {
  const target = transactions.find((t) => t.id === transactionId);
  if (!target) {
    return { success: false, transactions, error: 'Transaction not found.' };
  }
  if (target.undone) {
    return {
      success: false,
      transactions,
      error: 'This transaction has already been undone.',
    };
  }

  const { walletBalanceInr } = calculateWalletMetrics(transactions);
  if (target.type === 'top_up' && walletBalanceInr - target.amountInr < 0) {
    return {
      success: false,
      transactions,
      error:
        'Cannot undo this top-up because funds from it have already been spent.',
    };
  }

  const updated = transactions.map((t) =>
    t.id === transactionId
      ? { ...t, undone: true, undoneAt: new Date().toISOString() }
      : t
  );
  return { success: true, transactions: updated };
}

/**
 * Section 11: Keep Financial Values Separate
 * Deterministic calculation of all 5 required financial values:
 * A. plannedTripBudgetInr
 * B. walletBalanceInr = totalValidTopUps - totalValidWalletExpenses
 * C. remainingPlannedBudgetInr = plannedTripBudget - validTripExpenses
 * D. emergencyReserveInr
 * E. estimatedRemainingTripCostInr
 */
export function calculateBudgetSummary(
  trip: Trip,
  transactions: Transaction[]
): BudgetSummary {
  const {
    totalValidTopUpsInr,
    totalValidWalletExpensesInr,
    validTripExpensesInr,
    unrelatedWalletExpensesInr,
    walletBalanceInr,
  } = calculateWalletMetrics(transactions);

  const prefs = trip?.preferences || ({} as TravellerPreferences);
  const plannedTripBudgetInr = toSafeIntegerInr(prefs.plannedBudgetInr || 2000);
  const emergencyReserveInr = toSafeIntegerInr(prefs.emergencyReserveInr || 0);
  const travellerCount = Math.max(1, prefs.travellerCount || 1);
  const safeStops = Array.isArray(trip?.stops) ? trip.stops : [];

  // Remaining stops (not completed and not skipped)
  const uncompletedStops = safeStops.filter((s) => !s.completed && !s.skipped);
  const estimatedFoodAndActivitiesRemainingInr = uncompletedStops.reduce(
    (sum, stop) => sum + toSafeIntegerInr(stop.estimatedStopCostGroupInr),
    0
  );

  // Accommodation cost if multi-day or selected
  const durationHours = prefs.tripDurationHours || 10;
  const nights = Math.max(0, Math.floor((durationHours - 14) / 20));
  const accommodationPerNightPerPerson: Record<string, number> = {
    day_trip_none: 0,
    budget_homestay: 750,
    mid_range_hotel: 1600,
    eco_resort: 3200,
  };
  const estimatedAccommodationCostInr =
    nights *
    (accommodationPerNightPerPerson[prefs.accommodationPreference || 'day_trip_none'] || 0) *
    travellerCount;

  const fuelEstimate = calculateFuelEstimate(
    prefs.startingCoordinates,
    safeStops,
    prefs
  );

  const estimatedRemainingFuelCostInr = fuelEstimate.estimatedRemainingFuelCostInr;
  const returnDistKm = fuelEstimate.returnDistanceKm;
  let estimatedReturnJourneyFuelCostInr = 0;

  if (isMileageBasedTransport(prefs.transportMode)) {
    estimatedReturnJourneyFuelCostInr = toSafeIntegerInr(
      (returnDistKm / Math.max(1, prefs.vehicleMileageKmPerLitre || 40)) *
        (prefs.fuelPricePerLitreInr || 103)
    );
  } else if (prefs.transportMode === 'walking') {
    estimatedReturnJourneyFuelCostInr = 0;
  } else {
    // Bus, Cab, Mixed
    const { maxChargeTotalInr } = calculateMaxTransportCharge(
      returnDistKm,
      prefs.transportMode,
      travellerCount,
      prefs.maxTransportChargeInr
        ? Math.round(
            prefs.maxTransportChargeInr *
              (fuelEstimate.totalTripDistanceKm > 0
                ? returnDistKm / fuelEstimate.totalTripDistanceKm
                : 0.5)
          )
        : undefined
    );
    estimatedReturnJourneyFuelCostInr = maxChargeTotalInr;
  }

  // E. Estimated remaining trip cost
  const estimatedRemainingTripCostInr = toSafeIntegerInr(
    estimatedFoodAndActivitiesRemainingInr +
      estimatedRemainingFuelCostInr +
      estimatedAccommodationCostInr
  );

  // C. Remaining planned budget = plannedTripBudget - validTripExpenses
  const remainingPlannedBudgetInr = plannedTripBudgetInr - validTripExpensesInr;

  // Projected final spending = validTripExpenses + estimatedRemainingTripCost
  const projectedFinalSpendingInr =
    validTripExpensesInr + estimatedRemainingTripCostInr;

  // Spendable from wallet without touching emergency reserve
  const spendableWithoutTouchingReserveInr = Math.max(
    0,
    Math.min(walletBalanceInr, remainingPlannedBudgetInr) - emergencyReserveInr
  );

  const perPersonPlannedBudgetInr = toSafeIntegerInr(
    plannedTripBudgetInr / travellerCount
  );
  const perPersonProjectedCostInr = toSafeIntegerInr(
    projectedFinalSpendingInr / travellerCount
  );

  return {
    plannedTripBudgetInr,
    walletBalanceInr,
    remainingPlannedBudgetInr,
    emergencyReserveInr,
    estimatedRemainingTripCostInr,
    totalValidTopUpsInr,
    totalValidWalletExpensesInr,
    validTripExpensesInr,
    unrelatedWalletExpensesInr,
    projectedFinalSpendingInr,
    spendableWithoutTouchingReserveInr,
    perPersonPlannedBudgetInr,
    perPersonProjectedCostInr,
    estimatedFuelCostTotalInr: fuelEstimate.estimatedTotalFuelCostInr,
    estimatedRemainingFuelCostInr,
    estimatedReturnJourneyFuelCostInr,
    estimatedFoodAndActivitiesRemainingInr,
    estimatedAccommodationCostInr,
    isWithinPlannedBudget: projectedFinalSpendingInr <= plannedTripBudgetInr,
    isWalletSufficientForRemaining:
      walletBalanceInr >= estimatedRemainingTripCostInr,
    isEmergencyReserveIntact:
      remainingPlannedBudgetInr - estimatedRemainingTripCostInr >= emergencyReserveInr,
  };
}

function preferencesUsesFuel(mode: TransportMode): boolean {
  return mode === 'motorcycle' || mode === 'car';
}

/**
 * Convert a Destination into an ItineraryStop with calculated timings and costs.
 */
export function createItineraryStopFromDestination(
  dest: Destination,
  prevCoord: LatLngLiteral,
  currentClockMs: number,
  preferences: TravellerPreferences,
  overrideDistanceKm?: number,
  overrideTravelMinutes?: number,
  isLiveRoute = false
): { stop: ItineraryStop; nextClockMs: number } {
  const distanceFromPrevKm =
    overrideDistanceKm !== undefined
      ? overrideDistanceKm
      : estimateRoadDistanceKm(prevCoord, dest.coordinates);
  const safeTransportMode = preferences?.transportMode || 'car';
  const travelMinutesFromPrev =
    overrideTravelMinutes !== undefined
      ? overrideTravelMinutes
      : estimateTravelMinutes(distanceFromPrevKm, safeTransportMode);

  const paceMultiplier =
    preferences?.travelPace === 'relaxed'
      ? 1.2
      : preferences?.travelPace === 'maximum'
      ? 0.8
      : 1.0;

  const estimatedVisitMinutes = Math.max(
    30,
    Math.round((dest.expectedVisitMinutes * paceMultiplier) / 15) * 15
  );

  const arrivalMs = currentClockMs + travelMinutesFromPrev * 60_000;
  const departureMs = arrivalMs + estimatedVisitMinutes * 60_000;

  const entryCostPerPersonInr = toSafeIntegerInr(dest.entryFeeInrPerPerson);
  const foodAndActivityPerPersonInr = toSafeIntegerInr(
    dest.additionalActivityCostPerPerson + dest.recommendedFoodBudgetPerPerson
  );
  const estimatedStopCostPerPersonInr =
    entryCostPerPersonInr + foodAndActivityPerPersonInr;
  const estimatedStopCostGroupInr =
    estimatedStopCostPerPersonInr * Math.max(1, preferences?.travellerCount || 1);

  const safeInterests = Array.isArray(preferences?.interests) ? preferences.interests : [];
  const matchedInterests = dest.categories.filter((c) =>
    safeInterests.includes(c)
  );

  const stop: ItineraryStop = {
    stopId: `stop-${dest.id}`,
    attractionId: dest.id,
    name: dest.name,
    nameKn: dest.nameKn,
    district: dest.district,
    coordinates: dest.coordinates,
    placeId: dest.placeId,
    suggestedArrivalTime: new Date(arrivalMs).toISOString(),
    suggestedDepartureTime: new Date(departureMs).toISOString(),
    estimatedVisitMinutes,
    distanceFromPrevKm,
    travelMinutesFromPrev,
    routeSource: isLiveRoute ? 'live_routes_api' : 'haversine_estimate',
    trafficAware: isLiveRoute,
    entryCostPerPersonInr,
    foodAndActivityPerPersonInr,
    estimatedStopCostPerPersonInr,
    estimatedStopCostGroupInr,
    costStatus: dest.costStatus,
    recommendationReason: dest.whyRecommend,
    matchedInterests:
      matchedInterests.length > 0 ? matchedInterests : dest.categories.slice(0, 2),
    sourceName: dest.sourceName,
    sourceUrl: dest.sourceUrl,
    completed: false,
    skipped: false,
  };

  return { stop, nextClockMs: departureMs };
}

/**
 * Recalculates arrival and departure times sequentially across all active stops.
 */
export function recalculateStopSchedule(
  origin: LatLngLiteral,
  departureIso: string,
  stops: ItineraryStop[],
  preferences: TravellerPreferences,
  extraDelayMinutes = 0
): ItineraryStop[] {
  const baseStartMs = new Date(departureIso).getTime();
  let clockMs =
    (Number.isFinite(baseStartMs) ? baseStartMs : Date.now()) +
    extraDelayMinutes * 60_000;
  let prevCoord = origin;

  return stops.map((stop) => {
    if (stop.skipped) {
      return stop;
    }
    const distKm =
      stop.routeSource === 'live_routes_api' && stop.distanceFromPrevKm > 0
        ? stop.distanceFromPrevKm
        : estimateRoadDistanceKm(prevCoord, stop.coordinates);
    const travelMins =
      stop.routeSource === 'live_routes_api' && stop.travelMinutesFromPrev > 0
        ? stop.travelMinutesFromPrev
        : estimateTravelMinutes(distKm, preferences.transportMode);

    const arrivalMs = clockMs + travelMins * 60_000;
    const departureMs = arrivalMs + stop.estimatedVisitMinutes * 60_000;
    clockMs = departureMs;
    prevCoord = stop.coordinates;

    const perPerson =
      toSafeIntegerInr(stop.entryCostPerPersonInr) +
      toSafeIntegerInr(stop.foodAndActivityPerPersonInr);

    return {
      ...stop,
      distanceFromPrevKm: distKm,
      travelMinutesFromPrev: travelMins,
      suggestedArrivalTime: new Date(arrivalMs).toISOString(),
      suggestedDepartureTime: new Date(departureMs).toISOString(),
      estimatedStopCostPerPersonInr: perPerson,
      estimatedStopCostGroupInr:
        perPerson * Math.max(1, preferences.travellerCount),
    };
  });
}

/**
 * Section 16: Time, Budget and Return-Trip Guardrails
 */
export function evaluateFeasibilityWarnings(
  preferences: TravellerPreferences,
  stops: ItineraryStop[],
  fuelEstimate: FuelEstimate,
  transactions: Transaction[] = []
): FeasibilityWarning[] {
  const warnings: FeasibilityWarning[] = [];
  const activeStops = stops.filter((s) => !s.skipped);

  const totalTravelMins =
    activeStops.reduce((acc, s) => acc + s.travelMinutesFromPrev, 0) +
    estimateTravelMinutes(fuelEstimate.returnDistanceKm, preferences.transportMode);
  const totalVisitMins = activeStops.reduce(
    (acc, s) => acc + s.estimatedVisitMinutes,
    0
  );
  const totalTripMins = totalTravelMins + totalVisitMins;
  const availableMins = preferences.tripDurationHours * 60;

  if (totalTripMins > availableMins) {
    warnings.push({
      id: 'warn-time-overrun',
      severity: 'critical',
      code: 'TIME_OVERRUN',
      title: 'Return Deadline Exceeded',
      message: `Total itinerary requires ${(totalTripMins / 60).toFixed(
        1
      )} hrs (including return leg), exceeding your ${
        preferences.tripDurationHours
      } hr window by ${Math.round(totalTripMins - availableMins)} mins.`,
      remediation:
        'Use Trip Recovery to drop the furthest stop or switch to a faster pace.',
    });
  }

  // Check if any single leg exceeds maxLegTravelMinutes
  const longLeg = activeStops.find(
    (s) => s.travelMinutesFromPrev > preferences.maxLegTravelMinutes
  );
  if (longLeg || totalTravelMins > totalVisitMins * 1.4) {
    warnings.push({
      id: 'warn-excessive-driving',
      severity: 'warning',
      code: 'EXCESSIVE_DRIVING',
      title: 'High Riding / Driving Ratio',
      message: longLeg
        ? `Leg to ${longLeg.name} takes ~${longLeg.travelMinutesFromPrev} mins, exceeding your ${preferences.maxLegTravelMinutes}-min comfort threshold.`
        : `Transit time (${Math.round(
            totalTravelMins
          )} mins) exceeds sightseeing time (${Math.round(totalVisitMins)} mins).`,
      remediation:
        'Consider starting closer to the target district or picking clustered attractions.',
    });
  }

  // Budget & Reserve checks
  const dummyTrip: Trip = {
    id: 'check',
    title: 'check',
    createdAt: '',
    updatedAt: '',
    preferences,
    stops,
    fuelEstimate,
    warnings: [],
    assumptions: [],
    generationSource: 'deterministic_planner',
  };
  const summary = calculateBudgetSummary(dummyTrip, transactions);

  if (summary.projectedFinalSpendingInr > summary.plannedTripBudgetInr) {
    warnings.push({
      id: 'warn-budget-overrun',
      severity: 'critical',
      code: 'BUDGET_OVERRUN',
      title: 'Projected Budget Overrun',
      message: `Projected spending (₹${summary.projectedFinalSpendingInr.toLocaleString(
        'en-IN'
      )}) exceeds your planned trip budget (₹${summary.plannedTripBudgetInr.toLocaleString(
        'en-IN'
      )}) by ₹${(
        summary.projectedFinalSpendingInr - summary.plannedTripBudgetInr
      ).toLocaleString('en-IN')}.`,
      remediation:
        'Run Trip Recovery to replace paid activities with free heritage or nature stops.',
    });
  }

  if (
    summary.walletBalanceInr > 0 &&
    summary.walletBalanceInr < summary.estimatedRemainingTripCostInr
  ) {
    warnings.push({
      id: 'warn-low-wallet',
      severity: 'warning',
      code: 'LOW_WALLET_BALANCE',
      title: 'Wallet Balance Below Remaining Trip Cost',
      message: `Your demo wallet balance (₹${summary.walletBalanceInr.toLocaleString(
        'en-IN'
      )}) is lower than estimated remaining trip costs (₹${summary.estimatedRemainingTripCostInr.toLocaleString(
        'en-IN'
      )}).`,
      remediation:
        'Top up simulated wallet funds or trim optional activities in Trip Recovery.',
    });
  }

  if (
    summary.remainingPlannedBudgetInr - summary.estimatedRemainingTripCostInr <
    summary.emergencyReserveInr
  ) {
    warnings.push({
      id: 'warn-reserve-risk',
      severity: 'warning',
      code: 'RETURN_FUEL_RISK',
      title: 'Emergency Reserve & Return Journey Buffer Tight',
      message: `After remaining stops and ₹${summary.estimatedReturnJourneyFuelCostInr.toLocaleString(
        'en-IN'
      )} return transit, your buffer dips below your ₹${summary.emergencyReserveInr.toLocaleString(
        'en-IN'
      )} emergency reserve.`,
      remediation:
        'Preserve at least your emergency reserve + return fuel before spending on optional shopping.',
    });
  }

  const hasEstimatedCosts = activeStops.some(
    (s) => s.costStatus === 'estimated' || s.costStatus === 'unverified'
  );
  if (hasEstimatedCosts) {
    warnings.push({
      id: 'warn-unverified-costs',
      severity: 'info',
      code: 'UNVERIFIED_COSTS',
      title: 'Contains Estimated Local Costs',
      message:
        'Food, local boat rides, or seasonal safari tariffs are labelled as estimates and may vary on site.',
      remediation:
        'Check official ASI / Forest Department counters on arrival before committing group funds.',
    });
  }

  if (
    preferences.accessibilityRequired ||
    preferences.travellerStyle === 'senior_friendly'
  ) {
    const nonAccessible = activeStops.find((s) => {
      const d = KARNATAKA_DESTINATIONS.find((x) => x.id === s.attractionId);
      return d && (!d.seniorFriendly || d.wheelchairAccessible === 'unknown');
    });
    if (nonAccessible) {
      warnings.push({
        id: 'warn-accessibility',
        severity: 'warning',
        code: 'ACCESSIBILITY_UNKNOWN',
        title: 'Accessibility / Step Advisory',
        message: `${nonAccessible.name} has steps or unverified wheelchair access.`,
        remediation:
          'Swap for verified step-free heritage stops such as Mysuru Palace ground floor or Somanathapura.',
      });
    }
  }

  return warnings;
}

/**
 * Deterministic Itinerary Planner (also serves as validator/fallback for AI planner)
 */
export function buildDeterministicItinerary(
  preferences: TravellerPreferences,
  transactions: Transaction[] = [],
  aiSelectedIds?: string[],
  aiSummary?: string
): Trip {
  const safeAvoidIds = Array.isArray(preferences?.avoidIds) ? preferences.avoidIds : [];
  const safeMustVisitIds = Array.isArray(preferences?.mustVisitIds) ? preferences.mustVisitIds : [];
  const safeInterests: InterestCategory[] = Array.isArray(preferences?.interests)
    ? (preferences.interests as InterestCategory[])
    : ['heritage'];
  const targetDistrict = preferences?.targetDistrict || 'Mysuru';

  const safePrefs: TravellerPreferences = {
    startingLocation: preferences?.startingLocation || 'Bengaluru',
    startingCoordinates: preferences?.startingCoordinates || { lat: 12.9716, lng: 77.5946 },
    targetDistrict,
    departureDateTime: preferences?.departureDateTime || new Date().toISOString(),
    tripDurationHours: preferences?.tripDurationHours || 10,
    returnDeadline:
      preferences?.returnDeadline ||
      new Date(Date.now() + 10 * 3600_000).toISOString(),
    plannedBudgetInr: preferences?.plannedBudgetInr || 2000,
    travellerCount: Math.max(1, preferences?.travellerCount || 1),
    transportMode: preferences?.transportMode || 'car',
    travellerStyle: preferences?.travellerStyle || 'couple',
    interests: safeInterests,
    travelPace: preferences?.travelPace || 'balanced',
    vehicleMileageKmPerLitre: preferences?.vehicleMileageKmPerLitre || 16,
    fuelPricePerLitreInr: preferences?.fuelPricePerLitreInr || 103,
    foodPreference: preferences?.foodPreference || 'local_udupi_karnataka',
    accommodationPreference: preferences?.accommodationPreference || 'day_trip_none',
    accessibilityRequired: Boolean(preferences?.accessibilityRequired),
    mustVisitIds: safeMustVisitIds,
    avoidIds: safeAvoidIds,
    emergencyReserveInr: preferences?.emergencyReserveInr || 350,
    maxLegTravelMinutes: preferences?.maxLegTravelMinutes || 90,
    maxTransportChargeInr: preferences?.maxTransportChargeInr,
  };

  const districtCandidates = KARNATAKA_DESTINATIONS.filter(
    (d) =>
      d.district.toLowerCase() === targetDistrict.toLowerCase() &&
      !safeAvoidIds.includes(d.id)
  );

  const pool =
    districtCandidates.length > 0
      ? districtCandidates
      : KARNATAKA_DESTINATIONS.filter((d) => !safeAvoidIds.includes(d.id));

  // Score candidates by must-visit, interests, senior-friendliness, and cost
  const scored = [...pool].sort((a, b) => {
    const aMust = safeMustVisitIds.includes(a.id) ? 100 : 0;
    const bMust = safeMustVisitIds.includes(b.id) ? 100 : 0;
    if (aMust !== bMust) return bMust - aMust;

    if (aiSelectedIds && aiSelectedIds.length > 0) {
      const aIdx = aiSelectedIds.indexOf(a.id);
      const bIdx = aiSelectedIds.indexOf(b.id);
      if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
      if (aIdx !== -1) return -1;
      if (bIdx !== -1) return 1;
    }

    const aInterestMatches = a.categories.filter((c) =>
      safeInterests.includes(c)
    ).length;
    const bInterestMatches = b.categories.filter((c) =>
      safeInterests.includes(c)
    ).length;

    const aSeniorScore =
      safePrefs.travellerStyle === 'senior_friendly' ||
      safePrefs.accessibilityRequired
        ? a.seniorFriendly
          ? 5
          : -10
        : 0;
    const bSeniorScore =
      safePrefs.travellerStyle === 'senior_friendly' ||
      safePrefs.accessibilityRequired
        ? b.seniorFriendly
          ? 5
          : -10
        : 0;

    return (
      bInterestMatches * 10 +
      bSeniorScore -
      a.entryFeeInrPerPerson * 0.02 -
      (aInterestMatches * 10 + aSeniorScore - b.entryFeeInrPerPerson * 0.02)
    );
  });

  const maxStopsByPace =
    safePrefs.travelPace === 'relaxed'
      ? 2
      : safePrefs.travelPace === 'balanced'
      ? 3
      : 4;

  const stops: ItineraryStop[] = [];
  const startMs = new Date(safePrefs.departureDateTime).getTime();
  let clockMs = Number.isFinite(startMs) ? startMs : Date.now();
  let prevCoord = safePrefs.startingCoordinates;

  const availableMinutes = safePrefs.tripDurationHours * 60;
  const maxSpendableForStops = Math.max(
    200,
    safePrefs.plannedBudgetInr - safePrefs.emergencyReserveInr
  );
  let cumulativeStopCost = 0;

  for (const candidate of scored) {
    if (stops.length >= maxStopsByPace) break;

    const { stop, nextClockMs } = createItineraryStopFromDestination(
      candidate,
      prevCoord,
      clockMs,
      safePrefs
    );

    const returnDist = estimateRoadDistanceKm(
      candidate.coordinates,
      safePrefs.startingCoordinates
    );
    const returnMins = estimateTravelMinutes(
      returnDist,
      safePrefs.transportMode
    );
    const projectedElapsedMins =
      (nextClockMs - (Number.isFinite(startMs) ? startMs : Date.now())) /
        60_000 +
      returnMins;

    const isMustVisit = safeMustVisitIds.includes(candidate.id);

    // Ensure at least 1 stop is added so user can see why if infeasible, then enforce guardrails
    if (
      stops.length > 0 &&
      !isMustVisit &&
      (projectedElapsedMins > availableMinutes ||
        cumulativeStopCost + stop.estimatedStopCostGroupInr > maxSpendableForStops)
    ) {
      continue;
    }

    stops.push(stop);
    clockMs = nextClockMs;
    prevCoord = candidate.coordinates;
    cumulativeStopCost += stop.estimatedStopCostGroupInr;
  }

  const fuelEstimate = calculateFuelEstimate(
    safePrefs.startingCoordinates,
    stops,
    safePrefs
  );

  const warnings = evaluateFeasibilityWarnings(
    safePrefs,
    stops,
    fuelEstimate,
    transactions
  );

  const assumptions: string[] = [
    isMileageBasedTransport(safePrefs.transportMode)
      ? `Fuel calculated deterministically at ${safePrefs.vehicleMileageKmPerLitre} km/L and ₹${safePrefs.fuelPricePerLitreInr}/L for ${safePrefs.transportMode}.`
      : fuelEstimate.transportNote,
    'Food and optional activity figures are illustrative per-person estimates unless marked Verified.',
    'Road distances default to 1.28x Haversine until updated by live Google Routes API calculation on the map.',
  ];

  return {
    id: `trip-${safePrefs.targetDistrict.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
    title: `${safePrefs.targetDistrict} ${
      safePrefs.travellerStyle.replace('_', ' ')
    } Expedition`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    preferences: safePrefs,
    stops,
    fuelEstimate,
    warnings,
    assumptions,
    aiSummary:
      aiSummary ||
      `Planned ${stops.length} curated stop(s) in ${safePrefs.targetDistrict} tailored for ${safePrefs.travellerCount} traveller(s) via ${safePrefs.transportMode}, preserving ₹${safePrefs.emergencyReserveInr.toLocaleString('en-IN')} emergency reserve.`,
    generationSource: aiSummary ? 'gemini_ai' : 'deterministic_planner',
  };
}

/**
 * Section 12: AI Spending Coach ("What Should I Spend On Next?")
 * Deterministic affordability calculation + structured recommendations
 */
export function generateDeterministicSpendingRecommendations(
  trip: Trip,
  transactions: Transaction[]
): {
  recommendations: SpendingRecommendation[];
  categoryCaps: Record<ExpenseCategory, number>;
  safeDiscretionaryPoolInr: number;
  returnFuelCommitmentInr: number;
} {
  const summary = calculateBudgetSummary(trip, transactions);
  const travellerCount = Math.max(1, trip.preferences.travellerCount);

  const returnFuelCommitmentInr = summary.estimatedRemainingFuelCostInr;
  const effectiveCeilingInr = Math.min(
    summary.walletBalanceInr > 0
      ? summary.walletBalanceInr
      : summary.remainingPlannedBudgetInr,
    summary.remainingPlannedBudgetInr
  );

  const safeDiscretionaryPoolInr = Math.max(
    0,
    effectiveCeilingInr -
      summary.emergencyReserveInr -
      returnFuelCommitmentInr
  );

  const categoryCaps: Record<ExpenseCategory, number> = {
    Food: toSafeIntegerInr(safeDiscretionaryPoolInr * 0.4),
    'Fuel and transport': toSafeIntegerInr(
      returnFuelCommitmentInr + safeDiscretionaryPoolInr * 0.15
    ),
    'Entry tickets': toSafeIntegerInr(safeDiscretionaryPoolInr * 0.2),
    Activities: toSafeIntegerInr(safeDiscretionaryPoolInr * 0.15),
    Shopping: toSafeIntegerInr(safeDiscretionaryPoolInr * 0.1),
    Accommodation: summary.estimatedAccommodationCostInr,
    Other: toSafeIntegerInr(safeDiscretionaryPoolInr * 0.05),
  };

  const safeStops = Array.isArray(trip?.stops) ? trip.stops : [];
  const currentStop =
    safeStops.find((s) => !s.completed && !s.skipped) ||
    safeStops[safeStops.length - 1];
  const anchorCoord: LatLngLiteral =
    currentStop?.coordinates && Number.isFinite(currentStop.coordinates.lat)
      ? currentStop.coordinates
      : trip?.preferences?.startingCoordinates && Number.isFinite(trip.preferences.startingCoordinates.lat)
      ? trip.preferences.startingCoordinates
      : { lat: 12.9716, lng: 77.5946 };

  const recommendations: SpendingRecommendation[] = [];

  // 1. Affordable local food recommendation
  const mealPerPerson = safeDiscretionaryPoolInr >= 150 * travellerCount ? 140 : 80;
  const mealGroupCost = mealPerPerson * travellerCount;
  const targetDistrict = trip?.preferences?.targetDistrict || 'Karnataka';
  const foodPref = (trip?.preferences?.foodPreference || 'local_udupi_karnataka').replace(/_/g, ' ');

  recommendations.push({
    id: 'rec-food-darshini',
    title: `Authentic ${targetDistrict} Tiffin / Thali Meal`,
    category: 'Food',
    recommendationType: 'food',
    whySuitable: `Matches your ${foodPref} preference and stays well within your ₹${categoryCaps.Food.toLocaleString(
      'en-IN'
    )} food cap.`,
    estimatedCostPerPersonInr: mealPerPerson,
    estimatedCostGroupInr: mealGroupCost,
    costVerified: false,
    distanceKm: 1.2,
    travelDurationMinutes: 6,
    activityDurationMinutes: 40,
    walletBalanceAfterInr: summary.walletBalanceInr - mealGroupCost,
    remainingPlannedBudgetAfterInr:
      summary.remainingPlannedBudgetInr - mealGroupCost,
    preservesEmergencyReserve:
      effectiveCeilingInr - mealGroupCost - returnFuelCommitmentInr >=
      summary.emergencyReserveInr,
    uncertaintyNote:
      'Menu prices vary between local darshinis (₹60–₹100) and sit-down family restaurants (₹150–₹250).',
    sourceLabel: 'curated_verified',
  });

  // 2. Low-cost or free attraction nearby
  const matchingAttractions = KARNATAKA_DESTINATIONS.filter(
    (d) =>
      d.district.toLowerCase() === targetDistrict.toLowerCase() &&
      !safeStops.some((s) => s.attractionId === d.id && !s.skipped)
  ).sort((a, b) => a.entryFeeInrPerPerson - b.entryFeeInrPerPerson);

  const unvisitedDistrictAttractions =
    matchingAttractions.length > 0
      ? matchingAttractions
      : KARNATAKA_DESTINATIONS.filter(
          (d) => !safeStops.some((s) => s.attractionId === d.id)
        ).slice(0, 5);

  if (unvisitedDistrictAttractions.length > 0) {
    const lowCostDest = unvisitedDistrictAttractions[0];
    const distKm = estimateRoadDistanceKm(anchorCoord, lowCostDest.coordinates);
    const groupCost = lowCostDest.entryFeeInrPerPerson * travellerCount;
    recommendations.push({
      id: `rec-attr-${lowCostDest.id}`,
      title: `Low-Cost Stop: ${lowCostDest.name}`,
      category: 'Entry tickets',
      recommendationType: 'attraction',
      whySuitable: `${lowCostDest.whyRecommend} Entry is ${
        lowCostDest.entryFeeInrPerPerson === 0
          ? 'Free'
          : `₹${lowCostDest.entryFeeInrPerPerson}/person`
      }.`,
      estimatedCostPerPersonInr: lowCostDest.entryFeeInrPerPerson,
      estimatedCostGroupInr: groupCost,
      costVerified: lowCostDest.costStatus === 'verified' || lowCostDest.costStatus === 'free',
      distanceKm: distKm,
      travelDurationMinutes: estimateTravelMinutes(
        distKm,
        trip.preferences.transportMode
      ),
      activityDurationMinutes: lowCostDest.expectedVisitMinutes,
      walletBalanceAfterInr: summary.walletBalanceInr - groupCost,
      remainingPlannedBudgetAfterInr:
        summary.remainingPlannedBudgetInr - groupCost,
      preservesEmergencyReserve:
        effectiveCeilingInr - groupCost - returnFuelCommitmentInr >=
        summary.emergencyReserveInr,
      uncertaintyNote:
        lowCostDest.costStatus === 'verified' || lowCostDest.costStatus === 'free'
          ? `Verified via ${lowCostDest.sourceName}.`
          : 'Entry fee is an estimate; parking fees (~₹20–₹40) may apply.',
      sourceLabel: 'curated_verified',
    });
  }

  // 3. Check if any upcoming stop is expensive and suggest skipping or capping
  const expensiveUpcoming = trip.stops
    .filter((s) => !s.completed && !s.skipped)
    .sort((a, b) => b.estimatedStopCostGroupInr - a.estimatedStopCostGroupInr)[0];

  if (expensiveUpcoming && expensiveUpcoming.estimatedStopCostGroupInr > 0) {
    const savesInr = toSafeIntegerInr(
      expensiveUpcoming.foodAndActivityPerPersonInr * 0.6 * travellerCount
    );
    recommendations.push({
      id: `rec-cap-${expensiveUpcoming.stopId}`,
      title: `Trim Optional Add-ons at ${expensiveUpcoming.name}`,
      category: 'Activities',
      recommendationType:
        safeDiscretionaryPoolInr < expensiveUpcoming.estimatedStopCostGroupInr
          ? 'skip_warning'
          : 'activity',
      whySuitable:
        safeDiscretionaryPoolInr < expensiveUpcoming.estimatedStopCostGroupInr
          ? `Your remaining discretionary pool (₹${safeDiscretionaryPoolInr.toLocaleString(
              'en-IN'
            )}) is tighter than the full projected spend at ${
              expensiveUpcoming.name
            }. Stick to basic entry (₹${
              expensiveUpcoming.entryCostPerPersonInr
            }/person) and skip paid add-ons to save ₹${savesInr.toLocaleString(
              'en-IN'
            )}.`
          : `You can comfortably afford ${expensiveUpcoming.name}, or save ₹${savesInr.toLocaleString(
              'en-IN'
            )} for coffee/spice souvenirs by keeping only standard entry.`,
      estimatedCostPerPersonInr: expensiveUpcoming.entryCostPerPersonInr,
      estimatedCostGroupInr:
        expensiveUpcoming.entryCostPerPersonInr * travellerCount,
      costVerified: expensiveUpcoming.costStatus === 'verified',
      distanceKm: expensiveUpcoming.distanceFromPrevKm,
      travelDurationMinutes: expensiveUpcoming.travelMinutesFromPrev,
      activityDurationMinutes: expensiveUpcoming.estimatedVisitMinutes,
      walletBalanceAfterInr:
        summary.walletBalanceInr -
        expensiveUpcoming.entryCostPerPersonInr * travellerCount,
      remainingPlannedBudgetAfterInr:
        summary.remainingPlannedBudgetInr -
        expensiveUpcoming.entryCostPerPersonInr * travellerCount,
      preservesEmergencyReserve: true,
      uncertaintyNote:
        'Optional boating, camera fees, and private guides are discretionary.',
      sourceLabel: 'curated_verified',
    });
  }

  // 4. Return journey & fuel preservation advice
  recommendations.push({
    id: 'rec-fuel-preserve',
    title: `Lock ₹${(
      returnFuelCommitmentInr + summary.emergencyReserveInr
    ).toLocaleString('en-IN')} for Return Transit & Emergency Reserve`,
    category: 'Fuel and transport',
    recommendationType: 'transport_saving',
    whySuitable: `Covers ${trip.fuelEstimate.remainingDistanceKm} km remaining route (${trip.fuelEstimate.returnDistanceKm} km return leg to ${trip.preferences?.startingLocation || 'starting hub'}) plus your ₹${summary.emergencyReserveInr.toLocaleString('en-IN')} emergency reserve.`,
    estimatedCostPerPersonInr: toSafeIntegerInr(
      returnFuelCommitmentInr / travellerCount
    ),
    estimatedCostGroupInr: returnFuelCommitmentInr,
    costVerified: false,
    distanceKm: trip.fuelEstimate.remainingDistanceKm,
    travelDurationMinutes: estimateTravelMinutes(
      trip.fuelEstimate.remainingDistanceKm,
      trip.preferences.transportMode
    ),
    activityDurationMinutes: 0,
    walletBalanceAfterInr: summary.walletBalanceInr - returnFuelCommitmentInr,
    remainingPlannedBudgetAfterInr:
      summary.remainingPlannedBudgetInr - returnFuelCommitmentInr,
    preservesEmergencyReserve: true,
    uncertaintyNote: trip.fuelEstimate.transportNote,
    sourceLabel: 'curated_verified',
  });

  return {
    recommendations,
    categoryCaps,
    safeDiscretionaryPoolInr,
    returnFuelCommitmentInr,
  };
}

/**
 * Section 14: Adaptive Trip Recovery Engine
 * Preserves completed stops & recorded transactions, recalculates remaining budget & time,
 * ranks feasible alternatives, and builds a before/after recovery proposal.
 */
export function buildRecoveryProposal(
  trip: Trip,
  transactions: Transaction[],
  trigger: RecoveryInput
): RecoveryProposal {
  const newMode = trigger.newTransportMode || trip.preferences.transportMode;
  const isModeChanged = Boolean(
    trigger.newTransportMode && trigger.newTransportMode !== trip.preferences.transportMode
  );
  const updatedPreferences: TravellerPreferences = {
    ...trip.preferences,
    transportMode: newMode,
    vehicleMileageKmPerLitre: isMileageBasedTransport(newMode)
      ? (isModeChanged ? (newMode === 'motorcycle' ? 42 : 16) : trip.preferences.vehicleMileageKmPerLitre)
      : 0,
    fuelPricePerLitreInr: isMileageBasedTransport(newMode)
      ? (trip.preferences.fuelPricePerLitreInr || 103)
      : 0,
    maxTransportChargeInr: isMileageBasedTransport(newMode)
      ? undefined
      : (isModeChanged ? undefined : trip.preferences.maxTransportChargeInr),
    interests:
      trigger.updatedInterests && trigger.updatedInterests.length > 0
        ? trigger.updatedInterests
        : trip.preferences.interests,
  };

  // 1. Preserve completed stops
  const completedStops = trip.stops.filter((s) => s.completed);
  const uncompletedOriginalStops = trip.stops.filter(
    (s) => !s.completed && !s.skipped
  );

  // 2. Identify last confirmed stop or starting coordinates
  const lastConfirmedCoord =
    completedStops.length > 0
      ? completedStops[completedStops.length - 1].coordinates
      : updatedPreferences.startingCoordinates;

  // 3. Recalculate remaining wallet balance and planned budget (incorporating any extra unrecorded shock in trigger)
  const currentSummary = calculateBudgetSummary(trip, transactions);
  const effectiveExtraSpent = toSafeIntegerInr(trigger.extraSpentInr || 0);
  const effectiveRemainingBudgetInr =
    currentSummary.remainingPlannedBudgetInr - effectiveExtraSpent;
  const effectiveWalletBalanceInr =
    currentSummary.walletBalanceInr > 0
      ? Math.max(0, currentSummary.walletBalanceInr - effectiveExtraSpent)
      : effectiveRemainingBudgetInr;

  const spendableCeilingInr = Math.max(
    0,
    Math.min(effectiveRemainingBudgetInr, effectiveWalletBalanceInr) -
      updatedPreferences.emergencyReserveInr
  );

  // 4. Calculate remaining time window before return deadline
  const totalAvailableMinutes = updatedPreferences.tripDurationHours * 60;
  const completedMinutesUsed = completedStops.reduce(
    (acc, s) => acc + s.travelMinutesFromPrev + s.estimatedVisitMinutes,
    0
  );
  const availableRemainingMinutes = Math.max(
    30,
    totalAvailableMinutes - completedMinutesUsed - (trigger.lostMinutes || 0)
  );

  const retainedStops: ItineraryStop[] = [];
  const skippedStops: ItineraryStop[] = [];
  const replacementStops: ItineraryStop[] = [];
  const changeLog: string[] = [];

  let runningMinutesUsed = 0;
  let runningCostUsedInr = 0;
  let prevCoord = lastConfirmedCoord;

  const baseStartMs = new Date(updatedPreferences.departureDateTime).getTime();
  let clockMs =
    (Number.isFinite(baseStartMs) ? baseStartMs : Date.now()) +
    (completedMinutesUsed + (trigger.lostMinutes || 0)) * 60_000;

  // Evaluate each uncompleted stop
  for (const stop of uncompletedOriginalStops) {
    const destMeta = KARNATAKA_DESTINATIONS.find(
      (d) => d.id === stop.attractionId
    );
    const unavailableList = Array.isArray(trigger?.unavailableStopIds) ? trigger.unavailableStopIds : [];
    const isUnavailable =
      unavailableList.includes(stop.stopId) ||
      unavailableList.includes(stop.attractionId);
    const isWeatherConflict =
      trigger.weatherCondition === 'heavy_rain' &&
      destMeta?.weatherSensitive === true;

    const legDistKm = estimateRoadDistanceKm(prevCoord, stop.coordinates);
    const legMins = estimateTravelMinutes(
      legDistKm,
      updatedPreferences.transportMode
    );
    const returnDistKm = estimateRoadDistanceKm(
      stop.coordinates,
      updatedPreferences.startingCoordinates
    );
    const returnMins = estimateTravelMinutes(
      returnDistKm,
      updatedPreferences.transportMode
    );

    // Trim optional cost by 35% if budget is under pressure
    const tightenedFoodActivityInr =
      trigger.reason === 'overspent' || trigger.reason === 'wallet_decreased'
        ? toSafeIntegerInr(stop.foodAndActivityPerPersonInr * 0.65)
        : stop.foodAndActivityPerPersonInr;

    const candidatePerPersonInr =
      stop.entryCostPerPersonInr + tightenedFoodActivityInr;
    const candidateGroupCostInr =
      candidatePerPersonInr * updatedPreferences.travellerCount;

    const projectedReturnFuelInr = isMileageBasedTransport(
      updatedPreferences.transportMode
    )
      ? toSafeIntegerInr(
          ((legDistKm + returnDistKm) /
            Math.max(1, updatedPreferences.vehicleMileageKmPerLitre)) *
            updatedPreferences.fuelPricePerLitreInr
        )
      : calculateMaxTransportCharge(
          legDistKm + returnDistKm,
          updatedPreferences.transportMode,
          updatedPreferences.travellerCount
        ).maxChargeTotalInr;

    const fitsTime =
      runningMinutesUsed +
        legMins +
        stop.estimatedVisitMinutes +
        returnMins <=
      availableRemainingMinutes;
    const fitsBudget =
      runningCostUsedInr + candidateGroupCostInr + projectedReturnFuelInr <=
      spendableCeilingInr;

    if (isUnavailable) {
      skippedStops.push({ ...stop, skipped: true });
      changeLog.push(
        `Skipped ${stop.name} because it was marked unavailable/closed.`
      );
      continue;
    }

    if (isWeatherConflict) {
      skippedStops.push({ ...stop, skipped: true });
      changeLog.push(
        `Skipped outdoor stop ${stop.name} due to heavy rain advisory.`
      );
      continue;
    }

    if (!fitsTime || !fitsBudget) {
      skippedStops.push({ ...stop, skipped: true });
      changeLog.push(
        `Skipped ${stop.name} to save ${
          legMins + stop.estimatedVisitMinutes
        } mins and ₹${stop.estimatedStopCostGroupInr.toLocaleString(
          'en-IN'
        )} so you meet your return deadline & reserve.`
      );
      continue;
    }

    const arrivalMs = clockMs + legMins * 60_000;
    const departureMs = arrivalMs + stop.estimatedVisitMinutes * 60_000;

    const revisedStop: ItineraryStop = {
      ...stop,
      distanceFromPrevKm: legDistKm,
      travelMinutesFromPrev: legMins,
      suggestedArrivalTime: new Date(arrivalMs).toISOString(),
      suggestedDepartureTime: new Date(departureMs).toISOString(),
      foodAndActivityPerPersonInr: tightenedFoodActivityInr,
      estimatedStopCostPerPersonInr: candidatePerPersonInr,
      estimatedStopCostGroupInr: candidateGroupCostInr,
    };

    retainedStops.push(revisedStop);
    runningMinutesUsed += legMins + stop.estimatedVisitMinutes;
    runningCostUsedInr += candidateGroupCostInr;
    clockMs = departureMs;
    prevCoord = stop.coordinates;
  }

  // 7. Find feasible low-cost / indoor / nearby replacement stops from the same district
  const safeStopsList = Array.isArray(trip?.stops) ? trip.stops : [];
  const existingAttractionIds = new Set(
    safeStopsList.map((s) => s.attractionId)
  );
  const safeAvoidList = Array.isArray(updatedPreferences?.avoidIds) ? updatedPreferences.avoidIds : [];
  const candidatePool = KARNATAKA_DESTINATIONS.filter(
    (d) =>
      d.district.toLowerCase() ===
        (updatedPreferences.targetDistrict || 'Mysuru').toLowerCase() &&
      !existingAttractionIds.has(d.id) &&
      !safeAvoidList.includes(d.id) &&
      (trigger.weatherCondition !== 'heavy_rain' || !d.weatherSensitive)
  ).sort(
    (a, b) =>
      a.entryFeeInrPerPerson +
      a.expectedVisitMinutes -
      (b.entryFeeInrPerPerson + b.expectedVisitMinutes)
  );

  for (const alt of candidatePool) {
    if (retainedStops.length + replacementStops.length >= 3) break;

    const legDistKm = estimateRoadDistanceKm(prevCoord, alt.coordinates);
    const legMins = estimateTravelMinutes(
      legDistKm,
      updatedPreferences.transportMode
    );
    const returnDistKm = estimateRoadDistanceKm(
      alt.coordinates,
      updatedPreferences.startingCoordinates
    );
    const returnMins = estimateTravelMinutes(
      returnDistKm,
      updatedPreferences.transportMode
    );

    const visitMins = Math.min(60, alt.expectedVisitMinutes);
    const leanFoodInr = Math.min(80, alt.recommendedFoodBudgetPerPerson);
    const perPersonCost = alt.entryFeeInrPerPerson + leanFoodInr;
    const groupCost = perPersonCost * updatedPreferences.travellerCount;

    const projectedReturnFuelInr = isMileageBasedTransport(
      updatedPreferences.transportMode
    )
      ? toSafeIntegerInr(
          ((legDistKm + returnDistKm) /
            Math.max(1, updatedPreferences.vehicleMileageKmPerLitre)) *
            updatedPreferences.fuelPricePerLitreInr
        )
      : calculateMaxTransportCharge(
          legDistKm + returnDistKm,
          updatedPreferences.transportMode,
          updatedPreferences.travellerCount
        ).maxChargeTotalInr;

    if (
      runningMinutesUsed + legMins + visitMins + returnMins <=
        availableRemainingMinutes &&
      runningCostUsedInr + groupCost + projectedReturnFuelInr <=
        spendableCeilingInr
    ) {
      const arrivalMs = clockMs + legMins * 60_000;
      const departureMs = arrivalMs + visitMins * 60_000;

      const repStop: ItineraryStop = {
        stopId: `stop-rep-${alt.id}`,
        attractionId: alt.id,
        name: alt.name,
        nameKn: alt.nameKn,
        district: alt.district,
        coordinates: alt.coordinates,
        suggestedArrivalTime: new Date(arrivalMs).toISOString(),
        suggestedDepartureTime: new Date(departureMs).toISOString(),
        estimatedVisitMinutes: visitMins,
        distanceFromPrevKm: legDistKm,
        travelMinutesFromPrev: legMins,
        routeSource: 'haversine_estimate',
        trafficAware: false,
        entryCostPerPersonInr: alt.entryFeeInrPerPerson,
        foodAndActivityPerPersonInr: leanFoodInr,
        estimatedStopCostPerPersonInr: perPersonCost,
        estimatedStopCostGroupInr: groupCost,
        costStatus: alt.costStatus,
        recommendationReason: `Recovery Replacement: ${alt.whyRecommend}`,
        matchedInterests: alt.categories,
        sourceName: alt.sourceName,
        sourceUrl: alt.sourceUrl,
        completed: false,
        skipped: false,
        isReplacement: true,
      };

      replacementStops.push(repStop);
      runningMinutesUsed += legMins + visitMins;
      runningCostUsedInr += groupCost;
      clockMs = departureMs;
      prevCoord = alt.coordinates;

      changeLog.push(
        `Added feasible replacement stop "${alt.name}" (${visitMins} mins, ₹${perPersonCost}/person${
           !alt.weatherSensitive ? ', all-weather friendly' : ''
        }).`
      );
    }
  }

  const revisedStops: ItineraryStop[] = [
    ...completedStops,
    ...retainedStops,
    ...replacementStops,
  ];

  const revisedFuelEstimate = calculateFuelEstimate(
    updatedPreferences.startingCoordinates,
    revisedStops,
    updatedPreferences
  );

  const returnTransitMins = estimateTravelMinutes(
    revisedFuelEstimate.returnDistanceKm,
    updatedPreferences.transportMode
  );
  const revisedRemainingMinutes = runningMinutesUsed + returnTransitMins;

  const revisedEstimatedRemainingCostInr =
    runningCostUsedInr + revisedFuelEstimate.estimatedRemainingFuelCostInr;
  const revisedProjectedFinalSpendingInr =
    currentSummary.validTripExpensesInr +
    effectiveExtraSpent +
    revisedEstimatedRemainingCostInr;

  const warnings = evaluateFeasibilityWarnings(
    updatedPreferences,
    revisedStops,
    revisedFuelEstimate,
    transactions
  );

  const isFeasible =
    revisedRemainingMinutes <= availableRemainingMinutes &&
    revisedProjectedFinalSpendingInr <=
      updatedPreferences.plannedBudgetInr -
        updatedPreferences.emergencyReserveInr;

  if (changeLog.length === 0) {
    changeLog.push(
      'Adjusted arrival/departure timestamps and tightened discretionary food/activity buffers while retaining all remaining stops.'
    );
  }

  return {
    id: `recovery-${Date.now()}`,
    createdAt: new Date().toISOString(),
    trigger,
    retainedStops,
    completedStops,
    skippedStops,
    replacementStops,
    revisedStops,
    originalEstimatedTotalCostInr: currentSummary.projectedFinalSpendingInr,
    revisedEstimatedRemainingCostInr,
    revisedProjectedFinalSpendingInr,
    remainingPlannedBudgetInr: effectiveRemainingBudgetInr,
    walletBalanceInr: effectiveWalletBalanceInr,
    originalDurationMinutes: Math.round(totalAvailableMinutes),
    revisedRemainingMinutes,
    availableRemainingMinutes,
    revisedFuelEstimate,
    warnings,
    explanationSummary: isFeasible
      ? `Trip Recovery preserved ${completedStops.length} completed stop(s), retained ${retainedStops.length} planned stop(s), skipped ${skippedStops.length} infeasible stop(s), and added ${replacementStops.length} low-cost replacement(s) to fit your ${Math.round(
          availableRemainingMinutes / 60
        )}h remaining window and ₹${ updatedPreferences.emergencyReserveInr.toLocaleString(
          'en-IN'
        )} emergency reserve.`
      : `Even after trimming optional stops, return transit requires ${returnTransitMins} mins and ₹${revisedFuelEstimate.estimatedRemainingFuelCostInr.toLocaleString(
          'en-IN'
        )}. We recommend heading back after ${
          retainedStops.length > 0 ? retainedStops[0].name : 'your current stop'
        } or extending your deadline.`,
    changeLog,
    assumptions: [
      'Completed stops and recorded wallet transactions are never deleted or altered.',
      'Planned trip budget remains locked unless explicitly edited by the user in Trip Setup.',
    ],
    isFeasible,
    generationSource: 'deterministic_recovery',
  };
}

/**
 * Section 15: What-If Trip Simulator
 * Previews a decision side-by-side without mutating saved itinerary or wallet transactions.
 */
export function simulateWhatIfScenario(
  trip: Trip,
  transactions: Transaction[],
  scenario: WhatIfScenarioInput
): WhatIfComparisonResult {
  const currentSummary = calculateBudgetSummary(trip, transactions);
  const safeStops = Array.isArray(trip?.stops) ? trip.stops : [];
  const currentActiveStops = safeStops.filter((s) => !s.skipped);
  const currentReturnMins = estimateTravelMinutes(
    trip?.fuelEstimate?.returnDistanceKm || 0,
    trip?.preferences?.transportMode || 'car'
  );
  const currentTravelMins =
    currentActiveStops.reduce((a, s) => a + s.travelMinutesFromPrev, 0) +
    currentReturnMins;
  const currentVisitMins = currentActiveStops.reduce(
    (a, s) => a + s.estimatedVisitMinutes,
    0
  );
  const availableMins = (trip?.preferences?.tripDurationHours || 10) * 60;

  // Clone preferences and stops for pure simulation
  const simPrefs: TravellerPreferences = {
    ...(trip?.preferences || ({} as TravellerPreferences)),
  };
  let simStops: ItineraryStop[] = safeStops.map((s) => ({ ...s }));
  let extraSimulatedSpendInr = 0;
  let extraDelayMins = 0;
  const destinationsGained: string[] = [];
  const destinationsLost: string[] = [];

  switch (scenario.type) {
    case 'spend_300':
      extraSimulatedSpendInr = 300;
      break;
    case 'spend_500':
      extraSimulatedSpendInr = 500;
      break;
    case 'lose_30m':
      extraDelayMins = 30;
      break;
    case 'lose_60m':
      extraDelayMins = 60;
      break;
    case 'lose_120m':
      extraDelayMins = 120;
      break;
    case 'change_vehicle':
      if (scenario.newTransportMode) {
        simPrefs.transportMode = scenario.newTransportMode;
        if (scenario.newTransportMode === 'motorcycle') {
          simPrefs.vehicleMileageKmPerLitre = 42;
          simPrefs.fuelPricePerLitreInr = simPrefs.fuelPricePerLitreInr || 103;
          simPrefs.maxTransportChargeInr = undefined;
        } else if (scenario.newTransportMode === 'car') {
          simPrefs.vehicleMileageKmPerLitre = 16;
          simPrefs.fuelPricePerLitreInr = simPrefs.fuelPricePerLitreInr || 103;
          simPrefs.maxTransportChargeInr = undefined;
        } else {
          simPrefs.vehicleMileageKmPerLitre = 0;
          simPrefs.fuelPricePerLitreInr = 0;
          simPrefs.maxTransportChargeInr = undefined;
        }
      }
      break;
    case 'reduce_budget':
      simPrefs.plannedBudgetInr = Math.max(
        500,
        simPrefs.plannedBudgetInr - (scenario.budgetReductionInr || 500)
      );
      break;
    case 'expensive_activity':
      extraSimulatedSpendInr = 350 * simPrefs.travellerCount;
      break;
    case 'remove_destination': {
      const removeId =
        scenario.targetStopIdToRemove ||
        simStops.filter((s) => !s.completed && !s.skipped).pop()?.stopId;
      if (removeId) {
        simStops = simStops.map((s) => {
          if (s.stopId === removeId) {
            destinationsLost.push(s.name);
            return { ...s, skipped: true };
          }
          return s;
        });
      }
      break;
    }
    case 'add_destination': {
      const candidate =
        KARNATAKA_DESTINATIONS.find(
          (d) => d.id === scenario.targetDestinationId
        ) ||
        KARNATAKA_DESTINATIONS.find(
          (d) =>
            d.district.toLowerCase() ===
              simPrefs.targetDistrict.toLowerCase() &&
            !simStops.some((s) => s.attractionId === d.id && !s.skipped)
        );
      if (candidate) {
        const lastCoord =
          simStops.filter((s) => !s.skipped).slice(-1)[0]?.coordinates ||
          simPrefs.startingCoordinates;
        const { stop } = createItineraryStopFromDestination(
          candidate,
          lastCoord,
          Date.now(),
          simPrefs
        );
        simStops.push(stop);
        destinationsGained.push(candidate.name);
      }
      break;
    }
  }

  simStops = recalculateStopSchedule(
    simPrefs.startingCoordinates,
    simPrefs.departureDateTime,
    simStops,
    simPrefs,
    extraDelayMins
  );

  const simFuel = calculateFuelEstimate(
    simPrefs.startingCoordinates,
    simStops,
    simPrefs
  );

  const simTransactions: Transaction[] =
    extraSimulatedSpendInr > 0
      ? [
          ...transactions,
          {
            id: 'sim-tx',
            type: 'expense',
            amountInr: extraSimulatedSpendInr,
            category: 'Activities',
            description: `Simulated: ${scenario.label}`,
            timestamp: new Date().toISOString(),
            isTripExpense: true,
            undone: false,
          },
        ]
      : transactions;

  const simTrip: Trip = {
    ...trip,
    preferences: simPrefs,
    stops: simStops,
    fuelEstimate: simFuel,
  };

  const simSummary = calculateBudgetSummary(simTrip, simTransactions);
  const simActiveStops = simStops.filter((s) => !s.skipped);
  const simReturnMins = estimateTravelMinutes(
    simFuel.returnDistanceKm,
    simPrefs.transportMode
  );
  const simTravelMins =
    simActiveStops.reduce((a, s) => a + s.travelMinutesFromPrev, 0) +
    simReturnMins +
    extraDelayMins;
  const simVisitMins = simActiveStops.reduce(
    (a, s) => a + s.estimatedVisitMinutes,
    0
  );

  const meetsReturnDeadline = simTravelMins + simVisitMins <= availableMins;
  const preservesReserve =
    simSummary.remainingPlannedBudgetInr -
      simSummary.estimatedRemainingTripCostInr >=
    simPrefs.emergencyReserveInr;

  const feasibilityVerdict: WhatIfComparisonResult['feasibilityVerdict'] =
    !meetsReturnDeadline || !simSummary.isWithinPlannedBudget
      ? 'infeasible'
      : !preservesReserve
      ? 'tight_warning'
      : 'feasible';

  return {
    scenario,
    current: {
      projectedTotalSpendingInr: currentSummary.projectedFinalSpendingInr,
      walletBalanceInr: currentSummary.walletBalanceInr,
      remainingPlannedBudgetInr: currentSummary.remainingPlannedBudgetInr,
      fuelCostInr: currentSummary.estimatedFuelCostTotalInr,
      totalTravelMinutes: currentTravelMins,
      totalVisitMinutes: currentVisitMins,
      destinationCount: currentActiveStops.length,
      meetsReturnDeadline:
        currentTravelMins + currentVisitMins <= availableMins,
      preservesReserve:
        currentSummary.remainingPlannedBudgetInr -
          currentSummary.estimatedRemainingTripCostInr >=
        trip.preferences.emergencyReserveInr,
    },
    simulated: {
      projectedTotalSpendingInr: simSummary.projectedFinalSpendingInr,
      walletBalanceInr: simSummary.walletBalanceInr,
      remainingPlannedBudgetInr: simSummary.remainingPlannedBudgetInr,
      fuelCostInr: simSummary.estimatedFuelCostTotalInr,
      totalTravelMinutes: simTravelMins,
      totalVisitMinutes: simVisitMins,
      destinationCount: simActiveStops.length,
      meetsReturnDeadline,
      preservesReserve,
      stops: simStops,
    },
    destinationsGained,
    destinationsLost,
    feasibilityVerdict,
    summaryExplanation:
      feasibilityVerdict === 'feasible'
        ? `Scenario "${scenario.label}" is feasible: projected total spending is ₹${simSummary.projectedFinalSpendingInr.toLocaleString(
            'en-IN'
          )} and total time is ${((simTravelMins + simVisitMins) / 60).toFixed(
            1
          )} hrs (within your ${simPrefs.tripDurationHours} hr deadline).`
        : feasibilityVerdict === 'tight_warning'
        ? `Scenario "${scenario.label}" fits your overall budget ceiling, but dips into your ₹${simPrefs.emergencyReserveInr.toLocaleString(
            'en-IN'
          )} emergency reserve.`
        : `Scenario "${scenario.label}" breaches guardrails: ${
            !meetsReturnDeadline
              ? `exceeds return deadline by ${Math.round(
                  simTravelMins + simVisitMins - availableMins
                )} mins`
              : `exceeds planned budget by ₹${(
                  simSummary.projectedFinalSpendingInr -
                  simSummary.plannedTripBudgetInr
                ).toLocaleString('en-IN')}`
          }. Trigger Trip Recovery if this happens.`,
  };
}
