import { useState, useMemo } from 'react'
import type { ConnectorDef } from './connectorRegistry'
import { groupByCategory } from './connectorRegistry'
import type { IntegrationConfig } from '../../api/integrations'

type Props = {
  integrations: IntegrationConfig[]
  onSelect: (connector: ConnectorDef) => void
}

export function ConnectorCatalog({ integrations, onSelect }: Props) {
  const [search, setSearch] = useState('')
  const groups = useMemo(() => groupByCategory(), [])

  const configuredKeys = useMemo(() => {
    const set = new Set<string>()
    for (const i of integrations) {
      // Match by integration id or name (lowercased) to connector key
      set.add(i.id.toLowerCase())
      set.add(i.name.toLowerCase().replace(/\s+/g, '_'))
    }
    return set
  }, [integrations])

  const filteredGroups = useMemo(() => {
    if (!search.trim()) return groups
    const q = search.toLowerCase()
    return groups
      .map(g => ({
        ...g,
        connectors: g.connectors.filter(
          c => c.name.toLowerCase().includes(q) ||
               c.description.toLowerCase().includes(q) ||
               c.category.toLowerCase().includes(q)
        ),
      }))
      .filter(g => g.connectors.length > 0)
  }, [groups, search])

  return (
    <div className="conn-catalog">
      <div className="conn-catalog-search">
        <input
          type="text"
          placeholder="Search connectors…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="conn-catalog-search-input"
        />
        <span className="conn-catalog-count">
          {filteredGroups.reduce((acc, g) => acc + g.connectors.length, 0)} connectors
        </span>
      </div>

      {filteredGroups.map(group => (
        <section key={group.category} className="conn-catalog-section">
          <h3 className="conn-catalog-section-title">{group.label}</h3>
          <div className="conn-catalog-grid">
            {group.connectors.map(c => {
              const isConfigured = configuredKeys.has(c.key)
              return (
                <button
                  key={c.key}
                  className={`conn-tile ${isConfigured ? 'conn-tile--configured' : ''}`}
                  onClick={() => onSelect(c)}
                  title={c.description}
                >
                  <div className="conn-tile-icon" style={{ background: `${c.color}18` }}>
                    <span>{c.icon}</span>
                  </div>
                  <div className="conn-tile-info">
                    <span className="conn-tile-name">{c.name}</span>
                    {isConfigured && (
                      <span className="conn-tile-status">● Connected</span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </section>
      ))}

      {filteredGroups.length === 0 && (
        <div className="conn-catalog-empty">
          No connectors match "<strong>{search}</strong>"
        </div>
      )}
    </div>
  )
}
