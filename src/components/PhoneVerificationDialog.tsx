import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { supabase } from '@/integrations/supabase/client.ts';
import { toast } from '@/hooks/use-toast.ts';
import { Loader2 } from 'lucide-react';

interface PhoneVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
  newPhone: string;
  onVerified: () => void;
}

const PhoneVerificationDialog: React.FC<PhoneVerificationDialogProps> = ({
  open,
  onOpenChange,
  email,
  newPhone,
  onVerified,
}) => {
  const [code, setCode] = useState<string[]>(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [_codeSent, setCodeSent] = useState(false);

  const [countdown, setCountdown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);


  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSendCode = async () => {
    setSendingCode(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-phone-verification?action=send', {
        body: { email, newPhone },
      });



      // Check for Supabase function invocation error
      if (error) {

        toast({
          title: 'Error',
          description: error.message || 'Failed to send verification code',
          variant: 'destructive',
        });
        return;
      }

      // Check for error in the response body
      if (data?.error) {

        toast({
          title: 'Error',
          description: data.error,
          variant: 'destructive',
        });
        return;
      }

      setCodeSent(true);
      setCountdown(60); // 60 second cooldown for resend
      toast({
        title: 'Code Sent',
        description: 'A verification code has been sent to your email.',
      });
    } catch (err: unknown) {

      toast({
        title: 'Error',
        description: 'Failed to send verification code. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSendingCode(false);
    }
  };

  const handleInputChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return; // Only allow digits

    const newCode = [...code];
    newCode[index] = value.slice(-1); // Only take the last character
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newCode = [...code];
    for (let i = 0; i < pastedData.length; i++) {
      newCode[i] = pastedData[i];
    }
    setCode(newCode);
    // Focus the next empty input or the last one
    const nextEmpty = newCode.findIndex((c) => !c);
    inputRefs.current[nextEmpty >= 0 ? nextEmpty : 5]?.focus();
  };

  const handleVerify = async () => {
    const fullCode = code.join('');
    if (fullCode.length !== 6) {
      toast({
        title: 'Error',
        description: 'Please enter the complete 6-digit code.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-phone-verification?action=verify', {
        body: { email, code: fullCode },
      });

      if (error) {

        toast({
          title: 'Error',
          description: error.message || 'Invalid verification code',
          variant: 'destructive',
        });
        return;
      }

      if (data?.error) {
        toast({
          title: 'Error',
          description: data.error,
          variant: 'destructive',
        });
        return;
      }

      if (data?.success) {
        toast({
          title: 'Success',
          description: 'Profile changes verified and saved successfully.',
        });
        onVerified();
        onOpenChange(false);
        // Reset state
        setCode(['', '', '', '', '', '']);
        setCodeSent(false);
      }
    } catch (err: unknown) {

      toast({
        title: 'Error',
        description: 'Verification failed. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setCode(['', '', '', '', '', '']);
    setCodeSent(false);
    setCountdown(0);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Verify Profile Changes</DialogTitle>
          <DialogDescription>
            Enter the 6-digit verification code sent to your email ({email})
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-4">
          {sendingCode ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Sending verification code...</span>
            </div>
          ) : (
            <>
              <div className="flex gap-2" onPaste={handlePaste}>
                {code.map((digit, index) => (
                  <Input
                    key={index}
                    ref={(el: HTMLInputElement | null) => (inputRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange(index, e.target.value)}
                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => handleKeyDown(index, e)}
                    className="w-12 h-12 text-center text-xl font-bold"
                    disabled={loading}
                  />
                ))}
              </div>

              <div className="flex flex-col items-center gap-2">
                <Button
                  onClick={handleVerify}
                  disabled={loading || code.join('').length !== 6}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Verify Code'
                  )}
                </Button>

                <Button
                  variant="ghost"
                  onClick={handleSendCode}
                  disabled={sendingCode || countdown > 0}
                  className="text-sm"
                >
                  {countdown > 0
                    ? `Resend code in ${countdown}s`
                    : 'Resend verification code'}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PhoneVerificationDialog;
