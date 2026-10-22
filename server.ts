import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { KARNATAKA_DESTINATIONS } from './src/data/karnatakaDestinations.ts';
import {
  buildDeterministicItinerary,
  buildRecoveryProposal,
  generateDeterministicSpendingRecommendations,
  simulateWhatIfScenario,
} from './src/utils/finance.ts';
import type {
  RecoveryInput,
  Transaction,
  TravellerPreferences,
  Trip,
  WhatIfScenarioInput,
} from './src/types/travel.ts';

dotenv.config();

const PORT = 3000;

function getGenAIClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function callGeminiWithRetry<T>(
  fn: (ai: GoogleGenAI) => Promise<T>
): Promise<{ data: T | null; error?: string }> {
  const ai = getGenAIClient();
  if (!ai) {
    return {
      data: null,
      error: 'GEMINI_API_KEY is not configured on the server; using deterministic planner.',
    };
  }
  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error('AI response timed out after 30 seconds; using deterministic engine.')),
        30000
      )
    );
    const result = await Promise.race([fn(ai), timeoutPromise]);
    return { data: result };
  } catch (err: any) {
    console.warn('Gemini API request note:', err?.message || err);
    return {
      data: null,
      error: err?.message || 'Gemini API request failed; fell back to deterministic engine.',
    };
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '512kb' }));

  // 1. POST /api/ai/plan — AI Itinerary Planner with deterministic validation
  app.post('/api/ai/plan', async (req, res) => {
    try {
      const preferences = req.body?.preferences as TravellerPreferences;
      const transactions = (req.body?.transactions || []) as Transaction[];

      if (!preferences || !preferences.targetDistrict || !preferences.plannedBudgetInr) {
        res.status(400).json({ error: 'Invalid trip preferences payload.' });
        return;
      }

      const candidateDestinations = KARNATAKA_DESTINATIONS.filter(
        (d) =>
          d.district.toLowerCase() === preferences.targetDistrict.toLowerCase() &&
          !preferences.avoidIds?.includes(d.id)
      );

      const pool =
        candidateDestinations.length > 0
          ? candidateDestinations
          : KARNATAKA_DESTINATIONS.slice(0, 8);

      const { data: aiPlan, error: aiError } = await callGeminiWithRetry(async (ai) => {
        const prompt = `You are Yaatra Fit AI, an expert Karnataka travel planner.
Select and order the most realistic stops from this verified candidate list for a ${preferences.travellerStyle} trip in ${preferences.targetDistrict}:
Candidates: ${JSON.stringify(
          pool.map((c) => ({
            id: c.id,
            name: c.name,
            categories: c.categories,
            visitMins: c.expectedVisitMinutes,
            entryInr: c.entryFeeInrPerPerson,
            seniorFriendly: c.seniorFriendly,
          }))
        )}
Traveller preferences:
- Count: ${preferences.travellerCount}
- Total Planned Budget: ₹${preferences.plannedBudgetInr} (Emergency Reserve: ₹${preferences.emergencyReserveInr})
- Duration: ${preferences.tripDurationHours} hours
- Mode: ${preferences.transportMode}
- Pace: ${preferences.travelPace}
- Interests: ${preferences.interests.join(', ')}
- Must Visit IDs: ${preferences.mustVisitIds.join(', ') || 'None'}

Do NOT invent attraction IDs outside the candidate list. Return a concise summary explaining why this sequence fits their budget, vehicle, and deadline.`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            systemInstruction:
              'Return valid JSON matching the schema. Only select attraction IDs provided in the candidate list.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                selectedAttractionIds: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                aiSummary: {
                  type: Type.STRING,
                },
              },
              required: ['selectedAttractionIds', 'aiSummary'],
            },
          },
        });

        const parsed = JSON.parse((response.text || '{}').trim());
        if (!Array.isArray(parsed.selectedAttractionIds)) {
          throw new Error('Malformed selectedAttractionIds');
        }
        return parsed as { selectedAttractionIds: string[]; aiSummary: string };
      });

      const validIds = aiPlan?.selectedAttractionIds?.filter((id) =>
        KARNATAKA_DESTINATIONS.some((d) => d.id === id)
      );

      const trip = buildDeterministicItinerary(
        preferences,
        transactions,
        validIds,
        aiPlan?.aiSummary
      );

      res.json({
        trip,
        aiUsed: Boolean(aiPlan),
        aiNotice: aiError || null,
      });
    } catch (err: any) {
      res.status(500).json({
        error: err?.message || 'Failed to generate trip plan.',
      });
    }
  });

  // 2. POST /api/ai/spending-coach — AI Spending Coach + deterministic caps
  app.post('/api/ai/spending-coach', async (req, res) => {
    try {
      const trip = req.body?.trip as Trip;
      const transactions = (req.body?.transactions || []) as Transaction[];

      if (!trip || !trip.preferences) {
        res.status(400).json({ error: 'Missing trip state.' });
        return;
      }

      const deterministic = generateDeterministicSpendingRecommendations(
        trip,
        transactions
      );

      const { data: aiAdvice, error: aiError } = await callGeminiWithRetry(async (ai) => {
        const prompt = `You are the Yaatra Fit AI Spending Coach.
District: ${trip.preferences.targetDistrict}
Travellers: ${trip.preferences.travellerCount} (${trip.preferences.travellerStyle})
Food preference: ${trip.preferences.foodPreference}
Safe discretionary pool after emergency reserve & return fuel: ₹${deterministic.safeDiscretionaryPoolInr}
Return fuel commitment: ₹${deterministic.returnFuelCommitmentInr}

Provide a brief, practical 2-sentence coaching insight tailored to ${trip.preferences.targetDistrict} on how to get the best local food & cultural value without touching their return fuel or emergency reserve.`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                coachHeadline: { type: Type.STRING },
                localSavingTip: { type: Type.STRING },
              },
              required: ['coachHeadline', 'localSavingTip'],
            },
          },
        });
        return JSON.parse((response.text || '{}').trim()) as {
          coachHeadline: string;
          localSavingTip: string;
        };
      });

      res.json({
        ...deterministic,
        coachHeadline:
          aiAdvice?.coachHeadline ||
          `You have ₹${deterministic.safeDiscretionaryPoolInr.toLocaleString('en-IN')} available for discretionary food & activities after locking return transit and emergency reserve.`,
        localSavingTip:
          aiAdvice?.localSavingTip ||
          `Opt for authentic ${trip.preferences.targetDistrict} darshinis and ASI combined tickets to preserve your ₹${trip.preferences.emergencyReserveInr.toLocaleString('en-IN')} reserve.`,
        aiUsed: Boolean(aiAdvice),
        aiNotice: aiError || null,
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to run spending coach.' });
    }
  });

  // 3. POST /api/ai/recover — Yaatra Fit AI Adaptive Trip Recovery Engine
  app.post('/api/ai/recover', async (req, res) => {
    try {
      const trip = req.body?.trip as Trip;
      const transactions = (req.body?.transactions || []) as Transaction[];
      const trigger = req.body?.trigger as RecoveryInput;

      if (!trip || !trigger) {
        res.status(400).json({ error: 'Missing trip or recovery trigger.' });
        return;
      }

      const proposal = buildRecoveryProposal(trip, transactions, trigger);

      const { data: aiRecoveryNarrative, error: aiError } = await callGeminiWithRetry(
        async (ai) => {
          const prompt = `Explain this itinerary recovery clearly to the traveller in 2-3 sentences:
Trigger reason: ${trigger.reason}, Lost time: ${trigger.lostMinutes} mins, Extra spent: ₹${trigger.extraSpentInr}, Weather: ${trigger.weatherCondition}.
Retained stops: ${proposal.retainedStops.map((s) => s.name).join(', ') || 'None'}.
Skipped stops: ${proposal.skippedStops.map((s) => s.name).join(', ') || 'None'}.
Replacement stops: ${proposal.replacementStops.map((s) => s.name).join(', ') || 'None'}.
Feasible within deadline & reserve: ${proposal.isFeasible}.`;

          const response = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  explanationSummary: { type: Type.STRING },
                },
                required: ['explanationSummary'],
              },
            },
          });
          return JSON.parse((response.text || '{}').trim()) as {
            explanationSummary: string;
          };
        }
      );

      if (aiRecoveryNarrative?.explanationSummary) {
        proposal.explanationSummary = aiRecoveryNarrative.explanationSummary;
        proposal.generationSource = 'gemini_ai';
      }

      res.json({
        proposal,
        aiUsed: Boolean(aiRecoveryNarrative),
        aiNotice: aiError || null,
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to compute trip recovery.' });
    }
  });

  // 4. POST /api/ai/what-if — What-If Scenario Simulator
  app.post('/api/ai/what-if', async (req, res) => {
    try {
      const trip = req.body?.trip as Trip;
      const transactions = (req.body?.transactions || []) as Transaction[];
      const scenario = req.body?.scenario as WhatIfScenarioInput;

      if (!trip || !scenario) {
        res.status(400).json({ error: 'Missing trip or scenario input.' });
        return;
      }

      const result = simulateWhatIfScenario(trip, transactions, scenario);
      res.json({ result });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to simulate scenario.' });
    }
  });

  // 5. POST /api/ai/chat — Ytrika AI Travel Companion Chatbot
  app.post('/api/ai/chat', async (req, res) => {
    try {
      const messages = (req.body?.messages || []) as Array<{
        role: 'user' | 'model';
        text: string;
      }>;
      const context = req.body?.context;

      if (!Array.isArray(messages) || messages.length === 0) {
        res.status(400).json({ error: 'At least one message is required.' });
        return;
      }

      const systemInstruction = `You are Ytrika (ಯಾತ್ರಿಕಾ), an expert, warm, and highly knowledgeable Karnataka travel companion in the Yaatra Fit AI app.
You guide travellers across all 31 districts of Karnataka—from heritage circuits like Mysuru, Hampi, Badami, and Belur-Halebeedu, to the Western Ghats (Coorg, Chikkamagaluru, Agumbe, Sakleshpur), coastal Karavali (Gokarna, Murudeshwara, Udupi, Mangaluru), and northern circuits (Bijapur Gol Gumbaz, Bidar, Pattadakal).

You know:
1. Authentic local food recommendations (Mylari Dosa in Mysuru, Jolada Rotti in North Karnataka, Mangalore Buns & Neer Dosa on the coast, Pandi Curry in Coorg, Benne Dosa in Davanagere).
2. Ghat road conditions and scenic passes (Charmadi Ghat, Shiradi Ghat, Agumbe Sunset Point, Bisle Ghat).
3. Public transport (KSRTC Airavat, Rajahamsa, Sarige buses) and realistic travel times accounting for ghat twists and monsoon traffic.
4. Financial safety: Always encourage preserving emergency reserves and return transit money.
5. Tone: Warm, helpful, encouraging, and local. You can sprinkle polite Kannada phrases where appropriate (e.g. "Namaskara! / ನಮಸ್ಕಾರ", "Shubha Prayana! / ಶುಭ ಪ್ರಯಾಣ").

Current traveller context:
${context ? JSON.stringify(context, null, 2) : 'None provided'}
`;

      const { data: replyText, error: aiError } = await callGeminiWithRetry(
        async (ai) => {
          // Gemini multi-turn conversation must begin with a user message
          const firstUserIdx = messages.findIndex((m) => m.role === 'user');
          const validHistory = firstUserIdx >= 0 ? messages.slice(firstUserIdx) : messages;

          const contents = validHistory.map((m) => ({
            role: m.role,
            parts: [{ text: m.text }],
          }));

          const response = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents,
            config: {
              systemInstruction,
            },
          });

          return (response.text || '').trim();
        }
      );

      if (replyText) {
        res.json({
          reply: replyText,
          aiUsed: true,
        });
        return;
      }

      // Fallback deterministic Ytrika assistant if Gemini is offline or unkeyed
      const lastUserMsg = (messages[messages.length - 1]?.text || '').toLowerCase();
      let fallback = `Namaskara! I am Ytrika, your Karnataka travel guide. `;
      if (lastUserMsg.includes('food') || lastUserMsg.includes('eat') || lastUserMsg.includes('dosa')) {
        fallback += `For authentic Karnataka food, don't miss Original Mylari Dosa in Mysuru (Nazarbad), Jolada Rotti meals in Hubballi-Dharwad, or Mangalore Buns & Neer Dosa along the Karavali coast. Remember to keep discretionary snacks within your daily food allowance!`;
      } else if (lastUserMsg.includes('ghat') || lastUserMsg.includes('road') || lastUserMsg.includes('drive')) {
        fallback += `When traversing the Western Ghats (Charmadi, Shiradi, or Agumbe), drive with low gear descent and anticipate mist or sudden showers. Check brake pads and allow 25% extra buffer time for hairpin bends.`;
      } else if (lastUserMsg.includes('bus') || lastUserMsg.includes('transit') || lastUserMsg.includes('fare')) {
        fallback += `KSRTC operates reliable Sarige, Rajahamsa, and Airavat buses connecting all major taluks. Remember that public transit charges are capped based on distance, so you don't have to calculate vehicle fuel!`;
      } else if (lastUserMsg.includes('budget') || lastUserMsg.includes('wallet') || lastUserMsg.includes('cost')) {
        fallback += `In Yaatra Fit AI, your planned budget is strictly protected with an emergency reserve and locked return transit. Never spend into your return travel funds!`;
      } else {
        fallback += `Whether you are visiting royal Mysuru, the boulders of Hampi, or the misty hills of Coorg, plan your stops realistically so you return safely before your evening deadline. How else can I assist your Karnataka journey today?`;
      }

      res.json({
        reply: fallback,
        aiUsed: false,
        aiNotice: aiError || null,
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Ytrika chat failed.' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Yaatra Fit AI server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
