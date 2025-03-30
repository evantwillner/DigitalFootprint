/**
 * Reddit API Test Client
 * 
 * This tool helps debug and test Reddit API access for a specific username
 * It bypasses the frontend and directly tests the Reddit API service with a given username.
 * 
 * To run: npx tsx server/tests/test-reddit-api.ts <username>
 */

import 'dotenv/config';
import { redditApi } from '../services/reddit-api';

/**
 * Test the Reddit API with a given username
 * @param username Username to test (defaults to 'evanhaus')
 */
async function testRedditAPI(username: string = 'evanhaus') {
  
  console.log(`\n📱 Testing Reddit API for user: ${username}`);
  console.log('------------------------------------------');
  
  try {
    // Test OAuth token generation directly
    console.log('\n🔑 Testing Reddit OAuth token generation...');
    try {
      // Access the private method for testing
      const getAccessToken = (redditApi as any).getAccessToken.bind(redditApi);
      const token = await getAccessToken();
      console.log(`✅ Successfully obtained access token: ${token.substring(0, 10)}...`);
    } catch (tokenError: any) {
      console.error(`❌ Error getting access token: ${tokenError.message}`);
      console.error(tokenError.stack);
    }
    
    // Check the API status
    const apiStatus = await redditApi.getApiStatus();
    console.log(`\n🔄 API Status:`, apiStatus);
    
    if (!apiStatus.configured || !apiStatus.operational) {
      console.error(`\n❌ Reddit API is not properly configured or operational.`);
      console.log('Check your credentials in the environment variables:');
      console.log('- REDDIT_CLIENT_ID');
      console.log('- REDDIT_CLIENT_SECRET');
      console.log('- REDDIT_USERNAME (optional)');
      console.log('- REDDIT_PASSWORD (optional)');
      process.exit(1);
    }
    
    console.log(`\n🔍 Fetching data for Reddit user "${username}"...`);
    
    // Run the actual test - fetch user data
    const result = await redditApi.fetchUserData(username);
    
    if (!result) {
      console.error(`\n❌ No data found for username: ${username}`);
      process.exit(1);
    }
    
    // Display basic profile info
    console.log('\n📝 User Profile:');
    console.log(`- Username: ${result.username}`);
    if (result.profileData) {
      console.log(`- Display name: ${result.profileData.displayName || result.username}`);
      console.log(`- Bio: ${result.profileData.bio ? 
        `${result.profileData.bio.substring(0, 100)}${result.profileData.bio.length > 100 ? '...' : ''}` : 'No bio'}`);
      console.log(`- Followers: ${result.profileData.followerCount || 0}`);
      console.log(`- Joined: ${result.profileData.joinDate ? 
        new Date(result.profileData.joinDate).toLocaleDateString() : 'Unknown'}`);
      console.log(`- Profile URL: ${result.profileData.profileUrl || `https://reddit.com/user/${result.username}`}`);
    } else {
      console.log('- Profile data not available');
    }
    
    // Display activity data
    console.log('\n📊 Activity Data:');
    if (result.activityData) {
      console.log(`- Post Karma: ${result.activityData.totalPosts || 0}`);
      console.log(`- Comment Karma: ${result.activityData.totalComments || 0}`);
      console.log(`- Posts Per Day: ${typeof result.activityData.postsPerDay === 'number' ? 
        result.activityData.postsPerDay.toFixed(2) : '0.00'}`);
      console.log(`- Top Subreddits: ${result.activityData.topSubreddits?.join(', ') || 'None'}`);
    } else {
      console.log('- Activity data not available');
    }
    
    // Display content sample
    console.log('\n📄 Recent Content Sample:');
    if (result.contentData && result.contentData.length > 0) {
      const contentSample = result.contentData.slice(0, 3);
      contentSample.forEach((item, index) => {
        console.log(`\n[${index + 1}] ${item.type?.toUpperCase() || 'UNKNOWN'} (${item.timestamp ? 
          new Date(item.timestamp).toLocaleDateString() : 'Unknown date'})`);
        console.log(`- Content: ${item.content ? 
          `${item.content.substring(0, 100)}${item.content.length > 100 ? '...' : ''}` : 'No content'}`);
        console.log(`- Sentiment: ${item.sentiment || 'Unknown'}`);
        console.log(`- URL: ${item.url || 'No URL'}`);
      });
    } else {
      console.log('- No content samples available');
    }
    
    // Display privacy metrics
    console.log('\n🔒 Privacy Analysis:');
    if (result.privacyMetrics) {
      console.log(`- Exposure Score: ${result.privacyMetrics.exposureScore || 0}/100`);
      if (result.privacyMetrics.potentialConcerns && result.privacyMetrics.potentialConcerns.length > 0) {
        console.log('- Potential Concerns:');
        result.privacyMetrics.potentialConcerns.forEach(concern => {
          console.log(`  - ${concern.issue} (Risk: ${concern.risk || 'Unknown'})`);
        });
      } else {
        console.log('- No potential concerns identified');
      }
    } else {
      console.log('- Privacy metrics not available');
    }
    
    console.log('\n✅ Reddit API test completed successfully.');
  } catch (error: any) {
    console.error(`\n❌ Error: ${error.message}`);
    
    // Provide more helpful context based on error type
    if (error.message.includes('API_ERROR') || error.message.includes('API error')) {
      console.log('\nThis may be due to:');
      console.log('- Incorrect API credentials');
      console.log('- Rate limiting from Reddit');
      console.log('- Network connectivity issues');
    } else if (error.message.includes('AUTH_ERROR')) {
      console.log('\nAuthentication failed. Please check:');
      console.log('- REDDIT_CLIENT_ID');
      console.log('- REDDIT_CLIENT_SECRET');
      console.log('- REDDIT_USERNAME (if using script auth)');
      console.log('- REDDIT_PASSWORD (if using script auth)');
    } else if (error.message.includes('NOT_FOUND')) {
      console.log('\nThe specified username does not exist on Reddit.');
    } else if (error.message.includes('PRIVACY_ERROR')) {
      console.log('\nThe user account exists but access to data is restricted due to:');
      console.log('- Account privacy settings');
      console.log('- Account suspension');
      console.log('- Other visibility restrictions');
    }
    
    process.exit(1);
  }
}

// If this file is run directly, run the test with command line arguments
// Using import.meta.url to check if this is the main module in ESM
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const testUsername = args[0] || 'evanhaus';
  
  testRedditAPI(testUsername).catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

// Export the test function
export default testRedditAPI;