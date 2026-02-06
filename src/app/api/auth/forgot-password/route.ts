import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { connectToDatabase } from '@/lib/mongodb/client';
import User from '@/lib/mongodb/models/User';
import PasswordResetToken from '@/lib/mongodb/models/PasswordResetToken';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, you will receive reset instructions.',
      });
    }

    // Delete any existing tokens for this user
    await PasswordResetToken.deleteMany({ userId: user._id });

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Save hashed token to database
    await PasswordResetToken.create({
      userId: user._id,
      token: tokenHash,
      expiresAt,
      used: false,
    });

    // In a production app, you would send an email here
    // For now, we'll log the reset URL (for development)
    const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`;
    
    console.log('=================================');
    console.log('Password Reset Link (DEV MODE):');
    console.log(resetUrl);
    console.log('=================================');

    // TODO: Integrate with an email service like:
    // - Resend
    // - SendGrid
    // - AWS SES
    // - Nodemailer with SMTP
    
    // Example email sending (commented out):
    // await sendEmail({
    //   to: user.email,
    //   subject: 'Reset Your Password - Money Manager',
    //   html: `
    //     <h1>Reset Your Password</h1>
    //     <p>Hi ${user.name},</p>
    //     <p>You requested to reset your password. Click the link below to set a new password:</p>
    //     <a href="${resetUrl}">Reset Password</a>
    //     <p>This link will expire in 1 hour.</p>
    //     <p>If you didn't request this, you can safely ignore this email.</p>
    //   `,
    // });

    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, you will receive reset instructions.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
