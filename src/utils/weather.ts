import type { LatLngLiteral } from '../types/travel.ts';

export type WeatherConditionType =
  | 'sunny'
  | 'partly_cloudy'
  | 'cloudy'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'thunderstorm';

export interface DayForecast {
  date: string;
  dayLabel: string;
  dayLabelKn: string;
  weatherCode: number;
  conditionType: WeatherConditionType;
  conditionLabel: string;
  conditionLabelKn: string;
  tempMaxC: number;
  tempMinC: number;
  precipitationProbability: number;
  uvIndex?: number;
}

export interface PackingAdvice {
  items: string[];
  itemsKn: string[];
  advisory: string;
  advisoryKn: string;
}

export interface WeatherPreviewData {
  districtName: string;
  coordinates: LatLngLiteral;
  forecasts: DayForecast[];
  packingAdvice: PackingAdvice;
  source: 'live_api' | 'seasonal_fallback';
  lastUpdated: string;
}

/**
 * Maps WMO Weather Interpretation Codes to human descriptions and icon types.
 */
export function mapWeatherCode(code: number): {
  type: WeatherConditionType;
  label: string;
  labelKn: string;
} {
  switch (code) {
    case 0:
      return { type: 'sunny', label: 'Clear Sky', labelKn: 'ಸ್ವಚ್ಛ ಬಿಸಿಲು' };
    case 1:
      return { type: 'sunny', label: 'Mainly Clear', labelKn: 'ಮುಖ್ಯವಾಗಿ ಸ್ವಚ್ಛ' };
    case 2:
      return { type: 'partly_cloudy', label: 'Partly Cloudy', labelKn: 'ಭಾಗಶಃ ಮೋಡ' };
    case 3:
      return { type: 'cloudy', label: 'Overcast', labelKn: 'ಮೋಡ ಕವಿದ ವಾತಾವರಣ' };
    case 45:
    case 48:
      return { type: 'fog', label: 'Misty / Foggy', labelKn: 'ಮಂಜು ಕವಿದಿದೆ' };
    case 51:
    case 53:
    case 55:
      return { type: 'drizzle', label: 'Light Drizzle', labelKn: 'ತುಂತುರು ಮಳೆ' };
    case 61:
    case 63:
    case 65:
      return { type: 'rain', label: 'Rainy', labelKn: 'ಮಳೆ' };
    case 80:
    case 81:
    case 82:
      return { type: 'rain', label: 'Passing Showers', labelKn: 'ಬಿರುಸಿನ ಮಳೆ' };
    case 95:
    case 96:
    case 99:
      return { type: 'thunderstorm', label: 'Thunderstorms', labelKn: 'ಗುಡುಗು ಸಹಿತ ಮಳೆ' };
    default:
      return { type: 'partly_cloudy', label: 'Pleasant Clouds', labelKn: 'ಸಾಧಾರಣ ಮೋಡ' };
  }
}

/**
 * Generates tailored Karnataka packing recommendations based on destination district climate
 * and 3-day forecasted weather (rain chances, peak heat, night drops).
 */
