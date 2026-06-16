import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, X, Shield, Minus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { InventoryItem } from '@/types/database'

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
  other: '📦',
}

export function InventoryTab({ campaignId }: Props) {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
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

  useEffect(() => { fetchItems() }, [fetchItems])

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

  const inputClass = 'w-full rounded-lg border border-navy bg-midnight px-3 py-2 text-sm text-parchment placeholder-gray-600 outline-none focus:border-gold/40 transition-colors'

  if (loading) return <div className="py-8 text-center text-sm text-gray-500">Loading...</div>

  const equipped = items.filter((i) => i.is_equipped)
  const backpack = items.filter((i) => !i.is_equipped)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-500">{items.length} items</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-1 rounded-lg bg-gold/10 px-3 py-1.5 text-xs font-medium text-gold hover:bg-gold/20 transition-colors"
        >
          {showForm ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
          {showForm ? 'Cancel' : 'Add Item'}
        </button>
      </div>

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

      {items.length === 0 ? (
        <p className="py-4 text-center text-sm text-gray-600">No items in inventory.</p>
      ) : (
        <>
          {equipped.length > 0 && (
            <div>
              <h4 className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-gold">
                <Shield className="h-3 w-3" /> Equipped
              </h4>
              <div className="space-y-1">{equipped.map((item) => <ItemRow key={item.id} item={item} onToggleEquip={toggleEquipped} onAdjustQty={adjustQuantity} onDelete={handleDelete} />)}</div>
            </div>
          )}
          {backpack.length > 0 && (
            <div>
              <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500">Backpack</h4>
              <div className="space-y-1">{backpack.map((item) => <ItemRow key={item.id} item={item} onToggleEquip={toggleEquipped} onAdjustQty={adjustQuantity} onDelete={handleDelete} />)}</div>
            </div>
          )}
        </>
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
      <div className="flex items-center gap-3">
        <span className="text-base">{categoryIcons[item.category]}</span>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-parchment">{item.name}</span>
            {item.quantity > 1 && <span className="text-xs text-gray-500">×{item.quantity}</span>}
          </div>
          {item.description && <p className="text-xs text-gray-500">{item.description}</p>}
        </div>
      </div>
      <div className="flex items-center gap-1">
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
