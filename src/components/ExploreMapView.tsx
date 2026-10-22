// Source: Google Maps Platform Code Assist
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  APIProvider,
  AdvancedMarker,
  InfoWindow,
  Map,
  Pin,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import {
  AlertTriangle,
  Compass,
  ExternalLink,
  Loader2,
  MapPin,
  Navigation,
  Plus,
  Search,
  Trash2,
  Utensils,
} from 'lucide-react';
import type {
  Destination,
  ItineraryStop,
  LatLngLiteral,
  TransportMode,
  Trip,
} from '../types/travel.ts';
import { KARNATAKA_DESTINATIONS } from '../data/karnatakaDestinations.ts';
import { createItineraryStopFromDestination } from '../utils/finance.ts';

interface ExploreMapViewProps {
  trip: Trip;
  onAddStopToTrip: (stop: ItineraryStop) => void;
  onRemoveStopFromTrip: (stopId: string) => void;
  onUpdateLiveRouteMetrics: (
    stopId: string,
    distanceKm: number,
    durationMinutes: number,
    trafficAware: boolean
  ) => void;
}

interface LiveRouteStatus {
  loading: boolean;
  totalDistanceKm: number | null;
  totalDurationMinutes: number | null;
  trafficAware: boolean;
  sourceLabel: string;
  error: string | null;
}

interface NearbyPlaceItem {
  id: string;
  name: string;
  address: string;
  location: LatLngLiteral;
  rating?: number;
  category: 'food' | 'attraction';
}

function mapTransportToRoutesSdkMode(mode: TransportMode): string {
  switch (mode) {
    case 'motorcycle':
      return 'TWO_WHEELER';
    case 'car':
      return 'DRIVING';
    case 'public_transport':
      return 'TRANSIT';
    case 'walking':
      return 'WALKING';
    default:
      return 'DRIVING';
  }
}

function buildGoogleMapsDirectionsUrl(
  origin: LatLngLiteral,
  destination: LatLngLiteral,
  waypoints: LatLngLiteral[],
  mode: TransportMode
): string {
  const travelmode =
    mode === 'motorcycle'
      ? 'two-wheeler'
      : mode === 'walking'
      ? 'walking'
      : mode === 'public_transport'
      ? 'transit'
      : 'driving';
  const wpParam =
    waypoints.length > 0
      ? `&waypoints=${encodeURIComponent(
          waypoints.map((w) => `${w.lat},${w.lng}`).join('|')
        )}`
      : '';
  return `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}${wpParam}&travelmode=${travelmode}`;
}

/**
 * Inner component that uses `useMap()` and `useMapsLibrary('routes')` + `useMapsLibrary('places')`
 */
