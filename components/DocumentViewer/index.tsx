'use client';

import { useEffect, useState } from 'react';
import mammoth from 'mammoth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { MLAAnalysisResult } from '@/lib/mla-rules';

interface DocumentViewerProps {
  file: File;
  analysisResult?: MLAAnalysisResult | null;
}

export default function DocumentViewer({ file, analysisResult }: DocumentViewerProps) {
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(true);

  useEffect(() => {
    if (file) {
      convertDocxToHtml();
    }
  }, [file]);

  const convertDocxToHtml = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      
      // Convert DOCX to HTML using mammoth
      const result = await mammoth.convertToHtml(
        { arrayBuffer },
        {
          styleMap: [
            // Preserve basic formatting
            "p[style-name='Normal'] => p.normal",
            "p[style-name='Title'] => h1.title",
            "p[style-name='Heading 1'] => h1",
            "p[style-name='Heading 2'] => h2",
            "p[style-name='Heading 3'] => h3",
            "r[style-name='Strong'] => strong",
            "r[style-name='Emphasis'] => em"
          ],
          includeDefaultStyleMap: true
        }
      );
      
      setHtmlContent(result.value);
      
      if (result.messages.length > 0) {
        console.warn('Mammoth conversion messages:', result.messages);
      }
    } catch (err) {
      console.error('Error converting DOCX to HTML:', err);
      setError('Failed to preview document. The file may be corrupted or in an unsupported format.');
    } finally {
      setIsLoading(false);
    }
  };

  const highlightIssues = (content: string): string => {
    if (!analysisResult || !analysisResult.results) {
      return content;
    }

    let highlightedContent = content;

    // Collect all issues with their affected elements
    const issuesByElement = new Map<string, {severity: string, messages: string[]}>();
    
    analysisResult.results.forEach(result => {
      if (result.status === 'failed' && result.affectedElements) {
        result.affectedElements.forEach(element => {
          // Extract paragraph number from "Paragraph X" format
          const paragraphMatch = element.match(/Paragraph (\d+)/);
          if (paragraphMatch) {
            const paragraphNum = paragraphMatch[1];
            const key = `p${paragraphNum}`;
            
            if (!issuesByElement.has(key)) {
              issuesByElement.set(key, {
                severity: result.rule.severity,
                messages: []
              });
            }
            
            issuesByElement.get(key)!.messages.push(
              `${result.rule.name}: ${result.details}`
            );
          }
        });
      }
    });

    // Add paragraph IDs to HTML content for targeting
    let paragraphCounter = 1;
    highlightedContent = highlightedContent.replace(
      /<p([^>]*)>/g, 
      (match, attributes) => {
        const id = `mla-p${paragraphCounter}`;
        paragraphCounter++;
        return `<p${attributes} id="${id}">`;
      }
    );

    // Apply highlighting to paragraphs with issues
    issuesByElement.forEach((issue, elementKey) => {
      const paragraphId = `mla-${elementKey}`;
      const cssClass = issue.severity === 'error' ? 'mla-error' : 'mla-warning';
      const tooltip = issue.messages.join('; ');
      
      // Add highlighting class and tooltip to the paragraph
      const regex = new RegExp(`(<p[^>]*id="${paragraphId}"[^>]*>)(.*?)(</p>)`, 'gi');
      highlightedContent = highlightedContent.replace(
        regex,
        `$1<span class="${cssClass}" title="${tooltip}">$2</span>$3`
      );
    });

    // Add font and overall document issues highlighting
    const fontIssues = analysisResult.results.filter(
      r => (r.rule.id === 'font-family' || r.rule.id === 'font-size') && r.status === 'failed'
    );
    
    if (fontIssues.length > 0) {
      // Highlight the entire document for font issues
      const fontMessages = fontIssues.map(r => `${r.rule.name}: ${r.details}`).join('; ');
      highlightedContent = `<div class="mla-font-issues" title="${fontMessages}">${highlightedContent}</div>`;
    }

    // Add CSS for highlighting
    const styles = `
      <style>
        .mla-error { 
          background-color: #fef2f2 !important; 
          border-left: 4px solid #dc2626 !important; 
          padding: 2px 4px !important;
          margin: 2px 0 !important;
          border-radius: 2px !important;
          position: relative !important;
        }
        .mla-warning { 
          background-color: #fffbeb !important; 
          border-left: 4px solid #d97706 !important; 
          padding: 2px 4px !important;
          margin: 2px 0 !important;
          border-radius: 2px !important;
          position: relative !important;
        }
        .mla-font-issues {
          outline: 2px dashed #dc2626 !important;
          outline-offset: 4px !important;
          background-color: rgba(254, 242, 242, 0.3) !important;
        }
        .mla-success { 
          background-color: #f0fdf4 !important; 
          border-left: 4px solid #16a34a !important; 
          padding: 2px 4px !important;
          margin: 2px 0 !important;
          border-radius: 2px !important;
        }
        .document-preview { 
          font-family: 'Times New Roman', serif !important; 
          font-size: 12pt !important;
          line-height: 2.0 !important;
          max-width: 8.5in !important; 
          margin: 0 auto !important;
          padding: 1in !important;
          background: white !important;
          box-shadow: 0 0 10px rgba(0,0,0,0.1) !important;
          min-height: 11in !important;
        }
        .document-preview p { 
          margin: 0 0 0 !important; 
          text-indent: 0.5in !important;
          text-align: left !important;
        }
        .document-preview h1, .document-preview .title { 
          text-align: center !important; 
          text-indent: 0 !important; 
          font-weight: normal !important;
          font-size: 12pt !important;
        }
        /* Tooltip styling */
        .mla-error[title]:hover::after,
        .mla-warning[title]:hover::after,
        .mla-font-issues[title]:hover::after {
          content: attr(title);
          position: absolute;
          top: 100%;
          left: 0;
          background: rgba(0, 0, 0, 0.9);
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 11px;
          white-space: nowrap;
          max-width: 300px;
          z-index: 1000;
          margin-top: 4px;
        }
      </style>
    `;

    return styles + `<div class="document-preview">${highlightedContent}</div>`;
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center space-x-2 py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Converting document for preview...</span>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center py-8">
          <div className="text-red-600 mb-4">
            <svg className="h-12 w-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm">{error}</p>
          </div>
          <Button onClick={convertDocxToHtml} variant="outline" size="sm">
            Try Again
          </Button>
        </div>
      </Card>
    );
  }

  if (!htmlContent) {
    return (
      <Card className="p-6">
        <div className="text-center py-8 text-muted-foreground">
          <Eye className="h-12 w-12 mx-auto mb-2" />
          <p>No document content to display</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Preview Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h3 className="font-medium">Document Preview</h3>
          <span className="text-sm text-muted-foreground">
            ({file.name})
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowPreview(!showPreview)}
          className="flex items-center space-x-2"
        >
          {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          <span>{showPreview ? 'Hide' : 'Show'} Preview</span>
        </Button>
      </div>

      {/* Document Preview */}
      {showPreview && (
        <Card className="overflow-hidden">
          <div className="max-h-96 overflow-y-auto">
            <div 
              className="prose prose-sm max-w-none p-6"
              dangerouslySetInnerHTML={{ 
                __html: highlightIssues(htmlContent) 
              }}
            />
          </div>
        </Card>
      )}

      {/* Preview Info & Legend */}
      <div className="text-xs text-muted-foreground space-y-2">
        <p>Preview shows document content converted from DOCX format. Some formatting may differ from the original.</p>
        
        {analysisResult && (
          <div className="space-y-1">
            <p className="font-medium">Issue Highlighting:</p>
            <div className="flex flex-wrap gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-3 bg-red-50 border-l-2 border-red-600 rounded-sm"></div>
                <span>Formatting Errors</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-3 bg-yellow-50 border-l-2 border-yellow-600 rounded-sm"></div>
                <span>Warnings</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-3 border-2 border-dashed border-red-600 rounded-sm bg-red-50/30"></div>
                <span>Font Issues (entire document)</span>
              </div>
            </div>
            <p className="text-xs italic">💡 Hover over highlighted areas to see specific issues</p>
          </div>
        )}
      </div>
    </div>
  );
}