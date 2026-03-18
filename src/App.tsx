import React, { useState, useEffect, useMemo, Component } from 'react';
import { 
  CandlestickChart, 
  Briefcase, 
  ReceiptText, 
  User, 
  Home, 
  Trophy, 
  Search, 
  Bell, 
  TrendingUp, 
  TrendingDown,
  ChevronRight,
  Plus,
  Minus,
  ArrowUp,
  ArrowDown,
  LayoutDashboard,
  Wallet,
  Menu,
  ShieldCheck,
  Users,
  BarChart3,
  PieChart,
  Activity,
  Filter,
  ArrowRightLeft,
  Settings,
  Save,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { io } from 'socket.io-client';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  onSnapshot, 
  query, 
  where, 
  addDoc, 
  updateDoc,
  deleteDoc,
  Timestamp,
  getDocs,
  orderBy,
  limit
} from 'firebase/firestore';
import { NavItem, Trade, Plan, OptionData, Portfolio, Account, Client, Rule } from './types';

// --- Components ---

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let displayMessage = "Something went wrong.";
      try {
        const errObj = JSON.parse(this.state.error.message);
        if (errObj.error.includes("Missing or insufficient permissions")) {
          displayMessage = "You don't have permission to perform this action. Please check your account status.";
        }
      } catch (e) {
        // Not a JSON error
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-slate-50 dark:bg-[#160d08] text-center">
          <div className="bg-red-500/10 p-6 rounded-3xl border border-red-500/20 max-w-md">
            <ShieldCheck className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Application Error</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
              {displayMessage}
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-primary text-white font-bold rounded-2xl hover:opacity-90 transition-all"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
const OPTION_CHAIN_DATA: OptionData[] = [
  { strike: 22300, ce_oi: 45000, ce_oi_change: 1200, ce_ltp: 285.40, pe_ltp: 42.15, pe_oi_change: -450, pe_oi: 12000 },
  { strike: 22350, ce_oi: 32000, ce_oi_change: 800, ce_ltp: 242.10, pe_ltp: 58.30, pe_oi_change: -200, pe_oi: 15000 },
  { strike: 22400, ce_oi: 85000, ce_oi_change: 5400, ce_ltp: 198.50, pe_ltp: 76.45, pe_oi_change: 1200, pe_oi: 45000 },
  { strike: 22450, ce_oi: 125000, ce_oi_change: 12000, ce_ltp: 145.20, pe_ltp: 112.45, pe_oi_change: 4500, pe_oi: 85000 },
  { strike: 22500, ce_oi: 245000, ce_oi_change: 45000, ce_ltp: 98.30, pe_ltp: 165.20, pe_oi_change: 12000, pe_oi: 145000 },
  { strike: 22550, ce_oi: 185000, ce_oi_change: 22000, ce_ltp: 62.45, pe_ltp: 212.10, pe_oi_change: 8500, pe_oi: 98000 },
  { strike: 22600, ce_oi: 145000, ce_oi_change: 15000, ce_ltp: 38.20, pe_ltp: 265.40, pe_oi_change: 5400, pe_oi: 72000 },
];
const RECENT_TRADES: Trade[] = [
  {
    id: '1',
    symbol: 'RELIANCE',
    type: 'BUY',
    optionType: 'CE',
    strike: 22400,
    price: 145.20,
    qty: 50,
    time: '24 Oct, 10:30 AM',
    status: 'Closed',
    pnl: 4500
  },
  {
    id: '2',
    symbol: 'HDFCBANK',
    type: 'SELL',
    optionType: 'PE',
    strike: 22500,
    price: 112.45,
    qty: 100,
    time: '23 Oct, 02:15 PM',
    status: 'Closed',
    pnl: -1200
  }
];

// --- Components ---

const Header = ({ activeTab, onBack, isSubView, onLogout }: { activeTab: string, onBack?: () => void, isSubView?: boolean, onLogout?: () => void }) => {
  return (
    <header className="sticky top-0 z-50 bg-white/80 dark:bg-[#160d08]/80 backdrop-blur-md border-b border-slate-200 dark:border-white/10 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        {isSubView ? (
          <button onClick={onBack} className="p-1 -ml-1 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors">
            <ArrowDown className="w-6 h-6 rotate-90" />
          </button>
        ) : activeTab === 'trade' ? (
          <Menu className="text-primary w-6 h-6" />
        ) : (
          <div className="bg-primary/10 p-1.5 rounded-lg">
            <TrendingUp className="text-primary w-5 h-5" />
          </div>
        )}
        <h1 className="text-xl font-bold tracking-tight">
          {isSubView ? 'Option Chain' : 'IndiFunded'}
        </h1>
        {!isSubView && activeTab === 'trade' && (
          <span className="bg-slate-100 dark:bg-white/5 text-[10px] font-bold px-2 py-0.5 rounded-full text-slate-500 flex items-center gap-1">
            <div className="w-1 h-1 rounded-full bg-emerald-500" />
            SIMULATED
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        {onLogout && (
          <button onClick={onLogout} className="p-2 rounded-full bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400">
            <User className="w-5 h-5" />
          </button>
        )}
        <button className="p-2 rounded-full bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 relative">
          <Bell className="w-5 h-5" />
          <div className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full border-2 border-white dark:border-[#160d08]" />
        </button>
      </div>
    </header>
  );
};

const AuthView = ({ onAuthSuccess }: { onAuthSuccess: () => void }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        // Create user profile in Firestore
        try {
          await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            name: name || email.split('@')[0],
            email: email,
            balance: 0, // Start with 0 balance
            initial_balance: 0,
            role: 'user',
            createdAt: new Date().toISOString()
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
        }
      }
      onAuthSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    setError('');
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Check if user profile exists, if not create it
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        try {
          await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            name: user.displayName || user.email?.split('@')[0] || 'Trader',
            email: user.email,
            balance: 0,
            initial_balance: 0,
            role: 'user',
            createdAt: new Date().toISOString()
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
        }
      }
      onAuthSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <div className="inline-flex p-4 rounded-3xl bg-primary/10 mb-4">
            <TrendingUp className="w-12 h-12 text-primary" />
          </div>
          <h2 className="text-3xl font-black tracking-tight">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-slate-400 font-bold text-sm mt-2 uppercase tracking-widest">
            {isLogin ? 'Sign in to your trading account' : 'Join the elite trading community'}
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleGoogleAuth}
            disabled={loading}
            className="w-full py-4 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-200 font-bold rounded-2xl flex items-center justify-center gap-3 hover:bg-slate-50 dark:hover:bg-white/10 transition-all disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.67-.35-1.39-.35-2.09s.13-1.42.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-bold">
              <span className="bg-white dark:bg-[#160d08] px-4 text-slate-400">Or email</span>
            </div>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-xs font-bold">
              {error}
            </div>
          )}
          {!isLogin && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase ml-4">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="w-full px-6 py-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-sm focus:outline-none focus:border-primary transition-all"
                required
              />
            </div>
          )}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase ml-4">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full px-6 py-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-sm focus:outline-none focus:border-primary transition-all"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase ml-4">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-6 py-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-sm focus:outline-none focus:border-primary transition-all"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-5 bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/20 active:scale-95 transition-all disabled:opacity-50"
          >
            {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-xs font-bold text-slate-400 hover:text-primary transition-colors uppercase tracking-widest"
          >
            {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
          </button>
        </div>
      </div>
    </div>
  </div>
  );
};

