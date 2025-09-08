import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  launchId: string;
  templateId: string;
  emailType: string;
  stores: any[];
  devices: any[];
  recipients: {
    director: boolean;
    telefonia: boolean;
    informatica: boolean;
  };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: EmailRequest = await req.json();
    console.log("Received email request:", body);

    // Fetch email template
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('id', body.templateId)
      .single();

    if (templateError || !template) {
      throw new Error('Template not found');
    }

    // Fetch launch details
    const { data: launch, error: launchError } = await supabase
      .from('launches')
      .select('*')
      .eq('id', body.launchId)
      .single();

    if (launchError || !launch) {
      throw new Error('Launch not found');
    }

    const results = [];

    for (const store of body.stores) {
      // Collect email addresses
      const emailAddresses = [];
      
      if (body.recipients.director && store.director_email) {
        emailAddresses.push(store.director_email);
      }
      
      if (body.recipients.telefonia && store.email_technical) {
        emailAddresses.push(...store.email_technical);
      }
      
      if (body.recipients.informatica && store.email_informatics) {
        emailAddresses.push(...store.email_informatics);
      }

      if (emailAddresses.length === 0) {
        console.log(`No email addresses found for store ${store.name}`);
        continue;
      }

      // Process template placeholders
      let processedSubject = template.subject;
      let processedContent = template.content;

      // Get tactician name if available
      let tacticianName = "Non assegnato";
      const { data: launchStore } = await supabase
        .from('launch_stores')
        .select('tactician_id, visit_date, visit_time')
        .eq('launch_id', body.launchId)
        .eq('store_id', store.id)
        .single();

      if (launchStore?.tactician_id) {
        const { data: tactician } = await supabase
          .from('tacticians')
          .select('name')
          .eq('id', launchStore.tactician_id)
          .single();
        if (tactician) tacticianName = tactician.name;
      }

      // Get visit date if available
      let visitDate = "Da definire";
      if (launchStore?.visit_date) {
        visitDate = new Date(launchStore.visit_date).toLocaleDateString('it-IT');
      }

      // Generate orario installazione content
      let orarioInstallazioneContent = '';
      if (launchStore?.visit_time) {
        const visitTime = launchStore.visit_time;
        const [hours] = visitTime.split(':').map(Number);
        
        if (hours < 13) {
          orarioInstallazioneContent = "Il tattico arriverà in apertura, qualora ci sia vostra disponibilà di far entrare il tattico 30 minuti prima dell'apertura vi chiederei di farmelo sapere rispondendo a questa mail per verificare la disponibilità.";
        } else if (hours >= 14) {
          orarioInstallazioneContent = "Il tattico arriverà tra le 16:00 e le 18:00 per predisporre quanto possibile. Si ricorda tuttavia che, come in ogni lancio, i nuovi prodotti non potranno essere esposti prima della chiusura al pubblico in quanto ancora in embargo; <strong>sarà pertanto richiesta la disponibilità fino a un'ora dopo la chiusura</strong>.";
        }
      }

      // Replace placeholders with actual values - Memory optimized version
      console.log(`Processing email for store: ${store.name}, emailType: ${body.emailType}`);
      
      let tipologiaCartelliContent = '';
      if (body.emailType === 'cartelli') {
        // Create a clean slug from store name
        const storeSlug = store.name.toLowerCase()
          .replace(/[^a-z0-9\s]/g, '') // Remove special characters except spaces
          .replace(/\s+/g, '-')        // Replace spaces with hyphens
          .replace(/-+/g, '-')         // Replace multiple hyphens with single
          .replace(/^-|-$/g, '');      // Remove leading/trailing hyphens
        
        const launchSlug = launch?.name?.toLowerCase()
          .replace(/[^a-z0-9\s]/g, '') // Remove special characters except spaces
          .replace(/\s+/g, '-')        // Replace spaces with hyphens
          .replace(/-+/g, '-')         // Replace multiple hyphens with single
          .replace(/^-|-$/g, '') || 'unknown';
          
        const cartelliLink = `https://merch.pietrof.it/cartelli_prezzo/${launchSlug}/${storeSlug}`;
        tipologiaCartelliContent = `Link per scaricare i cartelli prezzo: <a href="${cartelliLink}" target="_blank" style="color: #007bff; text-decoration: underline;">${cartelliLink}</a>`;
      }
      
      // Memory-efficient single-pass replacement
      const placeholders = {
        '[nome_lancio]': launch.name || '',
        '[motivo_mail]': body.emailType === 'cartelli' ? 'Cartelli prezzo' : 'Nominativo Tattico e Data installazione',
        '[data_visita]': `<strong>${visitDate}</strong>`,
        '[nome_tattico]': `<strong>${tacticianName}</strong>`,
        '[orario_installazione]': orarioInstallazioneContent,
        '[nome_store]': store.name || '',
        '[indirizzo_store]': store.location || '',
        '[tipologia_invio_cartelli]': tipologiaCartelliContent,
        '[prodotti_lancio]': body.devices.slice(0, 10).map(d => `- ${d.name} (${d.color})`).join('\n'), // Limit devices
        // Fallback per vecchi placeholder
        '{{store.name}}': store.name || '',
        '{{store.location}}': store.location || '',
        '{{store.chain}}': store.chain || '',
        '{{launch.name}}': launch.name || '',
        '{{launch.description}}': (launch.description || '').substring(0, 500), // Limit description length
        '{{devices.count}}': Math.min(body.devices.length, 10).toString(), // Limit count
        '{{devices.list}}': body.devices.slice(0, 5).map(d => d.name).join(', ') // Limit device list
      };

      // Single regex replacement to reduce memory usage
      const placeholderPattern = new RegExp(Object.keys(placeholders).map(key => 
        key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      ).join('|'), 'g');

      processedSubject = template.subject.replace(placeholderPattern, (match) => placeholders[match] || match);
      processedContent = template.content.replace(placeholderPattern, (match) => placeholders[match] || match);


      // Send email using SMTP settings from database
      try {
        console.log(`Processing email for ${store.name}:`, {
          to: emailAddresses,
          subject: processedSubject,
          content: processedContent.substring(0, 100) + "...",
        });

        // Fetch SMTP settings from database
        const { data: smtpSettings, error: smtpError } = await supabase
          .from('smtp_settings')
          .select('*')
          .single();

        if (smtpError || !smtpSettings) {
          throw new Error('SMTP settings not configured');
        }

        // Send email via SMTP (using fetch to a mail service API or SMTP)
        // For now, we'll use a simple approach with fetch to Gmail API or similar
        // Since Deno edge functions don't support nodemailer directly, we'll implement a basic SMTP client

        const emailPayload = {
          from: `${smtpSettings.from_name} <${smtpSettings.from_email}>`,
          to: emailAddresses,
          subject: processedSubject,
          html: processedContent
            .replace(/\n/g, '<br/>')
            .replace(/<strong>/g, '<span style="font-weight: bold; font-weight: 700;">')
            .replace(/<\/strong>/g, '</span>')
        };

        console.log('Sending email with payload:', {
          from: emailPayload.from,
          to: emailPayload.to,
          subject: emailPayload.subject
        });

        // Use SmtpClient library with timeout and better error handling
        console.log('Connecting to SMTP server:', smtpSettings.host, smtpSettings.port);
        
        let client;
        const timeout = 30000; // 30 secondi timeout
        
        try {
          client = new SmtpClient();
          
          // Wrap connection in timeout
          const connectPromise = client.connect({
            hostname: smtpSettings.host,
            port: smtpSettings.port,
            username: smtpSettings.username,
            password: smtpSettings.password,
          });

          await Promise.race([
            connectPromise,
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('SMTP connection timeout')), timeout)
            )
          ]);

          console.log('SMTP connected successfully');

          // Send email to all recipients - Apple Mail compatible version
          const emailHtml = `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>Email</title>
</head>
<body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; line-height: 1.6; color: #333333;">
    ${processedContent
      .replace(/\n/g, '<br/>')
      .replace(/<strong>/g, '<b>')
      .replace(/<\/strong>/g, '</b>')
    }
</body>
</html>`;
          
          console.log('Apple Mail compatible HTML created');
          console.log('Strong tags converted to B tags');
          console.log('Template preview (first 400 chars):', emailHtml.substring(0, 400));
            
          const sendPromise = client.send({
            from: `${smtpSettings.from_name} <${smtpSettings.from_email}>`,
            to: emailAddresses,
            subject: processedSubject,
            html: emailHtml,
          });

          await Promise.race([
            sendPromise,
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('SMTP send timeout')), timeout)
            )
          ]);

          console.log('Email sent via SMTP');

          results.push({
            store: store.name,
            emails: emailAddresses,
            success: true,
            emailId: `aruba-smtp-${Date.now()}`
          });
          
          console.log(`Email sent successfully via Aruba SMTP to ${store.name}`);
          
        } catch (error) {
          console.error('SMTP Error details:', error);
          throw error;
        } finally {
          if (client) {
            try {
              await client.close();
              console.log('SMTP connection closed');
            } catch (closeError) {
              console.error('Error closing SMTP connection:', closeError);
            }
          }
        }

      } catch (error) {
        console.error(`Error sending email to ${store.name}:`, error);
        results.push({
          store: store.name,
          emails: emailAddresses,
          success: false,
          error: error.message
        });
      }
    }

    // Update email_sent_at for successful sends
    const successfulStores = results.filter(r => r.success);
    if (successfulStores.length > 0) {
      const storeIds = body.stores
        .filter(store => successfulStores.some(s => s.store === store.name))
        .map(store => store.id);

      await supabase
        .from('launch_stores')
        .update({ email_sent_at: new Date().toISOString() })
        .eq('launch_id', body.launchId)
        .in('store_id', storeIds);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      results,
      totalSent: results.filter(r => r.success).length,
      totalFailed: results.filter(r => !r.success).length
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error in send-launch-emails function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);