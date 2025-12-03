import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { doc, setDoc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db, storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { 
  Sparkles, User, Camera, ArrowRight, ArrowLeft, Compass, Pen, 
  GraduationCap, Briefcase, Wrench, Coffee, School, HelpCircle,
  Building2, BookOpen, Heart, Zap, Quote, ChevronDown, ChevronUp,
  Loader2, AlertCircle, CheckCircle2
} from "lucide-react";
import type { UserRole, LifeZone } from "@shared/schema";

const fallbackQuotes: Record<string, string[]> = {
  creator: [
    "Your voice may be someone's turning point today.",
    "The story you hold could lift someone up.",
    "Your words carry more power than you know."
  ],
  explorer: [
    "Every answer begins with one brave question.",
    "Clarity grows every time you choose to explore.",
    "Your curiosity is quietly shaping your path."
  ],
  identity: [
    "Who you are is already a strong beginning.",
    "Your identity holds more depth than you see.",
    "This moment is the start of your real story."
  ],
  lifezone: [
    "Every phase teaches something valuable.",
    "You're exactly in the chapter meant for you.",
    "Life unfolds even when you can't feel it."
  ],
  college: [
    "College shapes you in ways you'll value later.",
    "You're growing through more than just classes.",
    "This chapter will echo far into your future."
  ],
  working: [
    "Your effort is building your future quietly.",
    "Work becomes meaningful when it aligns with you.",
    "Every day you're crafting your own direction."
  ],
  skills: [
    "Every skill starts with uncertain small steps.",
    "Patience turns beginners into something remarkable.",
    "You're closer to mastery than you believe."
  ],
  break: [
    "A pause today becomes strength tomorrow.",
    "Resting is part of becoming your better self.",
    "This quiet moment will make sense later."
  ],
  personality: [
    "Your energy speaks long before your words do.",
    "Who you are naturally draws what you need.",
    "Your presence leaves ripples you don't notice."
  ],
  final: [
    "A new chapter opens the moment you step forward.",
    "This is where your story finds direction.",
    "Every journey begins quietly before it becomes real."
  ]
};

const topicCategories: Record<string, { icon: string; color: string; subtopics: string[] }> = {
  "Life & Growth": {
    icon: "🌱",
    color: "from-green-500/20 to-emerald-500/20",
    subtopics: [
      "Self-improvement", "Building discipline", "Daily habits", "Finding motivation",
      "Morning routines", "Building confidence", "Gaining clarity", "Finding meaning",
      "Inner growth", "Mental clarity", "Peak productivity", "Building resilience",
      "Reinventing yourself", "Identity exploration", "Finding direction", "Goal setting",
      "Mindfulness practice", "Personal development", "Life coaching tips", "Success mindset"
    ]
  },
  "Mental Health": {
    icon: "🧠",
    color: "from-purple-500/20 to-violet-500/20",
    subtopics: [
      "Managing anxiety", "Dealing with depression", "Handling stress", "Healing journey",
      "Processing trauma", "Overcoming loneliness", "Stopping overthinking", "Emotional pain",
      "Mood swings", "Anger management", "Facing fears", "Burnout recovery",
      "Dealing with sadness", "Feeling empty", "Self-worth", "Overcoming insecurity",
      "Therapy experiences", "Mental health awareness", "Coping strategies", "Self-care tips"
    ]
  },
  "Relationships & Love": {
    icon: "💕",
    color: "from-pink-500/20 to-rose-500/20",
    subtopics: [
      "Dating advice", "Finding love", "Crush confessions", "Moving on from breakups",
      "Healing heartbreak", "Trust issues", "Making friends", "Toxic relationships",
      "Better communication", "Attachment styles", "Long-distance love", "Family problems",
      "Setting boundaries", "Handling rejection", "Conflict resolution", "Healthy relationships",
      "Marriage advice", "Friendship goals", "Social skills", "Relationship tips"
    ]
  },
  "Career & Money": {
    icon: "💼",
    color: "from-blue-500/20 to-cyan-500/20",
    subtopics: [
      "Job hunting", "Landing internships", "Resume tips", "Interview prep",
      "Freelancing life", "Building skills", "Getting promotions", "Startup stories",
      "Founder life", "Business advice", "Money management", "Saving tips",
      "Investing basics", "Digital careers", "Creator economy", "Side hustles",
      "Passive income", "Career switch", "Work-life balance", "Networking tips"
    ]
  },
  "Education & Learning": {
    icon: "📚",
    color: "from-amber-500/20 to-yellow-500/20",
    subtopics: [
      "Study tips", "Better concentration", "Exam preparation", "College life",
      "School life", "Time management", "Note-taking methods", "Academic stress",
      "Choosing courses", "Learning strategies", "Online learning", "Study motivation",
      "Scholarship tips", "Research help", "Project ideas", "Academic success",
      "Language learning", "Skill development", "Certifications", "Education abroad"
    ]
  },
  "Health & Fitness": {
    icon: "💪",
    color: "from-orange-500/20 to-red-500/20",
    subtopics: [
      "Fitness journey", "Workout routines", "Diet tips", "Weight loss stories",
      "Eating habits", "Better sleep", "Routine building", "Skincare tips",
      "Self-care rituals", "Minimalist living", "Healthy habits", "Discipline building",
      "Yoga practice", "Meditation", "Body positivity", "Nutrition advice",
      "Home workouts", "Gym tips", "Running motivation", "Sports training"
    ]
  },
  "Stories & Inspiration": {
    icon: "✨",
    color: "from-indigo-500/20 to-purple-500/20",
    subtopics: [
      "Life lessons", "Heartbreak stories", "Success stories", "Comeback stories",
      "Personal experiences", "Learning from failures", "Journey sharing", "Transformation stories",
      "Motivational content", "Inspiring quotes", "Real life struggles", "Overcoming obstacles",
      "Dream chasing", "Risk taking", "Life changing moments", "Growth stories"
    ]
  },
  "Creativity & Arts": {
    icon: "🎨",
    color: "from-fuchsia-500/20 to-pink-500/20",
    subtopics: [
      "Writing tips", "Journaling", "Art inspiration", "Content creation",
      "Photography", "Finding inspiration", "Creative ideas", "Creative struggles",
      "Music creation", "Graphic design", "Video editing", "Storytelling",
      "Poetry writing", "Drawing tips", "Digital art", "Creative hobbies"
    ]
  },
  "Tech & Digital": {
    icon: "💻",
    color: "from-slate-500/20 to-gray-500/20",
    subtopics: [
      "Coding journey", "AI tools", "Tech news", "Productivity apps",
      "Digital minimalism", "Gadget reviews", "Online life", "Gaming",
      "Social media growth", "Web development", "App building", "Tech careers",
      "Cybersecurity", "Crypto basics", "Tech tutorials", "Software tips"
    ]
  },
  "Entertainment & Fun": {
    icon: "🎮",
    color: "from-teal-500/20 to-cyan-500/20",
    subtopics: [
      "Movies & shows", "Music vibes", "Book recommendations", "Anime & manga",
      "Gaming community", "Pop culture", "Memes & humor", "Celebrity news",
      "Event experiences", "Travel stories", "Food adventures", "Weekend plans",
      "Hobbies", "Festival vibes", "Concert experiences", "Fun activities"
    ]
  },
  "Spirituality & Philosophy": {
    icon: "🕊️",
    color: "from-sky-500/20 to-blue-500/20",
    subtopics: [
      "Spiritual growth", "Finding purpose", "Meditation practice", "Inner peace",
      "Life philosophy", "Gratitude practice", "Manifestation", "Universe signs",
      "Soul searching", "Deep thoughts", "Wisdom sharing", "Religious discussions",
      "Astrology", "Tarot insights", "Energy healing", "Mindful living"
    ]
  },
  "Social Issues": {
    icon: "🌍",
    color: "from-emerald-500/20 to-green-500/20",
    subtopics: [
      "Social awareness", "Environment", "Mental health advocacy", "Gender equality",
      "LGBTQ+ support", "Diversity matters", "Community building", "Volunteering",
      "Social change", "Youth voices", "Education access", "Healthcare talks",
      "Political awareness", "Human rights", "Climate action", "Social justice"
    ]
  }
};

const lifeZoneOptions: { value: LifeZone; label: string; icon: any; description: string }[] = [
  { value: "college", label: "College", icon: GraduationCap, description: "Currently in college/university" },
  { value: "working", label: "Working", icon: Briefcase, description: "Currently employed" },
  { value: "skill", label: "Building Skills", icon: Wrench, description: "Learning and growing" },
  { value: "break", label: "Taking a Break", icon: Coffee, description: "On a gap period" },
  { value: "school", label: "School", icon: School, description: "Still in school" },
  { value: "prefer_not", label: "Prefer Not to Say", icon: HelpCircle, description: "Keep it private" },
];

const energyWordOptions = [
  "Creative", "Ambitious", "Calm", "Adventurous", "Curious", "Empathetic",
  "Focused", "Optimistic", "Resilient", "Thoughtful", "Bold", "Gentle",
  "Driven", "Playful", "Wise", "Passionate", "Mindful", "Authentic"
];

function getRandomQuote(context: string): string {
  const quotes = fallbackQuotes[context] || fallbackQuotes.final;
  return quotes[Math.floor(Math.random() * quotes.length)];
}

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0
  }),
  center: {
    x: 0,
    opacity: 1
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 300 : -300,
    opacity: 0
  })
};

