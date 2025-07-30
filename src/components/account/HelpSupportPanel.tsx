import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, HelpCircle, MessageCircle, Book, ExternalLink, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useState } from "react";

interface HelpSupportPanelProps {
  onClose: () => void;
}

export const HelpSupportPanel = ({ onClose }: HelpSupportPanelProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    subject: '',
    message: '',
    category: 'general',
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmitTicket = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to submit a support ticket.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.subject.trim() || !formData.message.trim()) {
      toast({
        title: "Missing information",
        description: "Please fill in both subject and message fields.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Create support ticket
      const { error: ticketError } = await supabase
        .from('support_tickets')
        .insert({
          user_id: user.id,
          subject: formData.subject.trim(),
          message: formData.message.trim(),
          category: formData.category,
          status: 'open'
        });

      if (ticketError) {
        console.error('Error creating support ticket:', ticketError);
        toast({
          title: "Error",
          description: "Failed to submit support ticket. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Send confirmation email
      try {
        await supabase.functions.invoke('send-email', {
          body: {
            subject: `Support Ticket Created: ${formData.subject}`,
            html: `
              <h2>Support Ticket Creation</h2>
              <p>A user has created a support ticket.</p>
              <hr>
              <h3>User Details:</h3>
              <strong>Name:</strong> ${user.user_metadata?.name}</p>
              <strong>Email:</strong> ${user.email}</p>
              <hr>
              <h3>Ticket Details:</h3>
              <p><strong>Subject:</strong> ${formData.subject}</p>
              <p><strong>Category:</strong> ${formData.category}</p>
              <p><strong>Message:</strong></p>
              <p>${formData.message.replace(/\n/g, '<br>')}</p>
            `,
            type: 'support'
          }
        });
      } catch (emailError) {
        console.error('Error sending confirmation email:', emailError);
        // Don't fail the ticket creation if email fails
      }

      toast({
        title: "Ticket submitted",
        description: "Your support ticket has been created successfully. We'll get back to you soon!",
      });

      // Reset form
      setFormData({
        subject: '',
        message: '',
        category: 'general',
      });

    } catch (error) {
      console.error('Error submitting support ticket:', error);
      toast({
        title: "Error",
        description: "Failed to submit support ticket. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
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
            <Input 
              id="subject" 
              placeholder="Brief description of your issue" 
              value={formData.subject}
              onChange={(e) => handleInputChange('subject', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="technical">Technical Issue</SelectItem>
                <SelectItem value="billing">Billing Question</SelectItem>
                <SelectItem value="feature">Feature Request</SelectItem>
                <SelectItem value="account">Account Help</SelectItem>
                <SelectItem value="general">General</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              placeholder="Please describe your issue in detail..."
              rows={4}
              value={formData.message}
              onChange={(e) => handleInputChange('message', e.target.value)}
            />
          </div>

          <Button onClick={handleSubmitTicket} className="w-full" disabled={isSubmitting}>
            <Send className="h-4 w-4 mr-2" />
            {isSubmitting ? "Submitting..." : "Submit Ticket"}
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