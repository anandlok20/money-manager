import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { connectToDatabase } from '@/lib/mongodb/client';
import Transaction from '@/lib/mongodb/models/Transaction';

// Maximum file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    await connectToDatabase();

    // Verify transaction belongs to user
    const transaction = await Transaction.findOne({
      _id: id,
      userId: session.user.id,
    });

    if (!transaction) {
      return NextResponse.json(
        { success: false, error: 'Transaction not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { file, fileName, fileType } = body;

    if (!file || !fileName || !fileType) {
      return NextResponse.json(
        { success: false, error: 'File, fileName, and fileType are required' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(fileType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Allowed: JPEG, PNG, GIF, WebP, PDF' },
        { status: 400 }
      );
    }

    // Check file size (base64 is ~33% larger than binary)
    const base64Data = file.split(',')[1] || file;
    const fileSize = (base64Data.length * 3) / 4;
    if (fileSize > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: 'File too large. Maximum size: 5MB' },
        { status: 400 }
      );
    }

    // Update transaction with receipt
    transaction.receiptUrl = file;
    transaction.receiptFileName = fileName;
    await transaction.save();

    return NextResponse.json({
      success: true,
      data: {
        receiptUrl: file,
        receiptFileName: fileName,
      },
    });
  } catch (error) {
    console.error('Error uploading receipt:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload receipt' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    await connectToDatabase();

    const transaction = await Transaction.findOneAndUpdate(
      { _id: id, userId: session.user.id },
      { $unset: { receiptUrl: 1, receiptFileName: 1 } },
      { new: true }
    );

    if (!transaction) {
      return NextResponse.json(
        { success: false, error: 'Transaction not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Receipt removed successfully',
    });
  } catch (error) {
    console.error('Error removing receipt:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to remove receipt' },
      { status: 500 }
    );
  }
}
