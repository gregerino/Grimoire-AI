import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useOnboardingStore } from '@/stores/onboardingStore'
import { useCampaignStore } from '@/stores/campaignStore'
import { StepIndicator } from './StepIndicator'
import { WelcomeStep } from './steps/WelcomeStep'
import { CampaignStep } from './steps/CampaignStep'
import { RulebookStep } from './steps/RulebookStep'
import { CharacterStep } from './steps/CharacterStep'

interface Props {
  onComplete: (campaignId: string) => void
  onClose: () => void
}

const SETTING_LABELS: Record<string, string> = {
  'high-fantasy': 'High Fantasy',
  'dark-fantasy': 'Dark Fantasy',
  'sword-and-sorcery': 'Sword & Sorcery',
  'horror': 'Horror',
}

export function OnboardingWizard({ onComplete, onClose }: Props) {
  const { step, nextStep, prevStep, updateData, data, setStep } = useOnboardingStore()
  const { createCampaign } = useCampaignStore()

  const handleFinish = async () => {
    const campaign = await createCampaign({
      name: data.campaignName || 'New Campaign',
      description: '',
      setting: data.setting ? SETTING_LABELS[data.setting] ?? data.setting : '',
      character_name: '',
      character_class: '',
      dm_notes: '',
    })
    setStep(0)
    if (campaign) onComplete(campaign.id)
  }

  const handleSkipToEnd = async () => {
    await handleFinish()
  }

  return (
    <div className="fixed inset-0 z-50 bg-midnight overflow-y-auto">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-mystic/5 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-gold/5 blur-3xl" />
      </div>

      <button
        onClick={() => { setStep(0); onClose() }}
        className="absolute top-4 right-4 z-10 rounded-lg p-2 text-stone hover:text-parchment hover:bg-navy/50 transition-colors focus-ring"
        aria-label="Stäng"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="relative min-h-screen flex flex-col">
        {step > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-6 pt-6 max-w-2xl mx-auto w-full"
          >
            <StepIndicator current={step} total={4} />
          </motion.div>
        )}

        <div className="flex-1 flex items-center justify-center">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <WelcomeStep key="welcome" onNext={nextStep} />
            )}

            {step === 1 && (
              <CampaignStep
                key="campaign"
                setting={data.setting}
                difficulty={data.difficulty}
                campaignName={data.campaignName}
                onUpdate={updateData}
                onNext={nextStep}
                onBack={prevStep}
                onSkip={handleSkipToEnd}
              />
            )}

            {step === 2 && (
              <RulebookStep
                key="rulebook"
                onNext={nextStep}
                onBack={prevStep}
                onSkip={handleSkipToEnd}
              />
            )}

            {step === 3 && (
              <CharacterStep
                key="character"
                onFinish={handleFinish}
                onBack={prevStep}
                onSkip={handleSkipToEnd}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
