import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Bell, Heart, MessageCircle, UserPlus, Users, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { formatDistanceToNow } from "date-fns";
import {
  collection,
  query,
  where,
  orderBy,
  doc,
  updateDoc,
  onSnapshot,
  getDoc,
  writeBatch,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

// Interfaces for our data structures
interface UserData {
  id: string;
  username?: string;
  photoURL?: string;
  name?: string;
}

interface TribeData {
    id: string;
    name?: string;
}

interface Notification {
  id: string;
  type: "like" | "comment" | "follow" | "tribe_invite" | "mention";
  actorId: string;
  actor?: UserData; // This will be enriched
  title: string;
  content: string;
  read: boolean;
  createdAt: { seconds: number; nanoseconds: number };
  postId?: string;
  tribeId?: string;
  tribeName?: string;
}

const NOTIFICATION_ICONS: Record<string, any> = {
  like: Heart,
  comment: MessageCircle,
  follow: UserPlus,
  tribe_invite: Users,
  mention: TrendingUp,
};

// Helper to generate readable content from notification data
const generateNotificationContent = (
    notification: Partial<Notification>, 
    actor?: UserData, 
    tribe?: TribeData
  ): { title: string; content: string } => {
  const actorName = actor?.username || "Someone";
  switch (notification.type) {
    case "like":
      return { title: "New Like", content: `${actorName} liked your post.` };
    case "comment":
      return { title: "New Comment", content: `${actorName} left a comment.` };
    case "follow":
      return { title: "New Follower", content: `${actorName} started following you.` };
    case "tribe_invite":
      const tribeName = tribe?.name || "a tribe";
      return { title: "Tribe Invitation", content: `${actorName} invited you to join ${tribeName}.` };
    case "mention":
        return { title: "You were mentioned", content: `${actorName} mentioned you in a post.` };
    default:
      return { title: "New Notification", content: "You have a new update." };
  }
};

export default function Notifications() {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser?.uid) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "notifications"),
      where("userId", "==", currentUser.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      setLoading(true);
      const docs = snapshot.docs;

      const actorIds = Array.from(new Set(docs.map(doc => doc.data().actorId).filter(id => id)));
      const tribeIds = Array.from(new Set(docs.map(doc => doc.data().tribeId).filter(id => id)));

      const [actorsData, tribesData] = await Promise.all([
        Promise.all(actorIds.map(id => getDoc(doc(db, "users", id)).then(d => ({ ...d.data(), id: d.id } as UserData)))),
        Promise.all(tribeIds.map(id => getDoc(doc(db, "tribes", id)).then(d => ({ ...d.data(), id: d.id } as TribeData))))
      ]);
      
      const actorsMap = new Map(actorsData.map(a => [a.id, a]));
      const tribesMap = new Map(tribesData.map(t => [t.id, t]));

      const enrichedNotifications: Notification[] = docs.map((doc) => {
        const data = doc.data();
        const actor = actorsMap.get(data.actorId);
        const tribe = tribesMap.get(data.tribeId);
        const { title, content } = generateNotificationContent(data, actor, tribe);
        
        return {
          id: doc.id,
          ...data,
          actor,
          title,
          content,
          tribeName: tribe?.name,
        } as Notification;
      });

      setNotifications(enrichedNotifications);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const markAsRead = async (notificationId: string) => {
    try {
      await updateDoc(doc(db, "notifications", notificationId), { read: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
        if(!currentUser) return;
        const unreadNotifs = notifications.filter(n => !n.read);
        if(unreadNotifs.length === 0) return;

        const batch = writeBatch(db);
        unreadNotifs.forEach(notification => {
            const notifRef = doc(db, "notifications", notification.id);
            batch.update(notifRef, { read: true });
        });
        await batch.commit();
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const handleFollow = async (actorId: string) => {
      if(!currentUser) return;
      try {
        const currentUserRef = doc(db, "users", currentUser.uid);
        const actorRef = doc(db, "users", actorId);

        await updateDoc(currentUserRef, { following: arrayUnion(actorId) });
        await updateDoc(actorRef, { followers: arrayUnion(currentUser.uid) });
        
        // Optional: create a notification for the user you just followed back
        // await addDoc(collection(db, "notifications"), { ... });

      } catch (error) {
        console.error("Error following back user:", error);
      }
  }

  const handleTribeInviteResponse = async (notification: Notification, accept: boolean) => {
    if(!currentUser || !notification.tribeId) return;
    try {
        if(accept) {
            const tribeRef = doc(db, "tribes", notification.tribeId);
            await updateDoc(tribeRef, {
                members: arrayUnion(currentUser.uid)
            });
        }
        // Whether accepted or declined, we can remove the invitation notification
        await updateDoc(doc(db, "notifications", notification.id), { read: true });

    } catch (error) {
        console.error("Error responding to tribe invite:", error);
    }
  }

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
              onFollow={handleFollow}
              onTribeInviteResponse={handleTribeInviteResponse}
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
  onFollow,
  onTribeInviteResponse,
}: {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onFollow: (actorId: string) => void;
  onTribeInviteResponse: (notification: Notification, accept: boolean) => void;
}) {
  const Icon = NOTIFICATION_ICONS[notification.type] || Bell;

  const handleCardClick = () => {
      if(!notification.read) {
          onMarkAsRead(notification.id)
      }
      // Optionally navigate to post/user profile
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      data-testid={`notification-${notification.id}`}
    >
      <Card
        className={`p-4 transition-all ${
          !notification.read ? "border-primary bg-primary/5" : ""
        }`}
      >
        <div className="flex items-start gap-4" onClick={handleCardClick} style={{cursor: 'pointer'}}>
          <div className="relative">
            <Avatar className="h-12 w-12">
              <AvatarImage src={notification.actor?.photoURL} />
              <AvatarFallback>{notification.actor?.name?.[0] || "A"}</AvatarFallback>
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
              {notification.createdAt && formatDistanceToNow(new Date(notification.createdAt.seconds * 1000), { addSuffix: true })}
            </p>
          </div>
        </div>
        {!notification.read && (
            <div className="flex gap-2 justify-end mt-2">
                {notification.type === 'follow' && <Button size="sm" onClick={() => onFollow(notification.actorId)}>Follow Back</Button>}
                {notification.type === 'tribe_invite' && (
                    <>
                        <Button size="sm" variant="outline" onClick={() => onTribeInviteResponse(notification, false)}>Decline</Button>
                        <Button size="sm" onClick={() => onTribeInviteResponse(notification, true)}>Accept</Button>
                    </>
                )}
            </div>
        )}
      </Card>
    </motion.div>
  );
}
