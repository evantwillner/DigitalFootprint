/**
 * Token Manager Service
 * 
 * A centralized service for managing API tokens across different platforms.
 * Features:
 * - Token storage and retrieval
 * - Automatic token refresh when possible
 * - Token validation
 * - Persistent storage to avoid token loss on server restart
 */

import fs from 'fs/promises';
import path from 'path';
import { log } from '../vite';
import axios from 'axios';

// The types of platforms we support
export type TokenPlatform = 'instagram' | 'twitter' | 'facebook' | 'reddit';

// Structure for storing token data
export interface TokenData {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number; // Unix timestamp in ms
  additionalData?: Record<string, any>; // For platform-specific data
}

// Token storage location - will be created if it doesn't exist
const TOKEN_STORAGE_DIR = './.tokens';
const TOKEN_STORAGE_FILE = path.join(TOKEN_STORAGE_DIR, 'platform_tokens.json');

export class TokenManager {
  private tokens: Record<TokenPlatform, TokenData | null>;
  private refreshInProgress: Record<TokenPlatform, boolean>;
  private initialized: boolean = false;
  private validateOnLoad: boolean = true;

  constructor() {
    this.tokens = {
      instagram: null,
      twitter: null,
      facebook: null,
      reddit: null
    };
    
    this.refreshInProgress = {
      instagram: false,
      twitter: false,
      facebook: false,
      reddit: false
    };
    
    // Schedule token validation and automatic refresh
    setInterval(() => this.validateAndRefreshTokens(), 60 * 60 * 1000); // Check every hour
    
    log('Token Manager initialized', 'token-manager');
    
    // Load tokens asynchronously when constructed
    this.initialize();
  }
  
  /**
   * Initialize the token manager and load stored tokens
   */
  private async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      await this.loadTokens();
      this.initialized = true;
      
