/**
 * Instagram API Test Client
 * 
 * This tool helps debug and test Instagram API access for a specific username
 * It bypasses the frontend and directly tests the Instagram API service with a given username.
 * 
 * To run: npx tsx server/test-instagram-access.ts <username>
 */

import { instagramApiV3 } from './services/instagram-api-v3';
import { log } from './vite';

async function testInstagramAPI() {
  // Get username from command line arguments
  const username = process.argv[2];
  
  if (!username) {
    console.error('Please provide an Instagram username as a command line argument.');
    console.error('Usage: npx tsx server/test-instagram-access.ts <username>');
    process.exit(1);
  }
  
  // Configure logging
  console.log(`Testing Instagram API with username: ${username}`);
  console.log('API status:', instagramApiV3.getApiStatus());
  
  try {
    // Attempt to fetch data
    console.log('Fetching profile data...');
    const data = await instagramApiV3.fetchUserData(username);
    
    if (data) {
      console.log('Success! Found Instagram profile:');
      console.log('- Username:', data.username);
      
      // Extract profile data with null checks
      const profileData = data.profileData || {};
      console.log('- Display Name:', profileData.displayName || 'Unknown');
      console.log('- Bio:', profileData.bio || 'No bio available');
      console.log('- Followers:', profileData.followerCount || 0);
      console.log('- Following:', profileData.followingCount || 0);
      
      // Extract activity data with null checks
      const activityData = data.activityData || {};
      console.log('- Posts:', activityData.totalPosts || 0);
      
      // Extract content data with null checks
      const contentData = data.contentData || [];
      console.log('- Content items:', contentData.length);
      
      console.log('\nAPI is working properly!');
    } else {
      console.error('No data returned! API call succeeded but returned null.');
    }
  } catch (error) {
    console.error('Error testing Instagram API:', error);
  }
}

testInstagramAPI().catch(console.error);