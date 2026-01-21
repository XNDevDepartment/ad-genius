import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GRACE_PERIOD_DAYS = 21;
const DAY_7_REMINDER = 7;
const DAY_18_REMINDER = 18;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('[DUNNING] Starting dunning check job...');

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const resendApiKey = Deno.env.get("RESEND_API_KEY");

  try {
    // Get all users with past_due status (payment_failed_at is set)
    const { data: pastDueUsers, error: fetchError } = await supabase
      .from("subscribers")
      .select("user_id, payment_failed_at, subscription_tier, credits_balance, stripe_customer_id")
      .not("payment_failed_at", "is", null)
      .eq("subscription_status", "past_due");

    if (fetchError) {
      console.error('[DUNNING] Error fetching past due users:', fetchError);
      throw fetchError;
    }

    if (!pastDueUsers || pastDueUsers.length === 0) {
      console.log('[DUNNING] No past due users found');
      return new Response(JSON.stringify({ processed: 0, message: 'No past due users' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    console.log(`[DUNNING] Found ${pastDueUsers.length} past due users`);

    let processed = 0;
    let reminders = { day7: 0, day18: 0, downgraded: 0 };

    for (const user of pastDueUsers) {
      const daysSinceFailure = Math.floor(
        (Date.now() - new Date(user.payment_failed_at).getTime()) / (1000 * 60 * 60 * 24)
      );

      console.log(`[DUNNING] User ${user.user_id}: ${daysSinceFailure} days since payment failure`);

      // Get user profile for email
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, name')
        .eq('id', user.user_id)
        .single();

      if (!profile?.email) {
        console.log(`[DUNNING] No email found for user ${user.user_id}, skipping`);
        continue;
      }

      // Check existing notifications
      const { data: existingNotifications } = await supabase
        .from('dunning_notifications')
        .select('notification_type')
        .eq('user_id', user.user_id);

      const sentNotifications = new Set(existingNotifications?.map(n => n.notification_type) || []);

      // 21+ days: DOWNGRADE
      if (daysSinceFailure >= GRACE_PERIOD_DAYS) {
        console.log(`[DUNNING] User ${user.user_id} exceeded grace period, downgrading...`);

        // Update subscriber to Free tier
        const { error: downgradeError } = await supabase
          .from('subscribers')
          .update({
            subscription_status: 'canceled',
            subscription_tier: 'Free',
            subscribed: false,
            payment_failed_at: null,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.user_id);

        if (downgradeError) {
          console.error(`[DUNNING] Failed to downgrade user ${user.user_id}:`, downgradeError);
          continue;
        }

        // Record downgrade notification
        await supabase.from('dunning_notifications').upsert({
          user_id: user.user_id,
          notification_type: 'downgrade',
          sent_at: new Date().toISOString()
        }, { onConflict: 'user_id,notification_type' });

        // Send downgrade email
        if (resendApiKey) {
          await sendDowngradeEmail(resendApiKey, profile.email, profile.name, user.credits_balance);
        }

        // Sync to MailerLite
        try {
          await fetch(
            `${Deno.env.get("SUPABASE_URL")}/functions/v1/sync-mailerlite`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`
              },
              body: JSON.stringify({
                action: 'update',
                email: profile.email,
                name: profile.name || '',
                subscription_tier: 'Free',
                newsletter_subscribed: true
              })
            }
          );
        } catch (e) {
          console.error('[DUNNING] MailerLite sync failed:', e);
        }

        // Clear all dunning notifications for this user
        await supabase
          .from('dunning_notifications')
          .delete()
          .eq('user_id', user.user_id);

        reminders.downgraded++;
        processed++;
        console.log(`[DUNNING] ✓ User ${user.user_id} downgraded to Free`);
        continue;
      }

      // Day 18 reminder
      if (daysSinceFailure >= DAY_18_REMINDER && !sentNotifications.has('day_18')) {
        console.log(`[DUNNING] Sending day 18 reminder to ${user.user_id}`);

        if (resendApiKey) {
          await sendReminderEmail(resendApiKey, profile.email, profile.name, GRACE_PERIOD_DAYS - daysSinceFailure, 'final');
        }

        await supabase.from('dunning_notifications').insert({
          user_id: user.user_id,
          notification_type: 'day_18'
        });

        reminders.day18++;
        processed++;
        continue;
      }

      // Day 7 reminder
      if (daysSinceFailure >= DAY_7_REMINDER && !sentNotifications.has('day_7')) {
        console.log(`[DUNNING] Sending day 7 reminder to ${user.user_id}`);

        if (resendApiKey) {
          await sendReminderEmail(resendApiKey, profile.email, profile.name, GRACE_PERIOD_DAYS - daysSinceFailure, 'reminder');
        }

        await supabase.from('dunning_notifications').insert({
          user_id: user.user_id,
          notification_type: 'day_7'
        });

        reminders.day7++;
        processed++;
      }
    }

    console.log(`[DUNNING] ✓ Job complete. Processed: ${processed}, Day7: ${reminders.day7}, Day18: ${reminders.day18}, Downgraded: ${reminders.downgraded}`);

    return new Response(JSON.stringify({ 
      processed,
      reminders,
      message: 'Dunning job completed successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('[DUNNING] Error:', error);
    return new Response(JSON.stringify({ 
      error: 'Dunning job failed',
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function sendReminderEmail(apiKey: string, email: string, name: string | null, daysLeft: number, type: 'reminder' | 'final') {
  const isUrgent = type === 'final';
  const subject = isUrgent 
    ? `🚨 Final Notice: ${daysLeft} days to update your payment`
    : `⚠️ Payment Reminder: ${daysLeft} days remaining`;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'ProduktPix <onboarding@produktpix.com>',
      to: [email],
      subject,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #7c3aed; margin: 0;">ProduktPix</h1>
          </div>
          
          <div style="background: ${isUrgent ? '#fef2f2' : '#fffbeb'}; border: 1px solid ${isUrgent ? '#fecaca' : '#fde68a'}; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h2 style="color: ${isUrgent ? '#dc2626' : '#d97706'}; margin-top: 0;">
              ${isUrgent ? '🚨 Final Warning' : '⚠️ Payment Reminder'}
            </h2>
            <p>Hi${name ? ` ${name}` : ''},</p>
            <p>We're still unable to process your payment for your ProduktPix subscription.</p>
            <p style="font-size: 18px; font-weight: bold; color: ${isUrgent ? '#dc2626' : '#d97706'};">
              You have ${daysLeft} day${daysLeft !== 1 ? 's' : ''} left to update your payment method.
            </p>
            ${isUrgent ? '<p><strong>After this period, your account will be moved to the Free plan and you will lose access to premium features.</strong></p>' : ''}
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://produktpix.com/account" style="display: inline-block; background: #7c3aed; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Update Payment Now</a>
          </div>
          
          <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h3 style="margin-top: 0;">What you'll keep with your paid plan:</h3>
            <ul>
              <li>All your monthly credits</li>
              <li>Priority support</li>
              <li>Video generation access</li>
              <li>All premium features</li>
            </ul>
          </div>
          
          <p style="color: #6b7280; font-size: 14px;">
            Questions? Contact us at <a href="mailto:info@produktpix.com" style="color: #7c3aed;">info@produktpix.com</a>
          </p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          
          <p style="color: #9ca3af; font-size: 12px; text-align: center;">
            © ${new Date().getFullYear()} ProduktPix. All rights reserved.
          </p>
        </body>
        </html>
      `
    })
  });

  if (response.ok) {
    console.log(`[DUNNING] ✓ ${type} email sent to ${email}`);
  } else {
    console.error(`[DUNNING] Failed to send ${type} email:`, await response.text());
  }
}

async function sendDowngradeEmail(apiKey: string, email: string, name: string | null, remainingCredits: number) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'ProduktPix <onboarding@produktpix.com>',
      to: [email],
      subject: 'Your ProduktPix account has been moved to the Free plan',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #7c3aed; margin: 0;">ProduktPix</h1>
          </div>
          
          <div style="background: #f8fafc; border-radius: 12px; padding: 30px; margin-bottom: 20px;">
            <h2 style="color: #1e293b; margin-top: 0;">Account Downgraded</h2>
            <p>Hi${name ? ` ${name}` : ''},</p>
            <p>We were unable to process your payment after multiple attempts over 21 days. Your account has been moved to the Free plan.</p>
          </div>
          
          <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h3 style="color: #dc2626; margin-top: 0;">What you've lost:</h3>
            <ul style="margin-bottom: 0;">
              <li>Your monthly credit allocation</li>
              <li>Priority support access</li>
              <li>Video generation (Starter plan)</li>
              <li>Premium features</li>
            </ul>
          </div>
          
          ${remainingCredits > 0 ? `
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h3 style="color: #166534; margin-top: 0;">✨ Good news!</h3>
            <p style="margin-bottom: 0;">You still have <strong>${remainingCredits} credits</strong> remaining. These won't expire!</p>
          </div>
          ` : ''}
          
          <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h3 style="margin-top: 0;">Your Free plan includes:</h3>
            <ul style="margin-bottom: 0;">
              <li>10 credits per month</li>
              <li>Access to UGC Creator</li>
              <li>Basic support</li>
            </ul>
          </div>
          
          <div style="text-align: center; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); border-radius: 12px; padding: 30px; margin-bottom: 20px;">
            <h3 style="color: white; margin-top: 0;">Ready to upgrade again?</h3>
            <p style="color: rgba(255,255,255,0.9); margin-bottom: 20px;">Get instant access to all premium features.</p>
            <a href="https://produktpix.com/pricing" style="display: inline-block; background: white; color: #7c3aed; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Resubscribe Now</a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px;">
            Questions? Contact us at <a href="mailto:info@produktpix.com" style="color: #7c3aed;">info@produktpix.com</a>
          </p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          
          <p style="color: #9ca3af; font-size: 12px; text-align: center;">
            © ${new Date().getFullYear()} ProduktPix. All rights reserved.
          </p>
        </body>
        </html>
      `
    })
  });

  if (response.ok) {
    console.log(`[DUNNING] ✓ Downgrade email sent to ${email}`);
  } else {
    console.error(`[DUNNING] Failed to send downgrade email:`, await response.text());
  }
}
