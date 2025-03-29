import axios from 'axios';
import { log } from '../vite';

/**
 * Instagram OAuth Service for token generation and management
 * 
 * This service manages the OAuth flow for Instagram API access:
 * 1. Generating authorization URLs for user login
 * 2. Exchanging authorization codes for access tokens
 * 3. Refreshing long-lived access tokens
 * 4. Storing and retrieving tokens
 */
export class InstagramOAuthService {
  private clientId: string | undefined;
  private clientSecret: string | undefined;
  private redirectUri: string;
  private currentToken: {
    accessToken: string | null;
    expiresAt: number;
    refreshToken: string | null;
  };
  
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
    
    this.currentToken = {
      accessToken: process.env.INSTAGRAM_ACCESS_TOKEN || null,
      expiresAt: 0,
      refreshToken: null
    };
    
    // If we have a token from the environment, set a reasonable expiration and log it
    if (this.currentToken.accessToken) {
      // Initial expiration: 60 days from now
      this.currentToken.expiresAt = Date.now() + (60 * 24 * 60 * 60 * 1000);
      log(`Using access token from environment variable`, 'instagram-oauth');
      // We need to define verifyToken after the constructor, but we want to call it here
      // Use setTimeout to delay the verification until after the class is fully defined
      setTimeout(async () => {
        try {
          const isValid = await this.verifyToken(this.currentToken.accessToken as string);
          if (!isValid) {
            log(`⚠️ The access token provided in INSTAGRAM_ACCESS_TOKEN appears to be invalid or expired`, 'instagram-oauth');
            // Clear the token if it's invalid
            this.currentToken.accessToken = null;
            this.currentToken.expiresAt = 0;
          } else {
            log(`✅ Successfully verified the Instagram access token`, 'instagram-oauth');
          }
        } catch (error: any) {
          log(`Error verifying access token: ${error.message}`, 'instagram-oauth');
          if (error.response?.data) {
            log(`API Error: ${JSON.stringify(error.response.data)}`, 'instagram-oauth');
          }
          // Don't clear the token automatically as it might just be a temporary API issue
        }
      }, 0);
    }
    
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
  public hasValidToken(): boolean {
    return !!this.currentToken.accessToken && Date.now() < this.currentToken.expiresAt;
  }
  
  /**
   * Get the current access token, if available
   */
  public getAccessToken(): string | null {
    if (this.hasValidToken()) {
      return this.currentToken.accessToken;
    }
    return null;
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
      
      // Update current token
      this.currentToken = {
        accessToken: access_token,
        // Default expiration is usually 1 hour
        expiresAt: Date.now() + (1 * 60 * 60 * 1000),
        refreshToken: null
      };
      
      return {
        accessToken: access_token,
        userId: user_id,
        expiresIn: 3600 // 1 hour in seconds
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
      
      // Update current token
      this.currentToken = {
        accessToken: access_token,
        expiresAt: Date.now() + (expires_in * 1000),
        refreshToken: null
      };
      
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
      
      // Update current token
      this.currentToken = {
        accessToken: access_token,
        expiresAt: Date.now() + (expires_in * 1000),
        refreshToken: null
      };
      
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