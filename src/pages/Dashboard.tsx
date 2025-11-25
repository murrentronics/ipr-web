import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/auth');
      } else {
        setUser(session.user);
        loadUserData(session.user.id);
      }
    });
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

      // Load user's contracts
      const { data: contractsData } = await supabase
        .from('contracts')
        .select(`
          *,
          groups (
            group_number,
            status
          )
        `)
        .eq('user_id', userId);
      
      setContracts(contractsData || []);
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

  const requestToJoinGroup = async (groupId: string) => {
    if (!user) return;

    try {
      const contractNumber = `CNT-${Date.now()}`;
      
      const { error } = await supabase
        .from('contracts')
        .insert({
          user_id: user.id,
          group_id: groupId,
          contract_number: contractNumber,
          status: 'pending_approval',
        });

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Your request has been submitted for admin approval.",
      });

      // Reload contracts
      loadUserData(user.id);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      'pending_approval': 'outline',
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
                    ${contracts.reduce((sum, c) => sum + Number(c.amount), 0).toLocaleString()}
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
                    {contracts.filter(c => c.status === 'pending_approval').length}
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
                      <p className="font-semibold">{contract.contract_number}</p>
                      <p className="text-sm text-muted-foreground">
                        Group: {contract.groups?.group_number || 'N/A'} | 
                        Amount: ${Number(contract.amount).toLocaleString()}
                      </p>
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
                        {group.total_members}/{group.max_members}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      {group.max_members - group.total_members} positions available
                    </p>
                    <Button 
                      className="w-full" 
                      size="sm"
                      onClick={() => requestToJoinGroup(group.id)}
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
    </Layout>
  );
};

export default Dashboard;
