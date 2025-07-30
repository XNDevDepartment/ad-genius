import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, HelpCircle, MessageCircle, Book, ExternalLink, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface HelpSupportPanelProps {
  onClose: () => void;
}

export const HelpSupportPanel = ({ onClose }: HelpSupportPanelProps) => {
  const { toast } = useToast();

  const handleSubmitTicket = () => {
    toast({
      title: "Support ticket submitted",
      description: "We'll get back to you within 24 hours.",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Help & Support</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Quick Help
          </CardTitle>
          <CardDescription>Find answers to common questions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="outline" className="w-full justify-start">
            <Book className="h-4 w-4 mr-2" />
            Getting Started Guide
            <ExternalLink className="h-4 w-4 ml-auto" />
          </Button>

          <Button variant="outline" className="w-full justify-start">
            <HelpCircle className="h-4 w-4 mr-2" />
            FAQ
            <ExternalLink className="h-4 w-4 ml-auto" />
          </Button>

          <Button variant="outline" className="w-full justify-start">
            <MessageCircle className="h-4 w-4 mr-2" />
            Video Tutorials
            <ExternalLink className="h-4 w-4 ml-auto" />
          </Button>

          <Button variant="outline" className="w-full justify-start">
            <Book className="h-4 w-4 mr-2" />
            API Documentation
            <ExternalLink className="h-4 w-4 ml-auto" />
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Contact Support
          </CardTitle>
          <CardDescription>Send us a message and we'll help you out</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input id="subject" placeholder="Brief description of your issue" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="technical">Technical Issue</SelectItem>
                <SelectItem value="billing">Billing Question</SelectItem>
                <SelectItem value="feature">Feature Request</SelectItem>
                <SelectItem value="account">Account Help</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              placeholder="Please describe your issue in detail..."
              rows={4}
            />
          </div>

          <Button onClick={handleSubmitTicket} className="w-full">
            <Send className="h-4 w-4 mr-2" />
            Submit Ticket
          </Button>
        </CardContent>
      </Card>

      {/* To configure Later when launching the application */}
      {/* <Card>
        <CardHeader>
          <CardTitle>Community</CardTitle>
          <CardDescription>Connect with other users and get help</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="outline" className="w-full justify-start">
            <MessageCircle className="h-4 w-4 mr-2" />
            Discord Community
            <ExternalLink className="h-4 w-4 ml-auto" />
          </Button>

          <Button variant="outline" className="w-full justify-start">
            <MessageCircle className="h-4 w-4 mr-2" />
            Reddit Community
            <ExternalLink className="h-4 w-4 ml-auto" />
          </Button>

          <Button variant="outline" className="w-full justify-start">
            <MessageCircle className="h-4 w-4 mr-2" />
            User Forum
            <ExternalLink className="h-4 w-4 ml-auto" />
          </Button>
        </CardContent>
      </Card> */}

      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
          <CardDescription>Other ways to reach us</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm">Email Support</span>
            <span className="text-sm text-muted-foreground">manager@formulaxn.com</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm">Business Hours</span>
            <span className="text-sm text-muted-foreground">9 AM - 6 PM ECT</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm">Response Time</span>
            <span className="text-sm text-muted-foreground">Within 24 hours</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};