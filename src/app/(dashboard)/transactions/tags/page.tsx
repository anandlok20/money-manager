'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  Tag,
  Search,
  Plus,
  ArrowUpRight,
  TrendingUp,
  Filter,
  BarChart3,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatCurrency } from '@/lib/utils/currency';

interface TagData {
  tag: string;
  count: number;
}

interface TagStats {
  tag: string;
  count: number;
  totalAmount: number;
  lastUsed?: string;
}

async function fetchTags(): Promise<TagData[]> {
  const response = await fetch('/api/transactions/tags');
  if (!response.ok) throw new Error('Failed to fetch tags');
  const result = await response.json();
  return result.data || [];
}

// Color palette for tags
const tagColors = [
  'bg-blue-500/10 text-blue-600 hover:bg-blue-500/20',
  'bg-green-500/10 text-green-600 hover:bg-green-500/20',
  'bg-purple-500/10 text-purple-600 hover:bg-purple-500/20',
  'bg-orange-500/10 text-orange-600 hover:bg-orange-500/20',
  'bg-pink-500/10 text-pink-600 hover:bg-pink-500/20',
  'bg-cyan-500/10 text-cyan-600 hover:bg-cyan-500/20',
  'bg-amber-500/10 text-amber-600 hover:bg-amber-500/20',
  'bg-rose-500/10 text-rose-600 hover:bg-rose-500/20',
  'bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500/20',
  'bg-teal-500/10 text-teal-600 hover:bg-teal-500/20',
];

function getTagColor(index: number) {
  return tagColors[index % tagColors.length];
}

export default function TagsPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: tags = [], isLoading, error } = useQuery({
    queryKey: ['transaction-tags'],
    queryFn: fetchTags,
  });

  const filteredTags = tags.filter((tag) =>
    tag.tag.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalTransactions = tags.reduce((sum, tag) => sum + tag.count, 0);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-destructive">Failed to load tags</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Transaction Tags</h1>
          <p className="text-muted-foreground">
            Organize and filter your transactions by tags
          </p>
        </div>
        <Button asChild>
          <Link href="/transactions/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Transaction
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tags</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tags.length}</div>
            <p className="text-xs text-muted-foreground">unique tags used</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tagged Transactions</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTransactions}</div>
            <p className="text-xs text-muted-foreground">transactions with tags</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Most Used Tag</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tags[0]?.tag || 'None'}
            </div>
            <p className="text-xs text-muted-foreground">
              {tags[0]?.count ? `${tags[0].count} transactions` : 'No tags yet'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search tags..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tags Grid */}
      <Card>
        <CardHeader>
          <CardTitle>All Tags</CardTitle>
          <CardDescription>
            Click on a tag to view all transactions with that tag
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredTags.length === 0 ? (
            <EmptyState
              icon={Tag}
              title={searchQuery ? 'No matching tags' : 'No tags yet'}
              description={
                searchQuery
                  ? 'Try a different search term'
                  : 'Add tags to your transactions to organize them better'
              }
              actionLabel={!searchQuery ? 'Add Transaction' : undefined}
              onAction={!searchQuery ? () => window.location.href = '/transactions/new' : undefined}
            />
          ) : (
            <div className="space-y-6">
              {/* Tag Cloud */}
              <div className="flex flex-wrap gap-3">
                {filteredTags.map((tag, index) => (
                  <Link
                    key={tag.tag}
                    href={`/transactions?tag=${encodeURIComponent(tag.tag)}`}
                    className="group"
                  >
                    <Badge
                      variant="secondary"
                      className={`px-4 py-2 text-sm cursor-pointer transition-all ${getTagColor(index)} group-hover:scale-105`}
                    >
                      <Tag className="h-3 w-3 mr-1.5" />
                      {tag.tag}
                      <span className="ml-2 text-xs opacity-70">({tag.count})</span>
                      <ArrowUpRight className="h-3 w-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Badge>
                  </Link>
                ))}
              </div>

              {/* Tag List */}
              <div className="border-t pt-6">
                <h3 className="text-sm font-medium mb-4">Tag Details</h3>
                <div className="space-y-2">
                  {filteredTags.map((tag, index) => (
                    <Link
                      key={tag.tag}
                      href={`/transactions?tag=${encodeURIComponent(tag.tag)}`}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-md ${getTagColor(index).split(' ')[0]}`}>
                          <Tag className={`h-4 w-4 ${getTagColor(index).split(' ')[1]}`} />
                        </div>
                        <div>
                          <p className="font-medium">{tag.tag}</p>
                          <p className="text-xs text-muted-foreground">
                            {tag.count} transaction{tag.count !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <span className="text-sm">View transactions</span>
                        <ArrowUpRight className="h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Tips</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>• Add tags to transactions to organize them by project, event, or any custom category.</p>
          <p>• Tags work alongside categories to give you more granular control over your finances.</p>
          <p>• Common use cases: &ldquo;vacation&rdquo;, &ldquo;work expense&rdquo;, &ldquo;home renovation&rdquo;, &ldquo;birthday&rdquo;</p>
          <p>• You can filter transactions by tag in the transactions page.</p>
        </CardContent>
      </Card>
    </div>
  );
}
