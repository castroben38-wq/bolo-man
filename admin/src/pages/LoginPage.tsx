export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background with organic shapes */}
      <div className="absolute inset-0 bg-clay-900">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-laterite-700/30 blur-3xl"></div>
        <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-forest-800/20 blur-3xl"></div>
        <div className="absolute top-[40%] left-[60%] w-[300px] h-[300px] rounded-full bg-savanna-600/10 blur-2xl"></div>
      </div>

      {/* Decorative pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative z-10 w-full max-w-md px-6">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-forest-500 to-forest-700 shadow-xl shadow-forest-700/30 mb-6">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M16 2L4 9v14l12 7 12-7V9L16 2z" stroke="white" strokeWidth="2" fill="none"/>
              <circle cx="16" cy="17" r="4" fill="white"/>
            </svg>
          </div>
          <h1 className="font-display text-4xl text-white mb-2">Bolo-Man</h1>
          <p className="text-clay-400 text-sm tracking-wide">Administration Console</p>
        </div>

        <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-8 shadow-2xl shadow-black/20">
          <div className="mb-6">
            <label className="block text-xs font-semibold text-clay-500 uppercase tracking-wider mb-2">Email</label>
            <input
              type="email"
              placeholder="admin@boloman.cm"
              className="w-full px-4 py-3.5 bg-clay-50 border-0 rounded-xl text-clay-800 placeholder-clay-400 focus:ring-2 focus:ring-forest-500 focus:bg-white transition-all duration-200"
            />
          </div>

          <div className="mb-8">
            <label className="block text-xs font-semibold text-clay-500 uppercase tracking-wider mb-2">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              className="w-full px-4 py-3.5 bg-clay-50 border-0 rounded-xl text-clay-800 placeholder-clay-400 focus:ring-2 focus:ring-forest-500 focus:bg-white transition-all duration-200"
            />
          </div>

          <button className="w-full bg-forest-700 text-white py-4 rounded-xl font-semibold hover:bg-forest-800 active:scale-[0.98] transition-all duration-200 shadow-lg shadow-forest-700/25">
            Sign In
          </button>

          <div className="mt-6 text-center">
            <a href="#" className="text-sm text-laterite-600 hover:text-laterite-700 font-medium transition-colors">
              Forgot password?
            </a>
          </div>
        </div>

        <p className="text-center text-clay-500 text-xs mt-8">
          Secured with 256-bit encryption
        </p>
      </div>
    </div>
  );
}
