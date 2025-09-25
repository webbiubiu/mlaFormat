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
  Lightbulb,
  Eye,
  ArrowRight
} from 'lucide-react';
import { MLAAnalysisResult, MLACheckResult } from '@/lib/mla-rules';

interface ReportPanelProps {
  analysisResult?: MLAAnalysisResult | null;
  hasFile: boolean;
  isAnalyzing?: boolean;
}

export default function ReportPanel({ analysisResult, hasFile, isAnalyzing }: ReportPanelProps) {
  const scrollToHighlight = (affectedElement: string) => {
    console.log('Attempting to scroll to:', affectedElement);
    
    // Handle different types of affected elements
    if (affectedElement.includes('Paragraph')) {
      // Extract paragraph number from "Paragraph X" format
      const paragraphMatch = affectedElement.match(/Paragraph (\d+)/);
      if (paragraphMatch) {
        const paragraphNum = paragraphMatch[1];
        const elementId = `mla-p${paragraphNum}`;
        console.log('Looking for element with ID:', elementId);
        handleScrollToElement(elementId);
      }
    } else if (affectedElement.includes('Document') || affectedElement.includes('header')) {
      // For document-wide issues, scroll to the document preview
      console.log('Scrolling to document preview for document-wide issue');
      handleScrollToDocumentPreview();
    } else {
      // Fallback for other cases
      console.log('Using fallback scroll to document preview');
      handleScrollToDocumentPreview();
    }
  };

  const handleScrollToElement = (elementId: string) => {
    // First, try to find the element
    let element = document.getElementById(elementId);
    
    // If element not found, it might be because the preview is hidden
    if (!element) {
      // Try to show the document preview by looking for the toggle button
      const previewToggleButton = Array.from(document.querySelectorAll('button')).find(btn => 
        btn.textContent?.includes('Show Preview') || btn.textContent?.includes('Hide Preview')
      );
      
      if (previewToggleButton && previewToggleButton.textContent?.includes('Show Preview')) {
        previewToggleButton.click();
        
        // Wait a bit for the preview to render, then try again
        setTimeout(() => {
          element = document.getElementById(elementId);
          if (element) {
            scrollToElement(element);
          } else {
            handleScrollToDocumentPreview();
          }
        }, 300);
        return;
      }
    }
    
    if (element) {
      scrollToElement(element);
    } else {
      handleScrollToDocumentPreview();
    }
  };

  const handleScrollToDocumentPreview = () => {
    // First check if preview is hidden and show it if necessary
    const previewToggleButton = Array.from(document.querySelectorAll('button')).find(btn => 
      btn.textContent?.includes('Show Preview') || btn.textContent?.includes('Hide Preview')
    );
    
    if (previewToggleButton && previewToggleButton.textContent?.includes('Show Preview')) {
      previewToggleButton.click();
      setTimeout(() => {
        scrollToDocumentContainer();
      }, 300);
    } else {
      scrollToDocumentContainer();
    }
  };

  const scrollToDocumentContainer = () => {
    // Try multiple selectors to find the document preview
    const previewContainer = document.querySelector('.document-preview') || 
                            document.querySelector('[class*="document"]') ||
                            document.querySelector('[class*="preview"]') ||
                            document.querySelector('div[dangerouslySetInnerHTML]')?.parentElement;
    
    if (previewContainer) {
      previewContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
      
      // Add a subtle highlight to the entire preview
      const previewElement = previewContainer as HTMLElement;
      previewElement.style.transition = 'all 0.3s ease';
      previewElement.style.outline = '2px solid rgba(59, 130, 246, 0.5)';
      previewElement.style.outlineOffset = '4px';
      
      setTimeout(() => {
        previewElement.style.outline = '';
        previewElement.style.outlineOffset = '';
      }, 2000);
    }
  };

  const scrollToElement = (element: HTMLElement) => {
    // Scroll to the element
    element.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'center' 
    });
    
    // Add a temporary highlight effect
    element.style.transition = 'all 0.3s ease';
    element.style.transform = 'scale(1.02)';
    element.style.boxShadow = '0 0 20px rgba(220, 38, 38, 0.5)';
    element.style.zIndex = '1000';
    
    // Create a pulsing effect
    let pulseCount = 0;
    const pulseInterval = setInterval(() => {
      element.style.transform = pulseCount % 2 === 0 ? 'scale(1.02)' : 'scale(1.01)';
      pulseCount++;
      if (pulseCount >= 4) {
        clearInterval(pulseInterval);
        // Reset styles
        setTimeout(() => {
          element.style.transform = '';
          element.style.boxShadow = '';
          element.style.zIndex = '';
        }, 500);
      }
    }, 300);
  };

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
              {analysisResult.failedRules} failed, {analysisResult.unverifiableRules} unverifiable
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
              <Info className="h-4 w-4 text-gray-500" />
              <span className="text-sm">Unverifiable: {analysisResult.summary.unverifiable}</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Total Rules:</span>
              <span className="font-medium">{analysisResult.totalRules}</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {analysisResult.summary.passed + analysisResult.summary.errors + analysisResult.summary.warnings + analysisResult.summary.unverifiable} rules analyzed
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
                    <div className="flex items-center justify-between">
                      <div>
                        <strong>Affected:</strong> {result.affectedElements.join(', ')}
                      </div>
                      {result.status === 'failed' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 px-2 text-xs flex items-center gap-1 hover:bg-blue-50"
                          onClick={() => scrollToHighlight(result.affectedElements?.[0] || '')}
                        >
                          <Eye className="h-3 w-3" />
                          View in Preview
                        </Button>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Show View in Preview for failed items without affected elements (document-wide issues) */}
                {result.status === 'failed' && (!result.affectedElements || result.affectedElements.length === 0) && (
                  <div className="text-xs text-muted-foreground mb-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <strong>Scope:</strong> Document-wide issue
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 px-2 text-xs flex items-center gap-1 hover:bg-blue-50"
                        onClick={() => scrollToHighlight('Document')}
                      >
                        <Eye className="h-3 w-3" />
                        View in Preview
                      </Button>
                    </div>
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