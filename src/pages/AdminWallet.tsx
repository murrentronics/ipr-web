import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Layout } from '@/components/Layout';

interface WithdrawalRequest {
  id: string;
  user_id: string;
  amount: number;
  status: 'pending' | 'approved' | 'denied';
  requested_at: string;
  processed_at: string | null;
  admin_id: string | null;
}

const AdminWallet = () => {
  const { toast } = useToast();
  const [pendingRequests, setPendingRequests] = useState<WithdrawalRequest[]>([]);
  const [profilesMap, setProfilesMap] = useState<Record<string, any>>({});

  useEffect(() => {
    fetchPendingRequests();
  }, []);

  const fetchPendingRequests = async () => {
    const { data, error } = await supabase
      .from('withdrawal_requests')
      .select('*')
      .eq('status', 'pending')
      .order('requested_at', { ascending: true });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch pending withdrawal requests.',
        variant: 'destructive',
      });
      console.error('Error fetching pending requests:', error);
      return;
    }
    setPendingRequests(data || []);
    fetchProfiles(data?.map(req => req.user_id) || []);
  };

  const fetchProfiles = async (userIds: string[]) => {
    if (userIds.length === 0) return;
    const { data, error } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email')
      .in('id', userIds);

    if (error) {
      console.error('Error fetching profiles:', error);
      return;
    }
    const map: Record<string, any> = {};
    data?.forEach(profile => {
      map[profile.id] = profile;
    });
    setProfilesMap(map);
  };

  const handleApprove = async (request: WithdrawalRequest) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const adminId = sessionData.session?.user?.id;

    if (!adminId) {
      toast({
        title: 'Error',
        description: 'Admin user not authenticated.',
        variant: 'destructive',
      });
      return;
    }

    // Update withdrawal request status
    const { error: updateError } = await supabase
      .from('withdrawal_requests')
      .update({ status: 'approved', processed_at: new Date().toISOString(), admin_id: adminId })
      .eq('id', request.id);

    if (updateError) {
      toast({
        title: 'Error',
        description: 'Failed to approve withdrawal request.',
        variant: 'destructive',
      });
      console.error('Error approving request:', updateError);
      return;
    }

    // Deduct amount from user's wallet
    const { error: walletError } = await supabase
      .from('wallets')
      .update({ balance: supabase.rpc('decrement_balance', { user_id: request.user_id, amount: request.amount }) })
      .eq('id', request.user_id);

    if (walletError) {
      toast({
        title: 'Error',
        description: 'Failed to deduct amount from user wallet.',
        variant: 'destructive',
      });
      console.error('Error deducting from wallet:', walletError);
      // Optionally, revert withdrawal request status if wallet update fails
      await supabase.from('withdrawal_requests').update({ status: 'pending', processed_at: null, admin_id: null }).eq('id', request.id);
      return;
    }

    toast({
      title: 'Success',
      description: 'Withdrawal request approved and amount deducted from wallet.',
    });
    fetchPendingRequests(); // Refresh the list
  };

  const handleDeny = async (request: WithdrawalRequest) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const adminId = sessionData.session?.user?.id;

    if (!adminId) {
      toast({
        title: 'Error',
        description: 'Admin user not authenticated.',
        variant: 'destructive',
      });
      return;
    }

    const { error } = await supabase
      .from('withdrawal_requests')
      .update({ status: 'denied', processed_at: new Date().toISOString(), admin_id: adminId })
      .eq('id', request.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to deny withdrawal request.',
        variant: 'destructive',
      });
      console.error('Error denying request:', error);
      return;
    }

    toast({
      title: 'Success',
      description: 'Withdrawal request denied.',
    });
    fetchPendingRequests(); // Refresh the list
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        <Card>
          <CardHeader>
            <CardTitle>Admin Wallet - Withdrawal Requests</CardTitle>
            <CardDescription>Approve or deny pending member withdrawal requests.</CardDescription>
          </CardHeader>
          <CardContent>
            {pendingRequests.length === 0 ? (
              <p>No pending withdrawal requests.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Requested At</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>{profilesMap[request.user_id]?.first_name} {profilesMap[request.user_id]?.last_name} ({profilesMap[request.user_id]?.email})</TableCell>
                      <TableCell>${request.amount.toFixed(2)}</TableCell>
                      <TableCell>{new Date(request.requested_at).toLocaleString()}</TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleApprove(request)}
                          className="mr-2"
                        >
                          Approve
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeny(request)}
                        >
                          Deny
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default AdminWallet;
