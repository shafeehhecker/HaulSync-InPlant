import { useState, useEffect } from 'react';
import { Clock, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import api from '../../api/client';
import { PageHeader, Button, Modal, FormField, StatusBadge, Spinner, EmptyState } from '../../components/common';

function fmtMins(mins) {
  if (!mins) return '—';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function fmtCurrency(val) {
  return `₹${Number(val || 0).toLocaleString('en-IN')}`;
}

export default function DetentionTracker() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [approvalForm, setApprovalForm] = useState({ action: 'APPROVE', waiveAmount: 0, reason: '' });
  const [tab, setTab] = useState('active');

  const load = () => {
    setLoading(true);
    api.get('/detention')
      .then(r => setCases(r.data))
      .catch(() => setCases(MOCK_CASES))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t); }, []);

  const openApproval = (c) => {
    setSelected(c);
    setApprovalForm({ action: 'APPROVE', waiveAmount: c.chargesAccrued, reason: '' });
    setApprovalOpen(true);
  };

  const handleApproval = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/detention/${selected.id}/approve`, approvalForm);
      load();
    } catch {
      setCases(cs => cs.map(x => x.id === selected.id ? { ...x, status: approvalForm.action === 'APPROVE' ? 'WAIVED' : 'COLLECTED' } : x));
    }
    setApprovalOpen(false);
  };

  const filtered = cases.filter(c =>
    tab === 'active' ? ['ACTIVE', 'ESCALATED'].includes(c.status) : ['WAIVED','COLLECTED'].includes(c.status)
  );

  const totalAccrued = cases.filter(c => ['ACTIVE','ESCALATED'].includes(c.status)).reduce((s, c) => s + (c.chargesAccrued || 0), 0);
  const totalWaived  = cases.filter(c => c.status === 'WAIVED').reduce((s, c) => s + (c.chargesAccrued || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Detention Tracking" subtitle="Automated detention monitoring and approval workflow" />

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Active Cases',    value: cases.filter(c => c.status === 'ACTIVE').length,     color: 'text-amber-400' },
          { label: 'Escalated',       value: cases.filter(c => c.status === 'ESCALATED').length,  color: 'text-red-400' },
          { label: 'Charges Accrued', value: fmtCurrency(totalAccrued),                           color: 'text-zinc-100' },
          { label: 'Waived Today',    value: fmtCurrency(totalWaived),                            color: 'text-teal-400' },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wider">{s.label}</p>
            <p className={`font-display text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Config info */}
      <div className="card p-4 flex items-center gap-4 text-sm">
        <Clock size={16} className="text-teal-400 flex-shrink-0" />
        <span className="text-zinc-400">Default free time: <span className="text-zinc-200">180 min</span></span>
        <span className="text-zinc-600">·</span>
        <span className="text-zinc-400">Rate: <span className="text-zinc-200">₹750/hr</span></span>
        <span className="text-zinc-600">·</span>
        <span className="text-zinc-400">Alert lead time: <span className="text-zinc-200">60 min before breach</span></span>
      </div>

      {/* Cases */}
      <div className="card">
        <div className="flex items-center gap-1 px-5 py-4 border-b border-zinc-800">
          {['active', 'resolved'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-teal-500/15 text-teal-400 border border-teal-500/30' : 'text-zinc-400 hover:bg-zinc-800'}`}>
              {t === 'active' ? 'Active / Escalated' : 'Resolved'}
            </button>
          ))}
        </div>

        {loading ? <Spinner /> : filtered.length === 0 ? (
          <EmptyState icon={Clock} title={tab === 'active' ? 'No active detention' : 'No resolved cases today'} />
        ) : (
          <div className="divide-y divide-zinc-800/60">
            {filtered.map(c => {
              const isEscalated = c.status === 'ESCALATED';
              return (
                <div key={c.id} className={`px-5 py-4 flex flex-col md:flex-row md:items-center gap-4 ${isEscalated ? 'bg-red-500/5' : ''}`}>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-3">
                      {isEscalated && <AlertTriangle size={14} className="text-red-400" />}
                      <span className="font-mono font-semibold text-zinc-100">{c.vehicleNumber}</span>
                      <StatusBadge status={c.status} />
                    </div>
                    <p className="text-sm text-zinc-400">{c.vendorName} · Bay {c.bay}</p>
                    <p className="text-xs text-zinc-600">Free time: {fmtMins(c.freeTimeMinutes)} · Gate-in: {c.gateInTime ? new Date(c.gateInTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}</p>
                  </div>
                  <div className="flex items-center gap-8">
                    <div className="text-right">
                      <p className="text-xs text-zinc-500">Overdue</p>
                      <p className={`font-mono font-semibold ${isEscalated ? 'text-red-400' : 'text-amber-400'}`}>{fmtMins(c.overdueMins)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-zinc-500">Charges</p>
                      <p className="font-mono font-semibold text-zinc-100">{fmtCurrency(c.chargesAccrued)}</p>
                    </div>
                    {['ACTIVE','ESCALATED'].includes(c.status) && (
                      <Button size="sm" variant="teal" onClick={() => openApproval(c)}>
                        Review
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Approval Modal */}
      <Modal open={approvalOpen} onClose={() => setApprovalOpen(false)} title="Detention Review & Approval">
        {selected && (
          <form onSubmit={handleApproval} className="space-y-5">
            <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Vehicle</span>
                <span className="font-mono font-medium text-zinc-100">{selected.vehicleNumber}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Vendor</span>
                <span className="text-zinc-300">{selected.vendorName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Overdue by</span>
                <span className="text-amber-400 font-mono">{fmtMins(selected.overdueMins)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Total charges</span>
                <span className="text-zinc-100 font-mono font-semibold">{fmtCurrency(selected.chargesAccrued)}</span>
              </div>
            </div>
            <FormField label="Action">
              <select className="input-field" value={approvalForm.action} onChange={e => setApprovalForm(f => ({ ...f, action: e.target.value }))}>
                <option value="APPROVE">Waive charges</option>
                <option value="COLLECT">Collect detention</option>
                <option value="PARTIAL">Partial waiver</option>
              </select>
            </FormField>
            {approvalForm.action !== 'COLLECT' && (
              <FormField label={`Waive Amount: ${fmtCurrency(approvalForm.waiveAmount)}`}>
                <input type="range" min="0" max={selected.chargesAccrued} step="250"
                  value={approvalForm.waiveAmount}
                  onChange={e => setApprovalForm(f => ({ ...f, waiveAmount: Number(e.target.value) }))}
                  className="w-full accent-teal-500" />
              </FormField>
            )}
            <FormField label="Reason / Notes" required>
              <textarea className="input-field" rows={3} placeholder="Reason for this decision..."
                value={approvalForm.reason}
                onChange={e => setApprovalForm(f => ({ ...f, reason: e.target.value }))} required />
            </FormField>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" type="button" onClick={() => setApprovalOpen(false)}>Cancel</Button>
              <Button type="submit" variant={approvalForm.action === 'COLLECT' ? 'primary' : 'teal'}>
                {approvalForm.action === 'COLLECT' ? <><CheckCircle size={14} /> Collect</> : <><CheckCircle size={14} /> Approve Waiver</>}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

const MOCK_CASES = [
  { id: 1, vehicleNumber: 'MH04TK7821', vendorName: 'Reliance Industries', bay: 'D1-A', freeTimeMinutes: 180, overdueMins: 72,  chargesAccrued: 900,  gateInTime: new Date(Date.now()-4320000).toISOString(), status: 'ACTIVE' },
  { id: 2, vehicleNumber: 'MH12AB9034', vendorName: 'Mahindra Logistics',  bay: 'D1-C', freeTimeMinutes: 180, overdueMins: 38,  chargesAccrued: 475,  gateInTime: new Date(Date.now()-3480000).toISOString(), status: 'ESCALATED' },
  { id: 3, vehicleNumber: 'KA22MN8810', vendorName: 'Bosch Industries',    bay: 'D3-A', freeTimeMinutes: 180, overdueMins: 105, chargesAccrued: 1312, gateInTime: new Date(Date.now()-8100000).toISOString(), status: 'WAIVED' },
];
