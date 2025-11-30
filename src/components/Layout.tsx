import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, Info, HelpCircle, Phone, LogOut, LayoutDashboard, Shield, Users as UsersIcon, User } from "lucide-react";
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
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-xl">IPR</span>
              </div>
              <span className="font-bold text-xl text-foreground">Investment Property Rentals</span>
            </Link>

            <div className="flex items-center gap-2">
              <Button
                variant={isActive('/') ? 'default' : 'ghost'}
                size="sm"
                onClick={() => navigate('/')}
              >
                <Home className="w-4 h-4 mr-2" />
                Home
              </Button>
              {user && roleResolved && !isAdmin && (
                <Button
                  variant={isActive('/dashboard') ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => navigate('/dashboard')}
                >
                  <LayoutDashboard className="w-4 h-4 mr-2" />
                  Dashboard
                </Button>
              )}
              {(!isAdmin && roleResolved) && (
                <>
                  <Button
                    variant={isActive('/about') ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => navigate('/about')}
                  >
                    <Info className="w-4 h-4 mr-2" />
                    About
                  </Button>
                  <Button
                    variant={isActive('/how-it-works') ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => navigate('/how-it-works')}
                  >
                    <HelpCircle className="w-4 h-4 mr-2" />
                    How It Works
                  </Button>
                  <Button
                    variant={isActive('/contact') ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => navigate('/contact')}
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
                        variant={isActive('/admin/profile') ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => navigate('/admin/profile')}
                      >
                        <User className="w-4 h-4 mr-2" />
                        Profile
                      </Button>
                    </>
                  )}
                  {!isAdmin && (
                    <Button
                      variant={isActive('/profile') ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => navigate('/profile')}
                    >
                      <User className="w-4 h-4 mr-2" />
                      Profile
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={handleLogout}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
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
          </div>
        </div>
      </nav>

      <main>{children}</main>

      <footer className="border-t border-border bg-card/50 mt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-muted-foreground">
            <p className="text-sm">
              © {new Date().getFullYear()} IPR - Investment Property Rentals, a product of T.A.M. General Building & Installations. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
