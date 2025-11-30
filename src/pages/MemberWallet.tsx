import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

const MemberWallet = () => {
  const { toast } = useToast();
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [withdrawalAmount, setWithdrawalAmount] = useState<string>('');
  const [pendingRequests, setPendingRequests] = useState<WithdrawalRequest[]>([]);
  const [approvedRequests, setApprovedRequests] = useState<WithdrawalRequest[]>([]);
  const [deniedRequests, setDeniedRequests] = useState<WithdrawalRequest[]>([]);

  useEffect(() => {
    fetchWalletData();
    fetchWithdrawalRequests('pending', setPendingRequests);
    fetchWithdrawalRequests('approved', setApprovedRequests);
    fetchWithdrawalRequests('denied', setDeniedRequests);
  }, []);

  const fetchWalletData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: 'Error',
        description: 'User not authenticated.',
        variant: 'destructive',
      });
      return;
    }

    const { data, error } = await supabase
      .from('wallets')
      .select('balance')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch wallet balance.',
        variant: 'destructive',
      });
      console.error('Error fetching wallet balance:', error);
      return;
    }
    setWalletBalance(data?.balance || 0);
  };

  const fetchWithdrawalRequests = async (status: 'pending' | 'approved' | 'denied', setter: React.Dispatch<React.SetStateAction<WithdrawalRequest[]>>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('withdrawal_requests')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', status)
      .order('requested_at', { ascending: false });

    if (error) {
      toast({
        title: 'Error',
        description: `Failed to fetch ${status} withdrawal requests.`,
        variant: 'destructive',
      });
      console.error(`Error fetching ${status} requests:`, error);
      return;
    }
    setter(data || []);
  };

  const handleWithdrawalRequest = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: 'Error',
        description: 'User not authenticated.',
        variant: 'destructive',
      });
      return;
    }

    const amount = parseFloat(withdrawalAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid positive amount.',
        variant: 'destructive',
      });
      return;
    }

    if (amount > walletBalance) {
      toast({
        title: 'Insufficient Funds',
        description: 'You cannot withdraw more than your current balance.',
        variant: 'destructive',
      });
      return;
    }

    const { error } = await supabase
      .from('withdrawal_requests')
      .insert({
        user_id: user.id,
        amount: amount,
        status: 'pending',
      });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to submit withdrawal request.',
        variant: 'destructive',
      });
      console.error('Error submitting withdrawal request:', error);
      return;
    }

    toast({
      title: 'Success',
      description: 'Withdrawal request submitted successfully.',
    });
    setWithdrawalAmount('');
    fetchWithdrawalRequests('pending', setPendingRequests); // Refresh pending requests
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        <Card className="mb-8">

          <CardContent>
            <p className="text-2xl font-bold mb-4">Current Balance: ${walletBalance.toFixed(2)}</p>

            <Tabs defaultValue="request" className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-4">
                <TabsTrigger value="request">Withdraw</TabsTrigger>
                <TabsTrigger value="pending">Pending ({pendingRequests.length})</TabsTrigger>
                <TabsTrigger value="approved">Approved ({approvedRequests.length})</TabsTrigger>
                <TabsTrigger value="denied">Denied ({deniedRequests.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="request">
                <Card>
                  <CardHeader>
                    <CardTitle>Request New Withdrawal</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center space-x-2">
                      <Input
                        type="number"
                        placeholder="Amount"
                        value={withdrawalAmount}
                        onChange={(e) => setWithdrawalAmount(e.target.value)}
                        min="0.01"
                        step="0.01"
                      />
                      <Button onClick={handleWithdrawalRequest}>Submit Request</Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="pending">
                <Card>
                  <CardHeader>
                    <CardTitle>Pending Withdrawal Requests</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {pendingRequests.length === 0 ? (
                      <p>No pending withdrawal requests.</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Amount</TableHead>
                            <TableHead>Requested At</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pendingRequests.map((request) => (
                            <TableRow key={request.id}>
                              <TableCell>${request.amount.toFixed(2)}</TableCell>
                              <TableCell>{new Date(request.requested_at).toLocaleString()}</TableCell>
                              <TableCell>{request.status}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="approved">
                <Card>
                  <CardHeader>
                    <CardTitle>Approved Withdrawal Requests</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {approvedRequests.length === 0 ? (
                      <p>No approved withdrawal requests.</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Amount</TableHead>
                            <TableHead>Requested At</TableHead>
                            <TableHead>Processed At</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {approvedRequests.map((request) => (
                            <TableRow key={request.id}>
                              <TableCell>${request.amount.toFixed(2)}</TableCell>
                              <TableCell>{new Date(request.requested_at).toLocaleString()}</TableCell>
                              <TableCell>{request.processed_at ? new Date(request.processed_at).toLocaleString() : 'N/A'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="denied">
                <Card>
                  <CardHeader>
                    <CardTitle>Denied Withdrawal Requests</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {deniedRequests.length === 0 ? (
                      <p>No denied withdrawal requests.</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Amount</TableHead>
                            <TableHead>Requested At</TableHead>
                            <TableHead>Processed At</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {deniedRequests.map((request) => (
                            <TableRow key={request.id}>
                              <TableCell>${request.amount.toFixed(2)}</TableCell>
                              <TableCell>{new Date(request.requested_at).toLocaleString()}</TableCell>
                              <TableCell>{request.processed_at ? new Date(request.processed_at).toLocaleString() : 'N/A'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default MemberWallet;
