import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { User } from "@supabase/supabase-js";
import { Users, DollarSign, FileText, Clock, TrendingUp } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  phone?: string;
  email: string;
}

interface Group {
  id: string;
  group_number: string;
  status: string;
  total_members: number;
  max_members: number;
}

interface Contract {
  id: string;
  contract_number?: string;
  amount?: number;
  status: string;
  group_id: string;
  contracts_requested?: number;
  groups: {
    group_number: string;
    status: string;
    max_members?: number;
    total_members?: number;
  };
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [contractsCount, setContractsCount] = useState<number>(1);
  const [submitting, setSubmitting] = useState(false);
  const PRICE_PER_CONTRACT = 10000;
  const [pendingCounts, setPendingCounts] = useState<Record<string, number>>({});
  const MONTHLY_PAYOUT_PER_CONTRACT = 1800;
  const formatDMY = (d: Date) => `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getFullYear()).slice(-2)}`;
  const [activationMap, setActivationMap] = useState<Record<string, Date>>({});
  const [groupCompleteMap, setGroupCompleteMap] = useState<Record<string, boolean>>({});

  const checkAuth = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      navigate('/auth');
      return;
    }

    // Check if user is admin
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleData) {
      // Redirect admins to admin page
      navigate('/admin');
      return;
    }

    setUser(session.user);
    loadUserData(session.user.id);
    navigate('/');
  }, [navigate, loadUserData]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth, loadUserData]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'join_requests' }, () => {
        loadUserData(user.id);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'groups' }, () => {
        loadUserData(user.id);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, loadUserData]);

  const loadUserData = useCallback(async (userId: string) => {
    try {
      // Load profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      setProfile(profileData);

      // Load groups
      const { data: groupsData } = await supabase
        .from('groups')
        .select('*')
        .eq('status', 'open')
        .order('created_at', { ascending: false });
      setGroups(groupsData || []);

      // Load user's join_requests
      const { data: contractsData } = await supabase
        .from('join_requests')
        .select(`
          *,
          groups (
            group_number,
            status,
            max_members,
            total_members
          )
        `)
        .eq('user_id', userId);
      setContracts(contractsData || []);
      const gids = Array.from(new Set((contractsData || []).map((r: Contract) => r.group_id).filter(Boolean)));
      if (gids.length) {
        const { data: paidRows } = await supabase
          .from('join_requests')
          .select('group_id, updated_at, status')
          .in('group_id', gids)
          .eq('status', 'funds_deposited');
        const actMap: Record<string, Date> = {};
        (paidRows || []).forEach((r: { group_id: string; updated_at: string; status: string }) => {
          const t = r.updated_at ? new Date(r.updated_at).getTime() : 0;
          const prev = actMap[r.group_id]?.getTime() || 0;
          if (t > prev) actMap[r.group_id] = new Date(t);
        });
        setActivationMap(actMap);

        const { data: statusRows } = await supabase
          .from('join_requests')
          .select('group_id, status')
          .in('group_id', gids);
        const hasApproved: Record<string, boolean> = {};
        (statusRows || []).forEach((r: { group_id: string; status: string }) => {
          if (r.status === 'approved') hasApproved[r.group_id] = true;
        });
        const completeMap: Record<string, boolean> = {};
        (contractsData || []).forEach((r: Contract) => {
          const g = r.groups || {};
          const total = Number(g.total_members ?? 0);
          const max = Number(g.max_members ?? 25);
          if (r.group_id) completeMap[r.group_id] = total >= max && !hasApproved[r.group_id];
        });
        setGroupCompleteMap(completeMap);
      }
      const counts: Record<string, number> = {};
      (contractsData || []).forEach((req: Contract) => {
        if (req.status === 'pending') {
          const qty = Number(req.contracts_requested ?? 1);
          counts[req.group_id] = (counts[req.group_id] || 0) + qty;
        }
      });
      setPendingCounts(counts);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [setProfile, setGroups, setContracts, setActivationMap, setGroupCompleteMap, setPendingCounts, toast, setLoading]);

  const requestToJoinGroup = async (groupId: string, requested: number) => {
    if (!user) return;
    try {
      setSubmitting(true);
      const { data: existing } = await supabase
        .from('join_requests')
        .select('id,status,contracts_requested')
        .eq('user_id', user.id)
        .eq('group_id', groupId)
        .eq('status', 'pending')
        .maybeSingle();

      if (existing?.id) {
        const currentQty = Number(existing.contracts_requested ?? 1);
        const { error: updErr } = await supabase
          .from('join_requests')
          .update({ contracts_requested: currentQty + requested })
          .eq('id', existing.id);
        if (updErr) throw updErr;
      } else {
        const { error } = await supabase
          .from('join_requests')
          .insert({
            user_id: user.id,
            group_id: groupId,
            contracts_requested: requested,
            status: 'pending',
          });
        if (error) throw error;
      }
      toast({
        title: "Success!",
        description: "Your request has been submitted/updated for admin approval.",
      });
      loadUserData(user.id);
      setJoinDialogOpen(false);
      setSelectedGroup(null);
      setContractsCount(1);
      setPendingCounts((prev) => ({
        ...prev,
        [groupId]: (prev[groupId] || 0) + requested,
      }));
    } catch (error: Error) {
      const message = String(error?.message || '').toLowerCase();
      if (
        message.includes('duplicate key') ||
        message.includes('unique constraint') ||
        message.includes('join_requests_group_id_user_id_status_key')
      ) {
        toast({
          title: "Updated",
          description: "Your pending request was updated for this group.",
        });
      } else {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const openJoinDialog = (group: Group) => {
    setSelectedGroup(group);
    setContractsCount(1);
    setJoinDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      'pending': 'outline',
      'approved': 'secondary',
      'funds_deposited': 'default',
      'active': 'default',
      'completed': 'secondary',
    };
    return (
      <Badge variant={variants[status] || 'default'}>
        {status.replace(/_/g, ' ').toUpperCase()}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12">
          <div className="text-center">Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Welcome back, {profile?.first_name}!
          </h1>
          <p className="text-muted-foreground">
            Manage your investment contracts and track your groups
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Active Contracts</p>
                  <p className="text-2xl font-bold">
                    {contracts.filter(c => c.status === 'active').length}
                  </p>
                </div>
                <FileText className="w-8 h-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Investment</p>
                  <p className="text-2xl font-bold">
                    ${contracts.reduce((sum, c) => sum + Number(c.amount ?? 0), 0).toLocaleString()}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-accent opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Pending Approval</p>
                  <p className="text-2xl font-bold">
                    {contracts.filter(c => c.status === 'pending').length}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-success opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Monthly Income</p>
                  <p className="text-2xl font-bold">
                    ${contracts.filter(c => c.status === 'active').length * 1800}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="contracts" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="contracts">My Contracts</TabsTrigger>
            <TabsTrigger value="payouts">Active Groups - Payouts History</TabsTrigger>
            <TabsTrigger value="groups">Available Groups</TabsTrigger>
          </TabsList>

          <TabsContent value="contracts">
            <Card>
              <CardHeader>
                <CardTitle>My Contracts</CardTitle>
                <CardDescription>View and manage your investment contracts</CardDescription>
              </CardHeader>
              <CardContent>
                {contracts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No contracts yet. Join a group to get started!
                  </div>
                ) : (
                  <div className="space-y-4">
                    {contracts.map((contract) => (
                      <div
                        key={contract.id}
                        className="flex items-center justify-between p-4 border border-border rounded-lg"
                      >
                        <div>
                          <p className="font-semibold">{contract.contract_number || contract.groups?.group_number}</p>
                          {contract.status === 'pending' ? (
                            <p className="text-sm text-muted-foreground">
                              Group: {contract.groups?.group_number || 'N/A'} | Contracts: {Number(contract.contracts_requested ?? 1)} | Total: ${((Number(contract.contracts_requested ?? 1)) * PRICE_PER_CONTRACT).toLocaleString()}
                            </p>
                          ) : contract.status === 'approved' || contract.status === 'funds_deposited' ? (
                            <p className="text-sm text-muted-foreground">
                              Group: {contract.groups?.group_number || 'N/A'} | Contracts: {Number(contract.contracts_requested ?? 1)} | Total: ${((Number(contract.contracts_requested ?? 1)) * PRICE_PER_CONTRACT).toLocaleString()}
                            </p>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              Group: {contract.groups?.group_number || 'N/A'} | Amount: ${Number(contract.amount ?? 0).toLocaleString()}
                            </p>
                          )}
                        </div>
                        {(() => {
                          const status = (contract.status || '').toLowerCase();
                          let label = '';
                          let variant: "default" | "secondary" | "destructive" | "outline" = 'default';
                          if (status === 'funds_deposited') {
                            const complete = groupCompleteMap[contract.group_id];
                            label = complete ? 'PAID-active' : 'PAID-inactive';
                            variant = 'default';
                          } else if (status === 'approved') {
                            label = 'Pending payment';
                            variant = 'outline';
                          } else if (status === 'pending') {
                            label = 'PENDING';
                            variant = 'outline';
                          } else {
                            label = (contract.status || '').replace(/_/g, ' ').toUpperCase();
                            variant = 'secondary';
                          }
                          return <Badge variant={variant}>{label}</Badge>;
                        })()}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payouts">
            <Card>
              <CardHeader>
                <CardTitle>Active Groups - Payouts History</CardTitle>
                <CardDescription>Monthly payouts over 60 months</CardDescription>
              </CardHeader>
              <CardContent>
                {contracts.filter(c => c.status === 'funds_deposited' && groupCompleteMap[c.group_id]).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No payouts yet. Payments start after approval is marked paid.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {contracts.filter(c => c.status === 'funds_deposited' && groupCompleteMap[c.group_id]).map((c) => {
                      const qty = Number(c.contracts_requested ?? 1);
                      const start = activationMap[c.group_id] || new Date();
                      const now = new Date();
                      const rawMonths = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
                      const adjust = now.getDate() < start.getDate() ? 1 : 0;
                      const cycles = Math.max(0, Math.min(60, rawMonths - adjust));
                      const monthly = MONTHLY_PAYOUT_PER_CONTRACT * qty;
                      const total = monthly * cycles;
                      const nextPayout = new Date(start.getFullYear(), start.getMonth() + 1, start.getDate());
                      return (
                        <div key={c.id} className="p-4 border border-border rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold">{c.groups?.group_number || 'Group'}</p>
                              <p className="text-sm text-muted-foreground">
                                Contracts: {qty} | Monthly Payout: ${monthly.toLocaleString()} | Cycles: {cycles}/60 | Total Collected: ${total.toLocaleString()} | Next Payout: {formatDMY(nextPayout)}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="groups">
            <Card>
              <CardHeader>
                <CardTitle>Available Groups</CardTitle>
                <CardDescription>Join an open investment group</CardDescription>
              </CardHeader>
              <CardContent>
                {groups.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No open groups available at the moment. Check back soon!
                  </div>
                ) : (
              <div className="space-y-4">
                {groups.map((group) => (
                  <div
                    key={group.id}
                    className="p-6 border border-border rounded-lg hover:border-primary transition-colors"
                  >
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold">{group.group_number}</h3>
                      <Badge variant="outline">
                        <Users className="w-3 h-3 mr-1" />
                        {(group.total_members ?? 0)}/{group.max_members ?? 0}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      {Math.max(0, (group.max_members ?? 0) - (group.total_members ?? 0))} positions available
                    </p>
                    <Button 
                          className="w-full" 
                          size="sm"
                          onClick={() => openJoinDialog(group)}
                        >
                          Request to Join
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request to Join</DialogTitle>
            <DialogDescription>
              {selectedGroup ? `${selectedGroup.group_number}` : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="contracts">Contracts to lock</Label>
              <Input
                id="contracts"
                type="number"
                min={1}
                max={selectedGroup ? Math.max(1, (selectedGroup.max_members ?? 0) - (selectedGroup.total_members ?? 0) - (pendingCounts[selectedGroup.id] ?? 0)) : 25}
                value={contractsCount}
                onChange={(e) => setContractsCount(Math.max(1, Number(e.target.value)))}
              />
            </div>
            <div className="text-sm text-muted-foreground">
              Total: ${((contractsCount || 1) * PRICE_PER_CONTRACT).toLocaleString()}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setJoinDialogOpen(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={() => selectedGroup && requestToJoinGroup(selectedGroup.id, contractsCount)} disabled={submitting}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Dashboard;
