import { useState } from "react";
import { ArrowLeft, User, Settings, CreditCard, HelpCircle, LogOut, Bell, Shield, Upload, Mail, Lock, UserX, Download, Globe, Moon, Sun, Monitor, Grid, List, Eye, EyeOff, Camera, Edit2, Trash2, RefreshCw, ExternalLink, MessageCircle, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuth } from "@/contexts/AuthContext";
import { AuthModal } from "@/components/auth/AuthModal";
import { useToast } from "@/hooks/use-toast";

const Account = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [theme, setTheme] = useState("auto");
  const [layout, setLayout] = useState("grid");
  const [openSection, setOpenSection] = useState<string | null>(null);

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

  return (
    <div className="min-h-screen bg-background">
      <div className="lg:hidden">
        <div className="flex items-center gap-4 p-4 border-b">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Account</h1>
        </div>
      </div>

      <div className="container-responsive px-4 py-8">
        <h1 className="text-2xl lg:text-3xl font-bold hidden lg:block mb-8">Account Settings</h1>
        
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Profile Card - Left Column */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <div className="flex flex-col items-center space-y-4">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={user.user_metadata?.avatar_url} />
                  <AvatarFallback className="text-lg">
                    {user.user_metadata?.name?.[0] || user.email?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="text-center space-y-1">
                  <h2 className="text-xl font-semibold">
                    {user.user_metadata?.name || "User"}
                  </h2>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  <Badge variant="secondary">Founder</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full" 
                variant="outline"
                onClick={() => setIsEditingProfile(!isEditingProfile)}
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            </CardContent>
          </Card>

          {/* Menu Items - Right Column */}
          <div className="lg:col-span-2 space-y-4">
            {/* Settings */}
            <Collapsible 
              open={openSection === "settings"} 
              onOpenChange={(open) => setOpenSection(open ? "settings" : null)}
            >
              <CollapsibleTrigger asChild>
                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="flex items-center justify-between p-6">
                    <div className="flex items-center gap-3">
                      <Settings className="h-5 w-5" />
                      <div>
                        <h3 className="font-medium">Settings</h3>
                        <p className="text-sm text-muted-foreground">App preferences and notifications</p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 transition-transform duration-200 data-[state=open]:rotate-90" />
                  </CardContent>
                </Card>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4">
                <Card>
                  <CardContent className="p-6 space-y-6">
                    {/* Generation Defaults */}
                    <div className="space-y-4">
                      <h4 className="font-medium">Generation Defaults</h4>
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
                    </div>

                    <Separator />

                    {/* Interface Preferences */}
                    <div className="space-y-4">
                      <h4 className="font-medium">Interface Preferences</h4>
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
                    </div>

                    <Separator />

                    {/* API Keys */}
                    <div className="space-y-4">
                      <h4 className="font-medium">API Keys</h4>
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="font-medium">Primary API Key</p>
                          <p className="text-sm text-muted-foreground">••••••••••••••••••••••••••••••••</p>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <Button variant="outline">
                        Generate New Key
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </CollapsibleContent>
            </Collapsible>

            {/* Notifications */}
            <Collapsible 
              open={openSection === "notifications"} 
              onOpenChange={(open) => setOpenSection(open ? "notifications" : null)}
            >
              <CollapsibleTrigger asChild>
                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="flex items-center justify-between p-6">
                    <div className="flex items-center gap-3">
                      <Bell className="h-5 w-5" />
                      <div>
                        <h3 className="font-medium">Notifications</h3>
                        <p className="text-sm text-muted-foreground">Manage your notification preferences</p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 transition-transform duration-200 data-[state=open]:rotate-90" />
                  </CardContent>
                </Card>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4">
                <Card>
                  <CardContent className="p-6 space-y-6">
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
                          <Switch id="credits-push" />
                          <Label htmlFor="credits-push" className="text-sm">Push</Label>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Billing Events</Label>
                        <p className="text-sm text-muted-foreground">Receipts, failed renewals, and payment issues</p>
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
                  </CardContent>
                </Card>
              </CollapsibleContent>
            </Collapsible>

            {/* Privacy */}
            <Collapsible 
              open={openSection === "privacy"} 
              onOpenChange={(open) => setOpenSection(open ? "privacy" : null)}
            >
              <CollapsibleTrigger asChild>
                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="flex items-center justify-between p-6">
                    <div className="flex items-center gap-3">
                      <Shield className="h-5 w-5" />
                      <div>
                        <h3 className="font-medium">Privacy</h3>
                        <p className="text-sm text-muted-foreground">Data and privacy settings</p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 transition-transform duration-200 data-[state=open]:rotate-90" />
                  </CardContent>
                </Card>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4">
                <Card>
                  <CardContent className="p-6 space-y-6">
                    <div className="space-y-4">
                      <h4 className="font-medium">Data Management</h4>
                      <div className="space-y-3">
                        <Button variant="outline" onClick={handleDownloadData} className="w-full justify-start">
                          <Download className="h-4 w-4 mr-2" />
                          Download My Data
                        </Button>
                        <p className="text-sm text-muted-foreground">
                          Export all your prompts, images, and account data in a portable format.
                        </p>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <h4 className="font-medium">Privacy Controls</h4>
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Opt-out of Model Training</Label>
                          <p className="text-sm text-muted-foreground">Prevent your images and prompts from being used to improve our models</p>
                        </div>
                        <Switch />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Prompt Redaction</Label>
                          <p className="text-sm text-muted-foreground">Automatically remove personal data from your prompts</p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <h4 className="font-medium text-destructive">Danger Zone</h4>
                      <div className="space-y-3">
                        <Button variant="destructive" onClick={handleDeleteAccount} className="w-full justify-start">
                          <UserX className="h-4 w-4 mr-2" />
                          Delete Account
                        </Button>
                        <p className="text-sm text-muted-foreground">
                          Permanently delete your account and all associated data. This action cannot be undone.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CollapsibleContent>
            </Collapsible>

            {/* Billing */}
            <Collapsible 
              open={openSection === "billing"} 
              onOpenChange={(open) => setOpenSection(open ? "billing" : null)}
            >
              <CollapsibleTrigger asChild>
                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="flex items-center justify-between p-6">
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-5 w-5" />
                      <div>
                        <h3 className="font-medium">Billing</h3>
                        <p className="text-sm text-muted-foreground">Manage your subscription</p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 transition-transform duration-200 data-[state=open]:rotate-90" />
                  </CardContent>
                </Card>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4">
                <Card>
                  <CardContent className="p-6 space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Pro Plan</h4>
                          <p className="text-sm text-muted-foreground">$29/month • Renews on Jan 15, 2025</p>
                        </div>
                        <Badge>Active</Badge>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Usage this cycle</span>
                          <span>750 / 1000 images</span>
                        </div>
                        <Progress value={75} className="h-2" />
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <h4 className="font-medium">Plan Management</h4>
                      <div className="flex gap-2">
                        <Button variant="outline">Upgrade Plan</Button>
                        <Button variant="outline">Cancel Subscription</Button>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <h4 className="font-medium">Payment Method</h4>
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <CreditCard className="h-5 w-5" />
                          <div>
                            <p className="font-medium">•••• •••• •••• 4242</p>
                            <p className="text-sm text-muted-foreground">Expires 12/27</p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm">Update</Button>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Invoices</h4>
                        <Button variant="outline" size="sm">View All</Button>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between p-3 border rounded">
                          <div>
                            <p className="font-medium">December 2024</p>
                            <p className="text-sm text-muted-foreground">$29.00</p>
                          </div>
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CollapsibleContent>
            </Collapsible>

            {/* Help & Support */}
            <Collapsible 
              open={openSection === "support"} 
              onOpenChange={(open) => setOpenSection(open ? "support" : null)}
            >
              <CollapsibleTrigger asChild>
                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="flex items-center justify-between p-6">
                    <div className="flex items-center gap-3">
                      <HelpCircle className="h-5 w-5" />
                      <div>
                        <h3 className="font-medium">Help & Support</h3>
                        <p className="text-sm text-muted-foreground">Get help and contact support</p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 transition-transform duration-200 data-[state=open]:rotate-90" />
                  </CardContent>
                </Card>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4">
                <Card>
                  <CardContent className="p-6 space-y-6">
                    <div className="space-y-4">
                      <h4 className="font-medium">Documentation</h4>
                      <div className="grid gap-2">
                        <Button variant="outline" className="justify-start">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Writing Better Prompts
                        </Button>
                        <Button variant="outline" className="justify-start">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Troubleshooting Guide
                        </Button>
                        <Button variant="outline" className="justify-start">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          System Status
                        </Button>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <h4 className="font-medium">Contact Support</h4>
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label htmlFor="subject">Subject</Label>
                          <Input id="subject" placeholder="Describe your issue" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="message">Message</Label>
                          <Textarea 
                            id="message" 
                            placeholder="Please describe your issue in detail..."
                            rows={4}
                          />
                        </div>
                        <Button>
                          <MessageCircle className="h-4 w-4 mr-2" />
                          Send Message
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>

        {/* Edit Profile Modal/Panel */}
        {isEditingProfile && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Edit Profile</CardTitle>
              <CardDescription>Update your personal information and security settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col items-center space-y-4">
                <Avatar className="w-24 h-24">
                  <AvatarImage src={user.user_metadata?.avatar_url} />
                  <AvatarFallback className="text-lg">
                    {user.user_metadata?.name?.[0] || user.email?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Camera className="h-4 w-4 mr-2" />
                    Webcam
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input 
                    id="displayName" 
                    defaultValue={user.user_metadata?.name || ""} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    defaultValue={user.email || ""} 
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="profession">Profession</Label>
                <Input 
                  id="profession" 
                  defaultValue={user.user_metadata?.profession || ""} 
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Security</h4>
                <div className="flex flex-col gap-2">
                  <Button variant="outline">
                    <Lock className="h-4 w-4 mr-2" />
                    Change Password
                  </Button>
                  <Button variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Sign Out Everywhere
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSaveProfile}>
                  Save Changes
                </Button>
                <Button variant="outline" onClick={() => setIsEditingProfile(false)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sign Out Button */}
        <div className="mt-8 pt-6 border-t">
          <Button variant="destructive" onClick={handleSignOut} className="w-full sm:w-auto">
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Account;