export function generateKarnatakaPackingAdvice(
  district: string,
  forecasts: DayForecast[]
): PackingAdvice {
  const normDistrict = (district || '').toLowerCase();
  const maxRainProb = Math.max(
    0,
    ...forecasts.map((f) => f.precipitationProbability)
  );
  const maxTemp = Math.max(28, ...forecasts.map((f) => f.tempMaxC));
  const minTemp = Math.min(22, ...forecasts.map((f) => f.tempMinC));

  const isWesternGhats =
    normDistrict.includes('kodagu') ||
    normDistrict.includes('coorg') ||
    normDistrict.includes('chikkamagaluru') ||
    normDistrict.includes('shivamogga') ||
    normDistrict.includes('hassan');

  const isCoastal =
    normDistrict.includes('uttara kannada') ||
    normDistrict.includes('udupi') ||
    normDistrict.includes('dakshina kannada') ||
    normDistrict.includes('mangalore') ||
    normDistrict.includes('gokarna');

  const isNorthKarnataka =
    normDistrict.includes('vijayapura') ||
    normDistrict.includes('bagalkote') ||
    normDistrict.includes('hampi') ||
    normDistrict.includes('vijayanagara') ||
    normDistrict.includes('raichur') ||
    normDistrict.includes('kalaburagi') ||
    normDistrict.includes('ballari') ||
    normDistrict.includes('koppal');

  const items: string[] = [];
  const itemsKn: string[] = [];

  // 1. Rain protection
  if (maxRainProb >= 35 || forecasts.some((f) => f.conditionType === 'rain' || f.conditionType === 'thunderstorm')) {
    items.push('Compact umbrella & rain jacket');
    itemsKn.push('ಕಾಂಪ್ಯಾಕ್ಟ್ ಕೊಡೆ ಮತ್ತು ರೇನ್‌ಕೋಟ್');
    items.push('Water-resistant shoes / quick-dry sandals');
    itemsKn.push('ಜಲನಿರೋಧಕ ಪಾದರಕ್ಷೆಗಳು');
  }

  // 2. Sun & heat protection
  if (maxTemp >= 31 || isNorthKarnataka) {
    items.push('Wide-brim sun hat & UV sunglasses');
    itemsKn.push('ಬಿಸಿಲು ಟೋಪಿ ಮತ್ತು ಸನ್‌ಗ್ಲಾಸ್‌');
    items.push('Breathable cotton wear & hydration flask');
    itemsKn.push('ಹತ್ತಿ ಬಟ್ಟೆಗಳು ಮತ್ತು ನೀರಿನ ಬಾಟಲ್');
  }

  // 3. Chilly hills / Ghats protection
  if (minTemp <= 20 || isWesternGhats) {
    items.push('Light fleece sweater or shawl for evenings');
    itemsKn.push('ಸಂಜೆಯ ತಂಪಿಗೆ ಹಗುರ ಸ್ವೆಟರ್ ಅಥವಾ ಶಾಲು');
  }

  // 4. Heritage & temple etiquette footwear
  items.push('Comfortable slip-on walking footwear (temple friendly)');
  itemsKn.push('ದೇವಾಲಯಗಳಿಗೆ ಸುಲಭವಾದ ನಡಿಗೆ ಶೂಗಳು');

  // 5. Cash for tolls and tender coconut
  items.push('Cash for local entry tolls & fresh tender coconut');
  itemsKn.push('ಸ್ಥಳೀಯ ಟೋಲ್ ಮತ್ತು ಎಳನೀರಿಗೆ ನಗದು');

  // Contextual advisory message
  let advisory = '';
  let advisoryKn = '';

  if (maxRainProb >= 60) {
    advisory = `High rain likelihood (${maxRainProb}%) predicted in ${district}. Allow 20–30% extra driving buffer on ghat curves and keep electronics in waterproof pouches.`;
    advisoryKn = `${district} ಜಿಲ್ಲೆಯಲ್ಲಿ ಮಳೆಯ ಸಾಧ್ಯತೆ (${maxRainProb}%) ಹೆಚ್ಚಾಗಿದೆ. ಘಾಟಿ ರಸ್ತೆಗಳಲ್ಲಿ ಜಾಗರೂಕತೆಯಿಂದ ಚಲಿಸಿ ಮತ್ತು ವಾಟರ್‌ಪ್ರೂಫ್ ಕವರ್ ಬಳಸಿ.`;
  } else if (isWesternGhats) {
    advisory = `Mild hill station climate expected (High ~${Math.round(maxTemp)}°C, Low ~${Math.round(minTemp)}°C). Mist or gentle showers may occur along scenic forest viewpoints.`;
    advisoryKn = `ಮಲೆನಾಡಿನ ಹಿತಕರ ವಾತಾವರಣ (ಗರಿಷ್ಠ ~${Math.round(maxTemp)}°C, ಕನಿಷ್ಠ ~${Math.round(minTemp)}°C). ಬೆಟ್ಟಗುಡ್ಡಗಳ ತಿರುವುಗಳಲ್ಲಿ ತಂಪು ಗಾಳಿ ಇರುತ್ತದೆ.`;
  } else if (isCoastal) {
    advisory = `Warm coastal tropical climate with moderate humidity (~${Math.round(maxTemp)}°C). Ideal for morning beach walks and sunset viewpoint trails.`;
    advisoryKn = `ಕರಾವಳಿಯ ಹಿತಕರ ಉಷ್ಣಾಂಶ (~${Math.round(maxTemp)}°C). ಮುಂಜಾನೆ ಮತ್ತು ಸಂಜೆಯ ಕಡಲತೀರದ ನಡಿಗೆಗೆ ಅತ್ಯುತ್ತಮ ಸಮಯ.`;
  } else if (isNorthKarnataka) {
    advisory = `Sunny and warm weather (${Math.round(maxTemp)}°C peak). Plan outdoor boulder exploration like Hampi before 11:30 AM or after 3:30 PM.`;
    advisoryKn = `ಬಿಸಿಲಿನ ವಾತಾವರಣ (${Math.round(maxTemp)}°C). ಹಂಪಿಯಂತಹ ಸ್ಮಾರಕಗಳ ವೀಕ್ಷಣೆಯನ್ನು ಬೆಳಿಗ್ಗೆ ಅಥವಾ ಸಂಜೆಯ ವೇಳೆಗೆ ಯೋಜಿಸಿ.`;
  } else {
    advisory = `Pleasant touring weather (~${Math.round(maxTemp)}°C / ~${Math.round(minTemp)}°C) across ${district}. Pack light layers and comfortable walking shoes.`;
    advisoryKn = `${district} ಜಿಲ್ಲೆಯಲ್ಲಿ ಆಹ್ಲಾದಕರ ಹವಾಮಾನ (~${Math.round(maxTemp)}°C). ಆರಾಮದಾಯಕ ಬಟ್ಟೆ ಮತ್ತು ಶೂಗಳನ್ನು ಜೊತೆಯಲ್ಲಿಟ್ಟುಕೊಳ್ಳಿ.`;
  }

  return {
    items: items.slice(0, 4),
    itemsKn: itemsKn.slice(0, 4),
    advisory,
    advisoryKn,
  };
}

