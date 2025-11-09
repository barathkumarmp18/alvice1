import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Users, Lock, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { collection, query, getDocs, addDoc, doc, updateDoc, arrayUnion, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Tribe } from "@shared/schema";

export default function Tribes() {
  const [tribes, setTribes] = useState<Tribe[]>([]);
  const [showCreateTribe, setShowCreateTribe] = useState(false);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();
  const { toast } = useToast();

  // Create tribe form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [maxMembers, setMaxMembers] = useState<number | undefined>(undefined);
  const [allowAnonymous, setAllowAnonymous] = useState(false);
  const [founderVisible, setFounderVisible] = useState(true);
  const [isPrivate, setIsPrivate] = useState(false);

  useEffect(() => {
    // Set up real-time listener for tribes
    const tribesQuery = query(collection(db, "tribes"));
    
    const unsubscribe = onSnapshot(tribesQuery, (snapshot) => {
      const tribesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tribe));
      setTribes(tribesData);
      setLoading(false);
    }, (error) => {
      console.error("Error loading tribes:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loadTribes = async () => {
    // This function is no longer needed as we use real-time listeners
    // Kept for compatibility
  };

  const handleCreateTribe = async () => {
    if (!currentUser || !name.trim()) return;

    try {
      setLoading(true);
      const newTribe = await addDoc(collection(db, "tribes"), {
        name: name.trim(),
        description: description.trim(),
        founderId: currentUser.uid,
        maxMembers: maxMembers || null,
        allowAnonymous,
        founderVisible,
        isPrivate,
        members: [currentUser.uid],
        pendingMembers: [],
        createdAt: new Date().toISOString(),
      });

      toast({
        title: "Tribe created!",
        description: `${name} has been successfully created`,
      });

      setShowCreateTribe(false);
      resetForm();
      loadTribes();
    } catch (error: any) {
      toast({
        title: "Failed to create tribe",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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

  const resetForm = () => {
    setName("");
    setDescription("");
    setMaxMembers(undefined);
    setAllowAnonymous(false);
    setFounderVisible(true);
    setIsPrivate(false);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-2xl font-display font-bold">Tribes</h1>
          <Button
            onClick={() => setShowCreateTribe(true)}
            className="gap-2 bg-gradient-to-r from-emotion-happiness to-emotion-excitement hover-elevate active-elevate-2"
            data-testid="button-create-tribe"
          >
            <Plus className="h-5 w-5" />
            Create Tribe
          </Button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-8">
        {/* Top tribes */}
        <section>
          <h2 className="text-xl font-display font-semibold mb-4">Featured Tribes</h2>
          <div className="overflow-x-auto pb-4 -mx-4 px-4">
            <div className="flex gap-4 min-w-max">
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <Card key={i} className="w-80 h-48 animate-pulse bg-muted" />
                ))
              ) : tribes.length > 0 ? (
                tribes.slice(0, 5).map((tribe) => (
                  <TribeFeaturedCard key={tribe.id} tribe={tribe} onJoin={handleJoinTribe} />
                ))
              ) : (
                <Card className="w-full p-12 text-center">
                  <p className="text-muted-foreground">No tribes yet. Be the first to create one!</p>
                </Card>
              )}
            </div>
          </div>
        </section>

        {/* All tribes */}
        <section>
          <h2 className="text-xl font-display font-semibold mb-4">Explore Tribes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tribes.map((tribe) => (
              <TribeCard key={tribe.id} tribe={tribe} onJoin={handleJoinTribe} />
            ))}
          </div>
        </section>
      </div>

      {/* Create tribe modal */}
      <Dialog open={showCreateTribe} onOpenChange={setShowCreateTribe}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-display">Create Your Tribe</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="tribe-name">Tribe Name</Label>
              <Input
                id="tribe-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter tribe name"
                className="h-12"
                data-testid="input-tribe-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tribe-description">Description</Label>
              <Textarea
                id="tribe-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this tribe about?"
                className="min-h-24 resize-none"
                data-testid="input-tribe-description"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="max-members">Max Members (Optional)</Label>
              <Input
                id="max-members"
                type="number"
                value={maxMembers || ""}
                onChange={(e) => setMaxMembers(e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="Leave empty for unlimited"
                className="h-12"
                data-testid="input-max-members"
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl border border-border">
                <div className="flex-1">
                  <Label htmlFor="allow-anonymous" className="cursor-pointer">Allow Anonymous Posts</Label>
                  <p className="text-sm text-muted-foreground">Members can post anonymously</p>
                </div>
                <Switch
                  id="allow-anonymous"
                  checked={allowAnonymous}
                  onCheckedChange={setAllowAnonymous}
                  data-testid="switch-allow-anonymous"
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl border border-border">
                <div className="flex-1">
                  <Label htmlFor="founder-visible" className="cursor-pointer">Founder Visibility</Label>
                  <p className="text-sm text-muted-foreground">Show founder information</p>
                </div>
                <Switch
                  id="founder-visible"
                  checked={founderVisible}
                  onCheckedChange={setFounderVisible}
                  data-testid="switch-founder-visible"
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl border border-border">
                <div className="flex-1">
                  <Label htmlFor="is-private" className="cursor-pointer">Private Tribe</Label>
                  <p className="text-sm text-muted-foreground">Require approval to join</p>
                </div>
                <Switch
                  id="is-private"
                  checked={isPrivate}
                  onCheckedChange={setIsPrivate}
                  data-testid="switch-private"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowCreateTribe(false)}
                className="flex-1"
                data-testid="button-cancel-tribe"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateTribe}
                disabled={!name.trim() || loading}
                className="flex-1 bg-gradient-to-r from-emotion-happiness to-emotion-excitement"
                data-testid="button-submit-tribe"
              >
                {loading ? "Creating..." : "Create Tribe"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TribeFeaturedCard({ tribe, onJoin }: { tribe: Tribe; onJoin: (id: string, tribe: Tribe) => void }) {
  const { currentUser } = useAuth();
  const isMember = tribe.members.includes(currentUser?.uid || "");

  return (
    <Card className="w-80 overflow-hidden hover-elevate active-elevate-2 cursor-pointer" data-testid={`tribe-featured-${tribe.id}`}>
      <div className="h-32 bg-gradient-to-br from-emotion-happiness via-emotion-excitement to-emotion-calm" />
      <div className="p-6 -mt-12">
        <div className="w-20 h-20 rounded-2xl bg-card border-4 border-card shadow-lg flex items-center justify-center text-3xl mb-4">
          {tribe.name[0]}
        </div>
        <h3 className="font-display font-bold text-lg mb-2">{tribe.name}</h3>
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{tribe.description}</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{tribe.members.length} members</span>
          </div>
          {!isMember && (
            <Button
              size="sm"
              onClick={() => onJoin(tribe.id, tribe)}
              variant={tribe.isPrivate ? "outline" : "default"}
              className="gap-1"
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

function TribeCard({ tribe, onJoin }: { tribe: Tribe; onJoin: (id: string, tribe: Tribe) => void }) {
  const { currentUser } = useAuth();
  const isMember = tribe.members.includes(currentUser?.uid || "");

  return (
    <Card className="p-6 hover-elevate active-elevate-2 cursor-pointer" data-testid={`tribe-${tribe.id}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-emotion-happiness to-emotion-excitement flex items-center justify-center text-white text-2xl font-bold">
          {tribe.name[0]}
        </div>
        {tribe.isPrivate && (
          <Lock className="h-5 w-5 text-muted-foreground" />
        )}
      </div>
      <h3 className="font-display font-bold text-lg mb-2">{tribe.name}</h3>
      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{tribe.description}</p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>{tribe.members.length} members</span>
        </div>
        {!isMember && (
          <Button
            size="sm"
            onClick={() => onJoin(tribe.id, tribe)}
            className="hover-elevate active-elevate-2"
            data-testid={`button-join-${tribe.id}`}
          >
            {tribe.isPrivate ? "Request" : "Join"}
          </Button>
        )}
      </div>
    </Card>
  );
}
