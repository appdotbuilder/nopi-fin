import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { trpc } from '@/utils/trpc';
import { useAuth } from './AuthContext';
import type { ReportData, ReportPeriod, Transaction } from '../../../server/src/schema';

export function Reports() {
  const { user } = useAuth();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [period, setPeriod] = useState<ReportPeriod>('monthly');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const generateReport = useCallback(async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      setError('');
      
      const input: {
        user_id: string;
        period: ReportPeriod;
        start_date?: Date;
        end_date?: Date;
      } = {
        user_id: user.id,
        period
      };
      
      if (period === 'custom') {
        if (!startDate || !endDate) {
          setError('Please select both start and end dates for custom period');
          return;
        }
        input.start_date = new Date(startDate);
        input.end_date = new Date(endDate);
      }
      
      const result = await trpc.generateReport.query(input);
      setReportData(result);
    } catch (err) {
      console.error('Failed to generate report:', err);
      setError('Failed to generate report');
    } finally {
      setIsLoading(false);
    }
  }, [user, period, startDate, endDate]);

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

  const exportToExcel = () => {
    if (!reportData) return;
    
    // Excel export functionality - uses CSV format for compatibility
    const csvContent = [
      `Financial Report - ${reportData.period.toUpperCase()}`,
      `Period: ${reportData.start_date.toLocaleDateString()} to ${reportData.end_date.toLocaleDateString()}`,
      `Total Income: ${reportData.total_income}`,
      `Total Expenses: ${reportData.total_expenses}`,
      `Net Balance: ${reportData.net_balance}`,
      '',
      'Date,Type,Category,Amount,Description',
      ...reportData.transactions.map(t => 
        `${t.transaction_date.toLocaleDateString()},${t.type},${t.category},${t.amount},"${t.description || ''}"`
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report_${reportData.period}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Simple doughnut chart using CSS
  const renderDoughnutChart = () => {
    if (!reportData || (reportData.total_income === 0 && reportData.total_expenses === 0)) {
      return (
        <div className="w-48 h-48 mx-auto flex items-center justify-center border-4 border-gray-200 rounded-full">
          <span className="text-gray-500">No data</span>
        </div>
      );
    }
    
    const total = reportData.total_income + reportData.total_expenses;
    const incomePercentage = (reportData.total_income / total) * 100;
    const expensePercentage = (reportData.total_expenses / total) * 100;
    
    return (
      <div className="relative w-48 h-48 mx-auto">
        <div 
          className="w-48 h-48 rounded-full border-8 border-green-500"
          style={{
            background: `conic-gradient(
              #10b981 0deg ${incomePercentage * 3.6}deg,
              #ef4444 ${incomePercentage * 3.6}deg ${(incomePercentage + expensePercentage) * 3.6}deg,
              #f3f4f6 ${(incomePercentage + expensePercentage) * 3.6}deg 360deg
            )`
          }}
        >
          <div className="absolute inset-6 bg-white rounded-full flex items-center justify-center">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-800">
                {formatCurrency(reportData.net_balance)}
              </div>
              <div className="text-sm text-gray-600">Net</div>
            </div>
          </div>
        </div>
        <div className="mt-4 flex justify-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>Income ({incomePercentage.toFixed(1)}%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span>Expenses ({expensePercentage.toFixed(1)}%)</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">📊 Financial Reports</h2>

      <Card>
        <CardHeader>
          <CardTitle>Generate Report</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Report Period</Label>
              <Select value={period} onValueChange={(value: ReportPeriod) => setPeriod(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">📅 Weekly</SelectItem>
                  <SelectItem value="monthly">📆 Monthly</SelectItem>
                  <SelectItem value="yearly">🗓️ Yearly</SelectItem>
                  <SelectItem value="custom">🎯 Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {period === 'custom' && (
              <>
                <div>
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStartDate(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEndDate(e.target.value)}
                    required
                  />
                </div>
              </>
            )}
          </div>
          
          <Button onClick={generateReport} disabled={isLoading} className="w-full md:w-auto">
            {isLoading ? '⏳ Generating...' : '📊 Generate Report'}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-700">❌ {error}</AlertDescription>
        </Alert>
      )}

      {reportData && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold">
                📈 {reportData.period.charAt(0).toUpperCase() + reportData.period.slice(1)} Report
              </h3>
              <p className="text-gray-600">
                {reportData.start_date.toLocaleDateString()} - {reportData.end_date.toLocaleDateString()}
              </p>
            </div>
            <Button variant="outline" onClick={exportToExcel}>
              📊 Export Excel
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="border-l-4 border-l-green-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">💰 Total Income</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(reportData.total_income)}
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-red-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">💸 Total Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(reportData.total_expenses)}
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">📊 Net Balance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${reportData.net_balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(reportData.net_balance)}
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">🔢 Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {reportData.transactions.length}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>📈 Income vs Expenses</CardTitle>
              </CardHeader>
              <CardContent className="flex justify-center">
                {renderDoughnutChart()}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>📋 Category Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-green-600 mb-2">💰 Income by Category</h4>
                    <div className="space-y-2">
                      {Object.entries(reportData.income_by_category).map(([category, amount]) => (
                        <div key={category} className="flex justify-between items-center">
                          <Badge variant="secondary">{getCategoryLabel(category)}</Badge>
                          <span className="text-green-600 font-medium">{formatCurrency(amount)}</span>
                        </div>
                      ))}
                      {Object.keys(reportData.income_by_category).length === 0 && (
                        <p className="text-gray-500 text-sm">No income transactions</p>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-red-600 mb-2">💸 Expenses by Category</h4>
                    <div className="space-y-2">
                      {Object.entries(reportData.expenses_by_category).map(([category, amount]) => (
                        <div key={category} className="flex justify-between items-center">
                          <Badge variant="secondary">{getCategoryLabel(category)}</Badge>
                          <span className="text-red-600 font-medium">{formatCurrency(amount)}</span>
                        </div>
                      ))}
                      {Object.keys(reportData.expenses_by_category).length === 0 && (
                        <p className="text-gray-500 text-sm">No expense transactions</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>📝 Transaction Details</CardTitle>
            </CardHeader>
            <CardContent>
              {reportData.transactions.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No transactions found for this period.
                </p>
              ) : (
                <div className="space-y-4">
                  {reportData.transactions.map((transaction: Transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-4 rounded-lg border bg-gray-50">
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">
                          {transaction.type === 'income' ? '📈' : '📉'}
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
      )}
    </div>
  );
}