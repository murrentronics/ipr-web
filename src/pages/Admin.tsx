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

    // Load pending join requests (not contracts)
    const { data: pendingData } = await supabase
      .from('join_requests')
      .select(`
        *,
        profiles (first_name, last_name, email),
        groups (group_number)
      `)
      .eq('status', 'pending');

    setPendingContracts(pendingData || []);

    // Load all join requests
    const { data: allRequestsData } = await supabase
      .from('join_requests')
      .select(`
        *,
        profiles (first_name, last_name, email),
        groups (group_number)
      `)
      .order('created_at', { ascending: false });
    setAllContracts(allRequestsData || []);
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
      // Update join request status to 'approved'
      const { error: requestError } = await supabase
        .from('join_requests')
        .update({ status: 'approved', approved_at: new Date().toISOString() })
        .eq('id', contractId);

      if (requestError) throw requestError;

      // Increment group members
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
        description: "Join request approved!",
      });
      await loadAdminData();
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
        .from('join_requests')
        .delete()
        .eq('id', contractId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Join request rejected and removed.",
      });
      await loadAdminData();
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
        {/* Header with create group button */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage groups, join requests, and members</p>
          </div>
          <Button onClick={createNewGroup}>
            <Plus className="w-4 h-4 mr-2" />
            Create New Group
          </Button>
        </div>

        {/* Tabs for different views */}
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="pending">
              Pending Approvals ({pendingContracts.length})
            </TabsTrigger>
            <TabsTrigger value="groups">Groups ({groups.length})</TabsTrigger>
            <TabsTrigger value="contracts">All Requests ({allContracts.length})</TabsTrigger>
          </TabsList>

          {/* Pending join requests */}
          <TabsContent value="pending">
            <Card>
              <CardHeader>
                <CardTitle>Pending Join Requests</CardTitle>
                <CardDescription>Review and approve member requests</CardDescription>
              </CardHeader>
              <CardContent>
                {pendingContracts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No pending requests
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingContracts.map((request) => (
                      <div key={request.id} className="p-4 border border-border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold">
                              {request.profiles?.first_name} {request.profiles?.last_name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {request.profiles?.email} | Group: {request.groups?.group_number} | 
                              Requested to join
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => approveContract(request.id, request.group_id)}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => rejectContract(request.id)}
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

          {/* Groups */}
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

          {/* All join requests */}
          <TabsContent value="contracts">
            <Card>
              <CardHeader>
                <CardTitle>All Join Requests</CardTitle>
                <CardDescription>View all join requests</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {allContracts.map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center justify-between p-4 border border-border rounded-lg"
                    >
                      <div>
                        <p className="font-semibold">
                          {request.profiles?.first_name} {request.profiles?.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {request.groups?.group_number} | Status: {request.status}
                        </p>
                      </div>
                      <Badge variant={request.status === 'approved' ? 'default' : 'secondary'}>
                        {request.status.toUpperCase()}
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
