import React, { useState } from 'react';
import {
  AlertCircle,
  Check,
  Compass,
  Fuel,
  Loader2,
  MapPin,
  Sparkles,
  Users,
} from 'lucide-react';
import type {
  InterestCategory,
  Transaction,
  TransportMode,
  TravellerPreferences,
  TravellerStyle,
  TravelPace,
  Trip,
} from '../types/travel.ts';
import {
  KARNATAKA_DESTINATIONS,
  KARNATAKA_DISTRICTS,
  KARNATAKA_STARTING_HUBS,
} from '../data/karnatakaDestinations.ts';
import {
  buildDeterministicItinerary,
  calculateMaxTransportCharge,
  estimateRoadDistanceKm,
  isMileageBasedTransport,
} from '../utils/finance.ts';

interface TripPlannerViewProps {
  currentPreferences: TravellerPreferences;
  transactions: Transaction[];
  onTripCreated: (trip: Trip) => void;
}

const ALL_INTERESTS: { id: InterestCategory; label: string }[] = [
  { id: 'nature', label: 'Nature & Hills' },
  { id: 'waterfalls', label: 'Waterfalls' },
  { id: 'beaches', label: 'Beaches' },
  { id: 'temples', label: 'Temples' },
  { id: 'heritage', label: 'Heritage & Forts' },
  { id: 'adventure', label: 'Adventure' },
  { id: 'food', label: 'Local Food' },
  { id: 'culture', label: 'Culture' },
  { id: 'shopping', label: 'Silk & Spices' },
  { id: 'photography', label: 'Photography' },
];

