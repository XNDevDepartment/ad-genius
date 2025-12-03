import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user's JWT
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // User client for verification
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    // Admin client for deletion operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;
    const userEmail = user.email;
    console.log(`Starting account deletion for user: ${userId}`);

    // Delete user data from all related tables
    const deletionTasks = [
      // Image-related
      supabaseAdmin.from('generated_images').delete().eq('user_id', userId),
      supabaseAdmin.from('ugc_images').delete().eq('user_id', userId),
      supabaseAdmin.from('image_jobs').delete().eq('user_id', userId),
      supabaseAdmin.from('image_favorites').delete().eq('user_id', userId),
      supabaseAdmin.from('source_images').delete().eq('user_id', userId),
      
      // Outfit swap related
      supabaseAdmin.from('outfit_swap_results').delete().eq('user_id', userId),
      supabaseAdmin.from('outfit_swap_jobs').delete().eq('user_id', userId),
      supabaseAdmin.from('outfit_swap_batches').delete().eq('user_id', userId),
      supabaseAdmin.from('outfit_swap_ecommerce_photos').delete().eq('user_id', userId),
      supabaseAdmin.from('outfit_swap_photoshoots').delete().eq('user_id', userId),
      
      // Video related
      supabaseAdmin.from('kling_jobs').delete().eq('user_id', userId),
      
      // Conversations
      supabaseAdmin.from('conversation_messages').delete().in('conversation_id', 
        supabaseAdmin.from('conversations').select('id').eq('user_id', userId)
      ),
      supabaseAdmin.from('conversations').delete().eq('user_id', userId),
      
      // Account data
      supabaseAdmin.from('credits_transactions').delete().eq('user_id', userId),
      supabaseAdmin.from('promo_code_redemptions').delete().eq('user_id', userId),
      supabaseAdmin.from('notification_preferences').delete().eq('user_id', userId),
      supabaseAdmin.from('user_preferences').delete().eq('user_id', userId),
      supabaseAdmin.from('support_tickets').delete().eq('user_id', userId),
      supabaseAdmin.from('subscribers').delete().eq('user_id', userId),
      supabaseAdmin.from('user_roles').delete().eq('user_id', userId),
    ];

    // Execute all deletions
    const results = await Promise.allSettled(deletionTasks);
    
    // Log any errors but continue
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`Deletion task ${index} failed:`, result.reason);
      }
    });

    // Delete storage files
    const storageBuckets = ['generated-images', 'ugc', 'ugc-inputs', 'videos', 'outfit-user-models'];
    for (const bucket of storageBuckets) {
      try {
        // List files in user's folder
        const { data: files } = await supabaseAdmin.storage
          .from(bucket)
          .list(userId);
        
        if (files && files.length > 0) {
          const filePaths = files.map(f => `${userId}/${f.name}`);
          await supabaseAdmin.storage.from(bucket).remove(filePaths);
          console.log(`Deleted ${files.length} files from ${bucket}`);
        }
      } catch (e) {
        console.error(`Failed to delete files from ${bucket}:`, e);
      }
    }

    // Delete profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId);
    
    if (profileError) {
      console.error('Failed to delete profile:', profileError);
    }

    // Unsubscribe from MailerLite if configured
    try {
      const mailerliteApiKey = Deno.env.get('MAILERLITE_API_KEY');
      if (mailerliteApiKey && userEmail) {
        const response = await fetch(
          `https://connect.mailerlite.com/api/subscribers/${userEmail}`,
          {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${mailerliteApiKey}`,
              'Content-Type': 'application/json',
            },
          }
        );
        console.log('MailerLite unsubscribe response:', response.status);
      }
    } catch (e) {
      console.error('Failed to unsubscribe from MailerLite:', e);
    }

    // Delete the auth user (this must be done last)
    const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    
    if (deleteUserError) {
      console.error('Failed to delete auth user:', deleteUserError);
      return new Response(
        JSON.stringify({ error: 'Failed to delete account. Please contact support.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Account deletion completed for user: ${userId}`);
    
    return new Response(
      JSON.stringify({ success: true, message: 'Account deleted successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Delete account error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
