import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { connectToDatabase } from '@/lib/mongodb/client';
import Member from '@/lib/mongodb/models/Member';
import { memberSchema } from '@/lib/validations/member';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';

    const query: Record<string, unknown> = { userId: session.user.id };
    if (!includeInactive) {
      query.isActive = true;
    }

    const members = await Member.find(query)
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: members.map((m) => ({ ...m, _id: m._id.toString() })),
    });
  } catch (error) {
    console.error('Error fetching members:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch members' },
      { status: 500 }
    );
  }
}

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
    const validatedData = memberSchema.parse(body);

    await connectToDatabase();

    // Convert null dateOfBirth to undefined for MongoDB
    const memberData = {
      ...validatedData,
      dateOfBirth: validatedData.dateOfBirth ?? undefined,
      userId: session.user.id,
      isActive: true,
    };

    const member = await Member.create(memberData);

    return NextResponse.json(
      {
        success: true,
        data: { ...member.toObject(), _id: member._id.toString() },
        message: 'Member created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating member:', error);

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create member' },
      { status: 500 }
    );
  }
}
