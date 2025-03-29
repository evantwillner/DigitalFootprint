import { instagramApi } from './instagram-api-v2';

// Helper to safely stringify objects with circular references
function safeStringify(obj: any, indent = 2) {
  const cache = new Set();
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (cache.has(value)) {
        return '[Circular]';
      }
      cache.add(value);
    }
    return value;
  }, indent);
}

// Test usernames to try
// include a mix of personal, business, and celebrity accounts
const testUsernames = [
  'instagram',         // Official Instagram account (verified business)
  'cristiano',         // Cristiano Ronaldo (celebrity verified)
  'victoriajustice',   // Victoria Justice (celebrity verified)
  'natgeo',            // National Geographic (verified business)
  'zuck',              // Mark Zuckerberg (verified personal)
  'kyliejenner',       // Kylie Jenner (celebrity verified)
  'therock'            // Dwayne Johnson (celebrity verified)
];

// Actual test function
async function testInstagramApi() {
  console.log('===== TESTING INSTAGRAM API V2 =====');
  
  // Status check
  const status = instagramApi.getApiStatus();
  console.log('API Status:', status);
  
  if (!status.configured) {
    console.error('API is not configured. Set the appropriate environment variables.');
    return;
  }
  
  // Test each username
  for (const username of testUsernames) {
    console.log(`\n----- Testing username: ${username} -----`);
    try {
      console.time(`Fetch ${username}`);
      const data = await instagramApi.fetchUserData(username);
      console.timeEnd(`Fetch ${username}`);
      
      if (!data) {
        console.log(`✘ No data found for ${username}`);
        continue;
      }
      
      console.log(`✓ Successfully retrieved data for ${username}`);
      
      // Log summary of data (not the full data to avoid console spam)
      console.log('Profile summary:');
      console.log(`  Name: ${data?.profileData?.displayName || 'Unknown'}`);
      console.log(`  Bio: ${data?.profileData?.bio ? data?.profileData?.bio.substring(0, 50) + (data?.profileData?.bio.length > 50 ? '...' : '') : 'N/A'}`);
      console.log(`  Followers: ${data?.profileData?.followerCount || 0}`);
      console.log(`  Following: ${data?.profileData?.followingCount || 0}`);
      console.log(`  Posts: ${data?.activityData?.totalPosts || 0}`);
      console.log(`  Content items: ${data?.contentData?.length || 0}`);
      
      // Debug certain accounts in more detail if needed
      if (username === 'victoriajustice') {
        console.log('\nDetailed data for victoriajustice:');
        if (data?.contentData && data.contentData.length > 0) {
          console.log('  Sample content item:', safeStringify(data.contentData[0]));
        }
        if (data?.analysisResults?.activityTimeline && data.analysisResults.activityTimeline.length > 0) {
          console.log('  Timeline data available:', data.analysisResults.activityTimeline.length, 'entries');
        }
        console.log('  Platform-specific metrics:', safeStringify(data?.analysisResults?.platformSpecificMetrics || {}));
      }
      
    } catch (error) {
      console.error(`Error testing ${username}:`, error);
    }
  }
  
  console.log('\n===== INSTAGRAM API V2 TEST COMPLETE =====');
}

// Run the test
testInstagramApi()
  .then(() => {
    console.log('All tests completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error in test suite:', error);
    process.exit(1);
  });