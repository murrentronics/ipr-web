import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Users, DollarSign, FileText, Clock, TrendingUp } from "lucide-react";

interface Group {
  id: string;
  group_number: string;
  status: string;
  total_members: number;
  max_members: number;
}

interface Contract {
  id: string;
  contract_number: string;
  amount: number;
  status: string;
  group_id: string;
  contracts_requested?: number;
  groups: {
    group_number: string;
    status: string;
  };
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [contractsCount, setContractsCount] = useState<number>(1);
  const [submitting, setSubmitting] = useState(false);
  const PRICE_PER_CONTRACT = 10000;
  const [pendingCounts, setPendingCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const checkAuth = async () => {
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
    };

    checkAuth();
  }, [navigate]);

  const loadUserData = async (userId: string) => {
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
            status
          )
        `)
        .eq('user_id', userId);
      setContracts(contractsData || []);
      const counts: Record<string, number> = {};
      (contractsData || []).forEach((req: any) => {
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
  };

  const requestToJoinGroup = async (groupId: string, requested: number) => {
    if (!user) return;
    try {
      setSubmitting(true);
      const { data: existing } = await supabase
        .from('join_requests')
        .select('id,status')
        .eq('user_id', user.id)
        .eq('group_id', groupId)
        .eq('status', 'pending')
        .maybeSingle();

      if (existing) {
        toast({
          title: "Already requested",
          description: "You already have a pending request for this group.",
        });
        setJoinDialogOpen(false);
        setSubmitting(false);
        return;
      }
      const { error } = await supabase
        .from('join_requests')
        .insert({
          user_id: user.id,
          group_id: groupId,
          contracts_requested: requested,
          status: 'pending',
        });
      if (error) throw error;
      toast({
        title: "Success!",
        description: "Your request has been submitted for admin approval.",
      });
      loadUserData(user.id);
      setJoinDialogOpen(false);
      setSelectedGroup(null);
      setContractsCount(1);
      setPendingCounts((prev) => ({
        ...prev,
        [groupId]: (prev[groupId] || 0) + requested,
      }));
    } catch (error: any) {
      const message = String(error?.message || '').toLowerCase();
      if (
        message.includes('duplicate key') ||
        message.includes('unique constraint') ||
        message.includes('join_requests_group_id_user_id_status_key')
      ) {
        toast({
          title: "Already requested",
          description: "You already have a pending request for this group.",
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

        {/* My Contracts */}
        <Card className="mb-8">
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
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Group: {contract.groups?.group_number || 'N/A'} | Amount: ${Number(contract.amount ?? 0).toLocaleString()}
                        </p>
                      )}
                    </div>
                    {getStatusBadge(contract.status)}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Available Groups */}
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
              <div className="grid md:grid-cols-2 gap-4">
                {groups.map((group) => (
                  <div
                    key={group.id}
                    className="p-6 border border-border rounded-lg hover:border-primary transition-colors"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">{group.group_number}</h3>
                      <Badge variant="outline">
                        <Users className="w-3 h-3 mr-1" />
                        {(group.total_members ?? 0) + (pendingCounts[group.id] ?? 0)}/{group.max_members ?? 0}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      {Math.max(0, (group.max_members ?? 0) - (group.total_members ?? 0) - (pendingCounts[group.id] ?? 0))} positions available
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
