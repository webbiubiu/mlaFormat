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

    const highlightedContent = content;

    // Add CSS for highlighting
    const styles = `
      <style>
        .mla-error { background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 2px 4px; }
        .mla-warning { background-color: #fffbeb; border-left: 4px solid #d97706; padding: 2px 4px; }
        .mla-success { background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 2px 4px; }
        .document-preview { 
          font-family: 'Times New Roman', serif; 
          font-size: clamp(0.875rem, 2.5vw, 1rem); 
          line-height: 1.6; 
          max-width: 8.5in; 
          margin: 0 auto;
          padding: 1in;
          background: white;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        .document-preview p { margin: 0 0 0; text-indent: 0.5in; }
        .document-preview h1, .document-preview .title { text-align: center; text-indent: 0; }
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

      {/* Preview Info */}
      <div className="text-xs text-muted-foreground">
        <p>Preview shows document content converted from DOCX format. Some formatting may differ from the original.</p>
        {analysisResult && (
          <p className="mt-1">Issues highlighted: 
            <span className="inline-block w-3 h-3 bg-red-100 border-l-2 border-red-600 mx-1"></span>Errors
            <span className="inline-block w-3 h-3 bg-yellow-100 border-l-2 border-yellow-600 mx-1"></span>Warnings
          </p>
        )}
      </div>
    </div>
  );
}