import type { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
  Otp: undefined;
  ForgotPassword: undefined;
  ResetPassword: undefined;
};

export type DashboardTabParamList = {
  Home: undefined;
  Meetings: undefined;
  Calendar: undefined;
  Chat: undefined;
  More: undefined;
};

export type DashboardStackParamList = {
  MainTabs: NavigatorScreenParams<DashboardTabParamList>;
  Recordings: undefined;
  Tasks: undefined;
  Skills: undefined;
  Analytics: undefined;
  Settings: undefined;
  Profile: undefined;
  ChatConversation: { conversationId: string; name: string };
  Enterprise: undefined;
  HoloAssist: undefined;
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Dashboard: NavigatorScreenParams<DashboardStackParamList>;
  Call: { roomId: string };
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
