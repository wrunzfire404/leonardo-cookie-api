import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class LeonardoClient {
  constructor() {
    this.accounts = [];
    this.currentIndex = 0;
    this.cookiesPath = process.env.LEONARDO_COOKIES_PATH || '../../leonardo_cookies.json';
    this.loadCookies();
  }

  loadCookies() {
    try {
      const cookiesFile = path.resolve(__dirname, this.cookiesPath);
      const data = fs.readFileSync(cookiesFile, 'utf8');
      this.accounts = JSON.parse(data);
      
      if (this.accounts.length === 0) {
        throw new Error('No Leonardo accounts found');
      }
      
      console.log(`✅ Loaded ${this.accounts.length} Leonardo accounts (cookie-based)`);
      this.accounts.forEach((acc, i) => {
        console.log(`   ${i + 1}. ${acc.email}`);
      });
    } catch (error) {
      console.error('❌ Failed to load leonardo_cookies.json:', error.message);
      this.accounts = [];
    }
  }

  getNextAccount() {
    if (this.accounts.length === 0) {
      throw new Error('No Leonardo accounts available');
    }

    const account = this.accounts[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.accounts.length;
    
    console.log(`🔄 Using account: ${account.email}`);
    return account;
  }

  buildCookieHeader(cookies) {
    return Object.entries(cookies)
      .map(([key, value]) => `${key}=${value}`)
      .join('; ');
  }

  async graphqlRequest(query, variables = {}, retries = 3) {
    let lastError;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const account = this.getNextAccount();
        const cookieHeader = this.buildCookieHeader(account.cookies);
        
        const response = await axios.post(
          'https://cloud.leonardo.ai/api/graphql',
          {
            query,
            variables
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Cookie': cookieHeader,
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Origin': 'https://cloud.leonardo.ai',
              'Referer': 'https://cloud.leonardo.ai/'
            }
          }
        );

        if (response.data.errors) {
          throw new Error(response.data.errors[0].message);
        }

        return {
          success: true,
          data: response.data.data,
          account: account.email
        };
      } catch (error) {
        lastError = error;
        console.error(`❌ Request failed (attempt ${attempt + 1}/${retries}):`, error.message);
        
        // If rate limited or auth error, try next account
        if (error.response?.status === 429 || error.response?.status === 401) {
          console.log('⚠️ Rate limited or unauthorized, trying next account...');
          continue;
        }
        
        // For other errors, throw immediately
        throw error;
      }
    }

    throw lastError;
  }

  // Generate Image
  async generateImage(params) {
    const {
      prompt,
      modelId = 'b24e16ff-06e3-43eb-8d33-4416c2d75876', // Phoenix
      width = 1024,
      height = 1024,
      num_images = 1,
      guidance_scale = 7,
      negative_prompt = ''
    } = params;

    const query = `
      mutation CreateSDGenerationJob($arg1: SDGenerationInput!) {
        sdGenerationJob(arg1: $arg1) {
          generationId
          apiCreditCost
        }
      }
    `;

    const variables = {
      arg1: {
        prompt,
        modelId,
        width,
        height,
        num_images,
        guidance_scale,
        negative_prompt,
        sd_version: 'PHOENIX',
        presetStyle: 'DYNAMIC'
      }
    };

    return await this.graphqlRequest(query, variables);
  }

  // Get Generation Status
  async getGeneration(generationId) {
    const query = `
      query GetGeneration($id: ID!) {
        generations_by_pk(id: $id) {
          id
          status
          generated_images {
            id
            url
            likeCount
          }
          createdAt
          prompt
          negativePrompt
          imageHeight
          imageWidth
          inferenceSteps
          seed
          public
          scheduler
          sdVersion
          modelId
        }
      }
    `;

    const variables = {
      id: generationId
    };

    return await this.graphqlRequest(query, variables);
  }

  // Get User Info
  async getUserInfo() {
    const query = `
      query GetUserInfo {
        me {
          id
          username
          user_details {
            tokenRenewalDate
            subscriptionTokens
            subscriptionGptTokens
            subscriptionModelTokens
            apiConcurrencySlots
          }
        }
      }
    `;

    return await this.graphqlRequest(query);
  }

  // Get Available Models
  getAvailableModels() {
    return [
      { 
        id: 'b24e16ff-06e3-43eb-8d33-4416c2d75876', 
        name: 'Phoenix', 
        type: 'image',
        description: 'High quality, versatile model'
      },
      { 
        id: '291be633-cb24-434f-898f-e662799936ad', 
        name: 'Leonardo Diffusion XL', 
        type: 'image',
        description: 'Classic Leonardo style'
      },
      { 
        id: 'aa77f04e-3eec-4034-9c07-d0f619684628', 
        name: 'Kino XL', 
        type: 'image',
        description: 'Cinematic, photorealistic'
      },
      { 
        id: 'd69c8273-6b17-4a30-a13e-d6637ae1c644', 
        name: 'Anime XL', 
        type: 'image',
        description: 'Anime and manga style'
      },
      { 
        id: 'ac614f96-1082-45bf-be9d-757f2d31c174', 
        name: 'Leonardo Creative', 
        type: 'image',
        description: 'Creative and artistic'
      }
    ];
  }

  // Helper: Get Model ID by name
  getModelIdByName(modelName) {
    const models = {
      'phoenix': 'b24e16ff-06e3-43eb-8d33-4416c2d75876',
      'leonardo-diffusion': '291be633-cb24-434f-898f-e662799936ad',
      'leonardo-creative': 'ac614f96-1082-45bf-be9d-757f2d31c174',
      'kino-xl': 'aa77f04e-3eec-4034-9c07-d0f619684628',
      'anime-xl': 'd69c8273-6b17-4a30-a13e-d6637ae1c644'
    };

    return models[modelName] || models['phoenix'];
  }
}

export default new LeonardoClient();
