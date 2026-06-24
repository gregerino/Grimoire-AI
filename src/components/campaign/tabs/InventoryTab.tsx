import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, X, Minus, Search, Sparkles, ChevronDown, ChevronUp, Weight, Coins, GripVertical } from 'lucide-react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent, DragOverlay } from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { supabase } from '@/lib/supabase'
import { useRealtimeTable } from '@/hooks/useRealtimeTable'
import { useInventoryStore, calculateTotalWeight, totalValueInGp } from '@/stores/inventoryStore'
import { SkeletonList } from '@/components/ui/Skeleton'
import type { InventoryItem, ItemCategory, ItemRarity } from '@/types/database'

interface Props {
  campaignId: string
}

const categoryIcons: Record<string, string> = {
  weapon: '⚔️',
  armor: '🛡️',
  potion: '🧪',
  scroll: '📜',
  gear: '⚙️',
  treasure: '💎',
  tool: '🔧',
  other: '📦',
}

const categoryOrder: ItemCategory[] = ['weapon', 'armor', 'potion', 'scroll', 'gear', 'tool', 'treasure', 'other']

const rarityColors: Record<ItemRarity, string> = {
  common: 'text-gray-400 bg-gray-500/10',
  uncommon: 'text-green-400 bg-green-500/10',
  rare: 'text-blue-400 bg-blue-500/10',
  very_rare: 'text-purple-400 bg-purple-500/10',
  legendary: 'text-amber-400 bg-amber-500/10',
}

const rarityLabels: Record<ItemRarity, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  very_rare: 'Very Rare',
  legendary: 'Legendary',
}

const MAX_ATTUNEMENT = 3

const defaultForm = {
  name: '',
  description: '',
  category: 'gear' as ItemCategory,
  rarity: 'common' as ItemRarity,
  quantity: 1,
  weight: 0,
  value_gp: 0,
  value_sp: 0,
  value_cp: 0,
}

