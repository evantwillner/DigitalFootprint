/**
 * Test Suite Index
 * 
 * This file exports all test runners for the application services.
 * To run a specific test, use: npx tsx server/tests/<test-filename>.ts
 * 
 * Example: npx tsx server/tests/test-reddit-api.ts evanhaus
 */

// Import test functions to use in this file
import testRedditApi from './test-reddit-api';
// Export the Reddit test function for external use
export { testRedditApi };
// Placeholder functions for other tests
export const testTwitterApi = async (username: string) => { 
  console.log(`🚧 Twitter API test not yet refactored - username: ${username}`); 
};
export const testFacebookApi = async (username: string) => { 
  console.log(`🚧 Facebook API test not yet refactored - username: ${username}`); 
};
export const testInstagramApi = async (username: string) => { 
  console.log(`🚧 Instagram API test not yet refactored - username: ${username}`); 
};
export const testInstagramOAuth = async () => { 
  console.log(`🚧 Instagram OAuth test not yet refactored`); 
};
export const testInstagramAccess = async (username: string) => { 
  console.log(`🚧 Instagram Access test not yet refactored - username: ${username}`); 
};

/**
 * To run all API tests in sequence, execute this module
 * Usage: npx tsx server/tests/index.ts
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const testUsername = args[0] || 'evanhaus';
  
  console.log(`\n🧪 Running API test suite with test username: ${testUsername}`);
  console.log('='.repeat(50));
  
  const runAllTests = async () => {
    try {
      console.log('\n📱 REDDIT API TEST');
      console.log('-'.repeat(50));
      await testRedditApi(testUsername);
    } catch (e: any) {
      console.error(`❌ Reddit API test failed: ${e.message}`);
    }
    
    try {
      console.log('\n📱 TWITTER API TEST');
      console.log('-'.repeat(50));
      await testTwitterApi(testUsername);
    } catch (e: any) {
      console.error(`❌ Twitter API test failed: ${e.message}`);
    }
    
    try {
      console.log('\n📱 FACEBOOK API TEST');
      console.log('-'.repeat(50));
      await testFacebookApi(testUsername);
    } catch (e: any) {
      console.error(`❌ Facebook API test failed: ${e.message}`);
    }
    
    try {
      console.log('\n📱 INSTAGRAM API TEST');
      console.log('-'.repeat(50));
      await testInstagramApi(testUsername);
    } catch (e: any) {
      console.error(`❌ Instagram API test failed: ${e.message}`);
    }
    
    console.log('\n🏁 API test suite completed');
  };
  
  runAllTests().catch((e: any) => {
    console.error(`\n❌ Test suite execution failed: ${e.message}`);
    process.exit(1);
  });
}