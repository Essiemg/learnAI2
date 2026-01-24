import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { UserProvider } from "@/contexts/UserContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { TopicProvider } from "@/contexts/TopicContext";
import { MainLayout } from "@/components/MainLayout";
import Homepage from "./pages/Homepage";
import Dashboard from "./pages/Dashboard";
import AITutor from "./pages/AITutor";
import Flashcards from "./pages/Flashcards";
import Quizzes from "./pages/Quizzes";
import Essays from "./pages/Essays";
import Calendar from "./pages/Calendar";
import Summarize from "./pages/Summarize";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Profile from "./pages/Profile";
import ParentDashboard from "./pages/ParentDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <UserProvider>
          <TopicProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
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
                        <Route path="/calendar" element={<Calendar />} />
                        <Route path="/profile" element={<Profile />} />
                        <Route path="/parent" element={<ParentDashboard />} />
                        <Route path="/admin" element={<AdminDashboard />} />
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </MainLayout>
                  } />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </TopicProvider>
        </UserProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
