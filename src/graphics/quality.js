export class QualityGovernor {
  constructor(initial = "balanced") {
    this.level = initial;
    this.sum = 0;
    this.samples = 0;
    this.slow = 0;
    this.warmup = 4;
  }
  sample(seconds) {
    if (!Number.isFinite(seconds) || seconds <= 0 || seconds > 2) return null;
    if (this.warmup > 0) {
      this.warmup -= seconds;
      return null;
    }
    this.sum += seconds;
    this.samples++;
    if (this.sum < 1) return null;
    const average = this.sum / this.samples;
    this.sum = 0;
    this.samples = 0;
    this.slow = average > 1 / 55 ? this.slow + 1 : 0;
    if (this.slow >= 2 && this.level !== "low") {
      this.level = this.level === "high" ? "balanced" : "low";
      this.slow = 0;
      return this.level;
    }
    return null;
  }
}
