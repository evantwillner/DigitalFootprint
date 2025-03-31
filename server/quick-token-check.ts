/**
 * Quick Token Check
 * A simplified version of the token verification script that just checks if 
 * each platform's token would be accepted by the respective API.
 */

import axios from 'axios';
import { tokenManager } from './services/token-manager';
import { log } from './vite';

// Explicitly define platform types for clarity
const platforms = ['twitter', 'facebook', 'instagram', 'reddit'] as const;

async function main() {
  log('🔍 Quick Platform API Token Check', 'token-check');
  log('--------------------------------', 'token-check');
  
  // Initialize token manager with environment variables
  await tokenManager.initFromEnvironment();
  
  for (const platform of platforms) {
    log(`\nChecking ${platform.toUpperCase()} token...`, 'token-check');
    
    const token = await tokenManager.getToken(platform, false);
    
    if (!token || !token.accessToken) {
      log(`❌ No token found for ${platform}`, 'token-check');
      continue;
    }
    
    let status;
    
    try {
      switch (platform) {
        case 'twitter':
          try {
            const response = await axios.get('https://api.twitter.com/2/users/by/username/elonmusk', {
              headers: {
                'Authorization': `Bearer ${token.accessToken}`
              }
            });
            status = `✅ VALID (Status: ${response.status})`;
          } catch (e: any) {
            status = `❌ INVALID (Error: ${e.message})`;
            if (e.response?.data) {
              log(`Response: ${JSON.stringify(e.response.data)}`, 'token-check');
            }
          }
          break;
          
        case 'facebook':
          try {
            const response = await axios.get('https://graph.facebook.com/v17.0/me', {
              params: { access_token: token.accessToken }
            });
            status = `✅ VALID (User ID: ${response.data.id})`;
          } catch (e: any) {
            status = `❌ INVALID (Error: ${e.message})`;
            if (e.response?.data) {
              log(`Response: ${JSON.stringify(e.response.data)}`, 'token-check');
            }
          }
          break;
          
        case 'instagram':
          try {
            const response = await axios.get('https://graph.instagram.com/me', {
              params: {
                access_token: token.accessToken,
                fields: 'id,username'
              }
            });
            status = `✅ VALID (User ID: ${response.data.id})`;
          } catch (e: any) {
            status = `❌ INVALID (Error: ${e.message})`;
            if (e.response?.data) {
              log(`Response: ${JSON.stringify(e.response.data)}`, 'token-check');
            }
          }
          break;
          
        case 'reddit':
          try {
            const response = await axios.get('https://oauth.reddit.com/api/v1/me', {
              headers: {
                'Authorization': `Bearer ${token.accessToken}`,
                'User-Agent': 'Digital Wellness Platform/1.0'
              }
            });
            status = `✅ VALID (Username: ${response.data.name})`;
          } catch (e: any) {
            status = `❌ INVALID (Error: ${e.message})`;
            if (e.response?.data) {
              log(`Response: ${JSON.stringify(e.response.data)}`, 'token-check');
            }
          }
          break;
      }
      
      log(`Status: ${status}`, 'token-check');
      
      if (token.expiresAt) {
        const daysUntilExpiration = Math.round((token.expiresAt - Date.now()) / (1000 * 60 * 60 * 24));
        log(`Token expires in approximately ${daysUntilExpiration} days`, 'token-check');
      } else {
        log(`Token has no expiration date (long-lived token)`, 'token-check');
      }
      
    } catch (error: any) {
      log(`Error checking ${platform} token: ${error.message}`, 'token-check');
    }
  }
  
  log('\n✓ Token check completed', 'token-check');
}

// Run the script
main().catch(error => {
  log(`Script error: ${error}`, 'token-check');
});