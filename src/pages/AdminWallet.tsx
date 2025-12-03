import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Layout } from '@/components/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface BankDetails {
  id: string;
  user_id: string;
  bank_name: string;
  account_number: string;
  account_holder_name: string;
  swift_code: string | null;
  is_primary: boolean;
}

interface WithdrawalRequest {
  id: string;
  user_id: string;
  amount: number;
  status: 'pending' | 'approved' | 'denied';
  requested_at: string;
  processed_at: string | null;
  admin_id: string | null;
  bank_details_id: string | null;
  bank_details: BankDetails | null;
}

const AdminWallet = () => {
  const { toast } = useToast();
  const [pendingRequests, setPendingRequests] = useState<WithdrawalRequest[]>([]);
  const [approvedRequests, setApprovedRequests] = useState<WithdrawalRequest[]>([]);
  const [deniedRequests, setDeniedRequests] = useState<WithdrawalRequest[]>([]);
  const [profilesMap, setProfilesMap] = useState<Record<string, any>>({});
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState<boolean>(false);
  const [selectedRequest, setSelectedRequest] = useState<WithdrawalRequest | null>(null);

  useEffect(() => {
    fetchPendingRequests();
    fetchApprovedRequests();
    fetchDeniedRequests();
  }, []);

  const fetchPendingRequests = async () => {
    const { data, error } = await supabase
      .from('withdrawal_requests')
      .select(`
        *,
        bank_details (*)
      `)
      .eq('status', 'pending')
      .order('requested_at', { ascending: false });

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

  const fetchApprovedRequests = async () => {
    const { data, error } = await supabase
      .from('withdrawal_requests')
      .select(`
        *,
        bank_details (*)
      `)
      .eq('status', 'approved')
      .order('processed_at', { ascending: false });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch approved withdrawal requests.',
        variant: 'destructive',
      });
      console.error('Error fetching approved requests:', error);
      return;
    }
    setApprovedRequests(data || []);
    fetchProfiles(data?.map(req => req.user_id) || []);
  };

  const fetchDeniedRequests = async () => {
    const { data, error } = await supabase
      .from('withdrawal_requests')
      .select(`
        *,
        bank_details (*)
      `)
      .eq('status', 'denied')
      .order('processed_at', { ascending: false });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch denied withdrawal requests.',
        variant: 'destructive',
      });
      console.error('Error fetching denied requests:', error);
      return;
    }
    setDeniedRequests(data || []);
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

  const handleRowClick = (request: WithdrawalRequest) => {
    setSelectedRequest(request);
    setIsDetailsDialogOpen(true);
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 text-center">
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pending">Pending Requests</TabsTrigger>
            <TabsTrigger value="approved">Approved Requests</TabsTrigger>
            <TabsTrigger value="denied">Denied Requests</TabsTrigger>
          </TabsList>
          <TabsContent value="pending">
            <Card className="text-center">
              <CardHeader>
                <CardTitle>Withdrawal Requests</CardTitle>
                <CardDescription>Approve or deny pending member withdrawal requests.</CardDescription>
              </CardHeader>
              <CardContent>
                {pendingRequests.length === 0 ? (
                  <p className="text-center">No pending withdrawal requests.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Requested At</TableHead>
                        <TableHead>Bank Details</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingRequests.map((request) => (
                        <TableRow key={request.id} onClick={() => handleRowClick(request)} className="cursor-pointer hover:bg-gray-100">
                          <TableCell>{profilesMap[request.user_id]?.first_name} {profilesMap[request.user_id]?.last_name} ({profilesMap[request.user_id]?.email})</TableCell>
                          <TableCell>${request.amount.toFixed(2)}</TableCell>
                          <TableCell>{new Date(request.requested_at).toLocaleString()}</TableCell>
                          <TableCell>
                            {request.bank_details ? (
                              <span className="text-blue-600">View Details</span>
                            ) : (
                              <span className="text-gray-500">N/A</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent row click from firing
                                handleApprove(request);
                              }}
                              className="mr-2"
                            >
                              Approve
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent row click from firing
                                handleDeny(request);
                              }}
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
          </TabsContent>
          <TabsContent value="approved">
            <Card className="text-center">
              <CardHeader>
                <CardTitle>Approved Withdrawal Requests</CardTitle>
                <CardDescription>View all approved member withdrawal requests.</CardDescription>
              </CardHeader>
              <CardContent>
                {approvedRequests.length === 0 ? (
                  <p className="text-center">No approved withdrawal requests.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Processed At</TableHead>
                        <TableHead>Bank Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {approvedRequests.map((request) => (
                        <TableRow key={request.id} onClick={() => handleRowClick(request)} className="cursor-pointer hover:bg-gray-100">
                          <TableCell>{profilesMap[request.user_id]?.first_name} {profilesMap[request.user_id]?.last_name} ({profilesMap[request.user_id]?.email})</TableCell>
                          <TableCell>${request.amount.toFixed(2)}</TableCell>
                          <TableCell>{request.processed_at ? new Date(request.processed_at).toLocaleString() : 'N/A'}</TableCell>
                          <TableCell>
                            {request.bank_details ? (
                              <span className="text-blue-600">View Details</span>
                            ) : (
                              <span className="text-gray-500">N/A</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="denied">
            <Card className="text-center">
              <CardHeader>
                <CardTitle>Denied Withdrawal Requests</CardTitle>
                <CardDescription>View all denied member withdrawal requests.</CardDescription>
              </CardHeader>
              <CardContent>
                {deniedRequests.length === 0 ? (
                  <p className="text-center">No denied withdrawal requests.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Processed At</TableHead>
                        <TableHead>Bank Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deniedRequests.map((request) => (
                        <TableRow key={request.id} onClick={() => handleRowClick(request)} className="cursor-pointer hover:bg-gray-100">
                          <TableCell>{profilesMap[request.user_id]?.first_name} {profilesMap[request.user_id]?.last_name} ({profilesMap[request.user_id]?.email})</TableCell>
                          <TableCell>${request.amount.toFixed(2)}</TableCell>
                          <TableCell>{request.processed_at ? new Date(request.processed_at).toLocaleString() : 'N/A'}</TableCell>
                          <TableCell>
                            {request.bank_details ? (
                              <span className="text-blue-600">View Details</span>
                            ) : (
                              <span className="text-gray-500">N/A</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
          <DialogContent>
            <DialogHeader className="text-center">
              <DialogTitle>Withdrawal Request Details</DialogTitle>
              <DialogDescription>Bank details for the selected withdrawal request.</DialogDescription>
            </DialogHeader>
            {selectedRequest && selectedRequest.bank_details ? (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 items-center gap-4">
                  <span className="text-sm font-medium">Amount:</span>
                  <span>${selectedRequest.amount.toFixed(2)}</span>
                </div>
                <div className="grid grid-cols-2 items-center gap-4">
                  <span className="text-sm font-medium">Bank Name:</span>
                  <span>{selectedRequest.bank_details.bank_name}</span>
                </div>
                <div className="grid grid-cols-2 items-center gap-4">
                  <span className="text-sm font-medium">Account Holder:</span>
                  <span>{selectedRequest.bank_details.account_holder_name}</span>
                </div>
                <div className="grid grid-cols-2 items-center gap-4">
                  <span className="text-sm font-medium">Account Number:</span>
                  <span>{selectedRequest.bank_details.account_number}</span>
                </div>
                {selectedRequest.bank_details.swift_code && (
                  <div className="grid grid-cols-2 items-center gap-4">
                    <span className="text-sm font-medium">SWIFT Code:</span>
                    <span>{selectedRequest.bank_details.swift_code}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-center">No bank details available for this request.</p>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default AdminWallet;
