import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserPlus, Users, DollarSign, Building, TrendingUp, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const HowItWorks = () => {
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="max-w-4xl mx-auto text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            How <span className="text-primary">IPR Investment</span> Works
          </h1>
          <p className="text-xl text-muted-foreground">
            A simple, transparent process from signup to passive income
          </p>
        </div>

        {/* Process Steps */}
        <div className="max-w-5xl mx-auto mb-16">
          <div className="space-y-8">
            {/* Step 1 */}
            <Card className="border-primary/20 shadow-lg">
              <CardContent className="p-8">
                <div className="flex items-start gap-6">
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center">
                      <UserPlus className="w-8 h-8 text-primary-foreground" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-sm font-bold text-primary">STEP 1</span>
                      <h3 className="text-2xl font-bold">Lock Your Position</h3>
                    </div>
                    <p className="text-muted-foreground mb-4">
                      Sign up and select how many contracts you want to purchase ($10,000 each). 
                      Request to join an available open group. Each group accepts up to 25 members or contracts which ever comes first (example 5 members locked 5 contracts = 25 contracts).
                    </p>
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <p className="text-sm font-semibold">What happens: Admin reviews and approves your request</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-center">
              <ArrowRight className="w-8 h-8 text-muted-foreground" />
            </div>

            {/* Step 2 */}
            <Card className="border-accent/20 shadow-lg">
              <CardContent className="p-8">
                <div className="flex items-start gap-6">
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center">
                      <Users className="w-8 h-8 text-accent-foreground" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-sm font-bold text-accent">STEP 2</span>
                      <h3 className="text-2xl font-bold">Wait for Group to Fill</h3>
                    </div>
                    <p className="text-muted-foreground mb-4">
                      Once your group reaches 25 members or 25 contracts, the group automatically 
                      locks. All members receive a notification that they have 3 days to deposit 
                      their funds at our office.
                    </p>
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <p className="text-sm font-semibold">
                        Group gets assigned: IPR00001, IPR00002, etc.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-center">
              <ArrowRight className="w-8 h-8 text-muted-foreground" />
            </div>

            {/* Step 3 */}
            <Card className="border-success/20 shadow-lg">
              <CardContent className="p-8">
                <div className="flex items-start gap-6">
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 bg-success rounded-full flex items-center justify-center">
                      <DollarSign className="w-8 h-8 text-success-foreground" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-sm font-bold text-success">STEP 3</span>
                      <h3 className="text-2xl font-bold">Deposit Funds</h3>
                    </div>
                    <p className="text-muted-foreground mb-4">
                      Within 3 days of group lock notification, visit our office to deposit your 
                      investment funds. This ensures all members are committed and ready to 
                      proceed with the property development.
                    </p>
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <p className="text-sm font-semibold">
                        Office location and hours available on the Contact page
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-center">
              <ArrowRight className="w-8 h-8 text-muted-foreground" />
            </div>

            {/* Step 4 */}
            <Card className="border-primary/20 shadow-lg">
              <CardContent className="p-8">
                <div className="flex items-start gap-6">
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center">
                      <Building className="w-8 h-8 text-primary-foreground" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-sm font-bold text-primary">STEP 4</span>
                      <h3 className="text-2xl font-bold">Group Becomes Active</h3>
                    </div>
                    <p className="text-muted-foreground mb-4">
                      For the first group, an initial property will be provided pre-built. For subsequent groups, with all funds deposited, T.A.M. General Building & Installations begins 
                      construction of a rental property. This way there will always be a property available for each new active group. The group's pooled investment of 
                      $250,000 (25 members × $10,000) acts as 10% of the financing, with T.A.M.G.B.I. 
                      financing the remaining 90% to build an investment property large enough 
                      to support the payouts.
                    </p>
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <p className="text-sm font-semibold">
                        Professional property development and management throughout
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-center">
              <ArrowRight className="w-8 h-8 text-muted-foreground" />
            </div>

            {/* Step 5 */}
            <Card className="border-accent/20 shadow-lg">
              <CardContent className="p-8">
                <div className="flex items-start gap-6">
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center">
                      <TrendingUp className="w-8 h-8 text-accent-foreground" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-sm font-bold text-accent">STEP 5</span>
                      <h3 className="text-2xl font-bold">Receive Monthly Income</h3>
                    </div>
                    <p className="text-muted-foreground mb-4">
                      Once the group becomes active, meaning all members paid within the 3-day period, payouts start the very next month and each member receives $1,800 
                      per month for 60 consecutive months (5 years). That's a total of $108,000 
                      per contract—nearly 11x your initial investment!
                    </p>
                    <div className="bg-success/10 p-4 rounded-lg border border-success/20">
                      <p className="text-sm font-semibold text-success">
                        💰 Passive income: $1,800/month × 60 months = $108,000 total return per contract
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Investment Summary */}
        <div className="max-w-4xl mx-auto mb-12">
          <Card className="border-primary/20 shadow-lg bg-gradient-hero">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold mb-6 text-center">Investment Summary</h2>
              <div className="grid md:grid-cols-3 gap-6 text-center">
                <div>
                  <div className="text-3xl font-bold text-primary mb-2">$10,000</div>
                  <div className="text-sm text-muted-foreground">One-time Investment</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-accent mb-2">$1,800</div>
                  <div className="text-sm text-muted-foreground">Monthly for 60 Months</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-success mb-2">$108,000</div>
                  <div className="text-sm text-muted-foreground">Total Returns</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <Button size="lg" onClick={() => navigate('/auth')} className="shadow-lg">
            Start Your Investment Journey
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default HowItWorks;
