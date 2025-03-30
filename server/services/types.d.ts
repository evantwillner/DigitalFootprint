// Type declarations for modules without types
declare module 'facebook-nodejs-business-sdk';

// Platform API interfaces
export interface PlatformApiStatus {
  configured: boolean;
  operational: boolean;
  message: string;
}