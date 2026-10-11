import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { PublicNavigation } from '@/components/navigation/PublicNavigation'
import { SOLUTIONS } from '@/features/landing/content'
import { FEATURE_PAGES, GUIDES } from '@/features/landing/product-content'

function renderNavigation(props: Parameters<typeof PublicNavigation>[0] = {}, path = '/') {
  return render(<MemoryRouter initialEntries={[path]}><PublicNavigation {...props} /></MemoryRouter>)
}

describe('public navigation', () => {
  it('keeps dropdown destinations hidden until the visitor opens a group', () => {
    renderNavigation()
    for (const name of ['Product', 'Solutions', 'Resources']) {
      const trigger = screen.getByRole('button', { name })
      expect(trigger).toHaveAttribute('aria-expanded', 'false')
      expect(document.getElementById(trigger.getAttribute('aria-controls')!)).not.toBeVisible()
    }
    expect(screen.getByRole('link', { name: 'Pricing' })).toHaveAttribute('href', '/pricing')
    expect(screen.getByRole('link', { name: 'Product tour' })).toHaveAttribute('href', '/demo')
  })

  it('links each implemented product feature and the feature overview', () => {
    renderNavigation()
    fireEvent.click(screen.getByRole('button', { name: 'Product' }))
    for (const feature of FEATURE_PAGES) {
      expect(screen.getByRole('link', { name: feature.label })).toHaveAttribute('href', `/features/${feature.slug}`)
    }
    expect(screen.getByRole('link', { name: 'Explore all features' })).toHaveAttribute('href', '/features')
  })

  it('links solutions to the corresponding section on the solutions page', () => {
    renderNavigation()
    fireEvent.click(screen.getByRole('button', { name: 'Solutions' }))
    SOLUTIONS.forEach((solution, index) => {
      expect(screen.getByRole('link', { name: `${solution.title} ${solution.audience}` })).toHaveAttribute('href', `/solutions#solution-${index}`)
    })
    expect(screen.getByRole('link', { name: 'Explore all solutions' })).toHaveAttribute('href', '/solutions')
  })

  it('links published guides, security controls and contact information', () => {
    renderNavigation()
    fireEvent.click(screen.getByRole('button', { name: 'Resources' }))
    for (const guide of GUIDES) {
      expect(screen.getByRole('link', { name: `${guide.category} ${guide.title}` })).toHaveAttribute('href', `/resources/${guide.slug}`)
    }
    expect(screen.getByRole('link', { name: /security & access/i })).toHaveAttribute('href', '/security')
    expect(screen.getByRole('link', { name: /contact us/i })).toHaveAttribute('href', '/contact')
  })

  it('opens with the arrow key and restores focus to the trigger with Escape', async () => {
    renderNavigation()
    const trigger = screen.getByRole('button', { name: 'Product' })
    trigger.focus()
    fireEvent.keyDown(trigger, { key: 'ArrowDown' })
    await waitFor(() => expect(screen.getByRole('link', { name: FEATURE_PAGES[0].label })).toHaveFocus())
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(trigger).toHaveFocus()
  })

  it('closes after clicking outside or moving keyboard focus out of the group', () => {
    renderNavigation()
    const trigger = screen.getByRole('button', { name: 'Solutions' })
    fireEvent.click(trigger)
    fireEvent.pointerDown(document.body)
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(trigger)
    fireEvent.blur(trigger, { relatedTarget: screen.getByRole('link', { name: 'Pricing' }) })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  it('closes mobile navigation after choosing a destination', () => {
    const onNavigate = vi.fn()
    renderNavigation({ mobile: true, onNavigate })
    const navigation = screen.getByRole('navigation', { name: 'Mobile main' })
    const trigger = within(navigation).getByRole('button', { name: 'Resources' })
    fireEvent.click(trigger)
    fireEvent.click(within(navigation).getByRole('link', { name: /contact us/i }))
    expect(onNavigate).toHaveBeenCalledOnce()
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  it('keeps mobile targets stable during a tap and opens only one group at a time', () => {
    renderNavigation({ mobile: true })
    const resources = screen.getByRole('button', { name: 'Resources' })
    const product = screen.getByRole('button', { name: 'Product' })
    fireEvent.click(resources)
    fireEvent.pointerDown(product)
    fireEvent.blur(resources, { relatedTarget: product })
    expect(resources).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(product)
    expect(resources).toHaveAttribute('aria-expanded', 'false')
    expect(product).toHaveAttribute('aria-expanded', 'true')
  })

  it('marks the correct group on a feature detail page', () => {
    renderNavigation({}, '/features/ticketing')
    expect(screen.getByRole('button', { name: 'Product' })).toHaveClass('is-active')
    expect(screen.getByRole('button', { name: 'Solutions' })).not.toHaveClass('is-active')
  })
})
