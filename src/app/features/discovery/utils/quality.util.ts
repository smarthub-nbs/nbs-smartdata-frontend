type QualityLevel = 'high' | 'medium' | 'low';

export function qualityLevel(score: number): QualityLevel {
  if (score >= 90) {
    return 'high';
  }
  if (score >= 80) {
    return 'medium';
  }
  return 'low';
}

export function qualityLabel(score: number): string {
  switch (qualityLevel(score)) {
    case 'high':
      return 'High quality';
    case 'medium':
      return 'Good quality';
    default:
      return 'Review suggested';
  }
}
