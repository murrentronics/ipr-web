import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase';
import { toast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const MemberProfile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [firstName, setFirstName] = useState('');
  const [phone, setPhone] = useState('');
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const getProfile = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        navigate('/auth');
        return;
      }

      setUserId(session.user.id);

      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, phone')
        .eq('id', session.user.id)
        .single();

      if (error) {
        toast({ title: 'Error loading profile', description: error.message, variant: 'destructive' });
      } else if (data) {
        setFirstName(data.first_name || '');
        setPhone(data.phone || '');
      }
      setLoading(false);
    };

    getProfile();
  }, [navigate]);

  const handleSave = async () => {
    setLoading(true);
    if (!userId) {
      toast({ title: 'Error', description: 'User not logged in.', variant: 'destructive' });
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ first_name: firstName, phone: phone })
      .eq('id', userId);

    if (error) {
      toast({ title: 'Error saving profile', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Profile updated successfully.' });
    }
    setLoading(false);
  };

  if (loading) {
    return <div>Loading profile...</div>;
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Member Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
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
              <label htmlFor="phone">Phone Number</label>
              <Input
                id="phone"
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone Number"
              />
            </div>
            <Button onClick={handleSave} className="w-full">
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MemberProfile;
