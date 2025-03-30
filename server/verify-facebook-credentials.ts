/**
 * Facebook API Credentials Verification Tool
 * 
 * This script tests if the current Facebook API credentials are working
 * by attempting to fetch account information using the Graph API.
 * 
 * To run: npx tsx server/verify-facebook-credentials.ts
 */

import dotenv from 'dotenv';
import { facebookApi } from './services/facebook-api';

// Load environment variables
dotenv.config();

async function verifyFacebookCredentials() {
  console.log('Facebook API Credentials Verification Tool');
  console.log('------------------------------------------');
  
  try {
    // Check environment variables
    console.log('Checking environment variables...');
    
    const appId = process.env.FACEBOOK_APP_ID;
    const appSecret = process.env.FACEBOOK_APP_SECRET;
    const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
    
    if (!appId) {
      console.error('❌ FACEBOOK_APP_ID is missing');
    } else {
      console.log('✅ FACEBOOK_APP_ID is set');
    }
    
    if (!appSecret) {
      console.error('❌ FACEBOOK_APP_SECRET is missing');
    } else {
      console.log('✅ FACEBOOK_APP_SECRET is set');
    }
    
    if (!accessToken) {
      console.error('❌ FACEBOOK_ACCESS_TOKEN is missing');
    } else {
      console.log('✅ FACEBOOK_ACCESS_TOKEN is set');
    }
    
    if (!appId || !appSecret || !accessToken) {
      console.error('\nSome credentials are missing. Please set all required environment variables:');
      console.log('- FACEBOOK_APP_ID: Facebook App ID from the Facebook Developer Portal');
      console.log('- FACEBOOK_APP_SECRET: Facebook App Secret from the Facebook Developer Portal');
      console.log('- FACEBOOK_ACCESS_TOKEN: Access token with appropriate permissions');
      
      console.log('\nTo get these credentials:');
      console.log('1. Go to https://developers.facebook.com/ and create an app');
      console.log('2. Navigate to your app dashboard and copy the App ID and App Secret');
      console.log('3. Use the Graph API Explorer to generate an access token with appropriate permissions');
      process.exit(1);
    }
    
    // Check API connectivity
    console.log('\nTesting Facebook API connectivity...');
    
    const apiStatus = await facebookApi.getApiStatus();
    
    console.log(`Status: ${apiStatus.configured ? 'Configured' : 'Not Configured'}, ${apiStatus.operational ? 'Operational' : 'Not Operational'}`);
    console.log(`Message: ${apiStatus.message}`);
    
    if (apiStatus.configured && apiStatus.operational) {
      console.log('\n✅ Facebook API credentials are valid and working correctly!');
    } else {
      console.error('\n❌ Facebook API credentials are not working properly');
      console.log('Please check the error message above and ensure your credentials are correct.');
      
      if (apiStatus.message.includes('expired')) {
        console.log('\nYour access token may have expired. Generate a new one through the Facebook Graph API Explorer.');
      }
      
      if (apiStatus.message.includes('permission')) {
        console.log('\nYour access token may not have the required permissions.');
        console.log('Make sure to include these permissions when generating the token:');
        console.log('- public_profile');
        console.log('- user_posts');
      }
      
      process.exit(1);
    }
  } catch (error: any) {
    console.error('Error verifying Facebook credentials:', error.message);
    process.exit(1);
  }
}

// Run the verification
verifyFacebookCredentials().catch(err => {
  console.error('Unhandled error during verification:', err);
});