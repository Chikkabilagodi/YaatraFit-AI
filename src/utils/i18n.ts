export type Language = 'en' | 'kn';

const STORAGE_KEY_LANG = 'yaatra_fit_ai_language_v1';

export function getStoredLanguage(): Language {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_LANG);
    if (saved === 'kn' || saved === 'en') {
      return saved;
    }
  } catch {
    // fallback
  }
  return 'en';
}

export function setStoredLanguage(lang: Language): void {
  try {
    localStorage.setItem(STORAGE_KEY_LANG, lang);
  } catch {
    // ignore
  }
}

export const translations = {
  en: {
    nav: {
      overview: 'Overview',
      planner: 'Plan a Trip',
      map: 'Explore Map',
      trips: 'My Journeys',
      wallet: 'Travel Wallet',
      coach: 'Budget Guide',
      recovery: 'Trip Adjuster',
      chat: 'Ask Ytrika',
    },
    hero: {
      taglineBadge: 'Karnataka — One State. Many Worlds · 31 Districts',
      trustBadge: 'Thoughtfully curated for Karnataka travellers',
      titlePrefix: 'Discover Karnataka with',
      brandName: 'Yaatra Fit AI',
      description:
        'Your friendly Karnataka travel companion. From the illuminated palaces and silk markets of Mysuru and the UNESCO boulder marvels of Hampi, to the misty coffee peaks of Coorg and the coastal horizons of Gokarna — Yaatra Fit AI calculates realistic travel times, protects your return transit funds, and never leaves you stranded.',
      freedomTitle: 'Your Trip, Your Way',
      freedomDesc:
        'No forced packages or pre-selected stops. Handpick the places you love or start from a clean slate.',
      budgetTitle: 'Transparent Budget',
      budgetDesc:
        'Track your demo wallet funds, food expenses, and return transit with an emergency fund kept safe.',
      transitTitle: 'Realistic Road & Bus Times',
      transitDesc:
        'Accurate travel times for ghat curves and highways whether travelling by bike, personal car, or KSRTC bus.',
      recoveryTitle: 'Flexible Trip Adjuster',
      recoveryDesc:
        'Unexpected traffic or heavy rain? Recalculate your day gracefully without erasing completed memories.',
      ctaPlan: 'Plan Your Karnataka Yaatra',
      ctaMap: 'Explore Live 31-District Map',
      ctaChat: 'Chat with Ytrika AI',
      ctaWallet: 'Travel Wallet',
      languageSelect: 'Language',
    },
    dashboard: {
      budgetHeading: 'Trip Budget & Expenses',
      budgetSub:
        'Clear, reliable budgeting. Your planned spending, demo funds, and emergency reserve stay protected.',
      openWallet: 'Open Travel Wallet',
      plannedBudget: 'Trip Budget Limit',
      walletBalance: 'Demo Wallet Balance',
      remainingBudget: 'Remaining Budget',
      emergencyReserve: 'Emergency Reserve',
      remainingCosts: 'Est. Remaining Costs',
      timelineHeading: "Today's Journey Timeline",
      departureFrom: 'Departure from',
      returnBy: 'Aim to return by',
      viewMap: 'View Route on Map',
      nextStop: 'Next Destination',
      markCompleted: 'Mark Stop Completed',
      completed: 'Completed',
      complete: 'Complete',
      noStopsTitle: 'No Stops Added Yet (Clean Slate)',
      noStopsDesc:
        'Yaatra Fit AI starts with a clean slate without forcing pre-selected stops. Customize your itinerary with complete freedom.',
      addStopsBtn: 'Add Custom Stops in Trip Planner',
      exploreMapBtn: 'Explore Karnataka Map',
      transitBreakdown: 'Transit & Bus Fare Breakdown',
      vehicleFuelEstimates: 'Vehicle & Fuel Estimates',
      tripSafety: 'Trip Safety & Route Guidance',
      allClear: 'Everything Looks Great For Your Journey',
      allClearDesc: (hours: number, reserve: number) =>
        `Your itinerary fits nicely within the ${hours}-hour return window and keeps your ₹${reserve.toLocaleString('en-IN')} emergency reserve protected.`,
      backToOverview: '← Back to Overview',
      activeNotices: (count: number) => `${count} Active Notice(s)`,
    },
    common: {
      district: 'District',
      wallet: 'Wallet',
      remaining: 'Remaining',
      reserve: 'Reserve',
      travellers: 'Travellers',
    },
    network: {
      offlineTitle: "You're Offline",
      offlineDesc: 'Maps and AI generation require internet connectivity. Your saved trips and wallet remain available.',
      reconnectedTitle: 'Back Online',
      reconnectedDesc: 'Network connection restored. Live features are active.',
      dismiss: 'Dismiss',
    },
    weather: {
      heading: '3-Day Weather & Packing Guide',
      subheading: 'Live atmospheric preview for destination planning and packing essentials',
      today: 'Today',
      tomorrow: 'Tomorrow',
      dayAfter: 'Day After',
      precipChance: 'Rain chance',
      highLow: 'High / Low',
      packingEssentials: 'Packing & Travel Essentials',
      refresh: 'Refresh forecast',
      liveNotice: 'Live Open-Meteo forecast',
      fallbackNotice: 'Seasonal atmospheric estimate',
      loading: 'Fetching weather...',
    },
  },
  kn: {
    nav: {
      overview: 'ಅವಲೋಕನ',
      planner: 'ಪ್ರವಾಸ ಯೋಜನೆ',
      map: 'ನಕ್ಷೆ ವೀಕ್ಷಣೆ',
      trips: 'ನನ್ನ ಪ್ರವಾಸಗಳು',
      wallet: 'ಪ್ರವಾಸ ವಾಲೆಟ್',
      coach: 'ವೆಚ್ಚ ಮಾರ್ಗದರ್ಶಿ',
      recovery: 'ಪ್ರವಾಸ ಹೊಂದಾಣಿಕೆ',
      chat: 'ಯಾತ್ರಿಕಾ ಜೊತೆ ಮಾತು',
    },
    hero: {
      taglineBadge: 'ಕರ್ನಾಟಕ — ಒಂದು ರಾಜ್ಯ, ಹಲವು ಜಗತ್ತುಗಳು · 31 ಜಿಲ್ಲೆಗಳು',
      trustBadge: 'ಕರ್ನಾಟಕ ಪ್ರವಾಸಿಗರಿಗಾಗಿ ರೂಪಿಸಲಾಗಿದೆ',
      titlePrefix: 'ಕರ್ನಾಟಕವನ್ನು ಅನ್ವೇಷಿಸಿ — ',
      brandName: 'ಯಾತ್ರಾ ಫಿಟ್ AI',
      description:
        'ನಿಮ್ಮ ನಂಬಿಕಸ್ಥ ಕರ್ನಾಟಕ ಪ್ರವಾಸ ಸಹಚರ. ಮೈಸೂರಿನ ಭವ್ಯ ಅರಮನೆಗಳಿಂದ ಹಂಪಿಯ ಐತಿಹಾಸಿಕ ಶಿಲ್ಪಕಲೆಗಳವರೆಗೆ, ಕೊಡಗಿನ ಮಂಜಿನ ಕಾಫಿ ತೋಟಗಳಿಂದ ಗೋಕರ್ಣದ ಕಡಲತೀರದವರೆಗೆ — ಯಾತ್ರಾ ಫಿಟ್ AI ನಿಖರ ಪ್ರಯಾಣದ ಸಮಯವನ್ನು ಲೆಕ್ಕಹಾಕಿ, ನಿಮ್ಮ ಬಜೆಟ್ ಮತ್ತು ಸುರಕ್ಷತೆಯನ್ನು ಕಾಪಾಡುತ್ತದೆ.',
      freedomTitle: 'ನಿಮ್ಮ ಪ್ರವಾಸ, ನಿಮ್ಮ ಆಯ್ಕೆ',
      freedomDesc:
        'ಯಾವುದೇ ಪೂರ್ವನಿಗದಿತ ಒತ್ತಡವಿಲ್ಲ. ನಿಮ್ಮಿಷ್ಟದ ಸ್ಥಳಗಳನ್ನು ನೀವೇ ಆಯ್ಕೆ ಮಾಡಿ ಅಥವಾ ಹೊಸದಾಗಿ ಆರಂಭಿಸಿ.',
      budgetTitle: 'ಸ್ಪಷ್ಟ ವೆಚ್ಚ ನಿರ್ವಹಣೆ',
      budgetDesc:
        'ವಾಲೆಟ್ ಹಣ, ಊಟ ಮತ್ತು ಇಂಧನ ವೆಚ್ಚಗಳ ಮೇಲೆ ನಿಗಾ ಇರಿಸಿ. ತುರ್ತು ನಿಧಿಯನ್ನು ಸುರಕ್ಷಿತವಾಗಿರಿಸಿ.',
      transitTitle: 'ನಿಖರ ರಸ್ತೆ ಮತ್ತು ಬಸ್ ಸಮಯ',
      transitDesc:
        'ಘಾಟಿ ರಸ್ತೆಗಳ ತಿರುವುಗಳು ಮತ್ತು ಹೆದ್ದಾರಿಗಳಿಗೆ ತಕ್ಕಂತೆ ವಾಹನ ಅಥವಾ ಕೆ.ಎಸ್.ಆರ್.ಟಿ.ಸಿ ಬಸ್ ಪ್ರಯಾಣದ ನಿಖರ ಸಮಯ.',
      recoveryTitle: 'ಹೊಂದಾಣಿಕೆಯ ಪ್ರವಾಸ',
      recoveryDesc:
        'ಅನಿರೀಕ್ಷಿತ ಮಳೆ ಅಥವಾ ಟ್ರಾಫಿಕ್ ಎದುರಾದರೆ ಸುಲಭವಾಗಿ ಉಳಿದ ಮಾರ್ಗವನ್ನು ಮರುಹೊಂದಿಸಿ.',
      ctaPlan: 'ನಿಮ್ಮ ಪ್ರವಾಸ ಆರಂಭಿಸಿ',
      ctaMap: '31 ಜಿಲ್ಲೆಗಳ ನಕ್ಷೆ ವೀಕ್ಷಿಸಿ',
      ctaChat: 'ಯಾತ್ರಿಕಾ ಜೊತೆ ಚಾಟ್ ಮಾಡಿ',
      ctaWallet: 'ಪ್ರವಾಸ ವಾಲೆಟ್',
      languageSelect: 'ಭಾಷೆ',
    },
    dashboard: {
      budgetHeading: 'ಪ್ರವಾಸದ ಬಜೆಟ್ ಮತ್ತು ವೆಚ್ಚಗಳು',
      budgetSub:
        'ಸ್ಪಷ್ಟ ಮತ್ತು ಪಾರದರ್ಶಕ ಲೆಕ್ಕಾಚಾರ. ಯೋಜಿತ ಬಜೆಟ್ ಮತ್ತು ತುರ್ತು ನಿಧಿ ಸದಾ ಸುರಕ್ಷಿತ.',
      openWallet: 'ವಾಲೆಟ್ ತೆರೆಯಿರಿ',
      plannedBudget: 'ಒಟ್ಟು ಯೋಜಿತ ಬಜೆಟ್',
      walletBalance: 'ವಾಲೆಟ್ ಶಿಲ್ಕು',
      remainingBudget: 'ಉಳಿದ ಬಜೆಟ್',
      emergencyReserve: 'ತುರ್ತು ನಿಧಿ',
      remainingCosts: 'ಅಂದಾಜು ಬಾಕಿ ವೆಚ್ಚ',
      timelineHeading: 'ಇಂದಿನ ಪ್ರವಾಸದ ವೇಳಾಪಟ್ಟಿ',
      departureFrom: 'ಪ್ರಾರಂಭದ ಸ್ಥಳ',
      returnBy: 'ಹಿಂತಿರುಗುವ ಸಮಯ',
      viewMap: 'ನಕ್ಷೆಯಲ್ಲಿ ಮಾರ್ಗ ನೋಡಿ',
      nextStop: 'ಮುಂದಿನ ತಾಣ',
      markCompleted: 'ತಾಣ ಮುಗಿದಿದೆ ಎಂದು ಗುರುತಿಸಿ',
      completed: 'ಮುಗಿದಿದೆ',
      complete: 'ಮುಗಿಸಿ',
      noStopsTitle: 'ಇನ್ನೂ ಯಾವುದೇ ತಾಣಗಳನ್ನು ಸೇರಿಸಿಲ್ಲ',
      noStopsDesc:
        'ಯಾವುದೇ ಒತ್ತಾಯದ ತಾಣಗಳಿಲ್ಲದೆ ಸ್ವತಂತ್ರವಾಗಿ ನಿಮ್ಮ ನೆಚ್ಚಿನ ಸ್ಥಳಗಳನ್ನು ಸೇರಿಸಿ.',
      addStopsBtn: 'ಯೋಜಕದಲ್ಲಿ ತಾಣಗಳನ್ನು ಸೇರಿಸಿ',
      exploreMapBtn: 'ಕರ್ನಾಟಕ ನಕ್ಷೆ ವೀಕ್ಷಿಸಿ',
      transitBreakdown: 'ಸಾರಿಗೆ ಮತ್ತು ಬಸ್ ದರದ ವಿವರ',
      vehicleFuelEstimates: 'ವಾಹನ ಮತ್ತು ಇಂಧನದ ವಿವರ',
      tripSafety: 'ಸುರಕ್ಷತೆ ಮತ್ತು ಮಾರ್ಗದರ್ಶನ',
      allClear: 'ನಿಮ್ಮ ಪ್ರಯಾಣದ ಎಲ್ಲಾ ವಿವರಗಳು ಸಮರ್ಪಕವಾಗಿವೆ',
      allClearDesc: (hours: number, reserve: number) =>
        `ನಿಮ್ಮ ಪ್ರವಾಸವು ${hours} ಗಂಟೆಗಳ ಒಳಗಡೆ ಮುಗಿಯುತ್ತದೆ ಮತ್ತು ₹${reserve.toLocaleString('en-IN')} ತುರ್ತು ನಿಧಿ ಸುರಕ್ಷಿತವಾಗಿದೆ.`,
      backToOverview: '← ಮುಖಪುಟಕ್ಕೆ ಹಿಂತಿರುಗಿ',
      activeNotices: (count: number) => `${count} ಸೂಚನೆಗಳು`,
    },
    common: {
      district: 'ಜಿಲ್ಲೆ',
      wallet: 'ವಾಲೆಟ್',
      remaining: 'ಉಳಿದಿರುವುದು',
      reserve: 'ತುರ್ತು ನಿಧಿ',
      travellers: 'ಪ್ರವಾಸಿಗರು',
    },
    network: {
      offlineTitle: 'ಆಫ್‌ಲೈನ್‌ ಆಗಿದ್ದೀರಿ',
      offlineDesc: 'ನಕ್ಷೆಗಳು ಮತ್ತು AI ವೈಶಿಷ್ಟ್ಯಗಳಿಗೆ ಅಂತರ್ಜಾಲ ಸಂಪರ್ಕದ ಅಗತ್ಯವಿದೆ. ಉಳಿಸಿದ ಪ್ರವಾಸಗಳು ಲಭ್ಯವಿವೆ.',
      reconnectedTitle: 'ಮರುಸಂಪರ್ಕಗೊಂಡಿದೆ',
      reconnectedDesc: 'ಅಂತರ್ಜಾಲ ಸಂಪರ್ಕ ಪುನರಾರಂಭಗೊಂಡಿದೆ. ಎಲ್ಲಾ ವೈಶಿಷ್ಟ್ಯಗಳು ಸಕ್ರಿಯವಾಗಿವೆ.',
      dismiss: 'ಮುಚ್ಚಿ',
    },
    weather: {
      heading: '3 ದಿನಗಳ ಹವಾಮಾನ ಮತ್ತು ಸಾಮಾನು ಸಲಹೆ',
      subheading: 'ನಿಮ್ಮ ಗಮ್ಯಸ್ಥಾನದ ಹವಾಮಾನ ಮುನ್ಸೂಚನೆ ಮತ್ತು ಅಗತ್ಯ ಸಾಮಗ್ರಿಗಳ ಪಟ್ಟಿ',
      today: 'ಇಂದು',
      tomorrow: 'ನಾಳೆ',
      dayAfter: 'ನಾಡಿದ್ದು',
      precipChance: 'ಮಳೆಯ ಸಾಧ್ಯತೆ',
      highLow: 'ಗರಿಷ್ಠ / ಕನಿಷ್ಠ',
      packingEssentials: 'ಪ್ರವಾಸಕ್ಕೆ ಅಗತ್ಯ ಸಾಮಗ್ರಿಗಳು',
      refresh: 'ಹವಾಮಾನ ನವೀಕರಿಸಿ',
      liveNotice: 'ನೇರ ಹವಾಮಾನ ಮುನ್ಸೂಚನೆ',
      fallbackNotice: 'ಋತುಮಾನದ ಅಂದಾಜು',
      loading: 'ಹವಾಮಾನ ಪಡೆಯಲಾಗುತ್ತಿದೆ...',
    },
  },
};
