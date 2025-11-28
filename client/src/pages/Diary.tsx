import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Lock, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth-context";
import { collection, query, where, onSnapshot } from "firebase/firestore";
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
    if (!currentUser?.uid) return;

    setLoading(true);
    const monthStart = format(startOfMonth(currentMonth), "yyyy-MM-dd");
    const monthEnd = format(endOfMonth(currentMonth), "yyyy-MM-dd");

    const moodsQuery = query(
      collection(db, "moods"),
      where("userId", "==", currentUser.uid),
      where("date", ">=", monthStart),
      where("date", "<=", monthEnd)
    );

    const unsubscribe = onSnapshot(moodsQuery, (snapshot) => {
      const moodsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MoodEntry));
      setMoods(moodsData);
      setLoading(false);
    }, (error) => {
      console.error("Error loading moods:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser, currentMonth]);

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
        <Card className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl sm:text-2xl font-display font-bold">
              {format(currentMonth, "MMMM yyyy")}
            </h2>
            <div className="flex gap-2">
              <Button size="icon" variant="outline" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button size="icon" variant="outline" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {/* Day headers */}
            {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
              <div key={`${day}-${i}`} className="text-center text-xs sm:text-sm font-semibold text-muted-foreground pb-2">
                {day}
              </div>
            ))}

            {/* Calendar days */}
            {emptyDays.map((_, index) => <div key={`empty-${index}`} />)}
            {daysInMonth.map((date) => {
              const mood = getMoodForDate(date);
              const isToday = isSameDay(date, new Date());
              const isCurrentMonth = isSameMonth(date, currentMonth);

              return (
                <MoodCell
                  key={date.toISOString()}
                  date={date}
                  mood={mood}
                  isToday={isToday}
                  isCurrentMonth={isCurrentMonth}
                  onClick={() => mood && setSelectedEntry(mood)}
                />
              );
            })}
          </div>
        </Card>
      </div>

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
                    <Globe className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <Lock className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </DialogHeader>
              <div className="py-4">
                <h4 className="font-semibold mb-2">What you wrote:</h4>
                <p className="text-foreground whitespace-pre-wrap">
                  {selectedEntry.reason ? `"${selectedEntry.reason}"` : "No reason was given."}
                </p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MoodCell({ date, mood, isToday, isCurrentMonth, onClick }: {
  date: Date;
  mood?: MoodEntry | null;
  isToday: boolean;
  isCurrentMonth: boolean;
  onClick: () => void;
}) {
  const dayNumber = format(date, "d");

  if (mood) {
    return (
      <motion.button
        onClick={onClick}
        className={`aspect-square rounded-lg sm:rounded-xl border transition-all hover-elevate active-elevate-2 cursor-pointer flex flex-col items-center justify-center text-center p-1 ${
          isToday ? "border-primary border-2" : "border-border"
        } ${!isCurrentMonth ? "opacity-40" : ""}`}
        style={{
          backgroundImage: `linear-gradient(135deg, ${getEmotionConfig(mood.emotion).color}20, ${getEmotionConfig(mood.emotion).color}40)`,
        }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <span className="text-lg sm:text-3xl">{EMOTION_EMOJIS[mood.emotion]}</span>
        <span className="text-[9px] sm:text-xs font-medium text-foreground/80">{dayNumber}</span>
        <div className="absolute bottom-0.5 right-0.5 sm:bottom-1 sm:right-1">
          {mood.isPublic ? (
            <Globe className="h-2 w-2 sm:h-2.5 sm:w-2.5 text-muted-foreground/60" />
          ) : (
            <Lock className="h-2 w-2 sm:h-2.5 sm:w-2.5 text-muted-foreground/60" />
          )}
        </div>
      </motion.button>
    );
  }

  return (
    <div
      className={`aspect-square rounded-lg sm:rounded-xl flex items-center justify-center text-center border ${isToday ? "border-primary border-2" : "border-border border-dashed"} ${!isCurrentMonth ? "opacity-40" : ""}`}>
      <span className={`text-xs sm:text-sm font-medium ${isToday ? "text-primary" : "text-muted-foreground"}`}>
        {dayNumber}
      </span>
    </div>
  );
}
