import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Link2, Users, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { collection, query, where, getDocs, addDoc, orderBy, limit, doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { wsClient } from "@/lib/websocket-client";
import { formatDistanceToNow } from "date-fns";
import type { Message, User } from "@shared/schema";

export default function Chats() {
  const [conversations, setConversations] = useState<{ user: User; lastMessage?: Message }[]>([]);
  const [selectedChat, setSelectedChat] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [anonymousLink, setAnonymousLink] = useState("");
  const [showAnonymousCenter, setShowAnonymousCenter] = useState(false);
  const { currentUser, userData } = useAuth();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentUser) {
      loadConversations();
      generateAnonymousLink();
      
      // Connect to WebSocket
      wsClient.connect(currentUser.uid);
      
      // Subscribe to real-time messages
      const unsubscribe = wsClient.subscribe((data) => {
        if (data.type === 'message') {
          // Convert WebSocket message format to our Message format
          if (selectedChat && (
            (data.senderId === currentUser.uid && selectedChat.id === currentUser.uid) ||
            (data.senderId === selectedChat.id)
          )) {
            const newMessage: Message = {
              id: `temp-${Date.now()}`,
              senderId: data.senderId,
              receiverId: selectedChat.id,
              content: data.content,
              isAnonymous: false,
              read: false,
              createdAt: data.timestamp
            };
            setMessages(prev => [...prev, newMessage]);
            scrollToBottom();
          }
          loadConversations();
        }
      });
      
      return () => {
        unsubscribe();
        wsClient.disconnect();
      };
    }
  }, [currentUser, selectedChat]);

  useEffect(() => {
    if (!currentUser || !selectedChat) return;

    // Set up real-time listener for messages in this conversation
    const messagesQuery = query(
      collection(db, "messages"),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const chatMessages = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Message))
        .filter(msg => 
          (msg.senderId === currentUser.uid && msg.receiverId === selectedChat.id) ||
          (msg.senderId === selectedChat.id && msg.receiverId === currentUser.uid)
        );

      setMessages(chatMessages);
      scrollToBottom();
    }, (error) => {
      console.error("Error loading messages:", error);
    });

    return () => unsubscribe();
  }, [selectedChat, currentUser]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadConversations = async () => {
    if (!currentUser?.uid) return;

    try {
      const messagesQuery = query(
        collection(db, "messages"),
        where("receiverId", "==", currentUser.uid),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(messagesQuery);

      const userIds = new Set(snapshot.docs.map(doc => doc.data().senderId));
      const conversations = await Promise.all(
        Array.from(userIds).map(async (userId) => {
          // Use doc() to get user by document ID instead of querying by "id" field
          const userDocRef = doc(db, "users", userId);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const user = { id: userDoc.id, ...userDoc.data() } as User;
            const lastMessageDoc = snapshot.docs.find(doc => doc.data().senderId === userId);
            const lastMessage = lastMessageDoc ? { id: lastMessageDoc.id, ...lastMessageDoc.data() } as Message : undefined;
            return { user, lastMessage };
          }
          return null;
        })
      );

      setConversations(conversations.filter(c => c !== null) as { user: User; lastMessage?: Message }[]);
    } catch (error) {
      console.error("Error loading conversations:", error);
    }
  };

  const loadMessages = async (userId: string) => {
    // This function is no longer needed as we use real-time listeners
    // Kept for compatibility
  };

  const generateAnonymousLink = async () => {
    if (!currentUser) return;
    
    if (userData?.anonymousLinkId) {
      setAnonymousLink(`${window.location.origin}/anonymous/${userData.anonymousLinkId}`);
    } else {
      // Generate a unique link ID
      const linkId = `${currentUser.uid.substring(0, 8)}_${Math.random().toString(36).substring(7)}`;
      setAnonymousLink(`${window.location.origin}/anonymous/${linkId}`);
      
      // Save the link ID to the user document
      try {
        await setDoc(doc(db, "users", currentUser.uid), {
          anonymousLinkId: linkId,
        }, { merge: true });
      } catch (error) {
        console.error("Error saving anonymous link:", error);
      }
    }
  };

  const copyAnonymousLink = () => {
    navigator.clipboard.writeText(anonymousLink);
    toast({
      title: "Link copied!",
      description: "Share this link to receive anonymous messages",
    });
  };

  const sendMessage = async () => {
    if (!currentUser || !selectedChat || !newMessage.trim()) return;

    try {
      const messageData = {
        senderId: currentUser.uid,
        receiverId: selectedChat.id,
        content: newMessage.trim(),
        isAnonymous: false,
        read: false,
        createdAt: new Date().toISOString(),
      };

      await addDoc(collection(db, "messages"), messageData);
      
      // Send via WebSocket for real-time delivery
      wsClient.send({
        type: 'message',
        senderId: currentUser.uid,
        recipientId: selectedChat.id,
        content: newMessage.trim()
      });

      setNewMessage("");
      scrollToBottom();
    } catch (error: any) {
      toast({
        title: "Failed to send message",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-md border-b border-border">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-2xl font-display font-bold">Chats</h1>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">
        {/* Anonymous Center - Moved below header */}
        <Card className="p-4 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-purple-500/10">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-500" />
              <h3 className="font-semibold">Anonymous Center</h3>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium mb-1">Your Anonymous Message Link</p>
                <p className="text-xs text-muted-foreground truncate break-all">{anonymousLink}</p>
              </div>
              <Button
                size="sm"
                onClick={copyAnonymousLink}
                className="gap-2 hover-elevate active-elevate-2 shrink-0"
                data-testid="button-copy-link"
              >
                <Link2 className="h-4 w-4" />
                <span className="hidden sm:inline">Copy Link</span>
                <span className="sm:hidden">Copy</span>
              </Button>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Conversations list */}
          <div className="md:col-span-1 space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground mb-3">Messages</h2>
            {conversations.length > 0 ? (
              conversations.map(({ user, lastMessage }) => (
                <Card
                  key={user.id}
                  className={`p-4 cursor-pointer hover-elevate active-elevate-2 ${
                    selectedChat?.id === user.id ? "border-primary" : ""
                  }`}
                  onClick={() => setSelectedChat(user)}
                  data-testid={`chat-${user.id}`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={user.photoURL} />
                      <AvatarFallback>{user.displayName?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{user.displayName}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {lastMessage?.content || "No messages yet"}
                      </p>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <Card className="p-6 text-center">
                <p className="text-sm text-muted-foreground">No conversations yet</p>
              </Card>
            )}
          </div>

          {/* Chat window */}
          <div className="md:col-span-2">
            {selectedChat ? (
              <Card className="flex flex-col h-[600px]">
                {/* Chat header */}
                <div className="p-4 border-b border-border flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={selectedChat.photoURL} />
                    <AvatarFallback>{selectedChat.displayName?.[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{selectedChat.displayName}</p>
                    <p className="text-xs text-muted-foreground">@{selectedChat.username}</p>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4" data-testid="container-messages">
                  {messages.map((message) => {
                    const isSent = message.senderId === currentUser?.uid;
                    return (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 10 }}
                        data-testid={`message-${message.id}`}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${isSent ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[70%] p-3 rounded-2xl ${
                            isSent
                              ? "bg-gradient-to-r from-emotion-happiness to-emotion-excitement text-white"
                              : "bg-muted"
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                          <p className={`text-xs mt-1 ${isSent ? "text-white/70" : "text-muted-foreground"}`}>
                            {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message input */}
                <div className="p-4 border-t border-border">
                  <div className="flex gap-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                      className="flex-1"
                      data-testid="input-message"
                    />
                    <Button
                      onClick={sendMessage}
                      disabled={!newMessage.trim()}
                      size="icon"
                      className="bg-gradient-to-r from-emotion-happiness to-emotion-excitement"
                      data-testid="button-send-message"
                    >
                      <Send className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="h-[600px] flex items-center justify-center">
                <p className="text-muted-foreground">Select a conversation to start chatting</p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
