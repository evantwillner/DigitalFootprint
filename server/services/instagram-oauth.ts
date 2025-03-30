import axios from 'axios';
import { log } from '../vite';
import { tokenManager } from './token-manager';

/**
 * Instagram OAuth Service for token generation and management
 * 
 * This service manages the OAuth flow for Instagram API access:
 * 1. Generating authorization URLs for user login
 * 2. Exchanging authorization codes for access tokens
 * 3. Refreshing long-lived access tokens
 * 4. Storing and retrieving tokens
 * 
 * Uses the central TokenManager for persistent storage and automatic refresh
 */
export class InstagramOAuthService {
  private clientId: string | undefined;
  private clientSecret: string | undefined;
  private redirectUri: string;
  
  constructor() {
    this.clientId = process.env.INSTAGRAM_CLIENT_ID;
    this.clientSecret = process.env.INSTAGRAM_CLIENT_SECRET;
    
    // If we're running on Replit, use the Replit domain for the redirect URI
    const replitSlug = process.env.REPL_SLUG;
    const replitOwner = process.env.REPL_OWNER;
    const replitDomain = replitSlug && replitOwner ? 
      `https://${replitSlug}.${replitOwner}.repl.co` : null;
    
    // Use Replit domain if available, otherwise use environment variable or local fallback
    this.redirectUri = process.env.INSTAGRAM_REDIRECT_URI || 
      (replitDomain ? `${replitDomain}/api/instagram/callback` : 'http://localhost:5000/api/instagram/callback');
    
    log(`Instagram OAuth Service initialized with client ID: ${this.clientId ? 'configured' : 'missing'}`, 'instagram-oauth');
  }
  
  /**
   * Check if the service is properly configured with client credentials
   */
  public isConfigured(): boolean {
    return !!this.clientId && !!this.clientSecret;
  }
  
  /**
   * Check if we currently have a valid token
   */
  public async hasValidToken(): Promise<boolean> {
    return await tokenManager.hasValidToken('instagram');
  }
  
  /**
   * Get the current access token, if available
   */
  public async getAccessToken(): Promise<string | null> {
    const token = await tokenManager.getToken('instagram', true);
    return token ? token.accessToken : null;
  }
  
  /**
   * Generate an authorization URL for Instagram login
   * @param scopes The permissions to request
   * @returns URL to redirect the user to for Instagram authorization
   */
  public getAuthorizationUrl(scopes: string[] = ['user_profile', 'user_media']): string {
    if (!this.isConfigured()) {
      throw new Error('Instagram OAuth is not configured. Missing client ID or secret.');
    }
    
    const scopeString = scopes.join(',');
    const authUrl = new URL('https://api.instagram.com/oauth/authorize');
    
    authUrl.searchParams.append('client_id', this.clientId!);
    authUrl.searchParams.append('redirect_uri', this.redirectUri);
    authUrl.searchParams.append('scope', scopeString);
    authUrl.searchParams.append('response_type', 'code');
    
    return authUrl.toString();
  }
  
