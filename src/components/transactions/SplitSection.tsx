'use client';

import { useState } from 'react';
import { Plus, X, UserPlus, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils/currency';

export interface SplitParticipant {
  id: string; // local UUID for React key
  mode: 'saved' | 'manual';
  memberId?: string;
  name: string;
  amount: number;
}

interface Member {
  _id: string;
  name: string;
}

interface SplitSectionProps {
  totalAmount: number;
  members: Member[];
  participants: SplitParticipant[];
  onParticipantsChange: (updated: SplitParticipant[]) => void;
}

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

export function SplitSection({ totalAmount, members, participants, onParticipantsChange }: SplitSectionProps) {
  const [memberSelectValues, setMemberSelectValues] = useState<Record<string, string>>({});

  const splitsTotal = participants.reduce((sum, p) => sum + (p.amount || 0), 0);
  const yourShare = totalAmount - splitsTotal;
  const isOverTotal = yourShare < -0.01;

  function addParticipant() {
    onParticipantsChange([
      ...participants,
      { id: generateId(), mode: 'manual', name: '', amount: 0 },
    ]);
  }

  function removeParticipant(id: string) {
    onParticipantsChange(participants.filter((p) => p.id !== id));
  }

  function updateParticipant(id: string, updates: Partial<SplitParticipant>) {
    onParticipantsChange(
      participants.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  }

  function handleMemberSelect(participantId: string, value: string) {
    setMemberSelectValues((prev) => ({ ...prev, [participantId]: value }));
    if (value === '__manual__') {
      updateParticipant(participantId, { mode: 'manual', memberId: undefined, name: '' });
    } else {
      const member = members.find((m) => m._id === value);
      if (member) {
        updateParticipant(participantId, { mode: 'saved', memberId: member._id, name: member.name });
      }
    }
  }

  return (
    <div className="space-y-3 pt-2">
      {participants.length === 0 ? (
        <div className="text-center py-4 border border-dashed rounded-lg">
          <UserPlus className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No participants yet. Add people to split with.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {participants.map((participant) => (
            <div key={participant.id} className="flex gap-2 items-start p-3 border rounded-lg bg-muted/20">
              <div className="flex-1 space-y-2">
                {/* Member selector */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Person</Label>
                    {members.length > 0 ? (
                      <Select
                        value={memberSelectValues[participant.id] || (participant.mode === 'saved' && participant.memberId ? participant.memberId : '__manual__')}
                        onValueChange={(v) => handleMemberSelect(participant.id, v)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Select or enter name" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__manual__">
                            <span className="flex items-center gap-1.5">
                              <User className="h-3.5 w-3.5" />
                              Enter manually
                            </span>
                          </SelectItem>
                          {members.map((m) => (
                            <SelectItem key={m._id} value={m._id}>
                              {m.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : null}
                    {/* Manual name input */}
                    {(participant.mode === 'manual' || members.length === 0) && (
                      <Input
                        className="h-8 text-xs mt-1"
                        placeholder="Name (e.g. Rahul)"
                        value={participant.name}
                        onChange={(e) => updateParticipant(participant.id, { name: e.target.value })}
                      />
                    )}
                    {participant.mode === 'saved' && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">{participant.name}</p>
                    )}
                  </div>

                  {/* Amount */}
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Their share (₹)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="any"
                      className="h-8 text-xs"
                      placeholder="0"
                      value={participant.amount || ''}
                      onChange={(e) =>
                        updateParticipant(participant.id, { amount: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Remove */}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 mt-5 shrink-0"
                onClick={() => removeParticipant(participant.id)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={addParticipant}>
        <Plus className="h-3.5 w-3.5" />
        Add Person
      </Button>

      {/* Summary */}
      {participants.length > 0 && totalAmount > 0 && (
        <div className="rounded-lg border bg-muted/30 p-3 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Others' total</span>
            <span>{formatCurrency(splitsTotal)}</span>
          </div>
          <div className="flex justify-between font-medium">
            <span>Your share</span>
            <span className={isOverTotal ? 'text-destructive' : 'text-emerald-600'}>
              {isOverTotal ? `−${formatCurrency(Math.abs(yourShare))} over` : formatCurrency(yourShare)}
            </span>
          </div>
          {isOverTotal && (
            <p className="text-xs text-destructive pt-1">
              Split amounts exceed the total. Reduce shares or increase the transaction amount.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
