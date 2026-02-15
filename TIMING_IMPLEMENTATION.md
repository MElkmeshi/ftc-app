# Match Timing Implementation - FTC Live Based

## Summary

Implemented configurable match timing system based on FTC Live's approach, with all timing values stored in Laravel settings instead of hardcoded.

## Changes Made

### 1. Laravel Configuration (`config/competition.php`)

Created new configuration file with:
- **Timing settings**: All durations (pre-match countdown, autonomous, transition, teleop, endgame warning, etc.)
- **Sound mappings**: Maps sound events to FTC Live audio files
- **Environment-based**: Can be overridden via `.env` variables

**Default FTC Standard Timing:**
- Pre-match countdown: 3 seconds
- Autonomous: 30 seconds
- Transition: 8 seconds
- Teleop: 120 seconds (2 minutes)
- **Total match: 158 seconds (2:38)**
- **Total with countdown: 161 seconds (2:41)**

### 2. API Endpoint (`/api/dashboard/config`)

Added new endpoint in `DashboardController` that returns:
- All timing configuration
- Calculated total durations
- Sound file mappings

### 3. Audio Files (FTC Live Sounds)

Copied and renamed FTC Live official audio files:
- `countdown.wav` - 3-2-1 countdown (plays at 2:41 → 2:38)
- `match_start_whistle.wav` - Match start (at 2:38)
- `auto_end_ftc.wav` - End of autonomous (at 2:08)
- `controllers_pickup.wav` - Pick up controllers (at 2:06)
- `endgame_whistle.wav` - Endgame warning (at 0:20)
- `end_match.wav` - Match end (at 0:00)
- `abort_match.wav` - Match cancelled

### 4. Timer Hook (`use-match-timer.ts`)

**Complete rewrite based on FTC Live approach:**

#### Key Changes:
1. **Countdown Timer Logic** (like FTC Live)
   - Timer counts DOWN from total duration
   - Sound cues based on REMAINING time, not elapsed
   - Ensures sounds play at exact moments

2. **Pre-Match Countdown**
   - Adds 3-second countdown before match starts
   - Countdown sound plays at 2:41
   - Match actually starts at 2:38 remaining

3. **Sound Timing (FTC Live standard):**
   ```
   2:41 → countdown.wav (3-2-1)
   2:38 → match_start_whistle.wav (whistle)
   2:08 → auto_end_ftc.wav (end autonomous)
   2:06 → controllers_pickup.wav (pick up controllers)
   2:00 → (start teleop - silent transition)
   0:20 → endgame_whistle.wav (endgame warning)
   0:00 → end_match.wav (match end)
   ```

4. **Dynamic Configuration**
   - Accepts timing config from API
   - Falls back to FTC defaults if config not loaded
   - All timing calculations use config values

### 5. Audio Engine (`use-audio-engine.ts`)

**Added FTC Live audio techniques:**

1. **Silent Audio Loop**
   - Creates continuous silent buffer playing in loop
   - Keeps AudioContext active and unlocked
   - Prevents browser from suspending audio
   - This is CRITICAL for instant sound playback

2. **Updated Sound Files**
   - Added all FTC Live sound files
   - Maintains backward compatibility with old sounds

### 6. Config Hook (`use-match-config.ts`)

New hook to fetch configuration from API:
- Loads timing config on mount
- Provides loading/error states
- Used by all components that need timing

### 7. Component Updates

Updated both display components to use dynamic config:
- `match-control.tsx` - Referee control panel
- `match-overlay.tsx` - Public display overlay

## How It Works Now

1. **On page load:**
   - `useMatchConfig()` fetches timing from `/api/dashboard/config`
   - Configuration loaded from `config/competition.php`

2. **When match starts:**
   - Timer begins at 0 elapsed / 2:41 remaining
   - Countdown sound plays at 0:03 elapsed (2:41 remaining)
   - Match start sound plays at 0:06 elapsed (2:38 remaining)
   - All subsequent sounds play at exact remaining times

3. **Audio system:**
   - Silent loop keeps AudioContext active
   - Sounds pre-loaded as HTMLAudioElements
   - User interaction unlocks audio if needed
   - Sounds play instantly when triggered

## Configuration

To customize timing, edit `.env`:

```env
# Match timing (all in seconds)
MATCH_PRE_COUNTDOWN=3
MATCH_AUTONOMOUS_DURATION=30
MATCH_TRANSITION_DURATION=8
MATCH_TELEOP_DURATION=120
MATCH_ENDGAME_WARNING=20
MATCH_CONTROLLERS_WARNING_OFFSET=2

# Enable/disable sounds
MATCH_SOUNDS_ENABLED=true
```

Or edit `config/competition.php` directly.

## Key Differences from FTC Live

### What We Kept:
- ✅ Countdown timer approach (remaining time)
- ✅ Sound timing based on remaining seconds
- ✅ Silent audio loop technique
- ✅ Pre-match countdown
- ✅ Exact sound timing (2:41, 2:38, 2:08, etc.)
- ✅ Official FTC Live audio files

### What We Improved:
- ✅ **Configurable via Laravel settings** (FTC Live is hardcoded)
- ✅ **Environment variable support**
- ✅ **Cleaner TypeScript implementation**
- ✅ **Better error handling**
- ✅ **React hooks architecture**

## Testing

1. **Test countdown:**
   - Load a match
   - Press Start
   - Should hear countdown at 2:41
   - Match start whistle at 2:38

2. **Test phase transitions:**
   - Verify autonomous ends at 2:08
   - Controllers sound at 2:06
   - Endgame warning at 0:20
   - Match end at 0:00

3. **Test resume:**
   - Start match
   - Refresh page
   - Timer should resume correctly
   - Sounds should not replay if already past

## Files Changed

**Backend:**
- `config/competition.php` (new)
- `app/Http/Controllers/Api/DashboardController.php`
- `routes/web.php`

**Frontend:**
- `resources/js/hooks/use-match-timer.ts` (complete rewrite)
- `resources/js/hooks/use-match-config.ts` (new)
- `resources/js/hooks/use-audio-engine.ts`
- `resources/js/pages/referee/match-control.tsx`
- `resources/js/pages/display/match-overlay.tsx`

**Audio:**
- `public/sounds/*.wav` (FTC Live official files)

## Troubleshooting

**No sound on first load:**
- Browser autoplay restrictions require user interaction
- Click anywhere on the page to unlock audio
- Silent loop will keep it unlocked afterward

**Wrong timing:**
- Check `config/competition.php`
- Verify API returns correct values: `/api/dashboard/config`
- Check browser console for timing logs

**Sounds play late:**
- Ensure AudioContext is running (check console)
- Verify silent loop is active
- Check network tab for sound file loading
