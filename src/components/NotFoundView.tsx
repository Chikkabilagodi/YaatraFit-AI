import React from 'react';
import { Compass, Home, MapPin, Phone, Mail, ArrowLeft } from 'lucide-react';
import type { NavSection } from './DashboardView.tsx';
import type { Language } from '../utils/i18n.ts';

interface NotFoundViewProps {
  onNavigate: (section: NavSection) => void;
  language?: Language;
}

export const NotFoundView: React.FC<NotFoundViewProps> = ({
  onNavigate,
  language = 'en',
}) => {
  return (
    <div className="min-h-[60vh] flex items-center justify-center py-12 px-4 sm:px-6">
      <div className="relative max-w-xl w-full rounded-2xl border border-white/[0.08] bg-[#101726]/90 p-8 sm:p-10 text-center overflow-hidden shadow-2xl backdrop-blur-xl">
        {/* Ambient Karnataka glow behind card */}
        <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-radial from-amber-500/20 via-red-600/10 to-transparent blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 rounded-full bg-radial from-red-600/15 via-transparent to-transparent blur-3xl pointer-events-none" />

        {/* Karnataka Silhouette Visual */}
        <div className="relative mx-auto w-28 h-36 mb-6 flex items-center justify-center opacity-85">
          <img
            src="/assets/aistudio/image_4a7e4179.png"
            alt="Karnataka State Map"
            className="h-full w-auto object-contain filter drop-shadow-[0_0_20px_rgba(245,158,11,0.4)]"
            loading="eager"
          />
        </div>

        <div className="inline-block px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono font-semibold tracking-wider mb-3">
          HTTP 404 · PAGE NOT FOUND
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-display mb-2">
          {language === 'kn'
            ? 'ಕರ್ನಾಟಕದ ಹಾದಿ ತಪ್ಪಿದಿರಾ?'
            : 'Lost on the Western Ghats?'}
        </h1>

        <p className="text-sm text-slate-300 max-w-md mx-auto leading-relaxed mb-6 font-sans">
          {language === 'kn'
            ? 'ನೀವು ಹುಡುಕುತ್ತಿರುವ ಪುಟವು ಅಸ್ತಿತ್ವದಲ್ಲಿಲ್ಲ ಅಥವಾ ಸ್ಥಳಾಂತರಿಸಲಾಗಿದೆ. ದಯವಿಟ್ಟು ಮುಖ್ಯ ಅವಲೋಕನಕ್ಕೆ ಹಿಂತಿರುಗಿ ಅಥವಾ ನಮ್ಮ ಲೈವ್ ನಕ್ಷೆಯನ್ನು ಅನ್ವೇಷಿಸಿ.'
            : 'The travel route or page you are looking for does not exist or has been relocated. Return to your trip dashboard or explore destination routes on the map.'}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className="px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-slate-950 font-semibold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer shadow-md"
          >
            <Home className="w-4 h-4" />
            <span>{language === 'kn' ? 'ಮುಖ್ಯ ಅವಲೋಕನಕ್ಕೆ ಹೋಗಿ' : 'Back to Overview'}</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('map')}
            className="px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-[0.98] text-slate-200 border border-white/[0.08] font-semibold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer"
          >
            <MapPin className="w-4 h-4 text-amber-400" />
            <span>{language === 'kn' ? 'ನಕ್ಷೆ ಅನ್ವೇಷಿಸಿ' : 'Explore Map'}</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('planner')}
            className="px-4 py-2.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 active:scale-[0.98] text-slate-300 border border-white/[0.08] font-medium text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer"
          >
            <Compass className="w-4 h-4 text-emerald-400" />
            <span>{language === 'kn' ? 'ಹೊಸ ಪ್ರವಾಸ ಯೋಜನೆ' : 'Plan Trip'}</span>
          </button>
        </div>

        {/* Direct Clickable Helpdesk Contact */}
        <div className="pt-6 border-t border-white/[0.08] text-xs text-slate-400 flex flex-wrap items-center justify-center gap-4">
          <a
            href="tel:180042500100"
            className="flex items-center gap-1.5 hover:text-amber-300 transition-colors"
          >
            <Phone className="w-3.5 h-3.5 text-amber-400" />
            <span>Helpline: 1800-425-00100</span>
          </a>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <a
            href="mailto:chikkabilagodu@gmail.com"
            className="flex items-center gap-1.5 hover:text-amber-300 transition-colors"
          >
            <Mail className="w-3.5 h-3.5 text-amber-400" />
            <span>chikkabilagodu@gmail.com</span>
          </a>
        </div>
      </div>
    </div>
  );
};