const CandleChart = ({ 
  data, 
  height = 200,
  openPositions = [],
  symbol = '',
  strike = 0
}: { 
  data: any[], 
  height?: number,
  openPositions?: Trade[],
  symbol?: string,
  strike?: number
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 text-[10px] uppercase font-bold tracking-widest">
        No Data Available
      </div>
    );
  }

  const maxPrice = Math.max(...data.map(d => d.high));
  const minPrice = Math.min(...data.map(d => d.low));
  const range = maxPrice - minPrice;
  const padding = range * 0.1;
  const displayMin = minPrice - padding;
  const displayMax = maxPrice + padding;
  const displayRange = displayMax - displayMin;

  const getY = (price: number) => height - ((price - displayMin) / displayRange) * height;

  const handleMouseMove = (e: React.MouseEvent, index: number) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    setHoveredIndex(index);
  };

  // Find position related to this symbol and strike
  const relevantPositions = openPositions.filter(p => p.symbol === symbol && p.strike === strike);
  const totalPnL = relevantPositions.reduce((sum, p) => sum + p.pnl, 0);

  return (
    <div className="relative w-full h-full group">
      <svg 
        className="w-full h-full" 
        viewBox={`0 0 ${data.length * 20} ${height}`} 
        preserveAspectRatio="none"
        onMouseLeave={() => setHoveredIndex(null)}
      >
        {data.map((d, i) => {
          const x = i * 20 + 10;
          const isUp = d.close >= d.open;
          const color = isUp ? '#22c55e' : '#ef4444';
          
          return (
            <g 
              key={i}
              onMouseEnter={(e) => handleMouseMove(e, i)}
              onMouseMove={(e) => handleMouseMove(e, i)}
              className="cursor-crosshair"
            >
              {/* Invisible hit area for better hover */}
              <rect 
                x={x - 10} 
                y={0} 
                width="20" 
                height={height} 
                fill="transparent" 
              />
              {/* Wick */}
              <line 
                x1={x} y1={getY(d.high)} 
                x2={x} y2={getY(d.low)} 
                stroke={color} 
                strokeWidth="1" 
                className="transition-all duration-200"
                strokeOpacity={hoveredIndex === null || hoveredIndex === i ? 1 : 0.3}
              />
              {/* Body */}
              <rect 
                x={x - 6} 
                y={getY(Math.max(d.open, d.close))} 
                width="12" 
                height={Math.max(1, Math.abs(getY(d.open) - getY(d.close)))} 
                fill={color}
                rx="1"
                className="transition-all duration-200"
                fillOpacity={hoveredIndex === null || hoveredIndex === i ? 1 : 0.3}
              />
            </g>
          );
        })}
      </svg>

      {/* Tooltip */}
      <AnimatePresence>
        {hoveredIndex !== null && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute z-50 pointer-events-none bg-slate-900/90 backdrop-blur-md border border-white/10 p-3 rounded-xl shadow-2xl text-[10px] min-w-[120px]"
            style={{ 
              left: Math.min(mousePos.x + 15, 250), 
              top: Math.max(mousePos.y - 100, 10) 
            }}
          >
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <span className="text-slate-400 uppercase font-bold">Open</span>
              <span className="text-white font-bold text-right">₹{data[hoveredIndex].open.toFixed(2)}</span>
              <span className="text-slate-400 uppercase font-bold">High</span>
              <span className="text-white font-bold text-right">₹{data[hoveredIndex].high.toFixed(2)}</span>
              <span className="text-slate-400 uppercase font-bold">Low</span>
              <span className="text-white font-bold text-right">₹{data[hoveredIndex].low.toFixed(2)}</span>
              <span className="text-slate-400 uppercase font-bold">Close</span>
              <span className="text-white font-bold text-right">₹{data[hoveredIndex].close.toFixed(2)}</span>
              
              {relevantPositions.length > 0 && (
                <>
                  <div className="col-span-2 my-1 border-t border-white/10" />
                  <span className="text-slate-400 uppercase font-bold">Position PnL</span>
                  <span className={`font-bold text-right ${totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    ₹{totalPnL.toLocaleString('en-IN')}
                  </span>
                </>
              )}

              <div className="col-span-2 border-t border-white/5 my-1" />
              <span className="text-slate-400 uppercase font-bold">Volume</span>
              <span className="text-accent-neon font-bold text-right">{data[hoveredIndex].volume.toLocaleString()}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const PerformanceChart = ({ trades, height = 160 }: { trades: Trade[], height?: number }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const data = useMemo(() => {
    const closedTrades = trades.filter(t => t.status === 'Closed');
    if (closedTrades.length === 0) {
      return [
        { date: 'Start', value: 100, pnl: 0 },
        { date: 'Now', value: 100, pnl: 0 }
      ];
    }
    
    const sorted = [...closedTrades].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
    
    let cumulativePnl = 0;
    const points = sorted.map(t => {
      cumulativePnl += t.pnl || 0;
      return {
        date: new Date(t.time).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
        pnl: cumulativePnl,
        value: 0
      };
    });

    // Add a starting point
    const allPoints = [{ date: 'Initial', pnl: 0, value: 0 }, ...points];

    const pnls = allPoints.map(p => p.pnl);
    const minPnl = Math.min(0, ...pnls);
    const maxPnl = Math.max(1, ...pnls);
    const range = maxPnl - minPnl;

    return allPoints.map(p => ({
      ...p,
      value: 100 - ((p.pnl - minPnl) / (range || 1)) * 100
    }));
  }, [trades]);

  const pointsStr = data.map((d, i) => `${(i / (data.length - 1)) * 100},${d.value}`).join(' ');
  const areaPoints = `0,100 ${pointsStr} 100,100`;

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const index = Math.round((x / rect.width) * (data.length - 1));
    setHoveredIndex(index);
    setMousePos({ x, y: e.clientY - rect.top });
  };

  return (
    <div className="relative w-full group" style={{ height }}>
      <svg 
        className="w-full h-full" 
        preserveAspectRatio="none" 
        viewBox="0 0 100 100"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredIndex(null)}
      >
        <defs>
          <linearGradient id="performanceGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
        </defs>
        <polyline
          points={pointsStr}
          fill="none"
          stroke="#22c55e"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
        <polygon
          points={areaPoints}
          fill="url(#performanceGrad)"
          opacity="0.1"
        />
        
        {hoveredIndex !== null && (
          <line
            x1={(hoveredIndex / (data.length - 1)) * 100}
            y1="0"
            x2={(hoveredIndex / (data.length - 1)) * 100}
            y2="100"
            stroke="rgba(255,255,255,0.2)"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>

      <AnimatePresence>
        {hoveredIndex !== null && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute z-50 pointer-events-none bg-slate-900/90 backdrop-blur-md border border-white/10 p-2 rounded-lg shadow-xl text-[10px] min-w-[80px]"
            style={{ 
              left: Math.min(mousePos.x + 10, 300), 
              top: Math.max(mousePos.y - 40, 0)
            }}
          >
            <div className="flex flex-col gap-0.5">
              <span className="text-slate-400 font-bold uppercase">{data[hoveredIndex].date}</span>
              <span className={`font-bold ${data[hoveredIndex].pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {data[hoveredIndex].pnl >= 0 ? '+' : ''}₹{data[hoveredIndex].pnl.toLocaleString('en-IN')}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const TradeView = ({ 
  onViewOptionChain, 
  price, 
  change, 
  timestamp,
  optionChain,
  selectedSymbol,
  onSymbolChange,
  selectedStrike,
  onStrikeChange,
  onTrade,
  openPositions = []
}: { 
  onViewOptionChain: () => void, 
  price: number, 
  change: number,
  timestamp: string,
  optionChain: any[],
  selectedSymbol: string,
  onSymbolChange: (symbol: string) => void,
  selectedStrike: number,
  onStrikeChange: (strike: number) => void,
  onTrade: (type: 'BUY' | 'SELL', strike: number, price: number) => void,
  openPositions?: Trade[]
}) => {
  const [candles, setCandles] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Fetch history on symbol change
  useEffect(() => {
    const fetchHistory = async () => {
      setIsLoadingHistory(true);
      try {
        const response = await fetch(`/api/market/history/${encodeURIComponent(selectedSymbol)}`);
        if (response.ok) {
          const data = await response.json();
          setCandles(data);
        }
      } catch (err) {
        console.error('Failed to fetch history:', err);
      } finally {
        setIsLoadingHistory(false);
      }
    };
    fetchHistory();
  }, [selectedSymbol]);

  // Update last candle with live price
  useEffect(() => {
    if (candles.length === 0 || !price) return;

    setCandles(prev => {
      const last = prev[prev.length - 1];
      if (!last) return prev;

      // If price is significantly different or it's a new minute, we might want a new candle
      // But for simplicity, we just update the last candle's close and high/low
      const updatedLast = {
        ...last,
        close: price,
        high: Math.max(last.high, price),
        low: Math.min(last.low, price)
      };

      return [...prev.slice(0, -1), updatedLast];
    });
  }, [price]);

  useEffect(() => {
    if (optionChain.length > 0 && selectedStrike === 0) {
      const atm = optionChain.reduce((prev, curr) => 
        Math.abs(curr.strike - price) < Math.abs(prev.strike - price) ? curr : prev
      );
      onStrikeChange(atm.strike);
    }
  }, [optionChain, price, selectedStrike, onStrikeChange]);

  const selectedStrikeData = optionChain.find(s => s.strike === selectedStrike);

  return (
    <div className="flex flex-col gap-4 p-4 pb-48">
      <div className="flex gap-2 overflow-x-auto hide-scrollbar">
        {['Nifty 50', 'Bank Nifty', 'Fin Nifty', 'Midcap Nifty'].map((idx) => (
          <button 
            key={idx}
            onClick={() => {
              onSymbolChange(idx);
            }}
            className={`px-4 py-2 rounded-xl whitespace-nowrap text-sm font-bold transition-all ${
              selectedSymbol === idx ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-500'
            }`}
          >
            {idx}
          </button>
        ))}
      </div>

      <div className="flex border-b border-slate-200 dark:border-white/5">
        {['1m', '5m', '15m', '1h', '1D'].map((tf, i) => (
          <button 
            key={tf}
            className={`flex-1 py-3 text-xs font-bold transition-all ${
              i === 1 ? 'text-primary border-b-2 border-primary' : 'text-slate-400'
            }`}
          >
            {tf}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[8px] font-black text-emerald-500 uppercase tracking-wider">Live</span>
          </div>
          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">As of {timestamp || '--:--:--'} IST</p>
        </div>
        <div className="flex items-baseline gap-2">
          <h2 className="text-3xl font-bold tracking-tighter">{(price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h2>
          <span className={`font-bold flex items-center text-sm ${(change || 0) >= 0 ? 'text-trading-up' : 'text-trading-down'}`}>
            {(change || 0) >= 0 ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
            {Math.abs(change || 0).toFixed(2)} ({((change || 0) / (price || 1) * 100).toFixed(2)}%)
          </span>
        </div>
      </div>

      {/* Candlestick Chart */}
      <div className="relative w-full h-64 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden p-4">
        {isLoadingHistory ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-black/20 backdrop-blur-sm z-10">
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Loading Chart...</span>
            </div>
          </div>
        ) : null}
        <div className="absolute inset-0 grid grid-cols-6 grid-rows-4 opacity-10 pointer-events-none">
          {[...Array(24)].map((_, i) => <div key={i} className="border-r border-b border-slate-400" />)}
        </div>
        <CandleChart 
          data={candles.slice(-30)} 
          height={200} 
          openPositions={openPositions}
          symbol={selectedSymbol}
          strike={selectedStrike}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 bg-primary text-white text-[10px] px-1.5 py-0.5 rounded font-bold shadow-lg z-20">
          {(price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </div>
      </div>

      <button 
        onClick={onViewOptionChain}
        className="w-full flex items-center justify-between p-4 bg-slate-100 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10"
      >
        <div className="flex items-center gap-3">
          <ReceiptText className="text-primary w-5 h-5" />
          <span className="font-bold">View Option Chain</span>
        </div>
        <div className="flex items-center gap-1 text-slate-400">
          <span className="text-[10px] uppercase font-bold">28 Mar Expiry</span>
          <ChevronRight className="w-4 h-4" />
        </div>
      </button>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
          <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">PCR Ratio</p>
          <p className="text-lg font-bold">0.92</p>
          <p className="text-[10px] text-trading-down font-bold">Bearish</p>
        </div>
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
          <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">India VIX</p>
          <p className="text-lg font-bold">14.22</p>
          <p className="text-[10px] text-trading-up font-bold">+2.4%</p>
        </div>
      </div>

      {/* Floating Action Bar */}
      <div className="fixed bottom-[72px] left-0 right-0 max-w-md mx-auto z-40 bg-white dark:bg-[#160d08] border-t border-slate-200 dark:border-white/10 p-4 space-y-4 shadow-[0_-10px_30px_rgba(0,0,0,0.1)]">
        <div className="space-y-2">
          <div className="flex justify-between items-center text-[10px] font-bold uppercase text-slate-400">
            <span>Select Strike Price</span>
            <span className="text-primary">{selectedStrike.toLocaleString()} CE</span>
          </div>
          <div className="relative w-full h-12 bg-slate-100 dark:bg-white/5 rounded-full flex items-center px-1 overflow-x-auto hide-scrollbar">
            {optionChain.map((s) => (
              <button
                key={s.strike}
                onClick={() => onStrikeChange(s.strike)}
                className={`flex-1 min-w-[60px] h-10 rounded-full text-[10px] font-bold transition-all ${
                  selectedStrike === s.strike ? 'bg-primary text-white shadow-lg scale-110 z-10' : 'text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'
                }`}
              >
                {s.strike}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => onTrade('BUY', selectedStrike, selectedStrikeData?.ce_ltp || 0)}
            disabled={!selectedStrikeData}
            className="flex-1 bg-trading-up hover:bg-emerald-600 disabled:opacity-50 text-white font-bold py-4 rounded-2xl flex flex-col items-center justify-center shadow-lg shadow-emerald-900/20 transition-transform active:scale-95"
          >
            <span className="text-lg">BUY</span>
            <span className="text-[10px] opacity-80">LTP: ₹{selectedStrikeData?.ce_ltp?.toFixed(2) || '0.00'}</span>
          </button>
          <button 
            onClick={() => onTrade('SELL', selectedStrike, selectedStrikeData?.pe_ltp || 0)}
            disabled={!selectedStrikeData}
            className="flex-1 bg-trading-down hover:bg-red-600 disabled:opacity-50 text-white font-bold py-4 rounded-2xl flex flex-col items-center justify-center shadow-lg shadow-red-900/20 transition-transform active:scale-95"
          >
            <span className="text-lg">SELL</span>
            <span className="text-[10px] opacity-80">LTP: ₹{selectedStrikeData?.pe_ltp?.toFixed(2) || '0.00'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const OptionChainView = ({ symbol, optionChain, spotPrice, onSelectStrike }: { symbol: string, optionChain: any[], spotPrice: number, onSelectStrike: (strike: number) => void }) => {
  const maxOI = Math.max(...optionChain.map(d => Math.max(d.ce_oi, d.pe_oi)));

  return (
    <div className="flex flex-col gap-4 p-4 pb-24">
      <div className="flex items-center justify-between bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-200 dark:border-white/10">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-slate-400 uppercase">{symbol} Spot</span>
          <span className="text-lg font-bold">{(spotPrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[10px] font-bold text-slate-400 uppercase">PCR</span>
          <span className="text-lg font-bold">0.92</span>
        </div>
      </div>

      {/* OI Chart visualization */}
      <div className="p-4 bg-white dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
        <h3 className="text-sm font-bold mb-4">OI Distribution</h3>
        <div className="space-y-3">
          {optionChain.map(data => (
            <div key={data.strike} className="flex items-center gap-2">
              <div className="flex-1 flex justify-end">
                <div 
                  className="h-3 bg-red-500/30 rounded-l-sm" 
                  style={{ width: `${(data.pe_oi / maxOI) * 100}%` }}
                />
              </div>
              <span className="w-12 text-center text-[10px] font-bold text-slate-400">{data.strike}</span>
              <div className="flex-1">
                <div 
                  className="h-3 bg-emerald-500/30 rounded-r-sm" 
                  style={{ width: `${(data.ce_oi / maxOI) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-4 text-[10px] font-bold uppercase">
          <span className="text-red-500">PUT OI</span>
          <span className="text-emerald-500">CALL OI</span>
        </div>
      </div>

      <div className="overflow-x-auto -mx-4 px-4">
        <table className="w-full text-[10px] border-collapse">
          <thead>
            <tr className="bg-slate-100 dark:bg-white/5 text-slate-400 uppercase font-bold">
              <th className="p-2 text-left border-b border-slate-200 dark:border-white/10">OI</th>
              <th className="p-2 text-left border-b border-slate-200 dark:border-white/10">LTP</th>
              <th className="p-2 text-center border-b border-slate-200 dark:border-white/10 bg-slate-200/50 dark:bg-white/10">Strike</th>
              <th className="p-2 text-right border-b border-slate-200 dark:border-white/10">LTP</th>
              <th className="p-2 text-right border-b border-slate-200 dark:border-white/10">OI</th>
            </tr>
          </thead>
          <tbody>
            {optionChain.map(data => (
              <tr 
                key={data.strike} 
                onClick={() => onSelectStrike(data.strike)}
                className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                <td className="p-2 text-slate-500">{(data.ce_oi / 1000).toFixed(1)}k</td>
                <td className="p-2 font-bold text-emerald-500">{data.ce_ltp.toFixed(2)}</td>
                <td className="p-2 text-center font-black bg-slate-50 dark:bg-white/5">{data.strike}</td>
                <td className="p-2 text-right font-bold text-red-500">{data.pe_ltp.toFixed(2)}</td>
                <td className="p-2 text-right text-slate-500">{(data.pe_oi / 1000).toFixed(1)}k</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const PortfolioView = ({ portfolio, onClosePosition, userId, allTrades }: { portfolio: Portfolio | null, onClosePosition: (id: string) => void, userId: string, allTrades: Trade[] }) => {
  const [recentTrades, setRecentTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'trades'), 
      where('userId', '==', userId), 
      where('status', '==', 'Closed'),
      orderBy('time', 'desc'),
      limit(5)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const trades = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Trade));
      setRecentTrades(trades);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [userId]);

  if (!portfolio) return <div className="p-8 text-center text-slate-400 font-bold">Loading Portfolio...</div>;

  return (
    <div className="flex flex-col gap-6 p-4 pb-24">
      <div className="rounded-3xl bg-slate-50 dark:bg-white/5 p-6 border border-slate-200 dark:border-white/10 shadow-sm">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Current Equity</p>
        <div className="flex items-baseline gap-3 mb-6">
          <p className="text-4xl font-bold">₹{portfolio.equity.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
          <p className={`text-sm font-bold ${portfolio.unrealizedPnl >= 0 ? 'text-trading-up' : 'text-trading-down'}`}>
            {portfolio.unrealizedPnl >= 0 ? '+' : ''}{((portfolio.unrealizedPnl / portfolio.balance) * 100).toFixed(2)}%
          </p>
        </div>
        <div className="flex gap-4 border-t border-slate-200 dark:border-white/10 pt-6">
          <div className="flex-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Available Balance</p>
            <p className="text-sm font-bold mt-1">₹{portfolio.balance.toLocaleString('en-IN')}</p>
          </div>
          <div className="w-px bg-slate-200 dark:bg-white/10" />
          <div className="flex-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Unrealized P&L</p>
            <p className={`text-sm font-bold mt-1 ${portfolio.unrealizedPnl >= 0 ? 'text-trading-up' : 'text-trading-down'}`}>
              {portfolio.unrealizedPnl >= 0 ? '+' : ''}₹{portfolio.unrealizedPnl.toLocaleString('en-IN')}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-bold">Open Positions ({portfolio.positions.length})</h3>
        <div className="flex flex-col gap-3">
          {portfolio.positions.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 dark:bg-white/5 rounded-2xl border border-dashed border-slate-300 dark:border-white/10 text-slate-400 font-bold">
              No open positions
            </div>
          ) : (
            portfolio.positions.map(trade => (
              <div key={trade.id} className="flex flex-col gap-3 rounded-2xl bg-white dark:bg-white/5 p-4 border border-slate-200 dark:border-white/10 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`px-2 py-1 rounded text-[10px] font-black ${trade.type === 'BUY' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                      {trade.type}
                    </div>
                    <span className="font-bold text-sm">{trade.symbol} {trade.strike} {trade.optionType}</span>
                  </div>
                  <button 
                    onClick={() => onClosePosition(trade.id)}
                    className="text-[10px] font-bold text-primary uppercase hover:underline"
                  >
                    Close
                  </button>
                </div>
                <div className="flex justify-between items-end">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">
                    Avg: ₹{trade.price.toFixed(2)} • Qty: {trade.qty}
                  </div>
                  <div className={`text-sm font-bold ${trade.pnl >= 0 ? 'text-trading-up' : 'text-trading-down'}`}>
                    {trade.pnl >= 0 ? '+' : ''}₹{trade.pnl.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <p className="text-base font-bold">Performance</p>
          <div className="flex gap-3 text-[10px] font-bold uppercase">
            {['1D', '1W', '1M', '3M', '1Y'].map((tf, i) => (
              <span key={tf} className={i === 2 ? 'text-primary' : 'text-slate-400'}>{tf}</span>
            ))}
          </div>
        </div>
        <div className="h-40 relative">
          <PerformanceChart trades={allTrades} />
        </div>
        <div className="flex justify-between mt-4 text-[10px] font-bold text-slate-400 uppercase">
          <span>10 Oct</span>
          <span>20 Oct</span>
          <span>30 Oct</span>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-bold">Statistics</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Win Rate', value: `${(portfolio.stats?.winRate || 0).toFixed(1)}%` },
            { label: 'Profit Factor', value: (portfolio.stats?.profitFactor || 0).toFixed(2) },
            { label: 'Avg. Win', value: `+₹${(portfolio.stats?.avgWin || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, color: 'text-trading-up' },
            { label: 'Avg. Loss', value: `-₹${(portfolio.stats?.avgLoss || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, color: 'text-trading-down' },
          ].map(stat => (
            <div key={stat.label} className="rounded-2xl bg-slate-50 dark:bg-white/5 p-4 border border-slate-200 dark:border-white/10">
              <p className="text-[10px] font-bold text-slate-400 uppercase">{stat.label}</p>
              <p className={`text-lg font-bold mt-1 ${stat.color || ''}`}>{stat.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-bold">Recent Trades</h3>
        <div className="flex flex-col gap-3">
          {loading ? (
            <div className="p-4 text-center text-slate-400 text-xs font-bold">Loading history...</div>
          ) : recentTrades.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 dark:bg-white/5 rounded-2xl border border-dashed border-slate-300 dark:border-white/10 text-slate-400 font-bold">
              No recent trades
            </div>
          ) : (
            recentTrades.map(trade => (
              <div key={trade.id} className="flex items-center justify-between rounded-2xl bg-white dark:bg-white/5 p-4 border border-slate-200 dark:border-white/10 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                    trade.pnl >= 0 ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600' : 'bg-red-50 dark:bg-red-500/10 text-red-600'
                  }`}>
                    {trade.symbol[0]}
                  </div>
                  <div>
                    <p className="text-sm font-bold">{trade.symbol}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">{trade.time} • Qty: {trade.qty}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${trade.pnl >= 0 ? 'text-trading-up' : 'text-trading-down'}`}>
                    {trade.pnl >= 0 ? '+' : ''}₹{Math.abs(trade.pnl).toLocaleString('en-IN')}
                  </p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">{trade.status}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const ChallengesView = ({ onSelectPlan, plans, rules }: { onSelectPlan: (plan: Plan) => void, plans: Plan[], rules: Rule[] }) => {
  return (
    <div className="flex flex-col gap-6 p-4 pb-24">
      <div className="space-y-6">
        {(plans || []).map(plan => (
          <div 
            key={plan.id} 
            className={`relative p-6 rounded-3xl border-2 transition-all ${
              plan.recommended 
                ? 'bg-white dark:bg-white/5 border-primary shadow-xl shadow-primary/5' 
                : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10'
            }`}
          >
            {plan.tag && (
              <div className="absolute -top-3 right-6 bg-primary text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                {plan.tag}
              </div>
            )}
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-lg font-bold">{plan.name}</h3>
                <p className="text-3xl font-black text-primary">₹{plan.price.toLocaleString('en-IN')}</p>
              </div>
              {plan.recommended && (
                <span className="px-3 py-1 bg-accent-neon/10 text-accent-neon text-[10px] font-black rounded-full uppercase tracking-wider">
                  Recommended
                </span>
              )}
            </div>
            <div className="space-y-4 mb-8">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-400 uppercase">Virtual Capital</span>
                <span>₹{plan.capital.toLocaleString('en-IN')}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 py-4 border-y border-slate-200 dark:border-white/10">
                <div className="text-center">
                  <p className="text-[10px] uppercase text-slate-400 font-bold mb-1">Profit</p>
                  <p className="font-bold text-accent-neon">{plan.profit_target}%</p>
                </div>
                <div className="text-center border-x border-slate-200 dark:border-white/10">
                  <p className="text-[10px] uppercase text-slate-400 font-bold mb-1">Max DD</p>
                  <p className="font-bold text-trading-down">{plan.max_dd}%</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] uppercase text-slate-400 font-bold mb-1">Daily DD</p>
                  <p className="font-bold text-red-400">{plan.daily_dd}%</p>
                </div>
              </div>
            </div>
            <button 
              onClick={() => onSelectPlan(plan)}
              className={`w-full py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 ${
                plan.recommended 
                  ? 'bg-accent-neon text-black shadow-lg shadow-accent-neon/20' 
                  : 'bg-primary text-white'
              }`}
            >
              Select {plan.name.split(' ')[0]} {plan.recommended ? <Trophy className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <ReceiptText className="text-accent-neon w-5 h-5" />
          Rules FAQ
        </h2>
        <div className="space-y-2">
          {(rules || []).map((rule, i) => (
            <details key={rule.id} className="group bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden">
              <summary className="flex items-center justify-between p-4 cursor-pointer font-bold text-sm list-none">
                <span className="group-open:text-primary transition-colors">{rule.name}</span>
                <ChevronRight className="w-4 h-4 text-slate-400 transition-transform group-open:rotate-90" />
              </summary>
              <div className="px-4 pb-4 text-xs text-slate-500 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-white/5 pt-3">
                <p className="font-black text-primary mb-1">{rule.value}</p>
                {rule.description}
              </div>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
};

const AdminView = ({ showToast }: { showToast: (msg: string, type?: 'success' | 'error') => void }) => {
  const [activeSubTab, setActiveSubTab] = useState<'clients' | 'rules' | 'api' | 'challenges'>('clients');
  const [clients, setClients] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [challenges, setChallenges] = useState<any[]>([]);
  const [apiSettings, setApiSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAdminData = async () => {
      setLoading(true);
      try {
        // Fetch Clients
        const clientsSnap = await getDocs(collection(db, 'users'));
        setClients(clientsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        // Fetch Rules
        const rulesSnap = await getDocs(collection(db, 'rules'));
        setRules(rulesSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        // Fetch Challenges
        const challengesSnap = await getDocs(collection(db, 'challenges'));
        setChallenges(challengesSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        // Fetch API Settings
        const settingsSnap = await getDoc(doc(db, 'settings', 'market'));
        if (settingsSnap.exists()) {
          setApiSettings(settingsSnap.data());
        } else {
          setApiSettings({
            activeProviderId: 'yahoo',
            providers: [
              { id: 'yahoo', name: 'Yahoo Finance', type: 'yahoo' },
              { id: 'dhan', name: 'Dhan API', type: 'dhan', clientId: '', accessToken: '' }
            ]
          });
        }
      } catch (err) {
        console.error('Admin fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAdminData();
  }, []);

  const handleUpdateBalance = async (clientId: string, newBalance: number) => {
    try {
      await updateDoc(doc(db, 'users', clientId), { balance: newBalance });
      setClients(prev => prev.map(c => c.id === clientId ? { ...c, balance: newBalance } : c));
      showToast('Balance updated successfully');
    } catch (err) {
      showToast('Failed to update balance', 'error');
    }
  };

  const handleUpdateRule = async (ruleId: string, updates: any) => {
    try {
      await updateDoc(doc(db, 'rules', ruleId), updates);
      setRules(prev => prev.map(r => r.id === ruleId ? { ...r, ...updates } : r));
      showToast('Rule updated successfully');
    } catch (err) {
      showToast('Failed to update rule', 'error');
    }
  };

  const handleUpdateApi = async (updates: any) => {
    try {
      await setDoc(doc(db, 'settings', 'market'), updates, { merge: true });
      setApiSettings(updates);
      showToast('API settings updated');
    } catch (err) {
      showToast('Failed to update API settings', 'error');
    }
  };

  const handleUpdateChallenge = async (challengeId: string, updates: any) => {
    try {
      await updateDoc(doc(db, 'challenges', challengeId), updates);
      setChallenges(prev => prev.map(c => c.id === challengeId ? { ...c, ...updates } : c));
      showToast('Challenge updated');
    } catch (err) {
      showToast('Failed to update challenge', 'error');
    }
  };

  const handleCreateChallenge = async () => {
    const newChallenge = {
      name: 'New Challenge',
      price: 5000,
      capital: 50000,
      profit_target: 10,
      max_dd: 10,
      daily_dd: 5,
      tag: 'Standard',
      recommended: false
    };
    try {
      const docRef = await addDoc(collection(db, 'challenges'), newChallenge);
      setChallenges(prev => [...prev, { id: docRef.id, ...newChallenge }]);
      showToast('New challenge created');
    } catch (err) {
      showToast('Failed to create challenge', 'error');
    }
  };

  const handleDeleteChallenge = async (challengeId: string) => {
    if (!confirm('Are you sure you want to delete this challenge?')) return;
    try {
      await deleteDoc(doc(db, 'challenges', challengeId));
      setChallenges(prev => prev.filter(c => c.id !== challengeId));
      showToast('Challenge deleted');
    } catch (err) {
      showToast('Failed to delete challenge', 'error');
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-400">Loading Admin Panel...</div>;

  return (
    <div className="flex flex-col gap-6 p-4 pb-24">
      <div className="flex gap-2 overflow-x-auto hide-scrollbar">
        {[
          { id: 'clients', label: 'Clients', icon: Users },
          { id: 'challenges', label: 'Challenges', icon: Trophy },
          { id: 'rules', label: 'Rules', icon: ShieldCheck },
          { id: 'api', label: 'API Settings', icon: Settings }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              activeSubTab === tab.id ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-500'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeSubTab === 'clients' && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold">Manage Clients</h3>
          {clients.map(client => (
            <div key={client.id} className="p-4 bg-white dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold">{client.name}</p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest">{client.email}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${client.role === 'admin' ? 'bg-primary/20 text-primary' : 'bg-slate-100 dark:bg-white/10 text-slate-500'}`}>
                  {client.role?.toUpperCase() || 'USER'}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Wallet Balance</p>
                  <input
                    type="number"
                    defaultValue={client.balance}
                    onBlur={(e) => handleUpdateBalance(client.id, Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-[#160d08] border border-slate-200 dark:border-white/10 rounded-lg text-sm font-bold"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeSubTab === 'challenges' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold">Challenge Plans</h3>
            <button 
              onClick={handleCreateChallenge}
              className="flex items-center gap-2 px-3 py-1.5 bg-primary text-white rounded-xl text-xs font-bold"
            >
              <Plus className="w-3 h-3" />
              Add Plan
            </button>
          </div>
          {challenges.map(plan => (
            <div key={plan.id} className="p-4 bg-white dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 space-y-4">
              <div className="flex justify-between items-start">
                <div className="flex-1 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Plan Name</label>
                      <input
                        className="w-full bg-slate-50 dark:bg-[#160d08] border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs font-bold"
                        defaultValue={plan.name}
                        onBlur={(e) => handleUpdateChallenge(plan.id, { name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Tag/Badge</label>
                      <input
                        className="w-full bg-slate-50 dark:bg-[#160d08] border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs font-bold"
                        defaultValue={plan.tag}
                        onBlur={(e) => handleUpdateChallenge(plan.id, { tag: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Price (₹)</label>
                      <input
                        type="number"
                        className="w-full bg-slate-50 dark:bg-[#160d08] border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs font-bold"
                        defaultValue={plan.price}
                        onBlur={(e) => handleUpdateChallenge(plan.id, { price: Number(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Capital (₹)</label>
                      <input
                        type="number"
                        className="w-full bg-slate-50 dark:bg-[#160d08] border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs font-bold"
                        defaultValue={plan.capital}
                        onBlur={(e) => handleUpdateChallenge(plan.id, { capital: Number(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Target (%)</label>
                      <input
                        type="number"
                        className="w-full bg-slate-50 dark:bg-[#160d08] border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs font-bold"
                        defaultValue={plan.profit_target}
                        onBlur={(e) => handleUpdateChallenge(plan.id, { profit_target: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Max DD (%)</label>
                      <input
                        type="number"
                        className="w-full bg-slate-50 dark:bg-[#160d08] border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs font-bold"
                        defaultValue={plan.max_dd}
                        onBlur={(e) => handleUpdateChallenge(plan.id, { max_dd: Number(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Daily DD (%)</label>
                      <input
                        type="number"
                        className="w-full bg-slate-50 dark:bg-[#160d08] border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs font-bold"
                        defaultValue={plan.daily_dd}
                        onBlur={(e) => handleUpdateChallenge(plan.id, { daily_dd: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id={`rec-${plan.id}`}
                      defaultChecked={plan.recommended}
                      onChange={(e) => handleUpdateChallenge(plan.id, { recommended: e.target.checked })}
                      className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                    />
                    <label htmlFor={`rec-${plan.id}`} className="text-[10px] font-bold text-slate-400 uppercase cursor-pointer">Recommended Plan</label>
                  </div>
                </div>
                <button 
                  onClick={() => handleDeleteChallenge(plan.id)}
                  className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeSubTab === 'rules' && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold">Trading Rules</h3>
          {rules.map(rule => (
            <div key={rule.id} className="p-4 bg-white dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 space-y-3">
              <input
                className="w-full bg-transparent font-bold text-sm focus:outline-none"
                defaultValue={rule.name}
                onBlur={(e) => handleUpdateRule(rule.id, { name: e.target.value })}
              />
              <input
                className="w-full bg-transparent text-primary text-xs font-bold focus:outline-none"
                defaultValue={rule.value}
                onBlur={(e) => handleUpdateRule(rule.id, { value: e.target.value })}
              />
              <textarea
                className="w-full bg-transparent text-slate-400 text-[10px] focus:outline-none resize-none"
                defaultValue={rule.description}
                rows={2}
                onBlur={(e) => handleUpdateRule(rule.id, { description: e.target.value })}
              />
            </div>
          ))}
        </div>
      )}

      {activeSubTab === 'api' && (
        <div className="space-y-6">
          <h3 className="text-lg font-bold">Market API Connections</h3>
          <div className="space-y-4">
            <div className="p-4 bg-white dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 space-y-4">
              <p className="text-[10px] text-slate-400 font-bold uppercase">Active Provider</p>
              <div className="grid grid-cols-2 gap-2">
                {apiSettings?.providers?.map((p: any) => (
                  <button
                    key={p.id}
                    onClick={() => handleUpdateApi({ ...apiSettings, activeProviderId: p.id })}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                      apiSettings.activeProviderId === p.id 
                        ? 'bg-primary/10 border-primary text-primary' 
                        : 'border-slate-200 dark:border-white/10 text-slate-400'
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            {apiSettings?.providers?.map((p: any) => p.type === 'dhan' && (
              <div key={p.id} className="p-4 bg-white dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 space-y-4">
                <p className="text-[10px] text-slate-400 font-bold uppercase">Dhan API Credentials</p>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Client ID</label>
                    <input
                      type="text"
                      defaultValue={p.clientId}
                      onBlur={(e) => {
                        const newProviders = apiSettings.providers.map((pr: any) => pr.id === p.id ? { ...pr, clientId: e.target.value } : pr);
                        handleUpdateApi({ ...apiSettings, providers: newProviders });
                      }}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-[#160d08] border border-slate-200 dark:border-white/10 rounded-xl text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Access Token</label>
                    <input
                      type="password"
                      defaultValue={p.accessToken}
                      onBlur={(e) => {
                        const newProviders = apiSettings.providers.map((pr: any) => pr.id === p.id ? { ...pr, accessToken: e.target.value } : pr);
                        handleUpdateApi({ ...apiSettings, providers: newProviders });
                      }}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-[#160d08] border border-slate-200 dark:border-white/10 rounded-xl text-xs"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const ProfileView = ({ userProfile, user, showToast }: { userProfile: any, user: any, showToast: (msg: string, type?: 'success' | 'error') => void }) => {
  const [tradeHistory, setTradeHistory] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(
      collection(db, 'trades'),
      where('userId', '==', user.uid),
      where('status', '==', 'Closed'),
      orderBy('time', 'desc'),
      limit(10)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const trades = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Trade));
      setTradeHistory(trades);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching trade history:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user?.uid]);

  return (
    <div className="flex flex-col gap-6 p-4 pb-24">
      <div className="flex flex-col items-center gap-4 py-8">
        <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20">
          <User className="w-12 h-12 text-primary" />
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-bold">{userProfile?.name || 'Trader'}</h2>
          <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">Pro Trader • ID: #{userProfile?.uid?.slice(-4) || '----'}</p>
          <p className="text-[10px] text-slate-500 font-bold mt-1">{userProfile?.email} ({userProfile?.role || 'user'})</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
          <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Wallet Balance</p>
          <p className="text-lg font-bold">₹{userProfile?.balance?.toLocaleString('en-IN') || '0.00'}</p>
        </div>
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
          <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Total Payouts</p>
          <p className="text-lg font-bold">₹0.00</p>
        </div>
      </div>

      {userProfile?.email === 'kushwahgourav2018@gmail.com' && userProfile?.role !== 'admin' && (
        <button
          onClick={async () => {
            try {
              await updateDoc(doc(db, 'users', user.uid), { role: 'admin' });
              showToast('Admin role granted!');
            } catch (err) {
              console.error(err);
            }
          }}
          className="w-full py-4 bg-primary/10 text-primary font-bold rounded-2xl border border-primary/20 hover:bg-primary/20 transition-all flex items-center justify-center gap-2"
        >
          <ShieldCheck className="w-5 h-5" />
          Activate Admin Access
        </button>
      )}

      <div className="space-y-2">
        {[
          { icon: Wallet, label: 'Withdraw Funds' },
          { icon: Trophy, label: 'My Certificates' },
          { icon: ReceiptText, label: 'Transaction History' },
          { icon: User, label: 'Account Settings' },
        ].map(item => (
          <button key={item.label} className="w-full flex items-center justify-between p-4 bg-white dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
            <div className="flex items-center gap-4">
              <item.icon className="w-5 h-5 text-slate-400" />
              <span className="font-bold text-sm">{item.label}</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>
        ))}
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-bold">Recent Trade History</h3>
        <div className="overflow-x-auto -mx-4 px-4">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/10">
                <th className="py-3 text-[10px] font-bold text-slate-400 uppercase">Symbol</th>
                <th className="py-3 text-[10px] font-bold text-slate-400 uppercase">Type</th>
                <th className="py-3 text-[10px] font-bold text-slate-400 uppercase">Strike</th>
                <th className="py-3 text-[10px] font-bold text-slate-400 uppercase">LTP</th>
                <th className="py-3 text-[10px] font-bold text-slate-400 uppercase">Qty</th>
                <th className="py-3 text-[10px] font-bold text-slate-400 uppercase">Time</th>
                <th className="py-3 text-[10px] font-bold text-slate-400 uppercase text-right">PnL</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 text-xs font-bold">Loading history...</td>
                </tr>
              ) : tradeHistory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 text-xs font-bold">No recent trades</td>
                </tr>
              ) : (
                tradeHistory.map(trade => (
                  <tr key={trade.id} className="border-b border-slate-100 dark:border-white/5">
                    <td className="py-3 text-xs font-bold">{trade.symbol}</td>
                    <td className="py-3">
                      <span className={`px-1.5 py-0.5 rounded-[4px] text-[8px] font-black ${
                        trade.type === 'BUY' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                      }`}>
                        {trade.type}
                      </span>
                    </td>
                    <td className="py-3 text-xs font-bold text-slate-500 whitespace-nowrap">{trade.strike} {trade.optionType}</td>
                    <td className="py-3 text-xs font-bold">₹{trade.price.toFixed(2)}</td>
                    <td className="py-3 text-xs font-bold text-slate-500">{trade.qty}</td>
                    <td className="py-3 text-[10px] text-slate-400 font-bold whitespace-nowrap">{trade.time}</td>
                    <td className={`py-3 text-xs font-bold text-right whitespace-nowrap ${trade.pnl >= 0 ? 'text-trading-up' : 'text-trading-down'}`}>
                      {trade.pnl >= 0 ? '+' : ''}₹{Math.abs(trade.pnl).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default function AppWrapper() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}

function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [activeTab, setActiveTab] = useState('trade');
  const [showOptionChain, setShowOptionChain] = useState(false);
  const [marketData, setMarketData] = useState<Record<string, { price: number, change: number, optionChain: any[], timestamp: string }>>({
    'Nifty 50': { price: 22453.80, change: 102.45, optionChain: [], timestamp: '--:--:--' },
    'Bank Nifty': { price: 47500.00, change: 250.00, optionChain: [], timestamp: '--:--:--' },
    'Fin Nifty': { price: 21000.00, change: 50.00, optionChain: [], timestamp: '--:--:--' },
    'Midcap Nifty': { price: 10500.00, change: 30.00, optionChain: [], timestamp: '--:--:--' },
  });
  const [selectedSymbol, setSelectedSymbol] = useState('Nifty 50');
  const [selectedStrike, setSelectedStrike] = useState<number>(0);
  const [allTrades, setAllTrades] = useState<Trade[]>([]);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  const openPositions = useMemo(() => allTrades.filter(t => t.status === 'Open'), [allTrades]);
  
  const [plans, setPlans] = useState<Plan[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchPlans = async () => {
    try {
      const q = query(collection(db, 'challenges'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Plan));
      setPlans(data);
    } catch (err) {
      console.error('Failed to fetch plans:', err);
    }
  };

  const fetchRules = async () => {
    try {
      const q = query(collection(db, 'rules'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Rule));
      setRules(data);
    } catch (err) {
      console.error('Failed to fetch rules:', err);
    }
  };

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setIsAuthReady(true);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) {
      setUserProfile(null);
      return;
    }
    const path = `users/${user.uid}`;
    const unsubscribeProfile = onSnapshot(doc(db, 'users', user.uid), async (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setUserProfile(data);
        
        // Auto-bootstrap admin for specific email
        if (data.email === 'kushwahgourav2018@gmail.com' && data.role !== 'admin') {
          await updateDoc(doc(db, 'users', user.uid), { role: 'admin' });
        }
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, path);
    });
    return () => unsubscribeProfile();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchPlans();
    fetchRules();
  }, [user]);

  useEffect(() => {
    const socket = io();
    let isConnected = false;

    socket.on('connect', () => {
      isConnected = true;
      console.log('[Market] WebSocket connected');
    });

    socket.on('disconnect', () => {
      isConnected = false;
      console.log('[Market] WebSocket disconnected');
    });

    socket.on('marketUpdate', (data) => {
      setMarketData(prev => ({
        ...prev,
        [data.symbol]: {
          price: data.price,
          change: data.change,
          optionChain: data.optionChain || [],
          timestamp: data.timestamp
        }
      }));
    });

    // Polling fallback for serverless (Vercel)
    const pollInterval = setInterval(async () => {
      if (!isConnected) {
        try {
          const response = await fetch('/api/market/quotes');
          if (response.ok) {
            const data = await response.json();
            setMarketData(prev => ({ ...prev, ...data }));
          }
        } catch (err) {
          console.error('[Market] Polling failed:', err);
        }
      }
    }, 5000); // Poll every 5 seconds if not connected via WS

    return () => { 
      socket.disconnect(); 
      clearInterval(pollInterval);
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setAllTrades([]);
      return;
    }
    const tradesQuery = query(collection(db, 'trades'), where('userId', '==', user.uid));
    const unsubscribeTrades = onSnapshot(tradesQuery, (snapshot) => {
      const trades = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Trade));
      setAllTrades(trades);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'trades');
    });
    return () => unsubscribeTrades();
  }, [user]);

  useEffect(() => {
    if (!userProfile) return;

    const closedTrades = allTrades.filter(t => t.status === 'Closed');

    let totalUnrealizedPnl = 0;
    const updatedPositions = openPositions.map(pos => {
      let currentPrice = pos.price;
      const symbolData = marketData[pos.symbol];
      
      if (symbolData) {
        const option = symbolData.optionChain.find(o => o.strike === pos.strike);
        if (option) {
          currentPrice = pos.optionType === 'CE' ? option.ce_ltp : option.pe_ltp;
        }
      }
      
      const pnl = pos.type === 'BUY' ? (currentPrice - pos.price) * pos.qty : (pos.price - currentPrice) * pos.qty;
      totalUnrealizedPnl += pnl;
      return { ...pos, pnl };
    });

    const realizedPnl = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    
    // Calculate stats
    const wins = closedTrades.filter(t => t.pnl > 0);
    const losses = closedTrades.filter(t => t.pnl < 0);
    const winRate = closedTrades.length > 0 ? (wins.length / closedTrades.length) * 100 : 0;
    
    const totalWinAmount = wins.reduce((sum, t) => sum + t.pnl, 0);
    const totalLossAmount = Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0));
    const profitFactor = totalLossAmount > 0 ? totalWinAmount / totalLossAmount : totalWinAmount > 0 ? 100 : 0;
    
    const avgWin = wins.length > 0 ? totalWinAmount / wins.length : 0;
    const avgLoss = losses.length > 0 ? totalLossAmount / losses.length : 0;

    setPortfolio({
      equity: (userProfile.balance || 0) + totalUnrealizedPnl,
      balance: userProfile.balance || 0,
      unrealizedPnl: totalUnrealizedPnl,
      realizedPnl: realizedPnl,
      positions: updatedPositions,
      stats: {
        winRate,
        profitFactor,
        avgWin,
        avgLoss
      }
    });
  }, [userProfile, allTrades, marketData, openPositions]);

  const handleTrade = async (type: 'BUY' | 'SELL', strike: number, price: number) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'trades'), {
        userId: user.uid,
        symbol: selectedSymbol,
        type,
        optionType: 'CE',
        strike,
        qty: 50,
        price: price,
        time: new Date().toISOString(),
        status: 'Open',
        pnl: 0
      });
      showToast(`${type} Order Placed for ${selectedSymbol} ${strike} CE`);
    } catch (error) {
      console.error('Trade failed:', error);
      showToast('Trade failed. Please try again.', 'error');
    }
  };

  const handleClosePosition = async (tradeId: string) => {
    if (!user || !userProfile) return;
    try {
      const tradeDoc = await getDoc(doc(db, 'trades', tradeId));
      if (!tradeDoc.exists()) return;
      
      const trade = tradeDoc.data() as Trade;
      let currentPrice = trade.price;
      const symbolData = marketData[trade.symbol];
      
      if (symbolData) {
        const option = symbolData.optionChain.find(o => o.strike === trade.strike);
        if (option) {
          currentPrice = trade.optionType === 'CE' ? option.ce_ltp : option.pe_ltp;
        }
      }
      
      const priceDiff = trade.type === 'BUY' ? (currentPrice - trade.price) : (trade.price - currentPrice);
      const pnl = priceDiff * trade.qty;

      // Update trade status and user balance
      await updateDoc(doc(db, 'trades', tradeId), {
        status: 'Closed',
        pnl: pnl
      });

      const newBalance = userProfile.balance + pnl;
      await updateDoc(doc(db, 'users', user.uid), {
        balance: newBalance
      });

      // Update local profile state
      setUserProfile(prev => ({ ...prev, balance: newBalance }));

      showToast(`Position Closed. PnL: ₹${pnl.toFixed(2)}`);
    } catch (error) {
      console.error('Close position failed:', error);
      showToast('Failed to close position', 'error');
    }
  };

  const handleBuyChallenge = async (plan: Plan) => {
    if (!user || !userProfile) return;
    
    // In a real app, you'd check balance, but here we add capital to balance
    try {
      const newBalance = (userProfile.balance || 0) + plan.capital;
      
      // Update user balance in Firestore
      await updateDoc(doc(db, 'users', user.uid), {
        balance: newBalance,
        initial_balance: newBalance // Also update initial balance for drawdown tracking
      });

      // Record the transaction
      await addDoc(collection(db, 'transactions'), {
        userId: user.uid,
        type: 'challenge_purchase',
        amount: plan.price,
        planId: plan.id,
        planName: plan.name,
        time: new Date().toISOString()
      });

      showToast(`Successfully purchased ${plan.name}! ₹${plan.capital.toLocaleString()} added to wallet.`);
    } catch (error) {
      console.error('Purchase failed:', error);
      showToast('Failed to purchase challenge', 'error');
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setActiveTab('trade');
  };

  const navItems: NavItem[] = [
    { id: 'trade', label: 'Trade', icon: CandlestickChart },
    { id: 'challenges', label: 'Challenges', icon: Trophy },
    { id: 'portfolio', label: 'Portfolio', icon: Briefcase },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  if (userProfile?.role === 'admin' || user?.email === 'kushwahgourav2018@gmail.com') {
    navItems.push({ id: 'admin', label: 'Admin', icon: ShieldCheck });
  }

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto bg-white dark:bg-[#160d08] shadow-2xl relative">
      <Header 
        activeTab={activeTab} 
        isSubView={(activeTab === 'trade' && showOptionChain)}
        onBack={() => {
          if (showOptionChain) setShowOptionChain(false);
        }}
        onLogout={user ? handleLogout : undefined}
      />

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-20 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl shadow-2xl font-bold text-sm whitespace-nowrap ${
              toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
            }`}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
      
      <main className="flex-1 overflow-y-auto">
        {!isAuthReady ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : !user ? (
          <AuthView onAuthSuccess={() => showToast('Welcome!')} />
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab + (showOptionChain ? '-oc' : '')}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'trade' && (
                showOptionChain ? (
                  <OptionChainView 
                    symbol={selectedSymbol}
                    optionChain={marketData[selectedSymbol].optionChain}
                    spotPrice={marketData[selectedSymbol].price}
                    onSelectStrike={(s) => {
                      setSelectedStrike(s);
                      setShowOptionChain(false);
                      showToast(`Selected Strike: ${s}`);
                    }} 
                  />
                ) : (
                  <TradeView 
                    onViewOptionChain={() => setShowOptionChain(true)} 
                    price={marketData[selectedSymbol].price}
                    change={marketData[selectedSymbol].change}
                    timestamp={marketData[selectedSymbol].timestamp}
                    optionChain={marketData[selectedSymbol].optionChain}
                    selectedSymbol={selectedSymbol}
                    onSymbolChange={(s) => {
                      setSelectedSymbol(s);
                      setSelectedStrike(0);
                    }}
                    selectedStrike={selectedStrike}
                    onStrikeChange={setSelectedStrike}
                    onTrade={handleTrade}
                    openPositions={openPositions}
                  />
                )
              )}
              {activeTab === 'challenges' && <ChallengesView onSelectPlan={handleBuyChallenge} plans={plans} rules={rules} />}
              {activeTab === 'portfolio' && <PortfolioView portfolio={portfolio} onClosePosition={handleClosePosition} userId={user.uid} allTrades={allTrades} />}
              {activeTab === 'profile' && <ProfileView userProfile={userProfile} user={user} showToast={showToast} />}
              {activeTab === 'admin' && <AdminView showToast={showToast} />}
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      <nav className="fixed bottom-0 w-full max-w-md bg-white/90 dark:bg-[#160d08]/90 backdrop-blur-lg border-t border-slate-200 dark:border-white/10 px-4 pb-6 pt-3 z-50">
        <div className="flex justify-around items-center">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center gap-1 transition-all ${
                activeTab === item.id ? 'text-primary' : 'text-slate-400'
              }`}
            >
              <item.icon className={`w-6 h-6 ${activeTab === item.id ? 'fill-primary/20' : ''}`} />
              <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
