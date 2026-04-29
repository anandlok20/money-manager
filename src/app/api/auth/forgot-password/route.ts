import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { Resend } from 'resend';
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

    const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Money Manager';
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    // Send email via Resend if configured
    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const fromEmail = process.env.RESEND_FROM_EMAIL || `noreply@${new URL(baseUrl).hostname}`;

      await resend.emails.send({
        from: `${appName} <${fromEmail}>`,
        to: user.email,
        subject: `Reset Your Password — ${appName}`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
            <h2>Reset Your Password</h2>
            <p>Hi ${user.name},</p>
            <p>You requested to reset your password. Click the button below to set a new password:</p>
            <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:6px;margin:16px 0">
              Reset Password
            </a>
            <p style="color:#6b7280;font-size:14px">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
            <p style="color:#9ca3af;font-size:12px">If the button doesn't work, copy this link: ${resetUrl}</p>
          </div>
        `,
      });
    } else if (process.env.NODE_ENV === 'development') {
      // Only log in development when email service is not configured
      console.info('[DEV] Password Reset Link:', resetUrl);
    }

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
