import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, HelpCircle, MessageCircle, Book, ExternalLink, Send, Video, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useState } from "react";
import { useTranslation } from "react-i18next";

interface HelpSupportPanelProps {
  onClose: () => void;
}

export const HelpSupportPanel = ({ onClose }: HelpSupportPanelProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    to: '',
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
            to: "info@formulaxn.com",
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
        to: '',
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
      {/* <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">{t("account.helpSupport.title")}</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div> */}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            {t("account.helpSupport.quickHelp")}
          </CardTitle>
          <CardDescription>{t("account.helpSupport.quickHelpDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button asChild variant="outline" className="w-full justify-start">
            <Link to="/help/getting-started">
              <Book className="h-4 w-4 mr-2" />
              {t("account.helpSupport.gettingStarted")}
              <ExternalLink className="h-4 w-4 ml-auto" />
            </Link>
          </Button>

          <Button asChild variant="outline" className="w-full justify-start">
            <Link to="/help/faq">
              <HelpCircle className="h-4 w-4 mr-2" />
              {t("account.helpSupport.faq")}
              <ExternalLink className="h-4 w-4 ml-auto" />
            </Link>
          </Button>

          {/* <Button asChild variant="outline" className="w-full justify-start">
            <Link to="/help/tutorials">
              <Video className="h-4 w-4 mr-2" />
              Video Tutorials
              <ExternalLink className="h-4 w-4 ml-auto" />
            </Link>
          </Button>

          <Button asChild variant="outline" className="w-full justify-start">
            <Link to="/help/api-docs">
              <FileText className="h-4 w-4 mr-2" />
              API Documentation
              <ExternalLink className="h-4 w-4 ml-auto" />
            </Link>
          </Button> */}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            {t("account.helpSupport.contactSupport")}
          </CardTitle>
          <CardDescription>{t("account.helpSupport.contactSupportDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subject">{t("account.helpSupport.subject")}</Label>
            <Input 
              id="subject" 
              placeholder={t("account.helpSupport.subjectPlaceholder")} 
              value={formData.subject}
              onChange={(e) => handleInputChange('subject', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">{t("account.helpSupport.category")}</Label>
            <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
              <SelectTrigger>
                <SelectValue placeholder={t("account.helpSupport.categoryPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="technical">{t("account.helpSupport.technical")}</SelectItem>
                <SelectItem value="billing">{t("account.helpSupport.billing")}</SelectItem>
                <SelectItem value="feature">{t("account.helpSupport.feature")}</SelectItem>
                <SelectItem value="account">{t("account.helpSupport.account")}</SelectItem>
                <SelectItem value="general">{t("account.helpSupport.general")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">{t("account.helpSupport.message")}</Label>
            <Textarea
              id="message"
              placeholder={t("account.helpSupport.messagePlaceholder")}
              rows={4}
              value={formData.message}
              onChange={(e) => handleInputChange('message', e.target.value)}
            />
          </div>

          <Button onClick={handleSubmitTicket} className="w-full" disabled={isSubmitting}>
            <Send className="h-4 w-4 mr-2" />
            {isSubmitting ? t("account.helpSupport.submitting") : t("account.helpSupport.submitTicket")}
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
          <CardTitle>{t("account.helpSupport.contactInfo")}</CardTitle>
          <CardDescription>{t("account.helpSupport.contactInfoDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm">{t("account.helpSupport.emailSupport")}</span>
            <span className="text-sm text-muted-foreground">info@producktpix.com</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm">{t("account.helpSupport.businessHours")}</span>
            <span className="text-sm text-muted-foreground">{t("account.helpSupport.businessHoursValue")}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm">{t("account.helpSupport.responseTime")}</span>
            <span className="text-sm text-muted-foreground">{t("account.helpSupport.responseTimeValue")}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};