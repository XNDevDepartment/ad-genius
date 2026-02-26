
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { Suspense, useEffect } from "react";
import "@/i18n";
import AppLayout from "./components/AppLayout";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { LoadingFallback } from "./components/LoadingFallback";
import { checkForCachedVersion } from "./utils/cacheCheck";
import { lazyWithRetry } from "./utils/lazyWithRetry";
import { AuthGuard } from "./components/AuthGuard";

import { CookieConsent } from "./components/CookieConsent";

// Lazy load non-critical routes with automatic retry logic
const CreateSelection = lazyWithRetry(() => import("./pages/ModuleSelection"));
const CreateUGC = lazyWithRetry(() => import("./pages/CreateGPT"));
const CreateUGCGemini = lazyWithRetry(() => import("./pages/CreateUGCGemini"));
const CreateUGCGeminiV3 = lazyWithRetry(() => import("./pages/CreateUGCGeminiV3"));
const Library = lazyWithRetry(() => import("./pages/Library"));
const Account = lazyWithRetry(() => import("./pages/Account"));
const SignIn = lazyWithRetry(() => import("./pages/SignIn"));
const SignUp = lazyWithRetry(() => import("./pages/SignUp"));
const ResetPassword = lazyWithRetry(() => import("./pages/ResetPassword"));
const EmailConfirmation = lazyWithRetry(() => import("./pages/EmailConfirmation"));
const AdminDashboard = lazyWithRetry(() => import("./pages/AdminDashboard"));
const AdminDashboardOverview = lazyWithRetry(() => import("./pages/admin/AdminDashboardOverviewPage"));
const AdminUsersPage = lazyWithRetry(() => import("./pages/admin/AdminUsersPage"));
const AdminRevenuePage = lazyWithRetry(() => import("./pages/admin/AdminRevenuePage"));
const AdminContentPage = lazyWithRetry(() => import("./pages/admin/AdminContentPage"));
const AdminMarketingPage = lazyWithRetry(() => import("./pages/admin/AdminMarketingPage"));
const AdminSettingsPage = lazyWithRetry(() => import("./pages/admin/AdminSettingsPage"));
const AdminErrorsPage = lazyWithRetry(() => import("./pages/admin/AdminErrorsPage"));
const BaseModelManager = lazyWithRetry(() => import("./pages/admin/BaseModelManager"));
const SubscriptionAudit = lazyWithRetry(() => import("./pages/admin/SubscriptionAudit"));
const GettingStartedGuide = lazyWithRetry(() => import("./pages/help/GettingStartedGuide"));
const FAQPage = lazyWithRetry(() => import("./pages/help/FAQPage"));
const VideoTutorialsPage = lazyWithRetry(() => import("./pages/help/VideoTutorialsPage"));
const APIDocsPage = lazyWithRetry(() => import("./pages/help/APIDocsPage"));
const Pricing = lazyWithRetry(() => import("./pages/Pricing"));
const FoundersPlan = lazyWithRetry(() => import("./pages/FoundersPlan"));
const Success = lazyWithRetry(() => import("./pages/Success"));
const Cancel = lazyWithRetry(() => import("./pages/Cancel"));
const TestVideoGeneration = lazyWithRetry(() => import("./pages/VideoGenerator"));
const VideoLibrary = lazyWithRetry(() => import("./pages/VideoLibrary"));
const AdGenius = lazyWithRetry(() => import("./pages/AdGenius"));
const OutfitSwap = lazyWithRetry(() => import("./pages/OutfitSwap"));
const OutfitCreator = lazyWithRetry(() => import("./pages/OutfitCreator"));
const ProductStudioBackground = lazyWithRetry(() => import("./pages/ProductStudioBackground"));
const ProductStudioBackgroundBulk = lazyWithRetry(() => import("./pages/ProductStudioBackgroundBulk"));
const MagazinePhotoshoot = lazyWithRetry(() => import("./pages/MagazinePhotoshoot"));
const CreateCustomModel = lazyWithRetry(() => import("./pages/CreateCustomModel"));
const VideoAds = lazyWithRetry(() => import("./pages/VideoAds"));
const LandingPageV2 = lazyWithRetry(() => import("./pages/LandingPageV2"));
const PromoFirstMonth = lazyWithRetry(() => import("./pages/PromoFirstMonth"));
const Promo1Mes = lazyWithRetry(() => import("./pages/Promo1Mes"));
const Promo1MesCheckout = lazyWithRetry(() => import("./pages/Promo1MesCheckout"));
const OneTimeCheckout = lazyWithRetry(() => import("./pages/OneTimeCheckout"));
const AffiliateLanding = lazyWithRetry(() => import("./pages/AffiliateLanding"));
const AffiliateDashboard = lazyWithRetry(() => import("./pages/AffiliateDashboard"));
const PrivacyPolicy = lazyWithRetry(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazyWithRetry(() => import("./pages/TermsOfService"));
const CookiePolicy = lazyWithRetry(() => import("./pages/CookiePolicy"));
const ShopifyImport = lazyWithRetry(() => import("./pages/ShopifyImport"));
const UseCaseLanding = lazyWithRetry(() => import("./pages/UseCaseLanding"));
const IntegrationLanding = lazyWithRetry(() => import("./pages/IntegrationLanding"));
const Bulk = lazyWithRetry(() => import("./pages/Bulk"));
const ActivateAccount = lazyWithRetry(() => import("./pages/ActivateAccount"));
const GeniusAgent = lazyWithRetry(() => import("./pages/GeniusAgent"));
const GeniusAgentAdmin = lazyWithRetry(() => import("./pages/admin/GeniusAgentAdmin"));
const BulkBackground = lazyWithRetry(() => import("./pages/BulkBackground"));
const queryClient = new QueryClient();

// Wrapper component to provide resetKey and user context to ErrorBoundary
const ErrorBoundaryWithReset = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const { user } = useAuth();
  return (
    <ErrorBoundary 
      resetKey={location.pathname}
      userId={user?.id}
      userEmail={user?.email}
    >
      {children}
    </ErrorBoundary>
  );
};

