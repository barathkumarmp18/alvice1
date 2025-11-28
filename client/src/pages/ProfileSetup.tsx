import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { doc, setDoc } from "firebase/firestore";
import { db, storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, User, Calendar, FileText, Heart, Briefcase, GraduationCap, Building2, School, Camera, ArrowRight } from "lucide-react";
import type { UserRole, LifeStage, OrganizationDetails } from "@shared/schema";

const interestCategories = {
  "Art & Creativity": ["Photography", "Digital Art", "Painting", "Writing", "Music", "Dance", "Design"],
  "Technology": ["Coding", "AI/ML", "Gaming", "Web Dev", "Mobile Apps", "Blockchain", "Cybersecurity"],
  "Lifestyle": ["Fitness", "Yoga", "Meditation", "Cooking", "Travel", "Fashion", "Beauty"],
  "Entertainment": ["Movies", "TV Shows", "Anime", "K-pop", "Podcasts", "Streaming", "Theater"],
  "Learning": ["Science", "History", "Languages", "Philosophy", "Psychology", "Business", "Self-improvement"],
  "Community": ["Volunteering", "Activism", "Environment", "Social Justice", "Mental Health", "Education"],
};

const contentTypes = {
  creator: ["Videos", "Photos", "Blog Posts", "Podcasts", "Music", "Art", "Tutorials", "Reviews"],
  explorer: ["Videos", "Photos", "Blog Posts", "Podcasts", "Music", "Art", "Tutorials", "Reviews"],
};

const lifeStages: { value: LifeStage; label: string }[] = [
  { value: "student", label: "Student" },
  { value: "college_student", label: "College Student" },
  { value: "professional", label: "Professional" },
  { value: "looking_for_opportunities", label: "Looking for Opportunities" },
  { value: "entrepreneur", label: "Entrepreneur" },
  { value: "retired", label: "Retired" },
  { value: "other", label: "Other" },
];

