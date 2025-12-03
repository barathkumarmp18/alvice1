import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from './ui/button';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';
import { X, Loader2 } from 'lucide-react';

const GoogleIcon = () => (
  <svg className="mr-2 h-4 w-4" viewBox="0 0 48 48">
    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039L38.802 9.92C34.553 6.08 29.613 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
    <path fill="#FF3D00" d="M6.306 14.691c-1.313 2.524-2.074 5.408-2.074 8.411s.761 5.887 2.074 8.411l-5.01-3.915C.028 30.09 0 27.13 0 24s.028-6.09 1.296-8.495l5.01 3.186z" />
    <path fill="#4CAF50" d="M24 48c5.636 0 10.605-1.855 14.288-4.995l-5.757-4.47c-2.399 1.61-5.352 2.57-8.531 2.57c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.179 0 6.002 1.218 8.169 3.25l5.708-4.529C34.609 5.855 29.623 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20z" />
    <path fill="#1976D2" d="M43.611 20.083H24v8h11.303c-.792 2.237-2.231 4.16-4.087 5.571l5.757 4.47c3.41-3.13 5.42-7.66 5.42-12.651c0-1.341-.138-2.65-.389-3.917z" />
  </svg>
);

interface AddAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddAccountModal({ isOpen, onClose }: AddAccountModalProps) {
  const { linkWithGoogle, refreshLinkedAccounts } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleGoogleLink = async () => {
    setLoading(true);
    try {
      const success = await linkWithGoogle();
      if (success) {
        await refreshLinkedAccounts();
        toast({ 
          title: 'Account linked successfully!',
          description: 'The new account has been added to your profile.'
        });
        onClose();
      }
    } catch (error: any) {
      toast({ title: 'Failed to link account', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-card p-8 rounded-2xl shadow-xl w-full max-w-md relative border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <Button size="icon" variant="ghost" className="absolute top-4 right-4" onClick={onClose} data-testid="button-close-modal">
              <X className="h-5 w-5" />
            </Button>

            <h2 className="text-2xl font-bold font-display mb-4 text-center">Link Another Account</h2>
            <p className="text-muted-foreground text-center mb-6 text-sm">
              Link up to 3 Google accounts to easily switch between them
            </p>
            
            <div className="space-y-4">
              <Button 
                onClick={handleGoogleLink} 
                variant="outline" 
                className="w-full h-12" 
                disabled={loading}
                data-testid="button-link-google"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Linking account...
                  </>
                ) : (
                  <>
                    <GoogleIcon />
                    Link Google Account
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
