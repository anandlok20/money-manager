import mongoose from 'mongoose';

/**
 * Builds a MongoDB query filter that hides private items from other members.
 * - Primary users (not isMemberUser) see everything — returns empty object.
 * - Member users only see items where isPrivate is false/unset OR where
 *   privateMemberId matches their own memberId.
 */
export function buildPrivacyFilter(session: { isMemberUser?: boolean; memberId?: string }) {
  if (!session.isMemberUser || !session.memberId) return {};
  return {
    $or: [
      { isPrivate: { $ne: true } },
      { privateMemberId: new mongoose.Types.ObjectId(session.memberId) },
    ],
  };
}
