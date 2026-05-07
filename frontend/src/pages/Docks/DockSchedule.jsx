import { useState, useEffect } from 'react';
import { CalendarClock, Plus } from 'lucide-react';
import api from '../../api/client';
import { PageHeader, Button, Modal, FormField, StatusBadge, Spinner, EmptyState } from '../../components/common';

const DOCKS = ['DOCK-1', 'DOCK-2', 'DOCK-3'];
const HOURS = Array.from({ length: 14 }, (_, i) => `${String(i + 6).padStart(2,'0')}:00`);

export default function DockSchedule() {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ dock: 'DOCK-1', date: new Date().toISOString().slice(0,10), startTime: '09:00', endTime: '11:00', vehicleNumber: '', vendorName: '', purpose: 'INBOUND', priority: 'NORMAL' });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    api.get('/docks/slots')
      .then(r => setSlots(r.data))
      .catch(() => setSlots(MOCK_SLOTS))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/docks/slots', form);
      setAddOpen(false);
      load();
    } catch {
      setSlots(s => [...s, { id: Date.now(), ...form, status: 'RESERVED' }]);
      setAddOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Dock Schedule"
        subtitle="Slot allocation and dock availability"
        action={<Button onClick={() => setAddOpen(true)}><Plus size={16} /> Book Slot</Button>}
      />

      {/* Dock status cards */}
      <div className="grid grid-cols-3 gap-4">
        {DOCKS.map(dock => {
          const dockSlots = slots.filter(s => s.dock === dock);
          const occupied = dockSlots.filter(s => s.status === 'OCCUPIED').length;
          const reserved = dockSlots.filter(s => s.status === 'RESERVED').length;
          return (
            <div key={dock} className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display font-semibold text-zinc-200">{dock}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full border font-mono ${occupied > 0 ? 'badge-teal' : 'badge-green'}`}>
                  {occupied > 0 ? 'In Use' : 'Available'}
                </span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-zinc-400">
                  <span>Occupied</span><span className="text-teal-400 font-mono">{occupied}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Reserved</span><span className="text-zinc-300 font-mono">{reserved}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Free slots today</span><span className="text-green-400 font-mono">{Math.max(0, 3 - occupied - reserved)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Schedule table */}
      <div className="card">
        <div className="px-5 py-4 border-b border-zinc-800">
          <h3 className="font-display font-semibold text-zinc-200">Today's Schedule</h3>
          <p className="text-zinc-500 text-sm mt-0.5">{new Date().toLocaleDateString('en-IN', { dateStyle: 'full' })}</p>
        </div>
        {loading ? <Spinner /> : slots.length === 0 ? (
          <EmptyState icon={CalendarClock} title="No slots booked" description="Book a dock slot to see it here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  {['Dock', 'Time Slot', 'Vehicle', 'Vendor', 'Purpose', 'Priority', 'Status'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {slots.sort((a,b) => a.startTime?.localeCompare(b.startTime)).map(s => (
                  <tr key={s.id} className="hover:bg-zinc-900/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <span className="text-teal-400 font-mono font-medium">{s.dock}</span>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-zinc-300 text-xs">{s.startTime} – {s.endTime}</td>
                    <td className="px-5 py-3.5 font-mono text-zinc-100 font-medium">{s.vehicleNumber || '—'}</td>
                    <td className="px-5 py-3.5 text-zinc-300">{s.vendorName}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-mono px-2 py-0.5 rounded ${s.purpose === 'INBOUND' ? 'text-teal-400 bg-teal-500/10' : 'text-blue-400 bg-blue-500/10'}`}>{s.purpose}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-mono px-2 py-0.5 rounded border ${s.priority === 'HIGH' ? 'badge-red' : s.priority === 'URGENT' ? 'badge-orange' : 'badge-zinc'}`}>{s.priority}</span>
                    </td>
                    <td className="px-5 py-3.5"><StatusBadge status={s.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Book Dock Slot" width="max-w-lg">
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Dock" required>
              <select className="input-field" value={form.dock} onChange={e => setForm(f => ({ ...f, dock: e.target.value }))}>
                {DOCKS.map(d => <option key={d}>{d}</option>)}
              </select>
            </FormField>
            <FormField label="Date" required>
              <input type="date" className="input-field" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Start Time" required>
              <select className="input-field" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}>
                {HOURS.map(h => <option key={h}>{h}</option>)}
              </select>
            </FormField>
            <FormField label="End Time" required>
              <select className="input-field" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}>
                {HOURS.map(h => <option key={h}>{h}</option>)}
              </select>
            </FormField>
          </div>
          <FormField label="Vehicle Number">
            <input className="input-field" placeholder="MH04TK7821 (optional)" value={form.vehicleNumber}
              onChange={e => setForm(f => ({ ...f, vehicleNumber: e.target.value.toUpperCase() }))} />
          </FormField>
          <FormField label="Vendor / Consignor" required>
            <input className="input-field" placeholder="Vendor name" value={form.vendorName}
              onChange={e => setForm(f => ({ ...f, vendorName: e.target.value }))} required />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Purpose">
              <select className="input-field" value={form.purpose} onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))}>
                {['INBOUND','OUTBOUND','RETURN'].map(p => <option key={p}>{p}</option>)}
              </select>
            </FormField>
            <FormField label="Priority">
              <select className="input-field" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                {['NORMAL','HIGH','URGENT'].map(p => <option key={p}>{p}</option>)}
              </select>
            </FormField>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Booking…' : <><CalendarClock size={15} /> Book Slot</>}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

const MOCK_SLOTS = [
  { id: 1, dock: 'DOCK-1', startTime: '08:00', endTime: '10:00', vehicleNumber: 'MH04TK7821', vendorName: 'Reliance Industries', purpose: 'INBOUND', priority: 'HIGH', status: 'OCCUPIED' },
  { id: 2, dock: 'DOCK-1', startTime: '10:30', endTime: '12:30', vehicleNumber: 'GJ05CX4412', vendorName: 'Tata Steel', purpose: 'OUTBOUND', priority: 'NORMAL', status: 'RESERVED' },
  { id: 3, dock: 'DOCK-2', startTime: '09:00', endTime: '11:00', vehicleNumber: 'MH12AB9034', vendorName: 'Mahindra Logistics', purpose: 'INBOUND', priority: 'NORMAL', status: 'OCCUPIED' },
  { id: 4, dock: 'DOCK-2', startTime: '13:00', endTime: '15:00', vehicleNumber: '', vendorName: 'Bosch Industries', purpose: 'INBOUND', priority: 'URGENT', status: 'RESERVED' },
  { id: 5, dock: 'DOCK-3', startTime: '11:00', endTime: '13:00', vehicleNumber: 'RJ14GH5590', vendorName: 'TVS Supply Chain', purpose: 'INBOUND', priority: 'NORMAL', status: 'RESERVED' },
];
