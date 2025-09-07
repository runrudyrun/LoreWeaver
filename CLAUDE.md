# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Run linting
npm run lint

# Type checking
npm run typecheck

# Run tests
npm test
```

## Architecture Overview

LoreWeave is a Reddit Devvit Web app that creates collaborative branching micro-fiction stories with daily constraints.

### Core Flow
1. **Story Lifecycle**: Daily chapters (23:50 BRT cutoff) → Canonization → New chapter post
2. **Shard Creation**: Users write 200-300 character "shards" following RuleCard constraints
3. **Branching**: Shards can be root nodes or continue from existing shards
4. **Voting**: Community votes shape which paths become popular
5. **Canonization**: Algorithm selects best path using weighted scoring (votes + novelty + diversity - penalties)

### Key Architectural Decisions

**Redis-Only Storage**: All data stored in Devvit Redis with structured keys:
- `story:current` → Active story metadata
- `shard:{id}` → Individual shard data with votes, violations, etc.
- `story:{id}:byVotes` → ZSET for popularity ranking
- `user:{name}:rate:{date}` → Rate limiting per user

**Atomic Operations**: Vote counting and rate limiting use Redis atomic operations to prevent race conditions

**Path Scoring Algorithm**: `F(path) = 0.5*votesNorm + 0.3*novelty + 0.2*diversity - 0.15*violations`

**Real-time Updates**: Uses Devvit Realtime channels (`story:{id}`) for live shard creation and vote updates

### File Organization

**Backend (`src/server/`)**:
- `index.ts` - Devvit handlers and API endpoints
- `redis.ts` - Redis wrapper with typed operations
- `validation.ts` - RuleCard constraint validation
- `canonize.ts` - Daily canonization algorithm
- `auth.ts` - Moderator authentication
- `types.ts` - Shared TypeScript interfaces

**Frontend (`src/webview/`)**:
- `App.tsx` - Main React component with story state management
- `components/` - RuleCard, ShardList, ShardComposer components
- `lib/` - API client, validation, realtime utilities

### Critical Implementation Details

**RuleCard Validation**: Both client-side (immediate feedback) and server-side (authoritative) validation for:
- Banned words (case-insensitive token matching)
- Required tags (must include at least one)
- Length constraints (200-300 characters)
- Profanity filtering

**Rate Limiting**: 2 shards per hour per user, tracked by `user:{name}:rate:{date}` with 25-hour TTL

**Moderation**: First shard from new users hidden for review when `MOD_REVIEW_ENABLED = true`

**Scheduled Job**: Daily at 23:50 BRT (America/Sao_Paulo timezone), `canonizeAndPost()` runs automatically

**Devvit Configuration**: See `devvit.json` for permissions (redis, realtime) and scheduled job setup

### API Endpoints

All endpoints use Devvit handler pattern:
- `POST /api/shard.create` - Create new shard with validation
- `POST /api/shard.vote` - Vote on shard (atomic vote counting)
- `GET /api/story.state` - Get paginated shards (top/recent)
- `POST /api/mod.hide` - Moderator hide/unhide (requires mod role)
- `POST /api/mod.freeze` - Moderator freeze/unfreeze (requires mod role)

### Development Tips

- Use `RedisWrapper` class for all Redis operations - it provides typed methods and handles serialization
- Realtime events should be minimal - only include necessary data for UI updates
- Canonization algorithm builds all root-to-leaf paths then scores them - be mindful of performance with large trees
- Always validate RuleCard constraints server-side even if client-side validation passes
- Rate limiting uses date-based keys that auto-expire after 25 hours