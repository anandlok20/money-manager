'use client';

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { formatCurrency } from '@/lib/utils/currency';

const COLORS = [
  '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#6366f1',
];

interface PieChartData {
  name: string;
  value: number;
  color?: string;
}

interface BarChartData {
  month: string;
  income: number;
  expense: number;
}

interface BudgetData {
  name: string;
  budgetAmount: number;
  spent: number;
  percentage: number;
}

// Tooltip component for pie chart - must be defined outside the render
function PieTooltipContent({ 
  active, 
  payload,
  currency = 'INR'
}: { 
  active?: boolean; 
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: readonly any[];
  currency?: string;
}) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border rounded-lg shadow-lg p-3">
        <p className="font-medium">{payload[0].name}</p>
        <p className="text-sm text-muted-foreground">
          {formatCurrency(payload[0].value, currency)}
        </p>
      </div>
    );
  }
  return null;
}

// Tooltip component for bar chart
function BarTooltipContent({ 
  active, 
  payload, 
  label,
  currency = 'INR'
}: { 
  active?: boolean; 
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: readonly any[];
  label?: string | number;
  currency?: string;
}) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border rounded-lg shadow-lg p-3">
        <p className="font-medium mb-2">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {formatCurrency(entry.value, currency)}
          </p>
        ))}
      </div>
    );
  }
  return null;
}

// Tooltip component for budget progress
function BudgetTooltipContent({ 
  active, 
  payload, 
  label,
  data,
  currency = 'INR'
}: { 
  active?: boolean; 
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: readonly any[];
  label?: string | number;
  data: BudgetData[];
  currency?: string;
}) {
  if (active && payload && payload.length) {
    const item = data.find(d => d.name === String(label));
    if (item) {
      return (
        <div className="bg-popover border rounded-lg shadow-lg p-3">
          <p className="font-medium mb-1">{item.name}</p>
          <p className="text-sm">Budget: {formatCurrency(item.budgetAmount, currency)}</p>
          <p className="text-sm">Spent: {formatCurrency(item.spent, currency)}</p>
          <p className={`text-sm font-medium ${item.percentage > 100 ? 'text-red-500' : item.percentage > 80 ? 'text-yellow-500' : 'text-green-500'}`}>
            {item.percentage}% used
          </p>
        </div>
      );
    }
  }
  return null;
}

interface ExpensePieChartProps {
  data: PieChartData[];
  currency?: string;
}

export function ExpensePieChart({ data, currency = 'INR' }: ExpensePieChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-muted-foreground">
        No expense data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={40}
          outerRadius={70}
          paddingAngle={2}
          dataKey="value"
          nameKey="name"
        >
          {data.map((entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={entry.color || COLORS[index % COLORS.length]} 
            />
          ))}
        </Pie>
        <Tooltip content={({ active, payload }) => (
          <PieTooltipContent active={active} payload={payload} currency={currency} />
        )} />
        <Legend 
          layout="horizontal" 
          verticalAlign="bottom"
          wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

interface IncomeExpenseBarChartProps {
  data: BarChartData[];
  currency?: string;
}

export function IncomeExpenseBarChart({ data, currency = 'INR' }: IncomeExpenseBarChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-muted-foreground">
        No trend data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis 
          dataKey="month" 
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis 
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
          width={50}
        />
        <Tooltip content={({ active, payload, label }) => (
          <BarTooltipContent active={active} payload={payload} label={label} currency={currency} />
        )} />
        <Legend wrapperStyle={{ fontSize: '12px' }} />
        <Bar dataKey="income" name="Income" fill="#22c55e" radius={[4, 4, 0, 0]} />
        <Bar dataKey="expense" name="Expense" fill="#ef4444" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

interface SavingsRateGaugeProps {
  rate: number;
}

export function SavingsRateGauge({ rate }: SavingsRateGaugeProps) {
  const clampedRate = Math.max(-100, Math.min(100, rate));
  
  // Determine color based on rate
  const getColor = () => {
    if (rate >= 30) return '#22c55e'; // Green for good savings
    if (rate >= 10) return '#f59e0b'; // Yellow for moderate
    if (rate >= 0) return '#f97316';  // Orange for low
    return '#ef4444'; // Red for negative
  };

  const color = getColor();

  return (
    <div className="relative w-[140px] h-[80px]">
      <svg viewBox="0 0 120 70" className="w-full h-full">
        {/* Background arc */}
        <path
          d="M 10 60 A 50 50 0 0 1 110 60"
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          className="text-muted"
        />
        {/* Progress arc */}
        <path
          d="M 10 60 A 50 50 0 0 1 110 60"
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${(Math.abs(clampedRate) / 100) * 157} 157`}
        />
        {/* Center text */}
        <text
          x="60"
          y="55"
          textAnchor="middle"
          className="fill-foreground font-bold text-xl"
          style={{ fontSize: '20px' }}
        >
          {rate}%
        </text>
        <text
          x="60"
          y="68"
          textAnchor="middle"
          className="fill-muted-foreground text-xs"
          style={{ fontSize: '8px' }}
        >
          Savings Rate
        </text>
      </svg>
    </div>
  );
}

interface BudgetProgressChartProps {
  data: BudgetData[];
  currency?: string;
}

export function BudgetProgressChart({ data, currency = 'INR' }: BudgetProgressChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-muted-foreground">
        No active budgets
      </div>
    );
  }

  const chartData = data.map(item => ({
    name: item.name.length > 12 ? item.name.substring(0, 12) + '...' : item.name,
    fullName: item.name,
    spent: Math.min(item.spent, item.budgetAmount),
    over: item.spent > item.budgetAmount ? item.spent - item.budgetAmount : 0,
    remaining: item.spent < item.budgetAmount ? item.budgetAmount - item.spent : 0,
    budgetAmount: item.budgetAmount,
    percentage: item.percentage,
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart 
        data={chartData} 
        layout="vertical" 
        margin={{ top: 5, right: 10, left: 5, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
        <XAxis 
          type="number" 
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
        />
        <YAxis 
          type="category" 
          dataKey="name"
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={70}
        />
        <Tooltip content={({ active, payload, label }) => (
          <BudgetTooltipContent 
            active={active} 
            payload={payload} 
            label={label} 
            data={data}
            currency={currency} 
          />
        )} />
        <Bar dataKey="spent" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} name="Spent" />
        <Bar dataKey="over" stackId="a" fill="#ef4444" radius={[0, 4, 4, 0]} name="Over Budget" />
      </BarChart>
    </ResponsiveContainer>
  );
}
