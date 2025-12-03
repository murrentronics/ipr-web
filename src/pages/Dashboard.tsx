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
import { User, PostgrestError, Session } from "@supabase/supabase-js";
import { Users, DollarSign, FileText, Clock, TrendingUp, Check, XCircle, HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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

interface GroupDetails {
  group_number: string;
  status: string;
  max_members?: number;
  total_members?: number;
}

interface Contract {
  id: string;
  contract_number?: string;
  amount: number;
  status: string;
  group_id: string;
  contracts_requested: number;
  monthly_payout: number;
  groups: GroupDetails;
}

interface PaidRow {
  group_id: string;
  updated_at: string;
  status: string;
}

interface StatusRow {
  group_id: string;
  status: string;
}

interface UserRole {
  user_id: string;
  role: string;
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
  const [incompleteProfileDialogOpen, setIncompleteProfileDialogOpen] = useState(false);

  const loadUserData = useCallback(async (userId: string) => {
    try {
      // Load profile
      const { data: profileData }: { data: Profile | null } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      setProfile(profileData);

      // Load groups
      const { data: groupsData }: { data: Group[] | null } = await supabase
        .from('groups')
        .select('*')
        .eq('status', 'open')
        .order('created_at', { ascending: false });
      setGroups(groupsData || []);

      // Load user's join_requests
      const { data: contractsData }: { data: Contract[] | null } = await supabase
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

      const processedContractsData = (contractsData || []).map(contract => {
         const contractsRequested = Number(contract.contracts_requested ?? 0);
         return {
           ...contract,
           contracts_requested: contractsRequested,
           amount: contractsRequested * PRICE_PER_CONTRACT,
           monthly_payout: contractsRequested * MONTHLY_PAYOUT_PER_CONTRACT,
           group_number_int: parseInt((contract.groups?.group_number || 'IPR00000').replace('IPR', ''), 10) || 0,
         };
       }).sort((a, b) => b.group_number_int - a.group_number_int);
       setContracts(processedContractsData);

      const gids: string[] = Array.from(new Set((contractsData || []).map((r: Contract) => r.group_id).filter(Boolean)));
      if (gids.length) {
        const { data: paidRows }: { data: PaidRow[] | null } = await supabase
          .from('join_requests')
          .select('group_id, updated_at, status')
          .in('group_id', gids)
          .eq('status', 'funds_deposited');
        const actMap: Record<string, Date> = {};
        (paidRows || []).forEach((r: PaidRow) => {
          const t = r.updated_at ? new Date(r.updated_at).getTime() : 0;
          const prev = actMap[r.group_id]?.getTime() || 0;
          if (t > prev) actMap[r.group_id] = new Date(t);
        });
        setActivationMap(actMap);

        const { data: statusRows }: { data: StatusRow[] | null } = await supabase
          .from('join_requests')
          .select('group_id, status')
          .in('group_id', gids);
        const hasApproved: Record<string, boolean> = {};
        (statusRows || []).forEach((r: StatusRow) => {
          if (r.status === 'approved') hasApproved[r.group_id] = true;
        });
        const completeMap: Record<string, boolean> = {};
        (contractsData || []).forEach((r: Contract) => {
          const g: GroupDetails = r.groups || { group_number: '', status: '' };
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
    } catch (error: unknown) {
      console.error('Error loading dashboard data:', error);
      let message = "Failed to load dashboard data";
      if (error instanceof Error) {
        message = error.message;
      }
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [setProfile, setGroups, setContracts, setActivationMap, setGroupCompleteMap, setPendingCounts, toast, setLoading]);

  const saveGoogleProfileData = useCallback(async (userId: string, userMetadata: Record<string, unknown>) => {
    // Extract name from Google OAuth metadata
    const fullName = userMetadata?.full_name as string || userMetadata?.name as string || '';
    const nameParts = fullName.split(' ');
    const firstName = userMetadata?.given_name as string || nameParts[0] || '';
    const lastName = userMetadata?.family_name as string || nameParts.slice(1).join(' ') || '';
    const email = userMetadata?.email as string || '';

    if (firstName || lastName || email) {
      // Check if profile exists and needs updating
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('first_name, last_name, email')
        .eq('id', userId)
        .single();

      // Only update if fields are empty
      const updates: Record<string, string> = {};
      if (!existingProfile?.first_name && firstName) updates.first_name = firstName;
      if (!existingProfile?.last_name && lastName) updates.last_name = lastName;
      if (!existingProfile?.email && email) updates.email = email;

      if (Object.keys(updates).length > 0) {
        await supabase
          .from('profiles')
          .upsert({ id: userId, ...updates });
      }
    }
  }, []);

  const checkAuth = useCallback(async () => {
    const { data: { session } }: { data: { session: Session | null } } = await supabase.auth.getSession();

    if (!session) {
      navigate('/auth');
      return;
    }

    // Check if user is admin
    const { data: roleData }: { data: UserRole | null } = await supabase
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

    // Save Google OAuth profile data if present
    if (session.user.app_metadata?.provider === 'google' || session.user.identities?.some(i => i.provider === 'google')) {
      await saveGoogleProfileData(session.user.id, session.user.user_metadata);
    }

    setUser(session.user);
    loadUserData(session.user.id);
  }, [navigate, loadUserData, saveGoogleProfileData]);

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

  const requestToJoinGroup = useCallback(async (groupId: string, requested: number) => {
    if (!user) return;
    try {
      setSubmitting(true);
      const { data: pendingRequests } = await supabase
        .from('join_requests')
        .select('id,status,contracts_requested')
        .eq('user_id', user.id)
        .eq('group_id', groupId)
        .eq('status', 'pending');

      if (pendingRequests && pendingRequests.length > 0) {
        toast({
          title: "Request Denied",
          description: "You have pending join requests for this group. Please wait for them to be approved before submitting new ones.",
          variant: "destructive",
        });
        setSubmitting(false);
        return;
      }

      const { data: existing } = await supabase
        .from('join_requests')
        .select('id,status,contracts_requested')
        .eq('user_id', user.id)
        .eq('group_id', groupId)
        .eq('status', 'pending')
        .maybeSingle();

      if (existing?.id) {
        const currentQty = Number(existing.contracts_requested ?? 1);
        const { error: updErr }: { error: PostgrestError | null } = await supabase
          .from('join_requests')
          .update({ contracts_requested: currentQty + requested })
          .eq('id', existing.id);
        if (updErr) throw updErr;
      } else {
        const { error }: { error: PostgrestError | null } = await supabase
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

    } catch (error: PostgrestError | Error | unknown) {
      let message = "An unknown error occurred.";
      if (error instanceof Error) {
        message = error.message;
      }
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }, [user, toast, loadUserData, setJoinDialogOpen, setSelectedGroup, setContractsCount]);

  const isProfileComplete = useCallback(() => {
    return !!(profile?.first_name?.trim() && profile?.last_name?.trim() && profile?.phone?.trim());
  }, [profile]);

  const openJoinDialog = (group: Group) => {
    if (!isProfileComplete()) {
      setIncompleteProfileDialogOpen(true);
      return;
    }
    setSelectedGroup(group);
    setContractsCount(1);
    setJoinDialogOpen(true);
  };

  const getStatusBadge = (status: string): JSX.Element => {
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
        {/* Contract Stats Row */}
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-4 text-blue-600">Contract Status</h2>
          <div className="grid md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm text-muted-foreground">Active</p>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="w-4 h-4 text-gray-400 cursor-help hover:text-gray-600" />
                          </TooltipTrigger>
                          <TooltipContent>All paid and active contracts.</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <p className="text-2xl font-bold">
                      {contracts.filter(c => c.status === 'funds_deposited' && groupCompleteMap[c.group_id]).reduce((sum, c) => sum + Number(c.amount ?? 0), 0) / 10000}
                    </p>
                  </div>
                  <Check className="w-12 h-12 text-green-500 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm text-muted-foreground">Inactive</p>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="w-4 h-4 text-gray-400 cursor-help hover:text-gray-600" />
                          </TooltipTrigger>
                          <TooltipContent>You paid and awaiting all members to complete payment.</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <p className="text-2xl font-bold">
                      {contracts.filter(c => c.status === 'funds_deposited' && !groupCompleteMap[c.group_id]).reduce((sum, c) => sum + Number(c.contracts_requested ?? 0), 0)}
                    </p>
                  </div>
                  <Check className="w-12 h-12 text-red-500 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm text-muted-foreground">Unpaid</p>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="w-4 h-4 text-gray-400 cursor-help hover:text-gray-600" />
                          </TooltipTrigger>
                          <TooltipContent>You have not yet made payment. Group may still be opened.</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <p className="text-2xl font-bold">
                      {contracts.filter(c => c.status === 'approved').reduce((sum, c) => sum + Number(c.contracts_requested ?? 0), 0)}
                    </p>
                  </div>
                  <Clock className="w-8 h-8 text-green-500 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm text-muted-foreground">Pending</p>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="w-4 h-4 text-gray-400 cursor-help hover:text-gray-600" />
                          </TooltipTrigger>
                          <TooltipContent>Your request is still being reviewed by Admin.</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <p className="text-2xl font-bold">
                      {contracts.filter(c => c.status === 'pending').reduce((sum, c) => sum + Number(c.contracts_requested ?? 0), 0)}
                    </p>
                  </div>
                  <Clock className="w-8 h-8 text-red-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Investment and Return Row */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4 text-blue-600">Investment and Monthly Return</h2>
          <div className="grid md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Active</p>
                    <p className="text-2xl font-bold">
                      ${contracts.filter(c => c.status === 'funds_deposited' && groupCompleteMap[c.group_id]).reduce((sum, c) => sum + Number(c.amount ?? 0), 0).toLocaleString()}
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
                    <p className="text-sm text-muted-foreground mb-1">Total</p>
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
                    <p className="text-sm text-muted-foreground mb-1">Unpaid</p>
                    <p className="text-2xl font-bold">
                      ${contracts.filter(c => c.status === 'approved').reduce((sum, c) => sum + Number(c.amount ?? 0), 0).toLocaleString()}
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
                    <p className="text-sm text-muted-foreground mb-1">Return</p>
                    <p className="text-2xl font-bold">
                      ${contracts.filter(c => c.status === 'funds_deposited' && groupCompleteMap[c.group_id]).reduce((sum, c) => sum + Number(c.monthly_payout ?? 0), 0).toLocaleString()}
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-primary opacity-50" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Tabs defaultValue="groups" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="groups">Groups</TabsTrigger>
            <TabsTrigger value="contracts">Contracts</TabsTrigger>
            <TabsTrigger value="payouts">Payout History</TabsTrigger>
          </TabsList>

          <TabsContent value="contracts">
            <Card>
              <CardHeader>
                <CardTitle>Contracts</CardTitle>
                <CardDescription>View and manage your investment contracts</CardDescription>
              </CardHeader>
              <CardContent>
                {contracts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No contracts yet. Join a group to get started!
                  </div>
                ) : (
                  <div className="space-y-4">
                    {contracts.map((contract: Contract) => (
                      <div
                        key={contract.id}
                        className="flex items-center justify-between p-4 border border-border rounded-lg"
                      >
                        <div>

                          <div className="flex flex-wrap gap-2 mt-2">
                            <Badge className="bg-sky-500 text-white">Group: {contract.groups?.group_number || 'N/A'}</Badge>
                            <Badge className="bg-sky-500 text-white">Contracts: {Number(contract.contracts_requested ?? 1)}</Badge>
                            <Badge className="bg-sky-500 text-white">Total: ${((Number(contract.contracts_requested ?? 1)) * PRICE_PER_CONTRACT).toLocaleString()}</Badge>
                          </div>
                        </div>
                        {(() => {
                          const status = (contract.status || '').toLowerCase();
                          let label = '';
                          let className = '';

                          if (status === 'funds_deposited') {
                            const complete = groupCompleteMap[contract.group_id];
                            if (complete) {
                              label = 'ACTIVE';
                              className = 'bg-green-500 text-white';
                            } else {
                              label = 'INACTIVE';
                              className = 'bg-gray-500 text-white';
                            }
                          } else if (status === 'approved') {
                            label = 'UNPAID';
                            className = 'bg-red-500 text-white';
                          } else if (status === 'pending') {
                            label = 'PENDING';
                            className = 'bg-orange-500 text-white';
                          } else {
                            label = (contract.status || '').replace(/_/g, ' ').toUpperCase();
                            className = 'bg-gray-500 text-white';
                          }
                          return <Badge className={className}>{label}</Badge>;
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
              <CardHeader className="text-center">
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
                    {contracts.filter(c => c.status === 'funds_deposited' && groupCompleteMap[c.group_id]).map((c: Contract) => {
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
                            <div className="flex flex-wrap gap-2 mt-2">
                              <div className="p-2 border rounded-md text-xs bg-blue-500 text-white">
                                Contracts: {qty}
                              </div>
                              <div className="p-2 border rounded-md text-xs bg-blue-500 text-white">
                                Monthly Payout: ${monthly.toLocaleString()}
                              </div>
                              <div className="p-2 border rounded-md text-xs bg-blue-500 text-white">
                                Cycles: {cycles}/60
                              </div>
                              <div className="p-2 border rounded-md text-xs bg-blue-500 text-white">
                                Total Collected: ${total.toLocaleString()}
                              </div>
                              <div className="p-2 border rounded-md text-xs bg-green-700 text-white">
                                Next Payout: {formatDMY(nextPayout)}
                              </div>
                            </div>
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
                {groups.map((group: Group) => (
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

      {/* Incomplete Profile Warning Dialog */}
      <Dialog open={incompleteProfileDialogOpen} onOpenChange={setIncompleteProfileDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <XCircle className="w-5 h-5" />
              Profile Incomplete
            </DialogTitle>
            <DialogDescription>
              Before you can request to join a group, please complete your profile with the following required information:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <div className="flex items-center gap-2">
              {profile?.first_name?.trim() ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <XCircle className="w-4 h-4 text-red-500" />
              )}
              <span className={profile?.first_name?.trim() ? 'text-muted-foreground' : 'font-medium'}>First Name</span>
            </div>
            <div className="flex items-center gap-2">
              {profile?.last_name?.trim() ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <XCircle className="w-4 h-4 text-red-500" />
              )}
              <span className={profile?.last_name?.trim() ? 'text-muted-foreground' : 'font-medium'}>Last Name</span>
            </div>
            <div className="flex items-center gap-2">
              {profile?.phone?.trim() ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <XCircle className="w-4 h-4 text-red-500" />
              )}
              <span className={profile?.phone?.trim() ? 'text-muted-foreground' : 'font-medium'}>Phone Number</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIncompleteProfileDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => { setIncompleteProfileDialogOpen(false); navigate('/member-profile'); }}>
              Update Profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Dashboard;