export const TripPlannerView: React.FC<TripPlannerViewProps> = ({
  currentPreferences,
  transactions,
  onTripCreated,
}) => {
  const [prefs, setPrefs] = useState<TravellerPreferences>(currentPreferences);
  const [showOptional, setShowOptional] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const districtAttractions = KARNATAKA_DESTINATIONS.filter(
    (d) => d.district.toLowerCase() === prefs.targetDistrict.toLowerCase()
  );

  // Estimate round-trip distance from selected hub to target district for Max Bus / Cab Charge calculation
  const selectedDistrictInfo = KARNATAKA_DISTRICTS.find(
    (d) => d.id.toLowerCase() === prefs.targetDistrict.toLowerCase()
  );
  const estimatedRoundTripKm = selectedDistrictInfo
    ? Math.max(
        45,
        Math.round(
          (estimateRoadDistanceKm(
            prefs.startingCoordinates,
            selectedDistrictInfo.center
          ) *
            2 +
            35) *
            10
        ) / 10
      )
    : 85;

  const isPersonalVehicle = isMileageBasedTransport(prefs.transportMode);
  const defaultMaxChargeInfo = calculateMaxTransportCharge(
    estimatedRoundTripKm,
    prefs.transportMode,
    prefs.travellerCount
  );
  const activeMaxChargeInfo = calculateMaxTransportCharge(
    estimatedRoundTripKm,
    prefs.transportMode,
    prefs.travellerCount,
    prefs.maxTransportChargeInr
  );

  const handleHubChange = (hubName: string) => {
    const coords = KARNATAKA_STARTING_HUBS[hubName] || {
      lat: 12.9716,
      lng: 77.5946,
    };
    setPrefs((prev) => ({
      ...prev,
      startingLocation: hubName,
      startingCoordinates: coords,
    }));
  };

  const handleDistrictChange = (districtId: string) => {
    setPrefs((prev) => ({
      ...prev,
      targetDistrict: districtId,
      mustVisitIds: [],
      avoidIds: [],
    }));
  };

  const toggleInterest = (interest: InterestCategory) => {
    setPrefs((prev) => {
      const exists = prev.interests.includes(interest);
      const next = exists
        ? prev.interests.filter((i) => i !== interest)
        : [...prev.interests, interest];
      return { ...prev, interests: next };
    });
  };

  const toggleMustVisit = (destId: string) => {
    setPrefs((prev) => {
      const exists = prev.mustVisitIds.includes(destId);
      const nextMust = exists
        ? prev.mustVisitIds.filter((id) => id !== destId)
        : [...prev.mustVisitIds, destId];
      const nextAvoid = prev.avoidIds.filter((id) => id !== destId);
      return { ...prev, mustVisitIds: nextMust, avoidIds: nextAvoid };
    });
  };

  const toggleAvoid = (destId: string) => {
    setPrefs((prev) => {
      const exists = prev.avoidIds.includes(destId);
      const nextAvoid = exists
        ? prev.avoidIds.filter((id) => id !== destId)
        : [...prev.avoidIds, destId];
      const nextMust = prev.mustVisitIds.filter((id) => id !== destId);
      return { ...prev, avoidIds: nextAvoid, mustVisitIds: nextMust };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setStatusMessage(null);

    if (!prefs.startingLocation.trim()) {
      setValidationError('Please select or enter a valid starting location.');
      return;
    }
    if (!Number.isFinite(prefs.plannedBudgetInr) || prefs.plannedBudgetInr < 200) {
      setValidationError('Total planned budget must be at least ₹200.');
      return;
    }
    if (!Number.isFinite(prefs.travellerCount) || prefs.travellerCount < 1 || prefs.travellerCount > 50) {
      setValidationError('Number of travellers must be between 1 and 50.');
      return;
    }
    if (!Number.isFinite(prefs.tripDurationHours) || prefs.tripDurationHours < 2 || prefs.tripDurationHours > 168) {
      setValidationError('Available trip duration must be between 2 and 168 hours.');
      return;
    }
    if (prefs.interests.length === 0) {
      setValidationError('Please select at least one travel interest.');
      return;
    }
    if (
      isPersonalVehicle &&
      (prefs.vehicleMileageKmPerLitre <= 0 || prefs.fuelPricePerLitreInr <= 0)
    ) {
      setValidationError('Vehicle mileage and fuel price must be positive numbers.');
      return;
    }
    if (
      !isPersonalVehicle &&
      prefs.transportMode !== 'walking' &&
      prefs.maxTransportChargeInr !== undefined &&
      prefs.maxTransportChargeInr <= 0
    ) {
      setValidationError('Maximum charge for Bus / Cab must be greater than ₹0.');
      return;
    }
    if (prefs.emergencyReserveInr < 0 || prefs.emergencyReserveInr >= prefs.plannedBudgetInr) {
      setValidationError(
        'Emergency reserve must be ₹0 or greater and less than the total planned budget.'
      );
      return;
    }

    // Sync returnDeadline with departureDateTime + tripDurationHours
    const depMs = new Date(prefs.departureDateTime).getTime();
    const validDepMs = Number.isFinite(depMs) ? depMs : Date.now();
    const computedDeadline = new Date(
      validDepMs + prefs.tripDurationHours * 3600_000
    ).toISOString();

    const finalPrefs: TravellerPreferences = {
      ...prefs,
      returnDeadline: computedDeadline,
      vehicleMileageKmPerLitre: isPersonalVehicle ? prefs.vehicleMileageKmPerLitre : 0,
      fuelPricePerLitreInr: isPersonalVehicle ? prefs.fuelPricePerLitreInr : 0,
      maxTransportChargeInr:
        isPersonalVehicle || prefs.transportMode === 'walking'
          ? undefined
          : (prefs.maxTransportChargeInr ?? defaultMaxChargeInfo.maxChargeTotalInr),
    };

    setIsGenerating(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);
    try {
      const response = await fetch('/api/ai/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          preferences: finalPrefs,
          transactions,
        }),
      });
      clearTimeout(timeoutId);
      if (response.ok) {
        const data = await response.json();
        if (data.trip) {
          onTripCreated(data.trip);
          return;
        }
      }
      // Fallback to deterministic planner if API returns error
      const fallbackTrip = buildDeterministicItinerary(finalPrefs, transactions);
      onTripCreated(fallbackTrip);
    } catch {
      clearTimeout(timeoutId);
      const fallbackTrip = buildDeterministicItinerary(finalPrefs, transactions);
      onTripCreated(fallbackTrip);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="border-b border-slate-800 pb-5 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Plan a Karnataka Trip
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {isPersonalVehicle
              ? 'Configure your origin, target Karnataka district, budget ceiling, vehicle mileage, and group profile.'
              : 'Configure your origin, target Karnataka district, budget ceiling, maximum bus/cab charge, and group profile.'}
          </p>
        </div>
        <div className="text-xs text-slate-400 font-mono tabular-nums">
          Curated Verified Data · Google Routes Ready · Deterministic Budget Guardrails
        </div>
      </div>

      {validationError && (
        <div
          role="alert"
          className="p-4 rounded-xl border border-rose-800 bg-rose-950/40 text-rose-200 text-xs flex items-center gap-2.5"
        >
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {statusMessage && (
        <div className="p-4 rounded-xl border border-emerald-800 bg-emerald-950/30 text-emerald-200 text-xs">
          {statusMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Step 1: Route & Timing */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-5">
          <h2 className="text-base font-semibold text-white">
            01. Origin, Destination District & Schedule (Required)
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <div>
              <label
                htmlFor="starting-location-select"
                className="block text-xs font-medium text-slate-300 mb-1.5"
              >
                1. Starting Location Hub
              </label>
              <select
                id="starting-location-select"
                value={prefs.startingLocation}
                onChange={(e) => handleHubChange(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-amber-400 focus:outline-none"
              >
                {Object.keys(KARNATAKA_STARTING_HUBS).map((hub) => (
                  <option key={hub} value={hub}>
                    {hub}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="target-district-select"
                className="block text-xs font-medium text-slate-300 mb-1.5"
              >
                2. Target Karnataka District
              </label>
              <select
                id="target-district-select"
                value={prefs.targetDistrict}
                onChange={(e) => handleDistrictChange(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-amber-400 focus:outline-none"
              >
                {KARNATAKA_DISTRICTS.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.nameKn})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="departure-datetime-input"
                className="block text-xs font-medium text-slate-300 mb-1.5"
              >
                3. Departure Date & Time
              </label>
              <input
                id="departure-datetime-input"
                type="datetime-local"
                value={prefs.departureDateTime.slice(0, 16)}
                onChange={(e) =>
                  setPrefs((prev) => ({
                    ...prev,
                    departureDateTime: new Date(e.target.value).toISOString(),
                  }))
                }
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white font-mono tabular-nums focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="trip-duration-input"
                className="block text-xs font-medium text-slate-300 mb-1.5"
              >
                4. Trip Window (Hours until Return)
              </label>
              <input
                id="trip-duration-input"
                type="number"
                min={2}
                max={168}
                value={prefs.tripDurationHours}
                onChange={(e) =>
                  setPrefs((prev) => ({
                    ...prev,
                    tripDurationHours: Number(e.target.value),
                  }))
                }
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white font-mono tabular-nums focus:border-amber-400 focus:outline-none"
              />
            </div>
          </div>
        </section>

        {/* Step 2: Budget, Group & Transport */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-5">
          <h2 className="text-base font-semibold text-white">
            02. Budget Ceiling, Travellers & Transport Mode (Required)
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
            <div>
              <label
                htmlFor="planned-budget-input"
                className="block text-xs font-medium text-slate-300 mb-1.5"
              >
                5. Total Planned Budget (INR ₹)
              </label>
              <input
                id="planned-budget-input"
                type="number"
                min={200}
                step={50}
                value={prefs.plannedBudgetInr}
                onChange={(e) =>
                  setPrefs((prev) => ({
                    ...prev,
                    plannedBudgetInr: Number(e.target.value),
                  }))
                }
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white font-mono tabular-nums focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="traveller-count-input"
                className="block text-xs font-medium text-slate-300 mb-1.5"
              >
                6. Number of Travellers
              </label>
              <input
                id="traveller-count-input"
                type="number"
                min={1}
                max={50}
                value={prefs.travellerCount}
                onChange={(e) =>
                  setPrefs((prev) => ({
                    ...prev,
                    travellerCount: Number(e.target.value),
                  }))
                }
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white font-mono tabular-nums focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="transport-mode-select"
                className="block text-xs font-medium text-slate-300 mb-1.5"
              >
                7. Travel Mode
              </label>
              <select
                id="transport-mode-select"
                value={prefs.transportMode}
                onChange={(e) => {
                  const mode = e.target.value as TransportMode;
                  const suggestedMax = calculateMaxTransportCharge(
                    estimatedRoundTripKm,
                    mode,
                    prefs.travellerCount
                  ).maxChargeTotalInr;
                  setPrefs((prev) => ({
                    ...prev,
                    transportMode: mode,
                    vehicleMileageKmPerLitre:
                      mode === 'motorcycle'
                        ? 42
                        : mode === 'car'
                        ? 16
                        : 0,
                    maxTransportChargeInr: isMileageBasedTransport(mode)
                      ? undefined
                      : suggestedMax,
                  }));
                }}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-amber-400 focus:outline-none"
              >
                <option value="motorcycle">Motorcycle / Scooter (Two-Wheeler)</option>
                <option value="car">Car / SUV (Own Vehicle)</option>
                <option value="public_transport">Bus (KSRTC / Public Transport)</option>
                <option value="cab">Cab / Hired Taxi</option>
                <option value="mixed">Mixed (Bus + Local Auto/Cab)</option>
                <option value="walking">Walking / Heritage Trail</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="traveller-style-select"
                className="block text-xs font-medium text-slate-300 mb-1.5"
              >
                8. Traveller Profile
              </label>
              <select
                id="traveller-style-select"
                value={prefs.travellerStyle}
                onChange={(e) =>
                  setPrefs((prev) => ({
                    ...prev,
                    travellerStyle: e.target.value as TravellerStyle,
                    accessibilityRequired:
                      e.target.value === 'senior_friendly'
                        ? true
                        : prev.accessibilityRequired,
                  }))
                }
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-amber-400 focus:outline-none"
              >
                <option value="solo">Solo Traveller</option>
                <option value="couple">Couple</option>
                <option value="family">Family with Children</option>
                <option value="friends">Group of Friends</option>
                <option value="group">Larger Travel Group</option>
                <option value="senior_friendly">Senior-Friendly & Accessible</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="travel-pace-select"
                className="block text-xs font-medium text-slate-300 mb-1.5"
              >
                10. Travel Pace
              </label>
              <select
                id="travel-pace-select"
                value={prefs.travelPace}
                onChange={(e) =>
                  setPrefs((prev) => ({
                    ...prev,
                    travelPace: e.target.value as TravelPace,
                  }))
                }
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-amber-400 focus:outline-none"
              >
                <option value="relaxed">Relaxed (2 stops, longer visits)</option>
                <option value="balanced">Balanced (3 stops, comfortable)</option>
                <option value="maximum">Maximum Sightseeing (up to 4 stops)</option>
              </select>
            </div>
          </div>

          {/* 9. Interests */}
          <div className="pt-2">
            <span className="block text-xs font-medium text-slate-300 mb-2">
              9. Select Interests (Click to toggle)
            </span>
            <div className="flex flex-wrap gap-2">
              {ALL_INTERESTS.map((item) => {
                const active = prefs.interests.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleInterest(item.id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      active
                        ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Step 3: Transport Pricing (Fuel Mileage OR Bus/Cab Max Charge), Emergency Reserve & Attractions */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-white">
                {isPersonalVehicle
                  ? '03. Vehicle Mileage, Fuel Price, Emergency Reserve & Filters (Optional)'
                  : prefs.transportMode === 'walking'
                  ? '03. Walking Mode, Emergency Reserve & Attraction Filters'
                  : `03. Maximum ${
                      prefs.transportMode === 'public_transport'
                        ? 'Bus'
                        : prefs.transportMode === 'cab'
                        ? 'Cab'
                        : 'Bus + Cab'
                    } Charge, Emergency Reserve & Attraction Filters`}
              </h2>
              <p className="text-xs text-slate-400">
                {isPersonalVehicle
                  ? 'Sensible Karnataka mileage and fuel defaults are pre-filled; customize as needed.'
                  : 'Vehicle mileage is not used for Bus or Cab—showing the maximum transport charge for your route instead.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowOptional(!showOptional)}
              className="text-xs font-medium text-amber-400 hover:text-amber-300 whitespace-nowrap shrink-0 cursor-pointer"
            >
              {showOptional ? 'Hide Optional Settings' : 'Show Optional Settings'}
            </button>
          </div>

          {showOptional && (
            <div className="space-y-6 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {isPersonalVehicle ? (
                  <>
                    <div>
                      <label
                        htmlFor="mileage-input"
                        className="block text-xs font-medium text-slate-300 mb-1.5"
                      >
                        Vehicle Mileage (km / litre)
                      </label>
                      <input
                        id="mileage-input"
                        type="number"
                        min={1}
                        max={120}
                        value={prefs.vehicleMileageKmPerLitre}
                        onChange={(e) =>
                          setPrefs((prev) => ({
                            ...prev,
                            vehicleMileageKmPerLitre: Number(e.target.value),
                          }))
                        }
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white font-mono tabular-nums focus:border-amber-400 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="fuel-price-input"
                        className="block text-xs font-medium text-slate-300 mb-1.5"
                      >
                        Fuel Price per Litre (INR ₹)
                      </label>
                      <input
                        id="fuel-price-input"
                        type="number"
                        min={50}
                        max={200}
                        value={prefs.fuelPricePerLitreInr}
                        onChange={(e) =>
                          setPrefs((prev) => ({
                            ...prev,
                            fuelPricePerLitreInr: Number(e.target.value),
                          }))
                        }
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white font-mono tabular-nums focus:border-amber-400 focus:outline-none"
                      />
                    </div>
                  </>
                ) : prefs.transportMode === 'walking' ? (
                  <div className="sm:col-span-2 p-3.5 rounded-lg border border-slate-800 bg-slate-950/70 flex flex-col justify-center">
                    <div className="text-xs text-slate-400">
                      Walking Mode Selected
                    </div>
                    <div className="text-sm font-semibold text-emerald-400 font-mono tabular-nums mt-0.5">
                      Maximum Transport Charge: ₹0 (No Vehicle Mileage)
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <label
                        htmlFor="max-transport-charge-input"
                        className="block text-xs font-medium text-amber-300 mb-1.5"
                      >
                        Maximum{' '}
                        {prefs.transportMode === 'public_transport'
                          ? 'Bus'
                          : prefs.transportMode === 'cab'
                          ? 'Cab'
                          : 'Bus + Cab'}{' '}
                        Charge (INR ₹)
                      </label>
                      <input
                        id="max-transport-charge-input"
                        type="number"
                        min={50}
                        step={50}
                        value={
                          prefs.maxTransportChargeInr ??
                          defaultMaxChargeInfo.maxChargeTotalInr
                        }
                        onChange={(e) =>
                          setPrefs((prev) => ({
                            ...prev,
                            maxTransportChargeInr: Number(e.target.value),
                          }))
                        }
                        className="w-full rounded-lg border border-amber-500/50 bg-slate-950 px-3 py-2 text-sm text-white font-mono tabular-nums focus:border-amber-400 focus:outline-none"
                      />
                      <div className="text-xs text-slate-400 mt-1 flex items-center justify-between">
                        <span>
                          Suggested max: ₹
                          {defaultMaxChargeInfo.maxChargeTotalInr.toLocaleString(
                            'en-IN'
                          )}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setPrefs((prev) => ({
                              ...prev,
                              maxTransportChargeInr:
                                defaultMaxChargeInfo.maxChargeTotalInr,
                            }))
                          }
                          className="text-amber-400 hover:underline cursor-pointer"
                        >
                          Use Suggested
                        </button>
                      </div>
                    </div>

                    <div
                      data-testid="max-transport-charge-summary"
                      className="p-3.5 rounded-lg border border-emerald-800/60 bg-emerald-950/20 flex flex-col justify-center"
                    >
                      <div className="text-xs text-emerald-300 font-medium">
                        {activeMaxChargeInfo.maxRateLabel}
                      </div>
                      <div className="text-base font-bold text-white font-mono tabular-nums mt-0.5">
                        Max ₹
                        {activeMaxChargeInfo.maxChargeTotalInr.toLocaleString(
                          'en-IN'
                        )}{' '}
                        group (₹
                        {activeMaxChargeInfo.maxChargePerPersonInr.toLocaleString(
                          'en-IN'
                        )}
                        /person)
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        Est. ~{estimatedRoundTripKm} km round-trip · No vehicle mileage needed
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label
                    htmlFor="emergency-reserve-input"
                    className="block text-xs font-medium text-slate-300 mb-1.5"
                  >
                    Desired Emergency Reserve (INR ₹)
                  </label>
                  <input
                    id="emergency-reserve-input"
                    type="number"
                    min={0}
                    step={50}
                    value={prefs.emergencyReserveInr}
                    onChange={(e) =>
                      setPrefs((prev) => ({
                        ...prev,
                        emergencyReserveInr: Number(e.target.value),
                      }))
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white font-mono tabular-nums focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="max-leg-minutes-input"
                    className="block text-xs font-medium text-slate-300 mb-1.5"
                  >
                    Max Preferred Transit Between Stops (mins)
                  </label>
                  <input
                    id="max-leg-minutes-input"
                    type="number"
                    min={20}
                    max={300}
                    value={prefs.maxLegTravelMinutes}
                    onChange={(e) =>
                      setPrefs((prev) => ({
                        ...prev,
                        maxLegTravelMinutes: Number(e.target.value),
                      }))
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white font-mono tabular-nums focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div>
                  <label
                    htmlFor="food-pref-select"
                    className="block text-xs font-medium text-slate-300 mb-1.5"
                  >
                    Food Preference
                  </label>
                  <select
                    id="food-pref-select"
                    value={prefs.foodPreference}
                    onChange={(e) =>
                      setPrefs((prev) => ({
                        ...prev,
                        foodPreference: e.target
                          .value as TravellerPreferences['foodPreference'],
                      }))
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-amber-400 focus:outline-none"
                  >
                    <option value="local_udupi_karnataka">
                      Authentic Karnataka / Udupi Tiffin & Thali
                    </option>
                    <option value="vegetarian">Pure Vegetarian</option>
                    <option value="non_vegetarian">
                      Coastal / Kodava Non-Veg & Local
                    </option>
                    <option value="any">Flexible / Any Cuisine</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="accommodation-pref-select"
                    className="block text-xs font-medium text-slate-300 mb-1.5"
                  >
                    Accommodation Preference
                  </label>
                  <select
                    id="accommodation-pref-select"
                    value={prefs.accommodationPreference}
                    onChange={(e) =>
                      setPrefs((prev) => ({
                        ...prev,
                        accommodationPreference: e.target
                          .value as TravellerPreferences['accommodationPreference'],
                      }))
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-amber-400 focus:outline-none"
                  >
                    <option value="day_trip_none">Same-Day Return (No Stay)</option>
                    <option value="budget_homestay">
                      Budget Homestay / KSTDC (~₹750/person)
                    </option>
                    <option value="mid_range_hotel">
                      Mid-Range Hotel (~₹1,600/person)
                    </option>
                    <option value="eco_resort">
                      Coffee Estate / Jungle Resort (~₹3,200/person)
                    </option>
                  </select>
                </div>

                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2.5 text-xs text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={prefs.accessibilityRequired}
                      onChange={(e) =>
                        setPrefs((prev) => ({
                          ...prev,
                          accessibilityRequired: e.target.checked,
                        }))
                      }
                      className="rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-amber-400"
                    />
                    <span>
                      Prioritize step-free / senior-accessible attractions
                    </span>
                  </label>
                </div>
              </div>

              {/* Must-Visit & Avoid Selector for Target District */}
              {districtAttractions.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-800/80">
                  <div className="text-xs font-medium text-slate-300">
                    Curated Attractions in {prefs.targetDistrict} — Mark Must-Visit or Avoid:
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {districtAttractions.map((dest) => {
                      const isMust = prefs.mustVisitIds.includes(dest.id);
                      const isAvoid = prefs.avoidIds.includes(dest.id);
                      return (
                        <div
                          key={dest.id}
                          className="p-3 rounded-lg border border-slate-800 bg-slate-950/60 flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-white truncate">
                              {dest.name}
                            </div>
                            <div className="text-xs text-slate-400 font-mono tabular-nums">
                              Entry: ₹{dest.entryFeeInrPerPerson} ({dest.costStatus}) ·{' '}
                              {dest.expectedVisitMinutes} mins
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => toggleMustVisit(dest.id)}
                              className={`px-2.5 py-1 text-xs font-medium rounded border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                                isMust
                                  ? 'bg-emerald-600/30 border-emerald-500 text-emerald-200'
                                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                              }`}
                            >
                              Must Visit
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleAvoid(dest.id)}
                              className={`px-2.5 py-1 text-xs font-medium rounded border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                                isAvoid
                                  ? 'bg-rose-600/30 border-rose-500 text-rose-200'
                                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                              }`}
                            >
                              Avoid
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        <div className="flex items-center justify-end gap-4">
          <button
            type="submit"
            disabled={isGenerating}
            className="px-6 py-3 text-sm font-semibold bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Calculating Feasible Karnataka Itinerary...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate Feasible Itinerary</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
