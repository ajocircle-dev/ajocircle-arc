import { useEffect, useState } from 'react'
import { Check, Copy, Share2 } from 'lucide-react'
import { toast } from 'sonner'
import { buildShareLink } from '@/lib/share'
import { circlePath } from '@/lib/route'
import { Button, Card } from './ui'

/** Shareable join link. Resolved once on mount so the clipboard call keeps its user activation. */
export function ShareCard({ circleId, seatsLeft }: { circleId: bigint; seatsLeft: number }) {
  const [link, setLink] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let live = true
    void buildShareLink(`/#${circlePath(circleId)}`).then((l) => live && setLink(l))
    return () => {
      live = false
    }
  }, [circleId])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      toast.success('Join link copied')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Could not copy. Select the link and copy it manually.')
    }
  }

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Join my AjoCircle', url: link })
      } catch {
        /* dismissed */
      }
    } else {
      void copy()
    }
  }

  return (
    <Card className="space-y-3">
      <div>
        <h2 className="display text-lg font-semibold">Invite members</h2>
        <p className="text-sm text-subtle">
          {seatsLeft > 0
            ? `${seatsLeft} ${seatsLeft === 1 ? 'seat' : 'seats'} left. Anyone with this link can join.`
            : 'Every seat is taken.'}
        </p>
      </div>
      <div className="flex items-center gap-2 rounded-xl bg-muted p-2 pl-3">
        <input
          readOnly
          value={link}
          aria-label="Join link"
          onFocus={(e) => e.currentTarget.select()}
          className="mono min-w-0 flex-1 truncate bg-transparent text-xs text-ink-2 focus:outline-none"
        />
        <Button variant="ghost" onClick={() => void copy()} disabled={!link} aria-label="Copy join link" className="!min-h-10 !px-3">
          {copied ? <Check size={16} /> : <Copy size={16} />}
        </Button>
        <Button onClick={() => void share()} disabled={!link} aria-label="Share join link" className="!min-h-10 !px-3">
          <Share2 size={16} />
        </Button>
      </div>
    </Card>
  )
}
