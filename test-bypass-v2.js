import { gotScraping } from 'got-scraping';
import fs from 'fs';

async function testBypass() {
  try {
    const accounts = JSON.parse(fs.readFileSync('/app/leonardo_cookies.json', 'utf8'));
    console.log(`✅ Loaded ${accounts.length} accounts\n`);
    
    const account = accounts[0];
    console.log(`🧪 Testing: ${account.email}`);
    
    const cookieHeader = Object.entries(account.cookies)
      .map(([key, value]) => `${key}=${value}`)
      .join('; ');
    
    const query = `query GetUserInfo { me { id username user_details { subscriptionTokens } } }`;
    
    console.log('📡 Sending request...\n');
    
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
    
    console.log('Response status:', response.statusCode);
    console.log('Response body:', JSON.stringify(response.body, null, 2));
    
    const data = response.body;
    
    if (!data || !data.data) {
      console.error('❌ Invalid response structure');
      return false;
    }
    
    if (data.errors) {
      console.error('❌ GraphQL Error:', data.errors[0].message);
      return false;
    }
    
    if (!data.data.me) {
      console.error('❌ No user data - cookie might be invalid');
      return false;
    }
    
    console.log('\n✅ SUCCESS!');
    console.log('User ID:', data.data.me.id);
    console.log('Username:', data.data.me.username || 'N/A');
    console.log('Tokens:', data.data.me.user_details.subscriptionTokens);
    return true;
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    if (error.response) {
      console.log('Status:', error.response.statusCode);
      console.log('Body:', typeof error.response.body === 'string' 
        ? error.response.body.substring(0, 300) 
        : JSON.stringify(error.response.body).substring(0, 300));
    }
    return false;
  }
}

testBypass().then(success => process.exit(success ? 0 : 1));
