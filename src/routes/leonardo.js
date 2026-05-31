import express from 'express';
import pool from '../config/database.js';
import { apiKeyMiddleware } from '../middleware/apiKey.js';
import leonardoClient from '../leonardo/client.js';

const router = express.Router();

// Generate Image
router.post('/generate', apiKeyMiddleware, async (req, res) => {
  try {
    const {
      prompt,
      model = 'phoenix',
      width = 1024,
      height = 1024,
      num_images = 1,
      guidance_scale = 7,
      negative_prompt = ''
    } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Get model ID
    const modelId = leonardoClient.getModelIdByName(model);

    // Generate image via Leonardo (cookie-based)
    const result = await leonardoClient.generateImage({
      prompt,
      modelId,
      width,
      height,
      num_images,
      guidance_scale,
      negative_prompt
    });

    if (!result.success) {
      return res.status(500).json({ error: 'Generation failed' });
    }

    // Save to database
    const generation = await pool.query(
      `INSERT INTO generations 
       (api_key_id, leonardo_generation_id, leonardo_account, type, prompt, model, status, metadata) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING *`,
      [
        req.apiKey.id,
        result.data.sdGenerationJob?.generationId,
        result.account,
        'image',
        prompt,
        model,
        'processing',
        JSON.stringify({ 
          width, 
          height, 
          num_images, 
          guidance_scale,
          modelId,
          apiCreditCost: result.data.sdGenerationJob?.apiCreditCost
        })
      ]
    );

    res.json({
      success: true,
      generation: {
        id: generation.rows[0].id,
        leonardo_id: result.data.sdGenerationJob?.generationId,
        status: 'processing',
        account: result.account,
        cost: result.data.sdGenerationJob?.apiCreditCost
      },
      message: 'Image generation started. Use /api/generation/:id to check status.'
    });
  } catch (error) {
    console.error('Generate image error:', error);
    res.status(500).json({ 
      error: 'Generation failed',
      message: error.message 
    });
  }
});

// Get Generation Status
router.get('/generation/:id', apiKeyMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    // Get from database
    const result = await pool.query(
      'SELECT * FROM generations WHERE id = $1 AND api_key_id = $2',
      [id, req.apiKey.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Generation not found' });
    }

    const generation = result.rows[0];

    // If still processing, check Leonardo status
    if (generation.status === 'processing' && generation.leonardo_generation_id) {
      try {
        const leonardoResult = await leonardoClient.getGeneration(generation.leonardo_generation_id);
        
        if (leonardoResult.success) {
          const leonardoGen = leonardoResult.data.generations_by_pk;
          
          if (leonardoGen.status === 'COMPLETE') {
            // Update database
            const imageUrl = leonardoGen.generated_images?.[0]?.url;
            await pool.query(
              `UPDATE generations 
               SET status = $1, result_url = $2, completed_at = CURRENT_TIMESTAMP 
               WHERE id = $3`,
              ['completed', imageUrl, id]
            );
            
            generation.status = 'completed';
            generation.result_url = imageUrl;
          } else if (leonardoGen.status === 'FAILED') {
            await pool.query(
              `UPDATE generations 
               SET status = $1, error = $2, completed_at = CURRENT_TIMESTAMP 
               WHERE id = $3`,
              ['failed', 'Generation failed', id]
            );
            
            generation.status = 'failed';
            generation.error = 'Generation failed';
          }
        }
      } catch (error) {
        console.error('Error checking Leonardo status:', error);
      }
    }

    res.json({
      generation: {
        id: generation.id,
        type: generation.type,
        prompt: generation.prompt,
        model: generation.model,
        status: generation.status,
        result_url: generation.result_url,
        error: generation.error,
        account: generation.leonardo_account,
        created_at: generation.created_at,
        completed_at: generation.completed_at
      }
    });
  } catch (error) {
    console.error('Get generation error:', error);
    res.status(500).json({ error: 'Failed to get generation' });
  }
});

// Get Available Models
router.get('/models', apiKeyMiddleware, (req, res) => {
  res.json({
    models: leonardoClient.getAvailableModels()
  });
});

// Get User Info (test cookies)
router.get('/test-cookies', apiKeyMiddleware, async (req, res) => {
  try {
    const result = await leonardoClient.getUserInfo();
    
    res.json({
      success: true,
      account: result.account,
      user: result.data.me
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get user info',
      message: error.message
    });
  }
});

export default router;
