export interface MLAReportResult {
  ruleId: string;
  message: string;
  severity: 'error' | 'warning';
  line?: number;
  column?: number;
  fix?: string;
}

export interface MLAReport {
  overallScore: number;
  summary: {
    totalChecks: number;
    passed: number;
    warnings: number;
    errors: number;
  };
  results: MLAReportResult[];
}

export class ReportGenerator {
  // Implementation will be added in phase 2
}