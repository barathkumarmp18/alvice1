import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Image as ImageIcon, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { collection, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated: () => void;
}

export function CreatePostModal({ isOpen, onClose, onPostCreated }: CreatePostModalProps) {
  const [postType, setPostType] = useState<"quick" | "story" | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!currentUser || !postType || !title.trim()) return;

    try {
      setLoading(true);
      await addDoc(collection(db, "posts"), {
        authorId: currentUser.uid,
        type: postType,
        title: title.trim(),
        content: content.trim(),
        images: [],
        tribeIds: [],
        likes: [],
        commentCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      toast({
        title: "Post created!",
        description: "Your post has been shared successfully",
      });

      onPostCreated();
      handleClose();
    } catch (error: any) {
      toast({
        title: "Failed to create post",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPostType(null);
    setTitle("");
    setContent("");
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", damping: 25 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            <Card className="p-6 relative">
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 p-2 rounded-full hover-elevate active-elevate-2"
                data-testid="button-close-create-post"
              >
                <X className="h-5 w-5" />
              </button>

              <AnimatePresence mode="wait">
                {!postType ? (
                  <motion.div
                    key="select-type"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-6"
                  >
                    <div className="text-center space-y-2">
                      <h2 className="text-2xl font-display font-bold">Create a Post</h2>
                      <p className="text-muted-foreground">Choose what type of post you want to create</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <PostTypeCard
                        icon={<ImageIcon className="h-8 w-8" />}
                        title="Quick Post"
                        description="Share a moment with images and short text"
                        onClick={() => setPostType("quick")}
                        testId="button-quick-post"
                      />
                      <PostTypeCard
                        icon={<FileText className="h-8 w-8" />}
                        title="Story"
                        description="Write a longer blog-style post"
                        onClick={() => setPostType("story")}
                        testId="button-story-post"
                      />
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="create-post"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div className="flex items-center gap-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPostType(null)}
                        data-testid="button-back-post-type"
                      >
                        ← Back
                      </Button>
                      <h2 className="text-2xl font-display font-bold">
                        {postType === "quick" ? "Quick Post" : "Story"}
                      </h2>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="title">Title</Label>
                        <Input
                          id="title"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="Give your post a title..."
                          className="h-12 text-lg"
                          data-testid="input-post-title"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="content">Content</Label>
                        <Textarea
                          id="content"
                          value={content}
                          onChange={(e) => setContent(e.target.value)}
                          placeholder={postType === "quick" ? "What's on your mind?" : "Write your story..."}
                          className={`resize-none ${postType === "story" ? "min-h-64" : "min-h-32"}`}
                          data-testid="input-post-content"
                        />
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={handleClose}
                        className="flex-1"
                        data-testid="button-cancel-post"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSubmit}
                        disabled={!title.trim() || loading}
                        className="flex-1 bg-gradient-to-r from-emotion-happiness to-emotion-excitement"
                        data-testid="button-publish-post"
                      >
                        {loading ? "Publishing..." : "Publish"}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function PostTypeCard({ 
  icon, 
  title, 
  description, 
  onClick,
  testId 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string; 
  onClick: () => void;
  testId: string;
}) {
  return (
    <motion.button
      onClick={onClick}
      className="p-6 rounded-2xl border-2 border-border bg-card hover-elevate active-elevate-2 text-left"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      data-testid={testId}
    >
      <div className="text-primary mb-3">{icon}</div>
      <h3 className="text-lg font-display font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </motion.button>
  );
}
