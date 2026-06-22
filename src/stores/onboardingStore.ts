import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

export type OnboardingStep = 0 | 1 | 2 | 3

export type CampaignSetting = 'high-fantasy' | 'dark-fantasy' | 'sword-and-sorcery' | 'horror'
export type Difficulty = 'narrative' | 'normal' | 'hardcore'

interface OnboardingData {
  setting: CampaignSetting | null
  difficulty: Difficulty
  campaignName: string
  skipRulebooks: boolean
  skipCharacter: boolean
}

interface OnboardingState {
  step: OnboardingStep
  completed: boolean
  loading: boolean
  data: OnboardingData
  setStep: (step: OnboardingStep) => void
  nextStep: () => void
  prevStep: () => void
  updateData: (partial: Partial<OnboardingData>) => void
  completeOnboarding: () => Promise<void>
  checkOnboardingStatus: () => Promise<void>
}

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  step: 0,
  completed: false,
  loading: true,
  data: {
    setting: null,
    difficulty: 'normal',
    campaignName: '',
    skipRulebooks: false,
    skipCharacter: false,
  },

  setStep: (step) => set({ step }),

  nextStep: () => {
    const current = get().step
    if (current < 3) set({ step: (current + 1) as OnboardingStep })
  },

  prevStep: () => {
    const current = get().step
    if (current > 0) set({ step: (current - 1) as OnboardingStep })
  },

  updateData: (partial) =>
    set((s) => ({ data: { ...s.data, ...partial } })),

  completeOnboarding: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase
      .from('user_preferences')
      .upsert({ user_id: user.id, onboarding_completed: true }, { onConflict: 'user_id' })

    set({ completed: true })
  },

  checkOnboardingStatus: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      set({ loading: false, completed: false })
      return
    }

    const { data } = await supabase
      .from('user_preferences')
      .select('onboarding_completed')
      .eq('user_id', user.id)
      .single()

    set({
      loading: false,
      completed: data?.onboarding_completed ?? false,
    })
  },
}))
