const axios = require('axios');
const fs = require('fs');

async function testLeonardoCookies() {
  try {
    // Load cookies
    const accounts = JSON.parse(fs.readFileSync('/app/leonardo_cookies.json', 'utf8'));
    console.log(`✅ Loaded ${accounts.length} accounts`);
    
    // Test first account
    const account = accounts[0];
    console.log(`\n🧪 Testing account: ${account.email}`);
    
    // Build cookie header
    const cookieHeader = Object.entries(account.cookies)
      .map(([key, value]) => `${key}=${value}`)
      .join('; ');
    
    console.log(`🍪 Cookie header length: ${cookieHeader.length} chars`);
    
    // Test GraphQL query - Get user info
    const query = `
      query GetUserInfo {
        me {
          id
          username
          user_details {
            tokenRenewalDate
            subscriptionTokens
            subscriptionGptTokens
            apiConcurrencySlots
          }
        }
      }
    `;
    
    console.log('\n📡 Sending GraphQL request to Leonardo...');
    
    const response = await axios.post(
      'https://cloud.leonardo.ai/api/graphql',
      { query },
      {
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookieHeader,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Origin': 'https://cloud.leonardo.ai',
          'Referer': 'https://cloud.leonardo.ai/'
        },
        timeout: 10000
      }
    );
    
    if (response.data.errors) {
      console.error('❌ GraphQL Error:', response.data.errors[0].message);
      return false;
    }
    
    const user = response.data.data.me;
    console.log('\n✅ SUCCESS! Cookie is valid!');
    console.log(`👤 User ID: ${user.id}`);
    console.log(`👤 Username: ${user.username || 'N/A'}`);
    console.log(`💰 Tokens: ${user.user_details.subscriptionTokens}`);
    console.log(`🎨 API Slots: ${user.user_details.apiConcurrencySlots}`);
    
    return true;
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data).substring(0, 200));
    }
    return false;
  }
}

testLeonardoCookies()
  .then(success => process.exit(success ? 0 : 1))
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
