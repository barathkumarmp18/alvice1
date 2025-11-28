import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Bell, Heart, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import MoodCheckPopup from "@/components/MoodCheckPopup";
import { EnhancedCreatePostModal } from "@/components/EnhancedCreatePostModal";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { collection, query, orderBy, limit, getDocs, doc, getDoc, addDoc, setDoc, where, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getRandomSlogan } from "@/lib/emotion-slogans";
import { formatDistanceToNow } from "date-fns";
import type { Post, User, MoodEntry, EmotionType, GlobalEmotionData } from "@shared/schema";
import { useLocation } from "wouter";

const EMOTION_EMOJIS: Record<EmotionType, string> = {
  happiness: "😊",
  sadness: "😢",
  anger: "😠",
  calm: "😌",
  excitement: "🤩",
};

export default function Home() {
  const { userData, currentUser, todayMood } = useAuth(); // Use todayMood from context
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [showMoodPopup, setShowMoodPopup] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [posts, setPosts] = useState<(Post & { author?: User })[]>([]);
  const [moodSlogan, setMoodSlogan] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [globalEmotions, setGlobalEmotions] = useState<GlobalEmotionData[]>([]);

  useEffect(() => {
    if (todayMood) {
      setMoodSlogan(getRandomSlogan(todayMood.emotion));
    } else {
      setMoodSlogan("Tap to share how you're feeling today");
    }
  }, [todayMood]);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const moodsQuery = query(
        collection(db, "moods"),
        where("date", "==", today)
    );

    const unsubscribe = onSnapshot(moodsQuery, (snapshot) => {
        const emotionsCount: Record<EmotionType, number> = {
            happiness: 0,
            sadness: 0,
            anger: 0,
            calm: 0,
            excitement: 0,
        };
        let totalMoods = 0;

        snapshot.docs.forEach(doc => {
            const mood = doc.data() as MoodEntry;
            emotionsCount[mood.emotion]++;
            totalMoods++;
        });

        if (totalMoods === 0) {
            setGlobalEmotions([]);
            return;
        }

        const processedEmotions = (Object.entries(emotionsCount) as [EmotionType, number][])
            .map(([emotion, count]) => ({
                emotion,
                count,
                percentage: Math.round((count / totalMoods) * 100),
            }))
            .sort((a, b) => b.count - a.count);

        setGlobalEmotions(processedEmotions);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    const postsQuery = query(
      collection(db, "posts"),
      orderBy("createdAt", "desc"),
      limit(20)
    );

    const unsubscribePosts = onSnapshot(postsQuery, async (snapshot) => {
      const postsWithAuthors = await Promise.all(
        snapshot.docs.map(async (postDoc) => {
          const postData = { id: postDoc.id, ...postDoc.data() } as Post;
          const authorDoc = await getDoc(doc(db, "users", postData.authorId));
          const author = authorDoc.exists() ? { id: authorDoc.id, ...authorDoc.data() } as User : undefined;
          return { ...postData, author };
        })
      );
      setPosts(postsWithAuthors);
      setLoading(false);
    }, (error) => {
      console.error("Error loading posts:", error);
      setLoading(false);
    });

    return () => unsubscribePosts();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser || todayMood) return;

    const lastCheckinString = localStorage.getItem("lastMoodCheckin");
    const now = new Date().getTime();

    if (lastCheckinString) {
      const lastCheckin = parseInt(lastCheckinString, 10);
      const oneDay = 24 * 60 * 60 * 1000;
      if (now - lastCheckin < oneDay) {
        return;
      }
    }

    const timer = setTimeout(() => {
      setShowMoodPopup(true);
    }, 1500);

    return () => clearTimeout(timer);
  }, [currentUser, todayMood]);

  const handleSaveMood = async (emotion: EmotionType, reason: string, shouldPost: boolean) => {
    if (!currentUser) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      
      if (todayMood) {
        let editCount = todayMood.editCount || 0;

        if (todayMood.emotion !== emotion) {
            editCount++;
        }

        if (editCount > 3 && todayMood.emotion !== emotion) {
          toast({
            title: "Edit limit reached",
            description: "You can only change your mood 3 times per day.",
            variant: "destructive",
          });
          return;
        }
        
        await updateDoc(doc(db, "moods", todayMood.id), {
          emotion,
          reason,
          isPublic: shouldPost,
          editCount,
          updatedAt: new Date().toISOString(),
        });
      } else {
        const moodEntry: Omit<MoodEntry, 'id'> = {
          userId: currentUser.uid,
          emotion,
          reason,
          isPublic: shouldPost,
          date: today,
          editCount: 0,
          createdAt: new Date().toISOString(),
        };
        await addDoc(collection(db, "moods"), moodEntry);
      }
      
      await setDoc(doc(db, "users", currentUser.uid), {
        currentMood: emotion,
        lastMoodCheck: new Date().toISOString(),
      }, { merge: true });

      if (shouldPost && reason.trim()) {
        await addDoc(collection(db, "posts"), {
          authorId: currentUser.uid,
          type: "quick",
          title: `Feeling ${emotion}`,
          content: reason,
          images: [],
          tribeIds: [],
          likes: [],
          commentCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      localStorage.setItem("lastMoodCheckin", new Date().getTime().toString());

      if (reason.trim()) {
        toast({
          title: shouldPost ? "Posted successfully!" : "Note saved to diary",
          description: shouldPost 
            ? "Your feelings have been shared with the community" 
            : "Your diary entry has been updated",
        });
      }
    } catch (error: any) {
      toast({
        title: "Failed to save mood",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-md border-b border-border">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-2xl font-display font-bold bg-gradient-to-r from-emotion-happiness via-emotion-excitement to-emotion-calm bg-clip-text text-transparent">
            Alvice
          </h1>
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              className="relative hover-elevate active-elevate-2"
              onClick={() => navigate("/notifications")}
              data-testid="button-notifications"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full" />
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => setShowMoodPopup(true)}
          className="cursor-pointer hover-elevate active-elevate-2"
          data-testid="card-mood-display"
        >
          <Card className="p-6 border-2 bg-gradient-to-r from-card/80 via-card to-card/80 backdrop-blur-sm">
            <div className="flex items-center gap-6">
              <div className="text-7xl">
                {todayMood ? EMOTION_EMOJIS[todayMood.emotion] : "😐"}
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-display font-bold">
                  {userData?.displayName || "You"}
                </h3>
                <p className="text-base text-muted-foreground mt-1">
                  {moodSlogan}
                </p>
                {todayMood && todayMood.editCount !== undefined && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {todayMood.editCount < 3 ? `You can change your mood ${3 - todayMood.editCount} more time(s) today` : "Mood change limit reached for today"}
                  </p>
                )}
              </div>
            </div>
          </Card>
        </motion.div>

        <div className="space-y-4">
          <h2 className="text-xl font-display font-semibold">Your Feed</h2>
          
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="p-6 animate-pulse">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-muted rounded-full" />
                    <div className="flex-1 space-y-3">
                      <div className="h-4 bg-muted rounded w-1/4" />
                      <div className="h-4 bg-muted rounded w-full" />
                      <div className="h-4 bg-muted rounded w-3/4" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : posts.length > 0 ? (
            posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))
          ) : (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground">No posts yet. Be the first to share something!</p>
            </Card>
          )}
        </div>
      </div>

      <motion.button
        onClick={() => setShowCreatePost(true)}
        className="fixed bottom-24 right-6 w-16 h-16 rounded-full bg-gradient-to-r from-emotion-happiness to-emotion-excitement text-white shadow-2xl hover:shadow-xl transition-shadow z-30"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        data-testid="button-create-post"
      >
        <Plus className="h-8 w-8 mx-auto" />
      </motion.button>

      <MoodCheckPopup 
        open={showMoodPopup} 
        onClose={() => setShowMoodPopup(false)}
        onSaveMood={handleSaveMood}
        globalEmotions={globalEmotions}
        existingMood={todayMood}
      />
      <EnhancedCreatePostModal 
        isOpen={showCreatePost} 
        onClose={() => setShowCreatePost(false)}
        onPostCreated={() => {}} // No need to reload mood here anymore
      />
    </div>
  );
}

