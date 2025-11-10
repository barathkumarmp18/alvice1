import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Bell, Heart, MessageCircle, UserPlus, Users, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { formatDistanceToNow } from "date-fns";
import { collection, query, where, orderBy, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface Notification {
  id: string;
  type: "like" | "comment" | "follow" | "tribe" | "mention";
  fromUserId: string;
  fromUserName?: string;
  fromUserPhoto?: string;
  title: string;
  content: string;
  read: boolean;
  createdAt: string;
  postId?: string;
  tribeId?: string;
}

const NOTIFICATION_ICONS: Record<string, any> = {
  like: Heart,
  comment: MessageCircle,
  follow: UserPlus,
  tribe: Users,
  mention: TrendingUp,
};

export default function Notifications() {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: "1",
      type: "like",
      fromUserId: "user1",
      fromUserName: "Sarah Johnson",
      fromUserPhoto: "",
      title: "New like on your post",
      content: "Sarah liked your post about feeling happy today",
      read: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    },
    {
      id: "2",
      type: "follow",
      fromUserId: "user2",
      fromUserName: "Mike Chen",
      fromUserPhoto: "",
      title: "New follower",
      content: "Mike started following you",
      read: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    },
    {
      id: "3",
      type: "comment",
      fromUserId: "user3",
      fromUserName: "Emma Davis",
      fromUserPhoto: "",
      title: "New comment",
      content: 'Emma commented: "That\'s so inspiring! 🌟"',
      read: true,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    },
    {
      id: "4",
      type: "tribe",
      fromUserId: "user4",
      fromUserName: "Wellness Warriors",
      fromUserPhoto: "",
      title: "Tribe invitation",
      content: "You've been invited to join Wellness Warriors tribe",
      read: true,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    },
  ]);
  const [loading, setLoading] = useState(false);

  const markAsRead = async (notificationId: string) => {
    try {
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      // In real implementation, update Firestore
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      // In real implementation, batch update Firestore
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-md border-b border-border">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-display font-bold">Notifications</h1>
            {unreadCount > 0 && (
              <span className="px-2 py-1 text-xs font-semibold bg-destructive text-white rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-sm"
              data-testid="button-mark-all-read"
            >
              Mark all as read
            </Button>
          )}
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-2">
        {loading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="p-4 animate-pulse">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-muted rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-full" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : notifications.length > 0 ? (
          notifications.map((notification) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              onMarkAsRead={markAsRead}
            />
          ))
        ) : (
          <Card className="p-12 text-center">
            <Bell className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No notifications yet</h3>
            <p className="text-muted-foreground">When people interact with your content, you'll see it here</p>
          </Card>
        )}
      </div>
    </div>
  );
}

function NotificationCard({
  notification,
  onMarkAsRead,
}: {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
}) {
  const Icon = NOTIFICATION_ICONS[notification.type];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => !notification.read && onMarkAsRead(notification.id)}
      data-testid={`notification-${notification.id}`}
    >
      <Card
        className={`p-4 cursor-pointer hover-elevate active-elevate-2 transition-all ${
          !notification.read ? "border-primary bg-primary/5" : ""
        }`}
      >
        <div className="flex items-start gap-4">
          <div className="relative">
            <Avatar className="h-12 w-12">
              <AvatarImage src={notification.fromUserPhoto} />
              <AvatarFallback>{notification.fromUserName?.[0] || "N"}</AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-card border-2 border-card flex items-center justify-center">
              <Icon className="h-3 w-3 text-primary" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <p className="font-semibold text-sm">{notification.title}</p>
              {!notification.read && (
                <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1.5" />
              )}
            </div>
            <p className="text-sm text-foreground">{notification.content}</p>
            <p className="text-xs text-muted-foreground mt-2">
              {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
            </p>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
