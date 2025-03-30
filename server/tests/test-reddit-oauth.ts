/**
 * Reddit OAuth Token Test
 * 
 * This script specifically tests the Reddit OAuth token generation process
 * It attempts to follow Reddit's application-only OAuth flow using the provided credentials
 * 
 * To run: npx tsx server/tests/test-reddit-oauth.ts
 */

import 'dotenv/config';
import axios from 'axios';
import { log } from '../vite';

// Load environment variables
const clientId = process.env.REDDIT_CLIENT_ID;
const clientSecret = process.env.REDDIT_CLIENT_SECRET;

/**
 * Test Reddit OAuth token generation
 */
async function testRedditOAuth() {
  console.log('\n🔑 Testing Reddit OAuth Token Generation');
  console.log('------------------------------------------');
  
  // Check credentials
  if (!clientId || !clientSecret) {
    console.error('❌ Missing Reddit API credentials!');
    console.error('Please make sure the following environment variables are set:');
    console.error('- REDDIT_CLIENT_ID');
    console.error('- REDDIT_CLIENT_SECRET');
    process.exit(1);
  }
  
  console.log('✅ Found Reddit API credentials');
  console.log(`- Client ID: ${clientId.substring(0, 5)}...`);
  
  try {
    // Create the authorization string (base64 encoded client_id:client_secret)
    const authString = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    console.log(`- Authorization: Basic ${authString.substring(0, 10)}...`);
    
    console.log('\n🔄 Making OAuth token request...');
    
    // Make the token request directly with axios
    const response = await axios.post(
      'https://www.reddit.com/api/v1/access_token',
      'grant_type=client_credentials',
      {
        headers: {
          'User-Agent': 'DigitalFootprintTracker/1.0.0 (Node.js App)',
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${authString}`
        }
      }
    );
    
    // Log full response for debugging
    console.log('\n📋 Response Status:', response.status);
    console.log('📋 Response Headers:', JSON.stringify(response.headers, null, 2));
    console.log('📋 Response Data:', JSON.stringify(response.data, null, 2));
    
    // Process the response
    const data = response.data;
    if (data && data.access_token) {
      console.log(`\n✅ Successfully obtained access token!`);
      console.log(`- Token: ${data.access_token.substring(0, 10)}...`);
      console.log(`- Type: ${data.token_type}`);
      console.log(`- Expires: ${data.expires_in} seconds`);
      
      // Calculate expiry time
      const expiryTime = new Date(Date.now() + (data.expires_in * 1000));
      console.log(`- Expiry Date: ${expiryTime.toISOString()}`);
    } else {
      console.error('\n❌ Invalid response from Reddit OAuth endpoint');
      console.error('Response did not contain an access_token');
    }
  } catch (error) {
    console.error('\n❌ Error during OAuth token request:');
    
    if (axios.isAxiosError(error)) {
      // Handle Axios errors with more detail
      if (error.response) {
        // The request was made and the server responded with a non-2xx status code
        console.error(`Status: ${error.response.status}`);
        console.error(`Status Text: ${error.response.statusText}`);
        console.error('Response Headers:', JSON.stringify(error.response.headers, null, 2));
        
        // Log response data
        try {
          console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
        } catch (e) {
          console.error('Response Data: [Cannot stringify response data]');
          console.error(String(error.response.data).substring(0, 500) + '...');
        }
        
        // Provide suggestions based on status code
        if (error.response.status === 401) {
          console.error('\nPossible reasons:');
          console.error('- Invalid client ID or client secret');
          console.error('- Malformed authorization header');
        } else if (error.response.status === 403) {
          console.error('\nPossible reasons:');
          console.error('- Insufficient permissions or scope');
          console.error('- Account rate limited or suspended');
        } else if (error.response.status === 429) {
          console.error('\nPossible reasons:');
          console.error('- Rate limited by Reddit API');
          console.error('- Too many requests from your IP address');
        }
      } else if (error.request) {
        // The request was made but no response was received
        console.error('No response received from server');
        console.error('Request data:', error.request);
      } else {
        // Something happened in setting up the request
        console.error('Error setting up request:', error.message);
      }
      
      console.error('\nRequest Config:');
      console.error(`- URL: ${error.config?.url}`);
      console.error(`- Method: ${error.config?.method?.toUpperCase()}`);
      console.error(`- Headers:`, JSON.stringify(error.config?.headers, null, 2));
    } else if (error instanceof Error) {
      // Handle regular errors
      console.error(error.message);
      console.error(error.stack);
    } else {
      // Handle unknown errors
      console.error(String(error));
    }
  }
}

// Run the test function
testRedditOAuth().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});