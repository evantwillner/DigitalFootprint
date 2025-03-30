/**
 * Test Instagram API access for a specified username
 * 
 * This script allows testing the Instagram API implementation with a specific username
 * and can be used to debug issues with the API.
 * 
 * Usage: npx tsx server/test-instagram-api.ts <username>
 */

import { instagramApi } from './services/instagram-api';
import { log } from './vite';

async function main() {
  // Get username from command line
  const username = process.argv[2];
  
  if (!username) {
    console.error('Error: Please provide an Instagram username.');
    console.error('Usage: npx tsx server/test-instagram-api.ts <username>');
    process.exit(1);
  }
  
  console.log(`🔍 Testing Instagram API for username: ${username}`);
  
  // First check API status
  console.log('\nChecking API status...');
  const status = await instagramApi.getApiStatus();
  console.log(JSON.stringify(status, null, 2));
  
  if (!status.configured) {
    console.error('Instagram API is not configured!');
    console.error(status.message);
    process.exit(1);
  }
  
  if (status.operational === false) {
    console.warn('⚠️ Instagram API is configured but not operational!');
    console.warn(status.message);
    console.log('\nWill attempt to retrieve data anyway...');
  }
  
  // Try to fetch user data
  console.log(`\nAttempting to fetch data for username: ${username}`);
  console.time('API request time');
  
  try {
    // Set logging to verbose for this test
    // Note: Vite log doesn't have a level property, we'll just use it as is
    
    const data = await instagramApi.fetchUserData(username);
    console.timeEnd('API request time');
    
    if (!data) {
      console.error(`No data found for Instagram user: ${username}`);
      console.error('Possible reasons:');
      console.error('- The username does not exist');
      console.error('- The account is private');
      console.error('- API credentials are invalid or insufficient permissions');
      console.error('- Rate limiting is in effect');
      process.exit(1);
    }
    
    console.log('\n✅ Successfully retrieved Instagram data!');
    console.log('\nData summary:');
    console.log(`- Username: ${data.username}`);
    
    if (data.profileData) {
      console.log(`- Display name: ${data.profileData.displayName}`);
      console.log(`- Followers: ${data.profileData.followerCount}`);
      console.log(`- Following: ${data.profileData.followingCount}`);
    } else {
      console.log('- Profile data: Not available');
    }
    
    if (data.activityData) {
      console.log(`- Posts: ${data.activityData.totalPosts}`);
    } else {
      console.log('- Activity data: Not available');
    }
    
    if (data.analysisResults) {
      console.log('\nAnalysis results:');
      console.log(`- Exposure score: ${data.analysisResults.exposureScore}/100`);
      
      if (data.analysisResults.topTopics) {
        console.log(`- Top topics: ${data.analysisResults.topTopics.map(t => `${t.topic} (${Math.round(t.percentage * 100)}%)`).join(', ')}`);
      }
      
      if (data.analysisResults.privacyConcerns && data.analysisResults.privacyConcerns.length > 0) {
        console.log('\nPrivacy concerns:');
        data.analysisResults.privacyConcerns.forEach(concern => {
          console.log(`- [${concern.severity.toUpperCase()}] ${concern.type}: ${concern.description}`);
        });
      }
      
      if (data.analysisResults.platformSpecificMetrics && data.analysisResults.platformSpecificMetrics.contentBreakdown) {
        console.log('\nContent breakdown:');
        Object.entries(data.analysisResults.platformSpecificMetrics.contentBreakdown).forEach(([type, percentage]) => {
          console.log(`- ${type}: ${Math.round((percentage as number) * 100)}%`);
        });
      }
      
      if (data.analysisResults.recommendedActions) {
        console.log('\nRecommended actions:');
        data.analysisResults.recommendedActions.forEach(action => {
          console.log(`- ${action}`);
        });
      }
    } else {
      console.log('\nAnalysis results: Not available');
    }
    
    console.log('\nTest completed successfully!');
  } catch (error) {
    console.timeEnd('API request time');
    console.error(`Error fetching data: ${error}`);
    process.exit(1);
  }
}

// Run the main function
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});