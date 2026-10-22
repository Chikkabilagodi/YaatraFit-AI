export type TransportMode =
  | 'motorcycle'
  | 'car'
  | 'public_transport'
  | 'cab'
  | 'walking'
  | 'mixed';

export type TravellerStyle =
  | 'solo'
  | 'couple'
  | 'family'
  | 'friends'
  | 'group'
  | 'senior_friendly';

export type InterestCategory =
  | 'nature'
  | 'waterfalls'
  | 'beaches'
  | 'temples'
  | 'heritage'
  | 'adventure'
  | 'food'
  | 'culture'
  | 'shopping'
  | 'photography';

export type TravelPace = 'relaxed' | 'balanced' | 'maximum';

export type CostVerificationStatus = 'verified' | 'estimated' | 'unverified' | 'free';

export type DataSourceType =
  | 'curated_verified'
  | 'live_places_api'
  | 'live_routes_api'
  | 'ai_estimated'
  | 'user_input';

export type ExpenseCategory =
  | 'Food'
  | 'Fuel and transport'
  | 'Accommodation'
  | 'Entry tickets'
  | 'Activities'
  | 'Shopping'
  | 'Other';

export interface LatLngLiteral {
  lat: number;
  lng: number;
}

export interface Destination {
  id: string;
  name: string;
  nameKn: string;
  district: string;
  coordinates: LatLngLiteral;
  placeId?: string;
  categories: InterestCategory[];
  expectedVisitMinutes: number;
  entryFeeInrPerPerson: number;
  additionalActivityCostPerPerson: number;
  recommendedFoodBudgetPerPerson: number;
  costStatus: CostVerificationStatus;
  openingHoursText: string;
  openingHoursVerified: boolean;
  wheelchairAccessible: 'yes' | 'partial' | 'unknown';
  seniorFriendly: boolean;
  bestForStyles: TravellerStyle[];
  shortDescription: string;
  whyRecommend: string;
  sourceName: string;
  sourceUrl: string;
  lastVerifiedDate: string;
  dataSource: DataSourceType;
  weatherSensitive: boolean;
}

export interface TravellerPreferences {
  startingLocation: string;
  startingCoordinates: LatLngLiteral;
  targetDistrict: string;
  departureDateTime: string; // ISO string
  tripDurationHours: number;
  returnDeadline: string; // ISO string
  plannedBudgetInr: number;
  travellerCount: number;
  transportMode: TransportMode;
  travellerStyle: TravellerStyle;
  interests: InterestCategory[];
  travelPace: TravelPace;
  // Optional inputs
  vehicleMileageKmPerLitre: number;
  fuelPricePerLitreInr: number;
  maxTransportChargeInr?: number;
  foodPreference: 'vegetarian' | 'non_vegetarian' | 'local_udupi_karnataka' | 'any';
  accommodationPreference: 'day_trip_none' | 'budget_homestay' | 'mid_range_hotel' | 'eco_resort';
  accessibilityRequired: boolean;
  mustVisitIds: string[];
  avoidIds: string[];
  emergencyReserveInr: number;
  maxLegTravelMinutes: number;
}

export interface ItineraryStop {
  stopId: string;
  attractionId: string;
  name: string;
  nameKn?: string;
  district: string;
  coordinates: LatLngLiteral;
  placeId?: string;
  suggestedArrivalTime: string; // ISO string
  suggestedDepartureTime: string; // ISO string
  estimatedVisitMinutes: number;
  distanceFromPrevKm: number;
  travelMinutesFromPrev: number;
  routeSource: 'live_routes_api' | 'haversine_estimate';
  trafficAware: boolean;
  entryCostPerPersonInr: number;
  foodAndActivityPerPersonInr: number;
  estimatedStopCostPerPersonInr: number;
  estimatedStopCostGroupInr: number;
  costStatus: CostVerificationStatus;
  recommendationReason: string;
  matchedInterests: InterestCategory[];
  sourceName: string;
  sourceUrl?: string;
  completed: boolean;
  skipped?: boolean;
  isReplacement?: boolean;
  notes?: string;
}

