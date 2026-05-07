import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Warehouse, Clock, CalendarClock, ArrowRight, TrendingDown, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import api from '../api/client';
import { StatCard, StatusBadge, Spinner, LiveDot } from '../components/common';

const TOOLTIP_STYLE = { background: '#18181B', border: '1px solid #3F3F46', borderRadius: '8px', color: '#FAFAFA', fontSize: '12px' };

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/analytics/dashboard')
      .then(r => setData(r.data))
      .catch(() => setData(getMockData()))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  const d = data || getMockData();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-zinc-100">In-Plant Dashboard</h1>
          <p className="text-zinc-400 text-sm mt-1 flex items-center gap-2">
            <LiveDot color="teal" />
            Live operations — {new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {d.detentionAlerts > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm">
              <AlertTriangle size={14} />
              {d.detentionAlerts} detention alert{d.detentionAlerts !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>

      {/* KPI Row 1 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger">
        <StatCard label="Vehicles On Premises" value={d.vehiclesOnPremises} icon={ShieldCheck} color="teal" delta="Active visits" />
        <StatCard label="Avg TAT Today" value={d.avgTAT} icon={TrendingDown} color="green" delta={d.tatDelta} deltaUp={d.tatDeltaUp} />
        <StatCard label="Dock Utilization" value={d.dockUtilization} icon={CalendarClock} color="blue" delta={d.dockDelta} deltaUp={false} />
        <StatCard label="Detention Today" value={d.detentionToday} icon={Clock} color="red" delta={`${d.detentionWaived} waived`} deltaUp={true} />
      </div>

      {/* KPI Row 2 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger">
        <StatCard label="Gate-Ins Today"       value={d.gateInsToday}    icon={ShieldCheck} color="teal"   delta={`${d.pendingQueue} in queue`} />
        <StatCard label="Bays Occupied"         value={d.baysOccupied}    icon={Warehouse}   color="teal"   delta={`of ${d.totalBays} total`} />
        <StatCard label="Gate-Outs Today"       value={d.gateOutsToday}   icon={ShieldCheck} color="green" />
        <StatCard label="QC Holds Active"       value={d.qcHolds}         icon={AlertTriangle} color="amber" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* TAT trend */}
        <div className="card p-5">
          <h3 className="font-display font-semibold text-zinc-200 mb-4">TAT Trend — Today (minutes)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={d.tatTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
              <XAxis dataKey="hour" tick={{ fill: '#71717A', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#71717A', fontSize: 11 }} axisLine={false} tickLine={false} unit="m" />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Line type="monotone" dataKey="tat" stroke="#14B8A6" strokeWidth={2} dot={{ fill: '#14B8A6', r: 3 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Dock utilization by hour */}
        <div className="card p-5">
          <h3 className="font-display font-semibold text-zinc-200 mb-4">Hourly Gate Traffic</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={d.gateTraffic} barSize={22}>
              <XAxis dataKey="hour" tick={{ fill: '#71717A', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#71717A', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="entries" fill="#14B8A6" radius={[4,4,0,0]} name="Entries" />
              <Bar dataKey="exits"   fill="#0D9488" radius={[4,4,0,0]} name="Exits" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Active visits table */}
      <div className="card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <h3 className="font-display font-semibold text-zinc-200">Active Visits</h3>
          <Link to="/gate" className="text-sm text-teal-400 hover:text-teal-300 flex items-center gap-1">
            View all <ArrowRight size={14} />
          </Link>
        </div>
        {d.activeVisits.length === 0 ? (
          <div className="py-12 text-center text-zinc-500 text-sm">No active visits on premises.</div>
        ) : (
          <div className="divide-y divide-zinc-800/60">
            {d.activeVisits.map((v) => (
              <div key={v.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-zinc-900/50 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck size={14} className="text-teal-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-200 font-mono">{v.vehicleNumber}</p>
                  <p className="text-xs text-zinc-500">{v.vendor} · {v.purpose}</p>
                </div>
                <div className="text-xs text-zinc-500 hidden md:block">Bay {v.bay || '—'}</div>
                <div className="text-xs text-zinc-500">{v.gateInTime}</div>
                {v.detentionMins > 0 && (
                  <div className="text-xs text-amber-400 font-mono">+{v.detentionMins}m</div>
                )}
                <StatusBadge status={v.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function getMockData() {
  return {
    vehiclesOnPremises: 12, avgTAT: '2h 14m', tatDelta: '18 min better', tatDeltaUp: true,
    dockUtilization: '74%', dockDelta: '–6% vs target',
    detentionToday: '₹4,500', detentionWaived: '₹2,250',
    gateInsToday: 18, pendingQueue: 3, baysOccupied: 4, totalBays: 6,
    gateOutsToday: 9, qcHolds: 1, detentionAlerts: 2,
    tatTrend: [
      { hour: '08:00', tat: 175 }, { hour: '09:00', tat: 160 },
      { hour: '10:00', tat: 145 }, { hour: '11:00', tat: 130 },
      { hour: '12:00', tat: 155 }, { hour: '13:00', tat: 148 },
      { hour: '14:00', tat: 134 }, { hour: 'Now',   tat: 120 },
    ],
    gateTraffic: [
      { hour: '06', entries: 2, exits: 0 }, { hour: '07', entries: 3, exits: 1 },
      { hour: '08', entries: 5, exits: 3 }, { hour: '09', entries: 4, exits: 2 },
      { hour: '10', entries: 3, exits: 4 }, { hour: '11', entries: 6, exits: 3 },
      { hour: '12', entries: 2, exits: 5 }, { hour: '13', entries: 4, exits: 2 },
      { hour: '14', entries: 3, exits: 1 },
    ],
    activeVisits: [
      { id: 1, vehicleNumber: 'MH04TK7821', vendor: 'Reliance Industries', purpose: 'Inbound', bay: 'D1-A', gateInTime: '11:48', detentionMins: 72, status: 'LOADING' },
      { id: 2, vehicleNumber: 'GJ05CX4412', vendor: 'Tata Steel', purpose: 'Outbound', bay: 'D1-B', gateInTime: '12:05', detentionMins: 0, status: 'UNLOADING' },
      { id: 3, vehicleNumber: 'MH12AB9034', vendor: 'Mahindra Logistics', purpose: 'Inbound', bay: 'D1-C', gateInTime: '12:30', detentionMins: 38, status: 'QC_HOLD' },
      { id: 4, vehicleNumber: 'RJ14GH5590', vendor: 'TVS Supply Chain', purpose: 'Inbound', bay: 'D2-B', gateInTime: '13:10', detentionMins: 0, status: 'LOADING' },
      { id: 5, vehicleNumber: 'DL08PQ2277', vendor: 'L&T Transport', purpose: 'Outbound', bay: null, gateInTime: '13:55', detentionMins: 0, status: 'QUEUED' },
    ],
  };
}
