const sessions = new Map();
const SESSION_TIMEOUT = 15 * 60 * 1000; // 15 minutes

function registerSession(sessionId, userId = 'anonymous') {
  sessions.set(sessionId, { userId, lastActivity: Date.now(), startTime: sessions.get(sessionId)?.startTime || Date.now() });
  return sessions.size;
}

function touchSession(sessionId) {
  if (sessions.has(sessionId)) {
    const s = sessions.get(sessionId);
    s.lastActivity = Date.now();
    sessions.set(sessionId, s);
  }
}

function unregisterSession(sessionId) {
  sessions.delete(sessionId);
  return sessions.size;
}

function cleanupExpired() {
  const now = Date.now();
  for (const [id, s] of sessions.entries()) {
    if (now - s.lastActivity > SESSION_TIMEOUT) {
      sessions.delete(id);
    }
  }
}

function getActiveSessionCount() {
  cleanupExpired();
  return sessions.size;
}

module.exports = {
  registerSession,
  touchSession,
  unregisterSession,
  getActiveSessionCount
};
