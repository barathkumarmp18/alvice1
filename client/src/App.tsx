import { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import { queryClient } from "./lib/queryClient";
import { AuthProvider, useAuth } from "./lib/auth-context";

import { BottomNav } from "./components/BottomNav";
import SplashScreen from "./pages/SplashScreen";
import AuthPage from "./pages/AuthPage";
import ProfileSetup from "./pages/ProfileSetup";
import LinkAccountPage from "./pages/LinkAccountPage";
import Home from "./pages/Home";
import Chats from "./pages/Chats";
import Explore from "./pages/Explore";
import CreateTribe from "./pages/CreateTribe";
import Diary from "./pages/Diary";
import Profile from "./pages/Profile";
import Notifications from "./pages/Notifications";
import NotFound from "@/pages/not-found";

function AppRouter() {
  const { currentUser, userData, loading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);

  // Service worker registration removed - not currently used

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  if (loading) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center space-y-4">
            <div className="inline-block animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      );
  }

  if (!currentUser) {
    return <AuthPage />;
  }

  return (
    <>
        <Switch>
            {/* This route is special and must be available when logged in, regardless of profile state */}
            <Route path="/link-account" component={LinkAccountPage} />

            {/* If profile is incomplete, all other routes are redirected to the setup page */}
            {!userData?.profileSetupComplete && <Route path="/:rest*" component={ProfileSetup} />}

            {/* Main App Routes - only available after profile setup */}
            <Route path="/" component={Home} />
            <Route path="/chats" component={Chats} />
            <Route path="/explore" component={Explore} />
            <Route path="/create-tribe" component={CreateTribe} />
            <Route path="/diary" component={Diary} />
            <Route path="/profile" component={Profile} />
            <Route path="/notifications" component={Notifications} />

            {/* Fallback for any other route */}
            <Route component={NotFound} />
        </Switch>
        {/* Only show the bottom nav if the user has completed setup and is in the main app */}
        {userData?.profileSetupComplete && <BottomNav />}
    </>
  );
}

function App() {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
            <TooltipProvider>
                <Toaster />
                <AppRouter />
            </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    );
  }

export default App;
