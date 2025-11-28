import { useState, useEffect, useMemo } from "react";
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
import { useDebounce } from "@/hooks/use-debounce";

// Helper component to highlight search queries
const Highlight = ({ text, query }: { text: string; query: string }) => {
  if (!query) return <>{text}</>;
  const parts = text.split(new RegExp(`(${query})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-primary/20 text-primary-foreground px-0.5 rounded-sm">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
};

export default function Explore() {
  const [allTribes, setAllTribes] = useState<Tribe[]>([]);
  const [allPosts, setAllPosts] = useState<(Post & { author?: User })[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadAllTribes(), loadAllPublicPosts(), loadAllUsers()]);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({ title: "Error", description: "Could not load data.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const loadAllTribes = async () => {
    const snapshot = await getDocs(query(collection(db, "tribes")));
    setAllTribes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tribe)));
  };

  const loadAllPublicPosts = async () => {
    const postsQuery = query(collection(db, "posts"), where("isPublic", "==", true));
    const snapshot = await getDocs(postsQuery);
    const postsWithAuthors = await Promise.all(snapshot.docs.map(async (doc) => {
      const post = { id: doc.id, ...doc.data() } as Post;
      if (!post.authorId) return post;
      const userSnapshot = await getDocs(query(collection(db, "users"), where("__name__", "==", post.authorId)));
      const author = userSnapshot.docs[0]?.data() as User;
      return { ...post, author };
    }));
    setAllPosts(postsWithAuthors);
  };

  const loadAllUsers = async () => {
    const snapshot = await getDocs(query(collection(db, "users")));
    setAllUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User)));
  };

  const searchResults = useMemo(() => {
    if (!debouncedSearchQuery) return null;
    const q = debouncedSearchQuery.toLowerCase();

    const filteredPosts = allPosts.filter(post => 
      post.title.toLowerCase().includes(q) ||
      post.content.toLowerCase().includes(q) ||
      (post.tags || []).some(tag => tag.toLowerCase().includes(q))
    );

    const filteredUsers = allUsers.filter(user => 
      (user.displayName?.toLowerCase() || '').includes(q) ||
      (user.username?.toLowerCase() || '').includes(q)
    );

    const filteredTribes = allTribes.map(tribe => {
        const matchingPostsCount = allPosts.filter(p => 
          p.tribeId === tribe.id && (p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q))
        ).length;
        const isMatch = tribe.name.toLowerCase().includes(q) || tribe.description.toLowerCase().includes(q) || matchingPostsCount > 0;
        return { ...tribe, matchingPostsCount, isMatch };
      })
      .filter(tribe => tribe.isMatch)
      .sort((a, b) => b.matchingPostsCount - a.matchingPostsCount);

    return { tribes: filteredTribes, posts: filteredPosts, users: filteredUsers };
  }, [debouncedSearchQuery, allTribes, allPosts, allUsers]);

  const handleJoinTribe = async (tribeId: string) => { /* ... */ };

  const popularTribes = useMemo(() => [...allTribes].sort((a,b) => (b.membersCount ?? 0) - (a.membersCount ?? 0)).slice(0, 4), [allTribes]);
  const popularPosts = useMemo(() => [...allPosts].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5), [allPosts]);

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-3 space-y-3">
          <h1 className="text-2xl font-display font-bold">Explore</h1>
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input type="search" placeholder="Search for tribes, posts, people..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 h-11" />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-8">
        {searchResults ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
            {searchResults.tribes.length > 0 && (
              <section>
                <h2 className="text-xl font-display font-semibold mb-4">Tribes</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {searchResults.tribes.map((tribe) => <TribeCard key={tribe.id} tribe={tribe} query={debouncedSearchQuery} onJoin={handleJoinTribe} />)}
                </div>
              </section>
            )}
            {searchResults.posts.length > 0 && (
              <section>
                <h2 className="text-xl font-display font-semibold mb-4">Posts</h2>
                <div className="space-y-4">
                  {searchResults.posts.map((post) => <PostCard key={post.id} post={post} query={debouncedSearchQuery} />)}
                </div>
              </section>
            )}
            {searchResults.users.length > 0 && (
              <section>
                <h2 className="text-xl font-display font-semibold mb-4">People</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {searchResults.users.map((user) => <UserCard key={user.id} user={user} query={debouncedSearchQuery} />)}
                </div>
              </section>
            )}
            {searchResults.tribes.length === 0 && searchResults.posts.length === 0 && searchResults.users.length === 0 && (
              <div className="text-center py-16">
                  <p className="text-lg font-semibold">No results found</p>
                  <p className="text-muted-foreground mt-1">Try a different search term.</p>
              </div>
            )}
          </motion.div>
        ) : loading ? (
            <div className="text-center py-16 text-muted-foreground">Loading...</div>
        ) : (
          <>
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-display font-semibold">Popular Tribes</h2>
                <Button size="sm" onClick={() => navigate("/create-tribe")} className="gap-2"><Plus className="h-4 w-4" />Create Tribe</Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {popularTribes.map((tribe) => <TribeCard key={tribe.id} tribe={tribe} onJoin={handleJoinTribe} query="" />)}
              </div>
            </section>
            <section>
              <h2 className="text-xl font-display font-semibold mb-4">Recent Posts</h2>
              <div className="space-y-4">
                {popularPosts.map((post) => <PostCard key={post.id} post={post} query="" />)}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function TribeCard({ tribe, query, onJoin }: { tribe: any, query: string, onJoin: (id: string) => void }) {
  const { currentUser } = useAuth();
  const isMember = tribe.members.includes(currentUser?.uid || "");

  return (
    <Card className="overflow-hidden hover-elevate active-elevate-2 cursor-pointer flex flex-col">
      <div className="p-4 flex-grow">
        <h3 className="font-bold text-base truncate mb-1">
          <Highlight text={tribe.name} query={query} />
        </h3>
        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
          <Highlight text={tribe.description} query={query} />
        </p>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {tribe.members.length} members</span>
          {tribe.matchingPostsCount > 0 && <span className="font-bold text-primary">{tribe.matchingPostsCount} matching posts</span>}
        </div>
      </div>
      {!isMember && (
        <div className="p-2 bg-muted/50">
          <Button size="sm" onClick={(e) => { e.stopPropagation(); onJoin(tribe.id); }} className="w-full h-8 text-xs">Join</Button>
        </div>
      )}
    </Card>
  );
}

function UserCard({ user, query }: { user: User, query: string }) {
  return (
    <Card className="p-4 hover-elevate active-elevate-2 cursor-pointer">
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10"><AvatarImage src={user.photoURL} /><AvatarFallback>{user.displayName?.[0]}</AvatarFallback></Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate"><Highlight text={user.displayName || ''} query={query} /></p>
          <p className="text-sm text-muted-foreground truncate">@<Highlight text={user.username || ''} query={query} /></p>
        </div>
      </div>
    </Card>
  );
}

function PostCard({ post, query }: { post: Post & { author?: User }, query: string }) {
  return (
    <Card className="p-4 hover-elevate active-elevate-2 cursor-pointer">
       <div className="flex items-start gap-3 mb-3">
        <Avatar className="h-9 w-9"><AvatarImage src={post.author?.photoURL} /><AvatarFallback>{post.author?.displayName?.[0] || "U"}</AvatarFallback></Avatar>
        <div>
          <p className="font-semibold text-sm">{post.author?.displayName || "Unknown"}</p>
          <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</p>
        </div>
      </div>
      <h3 className="font-semibold mb-1"><Highlight text={post.title} query={query} /></h3>
      <p className="text-sm text-muted-foreground line-clamp-2"><Highlight text={post.content} query={query} /></p>
      {(post.tags || []).length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {post.tags.map((tag) => <Badge key={tag} variant="secondary" className="text-xs"><Highlight text={`#${tag}`} query={query} /></Badge>)}
        </div>
      )}
    </Card>
  );
}
