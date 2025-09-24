'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ProgressCircle } from '@/components/ui/progress-circle';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Info, 
  FileText,
  TrendingUp,
  List,
  Lightbulb
} from 'lucide-react';
import { MLAAnalysisResult, MLACheckResult } from '@/lib/mla-rules';

interface ReportPanelProps {
  analysisResult?: MLAAnalysisResult | null;
  hasFile: boolean;
  isAnalyzing?: boolean;
}

export default function ReportPanel({ analysisResult, hasFile, isAnalyzing }: ReportPanelProps) {
  if (!hasFile) {
    return (
      <div className="text-center py-8">
        <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-medium mb-2">No Document Selected</h3>
        <p className="text-sm text-muted-foreground">
          Upload a DOCX document to see MLA format analysis results
        </p>
      </div>
    );
  }

  if (isAnalyzing) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin h-8 w-8 mx-auto mb-4 border-2 border-primary border-t-transparent rounded-full"></div>
        <h3 className="text-lg font-medium mb-2">Analyzing Document</h3>
        <p className="text-sm text-muted-foreground">
          Checking MLA format compliance...
        </p>
      </div>
    );
  }

  if (!analysisResult) {
    return (
      <div className="text-center py-8">
        <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-medium mb-2">Ready to Analyze</h3>
        <p className="text-sm text-muted-foreground">
          Analysis results will appear here once processing is complete
        </p>
      </div>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreDescription = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Good';
    if (score >= 70) return 'Fair';
    if (score >= 60) return 'Needs Improvement';
    return 'Poor';
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />;
      default:
        return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
  };

  const getSeverityBadgeVariant = (severity: string) => {
    switch (severity) {
      case 'error':
        return 'destructive';
      case 'warning':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      {/* Overall Score */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Overall MLA Compliance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center mb-6">
            <ProgressCircle 
              value={analysisResult.overallScore}
              size={140}
              strokeWidth={10}
            >
              <div className="text-center">
                <div className="text-3xl font-bold">
                  {analysisResult.overallScore}%
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {getScoreDescription(analysisResult.overallScore)}
                </div>
              </div>
            </ProgressCircle>
          </div>
          <div className="text-center">
            <div className="text-lg font-medium mb-1">
              {analysisResult.passedRules} / {analysisResult.totalRules} rules passed
            </div>
            <div className="text-sm text-muted-foreground">
              {analysisResult.totalRules - analysisResult.passedRules} rules need improvement
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <List className="h-5 w-5" />
            Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm">Passed: {analysisResult.summary.passed}</span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm">Errors: {analysisResult.summary.errors}</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <span className="text-sm">Warnings: {analysisResult.summary.warnings}</span>
            </div>
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-blue-500" />
              <span className="text-sm">Total: {analysisResult.totalRules}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Results */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Detailed Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analysisResult.results.map((result: MLACheckResult, index: number) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {result.status === 'passed' ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : result.status === 'unable_to_verify' ? (
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    ) : (
                      getSeverityIcon(result.rule.severity)
                    )}
                    <span className="font-medium">{result.rule.name}</span>
                  </div>
                  <Badge variant={
                    result.status === 'passed' ? 'outline' : 
                    result.status === 'unable_to_verify' ? 'secondary' :
                    getSeverityBadgeVariant(result.rule.severity)
                  }>
                    {result.status === 'passed' ? 'Passed' : 
                     result.status === 'unable_to_verify' ? 'Unable to Verify' :
                     result.rule.severity}
                  </Badge>
                </div>
                
                <p className="text-sm text-muted-foreground mb-2">
                  {result.rule.description}
                </p>
                
                <p className="text-sm mb-2">
                  {result.details}
                </p>

                {result.affectedElements && result.affectedElements.length > 0 && (
                  <div className="text-xs text-muted-foreground mb-2">
                    <strong>Affected:</strong> {result.affectedElements.join(', ')}
                  </div>
                )}

                {result.suggestions && result.suggestions.length > 0 && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-md">
                    <div className="flex items-center gap-2 mb-2">
                      <Lightbulb className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">Suggestions</span>
                    </div>
                    <ul className="text-sm text-blue-700 space-y-1">
                      {result.suggestions.map((suggestion, idx) => (
                        <li key={idx} className="flex items-start gap-1">
                          <span className="text-blue-400 mt-1">•</span>
                          <span>{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-2">
            <Button className="w-full" disabled>
              Export Report (Coming Soon)
            </Button>
            <Button variant="outline" className="w-full" disabled>
              Download Corrected Document (Coming Soon)
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Additional features will be available in future updates
          </p>
        </CardContent>
      </Card>
    </div>
  );
}