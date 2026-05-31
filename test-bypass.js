import { gotScraping } from 'got-scraping';
import fs from 'fs';

async function testWithBypass() {
  try {
    const accounts = JSON.parse(fs.readFileSync('/app/leonardo_cookies.json', 'utf8'));
    console.log(`✅ Loaded ${accounts.length} accounts\n`);
    
    const account = accounts[0];
    console.log(`🧪 Testing: ${account.email}`);
    
    const cookieHeader = Object.entries(account.cookies)
      .map(([key, value]) => `${key}=${value}`)
      .join('; ');
    
    const query = `query GetUserInfo { me { id username user_details { subscriptionTokens } } }`;
    
    console.log('📡 Sending with got-scraping (Cloudflare bypass)...\n');
    
    const response = await gotScraping({
      url: 'https://cloud.leonardo.ai/api/graphql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader,
        'Origin': 'https://cloud.leonardo.ai',
        'Referer': 'https://cloud.leonardo.ai/personal-feed'
      },
      body: JSON.stringify({ query }),
      responseType: 'json',
      timeout: { request: 15000 }
    });
    
    const data = response.body;
    
    if (data.errors) {
      console.error('❌ GraphQL Error:', data.errors[0].message);
      return false;
    }
    
    console.log('✅ SUCCESS! Cloudflare bypassed!');
    console.log('User:', data.data.me);
    console.log(`💰 Tokens: ${data.data.me.user_details.subscriptionTokens}`);
    return true;
    
  } catch (error) {
    console.error('\n❌ FAILED:', error.message);
    if (error.response) {
      console.log('Status:', error.response.statusCode);
      console.log('Body:', error.response.body?.substring(0, 200));
    }
    return false;
  }
}

testWithBypass().then(success => process.exit(success ? 0 : 1));
