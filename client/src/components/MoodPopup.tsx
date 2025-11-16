import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { emotionConfig, getEmotionConfig, type EmotionType } from "@/lib/emotion-utils";
import { EmotionIcon } from "@/components/EmotionIcon";
import { collection, addDoc, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";

interface MoodPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MoodPopup({ isOpen, onClose }: MoodPopupProps) {
  const [step, setStep] = useState<"select" | "stats" | "reason">("select");
  const [selectedEmotion, setSelectedEmotion] = useState<EmotionType | null>(null);
  const [reason, setReason] = useState("");
  const [globalStats, setGlobalStats] = useState<{ emotion: EmotionType; count: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const handleEmotionSelect = async (emotion: EmotionType) => {
    setSelectedEmotion(emotion);
    setLoading(true);

    try {
      // Fetch global mood stats for today
      const today = new Date().toISOString().split('T')[0];
      const moodsQuery = query(
        collection(db, "moods"),
        where("date", "==", today)
      );
      const snapshot = await getDocs(moodsQuery);
      
      const emotionCounts: Record<string, number> = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        emotionCounts[data.emotion] = (emotionCounts[data.emotion] || 0) + 1;
      });

      const stats = Object.entries(emotionCounts)
        .map(([emotion, count]) => ({ emotion: emotion as EmotionType, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);

      setGlobalStats(stats);
      setStep("stats");
    } catch (error) {
      console.error("Error fetching mood stats:", error);
      setStep("reason");
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    setStep("reason");
  };

  const handleSubmit = async (isPublic: boolean) => {
    if (!currentUser || !selectedEmotion) return;

    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];

      await addDoc(collection(db, "moods"), {
        userId: currentUser.uid,
        emotion: selectedEmotion,
        reason,
        isPublic,
        date: today,
        createdAt: new Date().toISOString(),
      });

      toast({
        title: "Mood saved!",
        description: isPublic ? "Your mood has been shared with your friends" : "Your mood has been saved to your diary",
      });

      onClose();
      resetState();
    } catch (error: any) {
      toast({
        title: "Failed to save mood",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetState = () => {
    setStep("select");
    setSelectedEmotion(null);
    setReason("");
    setGlobalStats([]);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", damping: 25 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg"
          >
            <Card className="p-6 relative overflow-hidden">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-full hover-elevate active-elevate-2"
                data-testid="button-close-mood"
              >
                <X className="h-5 w-5" />
              </button>

              <AnimatePresence mode="wait">
                {step === "select" && (
                  <motion.div
                    key="select"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div className="text-center space-y-2">
                      <h2 className="text-2xl font-display font-bold">How are you feeling today?</h2>
                      <p className="text-muted-foreground">Pick an emotion that best describes your mood</p>
                    </div>

                    <div className="grid grid-cols-5 gap-4">
                      {(Object.keys(emotionConfig) as EmotionType[]).map((emotion) => {
                        const config = getEmotionConfig(emotion);
                        return (
                          <motion.button
                            key={emotion}
                            onClick={() => handleEmotionSelect(emotion)}
                            className="flex flex-col items-center gap-2 p-4 rounded-2xl hover-elevate active-elevate-2"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            data-testid={`button-emotion-${emotion}`}
                          >
                            <div className="animate-float">
                              <EmotionIcon emotion={emotion} size={48} />
                            </div>
                            <span className="text-xs font-medium text-center">{config.label}</span>
                          </motion.button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

                {step === "stats" && selectedEmotion && (
                  <motion.div
                    key="stats"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div className="text-center space-y-4">
                      <motion.div
                        className="inline-block"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1, rotate: 360 }}
                        transition={{ type: "spring", damping: 10 }}
                      >
                        <EmotionIcon emotion={selectedEmotion} size={72} />
                      </motion.div>
                      <h2 className="text-2xl font-display font-bold">Today's Mood Snapshot</h2>
                      <p className="text-muted-foreground">See how others are feeling</p>
                    </div>

                    <div className="space-y-3">
                      <p className="text-sm font-medium text-muted-foreground">Top 3 Moods Today</p>
                      {globalStats.length > 0 ? (
                        globalStats.map((stat) => {
                          const config = getEmotionConfig(stat.emotion);
                          return (
                            <div
                              key={stat.emotion}
                              className="flex items-center gap-3 p-3 rounded-xl bg-accent/50"
                            >
                              <EmotionIcon emotion={stat.emotion} size={24} />
                              <span className="font-medium flex-1">{config.label}</span>
                              <span className="text-sm text-muted-foreground">{stat.count} people</span>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Be the first to share your mood today!
                        </p>
                      )}
                    </div>

                    <Button
                      onClick={handleContinue}
                      className="w-full h-12 bg-gradient-to-r from-emotion-happiness to-emotion-excitement"
                      data-testid="button-continue-stats"
                    >
                      Continue
                    </Button>
                  </motion.div>
                )}

                {step === "reason" && selectedEmotion && (
                  <motion.div
                    key="reason"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div className="text-center space-y-2">
                      <div className="mb-4 flex justify-center">
                        <EmotionIcon emotion={selectedEmotion} size={56} />
                      </div>
                      <h2 className="text-2xl font-display font-bold">What made you feel this way?</h2>
                      <p className="text-muted-foreground">Share your thoughts</p>
                    </div>

                    <Textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="I'm feeling this way because..."
                      className="min-h-32 resize-none text-base"
                      maxLength={300}
                      data-testid="input-mood-reason"
                    />
                    <p className="text-sm text-muted-foreground text-right">{reason.length}/300</p>

                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        onClick={() => handleSubmit(false)}
                        disabled={!reason.trim() || loading}
                        variant="outline"
                        className="h-12"
                        data-testid="button-keep-private"
                      >
                        Keep Private
                      </Button>
                      <Button
                        onClick={() => handleSubmit(true)}
                        disabled={!reason.trim() || loading}
                        className="h-12 bg-gradient-to-r from-emotion-happiness to-emotion-excitement"
                        data-testid="button-post-publicly"
                      >
                        Post Publicly
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
