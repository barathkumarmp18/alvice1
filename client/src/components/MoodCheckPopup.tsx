import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";
import type { EmotionType } from "@shared/schema";

const EMOTION_EMOJIS: Record<EmotionType, string> = {
  happiness: "😊",
  sadness: "😢",
  anger: "😠",
  calm: "😌",
  excitement: "🤩",
};

const EMOTION_PROMPTS: Record<EmotionType, string> = {
  happiness: "What made you happy today?",
  sadness: "What's making you feel sad?",
  anger: "What's bothering you?",
  calm: "What's bringing you peace?",
  excitement: "What's got you excited?",
};

interface GlobalEmotionData {
  emotion: EmotionType;
  count: number;
  percentage: number;
}

interface MoodCheckPopupProps {
  open: boolean;
  onClose: () => void;
  onSaveMood: (emotion: EmotionType, reason: string, shouldPost: boolean) => Promise<void>;
  globalEmotions?: GlobalEmotionData[];
}

export default function MoodCheckPopup({ 
  open, 
  onClose, 
  onSaveMood,
  globalEmotions = []
}: MoodCheckPopupProps) {
  const [step, setStep] = useState<"select" | "entry">("select");
  const [selectedEmotion, setSelectedEmotion] = useState<EmotionType | null>(null);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const handleEmotionSelect = (emotion: EmotionType) => {
    setSelectedEmotion(emotion);
    setStep("entry");
  };

  const handleClose = () => {
    onClose();
    resetState();
  };

  const handleSave = async (shouldPost: boolean) => {
    if (!selectedEmotion) return;
    
    setSaving(true);
    try {
      await onSaveMood(selectedEmotion, reason.trim() || "Just feeling this way", shouldPost);
      onClose();
      resetState();
    } catch (error) {
      console.error("Failed to save mood:", error);
    } finally {
      setSaving(false);
    }
  };

  const resetState = () => {
    setStep("select");
    setSelectedEmotion(null);
    setReason("");
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleSkip()}>
      <DialogContent className="sm:max-w-xl" data-testid="dialog-mood-check">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-display">How are you feeling?</DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSkip}
              data-testid="button-skip-mood"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {step === "select" && (
            <motion.div
              key="select"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-6 py-6"
            >
              <p className="text-center text-muted-foreground">
                Select an emoji that represents your current mood
              </p>
              <div className="grid grid-cols-5 gap-4">
                {Object.entries(EMOTION_EMOJIS).map(([emotion, emoji]) => (
                  <motion.button
                    key={emotion}
                    onClick={() => handleEmotionSelect(emotion as EmotionType)}
                    className="flex flex-col items-center gap-2 p-4 rounded-2xl hover-elevate active-elevate-2 transition-all"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    data-testid={`button-emotion-${emotion}`}
                  >
                    <span className="text-5xl">{emoji}</span>
                    <span className="text-xs capitalize text-muted-foreground">
                      {emotion}
                    </span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {step === "forecast" && selectedEmotion && (
            <motion.div
              key="forecast"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6 py-6"
            >
              <div className="flex items-center justify-center">
                <motion.div
                  initial={{ scale: 1 }}
                  animate={{ scale: 0.6 }}
                  transition={{ duration: 0.5 }}
                  className="text-6xl"
                >
                  {EMOTION_EMOJIS[selectedEmotion]}
                </motion.div>
              </div>

              <div className="space-y-4">
                <h3 className="text-center font-semibold text-lg">
                  Global Emotion Forecast
                </h3>
                <p className="text-center text-sm text-muted-foreground">
                  See how the world is feeling right now
                </p>

                <div className="grid grid-cols-2 gap-3">
                  {displayEmotions.slice(0, 4).map((emotionData, index) => (
                    <div
                      key={emotionData.emotion}
                      className={`p-4 rounded-xl border ${
                        emotionData.emotion === selectedEmotion
                          ? "border-primary bg-primary/5"
                          : "border-border bg-card"
                      }`}
                      data-testid={`forecast-emotion-${emotionData.emotion}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">
                          {EMOTION_EMOJIS[emotionData.emotion]}
                        </span>
                        <div className="flex-1">
                          <p className="text-sm font-medium capitalize">
                            {emotionData.emotion}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {emotionData.percentage > 0 
                              ? `${emotionData.percentage}% of users`
                              : "You're unique!"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleSkip}
                  className="flex-1"
                  data-testid="button-skip-entry"
                >
                  Skip
                </Button>
                <Button
                  onClick={handleContinueToEntry}
                  className="flex-1"
                  data-testid="button-continue-entry"
                >
                  Tell us more
                </Button>
              </div>
            </motion.div>
          )}

          {step === "entry" && selectedEmotion && (
            <motion.div
              key="entry"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6 py-6"
            >
              <div className="text-center space-y-2">
                <span className="text-5xl">{EMOTION_EMOJIS[selectedEmotion]}</span>
                <h3 className="font-semibold text-lg">
                  {EMOTION_PROMPTS[selectedEmotion]}
                </h3>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Share your thoughts</Label>
                <Textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Write about how you're feeling..."
                  className="min-h-32 resize-none"
                  maxLength={500}
                  data-testid="input-mood-reason"
                />
                <p className="text-xs text-muted-foreground text-right">
                  {reason.length}/500
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleSkip}
                  className="flex-1"
                  data-testid="button-skip-reason"
                >
                  Skip
                </Button>
                <Button
                  onClick={handleContinueToChoice}
                  disabled={!reason.trim() || reason.trim().length < 3}
                  className="flex-1"
                  data-testid="button-continue-choice"
                >
                  Continue
                </Button>
              </div>
              {reason.trim().length > 0 && reason.trim().length < 3 && (
                <p className="text-xs text-destructive text-center">
                  Please write at least 3 characters
                </p>
              )}
            </motion.div>
          )}

          {step === "choice" && selectedEmotion && (
            <motion.div
              key="choice"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6 py-6"
            >
              <div className="text-center space-y-2">
                <span className="text-5xl">{EMOTION_EMOJIS[selectedEmotion]}</span>
                <h3 className="font-semibold text-lg">Where should this go?</h3>
                <p className="text-sm text-muted-foreground">
                  Keep it private or share with the community
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={() => handleSave(false)}
                  disabled={saving}
                  className="h-24 flex flex-col gap-2"
                  data-testid="button-save-diary"
                >
                  <span className="text-2xl">📔</span>
                  <span>Save to Diary</span>
                  <span className="text-xs text-muted-foreground">Private entry</span>
                </Button>
                <Button
                  onClick={() => handleSave(true)}
                  disabled={saving}
                  className="h-24 flex flex-col gap-2"
                  data-testid="button-post-public"
                >
                  <span className="text-2xl">🌍</span>
                  <span>Post Publicly</span>
                  <span className="text-xs text-muted-foreground">
                    Share your feeling
                  </span>
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
