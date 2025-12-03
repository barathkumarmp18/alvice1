import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Menu, Edit, TrendingUp, Eye, Heart, Users, Book } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SettingsPanel from "@/components/SettingsPanel";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { formatDistanceToNow } from "date-fns";
import type { Post } from "@shared/schema";

export default function Profile() {
  const { userData, currentUser } = useAuth();
  const [, navigate] = useLocation();
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser) {
      loadUserPosts();
    }
  }, [currentUser]);

  const loadUserPosts = async () => {
    if (!currentUser?.uid) return;

    try {
      const postsQuery = query(
        collection(db, "posts"),
        where("authorId", "==", currentUser.uid)
      );
      const snapshot = await getDocs(postsQuery);
      const posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
      setUserPosts(posts);
    } catch (error) {
      console.error("Error loading posts:", error);
    } finally {
      setLoading(false);
    }
  };

  const totalLikes = userPosts.reduce((acc, post) => acc + post.likes.length, 0);
  const totalComments = userPosts.reduce((acc, post) => acc + post.commentCount, 0);

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-md border-b border-border">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-2xl font-display font-bold">Profile</h1>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setShowSettings(true)}
            className="hover-elevate active-elevate-2"
            data-testid="button-settings"
          >
            <Menu className="h-6 w-6" />
          </Button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Profile header */}
        <Card className="p-8">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <Avatar className="h-32 w-32 border-4 border-background shadow-lg">
              <AvatarImage src={userData?.photoURL} />
              <AvatarFallback className="text-4xl">{userData?.displayName?.[0]}</AvatarFallback>
            </Avatar>

            <div className="flex-1 text-center md:text-left space-y-4">
              <div>
                <h2 className="text-3xl font-display font-bold">{userData?.displayName}</h2>
                <p className="text-muted-foreground">@{userData?.username}</p>
              </div>

              {userData?.bio && (
                <p className="text-foreground max-w-2xl">{userData.bio}</p>
              )}

              <div className="flex justify-center md:justify-start gap-6">
                <div className="text-center">
                  <p className="text-2xl font-bold">{userData?.followers?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">Followers</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{userData?.following?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">Following</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{userPosts.length}</p>
                  <p className="text-sm text-muted-foreground">Posts</p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="gap-2 hover-elevate active-elevate-2"
                  data-testid="button-edit-profile"
                >
                  <Edit className="h-4 w-4" />
                  Edit Profile
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate("/diary")}
                  className="gap-2 hover-elevate active-elevate-2"
                  data-testid="button-view-diary"
                >
                  <Book className="h-4 w-4" />
                  View Diary
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Creator Dashboard */}
        {userData?.role === "creator" && (
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="h-6 w-6 text-primary" />
              <h3 className="text-xl font-display font-bold">Creator Dashboard</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-gradient-to-br from-emotion-happiness/20 to-emotion-excitement/20">
                <div className="flex items-center gap-3 mb-2">
                  <Eye className="h-5 w-5 text-emotion-happiness" />
                  <p className="text-sm font-medium text-muted-foreground">Total Reach</p>
                </div>
                <p className="text-3xl font-bold">{userPosts.length * 42}</p>
                <p className="text-xs text-muted-foreground mt-1">+12% this week</p>
              </div>

              <div className="p-4 rounded-xl bg-gradient-to-br from-emotion-calm/20 to-emotion-sadness/20">
                <div className="flex items-center gap-3 mb-2">
                  <Heart className="h-5 w-5 text-emotion-calm" />
                  <p className="text-sm font-medium text-muted-foreground">Engagement</p>
                </div>
                <p className="text-3xl font-bold">{totalLikes + totalComments}</p>
                <p className="text-xs text-muted-foreground mt-1">{totalLikes} likes, {totalComments} comments</p>
              </div>

              <div className="p-4 rounded-xl bg-gradient-to-br from-emotion-excitement/20 to-emotion-anger/20">
                <div className="flex items-center gap-3 mb-2">
                  <Users className="h-5 w-5 text-emotion-excitement" />
                  <p className="text-sm font-medium text-muted-foreground">Growth</p>
                </div>
                <p className="text-3xl font-bold">{userData?.followers?.length || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">+{Math.round((userData?.followers?.length || 0) * 0.08)} this week</p>
              </div>
            </div>
          </Card>
        )}

        {/* Content tabs */}
        <Card className="p-6">
          <Tabs defaultValue="posts" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="posts" data-testid="tab-posts">Posts</TabsTrigger>
              <TabsTrigger value="comments" data-testid="tab-comments">Comments</TabsTrigger>
            </TabsList>

            <TabsContent value="posts" className="space-y-4">
              {loading ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Loading posts...</p>
                </div>
              ) : userPosts.length > 0 ? (
                userPosts.map((post) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-xl border border-border hover-elevate active-elevate-2 cursor-pointer"
                    data-testid={`user-post-${post.id}`}
                  >
                    <h4 className="font-display font-semibold mb-2">{post.title}</h4>
                    <p className="text-sm text-foreground line-clamp-2 mb-3">{post.content}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</span>
                      <span>{post.likes.length} likes</span>
                      <span>{post.commentCount} comments</span>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No posts yet</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="comments" className="space-y-4">
              <div className="text-center py-12">
                <p className="text-muted-foreground">No comments yet</p>
              </div>
            </TabsContent>
          </Tabs>
        </Card>

      </div>

      {/* Settings Panel */}
      <SettingsPanel 
        open={showSettings} 
        onClose={() => setShowSettings(false)} 
      />
    </div>
  );
}
