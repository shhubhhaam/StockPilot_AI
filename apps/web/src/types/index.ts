export interface User {
  id: string;
  email: string;
  display_name?: string;
  is_active: boolean;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
}

export interface Stock {
  id: string;
  symbol: string;
  exchange: string;
  company_name: string;
  sector: string;
  industry?: string;
  currency: string;
  is_active: boolean;
  current_price?: number;
  change_1d?: number;
  change_percent_1d?: number;
  high_52w?: number;
  low_52w?: number;
  volume?: number;
  ai_outlook?: string;
  is_owned?: boolean;
  is_in_watchlist?: boolean;
}

export interface Candle {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TechnicalIndicators {
  symbol: string;
  timestamp: string;
  rsi_14?: number;
  macd?: number;
  macd_signal?: number;
  macd_histogram?: number;
  bb_upper?: number;
  bb_middle?: number;
  bb_lower?: number;
  sma_20?: number;
  sma_50?: number;
  ema_20?: number;
  atr_14?: number;
  volatility_20d?: number;
  detected_patterns: string[];
}

export interface Fundamentals {
  id: string;
  stock_id: string;
  fiscal_period: string;
  revenue?: number;
  revenue_growth_yoy?: number;
  net_profit?: number;
  eps?: number;
  pe_ratio?: number;
  pb_ratio?: number;
  debt_to_equity?: number;
  roe?: number;
  roce?: number;
  operating_margin?: number;
  currency: string;
  source: string;
  published_at?: string;
}

export interface Holding {
  id: string;
  stock_id: string;
  symbol: string;
  exchange: string;
  company_name: string;
  sector: string;
  quantity: number;
  average_purchase_price: number;
  invested_value: number;
  current_price?: number;
  current_market_value?: number;
  unrealized_pnl?: number;
  return_percentage?: number;
  portfolio_weight?: number;
  valuation_status: string;
  created_at: string;
  updated_at: string;
}

export interface SectorAllocation {
  sector: string;
  value: number;
  percentage: number;
  holding_count: number;
}

export interface StockAllocation {
  symbol: string;
  company_name: string;
  value: number;
  percentage: number;
}

export interface PortfolioSummary {
  total_invested_value: number;
  total_market_value: number;
  unrealized_pnl: number;
  total_return_percentage: number;
  daily_pnl?: number;
  daily_return_percentage?: number;
  holdings_count: number;
  valuation_status: string;
  currency: string;
  sector_allocations: SectorAllocation[];
  top_holdings: StockAllocation[];
  concentration_alert?: string;
}

export interface WatchlistItem {
  id: string;
  watchlist_id: string;
  stock_id: string;
  stock: Stock;
  created_at: string;
}

export interface Watchlist {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  items: WatchlistItem[];
}

export interface FeatureContribution {
  feature_name: string;
  value: number;
  importance: number;
  description?: string;
}

export interface Prediction {
  id: string;
  stock_id: string;
  symbol: string;
  exchange: string;
  company_name: string;
  sector: string;
  model_version: string;
  prediction_timestamp: string;
  prediction_horizon: string;
  predicted_return?: number;
  predicted_class?: string;
  positive_return_probability?: number;
  uncertainty_metadata?: Record<string, any>;
  feature_snapshot_reference?: Record<string, any>;
  top_features: FeatureContribution[];
  decision_support_label: string;
  model_status: string;
  created_at: string;
}

export interface ModelStatus {
  status: string;
  model_name: string;
  model_version: string;
  framework: string;
  prediction_horizon: string;
  is_calibrated: boolean;
  features_required: string[];
  missing_requirements?: string[];
  notes?: string;
}

export interface NewsEvent {
  id: string;
  stock_id?: string;
  symbol?: string;
  company_name?: string;
  title: string;
  summary: string;
  source: string;
  source_url?: string;
  published_at: string;
  event_type: string;
  sentiment_score?: number;
  sentiment_label?: string;
  relevance_score?: number;
  created_at: string;
}

export interface RegulatoryEvent {
  id: string;
  authority: string;
  document_title: string;
  document_url?: string;
  published_at: string;
  summary: string;
  event_type: string;
  affected_sector?: string;
  impact_level: string;
  created_at: string;
}

export interface DashboardOverview {
  portfolio: PortfolioSummary;
  holdings: Holding[];
  top_predictions: Prediction[];
  recent_news: NewsEvent[];
  regulatory_alerts: RegulatoryEvent[];
  market_status: string;
  is_demo_data: boolean;
}