      // After loading tokens, validate them if configured to do so
      if (this.validateOnLoad) {
        await this.validateAndRefreshTokens();
      }
    } catch (error) {
      log(`Error initializing token manager: ${error}`, 'token-manager');
    }
  }
  
  /**
   * Ensure the token manager is initialized before performing operations
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }
  
  /**
   * Store a token for a specific platform
   */
  public async setToken(
    platform: TokenPlatform,
    token: TokenData
  ): Promise<void> {
    await this.ensureInitialized();
    
    this.tokens[platform] = token;
    log(`Token set for ${platform}`, 'token-manager');
    
    // Save to persistent storage
    await this.saveTokens();
  }
  
  /**
   * Get the current token for a platform
   * Optionally try to refresh if expired
   */
  public async getToken(
    platform: TokenPlatform,
    autoRefresh: boolean = true
  ): Promise<TokenData | null> {
    await this.ensureInitialized();
    
    const token = this.tokens[platform];
    
    // If no token exists, return null
    if (!token) {
      return null;
    }
    
    // If token is expired and auto-refresh is enabled, try to refresh it
    if (autoRefresh && this.isTokenExpired(token)) {
      log(`Token for ${platform} is expired, attempting refresh`, 'token-manager');
      return await this.refreshToken(platform);
    }
    
    return token;
  }
  
  /**
   * Check if we have a valid, non-expired token for a platform
   */
  public async hasValidToken(platform: TokenPlatform): Promise<boolean> {
    await this.ensureInitialized();
    
    const token = await this.getToken(platform, false);
    if (!token) return false;
    
    // If no expiration time, assume it's a long-lived token
    if (!token.expiresAt) return true;
    
    // Check if the token is expired
    return !this.isTokenExpired(token);
  }
  
  /**
   * Check if a token has expired
   */
  private isTokenExpired(token: TokenData): boolean {
    if (!token.expiresAt) return false; // No expiration time means it doesn't expire
    
    // Add a buffer of 5 minutes to prevent edge cases
    const bufferTime = 5 * 60 * 1000;
    return Date.now() + bufferTime > token.expiresAt;
  }
  
  /**
   * Refresh a token using platform-specific refresh mechanism
   */
  public async refreshToken(platform: TokenPlatform): Promise<TokenData | null> {
    await this.ensureInitialized();
    
    // Prevent multiple simultaneous refresh attempts
    if (this.refreshInProgress[platform]) {
      log(`Token refresh already in progress for ${platform}`, 'token-manager');
      // Wait for the refresh to complete
      await new Promise(resolve => {
        const checkInterval = setInterval(() => {
          if (!this.refreshInProgress[platform]) {
            clearInterval(checkInterval);
            resolve(null);
          }
        }, 500);
      });
      return this.tokens[platform];
    }
    
    this.refreshInProgress[platform] = true;
    
    try {
      const currentToken = this.tokens[platform];
      if (!currentToken) {
        this.refreshInProgress[platform] = false;
        return null;
      }
      
      // Platform-specific refresh logic
      let refreshedToken: TokenData | null = null;
      
      switch (platform) {
        case 'instagram':
          refreshedToken = await this.refreshInstagramToken(currentToken);
          break;
        case 'twitter':
          refreshedToken = await this.refreshTwitterToken(currentToken);
          break;
        case 'facebook':
          refreshedToken = await this.refreshFacebookToken(currentToken);
          break;
        case 'reddit':
          refreshedToken = await this.refreshRedditToken(currentToken);
          break;
      }
      
      if (refreshedToken) {
        // Update the stored token
        this.tokens[platform] = refreshedToken;
        await this.saveTokens();
        
        log(`Successfully refreshed token for ${platform}`, 'token-manager');
        this.refreshInProgress[platform] = false;
        return refreshedToken;
      } else {
        log(`Failed to refresh token for ${platform}`, 'token-manager');
        this.refreshInProgress[platform] = false;
        return null;
      }
    } catch (error: any) {
      log(`Error refreshing token for ${platform}: ${error.message}`, 'token-manager');
      this.refreshInProgress[platform] = false;
      return null;
    }
  }
  
  /**
   * Check and refresh all tokens that are about to expire
   */
  private async validateAndRefreshTokens(): Promise<void> {
    await this.ensureInitialized();
    
    for (const platform of Object.keys(this.tokens) as TokenPlatform[]) {
      const token = this.tokens[platform];
      if (!token) continue;
      
      // If token will expire within 24 hours, refresh it
      if (token.expiresAt && token.expiresAt - Date.now() < 24 * 60 * 60 * 1000) {
        log(`Token for ${platform} will expire soon, refreshing`, 'token-manager');
        await this.refreshToken(platform);
      }
    }
  }
  
  /**
   * Load tokens from persistent storage
   */
  private async loadTokens(): Promise<void> {
    try {
      // Ensure the directory exists
      try {
        await fs.mkdir(TOKEN_STORAGE_DIR, { recursive: true });
      } catch (err) {
        // Ignore directory already exists error
      }
      
      // Try to read the tokens file
      const data = await fs.readFile(TOKEN_STORAGE_FILE, 'utf-8');
      const parsedData = JSON.parse(data);
      
      // Update our in-memory tokens
      this.tokens = {
        ...this.tokens,
        ...parsedData
      };
      
      log('Tokens loaded from persistent storage', 'token-manager');
    } catch (error: any) {
      // If file doesn't exist, that's fine - we'll create it when we save
      if (error.code !== 'ENOENT') {
        log(`Error loading tokens: ${error.message}`, 'token-manager');
      } else {
        log('No stored tokens found, starting with empty token store', 'token-manager');
      }
    }
  }
  
  /**
   * Save tokens to persistent storage
   */
  private async saveTokens(): Promise<void> {
    try {
      // Ensure the directory exists
      await fs.mkdir(TOKEN_STORAGE_DIR, { recursive: true });
      
      // Write the tokens to the file
      await fs.writeFile(
        TOKEN_STORAGE_FILE,
        JSON.stringify(this.tokens, null, 2),
        'utf-8'
      );
      
      log('Tokens saved to persistent storage', 'token-manager');
    } catch (error) {
      log(`Error saving tokens: ${error}`, 'token-manager');
    }
  }
  
  /**
   * Delete a token for a specific platform
   */
  public async deleteToken(platform: TokenPlatform): Promise<void> {
    await this.ensureInitialized();
    
    this.tokens[platform] = null;
    log(`Token deleted for ${platform}`, 'token-manager');
    
    // Save the updated tokens
    await this.saveTokens();
  }
  
  /**
   * Clear all tokens
   */
  public async clearAllTokens(): Promise<void> {
    await this.ensureInitialized();
    
    this.tokens = {
      instagram: null,
      twitter: null,
      facebook: null,
      reddit: null
    };
    
    log('All tokens cleared', 'token-manager');
    
    // Save the updated tokens
    await this.saveTokens();
  }
  
  /**
   * Initialize tokens from environment variables
   * This is useful for initial setup or when tokens are provided via env vars
   */
  public async initFromEnvironment(): Promise<void> {
    await this.ensureInitialized();
    
    // Instagram token
    if (process.env.INSTAGRAM_ACCESS_TOKEN) {
      this.tokens.instagram = {
        accessToken: process.env.INSTAGRAM_ACCESS_TOKEN,
        // Default expiration of 60 days from now if not specified
        expiresAt: Date.now() + (process.env.INSTAGRAM_TOKEN_EXPIRES_IN ? 
          parseInt(process.env.INSTAGRAM_TOKEN_EXPIRES_IN) * 1000 : 
          60 * 24 * 60 * 60 * 1000)
      };
      log('Initialized Instagram token from environment', 'token-manager');
    }
    
    // Twitter tokens
    if (process.env.TWITTER_BEARER_TOKEN) {
      this.tokens.twitter = {
        accessToken: process.env.TWITTER_BEARER_TOKEN,
        // Twitter bearer tokens don't expire
        additionalData: {
          apiKey: process.env.TWITTER_API_KEY,
          apiSecret: process.env.TWITTER_API_SECRET
        }
      };
      log('Initialized Twitter token from environment', 'token-manager');
    }
    
    // Reddit tokens
    if (process.env.REDDIT_ACCESS_TOKEN) {
      this.tokens.reddit = {
        accessToken: process.env.REDDIT_ACCESS_TOKEN,
        refreshToken: process.env.REDDIT_REFRESH_TOKEN || undefined,
        expiresAt: process.env.REDDIT_TOKEN_EXPIRES_AT ? 
          parseInt(process.env.REDDIT_TOKEN_EXPIRES_AT) : 
          undefined,
        additionalData: {
          clientId: process.env.REDDIT_CLIENT_ID,
          clientSecret: process.env.REDDIT_CLIENT_SECRET
        }
      };
      log('Initialized Reddit token from environment', 'token-manager');
    }
    
    // Facebook tokens
    if (process.env.FACEBOOK_ACCESS_TOKEN) {
      this.tokens.facebook = {
        accessToken: process.env.FACEBOOK_ACCESS_TOKEN,
        expiresAt: process.env.FACEBOOK_TOKEN_EXPIRES_AT ? 
          parseInt(process.env.FACEBOOK_TOKEN_EXPIRES_AT) : 
          undefined,
        additionalData: {
          clientId: process.env.FACEBOOK_CLIENT_ID,
          clientSecret: process.env.FACEBOOK_CLIENT_SECRET
        }
      };
      log('Initialized Facebook token from environment', 'token-manager');
    }
    
    // Save the initialized tokens
    await this.saveTokens();
  }
  
  // Platform-specific refresh methods
  
  /**
   * Refresh an Instagram token
   * Instagram uses the "ig_refresh_token" grant type
   */
  private async refreshInstagramToken(currentToken: TokenData): Promise<TokenData | null> {
    try {
      // Instagram token refresh requires just the access token
      const response = await axios.get('https://graph.instagram.com/refresh_access_token', {
        params: {
          grant_type: 'ig_refresh_token',
          access_token: currentToken.accessToken
        }
      });
      
      const { access_token, expires_in } = response.data;
      
      if (!access_token) {
        throw new Error('No access token in refresh response');
      }
      
      return {
        accessToken: access_token,
        expiresAt: Date.now() + (expires_in * 1000), // convert seconds to ms
        // Preserve any additional data
        additionalData: currentToken.additionalData
      };
    } catch (error: any) {
      log(`Instagram token refresh failed: ${error.message}`, 'token-manager');
      if (error.response?.data) {
        log(`API error details: ${JSON.stringify(error.response.data)}`, 'token-manager');
      }
      return null;
    }
  }
  
  /**
   * Refresh a Twitter token
   * Note: Most Twitter API v2 endpoints use bearer tokens that don't expire
   */
  private async refreshTwitterToken(currentToken: TokenData): Promise<TokenData | null> {
    // Twitter bearer tokens typically don't expire
    // But we could implement app-only auth token refresh here if needed
    try {
      if (!currentToken.additionalData?.apiKey || !currentToken.additionalData?.apiSecret) {
        throw new Error('Missing API key or secret for Twitter token refresh');
      }
      
      // Encode credentials for Basic Auth
      const credentials = Buffer.from(
        `${currentToken.additionalData.apiKey}:${currentToken.additionalData.apiSecret}`
      ).toString('base64');
      
      // Request a new bearer token
      const response = await axios.post(
        'https://api.twitter.com/oauth2/token',
        'grant_type=client_credentials',
        {
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      
      if (response.data.token_type !== 'bearer' || !response.data.access_token) {
        throw new Error('Invalid response when refreshing Twitter token');
      }
      
      return {
        accessToken: response.data.access_token,
        // Preserve additional data
        additionalData: currentToken.additionalData
      };
    } catch (error: any) {
      log(`Twitter token refresh failed: ${error.message}`, 'token-manager');
      if (error.response?.data) {
        log(`API error details: ${JSON.stringify(error.response.data)}`, 'token-manager');
      }
      return null;
    }
  }
  
  /**
   * Refresh a Reddit token
   * Reddit uses standard OAuth 2.0 refresh flow
   */
  private async refreshRedditToken(currentToken: TokenData): Promise<TokenData | null> {
    try {
      if (!currentToken.refreshToken) {
        throw new Error('No refresh token available for Reddit');
      }
      
      if (!currentToken.additionalData?.clientId || !currentToken.additionalData?.clientSecret) {
        throw new Error('Missing client ID or secret for Reddit token refresh');
      }
      
      // Create auth header
      const credentials = Buffer.from(
        `${currentToken.additionalData.clientId}:${currentToken.additionalData.clientSecret}`
      ).toString('base64');
      
      // Create form data
      const formData = new URLSearchParams();
      formData.append('grant_type', 'refresh_token');
      formData.append('refresh_token', currentToken.refreshToken);
      
      // Make the request
      const response = await axios.post(
        'https://www.reddit.com/api/v1/access_token',
        formData.toString(),
        {
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      
      const { access_token, expires_in, refresh_token } = response.data;
      
      if (!access_token) {
        throw new Error('No access token in refresh response');
      }
      
      return {
        accessToken: access_token,
        refreshToken: refresh_token || currentToken.refreshToken, // Keep old refresh token if not provided
        expiresAt: Date.now() + (expires_in * 1000), // convert seconds to ms
        // Preserve any additional data
        additionalData: currentToken.additionalData
      };
    } catch (error: any) {
      log(`Reddit token refresh failed: ${error.message}`, 'token-manager');
      if (error.response?.data) {
        log(`API error details: ${JSON.stringify(error.response.data)}`, 'token-manager');
      }
      return null;
    }
  }
  
  /**
   * Refresh a Facebook token
   * Facebook uses the OAuth 2.0 refresh token flow
   */
  private async refreshFacebookToken(currentToken: TokenData): Promise<TokenData | null> {
    try {
      // For long-lived tokens that are about to expire
      if (!currentToken.additionalData?.clientId || !currentToken.additionalData?.clientSecret) {
        throw new Error('Missing client ID or secret for Facebook token refresh');
      }
      
      // Request to exchange token
      const response = await axios.get(
        'https://graph.facebook.com/v17.0/oauth/access_token',
        {
          params: {
            grant_type: 'fb_exchange_token',
            client_id: currentToken.additionalData.clientId,
            client_secret: currentToken.additionalData.clientSecret,
            fb_exchange_token: currentToken.accessToken
          }
        }
      );
      
      const { access_token, expires_in } = response.data;
      
      if (!access_token) {
        throw new Error('No access token in refresh response');
      }
      
      return {
        accessToken: access_token,
        expiresAt: expires_in ? Date.now() + (expires_in * 1000) : undefined, // convert seconds to ms
        // Preserve any additional data
        additionalData: currentToken.additionalData
      };
    } catch (error: any) {
      log(`Facebook token refresh failed: ${error.message}`, 'token-manager');
      if (error.response?.data) {
        log(`API error details: ${JSON.stringify(error.response.data)}`, 'token-manager');
      }
      return null;
    }
  }
}

// Export as a singleton
export const tokenManager = new TokenManager();

// Initialize from environment variables on startup
tokenManager.initFromEnvironment().catch(error => {
  log(`Error initializing tokens from environment: ${error}`, 'token-manager');
});
interface TokenRotationStrategy {
  getNextToken(): string;
  addToken(token: string): void;
  removeToken(token: string): void;
}

class RoundRobinTokenRotation implements TokenRotationStrategy {
  private tokens: string[] = [];
  private currentIndex = 0;

  getNextToken(): string {
    if (this.tokens.length === 0) return '';
    const token = this.tokens[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.tokens.length;
    return token;
  }

  addToken(token: string): void {
    this.tokens.push(token);
  }

  removeToken(token: string): void {
    this.tokens = this.tokens.filter(t => t !== token);
    this.currentIndex = 0;
  }
}
