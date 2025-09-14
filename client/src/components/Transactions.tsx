import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { trpc } from '@/utils/trpc';
import { useAuth } from './AuthContext';
import type { Transaction, CreateTransactionInput, UpdateTransactionInput, TransactionType, TransactionCategory } from '../../../server/src/schema';

export function Transactions() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [filterType, setFilterType] = useState<TransactionType | 'all'>('all');
  const [filterCategory, setFilterCategory] = useState<TransactionCategory | 'all'>('all');

  const [formData, setFormData] = useState<CreateTransactionInput>({
    user_id: user?.id || '',
    type: 'expense',
    amount: 0,
    category: 'DLL',
    description: null,
    transaction_date: new Date()
  });

  const loadTransactions = useCallback(async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      const filters: {
        user_id: string;
        type?: TransactionType;
        category?: TransactionCategory;
      } = { user_id: user.id };
      if (filterType !== 'all') filters.type = filterType;
      if (filterCategory !== 'all') filters.category = filterCategory;
      
      const result = await trpc.getTransactionsByUser.query(filters);
      setTransactions(result);
      setError('');
    } catch (err) {
      console.error('Failed to load transactions:', err);
      setError('Failed to load transactions');
    } finally {
      setIsLoading(false);
    }
  }, [user, filterType, filterCategory]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const resetForm = () => {
    setFormData({
      user_id: user?.id || '',
      type: 'expense',
      amount: 0,
      category: 'DLL',
      description: null,
      transaction_date: new Date()
    });
    setEditingTransaction(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      if (editingTransaction) {
        const updateData: UpdateTransactionInput = {
          id: editingTransaction.id,
          type: formData.type,
          amount: formData.amount,
          category: formData.category,
          description: formData.description || null,
          transaction_date: formData.transaction_date
        };
        await trpc.updateTransaction.mutate(updateData);
      } else {
        await trpc.createTransaction.mutate(formData);
      }
      
      setIsDialogOpen(false);
      resetForm();
      loadTransactions();
    } catch (err) {
      console.error('Failed to save transaction:', err);
      setError('Failed to save transaction');
    }
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setFormData({
      user_id: user?.id || '',
      type: transaction.type,
      amount: transaction.amount,
      category: transaction.category,
      description: transaction.description,
      transaction_date: transaction.transaction_date
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (transaction: Transaction) => {
    if (!user || !confirm('Are you sure you want to delete this transaction?')) return;

    try {
      await trpc.deleteTransaction.mutate({
        id: transaction.id,
        user_id: user.id
      });
      loadTransactions();
    } catch (err) {
      console.error('Failed to delete transaction:', err);
      setError('Failed to delete transaction');
    }
  };

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
    // Excel export functionality - uses CSV format for compatibility
    const csvContent = [
      'Date,Type,Category,Amount,Description',
      ...transactions.map(t => 
        `${t.transaction_date.toLocaleDateString()},${t.type},${t.category},${t.amount},"${t.description || ''}"`
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <h2 className="text-2xl font-bold">💳 Transactions</h2>
        <div className="flex flex-wrap gap-2">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>➕ Add Transaction</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingTransaction ? '✏️ Edit Transaction' : '➕ Add New Transaction'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Type</Label>
                    <Select value={formData.type} onValueChange={(value: TransactionType) => 
                      setFormData((prev: CreateTransactionInput) => ({ ...prev, type: value }))
                    }>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="income">📈 Income</SelectItem>
                        <SelectItem value="expense">📉 Expense</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Select value={formData.category} onValueChange={(value: TransactionCategory) => 
                      setFormData((prev: CreateTransactionInput) => ({ ...prev, category: value }))
                    }>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DD">Direct Debit</SelectItem>
                        <SelectItem value="ADD">Additional</SelectItem>
                        <SelectItem value="PBH">Personal Banking</SelectItem>
                        <SelectItem value="PAD">Personal Advertising</SelectItem>
                        <SelectItem value="DLL">Daily Living</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.amount}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateTransactionInput) => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))
                    }
                    required
                  />
                </div>
                
                <div>
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={formData.transaction_date.toISOString().split('T')[0]}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateTransactionInput) => ({ ...prev, transaction_date: new Date(e.target.value) }))
                    }
                    required
                  />
                </div>
                
                <div>
                  <Label>Description (Optional)</Label>
                  <Textarea
                    value={formData.description || ''}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setFormData((prev: CreateTransactionInput) => ({ ...prev, description: e.target.value || null }))
                    }
                    placeholder="Enter description..."
                  />
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1">
                    {editingTransaction ? '💾 Update' : '➕ Add'} Transaction
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          
          {transactions.length > 0 && (
            <Button variant="outline" onClick={exportToExcel}>
              📊 Export Excel
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <span>Filter Transactions</span>
            <div className="flex flex-wrap gap-2">
              <Select value={filterType} onValueChange={(value: TransactionType | 'all') => setFilterType(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="income">📈 Income</SelectItem>
                  <SelectItem value="expense">📉 Expense</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={filterCategory} onValueChange={(value: TransactionCategory | 'all') => setFilterCategory(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="DD">Direct Debit</SelectItem>
                  <SelectItem value="ADD">Additional</SelectItem>
                  <SelectItem value="PBH">Personal Banking</SelectItem>
                  <SelectItem value="PAD">Personal Advertising</SelectItem>
                  <SelectItem value="DLL">Daily Living</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-700">❌ {error}</AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                  <div className="h-6 bg-gray-200 rounded w-20"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500 mb-4">
              No transactions found. {filterType !== 'all' || filterCategory !== 'all' ? 'Try adjusting your filters or' : ''} Start by adding your first transaction! 🚀
            </p>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>➕ Add First Transaction</Button>
              </DialogTrigger>
            </Dialog>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {transactions.map((transaction: Transaction) => (
            <Card key={transaction.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-2xl">
                      {transaction.type === 'income' ? '📈' : '📉'}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">
                        {transaction.description || 'No description'}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-gray-500">
                        <Badge variant="secondary" className="text-xs">
                          {getCategoryLabel(transaction.category)}
                        </Badge>
                        <span>{transaction.transaction_date.toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className={`text-lg font-semibold ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                      {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(transaction)}
                      >
                        ✏️
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(transaction)}
                        className="text-red-600 hover:text-red-700"
                      >
                        🗑️
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}