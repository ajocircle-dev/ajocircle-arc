import { ActivityProvider } from '@/hooks/useActivity'
import { useRoute } from '@/lib/route'
import { ActivityFeed } from '@/components/ActivityFeed'
import { CirclePage } from '@/components/CirclePage'
import { CreateCircle } from '@/components/CreateCircle'
import { Dashboard } from '@/components/Dashboard'
import { Header } from '@/components/Header'
import { NetworkBanner } from '@/components/NetworkBanner'
import { CHAIN } from '@/lib/contract'

export default function App() {
  const route = useRoute()

  return (
    <ActivityProvider>
      <div className="min-h-dvh pb-24">
        <Header route={route} />
        <main className="mx-auto max-w-5xl space-y-5 px-4 py-6 sm:py-8">
          <NetworkBanner />
          {route.name === 'dashboard' && <Dashboard />}
          {route.name === 'create' && <CreateCircle />}
          {route.name === 'circle' && <CirclePage key={route.id.toString()} id={route.id} />}
          {route.name === 'activity' && (
            <div className="space-y-4">
              <div>
                <h1 className="display text-3xl font-bold">Activity</h1>
                <p className="mt-1 text-ink-2">Every action across all circles, read straight from {CHAIN.name} events.</p>
              </div>
              <ActivityFeed limit={200} title="All circles" />
            </div>
          )}
        </main>
      </div>
    </ActivityProvider>
  )
}
