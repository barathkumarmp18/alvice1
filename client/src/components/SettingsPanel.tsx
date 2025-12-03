import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, LogOut, Lock, Users, Trash2, PlusCircle, Check, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import AddAccountModal from "./AddAccountModal";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

export default function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const { currentUser, userData, signOut, linkedAccounts, removeLinkedAccount, switchAccount, refreshLinkedAccounts } = useAuth();
  const { toast } = useToast();
  const [diaryPublic, setDiaryPublic] = useState(true);
  const [allowAnonymousMessages, setAllowAnonymousMessages] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAddAccountModalOpen, setAddAccountModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (userData?.settings) {
      setDiaryPublic(userData.settings.diaryPublic ?? true);
      setAllowAnonymousMessages(userData.settings.allowAnonymousMessages ?? true);
    }
  }, [userData]);

  useEffect(() => {
    if (open) {
      refreshLinkedAccounts();
    }
  }, [open, refreshLinkedAccounts]);

  const handleRefreshAccounts = async () => {
    setRefreshing(true);
    try {
      await refreshLinkedAccounts();
      toast({ title: "Accounts refreshed" });
    } catch (error) {
      console.error("Error refreshing accounts:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleSettingChange = async (setting: string, value: boolean) => {
    if (!currentUser) return;

    setSaving(true);
    try {
      const settingsUpdate = { [`settings.${setting}`]: value };
      await setDoc(doc(db, "users", currentUser.uid), settingsUpdate, { merge: true });
      toast({ title: "Settings updated" });
    } catch (error: any) {
      toast({ title: "Failed to update settings", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };
  
  const handleRemoveAccount = async (accountId: string) => {
    if (currentUser?.uid === accountId) {
      toast({ title: "Cannot remove the current account", variant: "destructive"});
      return;
    }
    if(linkedAccounts.length <= 1) {
      toast({ title: "Cannot remove last account", variant: "destructive"});
      return;
    }
    await removeLinkedAccount(accountId);
  };

  const handleSwitchAccount = async (accountId: string) => {
    if (currentUser?.uid === accountId) return;
    toast({ 
      title: "Switching account...", 
      description: "You'll need to sign in again with the selected account."
    });
    await switchAccount(accountId);
  };

  const handleSignOut = async () => {
    await signOut();
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          />

          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full sm:w-96 bg-background border-l border-border shadow-2xl z-50 overflow-y-auto"
          >
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-display font-bold">Settings</h2>
                <Button size="icon" variant="ghost" onClick={onClose}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Accounts
                  </h3>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    onClick={handleRefreshAccounts}
                    disabled={refreshing}
                    className="h-8 w-8"
                  >
                    <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
                
                <div className="space-y-2">
                  {linkedAccounts.length === 0 ? (
                    <Card className="p-4 text-center text-muted-foreground">
                      <p className="text-sm">No accounts found</p>
                    </Card>
                  ) : (
                    linkedAccounts.map(acc => {
                      const isCurrentAccount = currentUser?.uid === acc.id;
                      return (
                        <motion.div
                          key={acc.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                        >
                          <Card 
                            className={`p-3 flex items-center gap-3 transition-all cursor-pointer ${
                              isCurrentAccount 
                                ? 'border-primary bg-primary/5 shadow-sm' 
                                : 'hover:bg-muted/50 hover:border-muted-foreground/20'
                            }`}
                            onClick={() => !isCurrentAccount && handleSwitchAccount(acc.id)}
                          >
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={acc.photoURL || undefined} />
                              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                                {acc.displayName?.[0] || acc.email?.[0] || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-sm truncate">{acc.displayName || 'User'}</p>
                                {isCurrentAccount && (
                                  <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5">
                                    <Check className="h-3 w-3 mr-0.5" />
                                    Active
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground truncate">{acc.email}</p>
                            </div>
                            {!isCurrentAccount && (
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveAccount(acc.id);
                                }}
                                className="h-8 w-8 shrink-0"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </Card>
                        </motion.div>
                      );
                    })
                  )}
                </div>
                
                {linkedAccounts.length < 3 && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full mt-2 gap-2" 
                    onClick={() => setAddAccountModalOpen(true)}
                  >
                    <PlusCircle className="h-4 w-4"/>
                    Add Account ({linkedAccounts.length}/3)
                  </Button>
                )}
              </div>
              
              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Privacy
                </h3>

                <div className="flex items-center justify-between p-4 rounded-xl border border-border">
                  <div className="flex-1">
                    <Label htmlFor="diary-public" className="cursor-pointer font-medium">
                      Public Diary
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Allow others to view your diary entries
                    </p>
                  </div>
                  <Switch
                    id="diary-public"
                    checked={diaryPublic}
                    onCheckedChange={(checked) => handleSettingChange("diaryPublic", checked)}
                    disabled={saving}
                    data-testid="switch-diary-public"
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl border border-border">
                  <div className="flex-1">
                    <Label htmlFor="anonymous-messages" className="cursor-pointer font-medium">
                      Anonymous Messages
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Allow users to send you anonymous messages
                    </p>
                  </div>
                  <Switch
                    id="anonymous-messages"
                    checked={allowAnonymousMessages}
                    onCheckedChange={(checked) => handleSettingChange("allowAnonymousMessages", checked)}
                    disabled={saving}
                    data-testid="switch-anonymous-messages"
                  />
                </div>
              </div>

              <Separator />

              <div className="pt-4">
                <Button onClick={handleSignOut} variant="destructive" className="w-full gap-2">
                  <LogOut className="h-5 w-5" />
                  Sign Out
                </Button>
              </div>

              <div className="pt-4 text-center text-xs text-muted-foreground">
                <p>Alvice v1.0.0</p>
              </div>
            </div>
          </motion.div>
          <AddAccountModal isOpen={isAddAccountModalOpen} onClose={() => setAddAccountModalOpen(false)} />
        </>
      )}
    </AnimatePresence>
  );
}
