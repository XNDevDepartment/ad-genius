import { ArrowLeft, User, Settings, CreditCard, HelpCircle, LogOut, Bell, Shield, Upload, Mail, Lock, UserX, Download, Globe, Moon, Sun, Monitor, Grid, List, Eye, EyeOff, Camera, Edit2, Trash2, RefreshCw, ExternalLink, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { AuthModal } from "@/components/auth/AuthModal";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useRef, useState } from "react";

const Account = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [section, setSection] = useState<string>("");
  const [theme, setTheme] = useState("auto");
  const [layout, setLayout] = useState("grid");
  const [isEditingProfile, setIsEditingProfile] = useState(false);

    // add this
    const containerRef = useRef<HTMLDivElement>(null);

  const { toast } = useToast();

  if (!user) {
    return <AuthModal onSuccess={() => navigate("/account")} />;
  }

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleSaveProfile = () => {
    setIsEditingProfile(false);
    toast({
      title: "Profile updated",
      description: "Your profile has been successfully updated.",
    });
  };

  const handleMenuClick = (clickedSection: string) => {
    if(clickedSection  == section){
      setSection("")
    }else{
      setSection(clickedSection)
    }
  };

  const handleDownloadData = () => {
    toast({
      title: "Data export requested",
      description: "Your data export will be sent to your email within 24 hours.",
    });
  };

  const handleDeleteAccount = () => {
    toast({
      title: "Account deletion requested",
      description: "A confirmation email has been sent to verify this action.",
      variant: "destructive",
    });
  };

  /* kick the viewport (or the container) back to the top every time
  the user opens a different panel                               */
  useEffect(() => {
  if (containerRef.current) {
    // scroll the inner container (safer on iOS Safari where window scrolling can be quirky)
    containerRef.current.scrollTo({ top: 0, behavior: "instant" });
  } else {
    // fallback – scroll the whole window
    window.scrollTo({ top: 0, behavior: "instant" });
  }
}, [section]);


  const SettingsPanel = (
    <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Generation Defaults</CardTitle>
                <CardDescription>Set your preferred defaults for image generation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Default Aspect Ratio</Label>
                    <Select defaultValue="square">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="square">Square (1:1)</SelectItem>
                        <SelectItem value="portrait">Portrait (3:4)</SelectItem>
                        <SelectItem value="landscape">Landscape (4:3)</SelectItem>
                        <SelectItem value="wide">Wide (16:9)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Resolution Cap</Label>
                    <Select defaultValue="1024">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="512">512x512</SelectItem>
                        <SelectItem value="1024">1024x1024</SelectItem>
                        <SelectItem value="2048">2048x2048</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Safe Mode</Label>
                    <p className="text-sm text-muted-foreground">Filter explicit content</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Interface Preferences</CardTitle>
                <CardDescription>Customize how the app looks and feels</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Theme</Label>
                  <Select value={theme} onValueChange={setTheme}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">
                        <div className="flex items-center gap-2">
                          <Sun className="h-4 w-4" />
                          Light
                        </div>
                      </SelectItem>
                      <SelectItem value="dark">
                        <div className="flex items-center gap-2">
                          <Moon className="h-4 w-4" />
                          Dark
                        </div>
                      </SelectItem>
                      <SelectItem value="auto">
                        <div className="flex items-center gap-2">
                          <Monitor className="h-4 w-4" />
                          Auto
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Results Layout</Label>
                  <Select value={layout} onValueChange={setLayout}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="grid">
                        <div className="flex items-center gap-2">
                          <Grid className="h-4 w-4" />
                          Grid View
                        </div>
                      </SelectItem>
                      <SelectItem value="list">
                        <div className="flex items-center gap-2">
                          <List className="h-4 w-4" />
                          List View
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Language</Label>
                  <Select defaultValue="en">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Español</SelectItem>
                      <SelectItem value="fr">Français</SelectItem>
                      <SelectItem value="pt">Português</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

          </div>
  )

  const NotificationsPanel = (<Card>
    <CardHeader>
      <CardTitle>Notification Preferences</CardTitle>
      <CardDescription>Choose how you want to be notified about account activity</CardDescription>
    </CardHeader>
    <CardContent className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Job Complete</Label>
            <p className="text-sm text-muted-foreground">When image generation, upscaling, or variations complete</p>
          </div>
          <div className="flex gap-4">
            <div className="flex items-center space-x-2">
              <Switch id="job-email" defaultChecked />
              <Label htmlFor="job-email" className="text-sm">Email</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="job-push" />
              <Label htmlFor="job-push" className="text-sm">Push</Label>
            </div>
          </div>
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Credits Running Low</Label>
            <p className="text-sm text-muted-foreground">When you have less than 10% of credits remaining</p>
          </div>
          <div className="flex gap-4">
            <div className="flex items-center space-x-2">
              <Switch id="credits-email" defaultChecked />
              <Label htmlFor="credits-email" className="text-sm">Email</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="credits-push" defaultChecked />
              <Label htmlFor="credits-push" className="text-sm">Push</Label>
            </div>
          </div>
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Billing Events</Label>
            <p className="text-sm text-muted-foreground">Receipts, failed renewals, and payment updates</p>
          </div>
          <div className="flex gap-4">
            <div className="flex items-center space-x-2">
              <Switch id="billing-email" defaultChecked />
              <Label htmlFor="billing-email" className="text-sm">Email</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="billing-push" />
              <Label htmlFor="billing-push" className="text-sm">Push</Label>
            </div>
          </div>
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Product Updates & Marketing</Label>
            <p className="text-sm text-muted-foreground">New features, tips, and promotional content</p>
          </div>
          <div className="flex gap-4">
            <div className="flex items-center space-x-2">
              <Switch id="marketing-email" />
              <Label htmlFor="marketing-email" className="text-sm">Email</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="marketing-push" />
              <Label htmlFor="marketing-push" className="text-sm">Push</Label>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-4">
        <Button>Save Preferences</Button>
      </div>
    </CardContent>
  </Card>)

  const PrivacyPanel = (<div className="grid gap-6">
    <Card>
      <CardHeader>
        <CardTitle>Data Management</CardTitle>
        <CardDescription>Control your personal data and privacy settings</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <p className="font-medium">Download My Data</p>
            <p className="text-sm text-muted-foreground">Get a copy of all your prompts, images, and account data</p>
          </div>
          <Button variant="outline" onClick={handleDownloadData}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>

        <div className="flex items-center justify-between p-4 border rounded-lg border-destructive/20">
          <div>
            <p className="font-medium">Request Account Deletion</p>
            <p className="text-sm text-muted-foreground">Permanently delete your account and all associated data</p>
          </div>
          <Button variant="destructive" onClick={handleDeleteAccount}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Privacy Controls</CardTitle>
        <CardDescription>Manage how your data is used</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Opt-out of Model Training</Label>
            <p className="text-sm text-muted-foreground">Prevent your images and prompts from being used to improve AI models</p>
          </div>
          <Switch />
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Prompt Redaction</Label>
            <p className="text-sm text-muted-foreground">Automatically remove personal data from prompts</p>
          </div>
          <Switch defaultChecked />
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Analytics & Usage Data</Label>
            <p className="text-sm text-muted-foreground">Help improve the service by sharing anonymous usage data</p>
          </div>
          <Switch defaultChecked />
        </div>
      </CardContent>
    </Card>
  </div>)

  const BillingPanel = (<div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Current Plan</CardTitle>
                  <CardDescription>Manage your subscription and usage</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold">Pro Plan</h3>
                        <Badge>Active</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">$19/month • Renews on Dec 15, 2024</p>
                    </div>
                    <Button variant="outline">
                      Manage Subscription
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Credits Used</span>
                      <span>750 / 1000</span>
                    </div>
                    <Progress value={75} className="h-2" />
                  </div>

                  <div className="grid gap-2 md:grid-cols-3">
                    <Button variant="outline">
                      Upgrade Plan
                    </Button>
                    <Button variant="outline">
                      Buy Credits
                    </Button>
                    <Button variant="outline">
                      Payment Method
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Usage Statistics</CardTitle>
                  <CardDescription>Track your monthly usage and spending</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Images Generated</p>
                      <p className="text-2xl font-bold">347</p>
                      <p className="text-sm text-muted-foreground">This month</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Credits Spent</p>
                      <p className="text-2xl font-bold">750</p>
                      <p className="text-sm text-muted-foreground">This month</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Invoices & Receipts</CardTitle>
                  <CardDescription>Download your billing history</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {[
                      { date: "Dec 1, 2024", amount: "$19.00", status: "Paid" },
                      { date: "Nov 1, 2024", amount: "$19.00", status: "Paid" },
                      { date: "Oct 1, 2024", amount: "$19.00", status: "Paid" },
                    ].map((invoice, i) => (
                      <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{invoice.date}</p>
                          <p className="text-sm text-muted-foreground">{invoice.amount}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{invoice.status}</Badge>
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>)

  const HelpSupportPanel = (<div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Get Help</CardTitle>
                  <CardDescription>Find answers and get support</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Button variant="outline" className="h-20 flex-col gap-2">
                      <Globe className="h-6 w-6" />
                      <span>Documentation</span>
                    </Button>
                    <Button variant="outline" className="h-20 flex-col gap-2">
                      <MessageCircle className="h-6 w-6" />
                      <span>Live Chat</span>
                    </Button>
                  </div>
                  
                  <Button variant="outline" className="w-full">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Status Page
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Contact Support</CardTitle>
                  <CardDescription>Send us a message and we'll get back to you</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Input id="subject" placeholder="What can we help you with?" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message">Message</Label>
                    <Textarea 
                      id="message" 
                      placeholder="Describe your issue or question..."
                      className="min-h-[100px]"
                    />
                  </div>
                  <Button>Send Message</Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Links</CardTitle>
                  <CardDescription>Common help topics</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="ghost" className="w-full justify-start">
                    Writing Better Prompts
                  </Button>
                  <Button variant="ghost" className="w-full justify-start">
                    Why Did My Image Fail?
                  </Button>
                  <Button variant="ghost" className="w-full justify-start">
                    Billing & Credits FAQ
                  </Button>
                  <Button variant="ghost" className="w-full justify-start">
                    Privacy & Data Usage
                  </Button>
                </CardContent>
              </Card>
            </div>
          )

  const AccountPanel = (
    <div className="grid gap-8 lg:grid-cols-5">
      {/* Profile Card - Left Column */}
      <div className="lg:col-span-2">
        <Card className="bg-muted/30">
          <CardContent className="p-8">
            <div className="flex flex-col items-center space-y-6">
              <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={user.user_metadata?.avatar_url} />
                  <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                    {user.user_metadata?.name?.[0] || user.email?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>

              <div className="text-center space-y-3">
                <h2 className="text-2xl font-semibold">
                  {user.user_metadata?.name || "Francisco"}
                </h2>
                <p className="text-muted-foreground">{user.email}</p>
                <p className="text-muted-foreground text-sm">Founder</p>
              </div>

              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => handleMenuClick("Edit Profile")}
              >
                Edit Profile
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Menu Items - Right Column */}
      <div className="lg:col-span-3 space-y-2">
        {/* Settings */}
        <Card
          className="cursor-pointer hover:bg-muted/50 transition-colors border-0 shadow-none"
          onClick={() => handleMenuClick("Settings")}
        >
          <CardContent className="flex items-center gap-4 p-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Settings className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium">Settings</h3>
              <p className="text-sm text-muted-foreground">App preferences and notifications</p>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card 
          className="cursor-pointer hover:bg-muted/50 transition-colors border-0 shadow-none"
          onClick={() => handleMenuClick("Notifications")}
        >
          <CardContent className="flex items-center gap-4 p-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium">Notifications</h3>
              <p className="text-sm text-muted-foreground">Manage your notification preferences</p>
            </div>
          </CardContent>
        </Card>

        {/* Privacy */}
        <Card 
          className="cursor-pointer hover:bg-muted/50 transition-colors border-0 shadow-none"
          onClick={() => handleMenuClick("Privacy")}
        >
          <CardContent className="flex items-center gap-4 p-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium">Privacy</h3>
              <p className="text-sm text-muted-foreground">Data and privacy settings</p>
            </div>
          </CardContent>
        </Card>

        {/* Billing */}
        <Card 
          className="cursor-pointer hover:bg-muted/50 transition-colors border-0 shadow-none"
          onClick={() => handleMenuClick("Billing")}
        >
          <CardContent className="flex items-center gap-4 p-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium">Billing</h3>
              <p className="text-sm text-muted-foreground">Manage your subscription</p>
            </div>
          </CardContent>
        </Card>

        {/* Help & Support */}
        <Card 
          className="cursor-pointer hover:bg-muted/50 transition-colors border-0 shadow-none"
          onClick={() => handleMenuClick("Help & Support")}
        >
          <CardContent className="flex items-center gap-4 p-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <HelpCircle className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium">Help & Support</h3>
              <p className="text-sm text-muted-foreground">Get help and contact support</p>
            </div>
          </CardContent>
        </Card>

        {/* Sign Out */}
        <Card 
          className="cursor-pointer hover:bg-muted/50 transition-colors border-0 shadow-none mt-8"
          onClick={handleSignOut}
        >
          <CardContent className="flex items-center gap-4 p-6">
            <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
              <LogOut className="h-5 w-5 text-destructive" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-destructive">Sign Out</h3>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-background">
      <div className="lg:hidden">
        <div className="flex items-center gap-4 p-4 border-b">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {if(section === "") {navigate("/")} else {setSection("")} }}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Account</h1>
        </div>
      </div>

      <div ref={containerRef} className="container-responsive px-4 py-8 max-w-6xl">
        <div className="hidden lg:flex">
          {(section !== "") &&
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSection("")}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-2xl lg:text-3xl font-bold hidden lg:block mb-8">Account</h1>
            </>
          }
        </div>

        {/* Settings */}
        {(section === "Settings") && SettingsPanel}
        {(section === "Notifications") && NotificationsPanel}
        {(section === "Privacy") && PrivacyPanel}
        {(section === "Billing") && BillingPanel}
        {(section === "Help & Support") && HelpSupportPanel}
        {(section === "" && AccountPanel)}
      </div>
    </div>
  );
};

export default Account;