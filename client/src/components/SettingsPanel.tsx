import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, LogOut, Lock, Globe, MessageCircle, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

export default function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const { currentUser, userData, signOut, refreshUserData } = useAuth();
  const { toast } = useToast();
  const [darkMode, setDarkMode] = useState(false);
  const [diaryPublic, setDiaryPublic] = useState(true);
  const [allowAnonymousMessages, setAllowAnonymousMessages] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Load dark mode from localStorage
    const isDark = localStorage.getItem("theme") === "dark";
    setDarkMode(isDark);

    // Load user settings
    if (userData?.settings) {
      setDiaryPublic(userData.settings.diaryPublic ?? true);
      setAllowAnonymousMessages(userData.settings.allowAnonymousMessages ?? true);
    }
  }, [userData]);

  const toggleDarkMode = async (checked: boolean) => {
    setDarkMode(checked);
    if (checked) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  const handleSettingChange = async (setting: string, value: boolean) => {
    if (!currentUser) return;

    try {
      setSaving(true);
      
      if (setting === "diaryPublic") {
        setDiaryPublic(value);
      } else if (setting === "allowAnonymousMessages") {
        setAllowAnonymousMessages(value);
      }

      // Build update object that only changes the specific setting
      const settingsUpdate: any = {};
      settingsUpdate[`settings.${setting}`] = value;

      await setDoc(doc(db, "users", currentUser.uid), settingsUpdate, { merge: true });

      // Refresh user data to reflect changes across the app
      if (refreshUserData) {
        await refreshUserData();
      }

      toast({
        title: "Settings updated",
        description: "Your preferences have been saved",
      });
    } catch (error: any) {
      toast({
        title: "Failed to update settings",
        description: error.message,
        variant: "destructive",
      });
      
      // Revert on error
      if (setting === "diaryPublic") {
        setDiaryPublic(!value);
      } else if (setting === "allowAnonymousMessages") {
        setAllowAnonymousMessages(!value);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            data-testid="settings-backdrop"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full sm:w-96 bg-background border-l border-border shadow-2xl z-50 overflow-y-auto"
            data-testid="settings-panel"
          >
            <div className="p-6 space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-display font-bold">Settings</h2>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={onClose}
                  data-testid="button-close-settings"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <Separator />

              {/* Appearance */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Appearance</h3>
                <div className="flex items-center justify-between p-4 rounded-xl border border-border">
                  <div className="flex-1">
                    <Label htmlFor="dark-mode" className="cursor-pointer font-medium">
                      Dark Mode
                    </Label>
                    <p className="text-sm text-muted-foreground">Toggle dark theme</p>
                  </div>
                  <Switch
                    id="dark-mode"
                    checked={darkMode}
                    onCheckedChange={toggleDarkMode}
                    data-testid="switch-dark-mode"
                  />
                </div>
              </div>

              <Separator />

              {/* Privacy */}
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

              {/* Account */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Account
                </h3>

                <Card className="p-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Multi-Account Support</p>
                    <p className="text-sm text-muted-foreground">
                      Add and switch between multiple accounts
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-2"
                      disabled
                      data-testid="button-add-account"
                    >
                      Add Account (Coming Soon)
                    </Button>
                  </div>
                </Card>
              </div>

              <Separator />

              {/* Sign Out */}
              <div className="pt-4">
                <Button
                  onClick={handleSignOut}
                  variant="destructive"
                  className="w-full gap-2"
                  data-testid="button-sign-out"
                >
                  <LogOut className="h-5 w-5" />
                  Sign Out
                </Button>
              </div>

              {/* App Info */}
              <div className="pt-4 text-center text-xs text-muted-foreground">
                <p>Alvice v1.0.0</p>
                <p className="mt-1">Express Yourself, Track Your Mood</p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