export default function ProfileSetup() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [role, setRole] = useState<UserRole | "">("");
  const [displayName, setDisplayName] = useState(currentUser?.displayName || "");
  const [username, setUsername] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [bio, setBio] = useState("");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [selectedContent, setSelectedContent] = useState<string[]>([]);
  const [selectedLifeStage, setSelectedLifeStage] = useState<LifeStage | "">("");
  const [employmentStatus, setEmploymentStatus] = useState<"employed" | "unemployed" | "student" | "self_employed" | "retired" | "">("");
  const [relationshipStatus, setRelationshipStatus] = useState<"single" | "in_relationship" | "married" | "prefer_not_to_say" | "">("");
  const [organizationType, setOrganizationType] = useState<"school" | "college" | "company" | "other" | "">("");
  const [organizationName, setOrganizationName] = useState("");
  const [profilePicture, setProfilePicture] = useState<string>(currentUser?.photoURL || "");
  const [uploadingPicture, setUploadingPicture] = useState(false);

  const totalSteps = 9;
  const progress = ((step + 1) / totalSteps) * 100;

  const toggleInterest = (interest: string) => {
    setSelectedInterests(prev =>
      prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
    );
  };

  const toggleContent = (content: string) => {
    setSelectedContent(prev =>
      prev.includes(content) ? prev.filter(c => c !== content) : [...prev, content]
    );
  };

  const handleNext = () => {
    if (step < totalSteps - 1) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const handleSkip = () => {
    // Skip optional fields
    if (step === 3) {
      setDateOfBirth("");
    } else if (step === 5) {
      setSelectedInterests([]);
    }
    handleNext();
  };

  const handleProfilePictureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Please select an image under 5MB",
        variant: "destructive",
      });
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploadingPicture(true);
      const storageRef = ref(storage, `profile-pictures/${currentUser.uid}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setProfilePicture(url);
      toast({
        title: "Profile picture uploaded!",
        description: "Your profile picture has been set",
      });
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploadingPicture(false);
    }
  };

  const handleComplete = async () => {
    try {
      setLoading(true);
      if (!currentUser) return;

      const organizationDetails: OrganizationDetails | undefined = organizationName.trim() ? {
        type: organizationType as "school" | "college" | "company" | "other",
        name: organizationName.trim(),
      } : undefined;

      // Check for existing anonymous link ID, only generate if doesn't exist
      let anonymousLinkId = "";
      const userDocRef = doc(db, "users", currentUser.uid);
      const { getDoc } = await import("firebase/firestore");
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists() && userDoc.data().anonymousLinkId) {
        anonymousLinkId = userDoc.data().anonymousLinkId;
      } else {
        anonymousLinkId = `${currentUser.uid.substring(0, 8)}_${Math.random().toString(36).substring(7)}`;
      }

      // Prepare user data - only include followers/following for new users
      const userData: any = {
        email: currentUser.email,
        photoURL: profilePicture || currentUser.photoURL || null,
        role,
        displayName,
        username,
        dateOfBirth: dateOfBirth || null,
        bio,
        interests: selectedInterests.length > 0 ? selectedInterests : [],
        contentPreferences: selectedContent,
        lifeStage: selectedLifeStage,
        employmentStatus: employmentStatus || null,
        relationshipStatus: relationshipStatus || null,
        organizationDetails: organizationDetails || null,
        anonymousLinkId,
        profileSetupComplete: true,
      };

      // Only set followers/following for new users to avoid wiping existing social connections
      if (!userDoc.exists()) {
        userData.followers = [];
        userData.following = [];
        userData.createdAt = new Date().toISOString();
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
    switch (step) {
      case 0: return role !== "";
      case 1: return displayName.trim() !== "";
      case 2: return username.trim() !== "";
      case 3: return true; // DOB is now optional with skip
      case 4: return bio.trim() !== "";
      case 5: return true; // Interests are now optional with skip
      case 6: return selectedContent.length > 0;
      case 7: return selectedLifeStage !== "";
      case 8: return true;
      default: return false;
    }
  };

  const canSkip = () => {
    return step === 3 || step === 5;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emotion-happiness/10 via-background to-emotion-calm/10 flex flex-col">
      {/* Progress bar */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border p-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">
              Step {step + 1} of {totalSteps}
            </span>
            <span className="text-sm font-medium text-primary">
              {Math.round(progress)}%
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <StepContainer key="step-0">
                <StepHeader
                  icon={<Sparkles className="h-8 w-8" />}
                  title="What brings you to Alvice?"
                  description="Choose how you want to experience our community"
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <RoleCard
                    selected={role === "creator"}
                    onClick={() => setRole("creator")}
                    title="Creator"
                    description="I want to share my content and build an audience"
                  />
                  <RoleCard
                    selected={role === "explorer"}
                    onClick={() => setRole("explorer")}
                    title="Explorer"
                    description="I want to discover and engage with content"
                  />
                </div>
              </StepContainer>
            )}

            {step === 1 && (
              <StepContainer key="step-1">
                <StepHeader
                  icon={<User className="h-8 w-8" />}
                  title="What's your name?"
                  description="This is how others will see you on Alvice"
                />
                
                {/* Profile Picture Upload */}
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
                      data-testid="button-upload-picture"
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

                <div className="space-y-2">
                  <Label htmlFor="displayName" className="text-lg">Display Name</Label>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter your name"
                    className="h-14 text-lg"
                    data-testid="input-displayname"
                  />
                </div>
              </StepContainer>
            )}

            {step === 2 && (
              <StepContainer key="step-2">
                <StepHeader
                  icon={<User className="h-8 w-8" />}
                  title="Choose a username"
                  description="This will be your unique identifier"
                />
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-lg">Username</Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ""))}
                    placeholder="username"
                    className="h-14 text-lg"
                    data-testid="input-username"
                  />
                  <p className="text-sm text-muted-foreground">@{username || "username"}</p>
                </div>
              </StepContainer>
            )}

            {step === 3 && (
              <StepContainer key="step-3">
                <div className="relative">
                  <StepHeader
                    icon={<Calendar className="h-8 w-8" />}
                    title="When's your birthday?"
                    description="We'll use this to personalize your experience"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleSkip}
                    className="absolute top-0 right-0 gap-1 text-muted-foreground hover:text-foreground"
                    data-testid="button-skip-dob"
                  >
                    Skip <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dob" className="text-lg">Date of Birth</Label>
                  <Input
                    id="dob"
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="h-14 text-lg"
                    data-testid="input-dob"
                  />
                </div>
              </StepContainer>
            )}

            {step === 4 && (
              <StepContainer key="step-4">
                <StepHeader
                  icon={<FileText className="h-8 w-8" />}
                  title="Tell us about yourself"
                  description="Share a bit about who you are"
                />
                <div className="space-y-2">
                  <Label htmlFor="bio" className="text-lg">Bio</Label>
                  <Textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="I'm passionate about..."
                    className="min-h-32 text-lg resize-none"
                    maxLength={200}
                    data-testid="input-bio"
                  />
                  <p className="text-sm text-muted-foreground text-right">{bio.length}/200</p>
                </div>
              </StepContainer>
            )}

            {step === 5 && (
              <StepContainer key="step-5">
                <div className="relative">
                  <StepHeader
                    icon={<Heart className="h-8 w-8" />}
                    title="What are your interests?"
                    description="Select topics you're passionate about"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleSkip}
                    className="absolute top-0 right-0 gap-1 text-muted-foreground hover:text-foreground"
                    data-testid="button-skip-interests"
                  >
                    Skip <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>
                <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
                  {Object.entries(interestCategories).map(([category, interests]) => (
                    <div key={category} className="space-y-2">
                      <h3 className="font-semibold text-sm text-foreground sticky top-0 bg-background/95 backdrop-blur-sm py-1">{category}</h3>
                      <div className="flex flex-wrap gap-2">
                        {interests.map((interest) => (
                          <Badge
                            key={interest}
                            variant={selectedInterests.includes(interest) ? "default" : "outline"}
                            className="cursor-pointer hover-elevate active-elevate-2 px-3 py-1.5 text-xs"
                            onClick={() => toggleInterest(interest)}
                            data-testid={`badge-interest-${interest.toLowerCase().replace(/\s/g, "-")}`}
                          >
                            {interest}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground text-center mt-3">{selectedInterests.length} selected</p>
              </StepContainer>
            )}

            {step === 6 && (
              <StepContainer key="step-6">
                <StepHeader
                  icon={<Sparkles className="h-8 w-8" />}
                  title={role === "creator" ? "What content do you create?" : "What content do you enjoy?"}
                  description="Help us recommend the right content"
                />
                <div className="flex flex-wrap gap-2">
                  {contentTypes[role as keyof typeof contentTypes]?.map((content) => (
                    <Badge
                      key={content}
                      variant={selectedContent.includes(content) ? "default" : "outline"}
                      className="cursor-pointer hover-elevate active-elevate-2 px-4 py-2 text-sm"
                      onClick={() => toggleContent(content)}
                      data-testid={`badge-content-${content.toLowerCase().replace(/\s/g, "-")}`}
                    >
                      {content}
                    </Badge>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground mt-4">{selectedContent.length} selected</p>
              </StepContainer>
            )}

            {step === 7 && (
              <StepContainer key="step-7">
                <StepHeader
                  icon={<Briefcase className="h-8 w-8" />}
                  title="What stage of life are you in?"
                  description="This helps us connect you with the right people"
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {lifeStages.map((stage) => (
                    <Button
                      key={stage.value}
                      variant={selectedLifeStage === stage.value ? "default" : "outline"}
                      className="h-14 text-base justify-start hover-elevate active-elevate-2"
                      onClick={() => setSelectedLifeStage(stage.value)}
                      data-testid={`button-lifestage-${stage.value}`}
                    >
                      {stage.label}
                    </Button>
                  ))}
                </div>
              </StepContainer>
            )}

            {step === 8 && (
              <StepContainer key="step-8">
                <StepHeader
                  icon={<Heart className="h-8 w-8" />}
                  title="A bit more about you"
                  description="Optional details to help personalize your experience"
                />
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-base font-semibold">Current Situation</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { value: "employed", label: "Working" },
                        { value: "unemployed", label: "Seeking Work" },
                        { value: "student", label: "Studying" },
                        { value: "self_employed", label: "Self-Employed" },
                        { value: "retired", label: "Retired" },
                      ].map((status) => (
                        <Button
                          key={status.value}
                          type="button"
                          variant={employmentStatus === status.value ? "default" : "outline"}
                          className="h-11 text-sm hover-elevate"
                          onClick={() => setEmploymentStatus(status.value as any)}
                          data-testid={`button-employment-${status.value}`}
                        >
                          {status.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-base font-semibold">Relationship Status</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { value: "single", label: "Single" },
                        { value: "in_relationship", label: "In a Relationship" },
                        { value: "married", label: "Married" },
                        { value: "prefer_not_to_say", label: "Prefer Not to Say" },
                      ].map((status) => (
                        <Button
                          key={status.value}
                          type="button"
                          variant={relationshipStatus === status.value ? "default" : "outline"}
                          className="h-11 text-sm hover-elevate"
                          onClick={() => setRelationshipStatus(status.value as any)}
                          data-testid={`button-relationship-${status.value}`}
                        >
                          {status.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    <Label className="text-base font-semibold sticky top-0 bg-background/95 backdrop-blur-sm py-1">School / College / Company</Label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { value: "school", icon: School, label: "School" },
                        { value: "college", icon: GraduationCap, label: "College" },
                        { value: "company", icon: Building2, label: "Company" },
                        { value: "other", icon: Briefcase, label: "Other" },
                      ].map((type) => {
                        const Icon = type.icon;
                        return (
                          <Button
                            key={type.value}
                            type="button"
                            variant={organizationType === type.value ? "default" : "outline"}
                            className="h-16 flex flex-col gap-1 hover-elevate"
                            onClick={() => setOrganizationType(type.value as any)}
                            data-testid={`button-org-type-${type.value}`}
                          >
                            <Icon className="h-5 w-5" />
                            <span className="text-xs">{type.label}</span>
                          </Button>
                        );
                      })}
                    </div>
                    {organizationType && (
                      <Input
                        value={organizationName}
                        onChange={(e) => setOrganizationName(e.target.value)}
                        placeholder={`Enter ${organizationType} name...`}
                        className="h-12"
                        data-testid="input-organization-name"
                      />
                    )}
                  </div>

                  <p className="text-sm text-muted-foreground text-center">
                    You can skip this step if you prefer
                  </p>
                </div>
              </StepContainer>
            )}
          </AnimatePresence>

          {/* Navigation buttons */}
          <motion.div
            className="flex gap-4 mt-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {step > 0 && (
              <Button
                onClick={handleBack}
                variant="outline"
                className="flex-1 h-12"
                data-testid="button-back"
              >
                Back
              </Button>
            )}
            {step < totalSteps - 1 ? (
              <Button
                onClick={handleNext}
                disabled={!canProceed()}
                className="flex-1 h-12 bg-gradient-to-r from-emotion-happiness to-emotion-excitement"
                data-testid="button-next"
              >
                Next
              </Button>
            ) : (
              <Button
                onClick={handleComplete}
                disabled={!canProceed() || loading}
                className="flex-1 h-12 bg-gradient-to-r from-emotion-happiness to-emotion-excitement"
                data-testid="button-complete"
              >
                {loading ? "Saving..." : "Complete Profile"}
              </Button>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function StepContainer({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-8"
    >
      {children}
    </motion.div>
  );
}

function StepHeader({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="text-center space-y-3">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-emotion-happiness to-emotion-excitement text-white">
        {icon}
      </div>
      <h2 className="text-3xl font-display font-bold">{title}</h2>
      <p className="text-muted-foreground text-lg">{description}</p>
    </div>
  );
}

function RoleCard({ 
  selected, 
  onClick, 
  title, 
  description 
}: { 
  selected: boolean; 
  onClick: () => void; 
  title: string; 
  description: string;
}) {
  return (
    <motion.button
      onClick={onClick}
      className={`p-6 rounded-2xl border-2 transition-all hover-elevate active-elevate-2 text-left ${
        selected 
          ? "border-primary bg-primary/5" 
          : "border-border bg-card"
      }`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      data-testid={`button-role-${title.toLowerCase()}`}
    >
      <h3 className="text-xl font-display font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm">{description}</p>
    </motion.button>
  );
}
