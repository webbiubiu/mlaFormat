// Report generator for MLA analysis results
export interface MLAReport {
  overallScore: number;
  summary: {
    totalChecks: number;
    passed: number;
    warnings: number;
    errors: number;
  };
  results: any[];
}

export class ReportGenerator {
  // Implementation will be added in phase 2
}