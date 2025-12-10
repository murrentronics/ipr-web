import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Home, Info, HelpCircle, Phone, LogOut, LayoutDashboard, Shield, Users as UsersIcon, User, Wallet, Menu, Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [roleResolved, setRoleResolved] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdminStatus(session.user.id);
      } else {
        setIsAdmin(false);
        setRoleResolved(true);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdminStatus(session.user.id);
      } else {
        setIsAdmin(false);
        setRoleResolved(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }
    let isMounted = true;
    const loadUnread = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_read', false);
      if (!error && isMounted) setUnreadCount((data || []).length);
    };
    loadUnread();

    const channel = supabase
      .channel('user-messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `user_id=eq.${user?.id}` }, (payload) => {
        // refresh unread count when messages for this user change
        loadUnread();
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [user]);

  const checkAdminStatus = async (userId: string) => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();

    if (!error && data) {
      setIsAdmin(true);
    } else {
      setIsAdmin(false);
    }
    setRoleResolved(true);
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error",
        description: "Failed to log out. Please try again.",
        variant: "destructive",
      });
    } else {
      navigate('/');
      toast({
        title: "Success",
        description: "You have been logged out successfully.",
      });
    }
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-xl">IPR</span>
              </div>
              <span className="font-bold text-xl text-foreground hidden md:inline">Investment Property Rentals</span>
            </Link>


            <div className="hidden md:flex items-center gap-2">
              <Button
                variant={isActive('/') ? 'default' : 'ghost'}
                size="icon"
                onClick={() => navigate('/')}
              >
                <Home className="w-4 h-4" />
              </Button>
              {user && roleResolved && !isAdmin && (
                <Button
                    variant={isActive('/dashboard') ? 'default' : 'ghost'}
                    size="icon"
                    onClick={() => navigate('/dashboard')}
                  >
                    <LayoutDashboard className="w-4 h-4" />
                </Button>
              )}
              {(!isAdmin && roleResolved) && (
                <>
                  <Button
                    variant={isActive('/about') ? 'default' : 'ghost'}
                    size="icon"
                    onClick={() => navigate('/about')}
                  >
                    <Info className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={isActive('/how-it-works') ? 'default' : 'ghost'}
                    size="icon"
                    onClick={() => navigate('/how-it-works')}
                  >
                    <HelpCircle className="w-4 h-4" />
                  </Button>
                </>
              )}

              {user && roleResolved && (
                <>

                  {isAdmin && (
                    <>
                      <Button
                        variant={isActive('/admin') ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => navigate('/admin')}
                      >
                        <Shield className="w-4 h-4 mr-2" />
                        Admin
                      </Button>
                      <Button
                        variant={isActive('/users') ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => navigate('/users')}
                      >
                        <UsersIcon className="w-4 h-4 mr-2" />
                        Users
                      </Button>
                      <Button
                        variant={isActive('/admin/wallet') ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => navigate('/admin/wallet')}
                      >
                        <Wallet className="w-4 h-4 mr-2" />
                      </Button>
                      <Button
                        variant={isActive('/admin/profile') ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => navigate('/admin/profile')}
                      >
                        <User className="w-4 h-4 mr-2" />
                      </Button>
                    </>
                  )}
                  {!isAdmin && (
                    <>
                      <Button
                        variant={isActive('/wallet') ? 'default' : 'ghost'}
                        size="icon"
                        onClick={() => navigate('/wallet')}
                      >
                        <Wallet className="w-4 h-4" />
                      </Button>

                      <Button
                        variant={isActive('/contact') ? 'default' : 'ghost'}
                        size="icon"
                        onClick={() => navigate('/contact')}
                      >
                        <Phone className="w-4 h-4" />
                      </Button>
                      <Button
                        variant={isActive('/profile') ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => navigate('/profile')}
                      >
                        <User className="w-4 h-4 mr-2" />
                      </Button>
                    </>
                  )}
                  {/* Notification bell - desktop only (shared for admin and regular users) */}
                  {user && (
                    <Button
                      variant={isActive('/messages') ? 'default' : 'ghost'}
                      size="icon"
                      onClick={() => navigate('/messages')}
                      className="relative"
                    >
                      <Bell className="w-5 h-5" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                          {unreadCount}
                        </span>
                      )}
                    </Button>
                  )}

                  <Button variant="destructive" size="sm" onClick={handleLogout}>
                    <LogOut className="w-4 h-4 mr-2" />
                  </Button>
                </>
              )}

              {!user && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => navigate('/auth')}
                >
                  Login / Sign Up
                </Button>
              )}
            </div>

            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                >
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[250px] sm:w-[300px]">
                <nav className="flex flex-col gap-4 pt-8">
                  <Link to="/" className="flex items-center space-x-2" onClick={() => setIsMobileMenuOpen(false)}>
                    <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                      <span className="text-primary-foreground font-bold text-lg">IPR</span>
                    </div>
                    <span className="font-bold text-lg text-foreground">Investment Property Rentals</span>
                  </Link>
                  <Button
                    variant={isActive('/') ? 'default' : 'ghost'}
                    className="justify-start"
                    onClick={() => { navigate('/'); setIsMobileMenuOpen(false); }}
                  >
                    <Home className="w-4 h-4 mr-2" />
                    Home
                  </Button>
                  {user && roleResolved && !isAdmin && (
                    <Button
                      variant={isActive('/dashboard') ? 'default' : 'ghost'}
                      className="justify-start"
                      onClick={() => { navigate('/dashboard'); setIsMobileMenuOpen(false); }}
                    >
                      <LayoutDashboard className="w-4 h-4 mr-2" />
                      Dashboard
                    </Button>
                  )}
                  {(!isAdmin && roleResolved) && (
                    <>
                      <Button
                        variant={isActive('/about') ? 'default' : 'ghost'}
                        className="justify-start"
                        onClick={() => { navigate('/about'); setIsMobileMenuOpen(false); }}
                      >
                        <Info className="w-4 h-4 mr-2" />
                        About
                      </Button>
                      <Button
                        variant={isActive('/how-it-works') ? 'default' : 'ghost'}
                        className="justify-start"
                        onClick={() => { navigate('/how-it-works'); setIsMobileMenuOpen(false); }}
                      >
                        <HelpCircle className="w-4 h-4 mr-2" />
                        How It Works
                      </Button>
                      <Button
                        variant={isActive('/contact') ? 'default' : 'ghost'}
                        className="justify-start"
                        onClick={() => { navigate('/contact'); setIsMobileMenuOpen(false); }}
                      >
                        <Phone className="w-4 h-4 mr-2" />
                        Contact
                      </Button>
                    </>
                  )}
                  {user && roleResolved && (
                    <>
                      {isAdmin && (
                        <>
                          <Button
                            variant={isActive('/admin') ? 'default' : 'ghost'}
                            className="justify-start"
                            onClick={() => { navigate('/admin'); setIsMobileMenuOpen(false); }}
                          >
                            <Shield className="w-4 h-4 mr-2" />
                            Admin
                          </Button>
                          <Button
                            variant={isActive('/users') ? 'default' : 'ghost'}
                            className="justify-start"
                            onClick={() => { navigate('/users'); setIsMobileMenuOpen(false); }}
                          >
                            <UsersIcon className="w-4 h-4 mr-2" />
                            Users
                          </Button>
                          <Button
                            variant={isActive('/admin/profile') ? 'default' : 'ghost'}
                            className="justify-start"
                            onClick={() => { navigate('/admin/profile'); setIsMobileMenuOpen(false); }}
                          >
                            <User className="w-4 h-4 mr-2" />
                            Profile
                          </Button>
                          <Button
                            variant={isActive('/admin/wallet') ? 'default' : 'ghost'}
                            className="justify-start"
                            onClick={() => { navigate('/admin/wallet'); setIsMobileMenuOpen(false); }}
                          >
                            <Wallet className="w-4 h-4 mr-2" />
                            Wallet
                          </Button>
                        </>
                      )}
                      {!isAdmin && (
                        <>
                          <Button
                            variant={isActive('/profile') ? 'default' : 'ghost'}
                            className="justify-start"
                            onClick={() => { navigate('/profile'); setIsMobileMenuOpen(false); }}
                          >
                            <User className="w-4 h-4 mr-2" />
                            Profile
                          </Button>
                          <Button
                            variant={isActive('/wallet') ? 'default' : 'ghost'}
                            className="justify-start"
                            onClick={() => { navigate('/wallet'); setIsMobileMenuOpen(false); }}
                          >
                            <Wallet className="w-4 h-4 mr-2" />
                            Wallet
                          </Button>
                        </>
                      )}
                      <Button
                        variant="outline"
                        className="justify-start"
                        onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }}
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        Logout
                      </Button>
                    </>
                  )}
                  {!user && (
                    <Button
                      variant="default"
                      className="justify-start"
                      onClick={() => { navigate('/auth'); setIsMobileMenuOpen(false); }}
                    >
                      Login / Sign Up
                    </Button>
                  )}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>

      <main className="flex-grow">{children}</main>

      <footer className="border-t border-primary bg-primary mt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-primary-foreground">
            <p className="text-sm">
              © {new Date().getFullYear()} IPR - Investment Property Rentals, a product of T.A.M. General Building & Installations. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
