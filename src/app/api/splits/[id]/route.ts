import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { connectToDatabase } from '@/lib/mongodb/client';
import SplitExpense, { SplitStatus } from '@/lib/mongodb/models/SplitExpense';
import { updateSplitSchema } from '@/lib/validations/split';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await connectToDatabase();

    const split = await SplitExpense.findOne({ _id: id, userId: session.user.id })
      .populate('transactionId', 'note dateTime amount categoryId sourceBankId sourceCardId type')
      .populate('splits.memberId', 'name type')
      .lean();

    if (!split) {
      return NextResponse.json({ success: false, error: 'Split not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: { ...split, _id: split._id.toString() } });
  } catch (error) {
    console.error('Error fetching split:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch split' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const validatedData = updateSplitSchema.parse(body);

    await connectToDatabase();

    const splitExpense = await SplitExpense.findOne({ _id: id, userId: session.user.id });
    if (!splitExpense) {
      return NextResponse.json({ success: false, error: 'Split not found' }, { status: 404 });
    }

    // Prevent editing if any item is already settled
    const hasSettled = splitExpense.splits.some((s) => s.status === SplitStatus.SETTLED);
    if (hasSettled) {
      return NextResponse.json(
        { success: false, error: 'Cannot edit a split that has settled items' },
        { status: 400 }
      );
    }

    // Apply updates to matching split items
    for (const update of validatedData.splits) {
      const item = splitExpense.splits.find((s) => s._id.toString() === update._id);
      if (item) {
        if (update.name !== undefined) item.name = update.name;
        if (update.amount !== undefined) item.amount = update.amount;
      }
    }

    // Recompute yourShare
    const splitsTotal = splitExpense.splits.reduce((sum, s) => sum + s.amount, 0);
    splitExpense.yourShare = Math.max(0, splitExpense.totalAmount - splitsTotal);

    await splitExpense.save();

    return NextResponse.json({ success: true, data: splitExpense });
  } catch (error) {
    console.error('Error updating split:', error);
    return NextResponse.json({ success: false, error: 'Failed to update split' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await connectToDatabase();

    const split = await SplitExpense.findOne({ _id: id, userId: session.user.id });
    if (!split) {
      return NextResponse.json({ success: false, error: 'Split not found' }, { status: 404 });
    }

    const hasSettled = split.splits.some((s) => s.status === SplitStatus.SETTLED);
    if (hasSettled) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete a split that has settled items' },
        { status: 400 }
      );
    }

    await SplitExpense.findByIdAndDelete(id);
    return NextResponse.json({ success: true, message: 'Split deleted' });
  } catch (error) {
    console.error('Error deleting split:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete split' }, { status: 500 });
  }
}
