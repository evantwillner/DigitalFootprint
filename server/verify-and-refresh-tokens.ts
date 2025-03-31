/**
 * Token Verification and Refresh Utility
 * 
 * This script will check all platform API tokens and attempt to refresh them if needed.
 * It provides a way to manually trigger token refreshes for testing and debugging.
 * 
 * To run: npx tsx server/verify-and-refresh-tokens.ts
 */

import { tokenManager } from './services/token-manager';
import { log } from './vite';
import axios from 'axios';

// Explicitly define platform types for clarity
const platforms = ['twitter', 'facebook', 'instagram', 'reddit'] as const;

/**
 * Verify a token directly with its platform API
 * @param platform Platform to verify token for
 * @returns Boolean indicating if token is valid
 */
async function verifyTokenWithApi(platform: typeof platforms[number]): Promise<boolean> {
  try {
    const token = await tokenManager.getToken(platform, false);
    if (!token || !token.accessToken) {
      return false;
    }
    
    switch (platform) {
      case 'twitter': 
        try {
          const response = await axios.get('https://api.twitter.com/2/users/by/username/elonmusk', {
            headers: {
              'Authorization': `Bearer ${token.accessToken}`
            }
          });
          return response.status === 200 && !!response.data;
        } catch (e: any) {
          log(`Twitter API test request failed: ${e.message}`, 'token-verify');
          return false;
        }
        
      case 'facebook':
        try {
          const response = await axios.get('https://graph.facebook.com/v17.0/me', {
            params: { access_token: token.accessToken }
          });
          return response.status === 200 && !!response.data?.id;
        } catch (e: any) {
          log(`Facebook API test request failed: ${e.message}`, 'token-verify');
          return false;
        }
        
      case 'instagram':
        try {
          const response = await axios.get('https://graph.instagram.com/me', {
            params: { 
              access_token: token.accessToken,
              fields: 'id,username'
            }
          });
          return response.status === 200 && !!response.data?.id;
        } catch (e: any) {
          log(`Instagram API test request failed: ${e.message}`, 'token-verify');
          return false;
        }
        
      case 'reddit':
        try {
          // Reddit requires different authentication header format
          const response = await axios.get('https://oauth.reddit.com/api/v1/me', {
            headers: {
              'Authorization': `Bearer ${token.accessToken}`,
              'User-Agent': 'Digital Wellness Platform/1.0'
            }
          });
          return response.status === 200 && !!response.data;
        } catch (e: any) {
          log(`Reddit API test request failed: ${e.message}`, 'token-verify');
          return false;
        }
        
      default:
        return false;
    }
  } catch (error: any) {
    log(`Error verifying ${platform} token: ${error.message}`, 'token-verify');
    return false;
  }
}

async function verifyAndRefreshTokens() {
  log('🔑 API Token Verification and Refresh Utility 🔑', 'token-verify');
  log('---------------------------------------------', 'token-verify');
  
  // Initialize token manager with environment variables
  await tokenManager.initFromEnvironment();
  
  // Check each platform
  for (const platform of platforms) {
    log(`\n🔎 Checking ${platform.toUpperCase()} token...`, 'token-verify');
    
    // Get current token status
    const hasToken = await tokenManager.hasValidToken(platform);
    
    if (hasToken) {
      log(`✅ Valid token found in storage for ${platform}`, 'token-verify');
      
      // Always verify token directly with APIs
      log(`🔍 Verifying ${platform} token with API call...`, 'token-verify');
      const isValid = await verifyTokenWithApi(platform);
      
      if (isValid) {
        log(`✅ ${platform} token verified with API call`, 'token-verify');
      } else {
        log(`❌ ${platform} token rejected by API, attempting refresh...`, 'token-verify');
        await refreshPlatformToken(platform);
      }
      
      // Check if token will expire soon
      const token = await tokenManager.getToken(platform, false);
      if (token?.expiresAt) {
        const daysUntilExpiration = Math.round((token.expiresAt - Date.now()) / (1000 * 60 * 60 * 24));
        log(`ℹ️ Token expires in approximately ${daysUntilExpiration} days`, 'token-verify');
        
        if (daysUntilExpiration < 5) {
          log(`⚠️ Token will expire soon, attempting to refresh...`, 'token-verify');
          await refreshPlatformToken(platform);
        }
      }
    } else {
      log(`❌ No valid token found for ${platform}`, 'token-verify');
      log(`Attempting to refresh token...`, 'token-verify');
      await refreshPlatformToken(platform);
    }
  }
}

