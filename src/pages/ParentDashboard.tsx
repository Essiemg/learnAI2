import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Users, Loader2, RefreshCw } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useParentAnalytics } from "@/hooks/useParentAnalytics";
import { LinkCodeGenerator } from "@/components/parent/LinkCodeGenerator";
import { ChildLearningCard } from "@/components/parent/ChildLearningCard";
import { LearningInsights } from "@/components/parent/LearningInsights";

export default function ParentDashboard() {
  const { profile, role } = useAuth();
  const navigate = useNavigate();
  const { 
    children, 
    isLoading, 
    linkCode, 
    isGeneratingCode, 
    generateLinkCode,
    refreshAnalytics 
  } = useParentAnalytics();

  if (role !== "parent" && role !== "admin") {
    navigate("/");
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="font-semibold">Parent Dashboard</h1>
        <ThemeToggle />
      </header>

      <div className="p-4 max-w-4xl mx-auto space-y-6">
        {/* Welcome */}
        <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-0">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Welcome, {profile?.display_name}!
                </CardTitle>
                <CardDescription>
                  Monitor your children's learning progress and see where they might need extra help.
                </CardDescription>
              </div>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={refreshAnalytics}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Link Code Generator */}
        <LinkCodeGenerator
          linkCode={linkCode}
          isGenerating={isGeneratingCode}
          onGenerate={generateLinkCode}
        />

        {/* Loading State */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : children.length === 0 ? (
          /* No Children State */
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-semibold mb-2">No Primary Students Linked</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Generate a link code above and share it with your primary school child. 
                They'll enter it in their Profile settings to connect their account.
              </p>
              <p className="text-sm text-muted-foreground mt-4">
                Note: This dashboard is designed for primary school students only.
              </p>
            </CardContent>
          </Card>
        ) : (
          /* Children Analytics */
          <Tabs defaultValue={children[0]?.profile.id} className="w-full">
            <TabsList className="w-full justify-start overflow-x-auto">
              {children.map((child) => (
                <TabsTrigger key={child.profile.id} value={child.profile.id}>
                  {child.profile.display_name}
                </TabsTrigger>
              ))}
            </TabsList>

            {children.map((child) => (
              <TabsContent key={child.profile.id} value={child.profile.id} className="mt-4">
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Overview Card */}
                  <ChildLearningCard
                    profile={child.profile}
                    topicMastery={child.topicMastery}
                    weeklyStats={child.weeklyStats}
                    strugglingTopics={child.preferences?.struggling_topics || []}
                    strongTopics={child.preferences?.strong_topics || []}
                  />

                  {/* Insights */}
                  <LearningInsights
                    childName={child.profile.display_name}
                    preferences={child.preferences}
                    recentActivity={child.recentActivity}
                  />
                </div>

                {/* Recommendations */}
                {(child.preferences?.struggling_topics?.length ?? 0) > 0 && (
                  <Card className="mt-6">
                    <CardHeader>
                      <CardTitle className="text-base">💡 Recommendations</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 text-sm">
                        {child.preferences?.struggling_topics?.slice(0, 3).map((topic) => (
                          <li key={topic} className="flex items-start gap-2">
                            <span className="text-primary mt-0.5">•</span>
                            <span>
                              <strong>{child.profile.display_name}</strong> might benefit from 
                              extra practice with <strong>{topic}</strong>. Consider reviewing 
                              this topic together.
                            </span>
                          </li>
                        ))}
                        {child.weeklyStats.totalInteractions < 5 && (
                          <li className="flex items-start gap-2">
                            <span className="text-primary mt-0.5">•</span>
                            <span>
                              {child.profile.display_name} hasn't been very active this week. 
                              Encourage them to explore new topics!
                            </span>
                          </li>
                        )}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>
    </div>
  );
}
