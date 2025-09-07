# LoreWeave 🧵

A Reddit Devvit Web app for collaborative branching micro-fiction. Users write short "shards" (200-300 characters) to build a branching story tree, with daily constraints and automatic canonization.

## Features

- **Interactive Story Tree**: Browse shards by popularity (Top) or recency (Recent)
- **Daily RuleCard**: Constraints change daily (banned words, required tags, style)
- **Real-time Updates**: New shards and votes appear instantly
- **Automatic Canonization**: Daily at 23:50 BRT, the best path becomes canonical
- **Moderator Tools**: Hide/unhide shards, freeze nodes
- **Rate Limiting**: 2 shards per hour per user
- **First Post Review**: New users' first shard queued for mod review

## Quick Start

### Prerequisites

- Node.js 16+ 
- Reddit account with Devvit access
- Test subreddit for development

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd loreweave

# Install dependencies
npm install

# Start development server
npm run dev
```

### Deploy to Reddit

```bash
# Build the app
npm run build

# Install to your test subreddit
devvit install <your-subreddit>
```

### Create Your First Story

1. Go to your subreddit
2. Create a new post
3. Select "LoreWeave" from the post type dropdown
4. The first chapter will initialize automatically

## Architecture

### Tech Stack

- **Platform**: Reddit Devvit Web
- **Language**: TypeScript
- **Frontend**: React (no heavy UI libraries)
- **Backend**: Node.js runtime
- **Data**: Devvit Redis only
- **Real-time**: Devvit Realtime channels (no WebSockets)

### Key Components

```
src/
├── server/           # Backend API and logic
│   ├── index.ts      # Main server entry point
│   ├── redis.ts      # Redis wrapper and data models
│   ├── validation.ts # RuleCard validation logic
│   ├── canonize.ts   # Daily canonization algorithm
│   └── auth.ts       # Authentication helpers
├── webview/          # Frontend React app
│   ├── App.tsx       # Main app component
│   ├── components/   # React components
│   └── lib/          # Client utilities
├── devvit.json       # Devvit configuration
└── package.json      # Dependencies and scripts
```

### Data Model (Redis)

```
story:current                    -> { id, chapter, ruleCard, endsAtISO }
story:{id}:meta                  -> { title, createdAtISO, subreddit, authorName }
story:{id}:rule                  -> { bannedWords[], requiredTags[], styleTag }
story:{id}:root                  -> shardId

shard:{id}                       -> { storyId, parentId, text, authorName, authorId, tsISO, votes, hidden, frozen, violations[] }
shard:{id}:children              -> [childShardIds...]

story:{id}:byVotes               -> zset (score -> shardId)
story:{id}:byTime                -> zset (ts -> shardId)

user:{name}:rate:{date:YYYYMMDD} -> integer (count)
```

## API Reference

### Shard Management

**Create Shard**
```
POST /api/shard.create
{
  storyId: string,
  parentId: string | null,
  text: string
}
```

**Vote on Shard**
```
POST /api/shard.vote
{
  storyId: string,
  shardId: string,
  dir: 1 | -1
}
```

**Get Story State**
```
GET /api/story.state?storyId={id}&tab={top|recent}&cursor={cursor}&limit={limit}
```

### Moderation

**Hide/Unhide Shard**
```
POST /api/mod.hide
{
  storyId: string,
  shardId: string,
  hidden: boolean
}
```

**Freeze/Unfreeze Shard**
```
POST /api/mod.freeze
{
  storyId: string,
  shardId: string,
  frozen: boolean
}
```

## Daily Canonization Algorithm

At 23:50 BRT daily, the system:

1. **Builds all paths** from root to leaves
2. **Scores each path** using:
   ```
   F(path) = 0.5*votesNorm + 0.3*novelty + 0.2*diversity - 0.15*violations
   ```
   - `votesNorm`: Normalized total votes
   - `novelty`: Unique token ratio across the path
   - `diversity`: Number of distinct authors / path length
   - `violations`: RuleCard violations count

3. **Selects best path** and composes canonical text
4. **Posts new chapter** as interactive post
5. **Updates story:current** to new chapter

## RuleCard System

Daily constraints include:

- **Banned Words**: Case-insensitive token matching
- **Required Tags**: Must include at least one
- **Style Tag**: Descriptive hint (not enforced)
- **Length**: 200-300 characters

Example RuleCards rotate daily:
```typescript
{
  bannedWords: ['suddenly', 'then', 'just'],
  requiredTags: ['compass', 'key', 'note'],
  styleTag: 'noir-reportage'
}
```

## Development

### Local Development

```bash
# Start development server
npm run dev

# Run tests
npm test

# Lint code
npm run lint

# Type check
npm run typecheck
```

### Testing

The app includes basic validation for:
- RuleCard constraint enforcement
- Rate limiting
- Canonization algorithm
- Real-time updates

### Configuration

Key settings in `src/server/index.ts`:
```typescript
const RATE_LIMIT_PER_HOUR = 2;
const MOD_REVIEW_ENABLED = true;
```

## Deployment Considerations

### Performance

- Redis operations are atomic for vote counting
- Pagination uses zset cursors for efficiency
- Real-time updates minimize bandwidth with minimal payloads

### Security

- All validation happens server-side
- Rate limiting prevents spam
- Moderator actions require authentication
- Profanity filtering on submissions

### Monitoring

- Canonization job logs to console
- Error boundaries in React components
- Rate limit violations tracked per user

## Decision Log

### Architecture Decisions

1. **Redis-only storage**: Simplifies deployment, meets Devvit constraints
2. **No external dependencies**: Keeps bundle size minimal
3. **Atomic operations**: Prevents race conditions in voting
4. **Zset pagination**: Efficient for large shard counts
5. **Client-side validation**: Immediate feedback, server-side enforcement

### UX Decisions

1. **Two-tab browsing**: Top/Recent provides different discovery modes
2. **Live validation**: Real-time RuleCard feedback while typing
3. **Character counter**: Visual feedback for length constraints
4. **Continue button**: Clear call-to-action for branching
5. **Timer display**: Shows daily cutoff urgency

### Algorithm Choices

1. **Weighted scoring**: Balances popularity, creativity, diversity
2. **Novelty calculation**: Token-based to avoid common words
3. **Diversity scoring**: Author variety prevents single-user dominance
4. **Penalty system**: Transparent violation consequences
5. **Path selection**: Root-to-leaf ensures narrative coherence

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with tests
4. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- Check existing GitHub issues
- Create a new issue with reproduction steps
- Include environment details (Node version, Devvit version)

---

**Built with ❤️ for the Reddit community**