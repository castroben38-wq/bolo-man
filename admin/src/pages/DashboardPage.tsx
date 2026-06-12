import { useState } from 'react';
import {
  Users,
  DollarSign,
  Calendar,
  TrendingUp,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Bell,
  Search,
  Menu,
  X,
  Shield,
  MapPin,
  Star,
  Clock,
} from 'lucide-react';

const stats = [
  {
    title: 'Total Users',
    value: '1,240',
    change: '+12%',
    trend: 'up',
    icon: Users,
    accent: 'bg-forest-100 text-forest-700',
    dot: 'bg-forest-500',
  },
  {
    title: 'Revenue',
    value: '3.45M',
    suffix: 'XAF',
    change: '+23%',
    trend: 'up',
    icon: DollarSign,
    accent: 'bg-savanna-100 text-savanna-700',
    dot: 'bg-savanna-500',
  },
  {
    title: 'Bookings',
    value: '856',
    change: '+8%',
    trend: 'up',
    icon: Calendar,
    accent: 'bg-laterite-100 text-laterite-700',
    dot: 'bg-laterite-500',
  },
  {
    title: 'Active Providers',
    value: '342',
    change: '-2%',
    trend: 'down',
    icon: TrendingUp,
    accent: 'bg-clay-100 text-clay-700',
    dot: 'bg-clay-500',
  },
];

const recentActivity = [
  { id: 'BK-4821', user: 'Alice Mbarga', action: 'Completed booking', amount: '25,000 XAF', time: '2 min ago', status: 'success' },
  { id: 'BK-4822', user: 'Jean Tchinda', action: 'New service added', amount: null, time: '15 min ago', status: 'info' },
  { id: 'BK-4823', user: 'Paul Njoya', action: 'Payment received', amount: '8,000 XAF', time: '32 min ago', status: 'success' },
  { id: 'BK-4824', user: 'Marie Fotso', action: 'Subscription upgraded', amount: '5,000 XAF', time: '1 hr ago', status: 'warning' },
  { id: 'BK-4825', user: 'Bob Ndongo', action: 'Dispute filed', amount: null, time: '2 hr ago', status: 'error' },
];

const pendingVerifications = [
  { name: 'Paul Njoya', service: 'Plomberie', location: 'Yaoundé', rating: 4.5, submitted: '2 days ago' },
  { name: 'Grace Atangana', service: 'Coiffure', location: 'Douala', rating: 0, submitted: '1 day ago' },
];

