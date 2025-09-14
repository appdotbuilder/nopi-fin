import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/utils/trpc';
import { useAuth } from './AuthContext';
import type { DashboardData, Transaction } from '../../../server/src/schema';

export function Dashboard() {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboardData = useCallback(async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      const data = await trpc.getDashboardData.query(user.id);
      setDashboardData(data);
      setError('');
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-4 bg-gray-200 rounded"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">❌ {error}</p>
        <Button onClick={loadDashboardData}>🔄 Try Again</Button>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No data available</p>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      DD: 'Direct Debit',
      ADD: 'Additional',
      PBH: 'Personal Banking',
      PAD: 'Personal Advertising',
      DLL: 'Daily Living'
    };
    return labels[category] || category;
  };

  const getTransactionIcon = (type: string) => {
    return type === 'income' ? '📈' : '📉';
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">💰 Current Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${dashboardData.current_balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(dashboardData.current_balance)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">📈 Total Income</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(dashboardData.total_income)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">📉 Total Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(dashboardData.total_expenses)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">📅 Monthly Net</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(dashboardData.monthly_income - dashboardData.monthly_expenses) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(dashboardData.monthly_income - dashboardData.monthly_expenses)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🕒 Recent Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dashboardData.recent_transactions.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No transactions yet. Start by adding your first transaction! 🚀
            </p>
          ) : (
            <div className="space-y-4">
              {dashboardData.recent_transactions.map((transaction: Transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-4 rounded-lg border bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">
                      {getTransactionIcon(transaction.type)}
                    </div>
                    <div>
                      <div className="font-medium">
                        {transaction.description || 'No description'}
                      </div>
                      <div className="text-sm text-gray-500 flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {getCategoryLabel(transaction.category)}
                        </Badge>
                        {transaction.transaction_date.toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className={`text-lg font-semibold ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                    {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}