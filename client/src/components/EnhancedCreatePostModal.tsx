import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Image as ImageIcon, Upload, HelpCircle, MessageSquare, Hash, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { collection, addDoc, query, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { uploadPostImages, fileToDataURL } from "@/lib/storage";
import type { Tribe } from "@shared/schema";

interface EnhancedCreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated: () => void;
}

export function EnhancedCreatePostModal({ isOpen, onClose, onPostCreated }: EnhancedCreatePostModalProps) {
  const [postType, setPostType] = useState<"post" | "question">("post");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [selectedTribes, setSelectedTribes] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [tribes, setTribes] = useState<Tribe[]>([]);
  const [loading, setLoading] = useState(false);
  const { currentUser } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      loadTribes();
    }
  }, [isOpen]);

  const loadTribes = async () => {
    try {
      const tribesQuery = query(collection(db, "tribes"));
      const snapshot = await getDocs(tribesQuery);
      const tribesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tribe));
      setTribes(tribesData.filter(t => t.members.includes(currentUser?.uid || "")));
    } catch (error) {
      console.error("Error loading tribes:", error);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles = Array.from(files).slice(0, 3 - imageFiles.length);
    
    // Generate previews
    const previewPromises = newFiles.map(file => fileToDataURL(file));
    const previews = await Promise.all(previewPromises);
    
    setImageFiles(prev => [...prev, ...newFiles]);
    setImagePreviews(prev => [...prev, ...previews]);
  };

  const removeImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim()) && tags.length < 10) {
      setTags(prev => [...prev, tagInput.trim()]);
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setTags(prev => prev.filter(t => t !== tag));
  };

  const toggleTribe = (tribeId: string) => {
    setSelectedTribes(prev => 
      prev.includes(tribeId) 
        ? prev.filter(id => id !== tribeId)
        : prev.length < 5 ? [...prev, tribeId] : prev
    );
  };

  const handleSubmit = async () => {
    if (!currentUser || !title.trim()) return;

    try {
      setLoading(true);
      
      // Upload images to Firebase Storage if any
      let imageUrls: string[] = [];
      if (imageFiles.length > 0) {
        const postId = `post_${Date.now()}`;
        imageUrls = await uploadPostImages(imageFiles, currentUser.uid, postId);
      }

      await addDoc(collection(db, "posts"), {
        authorId: currentUser.uid,
        type: postType,
        title: title.trim(),
        content: content.trim(),
        images: imageUrls,
        tribeIds: selectedTribes,
        tags,
        likes: [],
        commentCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      toast({
        title: postType === "question" ? "Question posted!" : "Post created!",
        description: postType === "question" 
          ? "Your question has been shared with the community"
          : "Your post has been shared successfully",
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
    setPostType("post");
    setTitle("");
    setContent("");
    setImageFiles([]);
    setImagePreviews([]);
    setSelectedTribes([]);
    setTags([]);
    setTagInput("");
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

              <div className="space-y-6">
                <div className="text-center space-y-2 pr-10">
                  <h2 className="text-2xl font-display font-bold">Create a Post</h2>
                  <p className="text-sm text-muted-foreground">Share your thoughts with the community</p>
                </div>

                {/* Media Upload */}
                <div className="space-y-3">
                  <Label>Media (Optional)</Label>
                  <div className="border-2 border-dashed border-border rounded-xl p-6 hover-elevate cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="hidden"
                      id="image-upload"
                      disabled={imageFiles.length >= 3}
                      data-testid="input-image-upload"
                    />
                    <label htmlFor="image-upload" className="cursor-pointer">
                      <div className="flex flex-col items-center gap-2 text-center">
                        <Upload className="h-8 w-8 text-muted-foreground" />
                        <p className="text-sm font-medium">Upload images</p>
                        <p className="text-xs text-muted-foreground">
                          {imageFiles.length}/3 images • PNG, JPG up to 10MB
                        </p>
                      </div>
                    </label>
                  </div>

                  {imagePreviews.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {imagePreviews.map((img, index) => (
                        <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                          <img src={img} alt={`Upload ${index + 1}`} className="w-full h-full object-cover" />
                          <button
                            onClick={() => removeImage(index)}
                            className="absolute top-1 right-1 p-1 rounded-full bg-destructive text-destructive-foreground hover-elevate"
                            data-testid={`button-remove-image-${index}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Post Type Toggle */}
                <div className="space-y-2">
                  <Label>Type</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={postType === "post" ? "default" : "outline"}
                      onClick={() => setPostType("post")}
                      className="gap-2"
                      data-testid="button-type-post"
                    >
                      <MessageSquare className="h-4 w-4" />
                      Sharing
                    </Button>
                    <Button
                      type="button"
                      variant={postType === "question" ? "default" : "outline"}
                      onClick={() => setPostType("question")}
                      className="gap-2"
                      data-testid="button-type-question"
                    >
                      <HelpCircle className="h-4 w-4" />
                      Question
                    </Button>
                  </div>
                </div>

                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title">
                    {postType === "question" ? "What do you want to ask?" : "What do you want to share?"}
                  </Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={postType === "question" ? "Ask your question..." : "Give it a title..."}
                    className="text-lg"
                    data-testid="input-post-title"
                  />
                </div>

                {/* Content */}
                <div className="space-y-2">
                  <Label htmlFor="content">
                    {postType === "question" ? "Add details (optional)" : "Tell us more"}
                  </Label>
                  <Textarea
                    id="content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={postType === "question" 
                      ? "Provide more context to help others answer..." 
                      : "Share your thoughts, experiences, or story..."}
                    className="resize-none min-h-32"
                    data-testid="input-post-content"
                  />
                </div>

                {/* Tribes */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Cross-post to Tribes (Optional)
                  </Label>
                  <div className="flex flex-wrap gap-2 p-3 rounded-lg border border-border min-h-12">
                    {tribes.length > 0 ? (
                      tribes.map(tribe => (
                        <Badge
                          key={tribe.id}
                          variant={selectedTribes.includes(tribe.id) ? "default" : "outline"}
                          className="cursor-pointer hover-elevate"
                          onClick={() => toggleTribe(tribe.id)}
                          data-testid={`badge-tribe-${tribe.id}`}
                        >
                          {tribe.name}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">Join tribes to cross-post</p>
                    )}
                  </div>
                  {selectedTribes.length > 0 && (
                    <p className="text-xs text-muted-foreground">{selectedTribes.length}/5 tribes selected</p>
                  )}
                </div>

                {/* Tags */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Hash className="h-4 w-4" />
                    Tags (Optional)
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                      placeholder="Add tags for better reach..."
                      disabled={tags.length >= 10}
                      data-testid="input-tag"
                    />
                    <Button
                      type="button"
                      onClick={addTag}
                      disabled={!tagInput.trim() || tags.length >= 10}
                      data-testid="button-add-tag"
                    >
                      Add
                    </Button>
                  </div>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {tags.map(tag => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="gap-1 cursor-pointer hover-elevate"
                          onClick={() => removeTag(tag)}
                          data-testid={`badge-tag-${tag}`}
                        >
                          #{tag}
                          <X className="h-3 w-3" />
                        </Badge>
                      ))}
                    </div>
                  )}
                  {tags.length > 0 && (
                    <p className="text-xs text-muted-foreground">{tags.length}/10 tags added</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
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
                    {loading ? "Publishing..." : postType === "question" ? "Post Question" : "Publish"}
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
