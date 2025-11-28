import type { EmotionType } from "@shared/schema";
import { getEmotionConfig } from "@/lib/emotion-utils";

interface EmotionIconProps {
  emotion: EmotionType;
  size?: number;
  className?: string;
}

export function EmotionIcon({ emotion, size = 24, className = "" }: EmotionIconProps) {
  const config = getEmotionConfig(emotion);
  const Icon = config.icon;
  
  return (
    <Icon 
      className={className} 
      size={size}
      style={{ color: config.color }}
    />
  );
}
