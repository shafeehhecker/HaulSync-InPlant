import { useState, useEffect } from 'react';
import { ShieldCheck, Plus, Search, QrCode, FileText, ChevronRight } from 'lucide-react';
import api from '../../api/client';
import { PageHeader, Button, Modal, FormField, StatusBadge, Spinner, SearchInput, EmptyState } from '../../components/common';

const PURPOSES = ['INBOUND', 'OUTBOUND', 'RETURN', 'EMPTY_RETURN', 'SERVICE'];
const VEHICLE_TYPES = ['HEAVY', 'MEDIUM', 'LIGHT', 'CONTAINER', 'TANKER'];

export default function GateEntry() {
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [form, setForm] = useState({ vehicleNumber: '', driverName: '', driverPhone: '', vendorName: '', purpose: 'INBOUND', vehicleType: 'HEAVY', poReference: '', remarks: '' });
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('active');

  const load = () => {
    setLoading(true);
    api.get('/gate')
      .then(r => setVisits(r.data))
      .catch(() => setVisits(MOCK_VISITS))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCheckIn = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/gate/checkin', form);
      setCheckInOpen(false);
      setForm({ vehicleNumber: '', driverName: '', driverPhone: '', vendorName: '', purpose: 'INBOUND', vehicleType: 'HEAVY', poReference: '', remarks: '' });
      load();
    } catch {
      setVisits(v => [{ id: Date.now(), ...form, gateInTime: new Date().toISOString(), status: 'CHECKED_IN' }, ...v]);
      setCheckInOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCheckOut = async (id) => {
    try {
      await api.post(`/gate/${id}/checkout`);
      load();
    } catch {
      setVisits(v => v.map(x => x.id === id ? { ...x, status: 'CHECKED_OUT', gateOutTime: new Date().toISOString() } : x));
    }
  };

  const filtered = visits.filter(v => {
    const matchTab = tab === 'active' ? !['CHECKED_OUT', 'CANCELLED'].includes(v.status) : ['CHECKED_OUT'].includes(v.status);
    const matchSearch = !search || v.vehicleNumber?.toLowerCase().includes(search.toLowerCase()) || v.vendorName?.toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Gate Entry"
        subtitle="Vehicle check-in, verification, and queue management"
        action={
          <Button onClick={() => setCheckInOpen(true)}>
            <Plus size={16} /> Gate Check-In
          </Button>
        }
      />

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'On Premises', value: visits.filter(v => !['CHECKED_OUT','CANCELLED'].includes(v.status)).length, color: 'text-teal-400' },
          { label: 'In Queue',    value: visits.filter(v => v.status === 'QUEUED').length, color: 'text-zinc-300' },
          { label: 'Loading',     value: visits.filter(v => ['LOADING','UNLOADING'].includes(v.status)).length, color: 'text-blue-400' },
          { label: 'QC Hold',     value: visits.filter(v => v.status === 'QC_HOLD').length, color: 'text-amber-400' },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wider">{s.label}</p>
            <p className={`font-display text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 gap-4 flex-wrap">
          <div className="flex gap-1">
            {['active', 'history'].map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-teal-500/15 text-teal-400 border border-teal-500/30' : 'text-zinc-400 hover:bg-zinc-800'}`}>
                {t === 'active' ? 'Active Visits' : 'Today\'s History'}
              </button>
            ))}
          </div>
          <SearchInput value={search} onChange={setSearch} placeholder="Search vehicle or vendor..." />
        </div>

        {loading ? <Spinner /> : filtered.length === 0 ? (
          <EmptyState icon={ShieldCheck} title="No visits" description="Check-in a vehicle to get started." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  {['Vehicle', 'Vendor', 'Purpose', 'Driver', 'Gate-In', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filtered.map(v => (
                  <tr key={v.id} className="hover:bg-zinc-900/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <span className="font-mono text-zinc-100 font-medium">{v.vehicleNumber}</span>
                      <div className="text-xs text-zinc-500">{v.vehicleType}</div>
                    </td>
                    <td className="px-5 py-3.5 text-zinc-300">{v.vendorName}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-mono px-2 py-0.5 rounded ${v.purpose === 'INBOUND' ? 'text-teal-400 bg-teal-500/10' : 'text-blue-400 bg-blue-500/10'}`}>{v.purpose}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="text-zinc-300">{v.driverName}</div>
                      <div className="text-xs text-zinc-500">{v.driverPhone}</div>
                    </td>
                    <td className="px-5 py-3.5 text-zinc-400 font-mono text-xs">
                      {v.gateInTime ? new Date(v.gateInTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td className="px-5 py-3.5"><StatusBadge status={v.status} /></td>
                    <td className="px-5 py-3.5">
                      {!['CHECKED_OUT','CANCELLED'].includes(v.status) && (
                        <button onClick={() => handleCheckOut(v.id)}
                          className="text-xs text-zinc-400 hover:text-teal-400 flex items-center gap-1 transition-colors">
                          Check-Out <ChevronRight size={12} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Check-In Modal */}
      <Modal open={checkInOpen} onClose={() => setCheckInOpen(false)} title="Gate Check-In" width="max-w-xl">
        <form onSubmit={handleCheckIn} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Vehicle Number" required>
              <input className="input-field" placeholder="MH04TK7821" value={form.vehicleNumber}
                onChange={e => setForm(f => ({ ...f, vehicleNumber: e.target.value.toUpperCase() }))} required />
            </FormField>
            <FormField label="Vehicle Type" required>
              <select className="input-field" value={form.vehicleType} onChange={e => setForm(f => ({ ...f, vehicleType: e.target.value }))}>
                {VEHICLE_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Driver Name" required>
              <input className="input-field" placeholder="Ramesh Kumar" value={form.driverName}
                onChange={e => setForm(f => ({ ...f, driverName: e.target.value }))} required />
            </FormField>
            <FormField label="Driver Phone">
              <input className="input-field" placeholder="+91 98765 43210" value={form.driverPhone}
                onChange={e => setForm(f => ({ ...f, driverPhone: e.target.value }))} />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Vendor / Consignor" required>
              <input className="input-field" placeholder="Reliance Industries" value={form.vendorName}
                onChange={e => setForm(f => ({ ...f, vendorName: e.target.value }))} required />
            </FormField>
            <FormField label="Purpose" required>
              <select className="input-field" value={form.purpose} onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))}>
                {PURPOSES.map(p => <option key={p}>{p}</option>)}
              </select>
            </FormField>
          </div>
          <FormField label="PO / LR Reference">
            <input className="input-field" placeholder="PO-2024-0123" value={form.poReference}
              onChange={e => setForm(f => ({ ...f, poReference: e.target.value }))} />
          </FormField>
          <FormField label="Remarks">
            <textarea className="input-field" rows={2} placeholder="Any notes..." value={form.remarks}
              onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} />
          </FormField>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setCheckInOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Processing…' : <><ShieldCheck size={15} /> Confirm Check-In</>}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

const MOCK_VISITS = [
  { id: 1, vehicleNumber: 'MH04TK7821', vehicleType: 'HEAVY', vendorName: 'Reliance Industries', purpose: 'INBOUND', driverName: 'Ramesh Kumar', driverPhone: '+91 98765 43210', gateInTime: new Date(Date.now() - 3600000).toISOString(), status: 'LOADING' },
  { id: 2, vehicleNumber: 'GJ05CX4412', vehicleType: 'MEDIUM', vendorName: 'Tata Steel', purpose: 'OUTBOUND', driverName: 'Suresh Patel', driverPhone: '+91 87654 32109', gateInTime: new Date(Date.now() - 2700000).toISOString(), status: 'UNLOADING' },
  { id: 3, vehicleNumber: 'MH12AB9034', vehicleType: 'HEAVY', vendorName: 'Mahindra Logistics', purpose: 'INBOUND', driverName: 'Ajay Singh', driverPhone: '+91 76543 21098', gateInTime: new Date(Date.now() - 2400000).toISOString(), status: 'QC_HOLD' },
  { id: 4, vehicleNumber: 'RJ14GH5590', vehicleType: 'LIGHT', vendorName: 'TVS Supply Chain', purpose: 'INBOUND', driverName: 'Vijay Sharma', driverPhone: '+91 65432 10987', gateInTime: new Date(Date.now() - 1800000).toISOString(), status: 'QUEUED' },
  { id: 5, vehicleNumber: 'KA22MN8810', vehicleType: 'MEDIUM', vendorName: 'Bosch Industries', purpose: 'OUTBOUND', driverName: 'Mohan Das', driverPhone: '+91 54321 09876', gateInTime: new Date(Date.now() - 5400000).toISOString(), status: 'CHECKED_OUT' },
];
