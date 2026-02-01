import { NextRequest, NextResponse } from 'next/server';
import { registerSchema } from '@/lib/validations/auth';
import { registerUser } from '@/lib/auth/config';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validatedData = registerSchema.parse(body);

    // Register user
    const user = await registerUser(
      validatedData.name,
      validatedData.email,
      validatedData.password
    );

    return NextResponse.json(
      {
        success: true,
        data: user,
        message: 'User registered successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);

    if (error instanceof Error) {
      if (error.message === 'User with this email already exists') {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 409 }
        );
      }

      // Zod validation error
      if (error.name === 'ZodError') {
        return NextResponse.json(
          { success: false, error: 'Validation failed', details: error },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { success: false, error: 'An error occurred during registration' },
      { status: 500 }
    );
  }
}
