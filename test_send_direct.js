
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSend() {
  console.log('Testing send-message...');

  // 1. Get Integration Token
  const { data: integ } = await supabase.from('integrations').select('*').eq('channel', 'instagram').single();
  if(!integ) { console.log('No integration found'); return; }

  const token = integ.credentials.access_token;
  console.log('Token starts with:', token.substring(0, 5));

  // 2. Direct Graph API Test
  // ID do log que falhou: 26004797885790441
  const recipientId = '26004797885790441';
  const text = 'Teste direto diagnóstico 123';

  const isPageToken = token.startsWith('EAA');
  const apiHost = isPageToken ? 'graph.facebook.com' : 'graph.instagram.com';
  const url = `https://${apiHost}/v21.0/me/messages`;

  console.log('Target URL:', url);

  const payload = {
    recipient: { id: recipientId },
    message: { text: text }
  };

  try {
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
    });

    const json = await res.json();
    console.log('Meta API Status:', res.status);
    console.log('Meta API Response:', JSON.stringify(json, null, 2));

  } catch(e) {
    console.error('Fetch Error:', e);
  }
}

testSend();
