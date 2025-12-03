import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Home, MessageCircle, Users, Calendar, User } from "lucide-react";

const navItems = [
  { path: "/diary", icon: Calendar, label: "Diary" },
  { path: "/chats", icon: MessageCircle, label: "Chats" },
  { path: "/", icon: Home, label: "Home" },
  { path: "/explore", icon: Users, label: "Explore" },
  { path: "/profile", icon: User, label: "Profile" },
];

export function BottomNav() {
  const [location] = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border shadow-2xl">
      <div className="max-w-screen-xl mx-auto px-4">
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path;
            
            return (
              <Link
                key={item.path}
                href={item.path}
                className="relative flex flex-col items-center justify-center w-16 h-14 group"
                data-testid={`nav-${item.label.toLowerCase()}`}
              >
                <motion.div
                  className={`relative flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 ${
                    isActive 
                      ? "bg-gradient-to-r from-emotion-happiness to-emotion-excitement shadow-lg shadow-emotion-happiness/30" 
                      : "bg-transparent hover:bg-muted/50"
                  }`}
                  whileTap={{ scale: 0.9 }}
                  animate={{ scale: isActive ? 1.05 : 1 }}
                >
                  <Icon 
                    className={`h-5 w-5 transition-colors duration-200 ${
                      isActive 
                        ? "text-white" 
                        : "text-muted-foreground group-hover:text-foreground"
                    }`} 
                  />
                </motion.div>
                <span 
                  className={`text-xs mt-1 font-medium transition-all duration-200 ${
                    isActive 
                      ? "text-foreground font-semibold" 
                      : "text-muted-foreground group-hover:text-foreground"
                  }`}
                >
                  {item.label}
                </span>
                
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-8 h-1 bg-gradient-to-r from-emotion-happiness to-emotion-excitement rounded-full"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
