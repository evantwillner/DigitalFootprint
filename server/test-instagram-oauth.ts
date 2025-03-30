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

async function testInstagramOAuth() {
  console.log('🔐 Instagram OAuth Configuration Test 🔐');
  console.log('--------------------------------------');

  // Check if credentials are properly configured
  if (!instagramOAuth.isConfigured()) {
    console.error('❌ Instagram OAuth is not configured.');
    console.error('Please ensure the following environment variables are set:');
    console.error('- INSTAGRAM_CLIENT_ID');
    console.error('- INSTAGRAM_CLIENT_SECRET');
    process.exit(1);
  }

  console.log('✅ Instagram OAuth credentials are properly configured.');
  
  // Check if an access token is available
  const accessToken = instagramOAuth.getAccessToken();
  
  if (!accessToken) {
    console.log('\n⚠️ No access token is currently available.');
    
    // Generate the authorization URL
    const authUrl = instagramOAuth.getAuthorizationUrl();
    console.log('\nTo complete the OAuth flow, you need to:');
    console.log('1. Visit the following URL in your browser:');
    console.log(`   ${authUrl}`);
    console.log('2. Authorize the application');
    console.log('3. You will be redirected to your callback URL with a code');
    console.log('\nOnce you complete the authorization flow, the access token will');
    console.log('be automatically saved and available for API requests.');
    
    process.exit(0);
  }
  
  console.log('✅ An access token is available.');
  
  // Test the access token by making a request to Instagram API
  console.log('\n🔍 Testing access token...');
  
  try {
    const response = await axios.get('https://graph.instagram.com/me', {
      params: {
        fields: 'id,username,account_type',
        access_token: accessToken
      }
    });
    
    console.log('✅ Access token is valid!');
    console.log('\nConnected Instagram Account:');
    console.log(`- Username: ${response.data.username}`);
    console.log(`- Account ID: ${response.data.id}`);
    console.log(`- Account Type: ${response.data.account_type || 'Unknown'}`);
    
    // Fetch media to test permissions
    console.log('\n🔍 Testing media access...');
    
    try {
      const mediaResponse = await axios.get('https://graph.instagram.com/me/media', {
        params: {
          fields: 'id,caption,media_type,media_url,permalink,timestamp',
          access_token: accessToken
        }
      });
      
      const mediaCount = mediaResponse.data.data?.length || 0;
      console.log(`✅ Successfully retrieved ${mediaCount} media items.`);
      
      if (mediaCount > 0) {
        const recentMedia = mediaResponse.data.data[0];
        console.log('\nMost recent media:');
        console.log(`- Type: ${recentMedia.media_type}`);
        console.log(`- Posted: ${new Date(recentMedia.timestamp).toLocaleString()}`);
        console.log(`- Caption: ${recentMedia.caption ? recentMedia.caption.substring(0, 50) + (recentMedia.caption.length > 50 ? '...' : '') : 'No caption'}`);
        console.log(`- URL: ${recentMedia.permalink}`);
      } else {
        console.log('No media found for this account.');
      }
    } catch (mediaError: any) {
      console.error('❌ Error accessing media:');
      console.error(`${mediaError.message}`);
      
      if (mediaError.response?.data) {
        console.error('API Error Details:');
        console.error(mediaError.response.data);
      }
      
      console.log('\nThis could indicate:');
      console.log('1. Your access token does not have user_media permission');
      console.log('2. The Instagram account has no media');
      console.log('3. Media access is restricted for this account');
    }
    
    // Check token details and expiration
    console.log('\n🔍 Checking token details...');
    
    try {
      const debugResponse = await axios.get('https://graph.facebook.com/debug_token', {
        params: {
          input_token: accessToken,
          access_token: accessToken
        }
      });
      
      const tokenData = debugResponse.data.data;
      
      if (tokenData) {
        console.log('Token information:');
        console.log(`- Valid: ${tokenData.is_valid ? 'Yes' : 'No'}`);
        
        if (tokenData.expires_at) {
          const expiresAt = new Date(tokenData.expires_at * 1000);
          const now = new Date();
          const daysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          
          console.log(`- Expires: ${expiresAt.toLocaleString()}`);
          console.log(`- Days remaining: ${daysRemaining}`);
          
          if (daysRemaining <= 7) {
            console.log('⚠️ Your token will expire soon! Consider refreshing it.');
          }
        } else if (tokenData.expires_at === 0) {
          console.log('- Expires: Never (Long-lived token)');
        }
        
        if (tokenData.scopes) {
          console.log('- Permissions:');
          tokenData.scopes.forEach((scope: string) => {
            console.log(`  • ${scope}`);
          });
        }
      }
    } catch (debugError: any) {
      console.error('❌ Could not debug token:');
      console.error(`${debugError.message}`);
      
      if (debugError.response?.data) {
        console.error('API Error Details:');
        console.error(debugError.response.data);
      }
    }
    
    console.log('\n✅ Instagram OAuth integration test completed!');
  } catch (error: any) {
    console.error('❌ Error testing access token:');
    console.error(`${error.message}`);
    
    if (error.response?.data) {
      console.error('API Error Details:');
      console.error(error.response.data);
    }
    
    console.log('\n⚠️ Your Instagram access token appears to be invalid or expired.');
    console.log('Please complete the OAuth flow again to generate a new token.');
    
    // Generate the authorization URL
    const authUrl = instagramOAuth.getAuthorizationUrl();
    console.log('\nTo generate a new token:');
    console.log(`1. Visit: ${authUrl}`);
    console.log('2. Complete the authorization flow');
    
    process.exit(1);
  }
}

// Run the test
testInstagramOAuth().catch(error => {
  console.error('Unhandled error during test:');
  console.error(error);
  process.exit(1);
});