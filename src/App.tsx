import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { UserProvider } from "@/contexts/UserContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { TopicProvider } from "@/contexts/TopicContext";
import { EducationProvider } from "@/contexts/EducationContext";
import { MainLayout } from "@/components/MainLayout";
import Homepage from "./pages/Homepage";
import Dashboard from "./pages/Dashboard";
import AITutor from "./pages/AITutor";
import Flashcards from "./pages/Flashcards";
import Quizzes from "./pages/Quizzes";
import Essays from "./pages/Essays";
import Summarize from "./pages/Summarize";
import Diagrams from "./pages/Diagrams";
import Calendar from "./pages/Calendar";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Onboarding from "./pages/Onboarding";
import VerifyEmail from "./pages/VerifyEmail";
import Profile from "./pages/Profile";
import ParentDashboard from "./pages/ParentDashboard";
import { AdminLayout } from "@/components/AdminLayout";
import DashboardOverview from "./pages/admin/DashboardOverview";
import UserManagement from "./pages/admin/UserManagement";
import ReportGeneration from "./pages/admin/ReportGeneration";
import AdminPlaceholder from "./components/AdminPlaceholder";
import StudySets from "./pages/StudySets";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <UserProvider>
          <EducationProvider>
            <TopicProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
                  <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/verify-email" element={<VerifyEmail />} />
                    <Route path="/onboarding" element={<Onboarding />} />
                    <Route path="/*" element={
                      <MainLayout>
                        <Routes>
                          <Route path="/" element={<Homepage />} />
                          <Route path="/dashboard" element={<Dashboard />} />
                          <Route path="/tutor" element={<AITutor />} />
                          <Route path="/flashcards" element={<Flashcards />} />
                          <Route path="/quizzes" element={<Quizzes />} />
                          <Route path="/essays" element={<Essays />} />
                          <Route path="/summarize" element={<Summarize />} />
                          <Route path="/diagrams" element={<Diagrams />} />
                          <Route path="/calendar" element={<Calendar />} />
                          <Route path="/profile" element={<Profile />} />
                          <Route path="/parent" element={<ParentDashboard />} />
                          <Route path="admin" element={<AdminLayout />}>
                            <Route index element={<DashboardOverview />} />
                            <Route path="users" element={<UserManagement />} />
                            <Route path="reports" element={<ReportGeneration />} />
                            <Route path="roles" element={<AdminPlaceholder title="Roles & Permissions" />} />
                            <Route path="content" element={<AdminPlaceholder title="Learning Content" />} />
                            <Route path="quizzes" element={<AdminPlaceholder title="Quiz Management" />} />
                            <Route path="flagged" element={<AdminPlaceholder title="Flagged Conversations" />} />
                            <Route path="settings" element={<AdminPlaceholder title="System Settings" />} />
                          </Route>
                          <Route path="/study-sets" element={<StudySets />} />
                          <Route path="*" element={<NotFound />} />
                        </Routes>
                      </MainLayout>
                    } />
                  </Routes>
                </BrowserRouter>
              </TooltipProvider>
            </TopicProvider>
          </EducationProvider>
        </UserProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