/**
 * Seasonal fallback forecast when offline or if the API network request fails.
 */
export function getSeasonalFallbackForecast(
  districtName: string,
  coordinates: LatLngLiteral
): WeatherPreviewData {
  const now = new Date();
  const dayNamesEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayNamesKn = ['ಭಾನು', 'ಸೋಮ', 'ಮಂಗಳ', 'ಬುಧ', 'ಗುರು', 'ಶುಕ್ರ', 'ಶನಿ'];

  const d1 = new Date(now);
  const d2 = new Date(now.getTime() + 86400000);
  const d3 = new Date(now.getTime() + 86400000 * 2);

  const norm = districtName.toLowerCase();
  const isGhats = norm.includes('kodagu') || norm.includes('chikkamagaluru');
  const isCoastal = norm.includes('udupi') || norm.includes('kannada');

  const baseHigh = isGhats ? 25 : isCoastal ? 30 : 28;
  const baseLow = isGhats ? 17 : isCoastal ? 23 : 20;

  const forecasts: DayForecast[] = [
    {
      date: d1.toISOString().split('T')[0],
      dayLabel: 'Today',
      dayLabelKn: 'ಇಂದು',
      weatherCode: 2,
      conditionType: 'partly_cloudy',
      conditionLabel: 'Partly Cloudy',
      conditionLabelKn: 'ಭಾಗಶಃ ಮೋಡ',
      tempMaxC: baseHigh,
      tempMinC: baseLow,
      precipitationProbability: 25,
      uvIndex: 6,
    },
    {
      date: d2.toISOString().split('T')[0],
      dayLabel: dayNamesEn[d2.getDay()],
      dayLabelKn: dayNamesKn[d2.getDay()],
      weatherCode: 1,
      conditionType: 'sunny',
      conditionLabel: 'Mainly Clear',
      conditionLabelKn: 'ಮುಖ್ಯವಾಗಿ ಸ್ವಚ್ಛ',
      tempMaxC: baseHigh + 1,
      tempMinC: baseLow,
      precipitationProbability: 15,
      uvIndex: 7,
    },
    {
      date: d3.toISOString().split('T')[0],
      dayLabel: dayNamesEn[d3.getDay()],
      dayLabelKn: dayNamesKn[d3.getDay()],
      weatherCode: 80,
      conditionType: 'rain',
      conditionLabel: 'Light Showers',
      conditionLabelKn: 'ಹಗುರ ಮಳೆ',
      tempMaxC: baseHigh - 1,
      tempMinC: baseLow - 1,
      precipitationProbability: 45,
      uvIndex: 5,
    },
  ];

  const packingAdvice = generateKarnatakaPackingAdvice(districtName, forecasts);

  return {
    districtName,
    coordinates,
    forecasts,
    packingAdvice,
    source: 'seasonal_fallback',
    lastUpdated: new Date().toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    }),
  };
}

