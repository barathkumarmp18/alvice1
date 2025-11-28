import { useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useLocation } from 'wouter';
import { Loader2 } from 'lucide-react';

export default function LinkAccountPage() {
  const { loading } = useAuth();
  const [, setLocation] = useLocation();

  // After the linking process in AuthProvider is complete, 
  // this page will simply redirect the user back to their profile.
  useEffect(() => {
    if (!loading) {
        // Redirect to profile or settings page after a short delay
        setTimeout(() => setLocation('/profile'), 1000);
    }
  }, [loading, setLocation]);

  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center bg-background text-center p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-6" />
        <h1 className="text-2xl font-bold font-display">Finalizing Account Link</h1>
        <p className="text-muted-foreground mt-2">Please wait while we securely link your accounts...</p>
        <p className='text-sm text-muted-foreground mt-4'>You will be redirected shortly.</p>
    </div>
  );
}
