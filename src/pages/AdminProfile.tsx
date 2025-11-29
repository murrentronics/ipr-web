import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const AdminProfile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [officeAddress, setOfficeAddress] = useState("");
  const [mainPhone, setMainPhone] = useState("");
  const [investmentPhone, setInvestmentPhone] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [businessHoursWeekday, setBusinessHoursWeekday] = useState("");
  const [businessHoursSaturday, setBusinessHoursSaturday] = useState("");
  const [businessHoursSunday, setBusinessHoursSunday] = useState("");

  const loadSiteInfo = useCallback(async () => {
    const { data, error } = await supabase
      .from('site_info')
      .select('*')
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
      toast({ title: 'Error loading site info', description: error.message, variant: 'destructive' });
      return;
    }

    if (data) {
      setContactEmail(data.contact_email || "");
      setContactPhone(data.contact_phone || "");
      setOfficeAddress(data.office_address || "");
      setMainPhone(data.main_phone || "");
      setInvestmentPhone(data.investment_phone || "");
      setSupportEmail(data.support_email || "");
      setBusinessHoursWeekday(data.business_hours_weekday || "");
      setBusinessHoursSaturday(data.business_hours_saturday || "");
      setBusinessHoursSunday(data.business_hours_sunday || "");
    }
  }, [toast, setContactEmail, setContactPhone, setOfficeAddress, setMainPhone, setInvestmentPhone, setSupportEmail, setBusinessHoursWeekday, setBusinessHoursSaturday, setBusinessHoursSunday]);

  const checkAdminAndLoadData = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/auth');
      return;
    }

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
    await loadSiteInfo();
    setLoading(false);
  }, [navigate, toast, loadSiteInfo]);

  useEffect(() => {
    checkAdminAndLoadData();
  }, [checkAdminAndLoadData]);

  const handleSave = async () => {
    const { error } = await supabase
      .from('site_info')
      .upsert(
        {
          id: 1, // Assuming a single row for site info
          contact_email: contactEmail,
          contact_phone: contactPhone,
          office_address: officeAddress,
          main_phone: mainPhone,
          investment_phone: investmentPhone,
          support_email: supportEmail,
          business_hours_weekday: businessHoursWeekday,
          business_hours_saturday: businessHoursSaturday,
          business_hours_sunday: businessHoursSunday,
        },
        { onConflict: 'id' }
      );

    if (error) {
      toast({ title: 'Error saving site info', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Site information updated successfully.' });
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12">
          <p>Loading...</p>
        </div>
      </Layout>
    );
  }

  if (!isAdmin) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12">
          <p>Access Denied</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-6">Admin Profile</h1>
        <Card>
          <CardHeader>
            <CardTitle>Site Contact Information</CardTitle>
            <CardDescription>Update the contact and office address details for the website.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contactEmail">Contact Email</Label>
              <Input
                id="contactEmail"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactPhone">Contact Phone</Label>
              <Input
                id="contactPhone"
                type="text"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="officeAddress">Office Address</Label>
              <Input
                id="officeAddress"
                type="text"
                value={officeAddress}
                onChange={(e) => setOfficeAddress(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mainPhone">Main Phone</Label>
              <Input
                id="mainPhone"
                type="text"
                value={mainPhone}
                onChange={(e) => setMainPhone(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="investmentPhone">Investment Inquiries Phone</Label>
              <Input
                id="investmentPhone"
                type="text"
                value={investmentPhone}
                onChange={(e) => setInvestmentPhone(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="supportEmail">Support Email</Label>
              <Input
                id="supportEmail"
                type="email"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessHoursWeekday">Business Hours (Weekday)</Label>
              <Input
                id="businessHoursWeekday"
                type="text"
                value={businessHoursWeekday}
                onChange={(e) => setBusinessHoursWeekday(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="businessHoursSaturday">Business Hours (Saturday)</Label>
              <Input
                id="businessHoursSaturday"
                type="text"
                value={businessHoursSaturday}
                onChange={(e) => setBusinessHoursSaturday(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="businessHoursSunday">Business Hours (Sunday)</Label>
              <Input
                id="businessHoursSunday"
                type="text"
                value={businessHoursSunday}
                onChange={(e) => setBusinessHoursSunday(e.target.value)}
              />
            </div>
            <Button onClick={handleSave}>Save Changes</Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default AdminProfile;
