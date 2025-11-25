import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Phone, Mail, Clock } from "lucide-react";

const Contact = () => {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="max-w-4xl mx-auto text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Contact <span className="text-primary">IPR</span>
          </h1>
          <p className="text-xl text-muted-foreground">
            Visit our office to deposit funds or get in touch with our team
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
                    T.A.M. General Building & Installations<br />
                    123 Investment Boulevard<br />
                    Property District<br />
                    City, State 12345
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
                    Main: +1 (555) 123-4567<br />
                    Investment Inquiries: +1 (555) 123-4568
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
                    General: info@ipr-investments.com<br />
                    Support: support@ipr-investments.com<br />
                    Admin: admin@ipr-investments.com
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
                    Monday - Friday: 9:00 AM - 6:00 PM<br />
                    Saturday: 10:00 AM - 4:00 PM<br />
                    Sunday: Closed
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