export default function DashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-clay-50 flex">
      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-clay-900 text-white transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 transition-transform duration-300`}
      >
        <div className="p-6">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-forest-400 to-forest-600 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
                <path d="M16 2L4 9v14l12 7 12-7V9L16 2z" stroke="white" strokeWidth="2" fill="none"/>
              </svg>
            </div>
            <div>
              <h2 className="font-display text-xl leading-none">Bolo-Man</h2>
              <p className="text-clay-400 text-xs">Admin</p>
            </div>
          </div>

          <nav className="space-y-1">
            {[
              { label: 'Dashboard', icon: Activity, active: true },
              { label: 'Users', icon: Users },
              { label: 'Providers', icon: Shield },
              { label: 'Bookings', icon: Calendar },
              { label: 'Payments', icon: DollarSign },
              { label: 'Analytics', icon: TrendingUp },
            ].map((item) => (
              <a
                key={item.label}
                href="#"
                className={`nav-item ${item.active ? 'active' : ''}`}
              >
                <item.icon size={18} />
                <span className="font-medium">{item.label}</span>
              </a>
            ))}
          </nav>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-clay-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-laterite-600 flex items-center justify-center text-sm font-semibold">A</div>
            <div>
              <p className="text-sm font-medium">Admin User</p>
              <p className="text-xs text-clay-400">admin@boloman.cm</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-clay-100 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-clay-100 transition-colors"
              >
                {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-clay-400" size={16} />
                <input
                  type="text"
                  placeholder="Search..."
                  className="pl-10 pr-4 py-2 bg-clay-50 rounded-xl text-sm w-64 focus:ring-2 focus:ring-forest-500 focus:bg-white transition-all border-0"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button className="relative p-2 rounded-xl hover:bg-clay-100 transition-colors">
                <Bell size={20} className="text-clay-600" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-laterite-500 rounded-full"></span>
              </button>
              <div className="w-9 h-9 rounded-full bg-forest-600 flex items-center justify-center text-white text-sm font-semibold">A</div>
            </div>
          </div>
        </header>

        <div className="p-6 lg:p-8">
          {/* Page header */}
          <div className="mb-8">
            <h1 className="font-display text-3xl text-clay-900 mb-1">Dashboard</h1>
            <p className="text-clay-500">Welcome back. Here's what's happening today.</p>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
            {stats.map((s, i) => (
              <div
                key={s.title}
                className="card-elevated p-6 animate-fade-up"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-11 h-11 rounded-xl ${s.accent} flex items-center justify-center`}>
                    <s.icon size={20} />
                  </div>
                  <div
                    className={`flex items-center gap-1 text-xs font-semibold ${
                      s.trend === 'up' ? 'text-forest-600' : 'text-laterite-600'
                    }`}
                  >
                    {s.trend === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                    {s.change}
                  </div>
                </div>
                <p className="text-2xl font-bold text-clay-900 mb-1">
                  {s.value}
                  {s.suffix && <span className="text-sm font-medium text-clay-400 ml-1">{s.suffix}</span>}
                </p>
                <p className="text-sm text-clay-500">{s.title}</p>
                <div className={`absolute top-0 right-0 w-24 h-24 rounded-full ${s.dot} opacity-[0.03] -translate-y-1/2 translate-x-1/2`}></div>
              </div>
            ))}
          </div>

          {/* Two column layout */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Recent Activity */}
            <div className="xl:col-span-2 card-elevated">
              <div className="p-6 border-b border-clay-100">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-xl text-clay-900">Recent Activity</h2>
                  <a href="#" className="text-sm font-medium text-forest-600 hover:text-forest-700">View all</a>
                </div>
              </div>
              <div className="divide-y divide-clay-50">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="p-4 flex items-center gap-4 hover:bg-clay-50/50 transition-colors">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                        activity.status === 'success'
                          ? 'bg-forest-100 text-forest-600'
                          : activity.status === 'warning'
                          ? 'bg-savanna-100 text-savanna-600'
                          : activity.status === 'error'
                          ? 'bg-laterite-100 text-laterite-600'
                          : 'bg-clay-100 text-clay-600'
                      }`}
                    >
                      {activity.status === 'success' && <DollarSign size={16} />}
                      {activity.status === 'warning' && <Star size={16} />}
                      {activity.status === 'error' && <Shield size={16} />}
                      {activity.status === 'info' && <Activity size={16} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-clay-900 truncate">{activity.user}</p>
                      <p className="text-xs text-clay-500">{activity.action}</p>
                    </div>
                    <div className="text-right shrink-0">
                      {activity.amount && (
                        <p className="text-sm font-semibold text-clay-900">{activity.amount}</p>
                      )}
                      <p className="text-xs text-clay-400 flex items-center gap-1">
                        <Clock size={12} />{activity.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pending Verifications */}
            <div className="card-elevated">
              <div className="p-6 border-b border-clay-100">
                <h2 className="font-display text-xl text-clay-900">Pending Verifications</h2>
              </div>
              <div className="p-4 space-y-4">
                {pendingVerifications.map((provider) => (
                  <div key={provider.name} className="bg-clay-50 rounded-xl p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold text-clay-900">{provider.name}</p>
                        <p className="text-xs text-clay-500">{provider.service}</p>
                      </div>
                      <span className="text-xs bg-savanna-100 text-savanna-700 px-2 py-1 rounded-lg font-medium">{provider.submitted}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-clay-500 mb-3">
                      <span className="flex items-center gap-1">
                        <MapPin size={12} />{provider.location}
                      </span>
                      {provider.rating > 0 && (
                        <span className="flex items-center gap-1">
                          <Star size={12} className="text-savanna-500" />{provider.rating}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button className="flex-1 bg-forest-700 text-white py-2 rounded-lg text-sm font-medium hover:bg-forest-800 transition-colors">
                        Approve
                      </button>
                      <button className="flex-1 bg-white border border-clay-200 text-clay-600 py-2 rounded-lg text-sm font-medium hover:bg-clay-50 transition-colors">
                        Review
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
