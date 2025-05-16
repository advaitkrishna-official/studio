
'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { GraduationCap, Sparkles, Users, BarChartBig, BookOpen, Rocket } from 'lucide-react';
import { motion } from 'framer-motion';
import Image from 'next/image';

const FeatureCard = ({ icon, title, description }: { icon: React.ElementType, title: string, description: string }) => {
  const IconComponent = icon;
  return (
    <Card className="text-center shadow-lg hover:shadow-xl transition-shadow duration-300 h-full flex flex-col">
      <CardHeader className="pb-4">
        <div className="mx-auto bg-primary/10 text-primary p-3 rounded-full w-fit">
          <IconComponent className="h-8 w-8" />
        </div>
        <CardTitle className="mt-4 text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-muted-foreground text-sm">{description}</p>
      </CardContent>
    </Card>
  );
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 text-gray-800">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md shadow-sm">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/landing" className="flex items-center text-2xl font-bold text-primary">
            <GraduationCap className="mr-2 h-7 w-7" />
            EduAI
          </Link>
          <div className="space-x-3">
            <Button variant="ghost" asChild>
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
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="py-20 md:py-32 text-center"
      >
        <div className="container mx-auto px-6">
          <motion.h1
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.7, type: "spring", stiffness: 100 }}
            className="text-4xl md:text-6xl font-extrabold mb-6 leading-tight"
          >
            Revolutionizing Learning with <span className="text-primary">Artificial Intelligence</span>
          </motion.h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-10">
            Personalized tutoring, smart study tools, and comprehensive teacher resources – all in one intelligent platform.
          </p>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button size="lg" asChild className="bg-primary hover:bg-primary/90 text-primary-foreground px-10 py-6 text-lg">
              <Link href="/register">Get Started Free</Link>
            </Button>
          </motion.div>
          <div className="mt-16 relative aspect-video max-w-4xl mx-auto rounded-xl shadow-2xl overflow-hidden">
            <Image
              src="https://placehold.co/1200x675.png"
              alt="EduAI Platform Showcase"
              layout="fill"
              objectFit="cover"
              data-ai-hint="education technology"
            />
          </div>
        </div>
      </motion.section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">Why Choose EduAI?</h2>
          <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
            Empowering students with cutting-edge AI tools and providing teachers with the resources they need to inspire.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={Sparkles}
              title="AI-Powered Flashcards"
              description="Generate dynamic flashcards on any topic to make studying more effective and engaging."
            />
            <FeatureCard
              icon={BookOpen}
              title="Smart MCQ Generator"
              description="Create and practice with AI-generated multiple-choice questions tailored to your learning needs."
            />
            <FeatureCard
              icon={Rocket}
              title="Personalized Learning Paths"
              description="Our AI adapts to your unique learning style and pace, guiding you through a customized educational journey."
            />
            <FeatureCard
              icon={BarChartBig}
              title="Essay Feedback Engine"
              description="Receive instant, detailed, and constructive feedback on your writing to improve your skills."
            />
            <FeatureCard
              icon={Users}
              title="Comprehensive Teacher Dashboard"
              description="Tools for lesson planning, student management, quiz creation, and insightful analytics."
            />
            <FeatureCard
              icon={GraduationCap}
              title="Progress Tracking"
              description="Visually monitor your learning journey and identify areas for improvement with our intuitive progress tracker."
            />
          </div>
        </div>
      </section>

      {/* About Us Section */}
      <section className="py-16">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Meet the Minds Behind EduAI</h2>
          <div className="max-w-3xl mx-auto">
            <p className="text-muted-foreground mb-8">
              EduAI was born from a passion for education and a belief in the transformative power of technology. Our team of educators, developers, and AI specialists is dedicated to creating tools that empower both students and teachers, making learning more accessible, engaging, and effective for everyone. We strive to build the future of education, one intelligent feature at a time.
            </p>
            <div className="relative aspect-video max-w-2xl mx-auto rounded-lg shadow-lg overflow-hidden">
             <Image
                src="https://placehold.co/800x450.png"
                alt="EduAI Team"
                layout="fill"
                objectFit="cover"
                data-ai-hint="team photo"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Elevate Your Learning Experience?</h2>
          <p className="text-lg md:text-xl opacity-90 max-w-2xl mx-auto mb-10">
            Join thousands of students and educators who are transforming education with EduAI.
          </p>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button size="lg" variant="secondary" asChild className="bg-accent hover:bg-accent/90 text-accent-foreground px-10 py-6 text-lg">
              <Link href="/register">Sign Up Now for Free</Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center bg-white border-t">
        <div className="container mx-auto px-6">
          <p className="text-muted-foreground text-sm">
            &copy; {new Date().getFullYear()} EduAI. All rights reserved.
          </p>
          <div className="mt-2 space-x-4">
            <Link href="/landing#features" className="text-sm text-muted-foreground hover:text-primary">Features</Link>
            <Link href="/landing#about" className="text-sm text-muted-foreground hover:text-primary">About</Link>
            {/* Add more links like Privacy Policy, Terms of Service if needed */}
          </div>
        </div>
      </footer>
    </div>
  );
}
