import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase';
import { toast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EyeIcon, EyeOffIcon, CheckCircle, XCircle } from 'lucide-react';

const UpdatePassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [invalidLinkError, setInvalidLinkError] = useState<string | null>(null);
  const [urlAccessToken, setUrlAccessToken] = useState<string | null>(null);
  const [urlRefreshToken, setUrlRefreshToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  // Password validation states
  const [hasCapital, setHasCapital] = useState(false);
  const [hasMinLength, setHasMinLength] = useState(false);
  const [hasNumber, setHasNumber] = useState(false);
  const [hasSpecialChar, setHasSpecialChar] = useState(false);
  const [passwordsMatch, setPasswordsMatch] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.hash.substring(1));
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const error = params.get('error');
    const errorCode = params.get('error_code');
    const errorDescription = params.get('error_description');

    if (error && errorDescription) {
      setInvalidLinkError(errorDescription);
      toast({ title: 'Error', description: errorDescription, variant: 'destructive' });
      return;
    }

    if (accessToken && refreshToken) {
      setUrlAccessToken(accessToken);
      setUrlRefreshToken(refreshToken);
      // Do NOT set session here to prevent auto-login
      // sessionReady will be set in handleUpdatePassword after successful setSession
    } else {
      // If no access token and no error, it means the user landed here directly without a reset link
      // or the link was malformed without an explicit error.
      // For now, we'll just let the button remain disabled.
      // A more robust solution might redirect or show a generic error.
    }
  }, [location, navigate]);

  useEffect(() => {
    // Min 1 Cap letter
    setHasCapital(/[A-Z]/.test(newPassword));
    // Min 8 letters
    setHasMinLength(newPassword.length >= 8);
    // min 1 number
    setHasNumber(/\d/.test(newPassword));
    // Min 1 special character
    setHasSpecialChar(/[!@#$%^&*(),.?":{}|<>]/.test(newPassword));
    // New Passwords Match
    setPasswordsMatch(newPassword === confirmNewPassword && newPassword !== '');
  }, [newPassword, confirmNewPassword]);

  const handleUpdatePassword = async () => {
    setLoading(true);

    if (!urlAccessToken || !urlRefreshToken) {
      toast({ title: 'Error', description: 'Invalid password reset link. Please request a new one.', variant: 'destructive' });
      setLoading(false);
      return;
    }

    // Establish session just before updating password
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: urlAccessToken,
      refresh_token: urlRefreshToken,
    });

    if (sessionError) {
      toast({ title: 'Error', description: `Failed to establish session: ${sessionError.message}. Please request a new password reset link.`, variant: 'destructive' });
      setLoading(false);
      return;
    }

    setSessionReady(true); // Session is now ready for updateUser

    if (!newPassword || !confirmNewPassword) {
      toast({ title: 'Error', description: 'Please fill in all password fields.', variant: 'destructive' });
      setLoading(false);
      return;
    }

    if (newPassword !== confirmNewPassword) {
      toast({ title: 'Error', description: 'New passwords do not match.', variant: 'destructive' });
      setLoading(false);
      return;
    }

    if (!hasCapital || !hasMinLength || !hasNumber || !hasSpecialChar || !passwordsMatch) {
      toast({ title: 'Error', description: 'New password does not meet all requirements.', variant: 'destructive' });
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      toast({ title: 'Error updating password', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Password updated successfully. You can now log in with your new password.' });
      setNewPassword('');
      setConfirmNewPassword('');
      navigate('/auth'); // Redirect to login page after successful password update
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col justify-center items-center min-h-screen bg-gray-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Update Password</CardTitle>
        </CardHeader>
        <CardContent>
          {invalidLinkError ? (
            <div className="text-center space-y-4">
              <p className="text-red-500 text-lg">Error: {invalidLinkError}</p>
              <p>Your password reset link is invalid or has expired. Please request a new one.</p>
              <Button onClick={() => navigate('/auth')} className="w-full">
                Request New Password Reset Link
              </Button>
            </div>
          ) : (
          <div className="grid gap-4">
            <div className="grid gap-2">
              <label htmlFor="newPassword">New Password</label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New Password"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowNewPassword((prev) => !prev)}
                >
                  {showNewPassword ? (
                    <EyeIcon className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <EyeOffIcon className="h-4 w-4" aria-hidden="true" />
                  )}
                  <span className="sr-only">{showNewPassword ? "Hide password" : "Show password"}</span>
                </Button>
              </div>
            </div>
            <div className="grid gap-2">
              <label htmlFor="confirmNewPassword">Confirm New Password</label>
              <div className="relative">
                <Input
                  id="confirmNewPassword"
                  type={showConfirmNewPassword ? "text" : "password"}
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Confirm New Password"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmNewPassword((prev) => !prev)}
                >
                  {showConfirmNewPassword ? (
                    <EyeIcon className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <EyeOffIcon className="h-4 w-4" aria-hidden="true" />
                  )}
                  <span className="sr-only">{showConfirmNewPassword ? "Hide password" : "Show password"}</span>
                </Button>
              </div>
            </div>
            <div className="grid gap-2 text-sm">
              <p className={`flex items-center ${hasCapital ? 'text-green-500' : 'text-red-500'}`}>
                {hasCapital ? <CheckCircle className="h-4 w-4 mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
                Min 1 Capital letter
              </p>
              <p className={`flex items-center ${hasMinLength ? 'text-green-500' : 'text-red-500'}`}>
                {hasMinLength ? <CheckCircle className="h-4 w-4 mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
                Min 8 letters
              </p>
              <p className={`flex items-center ${hasNumber ? 'text-green-500' : 'text-red-500'}`}>
                {hasNumber ? <CheckCircle className="h-4 w-4 mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
                Min 1 number
              </p>
              <p className={`flex items-center ${hasSpecialChar ? 'text-green-500' : 'text-red-500'}`}>
                {hasSpecialChar ? <CheckCircle className="h-4 w-4 mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
                Min 1 special character
              </p>
              <p className={`flex items-center ${passwordsMatch ? 'text-green-500' : 'text-red-500'}`}>
                {passwordsMatch ? <CheckCircle className="h-4 w-4 mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
                New Passwords Match
              </p>
            </div>
            <Button onClick={handleUpdatePassword} className="w-full" disabled={loading || !urlAccessToken || !urlRefreshToken || !hasCapital || !hasMinLength || !hasNumber || !hasSpecialChar || !passwordsMatch}>
              {loading ? 'Updating...' : 'Update Password'}
            </Button>
          </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UpdatePassword;