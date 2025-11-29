import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  phone?: string;
  email: string;
}

interface UserJoinRow {
  id: string;
  user_id: string;
  group_id: string;
  status: string;
  contracts_requested?: number;
  updated_at?: string;
  groups?: {
    group_number: string;
    status: string;
    max_members?: number;
    total_members?: number;
  };
}

interface UserRoleStatusRow {
  group_id: string;
  status: string;
}

interface AdminRoleRow {
  user_id: string;
}

const MONTHLY_PAYOUT_PER_CONTRACT = 1800;
const PRICE_PER_CONTRACT = 10000;

const UserRowCard = ({ profile }: { profile: Profile }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [rows, setRows] = useState<UserJoinRow[]>([]);
  const [activeContracts, setActiveContracts] = useState(0);
  const [totalPayouts, setTotalPayouts] = useState(0);
  const [groupActiveMap, setGroupActiveMap] = useState<Record<string, boolean>>({});




  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('join_requests')
        .select(`*, groups ( group_number, status, max_members, total_members )`)
        .eq('user_id', profile.id)
        .in('status', ['approved','funds_deposited']);
      const list: UserJoinRow[] = (data || []) as UserJoinRow[];
      setRows(list);

      const gids = Array.from(new Set(list.map(r => r.group_id).filter(Boolean)));
      const hasApproved: Record<string, boolean> = {};
      if (gids.length) {
        const { data: statusRows } = await supabase
          .from('join_requests')
          .select('group_id, status')
          .in('group_id', gids);
        (statusRows || []).forEach((r: UserRoleStatusRow) => {
          if (r.status === 'approved') hasApproved[r.group_id] = true;
        });
      }const complete: Record<string, boolean> = {};
      list.forEach((r) => {
        const g: UserJoinRow['groups'] = r.groups || { group_number: '', status: '', max_members: 0, total_members: 0 };
        const total = Number(g.total_members ?? 0);
        const max = Number(g.max_members ?? 25);
        complete[r.group_id] = total >= max && !hasApproved[r.group_id];
      });
      setGroupActiveMap(complete);

      const activeRows = list.filter(r => r.status === 'funds_deposited' && complete[r.group_id]);
      const qtyActive = activeRows.reduce((sum, r) => sum + Number(r.contracts_requested ?? 1), 0);
      setActiveContracts(qtyActive);

      const byGroup: Record<string, { qty: number; startMs: number } > = {};
      activeRows.forEach(r => {
        const g = r.group_id;
        const q = Number(r.contracts_requested ?? 1);
        const t = r.updated_at ? new Date(r.updated_at).getTime() : 0;
        byGroup[g] = {
          qty: (byGroup[g]?.qty || 0) + q,
          startMs: Math.max(byGroup[g]?.startMs || 0, t),
        };
      });
      let total = 0;
      const now = new Date();
      Object.values(byGroup).forEach(({ qty, startMs }) => {
        const start = startMs ? new Date(startMs) : now;
        const rawMonths = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
        const adjust = now.getDate() < start.getDate() ? 1 : 0;
        const cycles = Math.max(0, Math.min(60, rawMonths - adjust));
        total += (MONTHLY_PAYOUT_PER_CONTRACT * qty) * cycles;
      });
      setTotalPayouts(total);
    };
    load();
  }, [profile.id, setRows, setGroupActiveMap, setActiveContracts, setTotalPayouts]);

  return (
    <div className="border border-border rounded-lg">
      <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50" onClick={() => setIsOpen(!isOpen)}>
        <div>
          <p className="font-semibold">{profile.first_name} {profile.last_name}</p>
          {(() => {
            const totalDepositedQty = rows.filter(r => r.status === 'funds_deposited').reduce((sum, r) => sum + Number(r.contracts_requested ?? 1), 0);
            return (
              <p className="text-sm text-muted-foreground">Contracts: {totalDepositedQty} | Total Payouts: ${totalPayouts.toLocaleString()}</p>
            );
          })()}
        </div>

      </div>
      {isOpen && (
        <div className="px-4 pb-4">
          <div className="grid md:grid-cols-3 gap-4 mb-4">
            <div className="p-3 border rounded">
              <p className="text-sm text-muted-foreground">First Name</p>
              <p className="font-semibold">{profile.first_name || '—'}</p>
            </div>
            <div className="p-3 border rounded">
              <p className="text-sm text-muted-foreground">Last Name</p>
              <p className="font-semibold">{profile.last_name || '—'}</p>
            </div>
            <div className="p-3 border rounded">
              <p className="text-sm text-muted-foreground">Phone</p>
              <p className="font-semibold">{profile.phone || '—'}</p>
            </div>
            <div className="p-3 border rounded">
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-semibold">{profile.email || '—'}</p>
            </div>
          </div>
          <div className="space-y-2">
            <p className="font-semibold">Contracts</p>
            {rows.length === 0 ? (
              <div className="text-sm text-muted-foreground">No contracts yet</div>
            ) : (
              rows.map((r) => (
                <div key={r.id} className="p-3 border rounded">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{r.groups?.group_number || r.group_id}</p>
                      <p className="text-sm text-muted-foreground">
                        Status: {r.status.replace(/_/g,' ')} | Qty: {Number(r.contracts_requested ?? 1)}
                        {r.status === 'approved' ? (
                          <> | Paid: $0 | Payment Due: ${((Number(r.contracts_requested ?? 1)) * PRICE_PER_CONTRACT).toLocaleString()}</>
                        ) : (
                          <> | Paid: ${((Number(r.contracts_requested ?? 1)) * PRICE_PER_CONTRACT).toLocaleString()}</>
                        )}
                      </p>
                    </div>
                    <Badge variant={groupActiveMap[r.group_id] ? 'default' : 'outline'}>
                      {groupActiveMap[r.group_id] ? 'ACTIVE' : 'INACTIVE'}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const Users = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const loadUsers = useCallback(async () => {
    try {
      const { data: adminRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');
      const adminIds = new Set((adminRoles || []).map((r: AdminRoleRow) => r.user_id));

      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      const filtered = (profilesData || []).filter((p: Profile) => !adminIds.has(p.id));
      setProfiles(filtered);
    } catch (error) {
      console.error("Error in loadUsers:", error);
      // Optionally, display a a toast message to the user
      // toast({ title: "Error", description: "Failed to load users data.", variant: "destructive" });
    }
  }, [setProfiles]);

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { navigate('/auth'); return; }
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .eq('role', 'admin')
          .maybeSingle();
        if (!roleData) { navigate('/dashboard'); return; }
        await loadUsers();
        setLoading(false);
      } catch (error) {
        console.error("Error in Users useEffect init:", error);
        setLoading(false); // Ensure loading state is cleared even on error
        // Optionally, display a toast message to the user
        // toast({ title: "Error", description: "Failed to load user data.", variant: "destructive" });
      }
    };
    init();
  }, [navigate, loadUsers]);



  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12">
          <div className="text-center">Loading...</div>
        </div>
      </Layout>
    );
  }

  const filteredProfiles = profiles.filter(profile =>
    profile.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    profile.last_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
            <CardDescription>Admin-only: view profiles and contract summaries</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <Input
                placeholder="Search users by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {profiles.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No users found</div>
            ) : (
              <div className="space-y-3">
                {filteredProfiles.map((p) => (
                  <UserRowCard key={p.id} profile={p} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Users;
