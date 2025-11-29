import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, Users, TrendingUp, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase";

const Home = () => {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);

      if (session) {
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .eq('role', 'admin')
          .maybeSingle();
        setIsAdmin(!!roleData);
      }
    };
    checkUser();
  }, []);

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative py-20 bg-gradient-hero">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6">
              Build Your Passive Income Through{" "}
              <span className="text-primary">Real Estate Investment</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Join closed membership investment groups and generate $1,800/month for 60 months. 
              Perfect for first-time investors and stay-at-home moms.
            </p>
            { !isAdmin && (
              <div className="flex gap-4 justify-center">
                <Button size="lg" onClick={() => navigate('/auth')} className="shadow-lg">
                  Get Started Today
                </Button>
                <Button size="lg" variant="outline" onClick={() => navigate('/how-it-works')}>
                  Learn More
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Why Choose IPR?
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-border shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Building2 className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Real Property</h3>
                <p className="text-muted-foreground">
                  Invest in actual rental properties built with your group's pooled funds.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                  <TrendingUp className="w-6 h-6 text-accent" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Fixed Returns</h3>
                <p className="text-muted-foreground">
                  Guaranteed $1,800 monthly income for 5 years from rental proceeds.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-success" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Group Investment</h3>
                <p className="text-muted-foreground">
                  Join exclusive 25-member investment groups with other investors.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Secure Process</h3>
                <p className="text-muted-foreground">
                  Transparent approval process and professionally managed properties.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Investment Details */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Simple Investment Structure
              </h2>
              <p className="text-xl text-muted-foreground">
                Clear, straightforward terms for your peace of mind
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="text-4xl font-bold text-primary mb-2">$10,000</div>
                <div className="text-muted-foreground">Per Contract</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-accent mb-2">$1,800</div>
                <div className="text-muted-foreground">Monthly Income</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-success mb-2">60 Months</div>
                <div className="text-muted-foreground">Contract Duration</div>
              </div>
            </div>

            <Card className="mt-12 border-primary/20 shadow-lg">
              <CardContent className="p-8">
                <h3 className="text-2xl font-semibold mb-4 text-center">Total Returns</h3>
                <div className="text-center">
                  <div className="text-5xl font-bold text-success mb-2">$108,000</div>
                  <p className="text-muted-foreground">Over 5 years ($1,800 × 60 months)</p>
                  <p className="text-lg mt-4 font-semibold text-primary">
                    That's 980% ROI on your $10,000 investment!
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-primary">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-6">
              Ready to Start Your Investment Journey?
            </h2>
            <p className="text-xl text-primary-foreground/90 mb-8">
              Join thousands of investors already earning passive income through IPR
            </p>
            { !isLoggedIn && (
              <Button 
                size="lg" 
                variant="secondary"
                onClick={() => navigate('/auth')}
                className="shadow-glow"
              >
                Create Your Account
              </Button>
            )}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Home;
