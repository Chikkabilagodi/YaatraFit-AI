import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Wifi, WifiOff, X, RefreshCw } from 'lucide-react';
import { translations, type Language } from '../../utils/i18n.ts';
import type { NetworkStatus } from '../../hooks/useNetworkStatus.ts';

interface NetworkStatusBannerProps {
  network: NetworkStatus;
  language?: Language;
}

export const NetworkStatusBanner: React.FC<NetworkStatusBannerProps> = ({
  network,
  language = 'en',
}) => {
  const t = translations[language].network;
  const isOffline = !network.isOnline && !network.dismissed;
  const showReconnected = network.isOnline && network.reconnected && !network.dismissed;

  const handleManualCheck = () => {
    // If the browser reports online upon user check
    if (typeof window !== 'undefined' && navigator.onLine) {
      window.dispatchEvent(new Event('online'));
    }
  };

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed top-4 right-4 sm:top-5 sm:right-6 z-50 pointer-events-none max-w-[calc(100vw-2rem)] sm:max-w-md"
    >
      <AnimatePresence mode="wait">
        {isOffline && (
          <motion.div
            key="offline-toast"
            initial={{ opacity: 0, y: -16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.96 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            role="status"
            className="pointer-events-auto rounded-xl border border-amber-500/30 bg-[#0d1422]/95 backdrop-blur-xl p-3.5 shadow-2xl shadow-black/70 text-slate-200 flex items-start gap-3"
          >
            {/* Status indicator icon with subtle pulse */}
            <div className="relative mt-0.5 shrink-0">
              <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-amber-400">
                <WifiOff className="w-4 h-4" />
              </div>
              <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
              </span>
            </div>

            {/* Message Body */}
            <div className="flex-1 min-w-0 pr-1">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-semibold text-white tracking-tight">
                  {t.offlineTitle}
                </h3>
                <span className="text-[10px] font-mono text-amber-400/90 uppercase tracking-wider">
                  Offline Mode
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                {t.offlineDesc}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleManualCheck}
                  className="inline-flex items-center gap-1.5 px-2 py-1 text-[11px] font-medium text-amber-300 hover:text-white bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-md transition-colors cursor-pointer active:scale-95"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>{language === 'kn' ? 'ಮರುಪರಿಶೀಲಿಸಿ' : 'Check status'}</span>
                </button>
              </div>
            </div>

            {/* Dismiss button */}
            <button
              type="button"
              onClick={network.dismissNotification}
              title={t.dismiss}
              aria-label={t.dismiss}
              className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-white/[0.08] transition-colors cursor-pointer shrink-0 -mr-1 -mt-1 active:scale-90"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}

        {showReconnected && (
          <motion.div
            key="reconnected-toast"
            initial={{ opacity: 0, y: -16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.96 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            role="status"
            className="pointer-events-auto rounded-xl border border-emerald-500/30 bg-[#0d1422]/95 backdrop-blur-xl p-3 shadow-xl shadow-black/60 text-slate-200 flex items-center gap-3"
          >
            <div className="relative shrink-0">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
                <Wifi className="w-3.5 h-3.5" />
              </div>
              <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-xs font-semibold text-white tracking-tight">
                {t.reconnectedTitle}
              </h3>
              <p className="text-[11px] text-slate-300 leading-snug">
                {t.reconnectedDesc}
              </p>
            </div>

            <button
              type="button"
              onClick={network.dismissNotification}
              title={t.dismiss}
              aria-label={t.dismiss}
              className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-white/[0.08] transition-colors cursor-pointer shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
