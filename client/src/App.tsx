import { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import { AnimatePresence } from "framer-motion";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "./lib/auth-context";
import { BottomNav } from "./components/BottomNav";
import SplashScreen from "./pages/SplashScreen";
import AuthPage from "./pages/AuthPage";
import ProfileSetup from "./pages/ProfileSetup";
import Home from "./pages/Home";
import Chats from "./pages/Chats";
import Explore from "./pages/Explore";
import CreateTribe from "./pages/CreateTribe";
import Diary from "./pages/Diary";
import Profile from "./pages/Profile";
import NotFound from "@/pages/not-found";

function Router() {
  const { currentUser, userData, loading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Register service worker for PWA
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((error) => {
        console.log('Service worker registration failed:', error);
      });
    }
  }, []);

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

  if (!userData?.profileSetupComplete) {
    return <ProfileSetup />;
  }

  return (
    <>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/chats" component={Chats} />
        <Route path="/explore" component={Explore} />
        <Route path="/create-tribe" component={CreateTribe} />
        <Route path="/diary" component={Diary} />
        <Route path="/profile" component={Profile} />
        <Route component={NotFound} />
      </Switch>
      <BottomNav />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
