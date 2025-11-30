import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
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
  const [searchTerm, setSearchTerm] = useState('');
  const [profilesMap, setProfilesMap] = useState<Record<string, any>>({});
  const [groupsMap, setGroupsMap] = useState<Record<string, any>>({});
  const PRICE_PER_CONTRACT = 10000;
  const MONTHLY_PAYOUT_PER_CONTRACT = 1800;
  const formatDMY = (d: Date) => `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getFullYear()).slice(-2)}`;

  const getGroupDisplayStatus = (group: any, activeGroupIds: string[]) => {
    if (activeGroupIds.includes(group.id)) {
      return "Active-Open";
    }
    if (group.status === 'locked') {
      return "Inactive-Locked";
    }
    return "Inactive-Open";
  };

  // State for toggling group dropdowns and storing members
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [groupMembersMap, setGroupMembersMap] = useState<Record<string, any[]>>({});
  const [loadingMembersMap, setLoadingMembersMap] = useState<Record<string, boolean>>({});
  const [contractsLockedMap, setContractsLockedMap] = useState<Record<string, number>>({});
  const [pendingAmountMap, setPendingAmountMap] = useState<Record<string, number>>({});
  const [activeGroupIds, setActiveGroupIds] = useState<string[]>([]);
  const [totalContractsMap, setTotalContractsMap] = useState<Record<string, number>>({});
  const [paidTotalsMap, setPaidTotalsMap] = useState<Record<string, number>>({});
  const approvedListTotalForGroup = (gid: string, totals: Record<string, number>) => (totals[gid] ?? 0);

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

    // Load pending join requests (avoid relationship filters that may be restricted by RLS)
    const { data: pendingData } = await supabase
      .from('join_requests')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    setPendingContracts(pendingData || []);

    // Hydrate related data for display (collect IDs from pending and approved/all)
    const { data: minimalAll } = await supabase
      .from('join_requests')
      .select('user_id, group_id')
      .order('created_at', { ascending: false });
    const userIds = Array.from(new Set([...(pendingData || []).map((r: any) => r.user_id), ...((minimalAll || []).map((r: any) => r.user_id))].filter(Boolean)));
    const groupIds = Array.from(new Set([...(pendingData || []).map((r: any) => r.group_id), ...((minimalAll || []).map((r: any) => r.group_id))].filter(Boolean)));

    let localProfilesMap: Record<string, any> = {};
    if (userIds.length) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, phone')
        .in('id', userIds);
      (profiles || []).forEach((p: any) => { localProfilesMap[p.id] = p; });
    }
    setProfilesMap(localProfilesMap);

    let localGroupsMap: Record<string, any> = {};
    if (groupIds.length) {
      const { data: groupsL } = await supabase
        .from('groups')
        .select('id, group_number')
        .in('id', groupIds);
      (groupsL || []).forEach((g: any) => { localGroupsMap[g.id] = g; });
    }
    setGroupsMap(localGroupsMap);

    // Load all join requests (no joins; hydrate from maps)
    const { data: allRequestsData } = await supabase
      .from('join_requests')
      .select('*')
      .order('created_at', { ascending: false });
    setAllContracts(allRequestsData || []);
    const approvedList = (allRequestsData || []).filter((r: any) => r.status === 'approved');
    const paidList = (allRequestsData || []).filter((r: any) => r.status === 'funds_deposited');
    const gMembers: Record<string, any[]> = {};
    const lockedTotals: Record<string, number> = {};
    const pendingTotals: Record<string, number> = {};
    approvedList.forEach((r: any) => {
      const gid = r.group_id;
      if (!gMembers[gid]) gMembers[gid] = [];
      gMembers[gid].push({ profiles: localProfilesMap[r.user_id], contracts_requested: r.contracts_requested });
      lockedTotals[gid] = (lockedTotals[gid] || 0) + Number(r.contracts_requested ?? 1);
      pendingTotals[gid] = (pendingTotals[gid] || 0) + Number(r.contracts_requested ?? 1) * PRICE_PER_CONTRACT;
    });
    // Include paid members in group list
    paidList.forEach((r: any) => {
      const gid = r.group_id;
      if (!gMembers[gid]) gMembers[gid] = [];
      gMembers[gid].push({ profiles: localProfilesMap[r.user_id], contracts_requested: r.contracts_requested, paid: true });
    });
    setGroupMembersMap(gMembers);
    setLoadingMembersMap({});
    setContractsLockedMap(lockedTotals);
    setPendingAmountMap(pendingTotals);

    // Determine active groups: all contracts paid and total paid contracts >= 25
    const approvedByGroup: Record<string, number> = {};
    approvedList.forEach((r: any) => {
      approvedByGroup[r.group_id] = (approvedByGroup[r.group_id] || 0) + Number(r.contracts_requested ?? 1);
    });
    const paidTotals: Record<string, number> = {};
    paidList.forEach((r: any) => {
      paidTotals[r.group_id] = (paidTotals[r.group_id] || 0) + Number(r.contracts_requested ?? 1);
    });
    const totals: Record<string, number> = {};
    const allGroupIds = Array.from(new Set([
      ...approvedList.map((r:any)=>r.group_id),
      ...paidList.map((r:any)=>r.group_id)
    ]));
    allGroupIds.forEach((gid) => {
      totals[gid] = (approvedByGroup[gid] || 0) + (paidTotals[gid] || 0);
    });
    const actives = Object.keys(paidTotals).filter((gid) => (paidTotals[gid] ?? 0) >= 25 && (approvedByGroup[gid] ?? 0) === 0);
    setActiveGroupIds(actives);
    setPaidTotalsMap(paidTotals);
    setTotalContractsMap(totals);
  };

  const approveContract = async (requestId: string, groupId: string) => {
    // Load the pending request to get user and quantity
    const { data: pending, error: loadErr } = await supabase
      .from('join_requests')
      .select('id,user_id,group_id,contracts_requested')
      .eq('id', requestId)
      .maybeSingle();
    if (loadErr || !pending) {
      toast({ title: 'Error', description: loadErr?.message || 'Pending request not found', variant: 'destructive' });
      return;
    }

    // Merge into a single approved row using upsert, then mark pending row processed
    const { data: existingApproved } = await supabase
      .from('join_requests')
      .select('contracts_requested')
      .eq('user_id', pending.user_id)
      .eq('group_id', pending.group_id)
      .eq('status', 'approved')
      .maybeSingle();
    const currentQty = Number(existingApproved?.contracts_requested ?? 0);
    const addQty = Number(pending.contracts_requested ?? 1);

    const { error: upsertErr } = await supabase
      .from('join_requests')
      .upsert(
        {
          user_id: pending.user_id,
          group_id: pending.group_id,
          status: 'approved',
          contracts_requested: currentQty + addQty,
        },
        { onConflict: 'group_id,user_id,status' }
      );
    if (upsertErr) {
      toast({ title: 'Error', description: upsertErr.message, variant: 'destructive' });
      return;
    }

    // Mark the pending row processed to remove it from the pending tab
    const { error: delErr } = await supabase
      .from('join_requests')
      .delete()
      .eq('id', requestId);
    if (delErr) {
      await supabase.from('join_requests').update({ status: 'rejected' }).eq('id', requestId);
    }
    toast({ title: 'Approved', description: 'Request approved successfully.' });
    await finalizeGroupIfFull(pending.group_id);
    setPendingContracts((prev) => prev.filter((r: any) => r.id !== requestId));
    await fetchApprovedMembers(groupId);
    await loadAdminData();
  };

  const finalizeGroupIfFull = async (groupId: string) => {
    const { data: rows } = await supabase
      .from('join_requests')
      .select('contracts_requested, status')
      .eq('group_id', groupId)
      .in('status', ['approved','funds_deposited']);
    const approvedTotal = (rows || []).filter((r:any)=>r.status==='approved').reduce((sum: number, r: any) => sum + Number(r.contracts_requested ?? 1), 0);
    const paidTotal = (rows || []).filter((r:any)=>r.status==='funds_deposited').reduce((sum: number, r: any) => sum + Number(r.contracts_requested ?? 1), 0);
    const total = approvedTotal + paidTotal;

    await supabase
      .from('groups')
      .update({ total_members: total, status: total >= 25 ? 'locked' : 'open' })
      .eq('id', groupId);


  };

  const getNextGroupNumber = (groupsList: Array<{ group_number: string }>): string => {
    const nums = groupsList
      .map(g => {
        const m = String(g.group_number || '').match(/(\d+)$/);
        return m ? parseInt(m[1], 10) : 0;
      })
      .filter(n => !isNaN(n));
    const max = nums.length ? Math.max(...nums) : 0;
    const next = max + 1;
    return `IPR${String(next).padStart(5, '0')}`;
  };

  const resetData = async () => {
    const ok = window.confirm('This will remove all join requests and reset all groups. Continue?');
    if (!ok) return;
    try {
      // Delete all join requests
      const { error: delErr } = await supabase
        .from('join_requests')
        .delete()
        .not('id', 'is', null);
      if (delErr) throw delErr;

      // Reset all groups to open with zero total_members
      const { error: grpErr } = await supabase
        .from('groups')
        .update({ total_members: 0, status: 'open' })
        .not('id', 'is', null);
      if (grpErr) throw grpErr;

      // Clear UI state
      setPendingContracts([]);
      setAllContracts([]);
      setGroupMembersMap({});
      setContractsLockedMap({});
      await loadAdminData();

      toast({ title: 'Reset complete', description: 'All requests cleared and groups reset.' });
    } catch (e: any) {
      toast({ title: 'Reset failed', description: e.message, variant: 'destructive' });
    }
  };

  const rejectContract = async (requestId: string) => {
    const { data: pending, error: loadErr } = await supabase
      .from('join_requests')
      .select('id,user_id,group_id')
      .eq('id', requestId)
      .maybeSingle();
    if (loadErr || !pending) {
      toast({ title: 'Error', description: loadErr?.message || 'Pending request not found', variant: 'destructive' });
      return;
    }

    const { data: existingRejected } = await supabase
      .from('join_requests')
      .select('id')
      .eq('user_id', pending.user_id)
      .eq('group_id', pending.group_id)
      .eq('status', 'rejected')
      .maybeSingle();

    if (existingRejected?.id) {
      const { error: delErr } = await supabase
        .from('join_requests')
        .delete()
        .eq('id', requestId);
      if (delErr) {
        toast({ title: 'Error', description: delErr.message, variant: 'destructive' });
        return;
      }
    } else {
      const { error } = await supabase
        .from('join_requests')
        .update({ status: 'rejected' })
        .eq('id', requestId);
      if (error) {
        const msg = String(error.message || '').toLowerCase();
        if (msg.includes('duplicate key') || msg.includes('unique constraint')) {
          await supabase.from('join_requests').delete().eq('id', requestId);
        } else {
          toast({ title: 'Error', description: error.message, variant: 'destructive' });
          return;
        }
      }
    }
    setPendingContracts((prev) => prev.filter((r: any) => r.id !== requestId));
    toast({ title: 'Rejected', description: 'Request rejected.' });
    await loadAdminData();
  };

  const fetchApprovedMembers = async (groupId: string) => {
    setLoadingMembersMap((prev) => ({ ...prev, [groupId]: true }));
    const { data: approved } = await supabase
      .from('join_requests')
      .select('user_id, status, contracts_requested, updated_at')
      .eq('group_id', groupId)
      .in('status', ['approved','funds_deposited']);
    if (!approved || approved.length === 0) {
      const fallback = (allContracts || []).filter((r: any) => r.group_id === groupId && (r.status === 'approved' || r.status === 'funds_deposited'));
      const mergedFallback = fallback.map((r: any) => ({
        profiles: profilesMap[r.user_id],
        contracts_requested: r.contracts_requested,
        paid: r.status === 'funds_deposited',
        paid_at: r.updated_at,
      }));
      setGroupMembersMap((prev) => ({ ...prev, [groupId]: mergedFallback }));
      setLoadingMembersMap((prev) => ({ ...prev, [groupId]: false }));
      return;
    }
    const userIds = Array.from(new Set(approved.map((r: any) => r.user_id).filter(Boolean)));
    let profiles: any[] = [];
    if (userIds.length) {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, phone')
        .in('id', userIds);
      profiles = profilesData || [];
    }
    const pMap: Record<string, any> = {};
    profiles.forEach((p: any) => { pMap[p.id] = p; });
    const merged = approved.map((r: any) => ({
      profiles: pMap[r.user_id] || profilesMap[r.user_id],
      contracts_requested: r.contracts_requested,
      paid: r.status === 'funds_deposited',
      paid_at: r.updated_at,
    }));
    setGroupMembersMap((prev) => ({ ...prev, [groupId]: merged }));
    setLoadingMembersMap((prev) => ({ ...prev, [groupId]: false }));
  };

  const markMemberPaid = async (groupId: string, userId: string) => {
    const { data: approvedRow } = await supabase
      .from('join_requests')
      .select('id, contracts_requested')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .eq('status', 'approved')
      .maybeSingle();

    const approvedQty = Number(approvedRow?.contracts_requested ?? 0);
    if (!approvedRow || approvedQty <= 0) {
      toast({ title: 'No Approved Contracts', description: 'Nothing to mark as paid for this member.', variant: 'destructive' });
      return;
    }

    const { data: paidExisting } = await supabase
      .from('join_requests')
      .select('contracts_requested')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .eq('status', 'funds_deposited')
      .maybeSingle();
    const paidQty = Number(paidExisting?.contracts_requested ?? 0);

    const { error: upsertErr } = await supabase
      .from('join_requests')
      .upsert(
        {
          user_id: userId,
          group_id: groupId,
          status: 'funds_deposited',
          contracts_requested: paidQty + approvedQty,
        },
        { onConflict: 'group_id,user_id,status' }
      );
    if (upsertErr) {
      toast({ title: 'Error', description: upsertErr.message, variant: 'destructive' });
      return;
    }

    const { error: delErr } = await supabase
      .from('join_requests')
      .delete()
      .eq('id', approvedRow.id);
    if (delErr) {
      toast({ title: 'Error', description: delErr.message, variant: 'destructive' });
      return;
    }

    await fetchApprovedMembers(groupId);
    await finalizeGroupIfFull(groupId);
    await checkAndActivateGroup(groupId);
    await loadAdminData();
    toast({ title: 'Marked Paid', description: `Marked ${approvedQty} contract(s) as paid for member.` });
  };

  const checkAndActivateGroup = async (groupId: string) => {
    const { data: approvedRows } = await supabase
      .from('join_requests')
      .select('status, contracts_requested')
      .eq('group_id', groupId);
    const hasPendingApproved = (approvedRows || []).some((r: any) => r.status === 'approved');
    const totalPaid = (approvedRows || []).filter((r: any) => r.status === 'funds_deposited').reduce((sum: number, r: any) => sum + Number(r.contracts_requested ?? 1), 0);
    if (!hasPendingApproved && totalPaid >= 25) {
      await supabase
        .from('groups')
        .update({ status: 'active' })
        .eq('id', groupId);

      const { data: groupsList } = await supabase
        .from('groups')
        .select('group_number')
        .order('created_at', { ascending: false });
      const nextNumber = getNextGroupNumber(groupsList || []);
      await supabase
        .from('groups')
        .insert({ group_number: nextNumber, status: 'open', max_members: 25, total_members: 0 });
      toast({ title: 'Group Activated', description: `Group filled to 25 contracts and activated. New group ${nextNumber} opened.` });
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    const channel = supabase
      .channel('admin-join-requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'join_requests' }, () => {
        loadAdminData();
        Object.entries(expandedGroups).forEach(([gid, expanded]) => {
          if (expanded) {
            fetchApprovedMembers(gid);
          }
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin]);

  // Function to toggle group dropdown
  const toggleGroupDropdown = async (groupId: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
    const nowExpanded = !(expandedGroups[groupId] || false);
    if (nowExpanded) {
      await fetchApprovedMembers(groupId);
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
            <TabsTrigger value="groups">Inactive Groups ({groups.filter(g => !activeGroupIds.includes(g.id)).length})</TabsTrigger>
            <TabsTrigger value="contracts">Active Groups ({activeGroupIds.length})</TabsTrigger>
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
                              {profilesMap[request.user_id]?.first_name || 'Unknown'} {profilesMap[request.user_id]?.last_name || ''}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Group: {groupsMap[request.group_id]?.group_number || request.group_id} | Contracts: {request.contracts_requested ?? 1} | Total: ${(Number(request.contracts_requested ?? 1) * PRICE_PER_CONTRACT).toLocaleString()}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Phone: {profilesMap[request.user_id]?.phone || 'N/A'}
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

          {/* Inactive groups (non-active only) */}
          <TabsContent value="groups">
            <Card>
              <CardHeader>
                <CardTitle>Inactive Groups</CardTitle>
                <CardDescription>View and manage non-active groups</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {groups.filter((group) => !activeGroupIds.includes(group.id)).map((group) => {
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
                            {(() => {
                              const displayStatus = getGroupDisplayStatus(group, activeGroupIds);
                              const badgeVariant = displayStatus === 'Active-Open' ? 'default' : displayStatus === 'Inactive-Locked' ? 'secondary' : 'outline';
                              return <Badge variant={badgeVariant}>{displayStatus}</Badge>;
                            })()}
                          </div>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Contracts:</span>
                              <span className="font-semibold">
                                {(totalContractsMap[group.id] ?? 0)}/{group.max_members}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Members:</span>
                              <span className="font-semibold">
                                {(() => {
                                  const ids = new Set((members || []).map((m:any) => m.profiles?.id).filter(Boolean));
                                  return ids.size;
                                })()}
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
                                    members.map((member: any, idx: number) => (
                                      <div key={member.profiles?.id || `${group.id}-${idx}`} className="p-3 border border-border rounded-lg">
                                        <div className="flex items-center justify-between">
                                          <div>
                                            <p className="font-semibold">
                                              {member.profiles?.first_name || 'Unknown'} {member.profiles?.last_name || ''}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                              Contracts: {Number(member.contracts_requested ?? 1)}
                                            </p>
                                          </div>
                                          <Badge variant={member.paid ? 'default' : 'outline'}>
                                            {member.paid ? 'Paid' : 'Pending'}
                                          </Badge>
                                        </div>
                                        {!member.paid && member.profiles?.id && (
                                          <div className="mt-3 flex justify-end">
                                            <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); markMemberPaid(group.id, member.profiles.id); }}>
                                              Mark Paid
                                            </Button>
                                          </div>
                                        )}
                                      </div>
                                    ))
                                  ) : (
                                    <div className="text-sm">No approved members</div>
                                  )}
                                  {members.length > 0 && (
                                    <div className="mt-2 text-sm">
                                      <p>
                                        Contracts Locked: {(totalContractsMap[group.id] ?? 0)}
                                      </p>
                                      <p>
                                        Pending Payment: ${(pendingAmountMap[group.id] ?? 0).toLocaleString()}
                                      </p>
                                      <p>
                                        Amount Paid: ${((paidTotalsMap[group.id] ?? 0) * PRICE_PER_CONTRACT).toLocaleString()}
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

          {/* Active Groups: all contracts paid, showing member payout info */}
          <TabsContent value="contracts">
            <Card>
              <CardHeader>
                <CardTitle>Active Groups</CardTitle>
                <CardDescription>View and manage active investment groups</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <Input
                    placeholder="Search by group number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="space-y-4">
                    {activeGroupIds
                      .filter(gid => groupsMap[gid]?.group_number.toLowerCase().includes(searchTerm.toLowerCase()))
                      .map((gid) => {
                    const group = groups.find((g) => g.id === gid);
                    const members = (groupMembersMap[gid] || []).filter((m: any) => m.paid);
                    const activationMs = members.reduce((max: number, m: any) => {
                      const d = m.paid_at ? new Date(m.paid_at).getTime() : 0;
                      return d > max ? d : max;
                    }, 0);
                    const activationDate = activationMs ? new Date(activationMs) : new Date();
                    return (
                      <div key={gid} className="border rounded-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold">{group?.group_number || gid}</h3>
                          <Badge variant={'default'}>ACTIVE</Badge>
                        </div>
                        <div className="space-y-2">
                          {members.length === 0 ? (
                            <div className="text-sm text-muted-foreground">No paid members yet</div>
                          ) : (
                            members.map((member: any, idx: number) => {
                              const qty = Number(member.contracts_requested ?? 1);
                              const monthly = MONTHLY_PAYOUT_PER_CONTRACT * qty;
                              const start = activationDate;
                              const now = new Date();
                              const rawMonths = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
                              const adjust = now.getDate() < start.getDate() ? 1 : 0;
                              const cycles = Math.max(0, Math.min(60, rawMonths - adjust));
                              const total = monthly * cycles;
                              const nextPayout = new Date(start.getFullYear(), start.getMonth() + 1, 28);
                              return (
                                <div key={member.profiles?.id || `${gid}-${idx}`} className="p-3 border rounded">
                                  <div className="flex items-center justify-between">
                                    <span className="font-semibold">
                                      {member.profiles?.first_name || 'Unknown'} {member.profiles?.last_name || ''}
                                    </span>
                                    <Badge variant={'default'}>PAID</Badge>
                                  </div>
                                  <div className="text-sm text-muted-foreground mt-1">
                                    Contracts: {qty} | Monthly Payout: ${monthly.toLocaleString()} | Cycles: {cycles}/60 | Total Collected: ${total.toLocaleString()} | Next Payout: {formatDMY(nextPayout)}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    );
                  })}
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
