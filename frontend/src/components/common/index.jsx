// StatusBadge
export function StatusBadge({ status }) {
  const map = {
    // Gate
    CHECKED_IN: 'badge-teal',
    IN_DOCK: 'badge-blue',
    LOADING: 'badge-blue',
    UNLOADING: 'badge-blue',
    QC_HOLD: 'badge-amber',
    COMPLETE: 'badge-green',
    CHECKED_OUT: 'badge-green',
    CANCELLED: 'badge-red',
    QUEUED: 'badge-zinc',
    // Detention
    ACTIVE: 'badge-amber',
    ESCALATED: 'badge-red',
    WAIVED: 'badge-green',
    COLLECTED: 'badge-teal',
    // Dock
    AVAILABLE: 'badge-green',
    OCCUPIED: 'badge-teal',
    MAINTENANCE: 'badge-zinc',
    RESERVED: 'badge-orange',
    // Bay
    FREE: 'badge-green',
    IN_USE: 'badge-teal',
    HOLD: 'badge-amber',
    // Approval
    PENDING: 'badge-zinc',
    APPROVED: 'badge-green',
    REJECTED: 'badge-red',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium font-mono ${map[status] || 'badge-zinc'}`}>
      {status?.replace(/_/g, ' ')}
    </span>
  );
}

// Button
export function Button({ children, variant = 'primary', size = 'md', className = '', ...props }) {
  const base = 'inline-flex items-center gap-2 font-medium rounded-lg transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed';
  const variants = {
    primary: 'bg-teal-500 text-zinc-950 hover:bg-teal-400 active:bg-teal-600',
    secondary: 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700 border border-zinc-700',
    danger: 'bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25',
    ghost: 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800',
    teal: 'bg-teal-500/15 text-teal-400 border border-teal-500/30 hover:bg-teal-500/25',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  };

  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  );
}

// Modal
export function Modal({ open, onClose, title, children, width = 'max-w-lg' }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative card p-6 w-full ${width} animate-fade-in max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-lg font-semibold text-zinc-100">{title}</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200 transition-colors text-xl leading-none">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// FormField
export function FormField({ label, required, children, error }) {
  return (
    <div>
      <label className="block text-sm font-medium text-zinc-300 mb-1.5">
        {label} {required && <span className="text-teal-400">*</span>}
      </label>
      {children}
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );
}

// PageHeader
export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-zinc-100">{title}</h1>
        {subtitle && <p className="text-zinc-400 text-sm mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// StatCard
export function StatCard({ label, value, icon: Icon, color = 'teal', delta, deltaUp = true }) {
  const colors = {
    teal:   'text-teal-400 bg-teal-400/10',
    green:  'text-green-400 bg-green-400/10',
    blue:   'text-blue-400 bg-blue-400/10',
    purple: 'text-purple-400 bg-purple-400/10',
    red:    'text-red-400 bg-red-400/10',
    amber:  'text-amber-400 bg-amber-400/10',
    orange: 'text-orange-400 bg-orange-400/10',
  };

  return (
    <div className="card p-5 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{label}</p>
          <p className="font-display text-3xl font-bold text-zinc-100 mt-1">{value}</p>
          {delta && (
            <p className={`text-xs mt-1 ${deltaUp ? 'text-teal-400' : 'text-red-400'}`}>{delta}</p>
          )}
        </div>
        {Icon && (
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors[color]}`}>
            <Icon size={18} />
          </div>
        )}
      </div>
    </div>
  );
}

// EmptyState
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && <div className="w-14 h-14 rounded-xl bg-zinc-800 flex items-center justify-center mb-4"><Icon size={24} className="text-zinc-500" /></div>}
      <h3 className="font-display font-semibold text-zinc-300 text-lg">{title}</h3>
      {description && <p className="text-zinc-500 text-sm mt-1 max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// Spinner
export function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-8 h-8 border-2 border-zinc-700 border-t-teal-500 rounded-full animate-spin" />
    </div>
  );
}

// SearchInput
export function SearchInput({ value, onChange, placeholder = 'Search...' }) {
  return (
    <input
      type="search"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="input-field w-64"
    />
  );
}

// ProgressBar
export function ProgressBar({ value, max = 100, color = 'teal' }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const colorClass = {
    teal: 'bg-teal-500',
    green: 'bg-green-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
  }[color] || 'bg-teal-500';

  return (
    <div className="w-full bg-zinc-800 rounded-full h-1.5">
      <div className={`${colorClass} h-1.5 rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// LiveDot
export function LiveDot({ color = 'teal' }) {
  const colors = {
    teal: 'bg-teal-400',
    green: 'bg-green-400',
    red: 'bg-red-400',
    amber: 'bg-amber-400',
  };
  return (
    <span className="relative flex h-2 w-2">
      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${colors[color]} opacity-75`} />
      <span className={`relative inline-flex rounded-full h-2 w-2 ${colors[color]}`} />
    </span>
  );
}
