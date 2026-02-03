import { Brain, Calendar, Trophy, ArrowRight, BookOpen, Zap, Heart, Target, Shield, Sparkles, GraduationCap, School, BookOpenCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const features = [
  {
    icon: Brain,
    title: "AI Tutor",
    description: "Get personalized help with any subject using Socratic teaching methods",
    href: "/tutor",
  },
  {
    icon: BookOpen,
    title: "Flashcards",
    description: "AI-generated flashcards that adapt to your learning progress",
    href: "/flashcards",
  },
  {
    icon: Trophy,
    title: "Quizzes",
    description: "Test your knowledge with AI-powered quizzes on any topic",
    href: "/quizzes",
  },
  {
    icon: Calendar,
    title: "Study Streaks",
    description: "Track your progress and maintain your learning momentum",
    href: "/calendar",
  },
];

const benefits = [
  {
    icon: Zap,
    title: "Learn Faster",
    description: "Toki adapts to your pace, helping you grasp concepts quickly and efficiently.",
  },
  {
    icon: Heart,
    title: "Build Confidence",
    description: "Get encouragement and support as you work through challenging problems.",
  },
  {
    icon: Target,
    title: "Stay on Track",
    description: "Set goals, track progress, and celebrate your achievements along the way.",
  },
  {
    icon: Shield,
    title: "Safe Learning",
    description: "A safe, ad-free environment designed specifically for learners of all ages.",
  },
];

const educationLevels = [
  {
    icon: School,
    title: "Primary",
    grades: "Grades 1-8",
    description: "Build strong foundations",
  },
  {
    icon: GraduationCap,
    title: "High School",
    grades: "Grades 9-12",
    description: "Excel in advanced subjects",
  },
  {
    icon: BookOpenCheck,
    title: "College",
    grades: "All Years & Majors",
    description: "Master complex concepts",
  },
];

export default function Homepage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-full">
      {/* Hero Section - Split Layout */}
      <section className="relative overflow-hidden min-h-[80vh] flex items-center">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-accent/5 to-transparent" />
        
        <div className="relative w-full max-w-7xl mx-auto px-6 py-12">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Side - Content */}
            <div className="space-y-8">
              <div className="space-y-4">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
                  Meet{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
                    Toki
                  </span>
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground max-w-lg">
                  Your personal AI homework companion that helps you understand, not just answer. 
                  Built for learners from Primary to College.
                </p>
              </div>

              {/* About Toki - Compact */}
              <div className="bg-card/50 backdrop-blur-sm border rounded-2xl p-6 space-y-4">
                <h2 className="text-xl font-semibold">About Toki</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Toki is an AI-powered learning companion designed to help students think critically, 
                  not just get answers. Using the Socratic method, Toki guides you through problems 
                  step-by-step, building understanding and confidence along the way.
                </p>
                
                {/* Education Levels */}
                <div className="grid grid-cols-3 gap-3 pt-2">
                  {educationLevels.map((level) => (
                    <div key={level.title} className="text-center p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
                      <level.icon className="h-6 w-6 mx-auto mb-2 text-primary" />
                      <div className="font-semibold text-sm">{level.title}</div>
                      <div className="text-xs text-muted-foreground">{level.grades}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  size="lg"
                  onClick={() => navigate("/tutor")}
                  className="gap-2 text-base"
                >
                  Start Learning
                  <ArrowRight className="h-4 w-4" />
                </Button>
                {!user && (
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => navigate("/signup")}
                    className="text-base"
                  >
                    Create Free Account
                  </Button>
                )}
              </div>
            </div>

            {/* Right Side - AI Tutor Scene */}
            <div className="relative h-[500px] lg:h-[600px] hidden lg:block">
              <svg 
                viewBox="0 0 500 600" 
                className="w-full h-full drop-shadow-2xl"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  {/* Gradients */}
                  <linearGradient id="deskGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#DEB887" />
                    <stop offset="50%" stopColor="#D2B48C" />
                    <stop offset="100%" stopColor="#C4A574" />
                  </linearGradient>
                  <linearGradient id="tabletGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#2D3748" />
                    <stop offset="100%" stopColor="#1A202C" />
                  </linearGradient>
                  <linearGradient id="screenGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#4FD1C5" />
                    <stop offset="50%" stopColor="#38B2AC" />
                    <stop offset="100%" stopColor="#319795" />
                  </linearGradient>
                  <linearGradient id="glowGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                    <stop offset="0%" stopColor="#4FD1C5" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#81E6D9" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id="heroGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="hsl(var(--primary))" />
                    <stop offset="100%" stopColor="hsl(var(--accent))" />
                  </linearGradient>
                  <linearGradient id="capeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#805AD5" />
                    <stop offset="100%" stopColor="#6B46C1" />
                  </linearGradient>
                  <linearGradient id="skinGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#FFDAB9" />
                    <stop offset="100%" stopColor="#F5CBA7" />
                  </linearGradient>
                  <linearGradient id="paperGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#FFFFFF" />
                    <stop offset="100%" stopColor="#F7FAFC" />
                  </linearGradient>
                  <linearGradient id="wandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#F6E05E" />
                    <stop offset="100%" stopColor="#ECC94B" />
                  </linearGradient>
                  
                  {/* Filters */}
                  <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="2" dy="4" stdDeviation="8" floodColor="#000" floodOpacity="0.15"/>
                  </filter>
                  <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                  <filter id="strongGlow" x="-100%" y="-100%" width="300%" height="300%">
                    <feGaussianBlur stdDeviation="8" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>

                {/* Wooden Desk */}
                <ellipse cx="250" cy="520" rx="220" ry="60" fill="url(#deskGrad)" filter="url(#softShadow)" />
                <ellipse cx="250" cy="520" rx="200" ry="50" fill="#C9A66B" opacity="0.3" />
                {/* Wood grain lines */}
                <path d="M80 510 Q150 505 200 515 Q280 525 400 510" fill="none" stroke="#B8956E" strokeWidth="1" opacity="0.4" />
                <path d="M100 530 Q180 535 250 528 Q350 520 380 535" fill="none" stroke="#B8956E" strokeWidth="1" opacity="0.3" />

                {/* Paper Worksheet */}
                <g filter="url(#softShadow)">
                  <rect x="280" y="380" width="140" height="180" rx="3" fill="url(#paperGrad)" transform="rotate(-5, 350, 470)" />
                  {/* Paper lines */}
                  <g transform="rotate(-5, 350, 470)" opacity="0.3">
                    <line x1="295" y1="410" x2="405" y2="410" stroke="#CBD5E0" strokeWidth="1" />
                    <line x1="295" y1="430" x2="405" y2="430" stroke="#CBD5E0" strokeWidth="1" />
                    <line x1="295" y1="450" x2="405" y2="450" stroke="#CBD5E0" strokeWidth="1" />
                    <line x1="295" y1="470" x2="405" y2="470" stroke="#CBD5E0" strokeWidth="1" />
                    <line x1="295" y1="490" x2="405" y2="490" stroke="#CBD5E0" strokeWidth="1" />
                    <line x1="295" y1="510" x2="405" y2="510" stroke="#CBD5E0" strokeWidth="1" />
                  </g>
                  {/* Math problems */}
                  <g transform="rotate(-5, 350, 470)" fontFamily="Comic Sans MS, cursive" fontSize="14">
                    <text x="300" y="425" fill="#2D3748">5 + 3 = ___</text>
                    <text x="300" y="465" fill="#2D3748">12 - 7 = ___</text>
                    {/* Highlighted problem - glowing */}
                    <g filter="url(#strongGlow)">
                      <text x="300" y="505" fill="hsl(var(--accent))" fontWeight="bold">
                        8 × 4 = ?
                        <animate attributeName="opacity" values="1;0.7;1" dur="1.5s" repeatCount="indefinite" />
                      </text>
                    </g>
                  </g>
                </g>

                {/* Tablet */}
                <g filter="url(#softShadow)">
                  <rect x="80" y="300" width="180" height="240" rx="15" fill="url(#tabletGrad)" />
                  {/* Screen */}
                  <rect x="92" y="315" width="156" height="210" rx="8" fill="url(#screenGrad)" />
                  {/* Screen glow effect */}
                  <rect x="92" y="315" width="156" height="210" rx="8" fill="url(#glowGrad)" opacity="0.5">
                    <animate attributeName="opacity" values="0.3;0.6;0.3" dur="2s" repeatCount="indefinite" />
                  </rect>
                  {/* Home button */}
                  <circle cx="170" cy="535" r="8" fill="#4A5568" />
                </g>

                {/* Light burst from tablet */}
                <g opacity="0.6">
                  <ellipse cx="170" cy="380" rx="100" ry="80" fill="url(#glowGrad)" opacity="0.3">
                    <animate attributeName="rx" values="100;120;100" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="ry" values="80;100;80" dur="2s" repeatCount="indefinite" />
                  </ellipse>
                </g>

                {/* AI Tutor Superhero Character - Emerging from tablet */}
                <g className="ai-tutor" filter="url(#glow)">
                  {/* Glow aura behind character */}
                  <ellipse cx="170" cy="280" rx="60" ry="70" fill="hsl(var(--primary))" opacity="0.2">
                    <animate attributeName="rx" values="60;70;60" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.2;0.4;0.2" dur="2s" repeatCount="indefinite" />
                  </ellipse>
                  
                  {/* Cape */}
                  <path d="M130 220 Q115 280 125 340 L170 320 L215 340 Q225 280 210 220 Z" fill="url(#capeGrad)" opacity="0.9">
                    <animate attributeName="d" 
                      values="M130 220 Q115 280 125 340 L170 320 L215 340 Q225 280 210 220 Z;
                              M130 220 Q110 280 120 345 L170 325 L220 345 Q230 280 210 220 Z;
                              M130 220 Q115 280 125 340 L170 320 L215 340 Q225 280 210 220 Z" 
                      dur="3s" repeatCount="indefinite" />
                  </path>
                  
                  {/* Body */}
                  <ellipse cx="170" cy="280" rx="35" ry="45" fill="url(#heroGrad)" />
                  
                  {/* Hero emblem on chest */}
                  <circle cx="170" cy="275" r="12" fill="white" opacity="0.9" />
                  <text x="164" y="280" fontSize="14" fill="hsl(var(--primary))" fontWeight="bold">T</text>
                  
                  {/* Head */}
                  <circle cx="170" cy="200" r="35" fill="url(#skinGrad)" />
                  
                  {/* Friendly face */}
                  {/* Eyes - big and friendly */}
                  <ellipse cx="158" cy="195" rx="10" ry="12" fill="white" />
                  <ellipse cx="182" cy="195" rx="10" ry="12" fill="white" />
                  <circle cx="160" cy="197" r="6" fill="#2D3748">
                    <animate attributeName="cx" values="160;162;160" dur="3s" repeatCount="indefinite" />
                  </circle>
                  <circle cx="184" cy="197" r="6" fill="#2D3748">
                    <animate attributeName="cx" values="184;186;184" dur="3s" repeatCount="indefinite" />
                  </circle>
                  {/* Eye sparkle */}
                  <circle cx="162" cy="194" r="2" fill="white" />
                  <circle cx="186" cy="194" r="2" fill="white" />
                  
                  {/* Eyebrows - friendly */}
                  <path d="M148 182 Q158 178 168 182" fill="none" stroke="#4A5568" strokeWidth="2" strokeLinecap="round" />
                  <path d="M172 182 Q182 178 192 182" fill="none" stroke="#4A5568" strokeWidth="2" strokeLinecap="round" />
                  
                  {/* Big warm smile */}
                  <path d="M155 212 Q170 228 185 212" fill="none" stroke="#E53E3E" strokeWidth="3" strokeLinecap="round" />
                  
                  {/* Rosy cheeks */}
                  <ellipse cx="145" cy="205" rx="8" ry="5" fill="#FEB2B2" opacity="0.6" />
                  <ellipse cx="195" cy="205" rx="8" ry="5" fill="#FEB2B2" opacity="0.6" />
                  
                  {/* Hair/helmet */}
                  <path d="M135 185 Q135 155 170 150 Q205 155 205 185" fill="url(#heroGrad)" />
                  
                  {/* Left arm - waving */}
                  <g>
                    <path d="M135 260 Q110 250 100 230" fill="none" stroke="url(#heroGrad)" strokeWidth="12" strokeLinecap="round">
                      <animate attributeName="d" 
                        values="M135 260 Q110 250 100 230;M135 260 Q105 245 95 220;M135 260 Q110 250 100 230" 
                        dur="1s" repeatCount="indefinite" />
                    </path>
                    <circle cx="95" cy="218" r="10" fill="url(#skinGrad)">
                      <animate attributeName="cy" values="218;208;218" dur="1s" repeatCount="indefinite" />
                    </circle>
                  </g>
                  
                  {/* Right arm - holding wand pointing at paper */}
                  <path d="M205 260 Q240 280 280 350" fill="none" stroke="url(#heroGrad)" strokeWidth="12" strokeLinecap="round" />
                  <circle cx="283" cy="355" r="10" fill="url(#skinGrad)" />
                  
                  {/* Magic Wand */}
                  <g filter="url(#glow)">
                    <line x1="290" y1="360" x2="330" y2="420" stroke="url(#wandGrad)" strokeWidth="6" strokeLinecap="round" />
                    {/* Star on wand tip */}
                    <polygon 
                      points="335,430 338,440 348,440 340,447 343,457 335,450 327,457 330,447 322,440 332,440" 
                      fill="#F6E05E"
                      filter="url(#strongGlow)"
                    >
                      <animate attributeName="opacity" values="1;0.6;1" dur="0.5s" repeatCount="indefinite" />
                      <animateTransform attributeName="transform" type="rotate" values="0 335 445;10 335 445;0 335 445" dur="2s" repeatCount="indefinite" />
                    </polygon>
                  </g>
                  
                  {/* Magic sparkles from wand to paper */}
                  <g>
                    <circle cx="340" cy="450" r="3" fill="#F6E05E" filter="url(#glow)">
                      <animate attributeName="opacity" values="1;0;1" dur="1s" repeatCount="indefinite" />
                    </circle>
                    <circle cx="355" cy="465" r="2" fill="hsl(var(--accent))" filter="url(#glow)">
                      <animate attributeName="opacity" values="0;1;0" dur="1s" repeatCount="indefinite" />
                    </circle>
                    <circle cx="348" cy="475" r="2.5" fill="#F6E05E" filter="url(#glow)">
                      <animate attributeName="opacity" values="1;0;1" dur="0.8s" repeatCount="indefinite" />
                    </circle>
                  </g>
                </g>

                {/* Child's Hand pointing */}
                <g filter="url(#softShadow)">
                  {/* Arm coming from bottom right */}
                  <path d="M480 580 Q450 520 400 480" fill="none" stroke="#FFDAB9" strokeWidth="25" strokeLinecap="round" />
                  {/* Hand */}
                  <ellipse cx="395" cy="475" rx="20" ry="15" fill="url(#skinGrad)" transform="rotate(-30, 395, 475)" />
                  {/* Pointing finger */}
                  <path d="M385 465 Q370 450 355 445" fill="none" stroke="url(#skinGrad)" strokeWidth="10" strokeLinecap="round">
                    <animate attributeName="d" 
                      values="M385 465 Q370 450 355 445;M385 465 Q368 448 352 442;M385 465 Q370 450 355 445" 
                      dur="2s" repeatCount="indefinite" />
                  </path>
                  {/* Other fingers curled */}
                  <path d="M400 480 Q405 495 400 505" fill="none" stroke="url(#skinGrad)" strokeWidth="7" strokeLinecap="round" />
                  <path d="M408 478 Q415 490 412 500" fill="none" stroke="url(#skinGrad)" strokeWidth="6" strokeLinecap="round" />
                  {/* Sleeve */}
                  <path d="M480 590 Q460 560 445 530" fill="none" stroke="#63B3ED" strokeWidth="30" strokeLinecap="round" />
                </g>

                {/* Voice Wave Ripples - from child toward AI */}
                <g className="voice-waves" opacity="0.7">
                  <path d="M380 460 Q330 400 250 350" fill="none" stroke="hsl(var(--primary))" strokeWidth="3" strokeDasharray="8 4" opacity="0.6">
                    <animate attributeName="stroke-dashoffset" values="0;24" dur="1s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.6;0.2;0.6" dur="2s" repeatCount="indefinite" />
                  </path>
                  <path d="M375 450 Q320 395 240 340" fill="none" stroke="hsl(var(--accent))" strokeWidth="2" strokeDasharray="6 3" opacity="0.5">
                    <animate attributeName="stroke-dashoffset" values="0;18" dur="0.8s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.5;0.1;0.5" dur="2s" repeatCount="indefinite" />
                  </path>
                  <path d="M370 440 Q310 385 230 330" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeDasharray="4 4" opacity="0.4">
                    <animate attributeName="stroke-dashoffset" values="0;16" dur="1.2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.4;0.1;0.4" dur="2s" repeatCount="indefinite" />
                  </path>
                  
                  {/* Sound wave circles */}
                  <circle cx="360" cy="430" r="8" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" opacity="0">
                    <animate attributeName="r" values="8;25;40" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.8;0.3;0" dur="2s" repeatCount="indefinite" />
                  </circle>
                  <circle cx="360" cy="430" r="8" fill="none" stroke="hsl(var(--accent))" strokeWidth="2" opacity="0">
                    <animate attributeName="r" values="8;25;40" dur="2s" repeatCount="indefinite" begin="0.7s" />
                    <animate attributeName="opacity" values="0.8;0.3;0" dur="2s" repeatCount="indefinite" begin="0.7s" />
                  </circle>
                </g>

                {/* Floating sparkles/particles */}
                <g className="particles">
                  <circle cx="120" cy="250" r="3" fill="hsl(var(--accent))">
                    <animate attributeName="cy" values="250;230;250" dur="3s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.8;0.3;0.8" dur="3s" repeatCount="indefinite" />
                  </circle>
                  <circle cx="220" cy="270" r="2" fill="hsl(var(--primary))">
                    <animate attributeName="cy" values="270;250;270" dur="2.5s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.6;0.2;0.6" dur="2.5s" repeatCount="indefinite" />
                  </circle>
                  <circle cx="150" cy="350" r="2.5" fill="#F6E05E">
                    <animate attributeName="cy" values="350;330;350" dur="2.8s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.7;0.3;0.7" dur="2.8s" repeatCount="indefinite" />
                  </circle>
                  <circle cx="80" cy="300" r="2" fill="hsl(var(--accent))">
                    <animate attributeName="cy" values="300;285;300" dur="3.2s" repeatCount="indefinite" />
                  </circle>
                </g>

                {/* Subtle ambient light rays */}
                <g opacity="0.1">
                  <path d="M170 315 L140 450" stroke="white" strokeWidth="20" />
                  <path d="M170 315 L200 450" stroke="white" strokeWidth="15" />
                  <path d="M170 315 L100 400" stroke="white" strokeWidth="10" />
                </g>
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 px-6 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Why Choose Toki?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Toki is designed with students and parents in mind, offering a safe and effective 
              way to get learning help at any level.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit) => (
              <Card
                key={benefit.title}
                className="border-2 border-border bg-card hover:border-primary/50 transition-colors group"
              >
                <CardHeader className="text-center">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <benefit.icon className="h-7 w-7 text-primary" />
                  </div>
                  <CardTitle className="text-lg font-bold">{benefit.title}</CardTitle>
                  <CardDescription className="text-sm">{benefit.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Learning Tools</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Everything you need to excel in your studies, all in one place.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <Card
                key={feature.title}
                className="group cursor-pointer border-2 border-border bg-card hover:border-primary hover:shadow-lg transition-all duration-300"
                onClick={() => navigate(feature.href)}
              >
                <CardHeader className="text-center">
                  <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <feature.icon className="h-7 w-7 text-primary-foreground" />
                  </div>
                  <CardTitle className="text-lg font-bold">{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-gradient-to-br from-primary/5 via-accent/5 to-transparent">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-4">
            Ready to Learn{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
              Smarter?
            </span>
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join thousands of students using Toki to master their subjects.
          </p>
          <Button size="lg" onClick={() => navigate("/tutor")} className="gap-2">
            Get Started Now
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </section>
    </div>
  );
}
