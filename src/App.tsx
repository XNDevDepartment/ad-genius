
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import "@/i18n";
import AppLayout from "./components/AppLayout";
import Index from "./pages/Index";
import CreateSelection from "./pages/CreateSelection";
import CreateUGC from "./pages/CreateUGC";
import Library from "./pages/Library";
import Account from "./pages/Account";
import NotFound from "./pages/NotFound";
import ResetPassword from "./pages/ResetPassword";
import AdminDashboard from "./pages/AdminDashboard";
import GettingStartedGuide from "./pages/help/GettingStartedGuide";
import FAQPage from "./pages/help/FAQPage";
import VideoTutorialsPage from "./pages/help/VideoTutorialsPage";
import APIDocsPage from "./pages/help/APIDocsPage";
import Pricing from "./pages/Pricing";


const queryClient = new QueryClient();

const App = () => {
  console.log('App component rendering...');
 
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <LanguageProvider>
            <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<AppLayout />}>
                <Route index element={<Index />} />
                <Route path="create" element={<CreateSelection />} />
                <Route path="create/ugc" element={<CreateUGC />} />
                <Route path="library" element={<Library />} />
                <Route path="account" element={<Account />} />
                <Route path="pricing" element={<Pricing />} />
                <Route path="help/getting-started" element={<GettingStartedGuide />} />
                <Route path="help/faq" element={<FAQPage />} />
                <Route path="help/tutorials" element={<VideoTutorialsPage />} />
                <Route path="help/api-docs" element={<APIDocsPage />} />
              </Route>
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/admin" element={<AdminDashboard />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
            </TooltipProvider>
          </LanguageProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
