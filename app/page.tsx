\"use client\"

import * as React from \"react\"
import { Card, CardHeader, CardTitle, CardContent } from \"@/components/ui/card\"
import { Button } from \"@/components/ui/button\"

export default function HomePage() {
  return (
    <main className=\"mx-auto max-w-3xl p-6 space-y-6\">
      <Card>
        <CardHeader>
          <CardTitle>Habit Tracker</CardTitle>
        </CardHeader>
        <CardContent className=\"space-y-4\">
          <p className=\"text-muted-foreground\">
            The web app is running. This page uses web components and avoids React Native modules.
          </p>
          <Button>Get Started</Button>
        </CardContent>
      </Card>
    </main>
  )
}