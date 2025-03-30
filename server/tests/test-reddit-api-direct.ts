/**
 * Reddit API Direct Service Test
 * 
 * This tool tests the new direct Reddit API service that doesn't rely on snoowrap
 * It tests the getApiStatus and fetchUserData methods
 * 
 * To run: npx tsx server/tests/test-reddit-api-direct.ts <username>
 */

import 'dotenv/config';
import { redditApi } from '../services/reddit-api';

/**
 * Test the Reddit Direct API with a given username
 * @param username Username to test (defaults to 'spez')
 */
async function testRedditApiDirect(username: string = 'spez') {
  
  console.log(`\n📱 Testing Direct Reddit API for user: ${username}`);
  console.log('------------------------------------------');
  
  try {
    // Check the API status
    const apiStatus = await redditApi.getApiStatus();
    console.log(`\n🔄 API Status:`, apiStatus);
    
    if (!apiStatus.configured || !apiStatus.operational) {
      console.error(`\n❌ Reddit API is not properly configured or operational.`);
      console.log('Check your credentials in the environment variables:');
      console.log('- REDDIT_CLIENT_ID');
      console.log('- REDDIT_CLIENT_SECRET');
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
    
    console.log('\n✅ Reddit Direct API test completed successfully.');
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
    } else if (error.message.includes('NOT_FOUND')) {
      console.log('\nThe specified username does not exist on Reddit.');
    } else if (error.message.includes('PRIVACY_ERROR')) {
      console.log('\nThe user account exists but access to data is restricted due to:');
      console.log('- Account privacy settings');
      console.log('- Account suspension');
      console.log('- Other visibility restrictions');
    }
    
    // Print stack trace for debugging
    console.error('\nStack trace:');
    console.error(error.stack);
    
    process.exit(1);
  }
}

// If this file is run directly, run the test with command line arguments
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const testUsername = args[0] || 'spez';
  
  testRedditApiDirect(testUsername).catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

// Export the test function
export default testRedditApiDirect;