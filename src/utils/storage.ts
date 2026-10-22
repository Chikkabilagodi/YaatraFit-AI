import type { Transaction, TravellerPreferences, Trip, WalletState } from '../types/travel.ts';
import { KARNATAKA_STARTING_HUBS } from '../data/karnatakaDestinations.ts';
import { buildDeterministicItinerary } from './finance.ts';

const STORAGE_KEY_TRIPS = 'yaatra_fit_ai_trips_v3';
const STORAGE_KEY_ACTIVE_TRIP_ID = 'yaatra_fit_ai_active_trip_v3';
const STORAGE_KEY_WALLET = 'yaatra_fit_ai_wallet_v3';

export function getDefaultPreferences(): TravellerPreferences {
  const now = new Date();
  // If user accesses after 6:00 PM, default start to 8:00 AM tomorrow so deadline is not already expired
  const startDay = now.getHours() >= 18 ? now.getDate() + 1 : now.getDate();
  const departure = new Date(now.getFullYear(), now.getMonth(), startDay, 8, 0, 0);
  const tripDurationHours = 11;
  const deadline = new Date(departure.getTime() + tripDurationHours * 3600_000);

  return {
    startingLocation: 'Mysuru Junction',
    startingCoordinates: KARNATAKA_STARTING_HUBS['Mysuru Junction'],
    targetDistrict: 'Mysuru',
    departureDateTime: departure.toISOString(),
    tripDurationHours,
    returnDeadline: deadline.toISOString(),
    plannedBudgetInr: 2500,
    travellerCount: 2,
    transportMode: 'car',
    travellerStyle: 'couple',
    interests: ['heritage', 'culture', 'food', 'nature'],
    travelPace: 'balanced',
    vehicleMileageKmPerLitre: 16,
    fuelPricePerLitreInr: 103,
    foodPreference: 'local_udupi_karnataka',
    accommodationPreference: 'day_trip_none',
    accessibilityRequired: false,
    mustVisitIds: [], // Zero pre-suggestions at start
    avoidIds: [],
    emergencyReserveInr: 350,
    maxLegTravelMinutes: 90,
  };
}

export function getDefaultWalletState(_activeTripId?: string): WalletState {
  const initialTransactions: Transaction[] = [];

  return {
    version: 1,
    transactions: initialTransactions,
    lastUpdated: new Date().toISOString(),
  };
}

export function createCleanStarterTrip(): Trip {
  const defaultPrefs = getDefaultPreferences();
  return {
    id: 'trip-karnataka-starter-01',
    title: 'My Karnataka Expedition',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    preferences: defaultPrefs,
    stops: [], // Zero pre-suggestions at start
    fuelEstimate: {
      oneWayDistanceKm: 0,
      returnDistanceKm: 0,
      totalTripDistanceKm: 0,
      completedDistanceKm: 0,
      remainingDistanceKm: 0,
      vehicleMileageKmPerLitre: defaultPrefs.vehicleMileageKmPerLitre,
      fuelPricePerLitreInr: defaultPrefs.fuelPricePerLitreInr,
      estimatedTotalLitres: 0,
      estimatedRemainingLitres: 0,
      estimatedTotalFuelCostInr: 0,
      estimatedRemainingFuelCostInr: 0,
      pricingModel: 'fuel_mileage',
      isEstimate: true,
      transportNote: 'Add your custom stops to calculate road distance, fuel consumption, or bus/cab maximum charge.',
    },
    warnings: [],
    generationSource: 'deterministic_planner',
    assumptions: [
      'Clean starter itinerary without pre-suggested stops.',
      'Emergency reserve and return transport commitment are strictly protected.',
    ],
    aiSummary: 'Welcome to Yaatra Fit AI in Karnataka! Add stops from our 31-district catalog or interactive map with complete control.',
  };
}

export function loadStoredTripsAndWallet(): {
  trips: Trip[];
  activeTripId: string;
  wallet: WalletState;
  storageNotice?: string;
} {
  try {
    const rawTrips = localStorage.getItem(STORAGE_KEY_TRIPS);
    const rawActiveId = localStorage.getItem(STORAGE_KEY_ACTIVE_TRIP_ID);
    const rawWallet = localStorage.getItem(STORAGE_KEY_WALLET);

    let trips: Trip[] = [];
    if (rawTrips) {
      const parsed = JSON.parse(rawTrips);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].id && Array.isArray(parsed[0].stops)) {
        trips = parsed;
      }
    }

    if (trips.length === 0) {
      trips = [createCleanStarterTrip()];
    }

    const activeTripId =
      rawActiveId && trips.some((t) => t.id === rawActiveId)
        ? rawActiveId
        : trips[0].id;

    let wallet: WalletState | null = null;
    if (rawWallet) {
      const parsedWallet = JSON.parse(rawWallet);
      if (
        parsedWallet &&
        parsedWallet.version === 1 &&
        Array.isArray(parsedWallet.transactions)
      ) {
        // Strip any legacy demo seed top-up so wallet defaults to zero
        const sanitizedTx = parsedWallet.transactions.filter(
          (tx: Transaction) => tx.id !== 'tx-demo-seed-topup'
        );
        wallet = {
          ...parsedWallet,
          transactions: sanitizedTx,
        };
      }
    }

    if (!wallet) {
      wallet = getDefaultWalletState(activeTripId);
    }

    return { trips, activeTripId, wallet };
  } catch (err) {
    console.warn('Corrupted localStorage detected, restoring clean defaults:', err);
    const fallbackTrip = createCleanStarterTrip();
    const fallbackWallet = getDefaultWalletState(fallbackTrip.id);
    return {
      trips: [fallbackTrip],
      activeTripId: fallbackTrip.id,
      wallet: fallbackWallet,
      storageNotice:
        'Stored session data was invalid or unreadable. Restored clean default state.',
    };
  }
}

export function saveTripsToStorage(trips: Trip[], activeTripId: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_TRIPS, JSON.stringify(trips));
    localStorage.setItem(STORAGE_KEY_ACTIVE_TRIP_ID, activeTripId);
  } catch (err) {
    console.warn('Unable to persist trips to localStorage:', err);
  }
}

export function saveWalletToStorage(wallet: WalletState): void {
  try {
    localStorage.setItem(STORAGE_KEY_WALLET, JSON.stringify(wallet));
  } catch (err) {
    console.warn('Unable to persist wallet to localStorage:', err);
  }
}

export function clearAllDemoStorage(): {
  trips: Trip[];
  activeTripId: string;
  wallet: WalletState;
} {
  try {
    localStorage.removeItem(STORAGE_KEY_TRIPS);
    localStorage.removeItem(STORAGE_KEY_ACTIVE_TRIP_ID);
    localStorage.removeItem(STORAGE_KEY_WALLET);
    localStorage.removeItem('yaatra_fit_ai_trips_v2');
    localStorage.removeItem('yaatra_fit_ai_active_trip_v2');
    localStorage.removeItem('yaatra_fit_ai_wallet_v2');
  } catch {
    // ignore
  }
  const freshTrip = createCleanStarterTrip();
  const freshWallet: WalletState = {
    version: 1,
    transactions: [],
    lastUpdated: new Date().toISOString(),
  };
  saveTripsToStorage([freshTrip], freshTrip.id);
  saveWalletToStorage(freshWallet);
  return {
    trips: [freshTrip],
    activeTripId: freshTrip.id,
    wallet: freshWallet,
  };
}
