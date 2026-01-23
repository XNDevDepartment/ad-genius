import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CompensationEmailRequest {
  user_id: string;
  email: string;
  credits_added: number;
  new_balance: number;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, email, credits_added, new_balance }: CompensationEmailRequest = await req.json();

    console.log(`[send-compensation-email] Sending to ${email}, credits: ${credits_added}`);

    const emailResponse = await resend.emails.send({
      from: "ProduktPix <noreply@produktpix.com>",
      to: [email],
      subject: "Os seus créditos foram restaurados 🎉",
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .card { background: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .logo { text-align: center; margin-bottom: 30px; }
    .logo img { height: 40px; }
    h1 { color: #1a1a1a; font-size: 24px; margin-bottom: 20px; }
    .highlight { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; margin: 24px 0; }
    .highlight .number { font-size: 36px; font-weight: bold; }
    .highlight .label { font-size: 14px; opacity: 0.9; }
    .balance { background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 16px; text-align: center; margin: 20px 0; }
    .balance .label { color: #166534; font-size: 14px; }
    .balance .amount { color: #166534; font-size: 24px; font-weight: bold; }
    .cta { text-align: center; margin: 30px 0; }
    .cta a { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block; }
    .signature { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e5e5; }
    .signature-name { font-weight: 600; color: #1a1a1a; }
    .signature-title { color: #666; font-size: 14px; }
    .footer { text-align: center; margin-top: 30px; color: #999; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="logo">
        <img src="https://produktpix.com/logo.png" alt="ProduktPix" style="height: 40px;">
      </div>
      
      <h1>Olá! 👋</h1>
      
      <p>Espero que esteja tudo bem consigo!</p>
      
      <p>Estou a contactá-lo pessoalmente para informar que detetámos um problema técnico no nosso sistema que impediu a atribuição automática de créditos mensais a alguns dos nossos utilizadores.</p>
      
      <p>Após uma análise detalhada, verificámos que a sua conta foi afetada. <strong>Pedimos sinceras desculpas por este inconveniente.</strong></p>
      
      <p>A boa notícia é que já corrigimos o problema e <strong>restaurámos todos os créditos que lhe eram devidos:</strong></p>
      
      <div class="highlight">
        <div class="number">+${credits_added}</div>
        <div class="label">créditos adicionados à sua conta</div>
      </div>
      
      <div class="balance">
        <div class="label">O seu saldo atual é de</div>
        <div class="amount">${new_balance} créditos</div>
      </div>
      
      <p>Estes créditos já estão disponíveis para utilização imediata. Pode começar a criar as suas imagens e vídeos de produto agora mesmo!</p>
      
      <div class="cta">
        <a href="https://ad-genius.lovable.app/create-ugc">Começar a Criar →</a>
      </div>
      
      <p>Se tiver alguma dúvida ou precisar de ajuda, não hesite em responder a este email. Estou pessoalmente disponível para ajudar.</p>
      
      <p>Obrigado pela sua compreensão e por fazer parte da comunidade ProduktPix!</p>
      
      <div class="signature">
        <div class="signature-name">Francisco Forte</div>
        <div class="signature-title">Co-Fundador & Manager, ProduktPix</div>
      </div>
    </div>
    
    <div class="footer">
      <p>ProduktPix - Transforme os seus produtos em conteúdo profissional com IA</p>
      <p>© 2024 ProduktPix. Todos os direitos reservados.</p>
    </div>
  </div>
</body>
</html>
      `,
    });

    console.log(`[send-compensation-email] Email sent successfully to ${email}:`, emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("[send-compensation-email] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
