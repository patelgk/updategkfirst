import { LucideIcon } from "lucide-react";

export interface NavItem {
  label: string;
  icon: LucideIcon;
  id: string;
}

export interface Trade {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  optionType: 'CE' | 'PE';
  strike: number;
  price: number;
  qty: number;
  time: string;
  status: 'Open' | 'Closed';
  pnl: number;
}

export interface Plan {
  id: string;
  name: string;
  price: number;
  capital: number;
  profit_target: number;
  max_dd: number;
  daily_dd: number;
  tag?: string;
  recommended?: boolean;
}

export interface Rule {
  id: string;
  name: string;
  value: string;
  description: string;
}

export interface OptionData {
  strike: number;
  ce_oi: number;
  ce_oi_change: number;
  ce_ltp: number;
  pe_ltp: number;
  pe_oi_change: number;
  pe_oi: number;
}

export interface Portfolio {
  equity: number;
  balance: number;
  unrealizedPnl: number;
  realizedPnl: number;
  positions: Trade[];
  stats?: {
    winRate: number;
    profitFactor: number;
    avgWin: number;
    avgLoss: number;
  };
}

export interface Account {
  id: string;
  balance: number;
  initialBalance: number;
  equity: number;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  balance: number;
  initial_balance: number;
  equity: number;
  unrealizedPnl: number;
  openPositions: number;
}
