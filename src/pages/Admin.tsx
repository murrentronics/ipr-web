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

  // State for toggling group dropdowns and storing members
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [groupMembersMap, setGroupMembersMap] = useState<Record<string, any[]>>({});
  const [loadingMembersMap, setLoadingMembersMap] = useState<Record<string, boolean>>({});

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

    // Load pending join requests
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

  // Function to toggle group dropdown
  const toggleGroupDropdown = async (groupId: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));

    // If expanding, fetch members
    if (!groupMembersMap[groupId]) {
      setLoadingMembersMap((prev) => ({ ...prev, [groupId]: true }));
      const { data } = await supabase
        .from('join_requests')
        .select('profiles!inner, amount_paid, contract_locked') // replace with your actual fields
        .eq('group_id', groupId)
        .eq('status', 'approved');

      setGroupMembersMap((prev) => ({ ...prev, [groupId]: data || [] }));
      setLoadingMembersMap((prev) => ({ ...prev, [groupId]: false }));
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        {/* Header without create group button */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage groups, join requests, and members</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="pending">
              Pending Approvals ({pendingContracts.length})
            </TabsTrigger>
            <TabsTrigger value="groups">Groups ({groups.length})</TabsTrigger>
            <TabsTrigger value="contracts">All Requests ({allContracts.length})</TabsTrigger>
          </TabsList>

          {/* Pending requests */}
          <TabsContent value="pending">
            <Card>
              <CardHeader>
                <CardTitle>Pending Join Requests</CardTitle>
                <CardDescription>Review and approve member requests</CardDescription>
              </CardHeader>
              <CardContent>
                {pendingContracts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No pending requests</div>
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
                            {/* Approve and reject buttons, you can implement handlers */}
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

          {/* Groups with clickable dropdowns for members and info */}
          <TabsContent value="groups">
            <Card>
              <CardHeader>
                <CardTitle>Investment Groups</CardTitle>
                <CardDescription>View and manage all investment groups</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groups.map((group) => {
                    const isExpanded = expandedGroups[group.id] || false;
                    const members = groupMembersMap[group.id] || [];
                    const isLoadingMembers = loadingMembersMap[group.id] || false;

                    return (
                      <div
                        key={group.id}
                        className="border rounded-lg cursor-pointer hover:bg-gray-50"
                        onClick={() => toggleGroupDropdown(group.id)}
                      >
                        <div className="p-6">
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
                          {/* Show dropdown info if expanded */}
                          {isExpanded && (
                            <div className="mt-4 border-t pt-4 space-y-2">
                              {isLoadingMembers ? (
                                <div>Loading members...</div>
                              ) : (
                                <>
                                  <h4 className="font-semibold mb-2">Approved Members:</h4>
                                  {members.length > 0 ? (
                                    members.map((member: any) => (
                                      <div key={member.profiles.id} className="text-sm pl-2">
                                        {member.profiles.first_name} {member.profiles.last_name}
                                      </div>
                                    ))
                                  ) : (
                                    <div className="text-sm">No approved members</div>
                                  )}
                                  {/* Additional info for each member, e.g., amount paid or contract locked */}
                                  {members.length > 0 && (
                                    <div className="mt-2 text-sm">
                                      <p>
                                        Contracts Locked: {group.contract_locked || 'N/A'}
                                      </p>
                                      <p>
                                        Amount Paid Status: {members.every(m => m.amount_paid) ? 'Paid' : 'Pending'}
                                      </p>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
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
