import React, { useEffect, useState, useCallback } from 'react';
import {
  Sun,
  CloudSun,
  Cloud,
  CloudRain,
  CloudDrizzle,
  CloudLightning,
  CloudFog,
  Droplets,
  RefreshCw,
  Umbrella,
  CheckCircle2,
  AlertCircle,
  Thermometer,
} from 'lucide-react';
import type { LatLngLiteral } from '../types/travel.ts';
import {
  fetch3DayWeatherForecast,
  getSeasonalFallbackForecast,
  type WeatherPreviewData,
  type WeatherConditionType,
} from '../utils/weather.ts';
import { translations, type Language } from '../utils/i18n.ts';

interface WeatherForecastWidgetProps {
  districtName: string;
  coordinates: LatLngLiteral;
  language?: Language;
}

function getWeatherIcon(type: WeatherConditionType, className = 'w-5 h-5') {
  switch (type) {
    case 'sunny':
      return <Sun className={`${className} text-amber-400`} />;
    case 'partly_cloudy':
      return <CloudSun className={`${className} text-amber-300`} />;
    case 'cloudy':
      return <Cloud className={`${className} text-slate-300`} />;
    case 'fog':
      return <CloudFog className={`${className} text-slate-400`} />;
    case 'drizzle':
      return <CloudDrizzle className={`${className} text-sky-300`} />;
    case 'rain':
      return <CloudRain className={`${className} text-sky-400`} />;
    case 'thunderstorm':
      return <CloudLightning className={`${className} text-amber-400`} />;
    default:
      return <CloudSun className={`${className} text-amber-300`} />;
  }
}

export const WeatherForecastWidget: React.FC<WeatherForecastWidgetProps> = ({
  districtName,
  coordinates,
  language = 'en',
}) => {
  const t = translations[language].weather;
  const [data, setData] = useState<WeatherPreviewData>(() =>
    getSeasonalFallbackForecast(districtName, coordinates)
  );
  const [loading, setLoading] = useState<boolean>(false);

  const loadWeather = useCallback(async () => {
    setLoading(true);
    try {
      const forecast = await fetch3DayWeatherForecast(districtName, coordinates);
      setData(forecast);
    } catch {
      setData(getSeasonalFallbackForecast(districtName, coordinates));
    } finally {
      setLoading(false);
    }
  }, [districtName, coordinates.lat, coordinates.lng]);

  useEffect(() => {
    loadWeather();
  }, [loadWeather]);

  const items = language === 'kn' ? data.packingAdvice.itemsKn : data.packingAdvice.items;
  const advisory = language === 'kn' ? data.packingAdvice.advisoryKn : data.packingAdvice.advisory;

  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#101726]/85 p-6 space-y-5">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Thermometer className="w-4 h-4 text-amber-400" />
            <h2 className="text-base font-bold text-white font-display">
              {t.heading}
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {t.subheading} · <span className="text-slate-200 font-medium">{districtName}</span>
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <span className="text-[11px] font-mono text-slate-400">
            {data.source === 'live_api' ? t.liveNotice : t.fallbackNotice}
          </span>
          <button
            type="button"
            onClick={loadWeather}
            disabled={loading}
            title={t.refresh}
            aria-label={t.refresh}
            className="p-1.5 rounded-lg bg-[#090e17] border border-white/[0.08] text-slate-300 hover:text-white hover:bg-slate-800 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* 3-Day Forecast Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {data.forecasts.map((day, idx) => {
          const dayTitle =
            idx === 0
              ? t.today
              : idx === 1
              ? t.tomorrow
              : language === 'kn'
              ? day.dayLabelKn
              : day.dayLabel;

          const cond = language === 'kn' ? day.conditionLabelKn : day.conditionLabel;

          return (
            <div
              key={day.date}
              className="p-3.5 rounded-lg bg-[#090e17]/80 border border-white/[0.06] flex flex-col justify-between space-y-2 hover:border-white/20 transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-white font-display">
                  {dayTitle}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {day.date.slice(5)}
                </span>
              </div>

              <div className="flex items-center gap-3 py-1">
                <div className="p-2 rounded-md bg-white/[0.04]">
                  {getWeatherIcon(day.conditionType, 'w-6 h-6')}
                </div>
                <div>
                  <div className="text-base font-bold text-white font-mono tabular-nums leading-none">
                    {day.tempMaxC}° <span className="text-xs font-normal text-slate-400">/ {day.tempMinC}°C</span>
                  </div>
                  <div className="text-[11px] text-slate-300 mt-1 truncate">
                    {cond}
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-white/[0.04] flex items-center justify-between text-[11px] font-mono tabular-nums text-slate-400">
                <div className="flex items-center gap-1">
                  <Droplets className="w-3 h-3 text-sky-400" />
                  <span>{day.precipitationProbability}%</span>
                </div>
                {day.uvIndex !== undefined && (
                  <span className="text-slate-400">
                    UV {day.uvIndex}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Contextual Weather Advisory & Packing List */}
      <div className="pt-2 space-y-3">
        {/* Weather Advisory Callout */}
        <div className="p-3.5 rounded-lg bg-[#0d1422] border border-amber-500/25 flex items-start gap-2.5 text-xs">
          <Umbrella className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-slate-200 leading-relaxed font-sans">
            {advisory}
          </p>
        </div>

        {/* Packing Checklist */}
        <div>
          <div className="text-xs font-semibold text-slate-300 mb-2 font-display">
            {t.packingEssentials} ({districtName}):
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {items.map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-2 p-2 rounded-md bg-[#090e17]/60 border border-white/[0.04] text-slate-300"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="leading-snug">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
