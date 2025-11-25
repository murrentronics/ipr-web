import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, Award, Users, Target } from "lucide-react";

const About = () => {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="max-w-4xl mx-auto text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            About <span className="text-primary">T.A.M. General Building & Installations</span>
          </h1>
          <p className="text-xl text-muted-foreground">
            Your trusted partner in property development and real estate investment opportunities
          </p>
        </div>

        {/* Company Story */}
        <section className="mb-16">
          <Card className="border-primary/20 shadow-lg">
            <CardContent className="p-8 md:p-12">
              <div className="prose prose-lg max-w-none">
                <p className="text-lg leading-relaxed text-muted-foreground mb-4">
                  T.A.M. General Building & Installations is a premier property development company 
                  with a proven track record in delivering high-quality residential and commercial 
                  properties. With years of expertise in the construction and real estate sectors, 
                  we have established ourselves as industry leaders in property development and 
                  investment management.
                </p>
                <p className="text-lg leading-relaxed text-muted-foreground mb-4">
                  Our commitment to excellence and innovation led us to create Investment Property 
                  Rentals (IPR), a revolutionary platform that democratizes real estate investment. 
                  Through IPR, we enable everyday individuals—especially first-time investors and 
                  stay-at-home moms—to participate in lucrative property investments that were 
                  previously accessible only to large institutional investors.
                </p>
                <p className="text-lg leading-relaxed text-muted-foreground">
                  We believe in transparency, integrity, and delivering measurable returns to our 
                  investors. Every property we develop through the IPR program is built to the 
                  highest standards and strategically located to ensure consistent rental income 
                  for our investment partners.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Core Values */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">Our Core Values</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-border shadow-md">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Building2 className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Excellence</h3>
                <p className="text-muted-foreground">
                  We deliver superior quality in every project we undertake
                </p>
              </CardContent>
            </Card>

            <Card className="border-border shadow-md">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Award className="w-8 h-8 text-accent" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Integrity</h3>
                <p className="text-muted-foreground">
                  Transparent operations and honest communication with all stakeholders
                </p>
              </CardContent>
            </Card>

            <Card className="border-border shadow-md">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-success" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Partnership</h3>
                <p className="text-muted-foreground">
                  Building lasting relationships with our investors and communities
                </p>
              </CardContent>
            </Card>

            <Card className="border-border shadow-md">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Target className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Results</h3>
                <p className="text-muted-foreground">
                  Focused on delivering consistent returns for our investment partners
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Expertise Section */}
        <section>
          <Card className="border-accent/20 shadow-lg">
            <CardContent className="p-8 md:p-12">
              <h2 className="text-3xl font-bold mb-6 text-center">Our Expertise</h2>
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xl font-semibold mb-3 text-primary">
                    Property Development
                  </h3>
                  <ul className="space-y-2 text-muted-foreground">
                    <li>• Residential construction</li>
                    <li>• Commercial properties</li>
                    <li>• Mixed-use developments</li>
                    <li>• Renovation and restoration</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-3 text-primary">
                    Investment Management
                  </h3>
                  <ul className="space-y-2 text-muted-foreground">
                    <li>• Group investment coordination</li>
                    <li>• Property management services</li>
                    <li>• Rental income distribution</li>
                    <li>• Investor relations</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </Layout>
  );
};

export default About;
