/**
 * ScoringEngine: Підрахунок балів, штрафів та оцінювання для EduOS
 */
export class ScoringEngine {
  constructor(maxScore = 12, mode = 'learning') {
    this.maxScore = maxScore;
    this.mode = mode; // 'learning' | 'exam'
    this.taskScores = new Map(); // taskId -> { earned, max, usedHint }
    this.failedAttempts = new Map(); // taskId -> count
  }

  recordTaskSuccess(taskId, taskPoints, hintPenalty = 0, usedHint = false) {
    let earned = taskPoints;
    if (usedHint) {
      earned = Math.max(0, earned - hintPenalty);
    }
    if (this.mode === 'exam') {
      const fails = this.failedAttempts.get(taskId) || 0;
      earned = Math.max(0, earned - (fails * 0.5));
    }

    this.taskScores.set(taskId, {
      earned,
      max: taskPoints,
      usedHint
    });

    return earned;
  }

  recordFailedAttempt(taskId) {
    const current = this.failedAttempts.get(taskId) || 0;
    this.failedAttempts.set(taskId, current + 1);
  }

  getTotalEarned() {
    let total = 0;
    for (const val of this.taskScores.values()) {
      total += val.earned;
    }
    return Math.round(total * 10) / 10;
  }

  getPercentage() {
    let earned = 0;
    let max = 0;
    for (const val of this.taskScores.values()) {
      earned += val.earned;
      max += val.max;
    }
    if (max === 0) return 0;
    return Math.round((earned / max) * 100);
  }

  getGrade12() {
    const pct = this.getPercentage();
    if (pct >= 95) return 12;
    if (pct >= 90) return 11;
    if (pct >= 85) return 10;
    if (pct >= 80) return 9;
    if (pct >= 75) return 8;
    if (pct >= 65) return 7;
    if (pct >= 55) return 6;
    if (pct >= 45) return 5;
    if (pct >= 35) return 4;
    if (pct >= 25) return 3;
    if (pct >= 15) return 2;
    return 1;
  }
}
