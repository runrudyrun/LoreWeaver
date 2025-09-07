import { Devvit } from '@devvit/public-api';

export function isModerator(context: Devvit.Context): boolean {
  // Check if user is a moderator of the subreddit
  // This is a simplified check - in production, you'd want to verify against Reddit's API
  const user = context.userId;
  const subreddit = context.subredditName;
  
  // For now, we'll assume moderators are identified by a specific role or user ID
  // In a real implementation, you'd query Reddit's API to check moderator status
  return context.kvStore.get(`mod:${subreddit}:${user}`) !== undefined;
}

export function getUserIdentifier(context: Devvit.Context): string {
  return context.userId || 'anonymous';
}

export function getUserName(context: Devvit.Context): string {
  return context.userId || 'anonymous';
}

export function requireModerator(context: Devvit.Context): void {
  if (!isModerator(context)) {
    throw new Error('Moderator access required');
  }
}

export function requireAuthenticated(context: Devvit.Context): void {
  if (!context.userId) {
    throw new Error('Authentication required');
  }
}