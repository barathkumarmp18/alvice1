import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Building2, GraduationCap, School } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";
import { collection, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function CreateTribe() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [maxMembers, setMaxMembers] = useState<number | undefined>(undefined);
  const [allowAnonymous, setAllowAnonymous] = useState(false);
  const [founderVisible, setFounderVisible] = useState(true);
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const handleCreateTribe = async () => {
    if (!currentUser || !name.trim()) return;

    try {
      setLoading(true);
      await addDoc(collection(db, "tribes"), {
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

      navigate("/explore");
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

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-md border-b border-border">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center gap-3">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => navigate("/explore")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-display font-bold">Create Your Tribe</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <Card className="p-6">
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="tribe-name">Tribe Name *</Label>
              <Input
                id="tribe-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter tribe name"
                data-testid="input-tribe-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tribe-description">Description *</Label>
              <Textarea
                id="tribe-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this tribe about?"
                className="min-h-32 resize-none"
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
                data-testid="input-max-members"
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl border border-border">
                <div className="flex-1">
                  <Label htmlFor="allow-anonymous" className="cursor-pointer font-semibold">
                    Allow Anonymous Posts
                  </Label>
                  <p className="text-sm text-muted-foreground">Members can post anonymously in this tribe</p>
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
                  <Label htmlFor="founder-visible" className="cursor-pointer font-semibold">
                    Show as Founder
                  </Label>
                  <p className="text-sm text-muted-foreground">Display your name as the tribe founder</p>
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
                  <Label htmlFor="is-private" className="cursor-pointer font-semibold">
                    Private Tribe
                  </Label>
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
                onClick={() => navigate("/explore")}
                className="flex-1"
                data-testid="button-cancel-tribe"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateTribe}
                disabled={!name.trim() || !description.trim() || loading}
                className="flex-1 bg-gradient-to-r from-emotion-happiness to-emotion-excitement"
                data-testid="button-submit-tribe"
              >
                {loading ? "Creating..." : "Create Tribe"}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
