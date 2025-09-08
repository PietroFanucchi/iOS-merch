import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting auto-complete visits function');

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get current date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    console.log(`Processing date: ${today}`);

    // Update expired visits to completed status
    const { data: updatedVisits, error } = await supabase
      .from('visits')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .lt('scheduled_date', today)
      .eq('status', 'scheduled')
      .select('id, store_id, scheduled_date');

    if (error) {
      console.error('Error updating visits:', error);
      throw error;
    }

    console.log(`Auto-completed ${updatedVisits?.length || 0} expired visits`);

    // Log the updated visits for debugging
    if (updatedVisits && updatedVisits.length > 0) {
      console.log('Updated visits:', updatedVisits);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Auto-completed ${updatedVisits?.length || 0} expired visits`,
        updatedVisits: updatedVisits
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in auto-complete-visits function:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});