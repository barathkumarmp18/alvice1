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
import { collection, query, orderBy, limit, getDocs, doc, getDoc, addDoc, setDoc, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getRandomSlogan } from "@/lib/emotion-slogans";
import { formatDistanceToNow } from "date-fns";
import type { Post, User, MoodEntry, EmotionType } from "@shared/schema";

const EMOTION_EMOJIS: Record<EmotionType, string> = {
  happiness: "😊",
  sadness: "😢",
  anger: "😠",
  calm: "😌",
  excitement: "🤩",
};

export default function Home() {
  const { userData, currentUser } = useAuth();
  const { toast } = useToast();
  const [showMoodPopup, setShowMoodPopup] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [posts, setPosts] = useState<(Post & { author?: User })[]>([]);
  const [todayMood, setTodayMood] = useState<MoodEntry | null>(null);
  const [moodSlogan, setMoodSlogan] = useState<string>("");
  const [globalEmotions, setGlobalEmotions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPosts();
    loadTodayMood();
    loadGlobalEmotions();
    checkMoodTime();
  }, [currentUser]);

  const loadPosts = async () => {
    try {
      const postsQuery = query(
        collection(db, "posts"),
        orderBy("createdAt", "desc"),
        limit(20)
      );
      const snapshot = await getDocs(postsQuery);
      
      const postsWithAuthors = await Promise.all(
        snapshot.docs.map(async (postDoc) => {
          const postData = { id: postDoc.id, ...postDoc.data() } as Post;
          const authorDoc = await getDoc(doc(db, "users", postData.authorId));
          const author = authorDoc.exists() ? { id: authorDoc.id, ...authorDoc.data() } as User : undefined;
          return { ...postData, author };
        })
      );

      setPosts(postsWithAuthors);
    } catch (error) {
      console.error("Error loading posts:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadTodayMood = async () => {
    if (!currentUser) return;
    
    try {
      const today = new Date().toISOString().split('T')[0];
      const moodsQuery = query(
        collection(db, "moods"),
        where("userId", "==", currentUser.uid),
        where("date", "==", today),
        limit(1)
      );
      const snapshot = await getDocs(moodsQuery);
      
      if (!snapshot.empty) {
        const moodData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as MoodEntry;
        setTodayMood(moodData);
        setMoodSlogan(getRandomSlogan(moodData.emotion));
      }
    } catch (error) {
      console.error("Error loading mood:", error);
    }
  };

  const loadGlobalEmotions = async () => {
    try {
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

      const total = snapshot.docs.length || 1;
      const stats = Object.entries(emotionCounts)
        .map(([emotion, count]) => ({
          emotion: emotion as EmotionType,
          count,
          percentage: Math.round((count / total) * 100),
        }))
        .sort((a, b) => b.count - a.count);

      setGlobalEmotions(stats);
    } catch (error) {
      console.error("Error loading global emotions:", error);
    }
  };

  const handleSaveMood = async (emotion: EmotionType, reason: string, shouldPost: boolean) => {
    if (!currentUser) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Save mood entry
      const moodEntry = {
        userId: currentUser.uid,
        emotion,
        reason,
        isPublic: shouldPost,
        date: today,
        createdAt: new Date().toISOString(),
      };

      const moodRef = await addDoc(collection(db, "moods"), moodEntry);
      
      // Update user's current mood
      await setDoc(doc(db, "users", currentUser.uid), {
        currentMood: emotion,
        lastMoodCheck: new Date().toISOString(),
      }, { merge: true });

      // If user wants to post publicly, create a post
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

      toast({
        title: shouldPost ? "Posted successfully!" : "Mood saved to diary",
        description: shouldPost 
          ? "Your mood has been shared with the community" 
          : "Your mood entry has been saved privately",
      });

      // Reload data
      await loadTodayMood();
      await loadGlobalEmotions();
      if (shouldPost) {
        await loadPosts();
      }
    } catch (error: any) {
      toast({
        title: "Failed to save mood",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const checkMoodTime = () => {
    // Show mood popup on first login or if no mood recorded today
    if (!todayMood) {
      setTimeout(() => setShowMoodPopup(true), 1000);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-md border-b border-border">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-2xl font-display font-bold bg-gradient-to-r from-emotion-happiness via-emotion-excitement to-emotion-calm bg-clip-text text-transparent">
            Alvice
          </h1>
          <Button
            size="icon"
            variant="ghost"
            className="relative hover-elevate active-elevate-2"
            data-testid="button-notifications"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full" />
          </Button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Mood section */}
        {todayMood ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => setShowMoodPopup(true)}
            className="cursor-pointer hover-elevate active-elevate-2"
            data-testid="card-current-mood"
          >
            <Card className="p-6 border-2">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-xl font-display font-bold">
                    {userData?.displayName || "You"}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {moodSlogan}
                  </p>
                </div>
                <div className="text-6xl animate-pulse">
                  {EMOTION_EMOJIS[todayMood.emotion]}
                </div>
              </div>
            </Card>
          </motion.div>
        ) : (
          <Card 
            className="p-6 cursor-pointer hover-elevate active-elevate-2"
            onClick={() => setShowMoodPopup(true)}
            data-testid="card-check-mood"
          >
            <div className="flex items-center gap-4">
              <span className="text-4xl">😊</span>
              <div className="flex-1">
                <h3 className="font-display font-semibold">How are you feeling today?</h3>
                <p className="text-sm text-muted-foreground">Tap to check in with your mood</p>
              </div>
            </div>
          </Card>
        )}

        {/* Feed */}
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

      {/* Floating action button */}
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
      />
      <EnhancedCreatePostModal 
        isOpen={showCreatePost} 
        onClose={() => setShowCreatePost(false)}
        onPostCreated={loadPosts}
      />
    </div>
  );
}

function PostCard({ post }: { post: Post & { author?: User } }) {
  return (
    <Card className="overflow-hidden hover-elevate active-elevate-2 cursor-pointer" data-testid={`post-${post.id}`}>
      <div className="p-6 space-y-4">
        {/* Author info */}
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

        {/* Post content */}
        <div className="space-y-2">
          <h3 className="text-xl font-display font-semibold">{post.title}</h3>
          <p className="text-foreground whitespace-pre-wrap">{post.content}</p>
        </div>

        {/* Post images */}
        {post.images.length > 0 && (
          <div className={`grid gap-2 ${post.images.length === 1 ? "grid-cols-1" : post.images.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
            {post.images.map((image, index) => (
              <div key={index} className="relative aspect-square rounded-xl overflow-hidden bg-muted">
                <img src={image} alt={`Post image ${index + 1}`} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        )}

        {/* Engagement buttons */}
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
            data-testid={`button-comment-${post.id}`}
          >
            <MessageCircle className="h-5 w-5" />
            <span>{post.commentCount}</span>
          </Button>
        </div>
      </div>
    </Card>
  );
}
