import type { StoryWithCreator } from '../types'

export type GateName = 'password' | 'age' | 'explicit' | 'interstitial'

export function getRequiredGates(story: StoryWithCreator): GateName[] {
  const gates: GateName[] = []

  if (story.password_hash !== null) {
    gates.push('password')
  }

  if (story.content_rating !== 'all-audiences') {
    gates.push('age')
    if (story.content_rating === 'explicit') gates.push('explicit')
  }

  gates.push('interstitial')

  return gates
}