const App = () => {
  console.log('App component rendering...');
  
  useEffect(() => {
    checkForCachedVersion();
  }, []);
 
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <LanguageProvider>
            <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <CookieConsent />
            <Routes>
              <Route path="/" element={<AppLayout />}>
                <Route index element={<Index />} />
                <Route path="create" element={
                  <ErrorBoundaryWithReset>
                    <Suspense fallback={<LoadingFallback />}>
                      <CreateSelection />
                    </Suspense>
                  </ErrorBoundaryWithReset>
                } />
                <Route path="create/product-display" element={
                  <ErrorBoundaryWithReset>
                    <Suspense fallback={<LoadingFallback />}>
                      <CreateUGC />
                    </Suspense>
                  </ErrorBoundaryWithReset>
                } />
                <Route path="create/ugc" element={
                  <ErrorBoundaryWithReset>
                    <Suspense fallback={<LoadingFallback />}>
                      <AuthGuard>
                        <CreateUGCGemini />
                      </AuthGuard>
                    </Suspense>
                  </ErrorBoundaryWithReset>
                } />
                <Route path="create/ugc-v3" element={
                  <ErrorBoundaryWithReset>
                    <Suspense fallback={<LoadingFallback />}>
                      <AuthGuard>
                        <CreateUGCGeminiV3 />
                      </AuthGuard>
                    </Suspense>
                  </ErrorBoundaryWithReset>
                } />
                <Route path="create/video" element={
                  <ErrorBoundaryWithReset>
                    <Suspense fallback={<LoadingFallback />}>
                      <AuthGuard>
                        <TestVideoGeneration />
                      </AuthGuard>
                    </Suspense>
                  </ErrorBoundaryWithReset>
                } />
                <Route path="create/adgenius" element={
                  <ErrorBoundaryWithReset>
                    <Suspense fallback={<LoadingFallback />}>
                      <AdGenius />
                    </Suspense>
                  </ErrorBoundaryWithReset>
                } />
                <Route path="create/outfit-swap" element={
                  <ErrorBoundaryWithReset>
                    <Suspense fallback={<LoadingFallback />}>
                      <AuthGuard>
                        <OutfitSwap />
                      </AuthGuard>
                    </Suspense>
                  </ErrorBoundaryWithReset>
                } />
                <Route path="create/outfit-creator" element={
                  <ErrorBoundaryWithReset>
                    <Suspense fallback={<LoadingFallback />}>
                      <AuthGuard>
                        <OutfitCreator />
                      </AuthGuard>
                    </Suspense>
                  </ErrorBoundaryWithReset>
                } />
                <Route path="create/product-studio" element={
                  <ErrorBoundaryWithReset>
                    <Suspense fallback={<LoadingFallback />}>
                      <ProductStudioBackground />
                    </Suspense>
                  </ErrorBoundaryWithReset>
                } />
                <Route path="create/product-studio-bulk" element={
                  <ErrorBoundaryWithReset>
                    <Suspense fallback={<LoadingFallback />}>
                      <ProductStudioBackgroundBulk />
                    </Suspense>
                  </ErrorBoundaryWithReset>
                } />
                <Route path="create/magazine-photoshoot" element={
                  <ErrorBoundaryWithReset>
                    <Suspense fallback={<LoadingFallback />}>
                      <MagazinePhotoshoot />
                    </Suspense>
                  </ErrorBoundaryWithReset>
                } />
                <Route path="create/custom-model" element={
                  <ErrorBoundaryWithReset>
                    <Suspense fallback={<LoadingFallback />}>
                      <CreateCustomModel />
                    </Suspense>
                  </ErrorBoundaryWithReset>
                } />
                <Route path="create/video-ads" element={
                  <ErrorBoundaryWithReset>
                    <Suspense fallback={<LoadingFallback />}>
                      <VideoAds />
                    </Suspense>
                  </ErrorBoundaryWithReset>
                } />
                <Route path="create/bulk-background" element={
                  <ErrorBoundaryWithReset>
                    <Suspense fallback={<LoadingFallback />}>
                      <AuthGuard>
                        <BulkBackground />
                      </AuthGuard>
                    </Suspense>
                  </ErrorBoundaryWithReset>
                } />
                <Route path="bulk" element={
                  <ErrorBoundaryWithReset>
                    <Suspense fallback={<LoadingFallback />}>
                      <Bulk />
                    </Suspense>
                  </ErrorBoundaryWithReset>
                } />
                <Route path="library" element={
                  <ErrorBoundaryWithReset>
                    <Suspense fallback={<LoadingFallback />}>
                      <Library />
                    </Suspense>
                  </ErrorBoundaryWithReset>
                } />
                <Route path="import/shopify" element={
                  <ErrorBoundaryWithReset>
                    <Suspense fallback={<LoadingFallback />}>
                      <AuthGuard>
                        <ShopifyImport />
                      </AuthGuard>
                    </Suspense>
                  </ErrorBoundaryWithReset>
                } />
                <Route path="videos" element={
                  <ErrorBoundaryWithReset>
                    <Suspense fallback={<LoadingFallback />}>
                      <VideoLibrary />
                    </Suspense>
                  </ErrorBoundaryWithReset>
                } />
                <Route path="account" element={
                  <ErrorBoundaryWithReset>
                    <Suspense fallback={<LoadingFallback />}>
                      <Account />
                    </Suspense>
                  </ErrorBoundaryWithReset>
                } />
                <Route path="signin" element={
                  <ErrorBoundaryWithReset>
                    <Suspense fallback={<LoadingFallback />}>
                      <SignIn />
                    </Suspense>
                  </ErrorBoundaryWithReset>
                } />
                <Route path="signup" element={
                  <ErrorBoundaryWithReset>
                    <Suspense fallback={<LoadingFallback />}>
                      <SignUp />
                    </Suspense>
                  </ErrorBoundaryWithReset>
                } />
                <Route path="pricing" element={
                  <ErrorBoundaryWithReset>
                    <Suspense fallback={<LoadingFallback />}>
                      <Pricing />
                    </Suspense>
                  </ErrorBoundaryWithReset>
                } />
                <Route path="founders" element={
                  <ErrorBoundaryWithReset>
                    <Suspense fallback={<LoadingFallback />}>
                      <FoundersPlan />
                    </Suspense>
                  </ErrorBoundaryWithReset>
                } />
                <Route path="help/getting-started" element={
                  <ErrorBoundaryWithReset>
                    <Suspense fallback={<LoadingFallback />}>
                      <GettingStartedGuide />
                    </Suspense>
                  </ErrorBoundaryWithReset>
                } />
                <Route path="help/faq" element={
                  <ErrorBoundaryWithReset>
                    <Suspense fallback={<LoadingFallback />}>
                      <FAQPage />
                    </Suspense>
                  </ErrorBoundaryWithReset>
                } />
                <Route path="help/tutorials" element={
                  <ErrorBoundaryWithReset>
                    <Suspense fallback={<LoadingFallback />}>
                      <VideoTutorialsPage />
                    </Suspense>
                  </ErrorBoundaryWithReset>
                } />
                <Route path="help/api-docs" element={
                  <ErrorBoundaryWithReset>
                    <Suspense fallback={<LoadingFallback />}>
                      <APIDocsPage />
                    </Suspense>
                  </ErrorBoundaryWithReset>
                } />
              </Route>
              <Route path="/email-confirmation" element={
                <ErrorBoundaryWithReset>
                  <Suspense fallback={<LoadingFallback />}>
                    <EmailConfirmation />
                  </Suspense>
                </ErrorBoundaryWithReset>
              } />
              <Route path="/reset-password" element={
                <ErrorBoundaryWithReset>
                  <Suspense fallback={<LoadingFallback />}>
                    <ResetPassword />
                  </Suspense>
                </ErrorBoundaryWithReset>
              } />
              <Route path="/success" element={
                <ErrorBoundaryWithReset>
                  <Suspense fallback={<LoadingFallback />}>
                    <Success />
                  </Suspense>
                </ErrorBoundaryWithReset>
              } />
              <Route path="/cancel" element={
                <ErrorBoundaryWithReset>
                  <Suspense fallback={<LoadingFallback />}>
                    <Cancel />
                  </Suspense>
                </ErrorBoundaryWithReset>
              } />
              <Route path="/admin" element={
                <ErrorBoundaryWithReset>
                  <Suspense fallback={<LoadingFallback />}>
                    <AdminDashboard />
                  </Suspense>
                </ErrorBoundaryWithReset>
              }>
                <Route index element={<Suspense fallback={<LoadingFallback />}><AdminDashboardOverview /></Suspense>} />
                <Route path="users" element={<Suspense fallback={<LoadingFallback />}><AdminUsersPage /></Suspense>} />
                <Route path="revenue" element={<Suspense fallback={<LoadingFallback />}><AdminRevenuePage /></Suspense>} />
                <Route path="content" element={<Suspense fallback={<LoadingFallback />}><AdminContentPage /></Suspense>} />
                <Route path="marketing" element={<Suspense fallback={<LoadingFallback />}><AdminMarketingPage /></Suspense>} />
                <Route path="settings" element={<Suspense fallback={<LoadingFallback />}><AdminSettingsPage /></Suspense>} />
                <Route path="errors" element={<Suspense fallback={<LoadingFallback />}><AdminErrorsPage /></Suspense>} />
                <Route path="base-models" element={<Suspense fallback={<LoadingFallback />}><BaseModelManager /></Suspense>} />
                <Route path="subscription-audit" element={<Suspense fallback={<LoadingFallback />}><SubscriptionAudit /></Suspense>} />
                <Route path="genius-agent" element={<Suspense fallback={<LoadingFallback />}><GeniusAgentAdmin /></Suspense>} />
              </Route>
              <Route path="/genius-agent" element={
                <ErrorBoundaryWithReset>
                  <Suspense fallback={<LoadingFallback />}>
                    <GeniusAgent />
                  </Suspense>
                </ErrorBoundaryWithReset>
              } />
              {/* /lp redirects to home */}
              <Route path="/lp" element={<Navigate to="/" replace />} />
              <Route path="/promo/first-month" element={
                <ErrorBoundaryWithReset>
                  <Suspense fallback={<LoadingFallback />}>
                    <PromoFirstMonth />
                  </Suspense>
                </ErrorBoundaryWithReset>
              } />
              <Route path="/promo/1mes" element={
                <ErrorBoundaryWithReset>
                  <Suspense fallback={<LoadingFallback />}>
                    <Promo1Mes />
                  </Suspense>
                </ErrorBoundaryWithReset>
              } />
              <Route path="/promo/1mes/checkout" element={
                <ErrorBoundaryWithReset>
                  <Suspense fallback={<LoadingFallback />}>
                    <Promo1MesCheckout />
                  </Suspense>
                </ErrorBoundaryWithReset>
              } />
              <Route path="/afiliados" element={
                <ErrorBoundaryWithReset>
                  <Suspense fallback={<LoadingFallback />}>
                    <AffiliateLanding />
                  </Suspense>
                </ErrorBoundaryWithReset>
              } />
              <Route path="/afiliados/dashboard/:token" element={
                <ErrorBoundaryWithReset>
                  <Suspense fallback={<LoadingFallback />}>
                    <AffiliateDashboard />
              </Suspense>
                </ErrorBoundaryWithReset>
              } />
              <Route path="/privacy" element={
                <ErrorBoundaryWithReset>
                  <Suspense fallback={<LoadingFallback />}>
                    <PrivacyPolicy />
                  </Suspense>
                </ErrorBoundaryWithReset>
              } />
              <Route path="/terms" element={
                <ErrorBoundaryWithReset>
                  <Suspense fallback={<LoadingFallback />}>
                    <TermsOfService />
                  </Suspense>
                </ErrorBoundaryWithReset>
              } />
              <Route path="/cookies" element={
                <ErrorBoundaryWithReset>
                  <Suspense fallback={<LoadingFallback />}>
                    <CookiePolicy />
                  </Suspense>
                </ErrorBoundaryWithReset>
              } />
              <Route path="/use-cases/:slug" element={
                <ErrorBoundaryWithReset>
                  <Suspense fallback={<LoadingFallback />}>
                    <UseCaseLanding />
                  </Suspense>
                </ErrorBoundaryWithReset>
              } />
              <Route path="/integrations/:slug" element={
                <ErrorBoundaryWithReset>
                  <Suspense fallback={<LoadingFallback />}>
                    <IntegrationLanding />
                  </Suspense>
                </ErrorBoundaryWithReset>
              } />
              <Route path="/activate" element={
                <ErrorBoundaryWithReset>
                  <Suspense fallback={<LoadingFallback />}>
                    <ActivateAccount />
                  </Suspense>
                </ErrorBoundaryWithReset>
              } />
              <Route path="/checkout/:plan/once" element={
                <ErrorBoundaryWithReset>
                  <Suspense fallback={<LoadingFallback />}>
                    <OneTimeCheckout />
                  </Suspense>
                </ErrorBoundaryWithReset>
              } />
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
