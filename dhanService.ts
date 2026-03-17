import axios from 'axios';

const DHAN_BASE_URL = 'https://api.dhan.co';

export interface DhanQuote {
  security_id: string;
  exchange_segment: string;
  last_price: number;
  change: number;
  change_percent: number;
}

export class DhanService {
  private clientId: string;
  private accessToken: string;

  constructor() {
    this.clientId = process.env.DHAN_CLIENT_ID || '';
    this.accessToken = process.env.DHAN_ACCESS_TOKEN || '';
  }

  public isConfigured(): boolean {
    return !!(this.clientId && this.accessToken);
  }

  public updateCredentials(clientId: string, accessToken: string) {
    this.clientId = clientId;
    this.accessToken = accessToken;
  }

  public async getNiftyQuote(): Promise<{ price: number; change: number } | null> {
    if (!this.isConfigured()) return null;

    try {
      // Dhan Quote API for Nifty 50 Index (NSE_INDEX, security_id: 13)
      const response = await axios.post(
        `${DHAN_BASE_URL}/marketfeed/v2/quote`,
        {
          instruments: [
            {
              exchange_segment: 'NSE_INDEX',
              security_id: '13'
            }
          ]
        },
        {
          headers: {
            'access-token': this.accessToken,
            'client-id': this.clientId,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = response.data;
      if (data && data.data && data.data[0]) {
        const quote = data.data[0];
        return {
          price: quote.last_price,
          change: quote.change
        };
      }
      return null;
    } catch (error) {
      console.error('[Dhan Service] Error fetching quote:', (error as any).response?.data || (error as Error).message);
      return null;
    }
  }

  // Place an order on Dhan
  public async placeOrder(params: {
    symbol: string;
    type: 'BUY' | 'SELL';
    qty: number;
    price: number;
    optionType: 'CALL' | 'PUT';
    strike: number;
  }) {
    if (!this.isConfigured()) return null;

    try {
      // Note: This is a simplified example. Dhan requires specific security_id for options.
      // In a real app, you'd map the strike/optionType to a security_id.
      const response = await axios.post(
        `${DHAN_BASE_URL}/orders`,
        {
          dhanClientId: this.clientId,
          correlationId: Math.random().toString(36).substr(2, 9),
          transactionType: params.type,
          exchangeSegment: 'NSE_FNO',
          productType: 'MARGIN',
          orderType: 'MARKET',
          validity: 'DAY',
          tradingSymbol: `${params.symbol}${params.strike}${params.optionType === 'CALL' ? 'CE' : 'PE'}`,
          quantity: params.qty,
          price: 0 // Market order
        },
        {
          headers: {
            'access-token': this.accessToken,
            'client-id': this.clientId,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('[Dhan Service] Order Placed:', response.data);
      return response.data;
    } catch (error) {
      console.error('[Dhan Service] Error placing order:', (error as any).response?.data || (error as Error).message);
      return null;
    }
  }
}

export const dhanService = new DhanService();