  /**
   * Exchange an authorization code for an access token
   * @param code Authorization code from callback
   * @returns Object containing the access token and other details
   */
  public async exchangeCodeForToken(code: string): Promise<{
    accessToken: string;
    userId: string;
    expiresIn: number;
  }> {
    if (!this.isConfigured()) {
      throw new Error('Instagram OAuth is not configured. Missing client ID or secret.');
    }
    
    try {
      // Create form data for the request (Instagram API requires form data for this endpoint)
      const formData = new URLSearchParams();
      formData.append('client_id', this.clientId!);
      formData.append('client_secret', this.clientSecret!);
      formData.append('grant_type', 'authorization_code');
      formData.append('redirect_uri', this.redirectUri);
      formData.append('code', code);
      
      // Make the request with form data
      const response = await axios.post('https://api.instagram.com/oauth/access_token', 
        formData.toString(), 
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        });
      
      const { access_token, user_id } = response.data;
      
      // Get a long-lived token before storing
      const longLivedToken = await this.getLongLivedToken(access_token);
      
      // Store the token in the token manager
      await tokenManager.setToken('instagram', {
        accessToken: longLivedToken.accessToken,
        expiresAt: Date.now() + (longLivedToken.expiresIn * 1000),
        additionalData: {
          userId: user_id,
          clientId: this.clientId,
          clientSecret: this.clientSecret
        }
      });
      
      return {
        accessToken: longLivedToken.accessToken,
        userId: user_id,
        expiresIn: longLivedToken.expiresIn
      };
      
    } catch (error: any) {
      log(`Error exchanging code for token: ${error.message}`, 'instagram-oauth');
      if (error.response?.data) {
        log(`Error details: ${JSON.stringify(error.response.data)}`, 'instagram-oauth');
      }
      throw error;
    }
  }
  
  /**
   * Exchange a short-lived token for a long-lived token
   * @param shortLivedToken Short-lived access token
   * @returns Object containing the long-lived token
   */
  public async getLongLivedToken(shortLivedToken: string): Promise<{
    accessToken: string;
    expiresIn: number;
  }> {
    if (!this.isConfigured()) {
      throw new Error('Instagram OAuth is not configured. Missing client ID or secret.');
    }
    
    try {
      const response = await axios.get('https://graph.instagram.com/access_token', {
        params: {
          grant_type: 'ig_exchange_token',
          client_secret: this.clientSecret,
          access_token: shortLivedToken
        }
      });
      
      const { access_token, expires_in } = response.data;
      
      return {
        accessToken: access_token,
        expiresIn: expires_in
      };
      
    } catch (error: any) {
      log(`Error getting long-lived token: ${error.message}`, 'instagram-oauth');
      if (error.response?.data) {
        log(`Error details: ${JSON.stringify(error.response.data)}`, 'instagram-oauth');
      }
      throw error;
    }
  }
  
  /**
   * Verify if a token is valid by making a test request to the Instagram API
   * @param token Access token to verify
   * @returns Boolean indicating if the token is valid
   */
  public async verifyToken(token: string): Promise<boolean> {
    if (!token) return false;
    
    try {
      // Try to get basic profile info using the token
      const response = await axios.get('https://graph.instagram.com/me', {
        params: {
          access_token: token,
          fields: 'id,username'
        }
      });
      
      // If we got a successful response with username, the token is valid
      return !!response.data && !!response.data.username;
    } catch (error: any) {
      log(`Token verification failed: ${error.message}`, 'instagram-oauth');
      return false;
    }
  }
  
  /**
   * Refresh a long-lived token
   * This is now handled by the token manager, but kept for compatibility
   * @param longLivedToken Long-lived access token to refresh
   * @returns Object containing the refreshed token
   */
  public async refreshLongLivedToken(longLivedToken: string): Promise<{
    accessToken: string;
    expiresIn: number;
  }> {
    try {
      const response = await axios.get('https://graph.instagram.com/refresh_access_token', {
        params: {
          grant_type: 'ig_refresh_token',
          access_token: longLivedToken
        }
      });
      
      const { access_token, expires_in } = response.data;
      
      // Update the token in the token manager
      const currentToken = await tokenManager.getToken('instagram', false);
      await tokenManager.setToken('instagram', {
        accessToken: access_token,
        expiresAt: Date.now() + (expires_in * 1000),
        additionalData: currentToken?.additionalData
      });
      
      return {
        accessToken: access_token,
        expiresIn: expires_in
      };
      
    } catch (error: any) {
      log(`Error refreshing token: ${error.message}`, 'instagram-oauth');
      if (error.response?.data) {
        log(`Error details: ${JSON.stringify(error.response.data)}`, 'instagram-oauth');
      }
      throw error;
    }
  }
}

// Export as a singleton
export const instagramOAuth = new InstagramOAuthService();