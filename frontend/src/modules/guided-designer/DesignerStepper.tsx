import './designer.css'

type Step = {
  id: string
  label: string
}

type DesignerStepperProps = {
  steps: Step[]
  activeStepId: string
  onStepChange: (id: string) => void
}

export function DesignerStepper({ steps, activeStepId, onStepChange }: DesignerStepperProps) {
  return (
    <ol className="designer-stepper">
      {steps.map(step => {
        const isActive = step.id === activeStepId
        return (
          <li key={step.id} className={isActive ? 'designer-step designer-step--active' : 'designer-step'}>
            <button type="button" onClick={() => onStepChange(step.id)} className="designer-step-button">
              <span className="designer-step-index">{steps.indexOf(step) + 1}</span>
              <span className="designer-step-label">{step.label}</span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}

