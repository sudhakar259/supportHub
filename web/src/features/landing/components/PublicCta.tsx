import { Link } from 'react-router-dom'

import { ROUTES } from '@/app/router/routes'
import { Icon } from '@/components/ui/Icon'

export function PublicCta() {
  return (
    <section className="marketing-cta">
      <div className="marketing-container marketing-cta-inner">
        <div>
          <span className="marketing-eyebrow">LESS CHASING. MORE HELPING.</span>
          <h2>Make room for better support.</h2>
          <p>Bring your tickets, team and customers into one workspace.</p>
        </div>
        <div className="marketing-actions">
          <Link to={ROUTES.register} className="marketing-button">
            Start free trial <Icon name="arrow_forward" size={19} />
          </Link>
          <Link to={ROUTES.demo} className="marketing-button marketing-button-light">
            Explore the demo
          </Link>
        </div>
      </div>
    </section>
  )
}
