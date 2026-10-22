import React from 'react';

interface IllustrationBannerProps {
  district: string;
  className?: string;
}

export const IllustrationBanner: React.FC<IllustrationBannerProps> = ({
  district,
  className = 'h-48 w-full',
}) => {
  const normalized = district.toLowerCase();

  if (normalized.includes('vijayanagara') || normalized.includes('hampi')) {
    return (
      <div
        className={`relative overflow-hidden rounded-xl border border-slate-800 bg-gradient-to-br from-slate-900 via-amber-950/50 to-slate-950 ${className}`}
        role="img"
        aria-label="Illustrated panorama of Hampi Stone Chariot and Tungabhadra boulder hills"
      >
        <svg
          viewBox="0 0 800 260"
          className="h-full w-full object-cover"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <linearGradient id="hampiSky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="55%" stopColor="#451a03" />
              <stop offset="100%" stopColor="#78350f" />
            </linearGradient>
          </defs>
          <rect width="800" height="260" fill="url(#hampiSky)" />
          <circle cx="640" cy="75" r="38" fill="#f59e0b" fillOpacity="0.28" />
          <circle cx="640" cy="75" r="22" fill="#fbbf24" fillOpacity="0.55" />
          {/* Boulder hills */}
          <path
            d="M0 210 Q110 130 240 190 T520 175 T800 195 L800 260 L0 260 Z"
            fill="#1e293b"
          />
          {/* Gopuram & Chariot silhouette */}
          <polygon points="360,95 390,95 405,195 345,195" fill="#d97706" fillOpacity="0.45" />
          <rect x="440" y="135" width="64" height="52" rx="4" fill="#f59e0b" fillOpacity="0.35" />
          <circle cx="454" cy="190" r="12" stroke="#fbbf24" strokeWidth="3" fill="none" />
          <circle cx="490" cy="190" r="12" stroke="#fbbf24" strokeWidth="3" fill="none" />
          <path
            d="M0 225 Q220 195 460 220 T800 210 L800 260 L0 260 Z"
            fill="#09111e"
          />
        </svg>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/35 to-transparent" />
      </div>
    );
  }

  if (
    normalized.includes('kodagu') ||
    normalized.includes('chikkamagaluru') ||
    normalized.includes('shivamogga')
  ) {
    return (
      <div
        className={`relative overflow-hidden rounded-xl border border-slate-800 bg-gradient-to-br from-slate-950 via-emerald-950/60 to-slate-900 ${className}`}
        role="img"
        aria-label="Illustrated panorama of Western Ghats misty coffee hills and waterfalls"
      >
        <svg
          viewBox="0 0 800 260"
          className="h-full w-full object-cover"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <linearGradient id="ghatSky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#09111e" />
              <stop offset="60%" stopColor="#064e3b" />
              <stop offset="100%" stopColor="#022c22" />
            </linearGradient>
          </defs>
          <rect width="800" height="260" fill="url(#ghatSky)" />
          <circle cx="160" cy="70" r="30" fill="#fbbf24" fillOpacity="0.22" />
          {/* Layered Western Ghats ridges */}
          <path
            d="M0 175 Q160 95 340 160 T700 120 L800 150 L800 260 L0 260 Z"
            fill="#065f46"
            fillOpacity="0.55"
          />
          <path
            d="M0 205 Q220 140 440 195 T800 165 L800 260 L0 260 Z"
            fill="#047857"
            fillOpacity="0.45"
          />
          {/* Waterfall cascade */}
          <rect x="520" y="122" width="8" height="85" rx="4" fill="#a7f3d0" fillOpacity="0.45" />
          <rect x="534" y="128" width="5" height="78" rx="2.5" fill="#6ee7b7" fillOpacity="0.35" />
          <path
            d="M0 230 Q260 200 540 225 T800 215 L800 260 L0 260 Z"
            fill="#09111e"
          />
        </svg>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/35 to-transparent" />
      </div>
    );
  }

  // Default: Mysuru & Royal / Coastal Karnataka silhouette
  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/50 ${className}`}
      role="img"
      aria-label="Illustrated panorama of Karnataka heritage architecture and landscapes"
    >
      <svg
        viewBox="0 0 800 260"
        className="h-full w-full object-cover"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="mysSky" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#09111e" />
            <stop offset="55%" stopColor="#0f2922" />
            <stop offset="100%" stopColor="#1e1b4b" />
          </linearGradient>
        </defs>
        <rect width="800" height="260" fill="url(#mysSky)" />
        <circle cx="660" cy="68" r="32" fill="#f59e0b" fillOpacity="0.22" />
        {/* Palace domes & arches */}
        <rect x="290" y="135" width="220" height="75" fill="#1e293b" stroke="#f59e0b" strokeOpacity="0.35" />
        <circle cx="400" cy="122" r="24" fill="#d97706" fillOpacity="0.4" />
        <circle cx="325" cy="132" r="14" fill="#f59e0b" fillOpacity="0.3" />
        <circle cx="475" cy="132" r="14" fill="#f59e0b" fillOpacity="0.3" />
        <path
          d="M0 218 Q240 192 480 215 T800 205 L800 260 L0 260 Z"
          fill="#09111e"
        />
      </svg>
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/35 to-transparent" />
    </div>
  );
};
