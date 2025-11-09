import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Lock, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth-context";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getEmotionConfig } from "@/lib/emotion-utils";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths } from "date-fns";
import type { MoodEntry, EmotionType } from "@shared/schema";

const EMOTION_EMOJIS: Record<EmotionType, string> = {
  happiness: "😊",
  sadness: "😢",
  anger: "😠",
  calm: "😌",
  excitement: "🤩",
};

export default function Diary() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [moods, setMoods] = useState<MoodEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<MoodEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();

  useEffect(() => {
    if (currentUser) {
      loadMoods();
    }
  }, [currentUser, currentMonth]);

  const loadMoods = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      const monthStart = format(startOfMonth(currentMonth), "yyyy-MM-dd");
      const monthEnd = format(endOfMonth(currentMonth), "yyyy-MM-dd");

      const moodsQuery = query(
        collection(db, "moods"),
        where("userId", "==", currentUser.uid),
        where("date", ">=", monthStart),
        where("date", "<=", monthEnd)
      );

      const snapshot = await getDocs(moodsQuery);
      const moodsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MoodEntry));
      setMoods(moodsData);
    } catch (error) {
      console.error("Error loading moods:", error);
    } finally {
      setLoading(false);
    }
  };

  const getMoodForDate = (date: Date) => {
    const dateString = format(date, "yyyy-MM-dd");
    return moods.find(mood => mood.date === dateString);
  };

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const firstDayOfMonth = startOfMonth(currentMonth).getDay();
  const emptyDays = Array(firstDayOfMonth).fill(null);

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-md border-b border-border">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-2xl font-display font-bold">Diary</h1>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <Card className="p-6">
          {/* Calendar header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-display font-bold">
              {format(currentMonth, "MMMM yyyy")}
            </h2>
            <div className="flex gap-2">
              <Button
                size="icon"
                variant="outline"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="hover-elevate active-elevate-2"
                data-testid="button-prev-month"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="hover-elevate active-elevate-2"
                data-testid="button-next-month"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Calendar grid */}
          <div className="space-y-4">
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="text-center text-sm font-semibold text-muted-foreground py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7 gap-2">
              {emptyDays.map((_, index) => (
                <div key={`empty-${index}`} className="aspect-square" />
              ))}

              {daysInMonth.map((date) => {
                const mood = getMoodForDate(date);
                const isToday = isSameDay(date, new Date());
                const isCurrentMonth = isSameMonth(date, currentMonth);

                return mood ? (
                  <FlickeringMoodCell
                    key={date.toISOString()}
                    date={date}
                    mood={mood}
                    isToday={isToday}
                    isCurrentMonth={isCurrentMonth}
                    onClick={() => setSelectedEntry(mood)}
                  />
                ) : (
                  <motion.div
                    key={date.toISOString()}
                    className={`aspect-square rounded-xl border bg-card flex items-center justify-center ${
                      isToday ? "border-primary border-2" : "border-border"
                    } ${!isCurrentMonth ? "opacity-40" : ""}`}
                    data-testid={`date-${format(date, "yyyy-MM-dd")}`}
                  >
                    <span className={`text-sm font-medium ${isToday ? "text-primary" : ""}`}>
                      {format(date, "d")}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Mood legend */}
          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-sm font-medium text-muted-foreground mb-3">Your Mood Colors</p>
            <div className="flex flex-wrap gap-3">
              {["happiness", "sadness", "anger", "calm", "excitement"].map((emotion) => (
                <div key={emotion} className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: getEmotionConfig(emotion as any).color }}
                  />
                  <span className="text-sm capitalize">{emotion}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Entry detail dialog */}
      <Dialog open={!!selectedEntry} onOpenChange={() => setSelectedEntry(null)}>
        <DialogContent data-testid="dialog-diary-entry">
          {selectedEntry && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle className="flex items-center gap-3">
                    <span className="text-4xl">{EMOTION_EMOJIS[selectedEntry.emotion]}</span>
                    <div>
                      <div className="text-2xl font-display capitalize">{selectedEntry.emotion}</div>
                      <div className="text-sm text-muted-foreground font-normal">
                        {format(new Date(selectedEntry.date), "MMMM d, yyyy")}
                      </div>
                    </div>
                  </DialogTitle>
                  {selectedEntry.isPublic ? (
                    <Globe className="h-5 w-5 text-muted-foreground" data-testid="icon-public" />
                  ) : (
                    <Lock className="h-5 w-5 text-muted-foreground" data-testid="icon-private" />
                  )}
                </div>
              </DialogHeader>

              <div className="py-4">
                <h4 className="font-semibold mb-2">What you wrote:</h4>
                <p className="text-foreground whitespace-pre-wrap">&quot;{selectedEntry.reason}&quot;</p>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {selectedEntry.isPublic ? (
                  <span className="flex items-center gap-1">
                    <Globe className="h-3 w-3" />
                    Shared publicly
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Lock className="h-3 w-3" />
                    Kept private
                  </span>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FlickeringMoodCell({
  date,
  mood,
  isToday,
  isCurrentMonth,
  onClick,
}: {
  date: Date;
  mood: MoodEntry;
  isToday: boolean;
  isCurrentMonth: boolean;
  onClick: () => void;
}) {
  const [wavePhase, setWavePhase] = useState(0);

  useEffect(() => {
    // Slow wave animation - changes phase gradually
    const interval = setInterval(() => {
      setWavePhase(prev => (prev + 1) % 4);
    }, 2000); // 2 seconds per phase

    return () => clearInterval(interval);
  }, []);

  const emojiScale = wavePhase === 0 ? 1.1 : wavePhase === 1 ? 1.05 : wavePhase === 2 ? 1.0 : 1.05;
  const emojiOpacity = wavePhase === 0 ? 1 : wavePhase === 1 ? 0.9 : wavePhase === 2 ? 0.8 : 0.9;

  return (
    <motion.button
      onClick={onClick}
      className={`aspect-square rounded-xl border transition-all hover-elevate active-elevate-2 cursor-pointer relative overflow-hidden flex flex-col ${
        isToday ? "border-primary border-2" : "border-border"
      } ${!isCurrentMonth ? "opacity-40" : ""}`}
      style={{
        backgroundImage: `linear-gradient(135deg, ${getEmotionConfig(mood.emotion).color}20, ${getEmotionConfig(mood.emotion).color}40)`,
      }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      data-testid={`date-${format(date, "yyyy-MM-dd")}`}
    >
      {/* Emoji at top with wave animation */}
      <motion.div 
        className="text-2xl pt-1"
        animate={{ 
          scale: emojiScale,
          opacity: emojiOpacity
        }}
        transition={{ duration: 2, ease: "easeInOut" }}
      >
        {EMOTION_EMOJIS[mood.emotion]}
      </motion.div>
      
      {/* Date number below */}
      <div className="flex-1 flex items-center justify-center">
        <span className={`text-xl font-display font-bold ${isToday ? "text-primary" : "text-foreground"}`}>
          {format(date, "d")}
        </span>
      </div>

      {/* Privacy indicator */}
      <div className="absolute bottom-1 right-1">
        {mood.isPublic ? (
          <Globe className="h-2.5 w-2.5 text-muted-foreground" />
        ) : (
          <Lock className="h-2.5 w-2.5 text-muted-foreground" />
        )}
      </div>
    </motion.button>
  );
}
