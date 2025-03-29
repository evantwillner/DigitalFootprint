/**
 * Reddit API Integration
 */

export class RedditApiService {
  hasValidCredentials() {
    return process.env.REDDIT_CLIENT_ID && process.env.REDDIT_CLIENT_SECRET ? true : false;
  }
  
  getApiStatus() {
    return {
      configured: this.hasValidCredentials(),
      message: this.hasValidCredentials()
        ? "Reddit API is configured"
        : "Reddit API requires credentials. Please add REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET."
    };
  }
}

export const redditApi = new RedditApiService();