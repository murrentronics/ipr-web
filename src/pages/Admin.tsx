import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, CheckCircle, XCircle, Plus } from "lucide-react";

const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<any[]>([]);
  const [pendingContracts, setPendingContracts] = useState<any[]>([]);
  const [allContracts, setAllContracts] = useState<any[]>([]);

  useEffect(() => {
    checkAdminAndLoadData();
  }, []);

  const checkAdminAndLoadData = async () => {
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

    if (!roleData) {
      toast({
        title: "Access Denied",
        description: "You don't have admin permissions",
        variant: "destructive",
      });
      navigate('/dashboard');
      return;
    }

    setIsAdmin(true);
    await loadAdminData();
    setLoading(false);
  };

  const loadAdminData = async () => {
    // Load all groups
    const { data: groupsData } = await supabase
      .from('groups')
      .select('*')
      .order('created_at', { ascending: false });
    
    setGroups(groupsData || []);

    // Load pending contracts
    const { data: pendingData } = await supabase
      .from('contracts')
      .select(`
        *,
        profiles (first_name, last_name, email),
        groups (group_number)
      `)
      .eq('status', 'pending_approval');
    
    setPendingContracts(pendingData || []);

    // Load all contracts
    const { data: allContractsData } = await supabase
      .from('contracts')
      .select(`
        *,
        profiles (first_name, last_name, email),
        groups (group_number)
      `)
      .order('created_at', { ascending: false });
    
    setAllContracts(allContractsData || []);
  };

  const createNewGroup = async () => {
    try {
      // Generate group number
      const { data: lastGroup } = await supabase
        .from('groups')
        .select('group_number')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      let nextNumber = 1;
      if (lastGroup?.group_number) {
        const currentNum = parseInt(lastGroup.group_number.replace('IPR', ''));
        nextNumber = currentNum + 1;
      }

      const groupNumber = `IPR${String(nextNumber).padStart(5, '0')}`;

      // Create group with 0 members (admin does not invest)
      const { error: groupError } = await supabase
        .from('groups')
        .insert({
          group_number: groupNumber,
          status: 'open',
          total_members: 0,
        });

      if (groupError) throw groupError;

      toast({
        title: "Success",
        description: `Group ${groupNumber} created successfully!`,
      });

      loadAdminData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const approveContract = async (contractId: string, groupId: string) => {
    try {
      // Update contract status
      const { error: contractError } = await supabase
        .from('contracts')
        .update({ status: 'approved', approved_at: new Date().toISOString() })
        .eq('id', contractId);

      if (contractError) throw contractError;

      // Update group member count
      const { data: group } = await supabase
        .from('groups')
        .select('total_members, max_members')
        .eq('id', groupId)
        .single();

      if (group) {
        const newTotal = group.total_members + 1;
        const { error: groupError } = await supabase
          .from('groups')
          .update({ 
            total_members: newTotal,
            status: newTotal >= group.max_members ? 'locked' : 'open',
            locked_at: newTotal >= group.max_members ? new Date().toISOString() : null,
          })
          .eq('id', groupId);

        if (groupError) throw groupError;
      }

      toast({
        title: "Success",
        description: "Contract approved successfully!",
      });

      loadAdminData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const rejectContract = async (contractId: string) => {
    try {
      const { error } = await supabase
        .from('contracts')
        .delete()
        .eq('id', contractId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Contract rejected and removed.",
      });

      loadAdminData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage groups, contracts, and members</p>
          </div>
          <Button onClick={createNewGroup}>
            <Plus className="w-4 h-4 mr-2" />
            Create New Group
          </Button>
        </div>

        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="pending">
              Pending Approvals ({pendingContracts.length})
            </TabsTrigger>
            <TabsTrigger value="groups">Groups ({groups.length})</TabsTrigger>
            <TabsTrigger value="contracts">All Contracts ({allContracts.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <Card>
              <CardHeader>
                <CardTitle>Pending Contract Approvals</CardTitle>
                <CardDescription>Review and approve member requests</CardDescription>
              </CardHeader>
              <CardContent>
                {pendingContracts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No pending approvals
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingContracts.map((contract) => (
                      <div
                        key={contract.id}
                        className="p-4 border border-border rounded-lg"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold">
                              {contract.profiles?.first_name} {contract.profiles?.last_name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {contract.profiles?.email} | Group: {contract.groups?.group_number} | 
                              Amount: ${Number(contract.amount).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => approveContract(contract.id, contract.group_id)}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => rejectContract(contract.id)}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="groups">
            <Card>
              <CardHeader>
                <CardTitle>Investment Groups</CardTitle>
                <CardDescription>View and manage all investment groups</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groups.map((group) => (
                    <Card key={group.id} className="border-primary/20">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold">{group.group_number}</h3>
                          <Badge variant={group.status === 'open' ? 'default' : 'secondary'}>
                            {group.status.toUpperCase()}
                          </Badge>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Members:</span>
                            <span className="font-semibold">
                              {group.total_members}/{group.max_members}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Status:</span>
                            <span className="font-semibold capitalize">{group.status}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contracts">
            <Card>
              <CardHeader>
                <CardTitle>All Contracts</CardTitle>
                <CardDescription>View all investment contracts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {allContracts.map((contract) => (
                    <div
                      key={contract.id}
                      className="flex items-center justify-between p-4 border border-border rounded-lg"
                    >
                      <div>
                        <p className="font-semibold">
                          {contract.profiles?.first_name} {contract.profiles?.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {contract.contract_number} | Group: {contract.groups?.group_number} | 
                          ${Number(contract.amount).toLocaleString()}
                        </p>
                      </div>
                      <Badge variant={contract.status === 'active' ? 'default' : 'secondary'}>
                        {contract.status.replace(/_/g, ' ').toUpperCase()}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Admin;
