import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, ChevronLeft } from "lucide-react";
import type { EmotionType, MoodEntry, GlobalEmotionData } from "@shared/schema";

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
  const [displayEmotions, setDisplayEmotions] = useState<GlobalEmotionData[]>([]);

  useEffect(() => {
    if (open) {
      if (existingMood) {
        setSelectedEmotion(existingMood.emotion);
        setReason(existingMood.reason);
        setStep("entry");
      } else {
        resetState();
      }
    } else {
      setTimeout(resetState, 300);
    }
  }, [open, existingMood]);

  useEffect(() => {
    if (step === 'entry' && selectedEmotion) {
      let topEmotions = [...globalEmotions].sort((a,b) => b.count - a.count).slice(0, 3);
      const selectedInTop = topEmotions.some(e => e.emotion === selectedEmotion);
      const selectedData = globalEmotions.find(e => e.emotion === selectedEmotion);

      if (!selectedInTop && selectedData) {
          if (topEmotions.length < 3) {
              topEmotions.push(selectedData);
          } else {
              topEmotions[2] = selectedData; // Replace last item
          }
      }
      
      const uniqueEmotions = Array.from(new Set(topEmotions.map(e => e.emotion)))
          .map(emotion => topEmotions.find(e => e.emotion === emotion)!);

      setDisplayEmotions(uniqueEmotions.sort((a,b) => b.count - a.count));
    }
  }, [step, selectedEmotion, globalEmotions]);

  const handleEmotionSelect = (emotion: EmotionType) => {
    setSelectedEmotion(emotion);
    setStep("entry");
    onSaveMood(emotion, existingMood?.reason || "", existingMood?.isPublic || false).catch(error => {
      console.error("Immediate mood save failed:", error);
    });
  };

  const handleClose = () => {
    onClose();
  };

  const handleSaveReason = async (shouldPost: boolean) => {
    if (!selectedEmotion) return;
    
    setSaving(true);
    try {
      await onSaveMood(selectedEmotion, reason, shouldPost);
      handleClose();
    } catch (error) {
      console.error("Failed to save mood reason:", error);
    } finally {
      setSaving(false);
    }
  };

  const resetState = () => {
    setStep("select");
    setSelectedEmotion(null);
    setReason(existingMood?.reason || "");
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-mood-check">
        <div className="absolute right-4 top-4 z-10">
          <Button variant="ghost" size="icon" onClick={handleClose} className="h-8 w-8 rounded-full">
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
              <h3 className="text-2xl font-display font-semibold text-center pt-4">How are you feeling?</h3>
              <p className="text-center text-muted-foreground text-sm px-4">Your selection is saved instantly. You can add a note on the next page.</p>
              <div className="grid grid-cols-5 gap-2 sm:gap-4 px-4">
                {Object.entries(EMOTION_EMOJIS).map(([emotion, emoji]) => (
                  <motion.button
                    key={emotion}
                    onClick={() => handleEmotionSelect(emotion as EmotionType)}
                    className="flex flex-col items-center gap-2 p-2 sm:p-3 rounded-2xl hover-elevate active-elevate-2 transition-all"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    data-testid={`button-emotion-${emotion}`}
                  >
                    <span className="text-4xl sm:text-5xl">{emoji}</span>
                    <span className="text-xs capitalize text-muted-foreground hidden sm:block">{emotion}</span>
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
              className="space-y-4 py-6"
            >
              <div className="absolute left-4 top-4">
                <Button variant="ghost" size="icon" onClick={() => setStep('select')} className="h-8 w-8 rounded-full">
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              </div>
              
              <div className="text-center space-y-2 pt-8">
                <span className="text-6xl">{EMOTION_EMOJIS[selectedEmotion]}</span>
                <h3 className="font-semibold text-lg">{EMOTION_PROMPTS[selectedEmotion]}</h3>
                <p className="text-sm text-muted-foreground">Your mood is saved. You can add a note below.</p>
              </div>

              <motion.div 
                className="bg-accent/30 rounded-lg p-3 space-y-2 mx-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { delay: 0.2 } }}
              >
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center">Worldwide Emotion Forecast</p>
                {displayEmotions.length > 0 ? (
                  <div className={`grid grid-cols-${displayEmotions.length} gap-2`}>
                    {displayEmotions.map((data) => (
                      <div key={data.emotion} className="flex flex-col items-center gap-1 bg-background/50 rounded-md p-2">
                        <span className="text-2xl">{EMOTION_EMOJIS[data.emotion]}</span>
                        <span className="text-xs font-semibold">{data.percentage}%</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-2">Be the first to share today!</p>
                )}
              </motion.div>

              <div className="space-y-2 px-4">
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Write about how you're feeling... (optional)"
                  className="min-h-24 resize-none"
                  maxLength={500}
                  data-testid="input-mood-reason"
                />
                <p className="text-xs text-muted-foreground text-right">{reason.length}/500</p>
              </div>
              <div className="px-4">
                {reason.trim().length > 0 ? (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-3"
                    >
                      <p className="text-sm text-center text-muted-foreground">This note can be private or public.</p>
                      <div className="flex gap-3">
                        <Button variant="outline" onClick={() => handleSaveReason(false)} disabled={saving} className="flex-1 h-12 text-sm">
                          {saving ? "Saving..." : "Save to Diary"}
                        </Button>
                        <Button onClick={() => handleSaveReason(true)} disabled={saving} className="flex-1 h-12 text-sm bg-gradient-to-r from-emotion-happiness to-emotion-excitement">
                          {saving ? "Posting..." : "Post Publicly"}
                        </Button>
                      </div>
                  </motion.div>
                ) : (
                  <Button onClick={handleClose} className="w-full h-12 text-sm">
                    Done
                  </Button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