async function refreshPlatformToken(platform: typeof platforms[number]) {
  try {
    // Get current token (even if expired)
    const currentToken = await tokenManager.getToken(platform, false);
    
    if (!currentToken) {
      log(`❌ Cannot refresh ${platform} token - no existing token found`, 'token-verify');
      return;
    }
    
    // Force refresh the token
    const newToken = await tokenManager.refreshToken(platform);
    
    if (newToken) {
      log(`✅ Successfully refreshed ${platform} token!`, 'token-verify');
      
      if (newToken.expiresAt) {
        const expirationDate = new Date(newToken.expiresAt);
        log(`ℹ️ New token will expire on: ${expirationDate.toLocaleString()}`, 'token-verify');
      } else {
        log(`ℹ️ New token has no expiration date (long-lived token)`, 'token-verify');
      }
      
      // For Twitter, verify the token directly
      if (platform === 'twitter') {
        try {
          const response = await axios.get('https://api.twitter.com/2/users/me', {
            headers: {
              'Authorization': `Bearer ${newToken.accessToken}`
            }
          });
          
          if (response.status === 200) {
            log(`✅ Twitter API token verified - able to access /2/users/me endpoint`, 'token-verify');
          }
        } catch (e: any) {
          log(`❌ Error verifying Twitter token: ${e.message}`, 'token-verify');
          if (e.response) {
            log(`Response: ${JSON.stringify(e.response.data)}`, 'token-verify');
          }
        }
      }
      
      // For Facebook, verify the token directly
      if (platform === 'facebook') {
        try {
          const response = await axios.get(`https://graph.facebook.com/v17.0/me`, {
            params: { access_token: newToken.accessToken }
          });
          
          if (response.status === 200 && response.data.id) {
            log(`✅ Facebook API token verified - able to access user ID: ${response.data.id}`, 'token-verify');
          }
        } catch (e: any) {
          log(`❌ Error verifying Facebook token: ${e.message}`, 'token-verify');
          if (e.response?.data) {
            log(`Response: ${JSON.stringify(e.response.data)}`, 'token-verify');
          }
        }
      }
      
      // For Instagram, verify the token directly
      if (platform === 'instagram') {
        try {
          const response = await axios.get(`https://graph.instagram.com/me`, {
            params: {
              access_token: newToken.accessToken,
              fields: 'id,username'
            }
          });
          
          if (response.status === 200 && response.data.id) {
            log(`✅ Instagram API token verified - able to access user ID: ${response.data.id}`, 'token-verify');
          }
        } catch (e: any) {
          log(`❌ Error verifying Instagram token: ${e.message}`, 'token-verify');
          if (e.response?.data) {
            log(`Response: ${JSON.stringify(e.response.data)}`, 'token-verify');
          }
        }
      }
    } else {
      log(`❌ Failed to refresh ${platform} token`, 'token-verify');
    }
  } catch (error: any) {
    log(`❌ Error during ${platform} token refresh: ${error.message}`, 'token-verify');
  }
}

// Run the verification
verifyAndRefreshTokens().then(() => {
  log('\n🔄 Token verification and refresh completed', 'token-verify');
}).catch(error => {
  log(`❌ Error during token verification process: ${error}`, 'token-verify');
}).finally(() => {
  // In a real script you'd want to exit here
  // process.exit(0);
});