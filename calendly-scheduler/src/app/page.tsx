// src/app/page.tsx
import CalendlyDashboard from '@/components/CalendlyDashboard'

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-10">
        <CalendlyDashboard />
      </div>
    </main>
  )
}