export interface FuelEstimate {
  oneWayDistanceKm: number;
  returnDistanceKm: number;
  totalTripDistanceKm: number;
  completedDistanceKm: number;
  remainingDistanceKm: number;
  vehicleMileageKmPerLitre: number;
  fuelPricePerLitreInr: number;
  estimatedTotalLitres: number;
  estimatedRemainingLitres: number;
  estimatedTotalFuelCostInr: number;
  estimatedRemainingFuelCostInr: number;
  pricingModel?: 'fuel_mileage' | 'max_charge';
  maxChargeTotalInr?: number;
  maxChargePerPersonInr?: number;
  maxRateLabel?: string;
  isEstimate: true;
  transportNote: string;
}

export interface FeasibilityWarning {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  code:
    | 'TIME_OVERRUN'
    | 'EXCESSIVE_DRIVING'
    | 'LOW_WALLET_BALANCE'
    | 'BUDGET_OVERRUN'
    | 'RETURN_FUEL_RISK'
    | 'UNVERIFIED_COSTS'
    | 'SCHEDULE_CONFLICT'
    | 'ACCESSIBILITY_UNKNOWN';
  title: string;
  message: string;
  remediation: string;
}

export interface BudgetSummary {
  // 5 Explicitly Separated Financial Values (Section 11)
  plannedTripBudgetInr: number; // A. Spending limit selected by user
  walletBalanceInr: number; // B. Simulated funds added minus all valid wallet expenses
  remainingPlannedBudgetInr: number; // C. Planned trip budget minus valid trip expenses
  emergencyReserveInr: number; // D. Reserve for unexpected needs / return journey
  estimatedRemainingTripCostInr: number; // E. Projected costs of uncompleted itinerary stops + remaining fuel/return

  // Detailed breakdown
  totalValidTopUpsInr: number;
  totalValidWalletExpensesInr: number;
  validTripExpensesInr: number;
  unrelatedWalletExpensesInr: number;
  projectedFinalSpendingInr: number;
  spendableWithoutTouchingReserveInr: number;
  perPersonPlannedBudgetInr: number;
  perPersonProjectedCostInr: number;
  estimatedFuelCostTotalInr: number;
  estimatedRemainingFuelCostInr: number;
  estimatedReturnJourneyFuelCostInr: number;
  estimatedFoodAndActivitiesRemainingInr: number;
  estimatedAccommodationCostInr: number;
  isWithinPlannedBudget: boolean;
  isWalletSufficientForRemaining: boolean;
  isEmergencyReserveIntact: boolean;
}

export interface Trip {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  preferences: TravellerPreferences;
  stops: ItineraryStop[];
  fuelEstimate: FuelEstimate;
  warnings: FeasibilityWarning[];
  assumptions: string[];
  aiSummary?: string;
  generationSource: 'gemini_ai' | 'deterministic_planner';
}

export interface Transaction {
  id: string;
  type: 'top_up' | 'expense';
  amountInr: number; // Positive integer rupees
  category?: ExpenseCategory;
  description: string;
  timestamp: string;
  tripId?: string;
  stopId?: string;
  isTripExpense: boolean; // Distinguishes trip expenses from unrelated wallet expenses
  undone: boolean;
  undoneAt?: string;
}

export interface WalletState {
  version: number;
  transactions: Transaction[];
  lastUpdated: string;
}

export interface SpendingRecommendation {
  id: string;
  title: string;
  category: ExpenseCategory;
  recommendationType: 'food' | 'attraction' | 'activity' | 'skip_warning' | 'transport_saving';
  whySuitable: string;
  estimatedCostPerPersonInr: number;
  estimatedCostGroupInr: number;
  costVerified: boolean;
  distanceKm: number;
  travelDurationMinutes: number;
  activityDurationMinutes: number;
  walletBalanceAfterInr: number;
  remainingPlannedBudgetAfterInr: number;
  preservesEmergencyReserve: boolean;
  uncertaintyNote: string;
  sourceLabel: DataSourceType;
}

