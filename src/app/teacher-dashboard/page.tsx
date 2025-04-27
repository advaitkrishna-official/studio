'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const TeacherDashboardPage = () => {
  const dashboardLinks = [
    {
      title: 'Lesson Planner',
      href: '/teacher-dashboard/lesson-planner',
      description: 'Create and manage lesson plans.',
    },
    {
      title: 'Quiz Builder',
      href: '/teacher-dashboard/quiz-builder',
      description: 'Create and manage quizzes.',
    },
    {
      title: 'Student Manager',
      href: '/teacher-dashboard/student-manager',
      description: 'Manage student profiles and track their progress.',
    },
    {
      title: 'Teachers Assignment Hub',
      href: '/teacher-dashboard/teachers-assignment-hub/page',
      description: 'Create and manage assignments.',
    },
    {
      title: 'Class Calendar',
      href: '/teacher-dashboard/class-calendar',
      description: 'View and manage class schedules.',
    },
    {
      title: 'Overview',
      href: '/teacher-dashboard/overview',
      description: 'View an overview of class performance.',
    },
  ]

  return <div className="container mx-auto py-8">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {dashboardLinks.map((link) => <Card key={link.href} className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <CardTitle><Link href={link.href} className="hover:underline">{link.title}</Link></CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">{link.description}</CardContent>
      </Card>)}
    </div>
  </div>
}

export default TeacherDashboardPage
