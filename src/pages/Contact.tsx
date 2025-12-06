import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Phone, Mail, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase";
import { useToast } from "@/hooks/use-toast";

interface SiteInfo {
  contact_email: string;
  contact_phone: string;
  office_address: string;
  main_phone: string;
  investment_phone: string;
  support_email: string;
  business_hours_weekday: string;
  business_hours_saturday: string;
  business_hours_sunday: string;
}

const Contact = () => {
  const { toast } = useToast();
  const [siteInfo, setSiteInfo] = useState<SiteInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSiteInfo = async () => {
      const { data, error } = await supabase
        .from('site_info')
        .select('*')
        .single();

      if (error) {
        toast({ title: 'Error', description: 'Failed to load contact information.', variant: 'destructive' });
      } else {
        setSiteInfo(data);
      }
      setLoading(false);
    };

    fetchSiteInfo();
  }, [toast]);
  if (loading) {
    return (
      <Layout>
        <p className="w-full text-center py-12">Loading contact information...</p>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="max-w-4xl mx-auto text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Contact <span className="text-primary">IPR</span>
          </h1>
          <p className="text-xl text-muted-foreground">
            Visit our office to deposit funds or get in touch with our team!
          </p>
        </div>

        {/* Contact Cards */}
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-6 mb-12">
          <Card className="border-primary/20 shadow-lg">
            <CardContent className="p-8">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Office Address</h3>
                  <p className="text-muted-foreground">
                    {siteInfo.office_address.split('\n').map((line: string, index: number) => (
                      <span key={index}>{line}<br /></span>
                    ))}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-accent/20 shadow-lg">
            <CardContent className="p-8">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Phone className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Phone</h3>
                  <p className="text-muted-foreground mb-2">
                    Main: {siteInfo.main_phone}<br />
                    Investment Inquiries: {siteInfo.investment_phone}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-success/20 shadow-lg">
            <CardContent className="p-8">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Mail className="w-6 h-6 text-success" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Email</h3>
                  <p className="text-muted-foreground">
                    Support: {siteInfo.support_email}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/20 shadow-lg">
            <CardContent className="p-8">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Clock className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Business Hours</h3>
                  <p className="text-muted-foreground">
                    {siteInfo.business_hours_weekday}<br />
                    {siteInfo.business_hours_saturday}<br />
                    {siteInfo.business_hours_sunday}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Important Notice */}
        <div className="max-w-4xl mx-auto">
          <Card className="border-accent/20 shadow-lg bg-accent/5">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold mb-4">Important: Fund Deposits</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  <strong className="text-foreground">When your group is locked:</strong> You will 
                  receive a notification with instructions and have <strong className="text-accent">
                  3 days</strong> to visit our office and deposit your investment funds.
                </p>
                <p>
                  <strong className="text-foreground">What to bring:</strong>
                </p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Valid government-issued ID</li>
                  <li>Your IPR account information</li>
                  <li>Payment (cash, certified check, or wire transfer)</li>
                  <li>Signed contract documents (provided after approval)</li>
                </ul>
                <p>
                  <strong className="text-foreground">Need help?</strong> Our team is available 
                  during business hours to answer any questions about the deposit process or your 
                  investment.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Contact;
