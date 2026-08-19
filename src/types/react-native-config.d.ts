declare module 'react-native-config' {
  export interface NativeConfig {
    API_BASE_URL: string;
    ENTERPRISE_API_BASE_URL: string;
    AI_ASSISTANT_API_BASE_URL: string;
    LIVEKIT_URL: string;
    GOOGLE_WEB_CLIENT_ID: string;
    STRIPE_PUBLISHABLE_KEY: string;
  }

  export const Config: NativeConfig;
  export default Config;
}
