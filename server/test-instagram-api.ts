import { testInstagramApi } from './services/api-test';

// Run the test
testInstagramApi()
  .then(() => {
    console.log('Instagram API test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error running Instagram API test:', error);
    process.exit(1);
  });