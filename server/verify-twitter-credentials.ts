/**
 * Twitter API Credentials Verification Tool
 * 
 * This script tests if the current Twitter API credentials are working
 * by attempting to fetch a specific Twitter user profile.
 * 
 * To run: npx tsx server/verify-twitter-credentials.ts
 */

import { TwitterApi } from 'twitter-api-v2';

async function verifyTwitterCredentials() {
  console.log('🔑 Twitter API Credentials Verification 🔑');
  console.log('-----------------------------------------');
  
  // Check if credentials exist
  if (!process.env.TWITTER_API_KEY || !process.env.TWITTER_API_SECRET || !process.env.TWITTER_BEARER_TOKEN) {
    console.error('❌ Missing Twitter API credentials in environment variables!');
    console.log('Required variables: TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_BEARER_TOKEN');
    return;
  }
  
  console.log('✅ All required environment variables are present');
  
  // Create the Twitter client with the bearer token
  try {
    console.log('Creating Twitter client with provided bearer token...');
    const client = new TwitterApi(process.env.TWITTER_BEARER_TOKEN);
    
    // Try to fetch a well-known Twitter account (Elon Musk's account)
    console.log('Testing API access by fetching Elon Musk\'s account...');
    console.log('---------------------------------------------------------');
    
    // Make API request with detailed error handling
    try {
      const response = await client.v2.userByUsername('elonmusk', {
        'user.fields': 'description,profile_image_url,public_metrics,created_at'
      });
      
      if (response && response.data) {
        console.log('✅ SUCCESS! Twitter API credentials are working!');
        console.log('Account details fetched:');
        console.log(`- Username: ${response.data.username}`);
        console.log(`- Name: ${response.data.name}`);
        console.log(`- ID: ${response.data.id}`);
        console.log(`- Description: ${response.data.description ? response.data.description.substring(0, 50) + '...' : 'No description'}`);
        
        if (response.data.public_metrics) {
          console.log('Public Metrics:');
          console.log(`- Followers: ${response.data.public_metrics.followers_count}`);
          console.log(`- Following: ${response.data.public_metrics.following_count}`);
          console.log(`- Tweet count: ${response.data.public_metrics.tweet_count}`);
        }
        
        // Try a second test to verify it's not a fluke
        console.log('\nPerforming secondary verification...');
        const secondTest = await client.v2.userByUsername('BillGates');
        if (secondTest && secondTest.data) {
          console.log(`✅ Secondary verification successful (found user: ${secondTest.data.name})`);
        }
      } else {
        console.error('❌ API request successful but no data returned!');
        console.log('Response:', response);
      }
    } catch (apiError: any) {
      console.error('❌ API request failed!');
      
      if (apiError.code === 401 || (apiError.response && apiError.response.status === 401)) {
        console.error('❌ ERROR 401: Authentication failed. Your credentials are invalid or expired.');
        console.error('Please obtain new credentials from the Twitter Developer Portal.');
      } else if (apiError.code === 429 || (apiError.response && apiError.response.status === 429)) {
        console.error('❌ ERROR 429: Rate limit exceeded. The API is temporarily unavailable due to too many requests.');
        console.error('This is a temporary condition. Try again after some time.');
      } else {
        console.error(`❌ ERROR ${apiError.code || 'unknown'}: ${apiError.message}`);
        if (apiError.response) {
          console.error('Response status:', apiError.response.status);
          console.error('Response data:', apiError.response.data);
        }
      }
    }
    
  } catch (clientError) {
    console.error('❌ Failed to initialize Twitter client!');
    console.error(clientError);
  }
}

// Run the verification
verifyTwitterCredentials().catch(error => {
  console.error('Unhandled error during verification:');
  console.error(error);
});