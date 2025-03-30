/**
 * Twitter API Test Client
 * 
 * This tool helps debug and test Twitter API access for a specific username
 * It bypasses the frontend and directly tests the Twitter API service with a given username.
 * 
 * To run: npx tsx server/test-twitter-api.ts <username>
 */

import { twitterApi } from './services/twitter-api';

async function testTwitterAPI() {
  const username = process.argv[2];
  
  if (!username) {
    console.error('Please provide a Twitter username to test');
    console.log('Usage: npx tsx server/test-twitter-api.ts <username>');
    process.exit(1);
  }
  
  console.log(`Testing Twitter API for username: ${username}`);
  
  // Check the API status
  const status = twitterApi.getApiStatus();
  console.log('Twitter API Status:', status);
  
  if (!status.configured) {
    console.error('Twitter API is not configured. Please set up your environment variables:');
    console.error('- TWITTER_API_KEY');
    console.error('- TWITTER_API_SECRET');
    console.error('- TWITTER_BEARER_TOKEN');
    process.exit(1);
  }
  
  // Fetch user data
  try {
    console.log(`Fetching data for ${username}...`);
    const data = await twitterApi.fetchUserData(username);
    
    if (!data) {
      console.log(`No data found for Twitter user: ${username}`);
      process.exit(0);
    }
    
    console.log('\nUser Data:');
    console.log('----------------');
    console.log(`Username: ${data.username}`);
    console.log(`Display Name: ${data.profileData?.displayName}`);
    console.log(`Bio: ${data.profileData?.bio}`);
    console.log(`Followers: ${data.profileData?.followerCount}`);
    console.log(`Following: ${data.profileData?.followingCount}`);
    console.log(`Total Posts: ${data.activityData?.totalPosts}`);
    
    if (data.contentData && data.contentData.length > 0) {
      console.log('\nRecent Posts:');
      console.log('----------------');
      data.contentData.slice(0, 3).forEach((post, index) => {
        console.log(`${index + 1}. ${post.content?.substring(0, 50)}${post.content && post.content.length > 50 ? '...' : ''}`);
        console.log(`   Posted: ${post.timestamp}`);
        console.log(`   Engagement: ${post.engagement?.likes} likes, ${post.engagement?.comments} comments, ${post.engagement?.shares} shares`);
        console.log('');
      });
    }
    
    console.log('Test completed successfully!');
  } catch (error) {
    console.error('Error testing Twitter API:', error);
    process.exit(1);
  }
}

testTwitterAPI();