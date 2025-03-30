/**
 * OpenAI-based Advanced Sentiment Analysis Service
 * 
 * This service provides more accurate sentiment analysis using OpenAI's language models.
 * It analyzes the emotional tone of text content and provides detailed sentiment breakdowns.
 */

import OpenAI from 'openai';
import { log } from '../vite';

// Initialize OpenAI client with API key from environment variables
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export class OpenAiSentimentService {
  private isConfigured: boolean = false;
  private isOperational: boolean = false;
  private maxBatchSize = 10; // Maximum items to analyze in one API call

  constructor() {
    this.init();
  }

  /**
   * Initialize the OpenAI service
   */
  private async init() {
    try {
      if (!process.env.OPENAI_API_KEY) {
        log('OpenAI API key not found. Sentiment analysis service not configured.', 'openai-sentiment');
        this.isConfigured = false;
        this.isOperational = false;
        return;
      }

      this.isConfigured = true;
      // Perform a simple verification to check if the API is operational
      await this.verifyApiAccess();
      log('OpenAI Sentiment Analysis Service initialized successfully', 'openai-sentiment');

    } catch (error) {
      log(`Error initializing OpenAI sentiment service: ${error}`, 'openai-sentiment');
      this.isOperational = false;
    }
  }

  /**
   * Verify API access with a simple request
   */
  private async verifyApiAccess(): Promise<boolean> {
    try {
      // Simple model verification to check API access
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: "You are a sentiment analysis assistant." },
          { role: "user", content: "Test API access" }
        ],
        max_tokens: 5
      });

      if (response) {
        this.isOperational = true;
        log('OpenAI API access verified successfully', 'openai-sentiment');
        return true;
      } else {
        this.isOperational = false;
        log('OpenAI API verification failed', 'openai-sentiment');
        return false;
      }
    } catch (error) {
      this.isOperational = false;
      log(`Error verifying OpenAI API access: ${error}`, 'openai-sentiment');
      return false;
    }
  }

  /**
   * Get service status information
   */
  public getStatus() {
    return {
      configured: this.isConfigured,
      operational: this.isOperational,
      message: this.isOperational 
        ? 'OpenAI sentiment analysis service is operational.' 
        : 'OpenAI sentiment analysis service is not operational.'
    };
  }

  /**
   * Analyze sentiment of a batch of text content
   * @param contentItems Array of text content to analyze
   * @returns Analysis results with sentiment breakdown
   */
  public async analyzeSentimentBatch(contentItems: string[]): Promise<{
    positive: number;
    neutral: number;
    negative: number;
    detailedBreakdown: Array<{
      contentSnippet: string;
      sentiment: 'positive' | 'neutral' | 'negative';
      score: number;
    }>;
  }> {
    if (!this.isOperational) {
      log('Sentiment analysis attempted but OpenAI service is not operational', 'openai-sentiment');
      // Return default values if service is not operational
      return {
        positive: 0.33,
        neutral: 0.34,
        negative: 0.33,
        detailedBreakdown: []
      };
    }

    // Process in batches to avoid hitting API limits
    const batches: string[][] = [];
    for (let i = 0; i < contentItems.length; i += this.maxBatchSize) {
      batches.push(contentItems.slice(i, i + this.maxBatchSize));
    }

    let allResults: Array<{
      contentSnippet: string;
      sentiment: 'positive' | 'neutral' | 'negative';
      score: number;
    }> = [];

    // Process each batch
    for (const batch of batches) {
      try {
        // Create content for analysis in a batch-friendly format
        const analysisContent = batch.map((text, index) => 
          `Text ${index + 1}: "${text.substring(0, 500)}${text.length > 500 ? '...' : ''}"`
        ).join('\n\n');

        const response = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            { 
              role: "system", 
              content: `You are a sentiment analysis expert. Analyze the sentiment of each text and classify it as positive, neutral, or negative. 
                       For each text, provide a sentiment score from 0 to 1 where:
                       - 0 to 0.33 is negative
                       - 0.34 to 0.66 is neutral
                       - 0.67 to 1.0 is positive
                       Keep your analysis and explanations very concise.`
            },
            { 
              role: "user", 
              content: `Analyze the sentiment of the following texts. For each text, provide:
                      1. A sentiment classification (positive, neutral, or negative)
                      2. A sentiment score between 0 and 1
                      
                      Format your response as a valid JSON array with objects that have these properties:
                      - contentIndex: the text number (1, 2, etc)
                      - sentiment: "positive", "neutral", or "negative"
                      - score: a decimal between 0 and 1
                      
                      Here are the texts:
                      
                      ${analysisContent}`
            }
          ],
          response_format: { type: "json_object" }
        });

        // Parse results from JSON
        const resultText = response.choices[0]?.message.content || '{"results":[]}';
        const parsedResults = JSON.parse(resultText);
        
        if (parsedResults.results && Array.isArray(parsedResults.results)) {
          // Map results to our format
          const batchResults = parsedResults.results.map((result: any, index: number) => ({
            contentSnippet: batch[index],
            sentiment: result.sentiment as 'positive' | 'neutral' | 'negative',
            score: result.score
          }));
          
          allResults = [...allResults, ...batchResults];
        }
      } catch (error) {
        log(`Error analyzing sentiment batch: ${error}`, 'openai-sentiment');
      }
    }

    // Calculate overall sentiment breakdown
    let positive = 0, neutral = 0, negative = 0;
    
    allResults.forEach(result => {
      if (result.sentiment === 'positive') positive++;
      else if (result.sentiment === 'negative') negative++;
      else neutral++;
    });
    
    const total = Math.max(1, allResults.length); // Avoid division by zero
    
    return {
      positive: parseFloat((positive / total).toFixed(2)),
      neutral: parseFloat((neutral / total).toFixed(2)),
      negative: parseFloat((negative / total).toFixed(2)),
      detailedBreakdown: allResults
    };
  }

  /**
   * Analyze sentiment of a single text
   * @param text Text content to analyze
   * @returns Sentiment classification, score, and explanation
   */
  public async analyzeSentiment(text: string): Promise<{
    sentiment: 'positive' | 'neutral' | 'negative';
    score: number;
    explanation: string;
  }> {
    if (!this.isOperational) {
      log('Sentiment analysis attempted but OpenAI service is not operational', 'openai-sentiment');
      
      // Default fallback
      return {
        sentiment: 'neutral',
        score: 0.5,
        explanation: 'Sentiment analysis service is not operational'
      };
    }

    try {
      // Truncate very long text
      const truncatedText = text.length > 1000 ? `${text.substring(0, 1000)}...` : text;
      
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { 
            role: "system", 
            content: `You are a sentiment analysis expert. Your task is to analyze text and determine if it has a positive, neutral, or negative sentiment.
                     Provide a sentiment score from 0 to 1 where:
                     - 0 to 0.33 is negative
                     - 0.34 to 0.66 is neutral
                     - 0.67 to 1.0 is positive
                     Also provide a brief explanation for your sentiment analysis.`
          },
          { 
            role: "user", 
            content: `Analyze the sentiment of this text: "${truncatedText}"
                     
                     Format your response as JSON with these fields:
                     - sentiment: "positive", "neutral", or "negative"
                     - score: a decimal between 0 and 1
                     - explanation: a brief explanation (50 words or less)`
          }
        ],
        response_format: { type: "json_object" }
      });

      const resultText = response.choices[0]?.message.content || '';
      const result = JSON.parse(resultText);
      
      return {
        sentiment: result.sentiment as 'positive' | 'neutral' | 'negative',
        score: result.score,
        explanation: result.explanation
      };
    } catch (error) {
      log(`Error analyzing sentiment: ${error}`, 'openai-sentiment');
      
      // Fallback in case of error
      return {
        sentiment: 'neutral',
        score: 0.5,
        explanation: 'Error analyzing sentiment'
      };
    }
  }
}

export const openAiSentiment = new OpenAiSentimentService();