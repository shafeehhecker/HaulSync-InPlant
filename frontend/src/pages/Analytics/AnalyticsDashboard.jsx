import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import api from '../../api/client';
import { PageHeader, Spinner } from '../../components/common';

const TOOLTIP_STYLE = { background: '#18181B', border: '1px solid #3F3F46', borderRadius: '8px', color: '#FAFAFA', fontSize: '12px' };
const COLORS = ['#14B8A6', '#60A5FA', '#FBBF24', '#F87171', '#A78BFA', '#94A3B8'];

export default function AnalyticsDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('7d');

  useEffect(() => {
    setLoading(true);
    api.get(`/analytics/inplant?period=${period}`)
      .then(r => setData(r.data))
      .catch(() => setData(getMockAnalytics()))
      .finally(() => setLoading(false));
  }, [period]);

  if (loading) return <Spinner />;
  const d = data || getMockAnalytics();

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Analytics"
        subtitle="In-plant operations performance"
        action={
          <div className="flex gap-1">
            {['7d','30d','90d'].map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${period === p ? 'bg-teal-500/15 text-teal-400 border border-teal-500/30' : 'text-zinc-400 hover:bg-zinc-800'}`}>
                {p}
              </button>
            ))}
          </div>
        }
      />

      {/* KPI summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Vehicles', value: d.totalVehicles, color: 'text-teal-400' },
          { label: 'Avg TAT',        value: d.avgTAT,        color: 'text-zinc-100' },
          { label: 'Detention Cases',value: d.detentionCases,color: 'text-amber-400' },
          { label: 'Dock Efficiency',value: d.dockEfficiency, color: 'text-teal-400' },
        ].map(s => (
          <div key={s.label} className="card p-5">
            <p className="text-xs text-zinc-500 uppercase tracking-wider">{s.label}</p>
            <p className={`font-display text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Daily gate traffic */}
        <div className="card p-5">
          <h3 className="font-display font-semibold text-zinc-200 mb-4">Daily Gate Traffic</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={d.dailyTraffic} barSize={16}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
              <XAxis dataKey="date" tick={{ fill: '#71717A', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#71717A', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="entries" fill="#14B8A6" radius={[3,3,0,0]} name="Entries" />
              <Bar dataKey="exits"   fill="#0D9488" radius={[3,3,0,0]} name="Exits" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* TAT trend */}
        <div className="card p-5">
          <h3 className="font-display font-semibold text-zinc-200 mb-4">Avg TAT Trend (minutes)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={d.tatTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
              <XAxis dataKey="date" tick={{ fill: '#71717A', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#71717A', fontSize: 11 }} axisLine={false} tickLine={false} unit="m" />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Line type="monotone" dataKey="tat" stroke="#14B8A6" strokeWidth={2} dot={{ fill: '#14B8A6', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Vendor-wise visits */}
        <div className="card p-5">
          <h3 className="font-display font-semibold text-zinc-200 mb-4">Top Vendors by Visit Count</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={d.vendorVisits} layout="vertical" barSize={14}>
              <XAxis type="number" tick={{ fill: '#71717A', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="vendor" tick={{ fill: '#A1A1AA', fontSize: 11 }} axisLine={false} tickLine={false} width={120} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="visits" fill="#14B8A6" radius={[0,4,4,0]} name="Visits" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Detention by vendor */}
        <div className="card p-5">
          <h3 className="font-display font-semibold text-zinc-200 mb-4">Detention by Purpose</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={d.detentionByPurpose} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={3}>
                {d.detentionByPurpose.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 mt-2">
            {d.detentionByPurpose.map((e, i) => (
              <div key={e.name} className="flex items-center gap-1.5 text-xs text-zinc-400">
                <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                {e.name} ({e.value})
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Dock utilization table */}
      <div className="card">
        <div className="px-5 py-4 border-b border-zinc-800">
          <h3 className="font-display font-semibold text-zinc-200">Dock Utilization Summary</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                {['Dock', 'Total Slots', 'Occupied', 'Utilization %', 'Avg Dwell Time'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {d.dockUtilization.map(row => (
                <tr key={row.dock} className="hover:bg-zinc-900/50 transition-colors">
                  <td className="px-5 py-3.5 font-mono text-teal-400 font-medium">{row.dock}</td>
                  <td className="px-5 py-3.5 text-zinc-300">{row.totalSlots}</td>
                  <td className="px-5 py-3.5 text-zinc-300">{row.occupied}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-zinc-800 rounded-full h-1.5 w-20">
                        <div className="bg-teal-500 h-1.5 rounded-full" style={{ width: `${row.utilPct}%` }} />
                      </div>
                      <span className="text-zinc-300 font-mono text-xs">{row.utilPct}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 font-mono text-zinc-400 text-xs">{row.avgDwell}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function getMockAnalytics() {
  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  return {
    totalVehicles: 284,
    avgTAT: '2h 18m',
    detentionCases: 23,
    dockEfficiency: '78%',
    dailyTraffic: days.map(d => ({ date: d, entries: 18+Math.floor(Math.random()*15), exits: 15+Math.floor(Math.random()*12) })),
    tatTrend: days.map(d => ({ date: d, tat: 120+Math.floor(Math.random()*80) })),
    vendorVisits: [
      { vendor: 'Reliance Industries', visits: 42 },
      { vendor: 'Tata Steel',          visits: 35 },
      { vendor: 'Mahindra Logistics',  visits: 28 },
      { vendor: 'TVS Supply',          visits: 22 },
      { vendor: 'L&T Transport',       visits: 18 },
    ],
    detentionByPurpose: [
      { name: 'INBOUND',  value: 14 },
      { name: 'OUTBOUND', value: 6 },
      { name: 'RETURN',   value: 3 },
    ],
    dockUtilization: [
      { dock: 'DOCK-1', totalSlots: 8, occupied: 6, utilPct: 75, avgDwell: '2h 05m' },
      { dock: 'DOCK-2', totalSlots: 8, occupied: 7, utilPct: 88, avgDwell: '1h 50m' },
      { dock: 'DOCK-3', totalSlots: 6, occupied: 4, utilPct: 67, avgDwell: '2h 30m' },
    ],
  };
}