export function InventoryTab({ campaignId }: Props) {
  const { rows: items, loading } = useRealtimeTable<InventoryItem>({ table: 'inventory_items', campaignId })
  const { currency, fetchCurrency, reorderItems } = useInventoryStore()
  const [showForm, setShowForm] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set())
  const [form, setForm] = useState(defaultForm)
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => { fetchCurrency(campaignId) }, [campaignId, fetchCurrency])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    await supabase.from('inventory_items').insert({
      ...form,
      campaign_id: campaignId,
      sort_order: items.length,
    })
    setForm(defaultForm)
    setShowForm(false)
  }

  const toggleEquipped = async (item: InventoryItem) => {
    await supabase.from('inventory_items').update({ is_equipped: !item.is_equipped }).eq('id', item.id)
  }

  const adjustQuantity = async (item: InventoryItem, delta: number) => {
    const newQty = Math.max(0, item.quantity + delta)
    if (newQty === 0) {
      await supabase.from('inventory_items').delete().eq('id', item.id)
    } else {
      await supabase.from('inventory_items').update({ quantity: newQty }).eq('id', item.id)
    }
  }

  const handleDelete = async (id: string) => {
    await supabase.from('inventory_items').delete().eq('id', id)
  }

  const toggleCategory = (cat: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  const sortedItems = useMemo(() =>
    [...items].sort((a, b) => a.sort_order - b.sort_order),
    [items],
  )

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return sortedItems
    const q = searchQuery.toLowerCase()
    return sortedItems.filter(
      (i) => i.name.toLowerCase().includes(q) || i.description?.toLowerCase().includes(q) || i.category.includes(q),
    )
  }, [sortedItems, searchQuery])

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
  const totalWeight = calculateTotalWeight(items)

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = sortedItems.findIndex((i) => i.id === active.id)
    const newIndex = sortedItems.findIndex((i) => i.id === over.id)
    const reordered = arrayMove(sortedItems, oldIndex, newIndex)
    reorderItems(campaignId, reordered.map((i) => i.id))
  }

  const inputClass = 'w-full rounded-lg border border-navy bg-midnight px-3 py-2 text-sm text-parchment placeholder-gray-600 outline-none focus:border-gold/40 transition-colors'

  if (loading) return <SkeletonList rows={4} />

  return (
    <div className="space-y-3">
      {/* Header with stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-medium text-gray-500">{items.length} items</h3>
          {attunedCount > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-purple-500/15 px-2 py-0.5 text-[10px] font-medium text-purple-400">
              <Sparkles className="h-2.5 w-2.5" />
              {attunedCount}/{MAX_ATTUNEMENT}
            </span>
          )}
          <span className="flex items-center gap-1 text-[10px] text-gray-500">
            <Weight className="h-2.5 w-2.5" />
            {totalWeight.toFixed(1)} lbs
          </span>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-1 rounded-lg bg-gold/10 px-3 py-1.5 text-xs font-medium text-gold hover:bg-gold/20 transition-colors"
        >
          {showForm ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
          {showForm ? 'Cancel' : 'Add Item'}
        </button>
      </div>

      {/* Currency display */}
      {currency && (
        <div className="flex items-center gap-3 rounded-lg border border-navy bg-dark-navy px-4 py-2">
          <Coins className="h-4 w-4 text-gold" />
          <div className="flex items-center gap-3 text-xs">
            <span className="text-yellow-400 font-medium">{currency.gp} GP</span>
            <span className="text-gray-400">{currency.sp} SP</span>
            <span className="text-amber-700">{currency.cp} CP</span>
          </div>
          <span className="ml-auto text-[10px] text-gray-600">
            {totalValueInGp(currency).toFixed(1)} GP total
          </span>
        </div>
      )}

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

      {/* Add item form */}
      {showForm && (
        <form onSubmit={handleAdd} className="space-y-3 rounded-xl border border-navy bg-dark-navy p-4">
          <input className={inputClass} placeholder="Item name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <textarea className={inputClass + ' resize-none'} rows={2} placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <select className={inputClass} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as ItemCategory })}>
              {categoryOrder.map((cat) => (
                <option key={cat} value={cat}>{categoryIcons[cat]} {cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
              ))}
            </select>
            <select className={inputClass} value={form.rarity} onChange={(e) => setForm({ ...form, rarity: e.target.value as ItemRarity })}>
              <option value="common">Common</option>
              <option value="uncommon">Uncommon</option>
              <option value="rare">Rare</option>
              <option value="very_rare">Very Rare</option>
              <option value="legendary">Legendary</option>
            </select>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="mb-1 block text-[10px] text-gray-500">Qty</label>
              <input type="number" min={1} className={inputClass} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} />
            </div>
            <div>
              <label className="mb-1 block text-[10px] text-gray-500">Weight (lbs)</label>
              <input type="number" min={0} step={0.1} className={inputClass} value={form.weight} onChange={(e) => setForm({ ...form, weight: Number(e.target.value) })} />
            </div>
            <div>
              <label className="mb-1 block text-[10px] text-gray-500">GP</label>
              <input type="number" min={0} className={inputClass} value={form.value_gp} onChange={(e) => setForm({ ...form, value_gp: Number(e.target.value) })} />
            </div>
            <div>
              <label className="mb-1 block text-[10px] text-gray-500">SP</label>
              <input type="number" min={0} className={inputClass} value={form.value_sp} onChange={(e) => setForm({ ...form, value_sp: Number(e.target.value) })} />
            </div>
          </div>
          <div className="flex justify-end">
            <button type="submit" className="rounded-lg bg-gold px-4 py-2 text-sm font-medium text-dark-navy hover:bg-gold-light transition-colors">Add</button>
          </div>
        </form>
      )}

      {/* Item list */}
      {filteredItems.length === 0 ? (
        <p className="py-4 text-center text-sm text-gray-600">
          {searchQuery ? 'No items match your search.' : 'No items in inventory.'}
        </p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={(e) => setActiveId(e.active.id as string)}
          onDragEnd={(e) => { setActiveId(null); handleDragEnd(e) }}
          onDragCancel={() => setActiveId(null)}
        >
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
                  <AnimatePresence initial={false}>
                    {!isCollapsed && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <SortableContext items={catItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                          <div className="space-y-1">
                            {catItems.map((item) => (
                              <SortableItemRow
                                key={item.id}
                                item={item}

                                onToggleEquip={toggleEquipped}
                                onAdjustQty={adjustQuantity}
                                onDelete={handleDelete}
                              />
                            ))}
                          </div>
                        </SortableContext>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>

          <DragOverlay dropAnimation={{ duration: 200, easing: 'ease' }}>
            {activeId ? (() => {
              const item = sortedItems.find((i) => i.id === activeId)
              if (!item) return null
              return (
                <div className="rounded-lg border border-gold/30 bg-dark-navy px-3 py-2.5 shadow-xl shadow-black/50">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{categoryIcons[item.category]}</span>
                    <span className="text-sm font-medium text-parchment">{item.name}</span>
                    {item.quantity > 1 && <span className="text-xs text-gray-500">x{item.quantity}</span>}
                  </div>
                </div>
              )
            })() : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  )
}

function SortableItemRow({ item, onToggleEquip, onAdjustQty, onDelete }: {
  item: InventoryItem
  onToggleEquip: (item: InventoryItem) => void
  onAdjustQty: (item: InventoryItem, delta: number) => void
  onDelete: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const valueStr = formatValue(item.value_gp, item.value_sp, item.value_cp)

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between rounded-lg border px-3 py-2.5 transition-colors ${
        isDragging
          ? 'border-gold/20 bg-gold/5 opacity-40'
          : 'border-navy bg-dark-navy'
      }`}
      layout
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <button {...attributes} {...listeners} className="cursor-grab touch-none text-gray-600 hover:text-gold/60 transition-colors" aria-label="Dra för att sortera">
          <GripVertical className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-parchment">{item.name}</span>
            {item.quantity > 1 && <span className="shrink-0 text-xs text-gray-500">x{item.quantity}</span>}
            {item.rarity !== 'common' && (
              <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium ${rarityColors[item.rarity]}`}>
                {rarityLabels[item.rarity]}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {item.description && <p className="truncate text-xs text-gray-500">{item.description}</p>}
          </div>
          {(item.weight > 0 || valueStr) && (
            <div className="flex items-center gap-2 mt-0.5">
              {item.weight > 0 && <span className="text-[10px] text-gray-600">{item.weight} lbs</span>}
              {valueStr && <span className="text-[10px] text-yellow-600">{valueStr}</span>}
            </div>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button onClick={() => onAdjustQty(item, -1)} className="rounded p-1 text-gray-500 hover:bg-navy transition-colors focus-ring" aria-label={`Minska antal ${item.name}`}>
          <Minus className="h-3 w-3" aria-hidden="true" />
        </button>
        <button onClick={() => onAdjustQty(item, 1)} className="rounded p-1 text-gray-500 hover:bg-navy transition-colors focus-ring" aria-label={`Öka antal ${item.name}`}>
          <Plus className="h-3 w-3" aria-hidden="true" />
        </button>
        <button
          onClick={() => onToggleEquip(item)}
          className={`rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${item.is_equipped ? 'bg-gold/20 text-gold' : 'bg-navy text-gray-500 hover:text-gray-400'}`}
        >
          {item.is_equipped ? 'Equipped' : 'Equip'}
        </button>
        <button onClick={() => onDelete(item.id)} className="rounded p-1 text-gray-500 hover:bg-navy hover:text-red-400 transition-colors focus-ring" aria-label={`Radera ${item.name}`}>
          <Trash2 className="h-3 w-3" aria-hidden="true" />
        </button>
      </div>
    </motion.div>
  )
}

function formatValue(gp: number, sp: number, cp: number): string {
  const parts: string[] = []
  if (gp > 0) parts.push(`${gp} gp`)
  if (sp > 0) parts.push(`${sp} sp`)
  if (cp > 0) parts.push(`${cp} cp`)
  return parts.join(', ')
}
