/**
 * Direct Reddit API Test
 * 
 * This script tests the Reddit API directly without using snoowrap
 * It demonstrates how to get an access token and make direct API calls
 * 
 * To run: npx tsx server/tests/test-reddit-direct.ts <username>
 */

import 'dotenv/config';
import axios from 'axios';
import { log } from '../vite';

// Load environment variables
const clientId = process.env.REDDIT_CLIENT_ID;
const clientSecret = process.env.REDDIT_CLIENT_SECRET;

/**
 * Get a Reddit API access token using the application-only flow
 */
async function getRedditAccessToken(): Promise<string> {
  // Create the authorization string (base64 encoded client_id:client_secret)
  const authString = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  
  // Make the token request directly with axios
  const response = await axios.post(
    'https://www.reddit.com/api/v1/access_token',
    'grant_type=client_credentials',
    {
      headers: {
        'User-Agent': 'DigitalFootprintTracker/1.0.0 (by /u/anonymous_user)',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${authString}`
      }
    }
  );
  
  if (response.data && response.data.access_token) {
    return response.data.access_token;
  }
  
  throw new Error('Failed to obtain Reddit access token');
}

/**
 * Make a direct API call to Reddit
 */
async function callRedditApi(endpoint: string, accessToken: string): Promise<any> {
  const response = await axios.get(`https://oauth.reddit.com${endpoint}`, {
    headers: {
      'User-Agent': 'DigitalFootprintTracker/1.0.0 (by /u/anonymous_user)',
      'Authorization': `Bearer ${accessToken}`
    }
  });
  
  return response.data;
}

/**
 * Test fetching a Reddit user directly
 */
async function testRedditUserDirect(username: string): Promise<void> {
  console.log(`\n📱 Testing Reddit API directly for user: ${username}`);
  console.log('------------------------------------------');
  
  try {
    // Get an access token
    console.log('\n🔑 Getting OAuth token...');
    const accessToken = await getRedditAccessToken();
    console.log(`✅ Success! Token: ${accessToken.substring(0, 10)}...`);
    
    // Get user information
    console.log(`\n🔍 Fetching user data for /u/${username}...`);
    
    // Use the /user/{username}/about endpoint
    const userData = await callRedditApi(`/user/${username}/about`, accessToken);
    console.log('✅ Successfully retrieved user data!');
    
    // Display core user data
    if (userData && userData.data) {
      console.log('\n📝 User Profile:');
      console.log(`- Username: ${userData.data.name}`);
      console.log(`- Created: ${new Date(userData.data.created_utc * 1000).toLocaleString()}`);
      console.log(`- Karma: ${userData.data.link_karma} post, ${userData.data.comment_karma} comment`);
      console.log(`- Has verified email: ${userData.data.has_verified_email ? 'Yes' : 'No'}`);
      
      // Try to get recent posts
      console.log('\n📄 Fetching recent posts...');
      const posts = await callRedditApi(`/user/${username}/submitted?limit=5`, accessToken);
      
      if (posts && posts.data && posts.data.children) {
        console.log(`✅ Found ${posts.data.children.length} posts`);
        
        posts.data.children.forEach((post: any, index: number) => {
          console.log(`\n[${index + 1}] ${post.data.title}`);
          console.log(`- Subreddit: r/${post.data.subreddit}`);
          console.log(`- Posted: ${new Date(post.data.created_utc * 1000).toLocaleString()}`);
          console.log(`- Score: ${post.data.score}`);
        });
      } else {
        console.log('❌ No posts found or could not retrieve posts');
      }
      
      // Try to get recent comments
      console.log('\n💬 Fetching recent comments...');
      const comments = await callRedditApi(`/user/${username}/comments?limit=5`, accessToken);
      
      if (comments && comments.data && comments.data.children) {
        console.log(`✅ Found ${comments.data.children.length} comments`);
        
        comments.data.children.forEach((comment: any, index: number) => {
          console.log(`\n[${index + 1}] Comment in r/${comment.data.subreddit}`);
          console.log(`- Content: ${comment.data.body.substring(0, 100)}${comment.data.body.length > 100 ? '...' : ''}`);
          console.log(`- Posted: ${new Date(comment.data.created_utc * 1000).toLocaleString()}`);
          console.log(`- Score: ${comment.data.score}`);
        });
      } else {
        console.log('❌ No comments found or could not retrieve comments');
      }
    } else {
      console.error('❌ Invalid user data format received from Reddit API');
    }
    
    console.log('\n✅ Direct Reddit API test completed successfully');
  } catch (error) {
    console.error('\n❌ Error during direct Reddit API test:');
    
    if (axios.isAxiosError(error)) {
      if (error.response) {
        console.error(`Status: ${error.response.status}`);
        console.error(`Status Text: ${error.response.statusText}`);
        console.error(`Message: ${JSON.stringify(error.response.data)}`);
        
        if (error.response.status === 404) {
          console.error(`\nThe user "${username}" was not found on Reddit.`);
        } else if (error.response.status === 403) {
          console.error(`\nAccess forbidden. This may be due to the user having a private account.`);
        }
      } else {
        console.error(`Error: ${error.message}`);
      }
    } else if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(String(error));
    }
  }
}

// Get username from command line or use default
const username = process.argv[2] || 'spez'; // Reddit co-founder as default

// Run the test
testRedditUserDirect(username).catch(error => {
  console.error('Unhandled error:', error);
});