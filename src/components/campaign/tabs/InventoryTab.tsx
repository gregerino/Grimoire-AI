import { useState, useEffect, useCallback, useMemo } from 'react'
import { Plus, Trash2, X, Shield, Minus, Search, Sparkles, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { InventoryItem } from '@/types/database'

interface Props {
  campaignId: string
  refreshKey?: number
}

const categoryIcons: Record<string, string> = {
  weapon: '⚔️',
  armor: '🛡️',
  potion: '🧪',
  scroll: '📜',
  gear: '⚙️',
  treasure: '💎',
  other: '📦',
}

const categoryOrder = ['weapon', 'armor', 'potion', 'scroll', 'gear', 'treasure', 'other']

const MAX_ATTUNEMENT = 3

export function InventoryTab({ campaignId, refreshKey }: Props) {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set())
  const [form, setForm] = useState({ name: '', description: '', category: 'gear' as InventoryItem['category'], quantity: 1 })

  const fetchItems = useCallback(async () => {
    const { data } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false })
    if (data) setItems(data as InventoryItem[])
    setLoading(false)
  }, [campaignId])

  useEffect(() => { fetchItems() }, [fetchItems, refreshKey])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    await supabase.from('inventory_items').insert({ ...form, campaign_id: campaignId })
    setForm({ name: '', description: '', category: 'gear', quantity: 1 })
    setShowForm(false)
    fetchItems()
  }

  const toggleEquipped = async (item: InventoryItem) => {
    await supabase.from('inventory_items').update({ is_equipped: !item.is_equipped }).eq('id', item.id)
    fetchItems()
  }

  const adjustQuantity = async (item: InventoryItem, delta: number) => {
    const newQty = Math.max(0, item.quantity + delta)
    if (newQty === 0) {
      await supabase.from('inventory_items').delete().eq('id', item.id)
    } else {
      await supabase.from('inventory_items').update({ quantity: newQty }).eq('id', item.id)
    }
    fetchItems()
  }

  const handleDelete = async (id: string) => {
    await supabase.from('inventory_items').delete().eq('id', id)
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  const toggleCategory = (cat: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items
    const q = searchQuery.toLowerCase()
    return items.filter(
      (i) => i.name.toLowerCase().includes(q) || i.description?.toLowerCase().includes(q) || i.category.includes(q),
    )
  }, [items, searchQuery])

  const groupedItems = useMemo(() => {
    const groups: Record<string, InventoryItem[]> = {}
    for (const item of filteredItems) {
      if (!groups[item.category]) groups[item.category] = []
      groups[item.category].push(item)
    }
    return categoryOrder
      .filter((cat) => groups[cat]?.length)
      .map((cat) => ({ category: cat, items: groups[cat] }))
  }, [filteredItems])

  const attunedCount = items.filter((i) => i.is_equipped && (i.category === 'weapon' || i.category === 'armor')).length

  const inputClass = 'w-full rounded-lg border border-navy bg-midnight px-3 py-2 text-sm text-parchment placeholder-gray-600 outline-none focus:border-gold/40 transition-colors'

  if (loading) return <div className="py-8 text-center text-sm text-gray-500">Loading...</div>

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-gray-500">{items.length} items</h3>
          {attunedCount > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-purple-500/15 px-2 py-0.5 text-[10px] font-medium text-purple-400">
              <Sparkles className="h-2.5 w-2.5" />
              {attunedCount}/{MAX_ATTUNEMENT}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-1 rounded-lg bg-gold/10 px-3 py-1.5 text-xs font-medium text-gold hover:bg-gold/20 transition-colors"
        >
          {showForm ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
          {showForm ? 'Cancel' : 'Add Item'}
        </button>
      </div>

      {/* Search */}
      {items.length > 3 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-600" />
          <input
            className="w-full rounded-lg border border-navy bg-dark-navy pl-9 pr-3 py-2 text-xs text-parchment placeholder-gray-600 outline-none focus:border-gold/40 transition-colors"
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      )}

      {showForm && (
        <form onSubmit={handleAdd} className="space-y-3 rounded-xl border border-navy bg-dark-navy p-4">
          <input className={inputClass} placeholder="Item name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <textarea className={inputClass + ' resize-none'} rows={2} placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="flex items-center gap-3">
            <select className={inputClass + ' w-auto'} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as InventoryItem['category'] })}>
              <option value="weapon">Weapon</option>
              <option value="armor">Armor</option>
              <option value="potion">Potion</option>
              <option value="scroll">Scroll</option>
              <option value="gear">Gear</option>
              <option value="treasure">Treasure</option>
              <option value="other">Other</option>
            </select>
            <input type="number" min={1} className={inputClass + ' w-20'} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} />
            <button type="submit" className="rounded-lg bg-gold px-4 py-2 text-sm font-medium text-dark-navy hover:bg-gold-light transition-colors">Add</button>
          </div>
        </form>
      )}

      {filteredItems.length === 0 ? (
        <p className="py-4 text-center text-sm text-gray-600">
          {searchQuery ? 'No items match your search.' : 'No items in inventory.'}
        </p>
      ) : (
        <div className="space-y-3">
          {groupedItems.map(({ category, items: catItems }) => {
            const isCollapsed = collapsedCategories.has(category)
            const equippedInCat = catItems.filter((i) => i.is_equipped).length
            return (
              <div key={category}>
                <button
                  onClick={() => toggleCategory(category)}
                  className="mb-1.5 flex w-full items-center gap-2 text-left"
                >
                  <span className="text-sm">{categoryIcons[category]}</span>
                  <span className="text-xs font-medium uppercase tracking-wider text-gray-500 capitalize">
                    {category}
                  </span>
                  <span className="text-[10px] text-gray-600">({catItems.length})</span>
                  {equippedInCat > 0 && (
                    <span className="text-[10px] text-gold">{equippedInCat} equipped</span>
                  )}
                  <span className="ml-auto">
                    {isCollapsed
                      ? <ChevronDown className="h-3 w-3 text-gray-600" />
                      : <ChevronUp className="h-3 w-3 text-gray-600" />
                    }
                  </span>
                </button>
                {!isCollapsed && (
                  <div className="space-y-1">
                    {catItems.map((item) => (
                      <ItemRow
                        key={item.id}
                        item={item}
                        onToggleEquip={toggleEquipped}
                        onAdjustQty={adjustQuantity}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ItemRow({ item, onToggleEquip, onAdjustQty, onDelete }: {
  item: InventoryItem
  onToggleEquip: (item: InventoryItem) => void
  onAdjustQty: (item: InventoryItem, delta: number) => void
  onDelete: (id: string) => void
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-navy bg-dark-navy px-4 py-2.5">
      <div className="flex items-center gap-3 min-w-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-parchment">{item.name}</span>
            {item.quantity > 1 && <span className="shrink-0 text-xs text-gray-500">×{item.quantity}</span>}
          </div>
          {item.description && <p className="truncate text-xs text-gray-500">{item.description}</p>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button onClick={() => onAdjustQty(item, -1)} className="rounded p-1 text-gray-500 hover:bg-navy transition-colors">
          <Minus className="h-3 w-3" />
        </button>
        <button onClick={() => onAdjustQty(item, 1)} className="rounded p-1 text-gray-500 hover:bg-navy transition-colors">
          <Plus className="h-3 w-3" />
        </button>
        <button
          onClick={() => onToggleEquip(item)}
          className={`rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${item.is_equipped ? 'bg-gold/20 text-gold' : 'bg-navy text-gray-500 hover:text-gray-400'}`}
        >
          {item.is_equipped ? 'Equipped' : 'Equip'}
        </button>
        <button onClick={() => onDelete(item.id)} className="rounded p-1 text-gray-500 hover:bg-navy hover:text-red-400 transition-colors">
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  )
}
