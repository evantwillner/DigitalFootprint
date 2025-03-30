/**
 * Instagram API Credentials Verification Tool
 * 
 * This script tests if the current Instagram API credentials are working
 * by attempting to fetch account information using various methods.
 * 
 * To run: npx tsx server/verify-instagram-credentials.ts
 */

import axios from 'axios';
import { instagramOAuth } from './services/instagram-oauth';

async function verifyInstagramCredentials() {
  console.log('🔑 Instagram API Credentials Verification 🔑');
  console.log('-------------------------------------------');
  
  // Check OAuth configuration
  const isOAuthConfigured = instagramOAuth.isConfigured();
  console.log(`Instagram OAuth configuration: ${isOAuthConfigured ? '✅ Configured' : '❌ Not configured'}`);
  
  if (!isOAuthConfigured) {
    console.error('Missing Instagram OAuth client credentials!');
    console.log('Required environment variables:');
    console.log('  - INSTAGRAM_CLIENT_ID');
    console.log('  - INSTAGRAM_CLIENT_SECRET');
    console.log('  - INSTAGRAM_ACCESS_TOKEN (optional)');
  } else {
    console.log('✅ OAuth client ID and secret are properly configured');
  }
  
  // Check direct access token (can be used without full OAuth flow)
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  console.log(`Instagram Access Token: ${accessToken ? '✅ Present' : '❌ Missing'}`);
  
  if (!accessToken) {
    console.log('For testing without OAuth flow, set INSTAGRAM_ACCESS_TOKEN environment variable.');
    if (isOAuthConfigured) {
      const authUrl = instagramOAuth.getAuthorizationUrl();
      console.log('\nTo get an access token, use the OAuth flow:');
      console.log(`1. Visit: ${authUrl}`);
      console.log('2. Authorize the application');
      console.log('3. You will be redirected with a code parameter');
      console.log('4. The application will exchange this code for an access token');
    }
    return;
  }
  
  // Check if token is valid by making a request
  console.log('\nVerifying access token validity...');
  
  try {
    const response = await axios.get('https://graph.instagram.com/me', {
      params: {
        access_token: accessToken,
        fields: 'id,username'
      }
    });
    
    if (response.data && response.data.username) {
      console.log('✅ SUCCESS! Access token is valid');
      console.log(`Connected to Instagram account: ${response.data.username} (ID: ${response.data.id})`);
      
      // Try to fetch media data to verify permissions
      try {
        console.log('\nTesting media access...');
        const mediaResponse = await axios.get('https://graph.instagram.com/me/media', {
          params: {
            access_token: accessToken,
            fields: 'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp'
          }
        });
        
        const mediaCount = mediaResponse.data.data?.length || 0;
        console.log(`✅ Successfully accessed ${mediaCount} media items`);
        
        if (mediaCount > 0) {
          const firstItem = mediaResponse.data.data[0];
          console.log('Latest media item:');
          console.log(`- Type: ${firstItem.media_type}`);
          console.log(`- Posted: ${firstItem.timestamp}`);
          console.log(`- URL: ${firstItem.permalink}`);
        } else {
          console.log('No media found. Account may have no posts or permission is limited.');
        }
      } catch (mediaError: any) {
        console.error('❌ Error accessing media:');
        console.error(`Error: ${mediaError.message}`);
        
        if (mediaError.response?.data?.error) {
          console.error('API Error Details:');
          console.error(mediaError.response.data.error);
        }
        
        console.log('\nPossible solutions:');
        console.log('1. The token may have insufficient permissions. Ensure it includes user_media scope.');
        console.log('2. The account may have no media content.');
        console.log('3. The Instagram API may be rate limiting requests.');
      }
    } else {
      console.error('❌ Unexpected API response format:');
      console.error(response.data);
    }
  } catch (error: any) {
    console.error('❌ Error verifying access token:');
    console.error(`Error: ${error.message}`);
    
    if (error.response?.data?.error) {
      console.error('API Error Details:');
      console.error(error.response.data.error);
      
      // Special handling for common error codes
      if (error.response.data.error.code === 190) {
        console.error('\n⚠️ The access token has expired or is invalid.');
        console.log('Solutions:');
        console.log('1. Re-authorize the application to get a new token');
        console.log('2. Update the INSTAGRAM_ACCESS_TOKEN environment variable');
        
        if (isOAuthConfigured) {
          const authUrl = instagramOAuth.getAuthorizationUrl();
          console.log(`\nTo get a new token, visit: ${authUrl}`);
        }
      } else if (error.response.data.error.code === 4) {
        console.error('\n⚠️ Rate limit exceeded.');
        console.log('Solutions:');
        console.log('1. Wait before trying again');
        console.log('2. Ensure you\'re not making too many requests');
      }
    } else if (error.response?.status === 400) {
      console.error('\n⚠️ The access token appears to be invalid or expired.');
      console.error('Response Details:');
      console.error(error.response.data);
      
      // Check for specific error messages
      if (typeof error.response.data === 'string' && error.response.data.includes("content isn't available")) {
        console.error('\nThis error typically occurs when:');
        console.error('1. The access token is expired (most common)');
        console.error('2. The token does not have the required permissions');
        console.error('3. The associated Instagram account has been deactivated or restricted');
      }
      
      console.log('\nSolutions:');
      console.log('1. Generate a new access token using the OAuth flow');
      console.log('2. Ensure the token has the correct permissions (user_profile, user_media)');
      
      if (isOAuthConfigured) {
        const authUrl = instagramOAuth.getAuthorizationUrl();
        console.log(`\nTo get a new token, visit: ${authUrl}`);
      }
    } else {
      console.error('\nGeneral API error occurred. Check your network connection and try again.');
    }
  }
}

// Run the verification
verifyInstagramCredentials().catch(error => {
  console.error('Unhandled error during verification:');
  console.error(error);
});