/**
 * Fetches a 3-day daily forecast from Open-Meteo for the given coordinates.
 * Gracefully falls back to localized seasonal data if offline or network error occurs.
 */
export async function fetch3DayWeatherForecast(
  districtName: string,
  coordinates: LatLngLiteral
): Promise<WeatherPreviewData> {
  const { lat, lng } = coordinates;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return getSeasonalFallbackForecast(districtName, { lat: 12.9716, lng: 77.5946 });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(
      4
    )}&longitude=${lng.toFixed(
      4
    )}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max&timezone=auto&forecast_days=3`;

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Open-Meteo returned status ${res.status}`);
    }

    const json = await res.json();
    const daily = json.daily;

    if (!daily || !Array.isArray(daily.time) || daily.time.length < 3) {
      throw new Error('Malformed Open-Meteo daily forecast response');
    }

    const dayNamesEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayNamesKn = ['ಭಾನು', 'ಸೋಮ', 'ಮಂಗಳ', 'ಬುಧ', 'ಗುರು', 'ಶುಕ್ರ', 'ಶನಿ'];

    const forecasts: DayForecast[] = daily.time.slice(0, 3).map((dateStr: string, idx: number) => {
      const d = new Date(dateStr);
      const code = daily.weather_code?.[idx] ?? 1;
      const cond = mapWeatherCode(code);
      const isToday = idx === 0;

      return {
        date: dateStr,
        dayLabel: isToday ? 'Today' : dayNamesEn[d.getDay()],
        dayLabelKn: isToday ? 'ಇಂದು' : dayNamesKn[d.getDay()],
        weatherCode: code,
        conditionType: cond.type,
        conditionLabel: cond.label,
        conditionLabelKn: cond.labelKn,
        tempMaxC: Math.round(daily.temperature_2m_max?.[idx] ?? 28),
        tempMinC: Math.round(daily.temperature_2m_min?.[idx] ?? 20),
        precipitationProbability: Math.round(daily.precipitation_probability_max?.[idx] ?? 10),
        uvIndex: daily.uv_index_max?.[idx] ? Math.round(daily.uv_index_max[idx]) : undefined,
      };
    });

    const packingAdvice = generateKarnatakaPackingAdvice(districtName, forecasts);

    return {
      districtName,
      coordinates,
      forecasts,
      packingAdvice,
      source: 'live_api',
      lastUpdated: new Date().toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
  } catch (err) {
    clearTimeout(timeoutId);
    console.info('Using seasonal weather fallback for', districtName, err);
    return getSeasonalFallbackForecast(districtName, coordinates);
  }
}
