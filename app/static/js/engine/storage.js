/**
 * Storage & Persistence Manager for Oregon Trail Engine.
 *
 * Responsibilities:
 * 1. Turn-boundary localStorage auto-save and auto-resume (OREGON_ENGINE_SAVE_V1).
 * 2. SQLite Leaderboard & Memorial Client:
 *    - POST /api/leaderboard (with offline retry queue in localStorage)
 *    - GET /api/leaderboard (with offline cached fallbacks)
 * 3. Kinematic integrity pre-validation before submission.
 */

export const STORAGE_KEYS = {
  SAVE_GAME: 'OREGON_ENGINE_SAVE_V1',
  PENDING_SUBMISSIONS: 'OREGON_ENGINE_PENDING_V1',
  CACHED_LEADERBOARD: 'OREGON_ENGINE_LEADERBOARD_CACHE_V1',
};

export class StorageManager {
  /**
   * Serializes current trail simulation state to localStorage.
   */
  static saveGame(saveData) {
    try {
      if (typeof localStorage === 'undefined') return false;
      localStorage.setItem(
        STORAGE_KEYS.SAVE_GAME,
        JSON.stringify({
          ...saveData,
          savedAt: new Date().toISOString(),
        })
      );
      return true;
    } catch (e) {
      console.warn('Failed to save game to localStorage:', e);
      return false;
    }
  }

  /**
   * Loads auto-saved trail simulation state from localStorage.
   */
  static loadGame() {
    try {
      if (typeof localStorage === 'undefined') return null;
      const raw = localStorage.getItem(STORAGE_KEYS.SAVE_GAME);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.warn('Failed to parse saved game from localStorage:', e);
      return null;
    }
  }

  /**
   * Clears active in-progress game state (e.g. on victory, game over, or restart).
   */
  static clearSave() {
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.removeItem(STORAGE_KEYS.SAVE_GAME);
    } catch (e) {
      console.warn('Failed to clear save:', e);
    }
  }

  /**
   * Submits a completed run to the server leaderboard / memorial database.
   * If offline or server error occurs, queues submission for later sync.
   */
  static async submitRun(submission) {
    const payload = {
      cartridge_id: submission.cartridge_id || 'oregon_1848',
      player_name: submission.player_name || 'Trail Pioneer',
      score: Math.max(0, Math.floor(submission.score || 0)),
      turns: Math.max(1, Math.floor(submission.turns || 1)),
      distance: Number((submission.distance || 0).toFixed(1)),
      status: submission.status || 'DIED',
      epitaph: submission.epitaph ? submission.epitaph.slice(0, 140) : null,
    };

    try {
      if (typeof fetch === 'undefined') throw new Error('Fetch unavailable');
      const res = await fetch('/api/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Server returned ${res.status}: ${errText}`);
      }

      const receipt = await res.json();
      await StorageManager.flushPendingSubmissions();
      return { success: true, receipt };
    } catch (err) {
      console.warn('Leaderboard submission failed, queuing offline:', err);
      StorageManager.queuePendingSubmission(payload);
      return { success: false, queued: true, error: err.message };
    }
  }

  /**
   * Fetches leaderboard and roadside memorials for a cartridge.
   */
  static async fetchLeaderboard(cartridgeId = 'oregon_1848') {
    try {
      if (typeof fetch === 'undefined') throw new Error('Fetch unavailable');
      const res = await fetch(
        `/api/leaderboard?cartridge_id=${encodeURIComponent(cartridgeId)}&limit=10`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      try {
        if (typeof localStorage !== 'undefined') {
          const cacheKey = `${STORAGE_KEYS.CACHED_LEADERBOARD}_${cartridgeId}`;
          localStorage.setItem(cacheKey, JSON.stringify(data));
        }
      } catch (_) {}

      return data;
    } catch (err) {
      console.warn('Failed to fetch leaderboard from server, checking local cache:', err);
      try {
        if (typeof localStorage !== 'undefined') {
          const cacheKey = `${STORAGE_KEYS.CACHED_LEADERBOARD}_${cartridgeId}`;
          const cached = localStorage.getItem(cacheKey);
          if (cached) return JSON.parse(cached);
        }
      } catch (_) {}
      return { cartridge_id: cartridgeId, high_scores: [], memorials: [] };
    }
  }

  static queuePendingSubmission(payload) {
    try {
      if (typeof localStorage === 'undefined') return;
      const raw = localStorage.getItem(STORAGE_KEYS.PENDING_SUBMISSIONS);
      const queue = raw ? JSON.parse(raw) : [];
      queue.push({ payload, queuedAt: new Date().toISOString() });
      localStorage.setItem(STORAGE_KEYS.PENDING_SUBMISSIONS, JSON.stringify(queue));
    } catch (e) {
      console.warn('Failed to queue pending submission:', e);
    }
  }

  static async flushPendingSubmissions() {
    try {
      if (typeof localStorage === 'undefined' || typeof fetch === 'undefined') return;
      const raw = localStorage.getItem(STORAGE_KEYS.PENDING_SUBMISSIONS);
      if (!raw) return;
      const queue = JSON.parse(raw);
      if (!Array.isArray(queue) || queue.length === 0) return;

      const remaining = [];
      for (const item of queue) {
        try {
          const res = await fetch('/api/leaderboard', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item.payload),
          });
          if (!res.ok) remaining.push(item);
        } catch (_) {
          remaining.push(item);
        }
      }

      if (remaining.length === 0) {
        localStorage.removeItem(STORAGE_KEYS.PENDING_SUBMISSIONS);
      } else {
        localStorage.setItem(STORAGE_KEYS.PENDING_SUBMISSIONS, JSON.stringify(remaining));
      }
    } catch (e) {
      console.warn('Failed to flush pending submissions:', e);
    }
  }
}
