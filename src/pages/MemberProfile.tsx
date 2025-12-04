import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase';
import { toast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EyeIcon, EyeOffIcon, CheckCircle, XCircle, Mail } from 'lucide-react';

const MemberProfile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value.replace(/\D/g, ''); // Remove all non-digit characters
    const limitedInput = input.substring(0, 7); // Limit to 7 digits
    setPhone(limitedInput);
  };
  const [email, setEmail] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [isGoogleUser, setIsGoogleUser] = useState(false);
  const [isEmailUser, setIsEmailUser] = useState(false);
  const [hasEmailPassword, setHasEmailPassword] = useState(false);

  // Password validation states
  const [hasCapital, setHasCapital] = useState(false);
  const [hasMinLength, setHasMinLength] = useState(false);
  const [hasNumber, setHasNumber] = useState(false);
  const [hasSpecialChar, setHasSpecialChar] = useState(false);
  const [passwordsMatch, setPasswordsMatch] = useState(false);

  const formatPhoneNumber = (phoneNumber: string) => {
    const cleaned = phoneNumber.replace(/\D/g, '');
    if (cleaned.length <= 3) {
      return cleaned;
    }
    return `${cleaned.substring(0, 3)}-${cleaned.substring(3, 7)}`;
  };

  const getProfile = useCallback(async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      navigate('/auth');
      return;
    }

    setUserId(session.user.id);
    setEmail(session.user.email || '');

    console.log("Supabase session user:", session.user);
    console.log("Supabase session user app_metadata:", session.user.app_metadata);
    console.log("Supabase session user identities:", session.user.identities);

    // Determine login methods
    const isGoogle = session.user.app_metadata?.provider === 'google' || session.user.identities?.some(identity => identity.provider === 'google');
    // A user has an email/password if their initial sign-in was email, or if they have an 'email' identity
    const isEmail = session.user.app_metadata?.provider === 'email' || session.user.identities?.some(identity => identity.provider === 'email');
    // Additionally, if the user has an email and is not exclusively a Google user, they likely have an email/password.
    // This handles cases where a Google user might add an email/password later.
    setHasEmailPassword(isEmail || (session.user.email && !isGoogle));
    setIsGoogleUser(isGoogle);
      setIsEmailUser(isEmail || (session.user.email && !isGoogle));
      console.log("isGoogleUser:", isGoogle);
      console.log("isEmailUser:", isEmail || (session.user.email && !isGoogle));
      console.log("Debug - session.user.app_metadata.provider:", session.user.app_metadata?.provider);
      console.log("Debug - session.user.identities:", session.user.identities);
      console.log("Debug - isGoogle (calculated):", isGoogle);
      console.log("Debug - isEmail (calculated):", isEmail);
      console.log("Debug - hasEmailPassword (state value):", isEmail || (session.user.email && !isGoogle));

    const { data, error } = await supabase
      .from('profiles')
      .select('first_name, last_name, phone')
      .eq('id', session.user.id)
      .single();

    if (error) {
      toast({ title: 'Error loading profile', description: error.message, variant: 'destructive' });
    } else if (data) {
      setFirstName(data.first_name || '');
      setLastName(data.last_name || '');
      // Format existing phone number
      if (data.phone) {
        const cleanedPhone = String(data.phone).replace(/\D/g, '');
        setPhone(cleanedPhone.substring(cleanedPhone.length - 7));
      } else {
        setPhone('');
      }
    }
    setLoading(false);
  }, [navigate, toast]);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        getProfile();
      } else {
        // Handle case where user logs out or session expires
        // For now, we can just navigate to auth page or clear profile data
        navigate('/auth');
      }
    });

    // Initial load
    getProfile();

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [getProfile, navigate]);

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

  const handleSave = async () => {
    setLoading(true);
    if (!userId) {
      toast({ title: 'Error', description: 'User not logged in.', variant: 'destructive' });
      setLoading(false);
      return;
    }

    if (phone.length !== 7) {
      toast({ title: 'Error', description: 'Phone number must be 7 digits.', variant: 'destructive' });
      setLoading(false);
      return;
    }

    const fullPhoneNumber = `+1868${phone}`;

    console.log("Saving profile with:", { userId, firstName, lastName, phone: fullPhoneNumber });

    const { data, error } = await supabase
      .from('profiles')
      .update({ first_name: firstName, last_name: lastName, phone: fullPhoneNumber })
      .eq('id', userId);

    if (error) {
      console.error("Supabase save error:", error);
      toast({ title: 'Error saving profile', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Profile updated successfully.' });
      getProfile(); // Refresh profile data
    }
    setLoading(false);
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmNewPassword) {
      toast({ title: 'Error', description: 'Please fill in all new password fields.', variant: 'destructive' });
      return;
    }

    if ((!isGoogleUser || isEmailUser) && !oldPassword) {
      toast({ title: 'Error', description: 'Please fill in your old password.', variant: 'destructive' });
      return;
    }

    if (newPassword !== confirmNewPassword) {
      toast({ title: 'Error', description: 'New passwords do not match.', variant: 'destructive' });
      return;
    }

    if (!hasCapital || !hasMinLength || !hasNumber || !hasSpecialChar || !passwordsMatch) {
      toast({ title: 'Error', description: 'New password does not meet all requirements.', variant: 'destructive' });
      return;
    }

    setLoading(true);

    // Log the password values before sending to Supabase
    console.log('Password change attempt:', {
      newPasswordLength: newPassword.length,
      confirmNewPasswordLength: confirmNewPassword.length,
      passwordsMatch: newPassword === confirmNewPassword,
      hasCapital,
      hasMinLength,
      hasNumber,
      hasSpecialChar,
      isGoogleUser,
      isEmailUser
    });

    // Re-authenticate user with old password only if they have an email password
    if (!isGoogleUser || isEmailUser) {
      console.log('Attempting re-authentication with old password for email user');
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email, // Assuming email is available in state
        password: oldPassword,
      });

      if (signInError) {
        console.error('Re-authentication error:', signInError);
        toast({ title: 'Error', description: 'Incorrect old password.', variant: 'destructive' });
        setLoading(false);
        return;
      }
    }

    // Ensure session is still valid before updating password
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    if (!currentSession) {
      toast({ title: 'Error', description: 'Authentication session missing. Please log in again.', variant: 'destructive' });
      setLoading(false);
      return;
    }

    console.log('Updating password for user:', currentSession.user.id);
    
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      console.error('Password update error:', error);
      toast({ title: 'Error changing password', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Password updated successfully.' });
      setOldPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      // Re-fetch profile to update login methods
      getProfile();
    }
    setLoading(false);
  };

  if (loading) {
    return <div>Loading profile...</div>;
  }

  return (
    <div className="flex flex-col justify-center items-center min-h-screen bg-gray-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Member Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <label htmlFor="email">Email</label>
              <Input
                id="email"
                type="email"
                value={email}
                disabled
                placeholder="Email"
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="firstName">First Name</label>
              <Input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First Name"
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="lastName">Last Name</label>
              <Input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last Name"
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="phone">Phone Number</label>
              <div className="flex items-center">
                <span className="mr-2">+1 (868)</span>
                <Input
                  id="phone"
                  type="text"
                  value={formatPhoneNumber(phone)}
                  onChange={handlePhoneChange}
                  placeholder="XXX-XXXX"
                  maxLength={8} // 7 digits + 1 hyphen
                  className="flex-grow"
                />
              </div>
            </div>
            <Button onClick={handleSave} className="w-full">
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="w-full max-w-md mt-4">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Login Methods</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center space-x-4">
            {isGoogleUser && (
              <div className="flex flex-col items-center">
                <svg className="h-8 w-8" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <span className="text-sm text-gray-500">Google</span>
              </div>
            )}
            {isEmailUser && (
              <div className="flex flex-col items-center">
                <Mail className="h-8 w-8 text-gray-500" />
                <span className="text-sm text-gray-500">Email</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="w-full max-w-md mt-4">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            {(!isGoogleUser || isEmailUser) ? "Change Password" : "Create a password for your account"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
          {(!isGoogleUser || hasEmailPassword) && (
            <div className="grid gap-2">
              <label htmlFor="oldPassword">Old Password</label>
              <div className="relative">
                <Input
                  id="oldPassword"
                  type={showOldPassword ? "text" : "password"}
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Old Password"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowOldPassword((prev) => !prev)}
                >
                  {showOldPassword ? (
                    <EyeIcon className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <EyeOffIcon className="h-4 w-4" aria-hidden="true" />
                  )}
                  <span className="sr-only">{showOldPassword ? "Hide password" : "Show password"}</span>
                </Button>
              </div>
            </div>
          )}
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
            <Button onClick={handleChangePassword} className="w-full">
              {(!isGoogleUser || hasEmailPassword) ? "Change Password" : "Create Password"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MemberProfile;
