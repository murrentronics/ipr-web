import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

interface BankDetails {
  id: string;
  user_id: string;
  bank_name: string;
  account_number: string;
  account_holder_name: string;
  swift_code: string | null;
  is_primary: boolean;
}

const MemberWallet = () => {
  const { toast } = useToast();
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [withdrawalAmount, setWithdrawalAmount] = useState<string>('');
  const [pendingRequests, setPendingRequests] = useState<WithdrawalRequest[]>([]);
  const [approvedRequests, setApprovedRequests] = useState<WithdrawalRequest[]>([]);
  const [deniedRequests, setDeniedRequests] = useState<WithdrawalRequest[]>([]);
  const [bankName, setBankName] = useState<string>('');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [accountHolderName, setAccountHolderName] = useState<string>('');
  const [swiftCode, setSwiftCode] = useState<string>('');
  const [userBankDetails, setUserBankDetails] = useState<BankDetails | null>(null);

  useEffect(() => {
    fetchWalletData();
    fetchWithdrawalRequests('pending', setPendingRequests);
    fetchWithdrawalRequests('approved', setApprovedRequests);
    fetchWithdrawalRequests('denied', setDeniedRequests);
    fetchBankDetails();
  }, []);

  const fetchBankDetails = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('bank_details')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching bank details:', error);
      return;
    }

    if (data) {
      setUserBankDetails(data);
      setBankName(data.bank_name);
      setAccountNumber(data.account_number);
      setAccountHolderName(data.account_holder_name);
      setSwiftCode(data.swift_code || '');
    }
  };

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

    if (!userBankDetails) {
      toast({
        title: 'Bank Details Required',
        description: 'Please save your bank details before submitting a withdrawal request.',
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
        bank_details_id: userBankDetails.id,
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

  const handleSaveBankDetails = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: 'Error',
        description: 'User not authenticated.',
        variant: 'destructive',
      });
      return;
    }

    if (!bankName || !accountNumber || !accountHolderName) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required bank details.',
        variant: 'destructive',
      });
      return;
    }

    const bankDetailsData = {
      user_id: user.id,
      bank_name: bankName,
      account_number: accountNumber,
      account_holder_name: accountHolderName,
      swift_code: swiftCode || null,
    };

    if (userBankDetails) {
      // Update existing bank details
      const { error } = await supabase
        .from('bank_details')
        .update(bankDetailsData)
        .eq('id', userBankDetails.id);

      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to update bank details.',
          variant: 'destructive',
        });
        console.error('Error updating bank details:', error);
        return;
      }

      toast({
        title: 'Success',
        description: 'Bank details updated successfully.',
      });
    } else {
      // Insert new bank details
      const { data, error } = await supabase
        .from('bank_details')
        .insert(bankDetailsData)
        .select();

      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to save bank details.',
          variant: 'destructive',
        });
        console.error('Error saving bank details:', error);
        return;
      }

      if (data && data.length > 0) {
        setUserBankDetails(data[0]);
      }

      toast({
        title: 'Success',
        description: 'Bank details saved successfully.',
      });
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        <Card className="mb-8">

          <CardContent>
            <p className="text-2xl font-bold mb-4">Current Balance: ${walletBalance.toFixed(2)} TT</p>

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

                <Card className="mt-8">
                  <CardHeader>
                    <CardTitle>Bank Details</CardTitle>
                    <CardDescription>Please provide your bank details for withdrawals.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="bankName" className="text-right">Bank Name</Label>
                        <Select onValueChange={setBankName} value={bankName}>
                          <SelectTrigger className="col-span-3">
                            <SelectValue placeholder="Select a bank" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ANSA Bank">ANSA Bank</SelectItem>
                            <SelectItem value="First Citizens Bank">First Citizens Bank</SelectItem>
                            <SelectItem value="JMMB Bank (T&T) Limited">JMMB Bank (T&T) Limited</SelectItem>
                            <SelectItem value="RBC Royal Bank">RBC Royal Bank</SelectItem>
                            <SelectItem value="Republic Bank Limited">Republic Bank Limited</SelectItem>
                            <SelectItem value="Scotiabank Trinidad & Tobago Limited">Scotiabank Trinidad & Tobago Limited</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {bankName === 'Scotiabank Trinidad & Tobago Limited' && (
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="swiftCode" className="text-right">SWIFT Code</Label>
                          <Select onValueChange={setSwiftCode} value={swiftCode}>
                            <SelectTrigger className="col-span-3">
                              <SelectValue placeholder="Select SWIFT code" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="BNSCTTTT">BNSCTTTT (Scotiabank Trinidad & Tobago Limited)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="accountHolderName" className="text-right">Account Holder Name</Label>
                        <Input id="accountHolderName" value={accountHolderName} onChange={(e) => setAccountHolderName(e.target.value)} className="col-span-3" />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="accountNumber" className="text-right">Account Number</Label>
                        <Input id="accountNumber" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} className="col-span-3" />
                      </div>
                      <Button onClick={handleSaveBankDetails} className="w-full">Save Bank Details</Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="pending">
                <Card>
                  <CardHeader className={pendingRequests.length === 0 ? 'text-center' : ''}>
                        <CardTitle>Pending Withdrawal Requests</CardTitle>
                      </CardHeader>
                  <CardContent>
                    {pendingRequests.length === 0 ? (
                      <p className="text-center py-8 text-muted-foreground">No pending withdrawal requests.</p>
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
                  <CardHeader className={approvedRequests.length === 0 ? 'text-center' : ''}>
                    <CardTitle>Approved Withdrawal Requests</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {approvedRequests.length === 0 ? (
                      <p className="text-center py-8 text-muted-foreground">No approved withdrawal requests.</p>
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
                  <CardHeader className={deniedRequests.length === 0 ? 'text-center' : ''}>
                    <CardTitle>Denied Withdrawal Requests</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {deniedRequests.length === 0 ? (
                      <p className="text-center py-8 text-muted-foreground">No denied withdrawal requests.</p>
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
