import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";
import type { EmotionType, MoodEntry } from "@shared/schema";

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
  existingMood?: MoodEntry | null;
}

export default function MoodCheckPopup({ 
  open, 
  onClose, 
  onSaveMood,
  globalEmotions = [],
  existingMood
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
    
    // Check if user has written a reason
    if (!reason.trim()) {
      return; // Don't save if no reason provided
    }
    
    setSaving(true);
    try {
      await onSaveMood(selectedEmotion, reason.trim(), shouldPost);
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
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-xl" data-testid="dialog-mood-check">
        <div className="absolute right-4 top-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="h-8 w-8"
            data-testid="button-close-mood"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <AnimatePresence mode="wait">
          {step === "select" && (
            <motion.div
              key="select"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-6 py-6"
            >
              <h3 className="text-2xl font-display font-semibold text-center">How are you feeling?</h3>
              <p className="text-center text-muted-foreground text-sm">
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

          {step === "entry" && selectedEmotion && (
            <motion.div
              key="entry"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6 py-6"
            >
              <div className="text-center space-y-2">
                <span className="text-6xl">{EMOTION_EMOJIS[selectedEmotion]}</span>
                <h3 className="font-semibold text-lg">
                  {EMOTION_PROMPTS[selectedEmotion]}
                </h3>
              </div>

              <div className="space-y-2">
                <Textarea
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

              {/* Show buttons only after user types something */}
              {reason.trim().length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-3"
                >
                  <p className="text-sm text-center text-muted-foreground">What would you like to do?</p>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => handleSave(false)}
                      disabled={saving}
                      className="flex-1 h-14 text-base"
                      data-testid="button-add-to-diary"
                    >
                      Add to Diary
                    </Button>
                    <Button
                      onClick={() => handleSave(true)}
                      disabled={saving}
                      className="flex-1 h-14 text-base bg-gradient-to-r from-emotion-happiness to-emotion-excitement"
                      data-testid="button-post"
                    >
                      Post
                    </Button>
                  </div>
                  <p className="text-xs text-center text-muted-foreground">
                    Diary is private • Post is public
                  </p>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
