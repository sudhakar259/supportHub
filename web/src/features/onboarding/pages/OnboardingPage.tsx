import { useEffect, useState } from 'react'

import { Icon } from '@/components/ui/Icon'
import { BrandLogo } from '@/components/ui/BrandLogo'
import { CompleteStep } from '@/features/onboarding/components/CompleteStep'
import { DepartmentsStep } from '@/features/onboarding/components/DepartmentsStep'
import { IntegrationStep } from '@/features/onboarding/components/IntegrationStep'
import { TeamStep } from '@/features/onboarding/components/TeamStep'
import { TicketNumbersStep } from '@/features/onboarding/components/TicketNumbersStep'
import { ONBOARDING_STEPS } from '@/features/onboarding/types'
import type { OnboardingStep } from '@/features/onboarding/types'
import { cn } from '@/utils/cn'

const STORAGE_KEY = 'deskzeal.onboarding.step'
const LEGACY_STORAGE_KEY = 'supporthub.onboarding.step'

function readStoredStep(): OnboardingStep {
  try {
    const stored = (localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY)) as OnboardingStep | null
    return stored && ONBOARDING_STEPS.some((s) => s.key === stored) ? stored : 'departments'
  } catch {
    return 'departments'
  }
}

export function OnboardingPage() {
  const [step, setStep] = useState<OnboardingStep>(readStoredStep)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, step)
      localStorage.removeItem(LEGACY_STORAGE_KEY)
    } catch {
      // Private browsing / storage disabled — onboarding just won't resume on reload, not fatal.
    }
  }, [step])

  const currentIndex = ONBOARDING_STEPS.findIndex((s) => s.key === step)

  function goToNext() {
    const nextIndex = currentIndex + 1
    if (nextIndex < ONBOARDING_STEPS.length) setStep(ONBOARDING_STEPS[nextIndex].key)
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="flex h-16 items-center gap-space-sm border-b border-surface-container-high px-gutter-lg">
        <BrandLogo size={22} />
        <span className="text-title-sm text-on-surface-variant">Setup</span>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-col gap-space-xl px-gutter-lg py-space-xl">
        <div className="grid grid-cols-5 gap-space-xs">
          {ONBOARDING_STEPS.map((s, index) => {
            const isComplete = index < currentIndex
            const isActive = index === currentIndex
            return (
              <div key={s.key} className="flex flex-col items-center gap-space-xs">
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full text-title-sm font-bold',
                    isComplete && 'bg-tertiary-container text-on-tertiary-container',
                    isActive && 'bg-primary-container text-on-primary-container ring-2 ring-primary ring-offset-2 ring-offset-background',
                    !isComplete && !isActive && 'bg-surface-container-high text-secondary',
                  )}
                >
                  {isComplete ? <Icon name="check" size={18} /> : index + 1}
                </div>
                <span className={cn('text-center text-label-sm', isActive ? 'font-bold text-on-surface' : 'text-secondary')}>
                  {s.label}
                </span>
              </div>
            )
          })}
        </div>

        <div className="rounded-xl bg-surface-container-lowest p-space-lg shadow-sm">
          {step === 'departments' && <DepartmentsStep onNext={goToNext} />}
          {step === 'team' && <TeamStep onNext={goToNext} />}
          {step === 'ticket-numbers' && <TicketNumbersStep onNext={goToNext} />}
          {step === 'integration' && <IntegrationStep onNext={goToNext} />}
          {step === 'complete' && <CompleteStep />}
        </div>
      </main>
    </div>
  )
}
