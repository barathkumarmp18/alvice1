import type { EmotionType } from "@shared/schema";
import { Smile, Frown, Angry, Wind, Zap } from "lucide-react";

export const emotionConfig = {
  happiness: {
    color: "#FFD166",
    icon: Smile,
    label: "Happy",
    gradient: "from-yellow-400 to-orange-300",
  },
  sadness: {
    color: "#118AB2",
    icon: Frown,
    label: "Sad",
    gradient: "from-blue-400 to-blue-600",
  },
  anger: {
    color: "#EF476F",
    icon: Angry,
    label: "Angry",
    gradient: "from-red-400 to-pink-500",
  },
  calm: {
    color: "#06D6A0",
    icon: Wind,
    label: "Calm",
    gradient: "from-green-300 to-teal-400",
  },
  excitement: {
    color: "#F3722C",
    icon: Zap,
    label: "Excited",
    gradient: "from-orange-400 to-red-500",
  },
} as const;

export function getEmotionConfig(emotion: EmotionType) {
  return emotionConfig[emotion];
}

export function getEmotionColor(emotion: EmotionType) {
  return emotionConfig[emotion].color;
}

export function getEmotionIcon(emotion: EmotionType) {
  return emotionConfig[emotion].icon;
}

export function getEmotionGradient(emotion: EmotionType) {
  return emotionConfig[emotion].gradient;
}
