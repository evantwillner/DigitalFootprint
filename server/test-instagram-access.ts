/**
 * Instagram API Test Client
 * 
 * This tool helps debug and test Instagram API access for a specific username
 * It bypasses the frontend and directly tests the Instagram API service with a given username.
 * 
 * To run: npx tsx server/test-instagram-access.ts <username>
 */

import { instagramApiApify } from './services/instagram-api-apify';

async function testInstagramAPI() {
  // Get username from command line argument
  const username = process.argv[2];
  
  if (!username) {
    console.error('Please provide an Instagram username as command line argument.');
    console.error('Usage: npx tsx server/test-instagram-access.ts <username>');
    process.exit(1);
  }
  
  console.log(`🔍 Testing Instagram API for username: ${username}`);
  console.log('----------------------------------------------');
  
  // First check API status
  console.log('\n📊 Checking Instagram API status...');
  const status = await instagramApiApify.getApiStatus();
  console.log(`Status: ${JSON.stringify(status, null, 2)}`);
  
  if (!status.configured) {
    console.error('\n❌ Instagram API is not configured.');
    console.error(status.message);
    process.exit(1);
  }
  
  if (status.operational === false) {
    console.error('\n⚠️ Instagram API is configured but not operational:');
    console.error(status.message);
    console.error('\nWill attempt to fetch data anyway...');
  } else if (status.operational === true) {
    console.log('\n✅ Instagram API is configured and operational!');
  }
  
  // Try to fetch data for the user
  console.log(`\n🔎 Attempting to fetch data for username: ${username}...`);
  console.time('Data fetch time');
  
  try {
    const data = await instagramApiApify.fetchUserData(username);
    console.timeEnd('Data fetch time');
    
    if (!data) {
      console.error(`\n❌ No data found for username: ${username}`);
      console.error('Possible reasons:');
      console.error('1. The username does not exist');
      console.error('2. The account is private');
      console.error('3. There are API permission/rate limiting issues');
      console.error('4. The API service is temporarily unavailable');
      process.exit(1);
    }
    
    console.log('\n✅ Successfully retrieved Instagram data!');
    console.log('\n📝 User Profile Summary:');
    console.log(`Display Name: ${data.profileData?.displayName || 'Unknown'}`);
    
    const bio = data.profileData?.bio || '';
    console.log(`Bio: ${bio.substring(0, 50)}${bio.length > 50 ? '...' : ''}`);
    
    console.log(`Followers: ${(data.profileData?.followerCount || 0).toLocaleString()}`);
    console.log(`Following: ${(data.profileData?.followingCount || 0).toLocaleString()}`);
    console.log(`Total Posts: ${(data.activityData?.totalPosts || 0).toLocaleString()}`);
    
    console.log('\n📈 Content Analysis:');
    console.log(`Exposure Score: ${data.analysisResults?.exposureScore || 0}/100`);
    
    console.log('\n📊 Top Topics:');
    data.analysisResults?.topTopics?.forEach(topic => {
      console.log(`- ${topic.topic}: ${Math.round((topic.percentage || 0) * 100)}%`);
    });
    
    console.log('\n⚠️ Privacy Concerns:');
    if (!data.analysisResults?.privacyConcerns || data.analysisResults.privacyConcerns.length === 0) {
      console.log('No significant privacy concerns detected.');
    } else {
      data.analysisResults.privacyConcerns.forEach(concern => {
        console.log(`- [${concern.severity.toUpperCase()}] ${concern.type}: ${concern.description}`);
      });
    }
    
    console.log('\n📱 Content Breakdown:');
    const contentBreakdown = data.analysisResults?.platformSpecificMetrics?.contentBreakdown || {};
    Object.entries(contentBreakdown).forEach(([type, percentage]) => {
      console.log(`- ${type}: ${Math.round((percentage as number) * 100)}%`);
    });
    
    console.log('\n🏷️ Top Hashtags:');
    const hashtags = data.analysisResults?.platformSpecificMetrics?.hashtagAnalysis || [];
    if (hashtags.length === 0) {
      console.log('No hashtags detected in recent posts.');
    } else {
      hashtags.forEach((tag: { tag: string; count: number }) => {
        console.log(`- ${tag.tag} (${tag.count})`);
      });
    }
    
    console.log('\nTest completed successfully! ✨');
  } catch (error) {
    console.timeEnd('Data fetch time');
    console.error(`\n❌ Error fetching data for username: ${username}`);
    console.error(error);
    process.exit(1);
  }
}

// Run the test
testInstagramAPI().catch(error => {
  console.error('Unhandled error during testing:');
  console.error(error);
  process.exit(1);
});