import type { EmotionType } from "@shared/schema";

export const EMOTION_SLOGANS: Record<EmotionType, string[]> = {
  happiness: [
    "Spreading joy, one smile at a time ✨",
    "Today's forecast: 100% happiness",
    "Living my best life right now",
    "Positive vibes only today",
    "Grateful for this beautiful moment",
  ],
  sadness: [
    "It's okay to not be okay",
    "Tomorrow is a new day",
    "Taking time to heal and grow",
    "This too shall pass",
    "Be gentle with yourself today",
  ],
  anger: [
    "Channeling this energy productively",
    "Standing up for what matters",
    "Processing these strong feelings",
    "Finding my calm in the storm",
    "Taking a moment to breathe",
  ],
  calm: [
    "Finding peace in the present moment",
    "Zen mode activated",
    "Embracing the stillness within",
    "In harmony with myself today",
    "Peaceful mind, peaceful life",
  ],
  excitement: [
    "Can't contain this energy!",
    "Living for these moments",
    "The best is yet to come",
    "Embracing all the possibilities",
    "Adventure mode: ON",
  ],
};

export function getRandomSlogan(emotion: EmotionType): string {
  const slogans = EMOTION_SLOGANS[emotion];
  return slogans[Math.floor(Math.random() * slogans.length)];
}
