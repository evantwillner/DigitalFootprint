/**
 * Test Instagram OAuth Integration
 * 
 * This script verifies that the Instagram OAuth flow is properly configured
 * and tests the access token functionality.
 * 
 * To run this test: npx tsx server/test-instagram-oauth.ts
 */

import axios from 'axios';
import { instagramOAuth } from './services/instagram-oauth';
import { log } from './vite';

async function testInstagramOAuth() {
  log('---- Instagram OAuth Test ----', 'test');
  
  // Check if OAuth service is configured
  const isConfigured = instagramOAuth.isConfigured();
  log(`OAuth service configured: ${isConfigured}`, 'test');
  
  if (!isConfigured) {
    log('Instagram OAuth is not configured. Please set the required environment variables:', 'test');
    log('  - INSTAGRAM_CLIENT_ID', 'test');
    log('  - INSTAGRAM_CLIENT_SECRET', 'test');
    log('  - INSTAGRAM_ACCESS_TOKEN (optional - for testing without going through auth flow)', 'test');
    return;
  }
  
  // Check if we have a valid token
  const hasToken = instagramOAuth.hasValidToken();
  log(`Has valid token: ${hasToken}`, 'test');
  
  if (!hasToken) {
    // Generate an auth URL that the user can follow
    const authUrl = instagramOAuth.getAuthorizationUrl();
    log(`No valid token found. Please visit the following URL to authorize the app:`, 'test');
    log(authUrl, 'test');
    log(`After authorization, you'll be redirected to the callback URL.`, 'test');
    log(`The code parameter in the URL can be used to get an access token.`, 'test');
    return;
  }
  
  // If we have a token, test it by making a request to the Instagram API
  try {
    log('Testing API access with the current token...', 'test');
    
    const token = instagramOAuth.getAccessToken();
    const response = await axios.get('https://graph.instagram.com/me', {
      params: {
        access_token: token,
        fields: 'id,username,account_type,media_count'
      }
    });
    
    log('✅ Success! Token is working correctly.', 'test');
    log(`User: ${response.data.username} (${response.data.account_type})`, 'test');
    log(`Media count: ${response.data.media_count}`, 'test');
    
    // Test fetching media
    try {
      const mediaResponse = await axios.get(`https://graph.instagram.com/me/media`, {
        params: {
          access_token: token,
          fields: 'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,username'
        }
      });
      
      const mediaCount = mediaResponse.data.data?.length || 0;
      log(`✅ Successfully fetched ${mediaCount} media items`, 'test');
      
      if (mediaCount > 0) {
        log('First media item:', 'test');
        log(JSON.stringify(mediaResponse.data.data[0], null, 2), 'test');
      }
    } catch (mediaError: any) {
      log('❌ Error fetching media:', 'test');
      log(mediaError.message, 'test');
      if (mediaError.response?.data) {
        log(JSON.stringify(mediaError.response.data, null, 2), 'test');
      }
    }
    
  } catch (error: any) {
    log('❌ Error testing API access:', 'test');
    log(error.message, 'test');
    if (error.response?.data) {
      log(JSON.stringify(error.response.data, null, 2), 'test');
    }
    
    log('Token may be expired or invalid. You may need to reauthorize.', 'test');
    const authUrl = instagramOAuth.getAuthorizationUrl();
    log(`Please visit: ${authUrl}`, 'test');
  }
}

// Run the test
testInstagramOAuth().catch(err => {
  log(`Test failed with error: ${err.message}`, 'test');
  if (err.response?.data) {
    log(JSON.stringify(err.response.data, null, 2), 'test');
  }
});