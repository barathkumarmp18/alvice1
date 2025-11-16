import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Mail, User, CheckCircle2 } from "lucide-react";
import { isSignInWithEmailLink } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { signInWithGoogle, signInWithEmailOTP, completeEmailOTPSignIn } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const preferredEmail = window.localStorage.getItem('preferredSignInEmail');
    if (preferredEmail) {
      setEmail(preferredEmail);
    }

    const handleEmailLink = async () => {
      if (isSignInWithEmailLink(auth, window.location.href)) {
        let savedEmail = window.localStorage.getItem('emailForSignIn');
        if (!savedEmail && preferredEmail) {
          savedEmail = preferredEmail;
        }
        
        if (!savedEmail) {
          savedEmail = window.prompt('Please provide your email for confirmation');
        }
        
        if (savedEmail) {
          setLoading(true);
          try {
            await completeEmailOTPSignIn(savedEmail, window.location.href);
            window.localStorage.removeItem('preferredSignInEmail');
            window.history.replaceState({}, document.title, window.location.pathname);
          } catch (error: any) {
            toast({
              title: "Authentication failed",
              description: error.message,
              variant: "destructive",
            });
          } finally {
            setLoading(false);
          }
        }
      }
    };

    handleEmailLink();
  }, [completeEmailOTPSignIn, toast]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (error: any) {
      toast({
        title: "Authentication failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmailOTP(email, isSignUp ? displayName : undefined);
      setEmailSent(true);
    } catch (error: any) {
      toast({
        title: "Failed to send link",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-emotion-happiness/20 via-background to-emotion-calm/20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-lg border-0 backdrop-blur-sm bg-card/95">
          <CardHeader className="space-y-2 text-center">
            <motion.h1
              className="text-5xl font-display font-bold bg-gradient-to-r from-emotion-happiness via-emotion-excitement to-emotion-calm bg-clip-text text-transparent mb-2"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              Alvice
            </motion.h1>
            <CardTitle className="text-2xl font-display">
              {isSignUp ? "Join Alvice" : "Welcome back"}
            </CardTitle>
            <CardDescription className="font-body">
              {isSignUp 
                ? "Start your journey of self-expression and discovery" 
                : "Sign in to continue your emotional journey"}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {!emailSent ? (
              <>
                <Button
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  variant="outline"
                  className="w-full h-12 font-medium hover-elevate active-elevate-2"
                  data-testid="button-google-signin"
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Or</span>
                  </div>
                </div>

                <form onSubmit={handleEmailAuth} className="space-y-4">
                  {isSignUp && (
                    <div className="space-y-2">
                      <Label htmlFor="displayName" className="font-medium">Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                          id="displayName"
                          type="text"
                          placeholder="Your name"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          className="pl-10 h-12"
                          required
                          data-testid="input-displayname"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="email" className="font-medium">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 h-12"
                        required
                        data-testid="input-email"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 font-medium bg-gradient-to-r from-emotion-happiness to-emotion-excitement hover:opacity-90 transition-opacity"
                    data-testid="button-email-auth"
                  >
                    {loading ? "Sending link..." : isSignUp ? "Create Account" : "Get Sign-in Link"}
                  </Button>
                </form>

                <div className="text-center text-sm">
                  <button
                    onClick={() => setIsSignUp(!isSignUp)}
                    className="text-primary hover:underline font-medium"
                    data-testid="button-toggle-auth-mode"
                  >
                    {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center space-y-4 py-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <CheckCircle2 className="h-16 w-16 mx-auto text-emotion-happiness" />
                </motion.div>
                <h3 className="text-xl font-semibold">Check your email!</h3>
                <p className="text-muted-foreground">
                  We've sent a secure sign-in link to <strong className="text-foreground">{email}</strong>
                </p>
                <p className="text-sm text-muted-foreground">
                  Click the link in the email to complete your sign-in
                </p>
                <Button
                  variant="outline"
                  onClick={() => setEmailSent(false)}
                  className="mt-4"
                  data-testid="button-back"
                >
                  Back to Sign In
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
