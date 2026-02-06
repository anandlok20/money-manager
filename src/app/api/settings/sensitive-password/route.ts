import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { authOptions } from '@/lib/auth/config';
import { connectToDatabase } from '@/lib/mongodb/client';
import User from '@/lib/mongodb/models/User';

const setPasswordSchema = z.object({
  password: z.string().min(4, 'Password must be at least 4 characters').max(32),
});

const verifyPasswordSchema = z.object({
  password: z.string().min(1, 'Password is required'),
});

// GET - Check if sensitive password is set
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectToDatabase();

    const user = await User.findById(session.user.id).select('sensitiveDataPasswordHash').lean();
    
    return NextResponse.json({
      success: true,
      data: {
        isSet: !!user?.sensitiveDataPasswordHash,
      },
    });
  } catch (error) {
    console.error('Error checking sensitive password:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check sensitive password status' },
      { status: 500 }
    );
  }
}

// POST - Set or update sensitive password
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { password } = setPasswordSchema.parse(body);

    await connectToDatabase();

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update user
    await User.findByIdAndUpdate(session.user.id, {
      sensitiveDataPasswordHash: hashedPassword,
    });

    return NextResponse.json({
      success: true,
      message: 'Sensitive data password set successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error('Error setting sensitive password:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to set sensitive password' },
      { status: 500 }
    );
  }
}

// PUT - Verify sensitive password (returns a temporary token)
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { password } = verifyPasswordSchema.parse(body);

    await connectToDatabase();

    const user = await User.findById(session.user.id).select('sensitiveDataPasswordHash').lean();

    if (!user?.sensitiveDataPasswordHash) {
      return NextResponse.json(
        { success: false, error: 'Sensitive password not set' },
        { status: 400 }
      );
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.sensitiveDataPasswordHash);

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Incorrect password' },
        { status: 401 }
      );
    }

    // Generate a simple time-based token (valid for 5 minutes)
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
    const token = Buffer.from(`${session.user.id}:${expiresAt}`).toString('base64');

    return NextResponse.json({
      success: true,
      data: {
        token,
        expiresAt,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error('Error verifying sensitive password:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to verify password' },
      { status: 500 }
    );
  }
}

// DELETE - Remove sensitive password
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectToDatabase();

    await User.findByIdAndUpdate(session.user.id, {
      $unset: { sensitiveDataPasswordHash: 1 },
    });

    return NextResponse.json({
      success: true,
      message: 'Sensitive data password removed',
    });
  } catch (error) {
    console.error('Error removing sensitive password:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to remove sensitive password' },
      { status: 500 }
    );
  }
}