export type RecoveryTriggerReason =
  | 'lost_time'
  | 'overspent'
  | 'wallet_decreased'
  | 'attraction_unavailable'
  | 'vehicle_changed'
  | 'bad_weather'
  | 'destination_modified'
  | 'group_preferences_changed';

export interface RecoveryInput {
  reason: RecoveryTriggerReason;
  lostMinutes: number;
  extraSpentInr: number;
  unavailableStopIds: string[];
  newTransportMode?: TransportMode;
  weatherCondition: 'clear' | 'heavy_rain' | 'extreme_heat';
  updatedInterests?: InterestCategory[];
}

export interface RecoveryProposal {
  id: string;
  createdAt: string;
  trigger: RecoveryInput;
  retainedStops: ItineraryStop[];
  completedStops: ItineraryStop[];
  skippedStops: ItineraryStop[];
  replacementStops: ItineraryStop[];
  revisedStops: ItineraryStop[];
  originalEstimatedTotalCostInr: number;
  revisedEstimatedRemainingCostInr: number;
  revisedProjectedFinalSpendingInr: number;
  remainingPlannedBudgetInr: number;
  walletBalanceInr: number;
  originalDurationMinutes: number;
  revisedRemainingMinutes: number;
  availableRemainingMinutes: number;
   revisedFuelEstimate: FuelEstimate;
  warnings: FeasibilityWarning[];
  explanationSummary: string;
  changeLog: string[];
  assumptions: string[];
  isFeasible: boolean;
  generationSource: 'gemini_ai' | 'deterministic_recovery';
}

export type WhatIfScenarioType =
  | 'spend_300'
  | 'spend_500'
  | 'lose_30m'
  | 'lose_60m'
  | 'lose_120m'
  | 'add_destination'
  | 'remove_destination'
  | 'change_vehicle'
  | 'expensive_activity'
  | 'reduce_budget';

export interface WhatIfScenarioInput {
  type: WhatIfScenarioType;
  label: string;
  extraSpendInr?: number;
  lostMinutes?: number;
  targetDestinationId?: string;
  targetStopIdToRemove?: string;
  newTransportMode?: TransportMode;
  budgetReductionInr?: number;
}

export interface WhatIfComparisonResult {
  scenario: WhatIfScenarioInput;
  current: {
    projectedTotalSpendingInr: number;
    walletBalanceInr: number;
    remainingPlannedBudgetInr: number;
    fuelCostInr: number;
    totalTravelMinutes: number;
    totalVisitMinutes: number;
    destinationCount: number;
    meetsReturnDeadline: boolean;
    preservesReserve: boolean;
  };
  simulated: {
    projectedTotalSpendingInr: number;
    walletBalanceInr: number;
    remainingPlannedBudgetInr: number;
    fuelCostInr: number;
    totalTravelMinutes: number;
    totalVisitMinutes: number;
    destinationCount: number;
    meetsReturnDeadline: boolean;
    preservesReserve: boolean;
    stops: ItineraryStop[];
  };
  destinationsGained: string[];
  destinationsLost: string[];
  feasibilityVerdict: 'feasible' | 'tight_warning' | 'infeasible';
  summaryExplanation: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

export interface ChatRequestPayload {
  messages: Array<{ role: 'user' | 'model'; text: string }>;
  context?: {
    district?: string;
    tripTitle?: string;
    plannedBudgetInr?: number;
    walletBalanceInr?: number;
    emergencyReserveInr?: number;
    transportMode?: string;
    stops?: Array<{ name: string; completed?: boolean }>;
  };
}

