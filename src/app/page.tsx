
'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { GraduationCap, Sparkles, Users, BarChartBig, BookOpen, Rocket, CheckCircle, Lightbulb, MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';

const FeatureCard = ({ icon, title, description, delay = 0 }: { icon: React.ElementType, title: string, description: string, delay?: number }) => {
  const IconComponent = icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="h-full"
    >
      <Card className="text-center shadow-lg hover:shadow-xl transition-shadow duration-300 h-full flex flex-col bg-white">
        <CardHeader className="pb-4">
          <div className="mx-auto bg-primary/10 text-primary p-4 rounded-full w-fit mb-3">
            <IconComponent className="h-8 w-8" />
          </div>
          <CardTitle className="text-xl font-semibold">{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex-grow">
          <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default function LandingPage() {
  const sectionVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: "easeOut" } },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 text-gray-800">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center text-2xl font-bold text-primary">
            <GraduationCap className="mr-2 h-7 w-7" />
            EduAI
          </Link>
          <div className="space-x-2 sm:space-x-3">
            <Button variant="ghost" asChild className="hover:bg-primary/10">
              <Link href="/login">Login</Link>
            </Button>
            <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
              <Link href="/register">Sign Up</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <motion.section
        initial="hidden"
        animate="visible"
        variants={sectionVariants}
        className="py-20 md:py-32 text-center relative overflow-hidden"
      >
        <div className="absolute inset-0 opacity-10 bg-grid-pattern"></div>
        <div className="container mx-auto px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5, type: "spring", stiffness: 120 }}
            className="inline-block bg-primary/10 text-primary px-4 py-1 rounded-full text-sm font-medium mb-4"
          >
            The Future of Learning is Here
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.7 }}
            className="text-4xl md:text-6xl font-extrabold mb-6 leading-tight bg-clip-text text-transparent bg-gradient-to-r from-primary via-indigo-600 to-purple-600"
          >
            Unlock Your Potential with EduAI
          </motion.h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-10">
            Experience AI-powered personalized tutoring, smart study tools, and comprehensive resources designed to elevate your educational journey.
          </p>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <Button size="lg" asChild className="bg-primary hover:bg-primary/90 text-primary-foreground px-10 py-6 text-lg rounded-lg shadow-lg">
              <Link href="/register">Get Started For Free</Link>
            </Button>
          </motion.div>
        </div>
      </motion.section>

      {/* How It Works Section */}
      <motion.section
        initial="hidden"
        animate="visible"
        variants={sectionVariants}
        className="py-16 bg-white"
      >
        <div className="container mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">How EduAI Transforms Learning</h2>
          <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
            A simple, intuitive, and powerful platform for students and educators.
          </p>
          <div className="grid md:grid-cols-3 gap-8 text-center">
            {[
              { icon: Lightbulb, title: "Discover", description: "Explore AI-generated content and personalized learning paths tailored to your needs." },
              { icon: BookOpen, title: "Learn", description: "Engage with interactive flashcards, MCQs, and essay feedback to deepen understanding." },
              { icon: CheckCircle, title: "Achieve", description: "Track your progress, identify strengths, and conquer your educational goals with AI insights." },
            ].map((item, index) => (
              <motion.div key={item.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.2 }}
              >
                <div className="p-6 bg-gray-50 rounded-lg shadow-sm">
                  <item.icon className="h-12 w-12 text-primary mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                  <p className="text-muted-foreground text-sm">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Features Section */}
      <motion.section
        id="features"
        initial="hidden"
        animate="visible"
        variants={sectionVariants}
        className="py-16"
      >
        <div className="container mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">Powerful Features, Endless Possibilities</h2>
          <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
            Empowering students with cutting-edge AI tools and providing teachers with the resources they need to inspire.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={Sparkles}
              title="AI-Powered Flashcards"
              description="Generate dynamic flashcards on any topic to make studying more effective and engaging."
              delay={0.1}
            />
            <FeatureCard
              icon={MessageSquare}
              title="Smart MCQ Generator"
              description="Create and practice with AI-generated multiple-choice questions tailored to your learning needs."
              delay={0.2}
            />
            <FeatureCard
              icon={Rocket}
              title="Personalized Learning Paths"
              description="Our AI adapts to your unique learning style and pace, guiding you through a customized educational journey."
              delay={0.3}
            />
            <FeatureCard
              icon={BarChartBig}
              title="Essay Feedback Engine"
              description="Receive instant, detailed, and constructive feedback on your writing to improve your skills."
              delay={0.4}
            />
            <FeatureCard
              icon={Users}
              title="Comprehensive Teacher Dashboard"
              description="Tools for lesson planning, student management, quiz creation, and insightful analytics."
              delay={0.5}
            />
            <FeatureCard
              icon={GraduationCap}
              title="Progress Tracking"
              description="Visually monitor your learning journey and identify areas for improvement with our intuitive progress tracker."
              delay={0.6}
            />
          </div>
        </div>
      </motion.section>

      {/* Testimonials Section (Placeholder) */}
      <motion.section
        initial="hidden"
        animate="visible"
        variants={sectionVariants}
        className="py-16 bg-slate-50"
      >
        <div className="container mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">Loved by Students & Educators</h2>
          <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
            See what people are saying about EduAI.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {[1, 2, 3].map(i => (
              <Card key={i} className="bg-white shadow-lg">
                <CardContent className="pt-6">
                  <p className="italic text-muted-foreground mb-4">"EduAI has completely changed how I study. The personalized paths are amazing!"</p>
                  <div className="flex items-center">
                    <div>
                      <p className="font-semibold">Student User {i}</p>
                      <p className="text-xs text-muted-foreground">Grade 10</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </motion.section>


      {/* About Us Section */}
      <motion.section
        id="about"
        initial="hidden"
        animate="visible"
        variants={sectionVariants}
        className="py-16 bg-white"
      >
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Meet the Minds Behind EduAI</h2>
          <div className="max-w-3xl mx-auto">
            <p className="text-muted-foreground mb-8 leading-relaxed">
              EduAI was born from a passion for education and a belief in the transformative power of technology. Our team of educators, developers, and AI specialists is dedicated to creating tools that empower both students and teachers, making learning more accessible, engaging, and effective for everyone. We strive to build the future of education, one intelligent feature at a time.
            </p>
          </div>
        </div>
      </motion.section>

      {/* Call to Action Section */}
      <motion.section
        initial="hidden"
        animate="visible"
        variants={sectionVariants}
        className="py-20 bg-gradient-to-r from-primary to-indigo-700 text-primary-foreground"
      >
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Elevate Your Learning Experience?</h2>
          <p className="text-lg md:text-xl opacity-90 max-w-2xl mx-auto mb-10">
            Join thousands of students and educators who are transforming education with EduAI. Sign up today and discover a smarter way to learn.
          </p>
          <motion.div
            whileHover={{ scale: 1.05, y: -5 }}
            whileTap={{ scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <Button size="lg" asChild className="bg-accent hover:bg-accent/90 text-accent-foreground px-12 py-7 text-lg rounded-lg shadow-2xl">
              <Link href="/register">Sign Up Now for Free</Link>
            </Button>
          </motion.div>
        </div>
      </motion.section>

      {/* Footer */}
      <footer className="py-10 text-center bg-gray-100 border-t">
        <div className="container mx-auto px-6">
          <Link href="/" className="flex items-center justify-center text-xl font-bold text-primary mb-4">
            <GraduationCap className="mr-2 h-6 w-6" />
            EduAI
          </Link>
          <p className="text-muted-foreground text-sm mb-4">
            &copy; {new Date().getFullYear()} EduAI. All rights reserved. Empowering Minds, Shaping Futures.
          </p>
          <div className="space-x-4">
            <Link href="/#features" className="text-sm text-muted-foreground hover:text-primary">Features</Link>
            <Link href="/#about" className="text-sm text-muted-foreground hover:text-primary">About</Link>
            <Link href="#" className="text-sm text-muted-foreground hover:text-primary">Privacy Policy</Link>
            <Link href="#" className="text-sm text-muted-foreground hover:text-primary">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
