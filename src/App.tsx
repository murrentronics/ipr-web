import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import About from "./pages/About";
import HowItWorks from "./pages/HowItWorks";
import Contact from "./pages/Contact";
import Users from "./pages/Users";
import MemberProfile from "./pages/MemberProfile";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import UpdatePassword from "./pages/UpdatePassword";
import AdminProfile from "./pages/AdminProfile";
import AdminWallet from "./pages/AdminWallet";
import MemberWallet from "./pages/MemberWallet";
import Messages from "./pages/Messages";
import { Layout } from "./components/Layout";
import { AuthUrlCleanup } from "./components/AuthUrlCleanup";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthUrlCleanup />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/profile" element={<AdminProfile />} />
          <Route path="/admin/wallet" element={<AdminWallet />} />
          <Route path="/users" element={<Users />} />
          <Route path="/profile" element={<Layout><MemberProfile /></Layout>} />
          <Route path="/wallet" element={<MemberWallet />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/update-password" element={<UpdatePassword />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
