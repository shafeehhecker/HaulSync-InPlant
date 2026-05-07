import { useState, useEffect } from 'react';
import { Warehouse, RefreshCw, AlertTriangle } from 'lucide-react';
import api from '../../api/client';
import { PageHeader, Button, Modal, FormField, StatusBadge, Spinner, ProgressBar } from '../../components/common';

const BAY_COLORS = {
  FREE:    { bg: 'bg-teal-500/10  border-teal-500/30',  text: 'text-teal-400',  label: 'badge-teal' },
  IN_USE:  { bg: 'bg-blue-500/10  border-blue-500/30',   text: 'text-blue-400',  label: 'badge-blue' },
  HOLD:    { bg: 'bg-amber-500/10 border-amber-500/30', text: 'text-amber-400', label: 'badge-amber' },
};

export default function BayManagement() {
  const [bays, setBays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [progress, setProgress] = useState(0);

  const load = () => {
    setLoading(true);
    api.get('/bays')
      .then(r => setBays(r.data))
      .catch(() => setBays(MOCK_BAYS))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, []);

  const openUpdate = (bay) => {
    setSelected(bay);
    setProgress(bay.loadingProgress || 0);
    setUpdateOpen(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await api.patch(`/bays/${selected.id}`, { loadingProgress: progress });
    } catch {
      setBays(b => b.map(x => x.id === selected.id ? { ...x, loadingProgress: progress } : x));
    }
    setUpdateOpen(false);
  };

  const docksGrouped = bays.reduce((acc, bay) => {
    const dock = bay.dock || 'DOCK-1';
    acc[dock] = acc[dock] || [];
    acc[dock].push(bay);
    return acc;
  }, {});

  if (loading) return <Spinner />;

  const occupied = bays.filter(b => b.status === 'IN_USE').length;
  const onHold = bays.filter(b => b.status === 'HOLD').length;
  const free = bays.filter(b => b.status === 'FREE').length;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Loading Bay Map"
        subtitle="Real-time bay status and loading progress"
        action={<Button variant="secondary" onClick={load}><RefreshCw size={14} /> Refresh</Button>}
      />

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Occupied', value: occupied, color: 'text-blue-400' },
          { label: 'On Hold',  value: onHold,   color: 'text-amber-400' },
          { label: 'Free',     value: free,      color: 'text-teal-400' },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wider">{s.label}</p>
            <p className={`font-display text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Bay map by dock */}
      {Object.entries(docksGrouped).map(([dock, dockBays]) => (
        <div key={dock} className="card">
          <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
            <h3 className="font-display font-semibold text-zinc-200">{dock}</h3>
            <span className="text-xs text-zinc-500">{dockBays.filter(b => b.status === 'IN_USE').length}/{dockBays.length} occupied</span>
          </div>
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dockBays.map(bay => {
              const cfg = BAY_COLORS[bay.status] || BAY_COLORS.FREE;
              return (
                <div key={bay.id}
                  className={`rounded-xl border p-4 cursor-pointer transition-all hover:scale-[1.01] ${cfg.bg}`}
                  onClick={() => openUpdate(bay)}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-semibold font-mono ${cfg.text}`}>{bay.bayId}</span>
                    <StatusBadge status={bay.status} />
                  </div>

                  {bay.status !== 'FREE' && (
                    <>
                      <p className="text-zinc-200 font-mono font-medium text-sm">{bay.vehicleNumber}</p>
                      <p className="text-zinc-500 text-xs mt-0.5">{bay.vendorName}</p>
                      {bay.purpose && (
                        <p className={`text-xs mt-1 font-mono ${bay.purpose === 'INBOUND' ? 'text-teal-400' : 'text-blue-400'}`}>{bay.purpose}</p>
                      )}
                      {bay.status === 'HOLD' && (
                        <div className="flex items-center gap-1 mt-2 text-amber-400 text-xs">
                          <AlertTriangle size={11} /> QC / Exception Hold
                        </div>
                      )}
                      {bay.loadingProgress != null && bay.status !== 'HOLD' && (
                        <div className="mt-3 space-y-1">
                          <div className="flex justify-between text-xs text-zinc-500">
                            <span>Progress</span>
                            <span className={cfg.text}>{bay.loadingProgress}%</span>
                          </div>
                          <ProgressBar
                            value={bay.loadingProgress}
                            color={bay.loadingProgress === 100 ? 'green' : 'teal'}
                          />
                        </div>
                      )}
                      <p className="text-xs text-zinc-600 mt-2">
                        {bay.startTime ? `Since ${new Date(bay.startTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}` : ''}
                      </p>
                    </>
                  )}

                  {bay.status === 'FREE' && (
                    <p className="text-zinc-600 text-sm mt-1">Available for assignment</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Update Progress Modal */}
      <Modal open={updateOpen} onClose={() => setUpdateOpen(false)} title={`Update Bay ${selected?.bayId}`}>
        {selected && (
          <form onSubmit={handleUpdate} className="space-y-5">
            <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800">
              <p className="text-sm text-zinc-400">Vehicle: <span className="text-zinc-100 font-mono font-medium">{selected.vehicleNumber}</span></p>
              <p className="text-sm text-zinc-400 mt-1">Vendor: <span className="text-zinc-300">{selected.vendorName}</span></p>
              <p className="text-sm text-zinc-400 mt-1">Status: <StatusBadge status={selected.status} /></p>
            </div>
            <FormField label={`Loading Progress: ${progress}%`}>
              <input type="range" min="0" max="100" step="5" value={progress}
                onChange={e => setProgress(Number(e.target.value))}
                className="w-full accent-teal-500" />
              <div className="mt-2">
                <ProgressBar value={progress} color={progress === 100 ? 'green' : 'teal'} />
              </div>
            </FormField>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" type="button" onClick={() => setUpdateOpen(false)}>Cancel</Button>
              <Button type="submit"><Warehouse size={15} /> Update Progress</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

const MOCK_BAYS = [
  { id: 1, bayId: 'D1-A', dock: 'DOCK-1', status: 'IN_USE',  vehicleNumber: 'MH04TK7821', vendorName: 'Reliance Industries', purpose: 'INBOUND',  loadingProgress: 68, startTime: new Date(Date.now()-3600000).toISOString() },
  { id: 2, bayId: 'D1-B', dock: 'DOCK-1', status: 'IN_USE',  vehicleNumber: 'GJ05CX4412', vendorName: 'Tata Steel',          purpose: 'OUTBOUND', loadingProgress: 91, startTime: new Date(Date.now()-2700000).toISOString() },
  { id: 3, bayId: 'D1-C', dock: 'DOCK-1', status: 'HOLD',    vehicleNumber: 'MH12AB9034', vendorName: 'Mahindra Logistics',  purpose: 'INBOUND',  loadingProgress: null },
  { id: 4, bayId: 'D2-A', dock: 'DOCK-2', status: 'FREE',    vehicleNumber: null, vendorName: null },
  { id: 5, bayId: 'D2-B', dock: 'DOCK-2', status: 'IN_USE',  vehicleNumber: 'RJ14GH5590', vendorName: 'TVS Supply Chain',    purpose: 'INBOUND',  loadingProgress: 34, startTime: new Date(Date.now()-1800000).toISOString() },
  { id: 6, bayId: 'D2-C', dock: 'DOCK-2', status: 'FREE',    vehicleNumber: null, vendorName: null },
];