export default function ProfileSetup() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [loading, setLoading] = useState(false);
  const [currentQuote, setCurrentQuote] = useState("");
  const [quoteLoading, setQuoteLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [role, setRole] = useState<UserRole | "">("");
  const [displayName, setDisplayName] = useState(currentUser?.displayName || "");
  const [username, setUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [profilePicture, setProfilePicture] = useState<string>(currentUser?.photoURL || "");
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [lifeZone, setLifeZone] = useState<LifeZone | "">("");
  
  const [collegeName, setCollegeName] = useState("");
  const [collegeYear, setCollegeYear] = useState("");
  const [collegeCourse, setCollegeCourse] = useState("");
  
  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [workExperience, setWorkExperience] = useState("");
  
  const [skillLevel, setSkillLevel] = useState([50]);
  const [learningSkill, setLearningSkill] = useState("");
  
  const [breakReason, setBreakReason] = useState("");
  const [breakDuration, setBreakDuration] = useState("");
  
  const [schoolName, setSchoolName] = useState("");
  const [schoolGrade, setSchoolGrade] = useState("");
  
  const [oneLineStory, setOneLineStory] = useState("");
  const [energyWords, setEnergyWords] = useState<string[]>([]);
  
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  const checkUsernameAvailability = useCallback(async (usernameToCheck: string) => {
    if (!usernameToCheck || usernameToCheck.length < 3) {
      setUsernameStatus("idle");
      return;
    }

    setUsernameStatus("checking");

    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("username", "==", usernameToCheck));
      const querySnapshot = await getDocs(q);
      
      const isTakenByOther = querySnapshot.docs.some(doc => doc.id !== currentUser?.uid);
      setUsernameStatus(isTakenByOther ? "taken" : "available");
    } catch (error) {
      console.error("Error checking username:", error);
      setUsernameStatus("idle");
    }
  }, [currentUser?.uid]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (username.length >= 3) {
        checkUsernameAvailability(username);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [username, checkUsernameAvailability]);

  const getSteps = useCallback(() => {
    const baseSteps = ["role", "identity", "lifezone"];
    
    if (lifeZone === "college") baseSteps.push("college_details");
    else if (lifeZone === "working") baseSteps.push("working_details");
    else if (lifeZone === "skill") baseSteps.push("skill_details");
    else if (lifeZone === "break") baseSteps.push("break_details");
    else if (lifeZone === "school") baseSteps.push("school_details");
    else if (lifeZone === "prefer_not") { }
    
    baseSteps.push("personality", "topics");
    return baseSteps;
  }, [lifeZone]);

  const steps = getSteps();
  const totalSteps = steps.length;
  const currentStepName = steps[step] || "role";
  const progress = ((step + 1) / totalSteps) * 100;

  useEffect(() => {
    setQuoteLoading(true);
    const quoteContext = currentStepName.includes("details") 
      ? currentStepName.replace("_details", "") 
      : currentStepName;
    
    const timer = setTimeout(() => {
      setCurrentQuote(getRandomQuote(quoteContext));
      setQuoteLoading(false);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [currentStepName]);

  const handleNext = () => {
    if (step < totalSteps - 1) {
      setDirection(1);
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setDirection(-1);
      setStep(step - 1);
    }
  };

  const handleSkipToApp = async () => {
    if (role !== "explorer") return;
    
    try {
      setLoading(true);
      if (!currentUser) return;

      const userDocRef = doc(db, "users", currentUser.uid);
      await setDoc(userDocRef, {
        role: "explorer",
        displayName: displayName || currentUser.displayName || "User",
        username: username || currentUser.email?.split('@')[0] || `user_${currentUser.uid.substring(0, 8)}`,
        selectedTopics: selectedTopics.length > 0 ? selectedTopics : [],
        bioCompleted: false,
        profileSetupComplete: true,
      }, { merge: true });
      
      toast({
        title: "Welcome to Alvice!",
        description: "You can complete your bio later for better personalization.",
      });
    } catch (error: any) {
      toast({
        title: "Failed to save",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const toggleTopic = (topic: string) => {
    setSelectedTopics(prev =>
      prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]
    );
  };

  const toggleEnergyWord = (word: string) => {
    setEnergyWords(prev => {
      if (prev.includes(word)) return prev.filter(w => w !== word);
      if (prev.length >= 3) return prev;
      return [...prev, word];
    });
  };

  const getSelectedCountForCategory = (category: string) => {
    const subtopics = topicCategories[category]?.subtopics || [];
    return selectedTopics.filter(topic => subtopics.includes(topic)).length;
  };

  const handleProfilePictureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({ title: "File too large", description: "Please select an image under 5MB", variant: "destructive" });
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast({ title: "Invalid file type", description: "Please select an image file", variant: "destructive" });
      return;
    }

    try {
      setUploadingPicture(true);
      const storageRef = ref(storage, `profile-pictures/${currentUser.uid}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setProfilePicture(url);
      toast({ title: "Profile picture uploaded!" });
    } catch (error: any) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } finally {
      setUploadingPicture(false);
    }
  };

  const handleComplete = async () => {
    try {
      setLoading(true);
      if (!currentUser) return;

      if (usernameStatus === "taken") {
        toast({
          title: "Username unavailable",
          description: "Please choose a different username.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const userDocRef = doc(db, "users", currentUser.uid);
      const userDoc = await getDoc(userDocRef);
      
      let anonymousLinkId = "";
      if (userDoc.exists() && userDoc.data().anonymousLinkId) {
        anonymousLinkId = userDoc.data().anonymousLinkId;
      } else {
        anonymousLinkId = `${currentUser.uid.substring(0, 8)}_${Math.random().toString(36).substring(7)}`;
      }

      const lifeZoneDetails: Record<string, any> = {};
      if (lifeZone === "college") {
        lifeZoneDetails.collegeName = collegeName;
        lifeZoneDetails.collegeYear = collegeYear;
        lifeZoneDetails.collegeCourse = collegeCourse;
      } else if (lifeZone === "working") {
        lifeZoneDetails.companyName = companyName;
        lifeZoneDetails.jobTitle = jobTitle;
        lifeZoneDetails.workExperience = workExperience;
      } else if (lifeZone === "skill") {
        lifeZoneDetails.skillLevel = skillLevel[0];
        lifeZoneDetails.learningSkill = learningSkill;
      } else if (lifeZone === "break") {
        lifeZoneDetails.breakReason = breakReason;
        lifeZoneDetails.breakDuration = breakDuration;
      } else if (lifeZone === "school") {
        lifeZoneDetails.schoolName = schoolName;
        lifeZoneDetails.schoolGrade = schoolGrade;
      }

      const userData: any = {
        email: currentUser.email,
        photoURL: profilePicture || currentUser.photoURL || null,
        role,
        displayName,
        username,
        lifeZone: lifeZone || null,
        selectedTopics,
        bioCompleted: true,
        bioData: {
          identity: { name: displayName, username, photo: profilePicture || null },
          lifeStatus: lifeZone,
          details: lifeZoneDetails,
          personality: { story: oneLineStory, energyWords }
        },
        anonymousLinkId,
        profileSetupComplete: true,
      };

      if (!userDoc.exists()) {
        userData.followers = [];
        userData.following = [];
        userData.createdAt = new Date().toISOString();
        userData.interests = [];
        userData.contentPreferences = [];
      }

      await setDoc(userDocRef, userData, { merge: true });
      
      toast({
        title: "Profile completed!",
        description: "Welcome to Alvice. Let's get started!",
      });
    } catch (error: any) {
      toast({
        title: "Failed to save profile",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    switch (currentStepName) {
      case "role": return role !== "";
      case "identity": return displayName.trim() !== "" && username.trim().length >= 3 && usernameStatus !== "taken" && usernameStatus !== "checking";
      case "lifezone": return lifeZone !== "";
      case "college_details": return true;
      case "working_details": return true;
      case "skill_details": return true;
      case "break_details": return true;
      case "school_details": return true;
      case "personality": return oneLineStory.trim() !== "" && energyWords.length === 3;
      case "topics": return selectedTopics.length >= 3;
      default: return false;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 flex flex-col">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border p-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">
              Step {step + 1} of {totalSteps}
            </span>
            {role === "explorer" && step > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkipToApp}
                disabled={loading}
                className="text-primary hover:text-primary/80"
              >
                Skip for now → Explore app
              </Button>
            )}
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      <AnimatePresence mode="wait">
        {currentQuote && (
          <motion.div
            key={currentQuote}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="text-center py-4 px-6"
          >
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Quote className="h-4 w-4" />
              <span className="text-sm italic">{quoteLoading ? "..." : currentQuote}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          <AnimatePresence mode="wait" custom={direction}>
            {currentStepName === "role" && (
              <motion.div
                key="step-role"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="space-y-8"
              >
                <div className="text-center space-y-2">
                  <div className="inline-flex p-4 rounded-full bg-primary/10 text-primary mb-4">
                    <Sparkles className="h-8 w-8" />
                  </div>
                  <h2 className="text-2xl font-bold">How do you want to experience this place?</h2>
                  <p className="text-muted-foreground">Choose your journey</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setRole("creator")}
                    className={`p-6 rounded-2xl border-2 cursor-pointer transition-all ${
                      role === "creator" 
                        ? "border-primary bg-primary/5 shadow-lg shadow-primary/20" 
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex flex-col items-center text-center space-y-4">
                      <div className={`p-3 rounded-full ${role === "creator" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                        <Pen className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">Creator</h3>
                        <p className="text-sm text-muted-foreground mt-1">I want to share my thoughts</p>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setRole("explorer")}
                    className={`p-6 rounded-2xl border-2 cursor-pointer transition-all ${
                      role === "explorer" 
                        ? "border-primary bg-primary/5 shadow-lg shadow-primary/20" 
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex flex-col items-center text-center space-y-4">
                      <div className={`p-3 rounded-full ${role === "explorer" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                        <Compass className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">Explorer</h3>
                        <p className="text-sm text-muted-foreground mt-1">I want to discover advice</p>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            )}

            {currentStepName === "identity" && (
              <motion.div
                key="step-identity"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="space-y-8"
              >
                <div className="text-center space-y-2">
                  <div className="inline-flex p-4 rounded-full bg-primary/10 text-primary mb-4">
                    <User className="h-8 w-8" />
                  </div>
                  <h2 className="text-2xl font-bold">Let's get to know you</h2>
                  <p className="text-muted-foreground">Set up your identity</p>
                </div>

                <div className="flex justify-center">
                  <div className="relative">
                    <Avatar className="h-24 w-24">
                      <AvatarImage src={profilePicture} />
                      <AvatarFallback className="text-2xl">{displayName?.[0] || "U"}</AvatarFallback>
                    </Avatar>
                    <Button
                      type="button"
                      size="icon"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingPicture}
                      className="absolute bottom-0 right-0 rounded-full h-8 w-8 bg-primary"
                    >
                      <Camera className="h-4 w-4" />
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleProfilePictureUpload}
                      className="hidden"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="displayName">Name</Label>
                    <Input
                      id="displayName"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Enter your name"
                      className="h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <div className="relative">
                      <Input
                        id="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                        placeholder="username"
                        className={`h-12 pr-10 ${
                          usernameStatus === "taken" ? "border-destructive focus-visible:ring-destructive" : 
                          usernameStatus === "available" ? "border-green-500 focus-visible:ring-green-500" : ""
                        }`}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {usernameStatus === "checking" && (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        )}
                        {usernameStatus === "taken" && (
                          <AlertCircle className="h-4 w-4 text-destructive" />
                        )}
                        {usernameStatus === "available" && (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">@{username || "username"}</p>
                      {usernameStatus === "taken" && (
                        <p className="text-sm text-destructive">Username already taken</p>
                      )}
                      {usernameStatus === "available" && (
                        <p className="text-sm text-green-500">Username available</p>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {currentStepName === "lifezone" && (
              <motion.div
                key="step-lifezone"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="space-y-8"
              >
                <div className="text-center space-y-2">
                  <div className="inline-flex p-4 rounded-full bg-primary/10 text-primary mb-4">
                    <Briefcase className="h-8 w-8" />
                  </div>
                  <h2 className="text-2xl font-bold">What's your life zone?</h2>
                  <p className="text-muted-foreground">Where are you in your journey?</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {lifeZoneOptions.map((option) => {
                    const Icon = option.icon;
                    return (
                      <motion.div
                        key={option.value}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setLifeZone(option.value)}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          lifeZone === option.value 
                            ? "border-primary bg-primary/5" 
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <div className="flex flex-col items-center text-center space-y-2">
                          <Icon className={`h-6 w-6 ${lifeZone === option.value ? "text-primary" : "text-muted-foreground"}`} />
                          <span className="font-medium text-sm">{option.label}</span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {currentStepName === "college_details" && (
              <motion.div
                key="step-college"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="space-y-8"
              >
                <div className="text-center space-y-2">
                  <div className="inline-flex p-4 rounded-full bg-primary/10 text-primary mb-4">
                    <GraduationCap className="h-8 w-8" />
                  </div>
                  <h2 className="text-2xl font-bold">Tell us about your college</h2>
                  <p className="text-muted-foreground">Optional details about your education</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>College/University Name</Label>
                    <Input value={collegeName} onChange={(e) => setCollegeName(e.target.value)} placeholder="e.g., MIT" className="h-12" />
                  </div>
                  <div className="space-y-2">
                    <Label>Year</Label>
                    <Input value={collegeYear} onChange={(e) => setCollegeYear(e.target.value)} placeholder="e.g., 2nd Year" className="h-12" />
                  </div>
                  <div className="space-y-2">
                    <Label>Course/Major</Label>
                    <Input value={collegeCourse} onChange={(e) => setCollegeCourse(e.target.value)} placeholder="e.g., Computer Science" className="h-12" />
                  </div>
                </div>
              </motion.div>
            )}

            {currentStepName === "working_details" && (
              <motion.div
                key="step-working"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="space-y-8"
              >
                <div className="text-center space-y-2">
                  <div className="inline-flex p-4 rounded-full bg-primary/10 text-primary mb-4">
                    <Building2 className="h-8 w-8" />
                  </div>
                  <h2 className="text-2xl font-bold">Tell us about your work</h2>
                  <p className="text-muted-foreground">Optional details about your career</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Company Name</Label>
                    <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="e.g., Google" className="h-12" />
                  </div>
                  <div className="space-y-2">
                    <Label>Job Title</Label>
                    <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="e.g., Software Engineer" className="h-12" />
                  </div>
                  <div className="space-y-2">
                    <Label>Experience</Label>
                    <Input value={workExperience} onChange={(e) => setWorkExperience(e.target.value)} placeholder="e.g., 3 years" className="h-12" />
                  </div>
                </div>
              </motion.div>
            )}

            {currentStepName === "skill_details" && (
              <motion.div
                key="step-skill"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="space-y-8"
              >
                <div className="text-center space-y-2">
                  <div className="inline-flex p-4 rounded-full bg-primary/10 text-primary mb-4">
                    <Wrench className="h-8 w-8" />
                  </div>
                  <h2 className="text-2xl font-bold">What are you learning?</h2>
                  <p className="text-muted-foreground">Tell us about your skill journey</p>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label>What skill are you building?</Label>
                    <Input value={learningSkill} onChange={(e) => setLearningSkill(e.target.value)} placeholder="e.g., Web Development" className="h-12" />
                  </div>
                  <div className="space-y-4">
                    <Label>Your current level</Label>
                    <div className="px-2">
                      <Slider
                        value={skillLevel}
                        onValueChange={setSkillLevel}
                        max={100}
                        step={1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-2">
                        <span>Beginner</span>
                        <span>Intermediate</span>
                        <span>Advanced</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {currentStepName === "break_details" && (
              <motion.div
                key="step-break"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="space-y-8"
              >
                <div className="text-center space-y-2">
                  <div className="inline-flex p-4 rounded-full bg-primary/10 text-primary mb-4">
                    <Coffee className="h-8 w-8" />
                  </div>
                  <h2 className="text-2xl font-bold">Taking a break?</h2>
                  <p className="text-muted-foreground">That's totally okay</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>What kind of break?</Label>
                    <Input value={breakReason} onChange={(e) => setBreakReason(e.target.value)} placeholder="e.g., Gap year, Career break" className="h-12" />
                  </div>
                  <div className="space-y-2">
                    <Label>How long?</Label>
                    <Input value={breakDuration} onChange={(e) => setBreakDuration(e.target.value)} placeholder="e.g., 6 months" className="h-12" />
                  </div>
                </div>
              </motion.div>
            )}

            {currentStepName === "school_details" && (
              <motion.div
                key="step-school"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="space-y-8"
              >
                <div className="text-center space-y-2">
                  <div className="inline-flex p-4 rounded-full bg-primary/10 text-primary mb-4">
                    <BookOpen className="h-8 w-8" />
                  </div>
                  <h2 className="text-2xl font-bold">Tell us about your school</h2>
                  <p className="text-muted-foreground">Optional details about your education</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>School Name</Label>
                    <Input value={schoolName} onChange={(e) => setSchoolName(e.target.value)} placeholder="e.g., Springfield High" className="h-12" />
                  </div>
                  <div className="space-y-2">
                    <Label>Grade/Year</Label>
                    <Input value={schoolGrade} onChange={(e) => setSchoolGrade(e.target.value)} placeholder="e.g., 10th Grade" className="h-12" />
                  </div>
                </div>
              </motion.div>
            )}

            {currentStepName === "personality" && (
              <motion.div
                key="step-personality"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="space-y-8"
              >
                <div className="text-center space-y-2">
                  <div className="inline-flex p-4 rounded-full bg-primary/10 text-primary mb-4">
                    <Zap className="h-8 w-8" />
                  </div>
                  <h2 className="text-2xl font-bold">Your personality</h2>
                  <p className="text-muted-foreground">Share your vibe with the world</p>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label>One-line story about you</Label>
                    <Textarea
                      value={oneLineStory}
                      onChange={(e) => setOneLineStory(e.target.value)}
                      placeholder="e.g., A curious soul chasing sunsets and building dreams"
                      className="min-h-20 resize-none"
                      maxLength={100}
                    />
                    <p className="text-sm text-muted-foreground text-right">{oneLineStory.length}/100</p>
                  </div>

                  <div className="space-y-3">
                    <Label>Pick 3 energy words that describe you</Label>
                    <div className="flex flex-wrap gap-2">
                      {energyWordOptions.map((word) => (
                        <motion.div key={word} whileTap={{ scale: 0.95 }}>
                          <Badge
                            variant={energyWords.includes(word) ? "default" : "outline"}
                            className={`cursor-pointer px-4 py-2 text-sm transition-all ${
                              energyWords.includes(word) 
                                ? "bg-primary shadow-lg shadow-primary/30" 
                                : "hover:border-primary/50"
                            }`}
                            onClick={() => toggleEnergyWord(word)}
                          >
                            {word}
                          </Badge>
                        </motion.div>
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground">{energyWords.length}/3 selected</p>
                  </div>
                </div>
              </motion.div>
            )}

            {currentStepName === "topics" && (
              <motion.div
                key="step-topics"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="space-y-6"
              >
                <div className="text-center space-y-2">
                  <div className="inline-flex p-4 rounded-full bg-primary/10 text-primary mb-4">
                    <Heart className="h-8 w-8" />
                  </div>
                  <h2 className="text-2xl font-bold">
                    {role === "creator" ? "What will you post here?" : "What do you want to see more of?"}
                  </h2>
                  <p className="text-muted-foreground">Select at least 3 topics from any category</p>
                </div>

                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  {Object.entries(topicCategories).map(([category, { icon, color, subtopics }]) => {
                    const isExpanded = expandedCategories.includes(category);
                    const selectedCount = getSelectedCountForCategory(category);
                    
                    return (
                      <motion.div
                        key={category}
                        className="rounded-xl border border-border overflow-hidden"
                        layout
                      >
                        <motion.button
                          onClick={() => toggleCategory(category)}
                          className={`w-full p-4 flex items-center justify-between bg-gradient-to-r ${color} hover:opacity-90 transition-opacity`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{icon}</span>
                            <div className="text-left">
                              <span className="font-semibold">{category}</span>
                              {selectedCount > 0 && (
                                <span className="ml-2 text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                                  {selectedCount} selected
                                </span>
                              )}
                            </div>
                          </div>
                          <motion.div
                            animate={{ rotate: isExpanded ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <ChevronDown className="h-5 w-5" />
                          </motion.div>
                        </motion.button>
                        
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="p-4 flex flex-wrap gap-2 bg-background/50">
                                {subtopics.map((topic) => (
                                  <motion.div
                                    key={topic}
                                    whileTap={{ scale: 0.95 }}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.15 }}
                                  >
                                    <Badge
                                      variant={selectedTopics.includes(topic) ? "default" : "outline"}
                                      className={`cursor-pointer px-3 py-1.5 text-xs transition-all ${
                                        selectedTopics.includes(topic) 
                                          ? "bg-primary shadow-md shadow-primary/20" 
                                          : "hover:border-primary/50 hover:bg-muted/50"
                                      }`}
                                      onClick={() => toggleTopic(topic)}
                                    >
                                      {topic}
                                    </Badge>
                                  </motion.div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </div>
                
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    {selectedTopics.length} topic{selectedTopics.length !== 1 ? 's' : ''} selected
                    {selectedTopics.length < 3 && (
                      <span className="text-primary ml-1">(need at least 3)</span>
                    )}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="sticky bottom-0 bg-background/80 backdrop-blur-md border-t border-border p-4">
        <div className="max-w-2xl mx-auto flex gap-3">
          {step > 0 && (
            <Button variant="outline" onClick={handleBack} className="flex-1 h-12">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
          )}
          
          {step < totalSteps - 1 ? (
            <Button 
              onClick={handleNext} 
              disabled={!canProceed()} 
              className="flex-1 h-12"
            >
              Next <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button 
              onClick={handleComplete} 
              disabled={!canProceed() || loading} 
              className="flex-1 h-12"
            >
              {loading ? "Saving..." : "Complete Setup"} <Sparkles className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
