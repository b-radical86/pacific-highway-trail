/**
 * Storage & Persistence Manager for Oregon Trail Engine.
 *
 * Responsibilities:
 * 1. Turn-boundary localStorage auto-save and auto-resume (OREGON_ENGINE_SAVE_V1).
 * 2. Capability-based backend detection (probe ./api/health once per session via AbortController).
 * 3. Hybrid Leaderboard & Memorial Persistence:
 *    - When FastAPI backend is present: POST/GET /api/leaderboard with offline retry queue.
 *    - When running statically (e.g. GitHub Pages / file://): read/write high scores and
 *      roadside memorials directly in localStorage (CACHED_LEADERBOARD_<cartridge>).
 */

export const STORAGE_KEYS = {
  SAVE_GAME: 'OREGON_ENGINE_SAVE_V1',
  PENDING_SUBMISSIONS: 'OREGON_ENGINE_PENDING_V1',
  CACHED_LEADERBOARD: 'OREGON_ENGINE_LEADERBOARD_CACHE_V1',
  BACKEND_STATUS: 'OREGON_ENGINE_BACKEND_AVAILABLE_V1',
};

/**
 * Probes `./api/health` with a 400ms AbortController timeout to detect whether a
 * local FastAPI backend is running. Result is cached in sessionStorage for the session.
 * @param {boolean} [force=false] Bypass sessionStorage cache when true
 * @returns {Promise<boolean>}
 */
export async function detectBackend(force = false) {
  try {
    if (!force && typeof sessionStorage !== 'undefined') {
      const cached = sessionStorage.getItem(STORAGE_KEYS.BACKEND_STATUS);
      if (cached === 'true') return true;
      if (cached === 'false') return false;
    }
  } catch (_) {}

  if (
    typeof fetch === 'undefined' ||
    (typeof window !== 'undefined' && window.location?.protocol === 'file:')
  ) {
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(STORAGE_KEYS.BACKEND_STATUS, 'false');
      }
    } catch (_) {}
    return false;
  }

  let timeoutId = null;
  try {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    if (controller) {
      timeoutId = setTimeout(() => controller.abort(), 400);
    }

    const res = await fetch('./api/health', {
      method: 'GET',
      cache: 'no-store',
      signal: controller ? controller.signal : undefined,
    });

    let available = false;
    if (res && res.ok) {
      const ct = res.headers?.get?.('content-type') || '';
      if (ct.includes('application/json')) {
        const data = await res.json();
        available = Boolean(data && data.status === 'ok');
      }
    }

    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(STORAGE_KEYS.BACKEND_STATUS, available ? 'true' : 'false');
      }
    } catch (_) {}
    return available;
  } catch (_) {
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(STORAGE_KEYS.BACKEND_STATUS, 'false');
      }
    } catch (_) {}
    return false;
  } finally {
    if (timeoutId !== null) clearTimeout(timeoutId);
  }
}

export class StorageManager {
  /**
   * Capability-based probe helper attached to StorageManager.
   */
  static detectBackend(force = false) {
    return detectBackend(force);
  }

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
   * Reads local cached leaderboard & memorials for a cartridge.
   */
  static _readLocalLeaderboard(cartridgeId) {
    try {
      if (typeof localStorage !== 'undefined') {
        const cacheKey = `${STORAGE_KEYS.CACHED_LEADERBOARD}_${cartridgeId}`;
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          return {
            cartridge_id: cartridgeId,
            high_scores: Array.isArray(parsed.high_scores) ? parsed.high_scores : [],
            memorials: Array.isArray(parsed.memorials) ? parsed.memorials : [],
          };
        }
      }
    } catch (_) {}
    return { cartridge_id: cartridgeId, high_scores: [], memorials: [] };
  }

  /**
   * Writes a completed run directly into localStorage leaderboard & roadside memorials.
   */
  static _saveToLocalLeaderboard(payload) {
    const cartridgeId = payload.cartridge_id || 'oregon_1848';
    const data = StorageManager._readLocalLeaderboard(cartridgeId);
    const entry = {
      id: Date.now(),
      cartridge_id: cartridgeId,
      player_name: payload.player_name,
      score: payload.score,
      turns: payload.turns,
      distance: payload.distance,
      status: payload.status,
      recorded_at: new Date().toISOString(),
      epitaph: payload.epitaph ?? null,
    };

    const nextScores = [...data.high_scores, entry]
      .sort((a, b) => (b.score - a.score) || (a.turns - b.turns) || (a.id - b.id))
      .slice(0, 10);

    let nextMemorials = [...data.memorials];
    if (entry.distance > 0 && (entry.status === 'DIED' || Boolean(entry.epitaph))) {
      nextMemorials = [...nextMemorials, entry]
        .sort((a, b) => (a.distance - b.distance) || (b.id - a.id))
        .slice(0, 20);
    }

    const updated = {
      cartridge_id: cartridgeId,
      high_scores: nextScores,
      memorials: nextMemorials,
    };

    try {
      if (typeof localStorage !== 'undefined') {
        const cacheKey = `${STORAGE_KEYS.CACHED_LEADERBOARD}_${cartridgeId}`;
        localStorage.setItem(cacheKey, JSON.stringify(updated));
      }
    } catch (e) {
      console.warn('Failed to update local leaderboard cache:', e);
    }

    return { entry, leaderboard: updated };
  }

  /**
   * Submits a completed run to SQLite backend if available, or localStorage on static hosts.
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

    const hasBackend = await detectBackend();
    if (!hasBackend) {
      const { entry } = StorageManager._saveToLocalLeaderboard(payload);
      return {
        success: true,
        local: true,
        receipt: { status: 'recorded_local', id: entry.id, entry },
      };
    }

    try {
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
      console.warn('Leaderboard submission failed, storing locally and queuing offline:', err);
      StorageManager._saveToLocalLeaderboard(payload);
      StorageManager.queuePendingSubmission(payload);
      return { success: false, queued: true, error: err.message };
    }
  }

  /**
   * Fetches leaderboard and roadside memorials for a cartridge.
   * Uses localStorage directly when running on a static host (hasBackend === false).
   */
  static async fetchLeaderboard(cartridgeId = 'oregon_1848') {
    const hasBackend = await detectBackend();
    if (!hasBackend) {
      return StorageManager._readLocalLeaderboard(cartridgeId);
    }

    try {
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
      return StorageManager._readLocalLeaderboard(cartridgeId);
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
      const hasBackend = await detectBackend();
      if (!hasBackend) return;

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