const LiveRouteAndSearchOverlay: React.FC<{
  trip: Trip;
  selectedStop: ItineraryStop | null;
  onSelectStop: (stop: ItineraryStop | null) => void;
  onAddStopToTrip: (stop: ItineraryStop) => void;
  onUpdateLiveRouteMetrics: (
    stopId: string,
    distanceKm: number,
    durationMinutes: number,
    trafficAware: boolean
  ) => void;
  onRouteStatusChange: (status: LiveRouteStatus) => void;
  nearbyPlaces: NearbyPlaceItem[];
  onNearbyPlacesChange: (places: NearbyPlaceItem[]) => void;
}> = ({
  trip,
  selectedStop,
  onSelectStop,
  onAddStopToTrip,
  onUpdateLiveRouteMetrics,
  onRouteStatusChange,
  nearbyPlaces,
  onNearbyPlacesChange,
}) => {
  const map = useMap();
  const routesLib = useMapsLibrary('routes');
  const placesLib = useMapsLibrary('places');

  const polylinesRef = useRef<google.maps.Polyline[]>([]);
  const sessionTokenRef =
    useRef<google.maps.places.AutocompleteSessionToken | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<
    google.maps.places.AutocompleteSuggestion[]
  >([]);
  const [isSearching, setIsSearching] = useState(false);
  const [nearbyLoading, setNearbyLoading] = useState(false);

  const activeStops = trip.stops.filter((s) => !s.skipped);

  // Compute live route via modern Routes API (`Route.computeRoutes`)
  useEffect(() => {
    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];

    if (!map || !routesLib || activeStops.length === 0) {
      return;
    }

    const origin = trip.preferences.startingCoordinates;
    const finalStop = activeStops[activeStops.length - 1];
    const intermediates = activeStops
      .slice(0, -1)
      .map((s) => ({ location: s.coordinates }));

    const sdkMode = mapTransportToRoutesSdkMode(trip.preferences.transportMode);

    onRouteStatusChange({
      loading: true,
      totalDistanceKm: null,
      totalDurationMinutes: null,
      trafficAware: false,
      sourceLabel: 'Computing via Google Routes API...',
      error: null,
    });

    const computeWithMode = async (travelModeStr: string) => {
      const RouteClass = (routesLib as any).Route;
      if (!RouteClass) {
        throw new Error('Google Routes library Route class unavailable.');
      }

      const request: any = {
        origin,
        destination: finalStop.coordinates,
        intermediates: intermediates.length > 0 ? intermediates : undefined,
        travelMode: travelModeStr,
        fields: ['path', 'distanceMeters', 'durationMillis', 'viewport', 'legs'],
      };

      if (typeof RouteClass.computeRoutes === 'function') {
        return await RouteClass.computeRoutes(request);
      } else {
        const instance = new RouteClass();
        return await instance.computeRoutes(request);
      }
    };

    computeWithMode(sdkMode)
      .catch(async (err: any) => {
        // If TWO_WHEELER is unsupported in region/SDK, fall back to DRIVING
        if (sdkMode === 'TWO_WHEELER') {
          return await computeWithMode('DRIVING');
        }
        throw err;
      })
      .then((res: any) => {
        const primaryRoute = res?.routes?.[0];
        if (!primaryRoute) {
          onRouteStatusChange({
            loading: false,
            totalDistanceKm: trip.fuelEstimate.oneWayDistanceKm,
            totalDurationMinutes: activeStops.reduce(
              (a, s) => a + s.travelMinutesFromPrev,
              0
            ),
            trafficAware: false,
            sourceLabel: 'Standard Haversine Estimate (No live route returned)',
            error: null,
          });
          return;
        }

        if (typeof primaryRoute.createPolylines === 'function') {
          const newPolylines = primaryRoute.createPolylines();
          newPolylines.forEach((polyline: google.maps.Polyline) => {
            polyline.setOptions({
              strokeColor: '#f59e0b',
              strokeOpacity: 0.92,
              strokeWeight: 5,
            });
            polyline.setMap(map);
          });
          polylinesRef.current = newPolylines;
        }

        if (primaryRoute.viewport) {
          map.fitBounds(primaryRoute.viewport);
        }

        const distKm = primaryRoute.distanceMeters
          ? Math.round((primaryRoute.distanceMeters / 1000) * 10) / 10
          : trip.fuelEstimate.oneWayDistanceKm;
        const durMins = primaryRoute.durationMillis
          ? Math.round(primaryRoute.durationMillis / 60000)
          : activeStops.reduce((a, s) => a + s.travelMinutesFromPrev, 0);

        // Update individual stop legs if legs array is present
        if (Array.isArray(primaryRoute.legs)) {
          primaryRoute.legs.forEach((leg: any, idx: number) => {
            const targetStop = activeStops[idx];
            if (targetStop && leg.distanceMeters && leg.durationMillis) {
              onUpdateLiveRouteMetrics(
                targetStop.stopId,
                Math.round((leg.distanceMeters / 1000) * 10) / 10,
                Math.round(leg.durationMillis / 60000),
                true
              );
            }
          });
        }

        onRouteStatusChange({
          loading: false,
          totalDistanceKm: distKm,
          totalDurationMinutes: durMins,
          trafficAware:
            sdkMode === 'DRIVING' || sdkMode === 'TWO_WHEELER',
          sourceLabel:
            sdkMode === 'DRIVING' || sdkMode === 'TWO_WHEELER'
              ? 'Live Google Routes API (Traffic-Aware Estimate)'
              : `Live Google Routes API (${sdkMode} Standard Estimate)`,
          error: null,
        });
      })
      .catch((err: any) => {
        const msg = String(err?.message || err || '');
        if (
          msg.includes('OverQuota') ||
          msg.includes('RESOURCE_EXHAUSTED') ||
          msg.includes('OVER_QUERY_LIMIT') ||
          msg.includes('429')
        ) {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        }
        onRouteStatusChange({
          loading: false,
          totalDistanceKm: trip.fuelEstimate.oneWayDistanceKm,
          totalDurationMinutes: activeStops.reduce(
            (a, s) => a + s.travelMinutesFromPrev,
            0
          ),
          trafficAware: false,
          sourceLabel: 'Fallback Haversine Road Estimate (Routes API unavailable)',
          error: 'Live route computation unavailable; displaying verified coordinate markers and fallback distances.',
        });
      });

    return () => {
      polylinesRef.current.forEach((p) => p.setMap(null));
      polylinesRef.current = [];
    };
  }, [
    map,
    routesLib,
    trip.id,
    trip.preferences.transportMode,
    activeStops.map((s) => s.stopId).join(','),
  ]);

  // Autocomplete search using modern Places API (`AutocompleteSuggestion.fetchAutocompleteSuggestions`)
  useEffect(() => {
    if (!placesLib || !searchQuery.trim() || searchQuery.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const { AutocompleteSessionToken, AutocompleteSuggestion } =
      placesLib as any;
    if (!AutocompleteSuggestion?.fetchAutocompleteSuggestions) {
      return;
    }

    if (!sessionTokenRef.current && AutocompleteSessionToken) {
      sessionTokenRef.current = new AutocompleteSessionToken();
    }

    setIsSearching(true);
    const timer = setTimeout(() => {
      AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: `${searchQuery} Karnataka`,
        sessionToken: sessionTokenRef.current || undefined,
      })
        .then((res: any) => {
          setSuggestions(res?.suggestions || []);
          setIsSearching(false);
        })
        .catch((err: any) => {
          const msg = String(err?.message || err || '');
          if (
            msg.includes('OverQuota') ||
            msg.includes('RESOURCE_EXHAUSTED') ||
            msg.includes('OVER_QUERY_LIMIT') ||
            msg.includes('429')
          ) {
            window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
          }
          setIsSearching(false);
        });
    }, 280);

    return () => clearTimeout(timer);
  }, [placesLib, searchQuery]);

  const handleSelectSuggestion = useCallback(
    async (suggestion: any) => {
      if (!placesLib || !suggestion?.placePrediction) return;
      try {
        const place = suggestion.placePrediction.toPlace();
        await place.fetchFields({
          fields: ['displayName', 'formattedAddress', 'location', 'viewport'],
        });

        const loc = place.location;
        if (!loc) return;
        const coords: LatLngLiteral = {
          lat: typeof loc.lat === 'function' ? loc.lat() : loc.lat,
          lng: typeof loc.lng === 'function' ? loc.lng() : loc.lng,
        };

        if (map && place.viewport) {
          map.fitBounds(place.viewport);
        } else if (map) {
          map.panTo(coords);
          map.setZoom(14);
        }

        const customDest: Destination = {
          id: `places-${Date.now()}`,
          name: place.displayName || suggestion.placePrediction.text?.text || 'Selected Place',
          nameKn: '',
          district: trip.preferences.targetDistrict,
          coordinates: coords,
          categories: ['culture', 'nature'],
          expectedVisitMinutes: 60,
          entryFeeInrPerPerson: 0,
          additionalActivityCostPerPerson: 50,
          recommendedFoodBudgetPerPerson: 120,
          costStatus: 'unverified',
          openingHoursText: 'Hours unverified — check locally',
          openingHoursVerified: false,
          wheelchairAccessible: 'unknown',
          seniorFriendly: true,
          bestForStyles: ['solo', 'couple', 'family', 'friends', 'group'],
          shortDescription: place.formattedAddress || 'Added via Google Places Search',
          whyRecommend: 'User-selected stop from live Google Places API.',
          sourceName: 'Google Places API (Live)',
          sourceUrl: 'https://maps.google.com',
          lastVerifiedDate: 'Live',
          dataSource: 'live_places_api',
          weatherSensitive: false,
        };

        const prevCoord =
          activeStops.length > 0
            ? activeStops[activeStops.length - 1].coordinates
            : trip.preferences.startingCoordinates;

        const { stop } = createItineraryStopFromDestination(
          customDest,
          prevCoord,
          Date.now(),
          trip.preferences
        );
        onAddStopToTrip(stop);
        setSearchQuery('');
        setSuggestions([]);
        sessionTokenRef.current = null;
      } catch (err: any) {
        const msg = String(err?.message || err || '');
        if (
          msg.includes('OverQuota') ||
          msg.includes('RESOURCE_EXHAUSTED') ||
          msg.includes('OVER_QUERY_LIMIT') ||
          msg.includes('429')
        ) {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        }
      }
    },
    [placesLib, map, trip, activeStops, onAddStopToTrip]
  );

  const handleNearbySearch = async (type: 'food' | 'attraction') => {
    if (!placesLib || !(placesLib as any).Place?.searchByText) return;
    setNearbyLoading(true);
    try {
      const anchor =
        selectedStop?.coordinates ||
        activeStops[0]?.coordinates ||
        trip.preferences.startingCoordinates;

      const textQuery =
        type === 'food'
          ? `Affordable Udupi darshini restaurant near ${trip.preferences.targetDistrict} Karnataka`
          : `Top tourist attraction in ${trip.preferences.targetDistrict} Karnataka`;

      const { places } = await (placesLib as any).Place.searchByText({
        textQuery,
        fields: ['displayName', 'formattedAddress', 'location', 'rating'],
        locationBias: {
          center: anchor,
          radius: 15000,
        },
        maxResultCount: 4,
      });

      const mapped: NearbyPlaceItem[] = (places || [])
        .filter((p: any) => p.location)
        .map((p: any, i: number) => ({
          id: `nearby-${type}-${i}-${Date.now()}`,
          name: p.displayName || 'Nearby Place',
          address: p.formattedAddress || trip.preferences.targetDistrict,
          location: {
            lat: typeof p.location.lat === 'function' ? p.location.lat() : p.location.lat,
            lng: typeof p.location.lng === 'function' ? p.location.lng() : p.location.lng,
          },
          rating: p.rating,
          category: type,
        }));

      onNearbyPlacesChange(mapped);
    } catch (err: any) {
      const msg = String(err?.message || err || '');
      if (
        msg.includes('OverQuota') ||
        msg.includes('RESOURCE_EXHAUSTED') ||
        msg.includes('OVER_QUERY_LIMIT') ||
        msg.includes('429')
      ) {
        window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
      }
    } finally {
      setNearbyLoading(false);
    }
  };

  return (
    <div className="absolute top-3 left-3 right-3 z-10 flex flex-col sm:flex-row items-stretch sm:items-start justify-between gap-2 pointer-events-none">
      {/* Search box */}
      <div className="relative w-full sm:max-w-sm pointer-events-auto">
        <div className="flex items-center bg-slate-950/95 border border-slate-700 rounded-lg px-3 py-2 shadow-lg">
          <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Karnataka places to add stop..."
            aria-label="Search Karnataka places via Google Places API"
            className="w-full bg-transparent text-xs text-white placeholder-slate-400 focus:outline-none"
          />
          {isSearching && (
            <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin ml-2 shrink-0" />
          )}
        </div>

        {suggestions.length > 0 && (
          <ul className="mt-1 bg-slate-950/95 border border-slate-700 rounded-lg divide-y divide-slate-800 shadow-xl max-h-56 overflow-y-auto">
            {suggestions.map((sug, idx) => (
              <li key={idx}>
                <button
                  type="button"
                  onClick={() => handleSelectSuggestion(sug)}
                  className="w-full text-left px-3 py-2.5 text-xs text-slate-200 hover:bg-slate-800/80 flex items-center justify-between gap-2 cursor-pointer"
                >
                  <span className="truncate">
                    {(sug as any).placePrediction?.text?.text || 'Place result'}
                  </span>
                  <span className="text-amber-400 font-medium shrink-0">
                    + Add Stop
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Nearby Quick Search Buttons */}
      <div className="flex items-center gap-2 pointer-events-auto">
        <button
          type="button"
          onClick={() => handleNearbySearch('food')}
          disabled={nearbyLoading}
          className="px-3 py-2 text-xs font-medium bg-slate-950/95 hover:bg-slate-900 text-amber-300 border border-slate-700 rounded-lg shadow-lg flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Utensils className="w-3.5 h-3.5" />
          <span>Nearby Food</span>
        </button>
        <button
          type="button"
          onClick={() => handleNearbySearch('attraction')}
          disabled={nearbyLoading}
          className="px-3 py-2 text-xs font-medium bg-slate-950/95 hover:bg-slate-900 text-emerald-300 border border-slate-700 rounded-lg shadow-lg flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Nearby Sights</span>
        </button>
      </div>
    </div>
  );
};

export const ExploreMapView: React.FC<ExploreMapViewProps> = ({
  trip,
  onAddStopToTrip,
  onRemoveStopFromTrip,
  onUpdateLiveRouteMetrics,
}) => {
  const apiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) || '';
  const hasValidApiKey = Boolean(
    apiKey &&
      apiKey !== 'YOUR_GOOGLE_MAPS_API_KEY' &&
      apiKey !== 'MY_GOOGLE_MAPS_API_KEY' &&
      apiKey.trim().length > 10
  );

  const activeStops = trip.stops.filter((s) => !s.skipped);
  const [selectedStop, setSelectedStop] = useState<ItineraryStop | null>(null);
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlaceItem[]>([]);
  const [userGpsLocation, setUserGpsLocation] = useState<LatLngLiteral | null>(
    null
  );
  const [gpsStatus, setGpsStatus] = useState<string | null>(null);

  const [routeStatus, setRouteStatus] = useState<LiveRouteStatus>({
    loading: false,
    totalDistanceKm: trip.fuelEstimate.oneWayDistanceKm,
    totalDurationMinutes: activeStops.reduce(
      (a, s) => a + s.travelMinutesFromPrev,
      0
    ),
    trafficAware: false,
    sourceLabel: 'Standard Road Estimate',
    error: null,
  });

  const unaddedDistrictCurated = KARNATAKA_DESTINATIONS.filter(
    (d) =>
      d.district.toLowerCase() ===
        trip.preferences.targetDistrict.toLowerCase() &&
      !activeStops.some((s) => s.attractionId === d.id)
  );

  const handleRequestGps = () => {
    if (!navigator.geolocation) {
      setGpsStatus('Geolocation API is not supported in this browser.');
      return;
    }
    setGpsStatus('Requesting location permission...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserGpsLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setGpsStatus('Live GPS position acquired with your permission.');
      },
      () => {
        setGpsStatus(
          'Location permission declined or unavailable. Using configured starting hub.'
        );
      },
      { timeout: 8000 }
    );
  };

  const handleAddCuratedDestination = (dest: Destination) => {
    const prevCoord =
      activeStops.length > 0
        ? activeStops[activeStops.length - 1].coordinates
        : trip.preferences.startingCoordinates;
    const { stop } = createItineraryStopFromDestination(
      dest,
      prevCoord,
      Date.now(),
      trip.preferences
    );
    onAddStopToTrip(stop);
  };

  const handleAddNearbyToTrip = (item: NearbyPlaceItem) => {
    const prevCoord =
      activeStops.length > 0
        ? activeStops[activeStops.length - 1].coordinates
        : trip.preferences.startingCoordinates;
    const customDest: Destination = {
      id: item.id,
      name: item.name,
      nameKn: '',
      district: trip.preferences.targetDistrict,
      coordinates: item.location,
      categories: item.category === 'food' ? ['food'] : ['culture'],
      expectedVisitMinutes: 45,
      entryFeeInrPerPerson: 0,
      additionalActivityCostPerPerson: 0,
      recommendedFoodBudgetPerPerson: item.category === 'food' ? 150 : 50,
      costStatus: 'unverified',
      openingHoursText: 'Unverified — check on site',
      openingHoursVerified: false,
      wheelchairAccessible: 'unknown',
      seniorFriendly: true,
      bestForStyles: ['solo', 'couple', 'family', 'friends', 'group'],
      shortDescription: item.address,
      whyRecommend: `Live Google Places ${item.category} result${
        item.rating ? ` (${item.rating}★)` : ''
      }.`,
      sourceName: 'Google Places API (Live)',
      sourceUrl: 'https://maps.google.com',
      lastVerifiedDate: 'Live',
      dataSource: 'live_places_api',
      weatherSensitive: false,
    };
    const { stop } = createItineraryStopFromDestination(
      customDest,
      prevCoord,
      Date.now(),
      trip.preferences
    );
    onAddStopToTrip(stop);
  };

  const fullRouteDirectionsUrl =
    activeStops.length > 0
      ? buildGoogleMapsDirectionsUrl(
          trip.preferences.startingCoordinates,
          activeStops[activeStops.length - 1].coordinates,
          activeStops.slice(0, -1).map((s) => s.coordinates),
          trip.preferences.transportMode
        )
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          trip.preferences.targetDistrict + ' Karnataka'
        )}`;

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="border-b border-white/[0.08] pb-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-mono font-medium tracking-wider uppercase text-amber-400">
            Navigation · Cartography & Live Distance
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-semibold text-white tracking-tight mt-1">
            Explore Map & Live Karnataka Routing
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Interactive Google Maps JS SDK · Places API Search · Routes API{' '}
            {trip.preferences.transportMode === 'motorcycle'
              ? 'Two-Wheeler Motorised'
              : trip.preferences.transportMode}{' '}
            Calculation
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleRequestGps}
            className="px-3.5 py-2 text-xs font-medium bg-[#101726] hover:bg-slate-800 text-slate-200 border border-white/[0.08] rounded-lg transition-all active:scale-[0.98] flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer shadow-sm"
          >
            <Navigation className="w-3.5 h-3.5 text-sky-400" />
            <span>
              {userGpsLocation ? 'GPS Active' : 'Use My Live GPS (Optional)'}
            </span>
          </button>
          <a
            href={fullRouteDirectionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg transition-all active:scale-[0.98] flex items-center gap-1.5 whitespace-nowrap shrink-0 font-display shadow-sm"
          >
            <span>Open Full Route in Google Maps</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {gpsStatus && (
        <div className="text-xs text-slate-300 bg-[#101726] border border-white/[0.08] rounded-lg px-4 py-2.5 shadow-sm">
          {gpsStatus}
        </div>
      )}

      {/* Route Telemetry Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-white/[0.08] bg-[#101726] shadow-sm hover:border-white/20 transition-colors">
          <div className="text-xs text-slate-400 font-medium">One-Way Route Distance</div>
          <div className="text-2xl font-bold text-white font-mono tabular-nums mt-1">
            {routeStatus.totalDistanceKm ?? trip.fuelEstimate.oneWayDistanceKm} km
          </div>
          <div className="text-xs text-slate-400 mt-1">
            + {trip.fuelEstimate.returnDistanceKm} km return leg to{' '}
            {trip.preferences.startingLocation}
          </div>
        </div>

        <div className="p-4 rounded-xl border border-white/[0.08] bg-[#101726] shadow-sm hover:border-amber-500/30 transition-colors">
          <div className="text-xs text-slate-400 font-medium">Estimated Transit Duration</div>
          <div className="text-2xl font-bold text-amber-300 font-mono tabular-nums mt-1">
            {routeStatus.totalDurationMinutes ??
              activeStops.reduce((a, s) => a + s.travelMinutesFromPrev, 0)}{' '}
            mins
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {routeStatus.trafficAware
              ? 'Traffic-Aware Estimate (Live Routes API)'
              : 'Standard Travel Time Estimate'}
          </div>
        </div>

        <div className="p-4 rounded-xl border border-white/[0.08] bg-[#101726] shadow-sm hover:border-emerald-500/30 transition-colors">
          <div className="text-xs text-slate-400 font-medium">Routing Data Source</div>
          <div className="text-sm font-semibold text-emerald-400 mt-1.5 font-mono">
            {routeStatus.sourceLabel}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Mode: {mapTransportToRoutesSdkMode(trip.preferences.transportMode)}
          </div>
        </div>
      </div>

      {/* Main Split: Interactive Map Canvas (Left 7 cols) + Itinerary Stop Inspector (Right 5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
          {hasValidApiKey ? (
            <div
              data-testid="google-map-container"
              className="relative w-full h-[500px]"
            >
              <APIProvider
                apiKey={apiKey}
                libraries={['routes', 'places', 'marker']}
                region="IN"
                language="en"
              >
                <Map
                  mapId="DEMO_MAP_ID"
                  defaultCenter={
                    activeStops[0]?.coordinates ||
                    trip.preferences.startingCoordinates
                  }
                  defaultZoom={11}
                  mapTypeControl={false}
                  streetViewControl={false}
                  gestureHandling="greedy"
                  internalUsageAttributionIds={[
                    'gmp_mcp_codeassist_v1_aistudio',
                  ]}
                  className="w-full h-full"
                >
                  <LiveRouteAndSearchOverlay
                    trip={trip}
                    selectedStop={selectedStop}
                    onSelectStop={setSelectedStop}
                    onAddStopToTrip={onAddStopToTrip}
                    onUpdateLiveRouteMetrics={onUpdateLiveRouteMetrics}
                    onRouteStatusChange={setRouteStatus}
                    nearbyPlaces={nearbyPlaces}
                    onNearbyPlacesChange={setNearbyPlaces}
                  />

                  {/* Origin Marker */}
                  <AdvancedMarker
                    position={trip.preferences.startingCoordinates}
                    title={`Origin: ${trip.preferences.startingLocation}`}
                  >
                    <Pin
                      background="#0ea5e9"
                      borderColor="#0369a1"
                      glyphColor="#ffffff"
                    />
                  </AdvancedMarker>

                  {/* Optional Live GPS Marker */}
                  {userGpsLocation && (
                    <AdvancedMarker
                      position={userGpsLocation}
                      title="Your Live GPS Position"
                    >
                      <Pin
                        background="#22c55e"
                        borderColor="#15803d"
                        glyphColor="#ffffff"
                      />
                    </AdvancedMarker>
                  )}

                  {/* Active Itinerary Stop Markers */}
                  {activeStops.map((stop, idx) => (
                    <AdvancedMarker
                      key={stop.stopId}
                      position={stop.coordinates}
                      title={`Stop ${idx + 1}: ${stop.name}`}
                      onClick={() => setSelectedStop(stop)}
                    >
                      <Pin
                        background={stop.completed ? '#10b981' : '#f59e0b'}
                        borderColor="#0f172a"
                        glyphColor="#0f172a"
                      />
                    </AdvancedMarker>
                  ))}

                  {/* Nearby Search Result Markers */}
                  {nearbyPlaces.map((np) => (
                    <AdvancedMarker
                      key={np.id}
                      position={np.location}
                      title={`Nearby: ${np.name}`}
                    >
                      <Pin
                        background="#a855f7"
                        borderColor="#581c87"
                        glyphColor="#ffffff"
                        scale={0.85}
                      />
                    </AdvancedMarker>
                  ))}

                  {/* Selected Stop InfoWindow */}
                  {selectedStop && (
                    <InfoWindow
                      position={selectedStop.coordinates}
                      onCloseClick={() => setSelectedStop(null)}
                      maxWidth={260}
                    >
                      <div className="text-slate-900 p-1 space-y-1">
                        <div className="font-bold text-xs">
                          {selectedStop.name}
                        </div>
                        <div className="text-xs text-slate-600">
                          {selectedStop.distanceFromPrevKm} km ·{' '}
                          {selectedStop.travelMinutesFromPrev} mins transit · ₹
                          {selectedStop.estimatedStopCostPerPersonInr}/person (
                          {selectedStop.costStatus})
                        </div>
                        <a
                          href={buildGoogleMapsDirectionsUrl(
                            trip.preferences.startingCoordinates,
                            selectedStop.coordinates,
                            [],
                            trip.preferences.transportMode
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 underline pt-1"
                        >
                          <span>Directions to Stop</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </InfoWindow>
                  )}
                </Map>
              </APIProvider>
            </div>
          ) : (
            /* Honest Fallback when VITE_GOOGLE_MAPS_API_KEY is missing */
            <div
              data-testid="map-fallback-container"
              className="p-8 min-h-[420px] flex flex-col justify-between bg-slate-950"
            >
              <div className="space-y-3 max-w-xl">
                <div className="flex items-center gap-2 text-amber-400 text-sm font-semibold">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>
                    Google Maps API Key Not Configured — Honest Coordinate & Directions Fallback Active
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  To enable the live interactive Google Map, Places Autocomplete, and Routes API polyline, set{' '}
                  <code className="font-mono text-amber-300">
                    VITE_GOOGLE_MAPS_API_KEY
                  </code>{' '}
                  in your environment. In the meantime, all curated Karnataka coordinates, deterministic Haversine road estimates, and direct Google Maps turn-by-turn links remain 100% functional below.
                </p>
              </div>

              <div className="my-6 space-y-2 border-y border-slate-800 py-4">
                <div className="text-xs font-semibold text-slate-300">
                  Active Route Sequence ({trip.preferences.startingLocation} →{' '}
                  {trip.preferences.targetDistrict}):
                </div>
                {activeStops.map((stop, index) => (
                  <div
                    key={stop.stopId}
                    className="flex flex-wrap items-center justify-between gap-2 text-xs py-1.5"
                  >
                    <span className="text-white font-medium">
                      0{index + 1}. {stop.name} ({stop.coordinates.lat.toFixed(4)},{' '}
                      {stop.coordinates.lng.toFixed(4)})
                    </span>
                    <span className="font-mono tabular-nums text-slate-400">
                      {stop.distanceFromPrevKm} km · {stop.travelMinutesFromPrev} mins
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <a
                  href={fullRouteDirectionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 text-xs font-semibold bg-amber-500 text-slate-950 rounded-lg hover:bg-amber-400 transition-colors inline-flex items-center gap-1.5"
                >
                  <span>Launch Multi-Stop Directions in Google Maps</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Right 5 columns: Stop Manager, Nearby Results & Add Curated Stops */}
        <div className="lg:col-span-5 space-y-6">
          {/* Current Itinerary Stops on Map */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-semibold text-white">
                Route Stops ({activeStops.length})
              </h2>
              <span className="text-xs text-slate-400">
                Click stop to inspect or remove
              </span>
            </div>

            <div className="space-y-2.5">
              {activeStops.map((stop, idx) => (
                <div
                  key={stop.stopId}
                  onClick={() => setSelectedStop(stop)}
                  className={`p-3 rounded-lg border transition-colors cursor-pointer flex items-center justify-between gap-3 ${
                    selectedStop?.stopId === stop.stopId
                      ? 'border-amber-500/70 bg-amber-950/20'
                      : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                  }`}
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="text-xs font-semibold text-white truncate">
                      0{idx + 1}. {stop.name}
                    </div>
                    <div className="text-xs text-slate-400 font-mono tabular-nums">
                      {stop.distanceFromPrevKm} km · {stop.travelMinutesFromPrev}m · ₹
                      {stop.estimatedStopCostGroupInr} group ({stop.costStatus})
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <a
                      href={buildGoogleMapsDirectionsUrl(
                        idx === 0
                          ? trip.preferences.startingCoordinates
                          : activeStops[idx - 1].coordinates,
                        stop.coordinates,
                        [],
                        trip.preferences.transportMode
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`Directions to ${stop.name}`}
                      className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    {activeStops.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveStopFromTrip(stop.stopId);
                        }}
                        aria-label={`Remove ${stop.name} from route`}
                        className="p-1.5 rounded bg-rose-950/60 hover:bg-rose-900/70 text-rose-300 border border-rose-800/50 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Live Nearby Places API Results (if searched) */}
          {nearbyPlaces.length > 0 && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <h3 className="text-sm font-semibold text-white">
                  Live Google Places Nearby Results
                </h3>
                <button
                  type="button"
                  onClick={() => setNearbyPlaces([])}
                  className="text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  Clear
                </button>
              </div>
              <div className="space-y-2">
                {nearbyPlaces.map((np) => (
                  <div
                    key={np.id}
                    className="p-3 rounded-lg border border-slate-800 bg-slate-950/60 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white truncate">
                        {np.name} {np.rating ? `· ${np.rating}★` : ''}
                      </div>
                      <div className="text-xs text-slate-400 truncate">
                        {np.address}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddNearbyToTrip(np)}
                      className="px-2.5 py-1.5 text-xs font-medium bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      + Add Stop
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add Verified Curated Stop in District */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
            <h3 className="text-sm font-semibold text-white border-b border-slate-800 pb-2.5">
              Add More Verified Stops in {trip.preferences.targetDistrict}
            </h3>
            {unaddedDistrictCurated.length === 0 ? (
              <p className="text-xs text-slate-400">
                All curated destinations in {trip.preferences.targetDistrict} are already in your route. Use the Google Places search bar on the map to add any custom stop across Karnataka.
              </p>
            ) : (
              <div className="space-y-2">
                {unaddedDistrictCurated.map((dest) => (
                  <div
                    key={dest.id}
                    className="p-3 rounded-lg border border-slate-800 bg-slate-950/60 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white truncate">
                        {dest.name}
                      </div>
                      <div className="text-xs text-slate-400 font-mono tabular-nums">
                        Entry ₹{dest.entryFeeInrPerPerson} ({dest.costStatus}) ·{' '}
                        {dest.expectedVisitMinutes} mins
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddCuratedDestination(dest)}
                      aria-label={`Add ${dest.name} to itinerary`}
                      className="px-2.5 py-1.5 text-xs font-medium bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-lg flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add to Route</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
