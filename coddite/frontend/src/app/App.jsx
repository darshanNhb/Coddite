import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router';
import { AuthProvider } from '../contexts/AuthContext';
import { AppLayout } from '../components/layout/AppLayout';
import { LoginView } from '../components/auth/LoginView';
import { SignupView } from '../components/auth/SignupView';
import { ForgotPasswordView } from '../components/auth/ForgotPasswordView';
import { RequireAuth } from '../components/auth/RequireAuth';
import { HomeView } from '../components/home/HomeView';
import { DashboardView } from '../components/dashboard/DashboardView';
import { SettingsView } from '../components/settings/SettingsView';

import { CommunityList } from '../components/communities/CommunityList';
import { CommunityDetail } from '../components/communities/CommunityDetail';
import { CreatePost } from '../components/posts/CreatePost';
import { PostDetail } from '../components/posts/PostDetail';
import { Toaster } from 'react-hot-toast';
import { LiveNotifications } from '../components/layout/LiveNotifications';
import { ThemeProvider } from '../contexts/ThemeContext';
import { Search } from '../components/search/Search';
import { Saved } from '../components/bookmarks/Saved';
import { ProfileView } from '../components/profiles/ProfileView';
import { LeaderboardView } from '../components/leaderboard/LeaderboardView';

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <LiveNotifications />
          <Toaster position="top-right" />
          <Routes>
            <Route path="/" element={<AppLayout />}>
              <Route index element={<HomeView />} />
              <Route path="login" element={<LoginView />} />
              <Route path="signup" element={<SignupView />} />
              <Route path="forgot-password" element={<ForgotPasswordView />} />
              <Route path="settings" element={
                <RequireAuth>
                  <SettingsView />
                </RequireAuth>
              } />
              <Route path="communities" element={<CommunityList />} />
              <Route path="c/:slug" element={<CommunityDetail />} />
              <Route path="p/:id" element={<PostDetail />} />
              
              <Route path="submit" element={
                <RequireAuth>
                  <CreatePost />
                </RequireAuth>
              } />
              
              <Route path="search" element={<Search />} />
              
              <Route path="saved" element={
                <RequireAuth>
                  <Saved />
                </RequireAuth>
              } />
              
              <Route path="u/:handle" element={<ProfileView />} />

              <Route path="dashboard" element={
                <RequireAuth>
                  <DashboardView />
                </RequireAuth>
              } />
              <Route path="leaderboard" element={<LeaderboardView />} />
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
