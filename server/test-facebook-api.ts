/**
 * Facebook API Test Client
 * 
 * This tool helps debug and test Facebook API access for a specific username
 * It bypasses the frontend and directly tests the Facebook API service with a given username.
 * 
 * To run: npx tsx server/test-facebook-api.ts <username>
 */

import dotenv from 'dotenv';
import { facebookApi } from './services/facebook-api';

// Load environment variables
dotenv.config();

async function testFacebookAPI() {
  const username = process.argv[2];
  
  if (!username) {
    console.error('Error: You must provide a username to test.');
    console.log('Usage: npx tsx server/test-facebook-api.ts <username>');
    process.exit(1);
  }
  
  console.log(`Facebook API Test Client - Testing username: ${username}`);
  console.log('-------------------------------------------------------');
  
  try {
    // First check if the API is configured and operational
    const apiStatus = await facebookApi.getApiStatus();
    console.log('Facebook API Status:');
    console.log(`- Configured: ${apiStatus.configured}`);
    console.log(`- Operational: ${apiStatus.operational}`);
    console.log(`- Message: ${apiStatus.message}`);
    
    if (!apiStatus.configured || !apiStatus.operational) {
      console.error('\n❌ Facebook API is not properly configured or operational.');
      console.log('Please run server/verify-facebook-credentials.ts to diagnose the issue.');
      process.exit(1);
    }
    
    console.log('\nFetching data for username:', username);
    
    // Fetch user data
    const userData = await facebookApi.fetchUserData(username);
    
    if (!userData) {
      console.error(`\n❌ No data returned for username: ${username}`);
      console.log('Possible reasons:');
      console.log('- The username does not exist on Facebook');
      console.log('- The user\'s privacy settings prevent access to their data');
      console.log('- The API token does not have sufficient permissions');
      console.log('- Facebook API search limitations (not all usernames can be found via the API)');
      process.exit(1);
    }
    
    console.log('\n✅ Successfully retrieved Facebook data!');
    console.log('\nProfile Data:');
    console.log(`- Username: ${userData.username}`);
    console.log(`- Display Name: ${userData.profileData?.displayName || 'N/A'}`);
    console.log(`- Bio: ${userData.profileData?.bio ? 
      userData.profileData.bio.substring(0, 50) + (userData.profileData.bio.length > 50 ? '...' : '') : 'N/A'}`);
    console.log(`- Posts: ${userData.activityData?.totalPosts || 0}`);
    console.log(`- Last Active: ${userData.activityData?.lastActive || 'Unknown'}`);
    
    console.log('\nContent Sample:');
    if (userData.contentData && userData.contentData.length > 0) {
      const sample = userData.contentData[0];
      console.log(`- Type: ${sample.type}`);
      console.log(`- Created: ${sample.timestamp}`);
      
      if (sample.content) {
        console.log(`- Content: ${sample.content.substring(0, 100)}${sample.content.length > 100 ? '...' : ''}`);
      } else {
        console.log('- Content: No content available');
      }
      
      if (sample.engagement) {
        console.log(`- Engagement: ${sample.engagement.likes || 0} likes, ${sample.engagement.comments || 0} comments, ${sample.engagement.shares || 0} shares`);
      } else {
        console.log('- Engagement: No engagement data available');
      }
    } else {
      console.log('No content available');
    }
    
    console.log('\nPrivacy Analysis:');
    if (userData.privacyMetrics) {
      console.log(`- Exposure Score: ${userData.privacyMetrics.exposureScore}/100`);
      
      console.log('- Top Concerns:');
      if (userData.privacyMetrics.potentialConcerns && userData.privacyMetrics.potentialConcerns.length > 0) {
        userData.privacyMetrics.potentialConcerns.slice(0, 3).forEach(concern => {
          console.log(`  * ${concern.issue} (${concern.risk} risk)`);
        });
      } else {
        console.log('  No significant concerns found');
      }
      
      console.log('\nRecommended Actions:');
      if (userData.privacyMetrics.recommendedActions && userData.privacyMetrics.recommendedActions.length > 0) {
        userData.privacyMetrics.recommendedActions.slice(0, 3).forEach((action, index) => {
          console.log(`${index + 1}. ${action}`);
        });
      } else {
        console.log('  No recommended actions available');
      }
    } else {
      console.log('Privacy metrics not available');
    }
    
    console.log('\nFor full details, use the web interface to view the complete analysis.');
  } catch (error: any) {
    console.error('Error testing Facebook API:', error.message);
    if (error.response?.data?.error) {
      console.error('API Error Details:', error.response.data.error);
    }
  }
}

// Run the test
testFacebookAPI().catch(err => {
  console.error('Unhandled error during testing:', err);
});