function PostCard({ post }: { post: Post & { author?: User } }) {
  return (
    <Card className="overflow-hidden hover-elevate active-elevate-2 cursor-pointer" data-testid={`post-${post.id}`}>
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={post.author?.photoURL} />
            <AvatarFallback>{post.author?.displayName?.[0] || "U"}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="font-semibold">{post.author?.displayName || "Unknown User"}</p>
            <p className="text-sm text-muted-foreground">
              @{post.author?.username} • {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-display font-semibold">{post.title}</h3>
          <p className="text-foreground whitespace-pre-wrap">{post.content}</p>
        </div>

        {post.images.length > 0 && (
          <div className={`grid gap-2 ${post.images.length === 1 ? "grid-cols-1" : post.images.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
            {post.images.map((image, index) => (
              <div key={index} className="relative aspect-square rounded-xl overflow-hidden bg-muted">
                <img src={image} alt={`Post image ${index + 1}`} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-6 pt-2">
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-2 hover-elevate active-elevate-2"
            data-testid={`button-like-${post.id}`}
          >
            <Heart className="h-5 w-5" />
            <span>{post.likes.length}</span>
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-2 hover-elevate active-elevate-2"
            data-testid={`button-comment-${post.id}`}>
            <MessageCircle className="h-5 w-5" />
            <span>{post.commentCount}</span>
          </Button>
        </div>
      </div>
    </Card>
  );
}
