import axios from 'axios';

// Function to test the Instagram API
async function testInstagramApi() {
  console.log('Testing Instagram API connection...');
  
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  
  if (!accessToken) {
    console.error('No Instagram access token found in environment variables');
    return;
  }
  
  try {
    // First, try getting the page info
    console.log('Fetching page info...');
    const pageInfoResponse = await axios.get('https://graph.facebook.com/v19.0/me', {
      params: {
        access_token: accessToken,
        fields: 'id,name,instagram_business_account'
      }
    });
    
    console.log('Page info response:', JSON.stringify(pageInfoResponse.data, null, 2));
    
    // Get the Instagram Business Account ID from the page
    const instagramBusinessAccountId = pageInfoResponse.data?.instagram_business_account?.id;
    
    if (!instagramBusinessAccountId) {
      console.error('No Instagram Business Account connected to this token. Cannot perform business discovery.');
      console.log('Full response:', JSON.stringify(pageInfoResponse.data, null, 2));
      return;
    }
    
    // Try to get a test user
    const username = 'instagram';  // Instagram's own account
    console.log(`Trying to fetch user data for ${username}...`);
    
    const igProfileResponse = await axios.get(`https://graph.facebook.com/v19.0/${instagramBusinessAccountId}`, {
      params: {
        access_token: accessToken,
        fields: `business_discovery.username(${username}){username,website,name,ig_id,id,profile_picture_url,biography,follows_count,followers_count,media_count,media{caption,like_count,comments_count,media_url,permalink,timestamp,media_type}}`
      }
    });
    
    console.log('User data response:', JSON.stringify(igProfileResponse.data?.business_discovery || 'No business_discovery data', null, 2));
    
  } catch (error: any) {
    console.error('Error testing Instagram API:');
    if (error.response) {
      console.error('Error response:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error);
    }
  }
}

// Export the test function
export { testInstagramApi };