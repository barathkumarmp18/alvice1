import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Users, Lock, Globe, Search as SearchIcon, Hash, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";
import { collection, query, getDocs, doc, updateDoc, arrayUnion, where, limit, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { formatDistanceToNow } from "date-fns";
import type { Tribe, Post, User } from "@shared/schema";

export default function Explore() {
  const [tribes, setTribes] = useState<Tribe[]>([]);
  const [posts, setPosts] = useState<(Post & { author?: User })[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFilter, setSearchFilter] = useState<"all" | "tribes" | "people" | "tags">("all");
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  useEffect(() => {
    loadTribes();
    loadPosts();
    loadUsers();
  }, []);

  const loadTribes = async () => {
    try {
      const tribesQuery = query(collection(db, "tribes"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(tribesQuery);
      const tribesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tribe));
      setTribes(tribesData);
    } catch (error) {
      console.error("Error loading tribes:", error);
    }
  };

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
          const authorDoc = await getDocs(query(collection(db, "users"), where("__name__", "==", postData.authorId), limit(1)));
          const author = authorDoc.docs[0]?.exists() ? { id: authorDoc.docs[0].id, ...authorDoc.docs[0].data() } as User : undefined;
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

  const loadUsers = async () => {
    try {
      const usersQuery = query(collection(db, "users"), limit(20));
      const snapshot = await getDocs(usersQuery);
      const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
      setUsers(usersData.filter(u => u.id !== currentUser?.uid));
    } catch (error) {
      console.error("Error loading users:", error);
    }
  };

  const handleJoinTribe = async (tribeId: string, tribe: Tribe) => {
    if (!currentUser) return;

    try {
      if (tribe.isPrivate) {
        await updateDoc(doc(db, "tribes", tribeId), {
          pendingMembers: arrayUnion(currentUser.uid),
        });
        toast({
          title: "Request sent",
          description: "Your request to join this tribe is pending approval",
        });
      } else {
        await updateDoc(doc(db, "tribes", tribeId), {
          members: arrayUnion(currentUser.uid),
        });
        toast({
          title: "Joined tribe!",
          description: `Welcome to ${tribe.name}`,
        });
      }
      loadTribes();
    } catch (error: any) {
      toast({
        title: "Failed to join tribe",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filteredTribes = tribes.filter(tribe => 
    searchQuery === "" || 
    tribe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tribe.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPosts = posts.filter(post =>
    searchQuery === "" ||
    post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (post.tags || []).some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredUsers = users.filter(user =>
    searchQuery === "" ||
    user.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const allTags = Array.from(new Set(posts.flatMap(p => p.tags || [])))
    .filter(tag => searchQuery === "" || tag.toLowerCase().includes(searchQuery.toLowerCase()));

  const shouldShowTribes = searchFilter === "all" || searchFilter === "tribes";
  const shouldShowPeople = searchFilter === "all" || searchFilter === "people";
  const shouldShowPosts = searchFilter === "all" || searchFilter === "tags";
  const shouldShowTags = searchFilter === "tags";

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-3 space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-display font-bold">Explore</h1>
          </div>
          
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search tribes, people, tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11"
              data-testid="input-search-explore"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            <Button
              size="sm"
              variant={searchFilter === "all" ? "default" : "outline"}
              onClick={() => setSearchFilter("all")}
              className="gap-2 flex-shrink-0"
              data-testid="filter-all"
            >
              All
            </Button>
            <Button
              size="sm"
              variant={searchFilter === "tribes" ? "default" : "outline"}
              onClick={() => setSearchFilter("tribes")}
              className="gap-2 flex-shrink-0"
              data-testid="filter-tribes"
            >
              <Users className="h-4 w-4" />
              Tribes
            </Button>
            <Button
              size="sm"
              variant={searchFilter === "people" ? "default" : "outline"}
              onClick={() => setSearchFilter("people")}
              className="gap-2 flex-shrink-0"
              data-testid="filter-people"
            >
              <UserCircle className="h-4 w-4" />
              People
            </Button>
            <Button
              size="sm"
              variant={searchFilter === "tags" ? "default" : "outline"}
              onClick={() => setSearchFilter("tags")}
              className="gap-2 flex-shrink-0"
              data-testid="filter-tags"
            >
              <Hash className="h-4 w-4" />
              Tags
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-8">
        {shouldShowTribes && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-display font-semibold">Top Tribes</h2>
              <Button
                size="sm"
                onClick={() => navigate("/create-tribe")}
                className="gap-2"
                data-testid="button-create-tribe"
              >
                <Plus className="h-4 w-4" />
                Create Tribe
              </Button>
            </div>
            
            <div className="overflow-x-auto pb-4 -mx-4 px-4">
              <div className="flex gap-4 min-w-max">
                <Card
                  className="w-64 p-6 border-2 border-dashed hover-elevate active-elevate-2 cursor-pointer flex flex-col items-center justify-center text-center gap-3"
                  onClick={() => navigate("/create-tribe")}
                  data-testid="card-create-tribe"
                >
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Plus className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold">Create Your Tribe</h3>
                    <p className="text-sm text-muted-foreground">Start your own community</p>
                  </div>
                </Card>

                {loading ? (
                  [...Array(3)].map((_, i) => (
                    <Card key={i} className="w-64 h-48 animate-pulse bg-muted" />
                  ))
                ) : filteredTribes.length > 0 ? (
                  filteredTribes.slice(0, 6).map((tribe) => (
                    <TribeFeaturedCard key={tribe.id} tribe={tribe} onJoin={handleJoinTribe} />
                  ))
                ) : (
                  searchQuery && (
                    <div className="w-64 p-12 text-center">
                      <p className="text-muted-foreground">No tribes found</p>
                    </div>
                  )
                )}
              </div>
            </div>
          </section>
        )}

        {shouldShowPeople && filteredUsers.length > 0 && (
          <section>
            <h2 className="text-xl font-display font-semibold mb-4">People</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredUsers.map((user) => (
                <UserCard key={user.id} user={user} />
              ))}
            </div>
          </section>
        )}

        {shouldShowTags && allTags.length > 0 && (
          <section>
            <h2 className="text-xl font-display font-semibold mb-4">Trending Tags</h2>
            <div className="flex flex-wrap gap-2">
              {allTags.map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="px-4 py-2 text-sm cursor-pointer hover-elevate"
                  data-testid={`trending-tag-${tag}`}
                >
                  <Hash className="h-3 w-3 mr-1" />
                  {tag}
                </Badge>
              ))}
            </div>
          </section>
        )}

        {shouldShowPosts && (
          <section>
            <h2 className="text-xl font-display font-semibold mb-4">Posts from the Community</h2>
            <div className="space-y-4">
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
              ) : filteredPosts.length > 0 ? (
                filteredPosts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))
              ) : (
                <Card className="p-12 text-center">
                  <p className="text-muted-foreground">
                    {searchQuery ? "No posts found" : "No posts yet"}
                  </p>
                </Card>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function TribeFeaturedCard({ tribe, onJoin }: { tribe: Tribe; onJoin: (id: string, tribe: Tribe) => void }) {
  const { currentUser } = useAuth();
  const isMember = tribe.members.includes(currentUser?.uid || "");

  return (
    <Card className="w-64 overflow-hidden hover-elevate active-elevate-2 cursor-pointer" data-testid={`tribe-featured-${tribe.id}`}>
      <div className="h-24 bg-gradient-to-br from-emotion-happiness via-emotion-excitement to-emotion-calm" />
      <div className="p-4 -mt-8">
        <div className="w-16 h-16 rounded-xl bg-card border-4 border-card shadow-lg flex items-center justify-center text-2xl mb-3">
          {tribe.name[0]}
        </div>
        <h3 className="font-display font-bold text-base mb-1 line-clamp-1">{tribe.name}</h3>
        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{tribe.description}</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="h-3 w-3" />
            <span>{tribe.members.length}</span>
          </div>
          {!isMember && (
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onJoin(tribe.id, tribe);
              }}
              variant={tribe.isPrivate ? "outline" : "default"}
              className="gap-1 h-7 text-xs"
              data-testid={`button-join-tribe-${tribe.id}`}
            >
              {tribe.isPrivate ? <Lock className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
              Join
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

function UserCard({ user }: { user: User }) {
  return (
    <Card className="p-6 hover-elevate active-elevate-2 cursor-pointer" data-testid={`user-${user.id}`}>
      <div className="flex items-center gap-3 mb-3">
        <Avatar className="h-12 w-12">
          <AvatarImage src={user.photoURL} />
          <AvatarFallback>{user.displayName[0]}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{user.displayName}</p>
          <p className="text-sm text-muted-foreground truncate">@{user.username}</p>
        </div>
      </div>
      {user.bio && (
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{user.bio}</p>
      )}
      <div className="flex gap-2 text-xs text-muted-foreground">
        <span>{user.followers.length} followers</span>
        <span>•</span>
        <span>{user.following.length} following</span>
      </div>
    </Card>
  );
}

function PostCard({ post }: { post: Post & { author?: User } }) {
  return (
    <Card className="p-6 hover-elevate active-elevate-2 cursor-pointer" data-testid={`post-${post.id}`}>
      <div className="flex items-start gap-3 mb-4">
        <Avatar className="h-10 w-10">
          <AvatarImage src={post.author?.photoURL} />
          <AvatarFallback>{post.author?.displayName?.[0] || "U"}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">{post.author?.displayName || "Unknown User"}</p>
          <p className="text-xs text-muted-foreground">
            @{post.author?.username} • {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
          </p>
        </div>
        {post.type === "question" && (
          <div className="px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium">
            Question
          </div>
        )}
      </div>

      <div className="space-y-2">
        <h3 className="text-lg font-display font-semibold">{post.title}</h3>
        <p className="text-foreground text-sm line-clamp-3 whitespace-pre-wrap">{post.content}</p>
      </div>

      {(post.tags || []).length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {(post.tags || []).map((tag, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted text-xs text-muted-foreground"
              data-testid={`tag-${tag}`}
            >
              <Hash className="h-3 w-3" />
              {tag}
            </span>
          ))}
        </div>
      )}
    </Card>
  );
}
