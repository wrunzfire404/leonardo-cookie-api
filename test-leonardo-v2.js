import axios from 'axios';
import fs from 'fs';

async function testLeonardo() {
  try {
    const accounts = JSON.parse(fs.readFileSync('/app/leonardo_cookies.json', 'utf8'));
    console.log(`✅ Loaded ${accounts.length} accounts\n`);
    
    const account = accounts[0];
    console.log(`🧪 Testing: ${account.email}`);
    
    const cookieHeader = Object.entries(account.cookies)
      .map(([key, value]) => `${key}=${value}`)
      .join('; ');
    
    // Try with full browser headers
    const headers = {
      'Content-Type': 'application/json',
      'Cookie': cookieHeader,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json',
      'Accept-Language': 'en-US,en;q=0.9',
      'Origin': 'https://cloud.leonardo.ai',
      'Referer': 'https://cloud.leonardo.ai/personal-feed',
      'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"Windows"',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-origin'
    };
    
    const query = `query GetUserInfo { me { id username } }`;
    
    console.log('📡 Sending request...\n');
    
    const response = await axios.post(
      'https://cloud.leonardo.ai/api/graphql',
      { query },
      { headers, timeout: 15000 }
    );
    
    if (response.data.errors) {
      console.error('❌ GraphQL Error:', response.data.errors[0].message);
      console.log('\n⚠️  Cookie might be expired or invalid');
      return false;
    }
    
    console.log('✅ SUCCESS! Cookie works!');
    console.log('User:', response.data.data.me);
    return true;
    
  } catch (error) {
    console.error('\n❌ FAILED:', error.message);
    if (error.response) {
      console.log('Status:', error.response.status);
      if (error.response.status === 403) {
        console.log('\n⚠️  403 Forbidden - Possible causes:');
        console.log('   1. Cookies expired');
        console.log('   2. Cloudflare blocking');
        console.log('   3. Account logged out');
        console.log('\n💡 Solution: Get fresh cookies from browser');
      }
    }
    return false;
  }
}

testLeonardo().then(success => process.exit(success ? 0 : 1));
