'use client';

import { useState } from 'react';
import DocumentUpload from '@/components/DocumentUpload';
import DocumentViewer from '@/components/DocumentViewer';
import ReportPanel from '@/components/ReportPanel';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DocxParser } from '@/lib/docx-parser';
import { MLARulesEngine, MLAAnalysisResult } from '@/lib/mla-rules';
import { AlertCircle, Play } from 'lucide-react';

export default function Home() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [analysisResult, setAnalysisResult] = useState<MLAAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const handleFileUpload = async (file: File | null) => {
    setUploadedFile(file);
    setAnalysisResult(null);
    setAnalysisError(null);
    
    if (file) {
      // Auto-analyze when file is uploaded
      await performAnalysis(file);
    }
  };

  const performAnalysis = async (file: File = uploadedFile!) => {
    if (!file) return;
    
    setIsAnalyzing(true);
    setAnalysisError(null);
    
    try {
      // Parse the DOCX file
      const parseResult = await DocxParser.parseDocx(file);
      
      // Analyze against MLA rules
      const analysis = await MLARulesEngine.analyzeDocument(parseResult);
      
      setAnalysisResult(analysis);
    } catch (error) {
      console.error('Analysis failed:', error);
      setAnalysisError(
        error instanceof Error 
          ? error.message 
          : 'Failed to analyze document. Please check the file format and try again.'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-foreground mb-2 flex items-center justify-center gap-3">
              <svg width="48" height="48" viewBox="0 0 32 32" className="text-green-600">
                <circle cx="16" cy="16" r="15" fill="currentColor"/>
                <rect x="8" y="6" width="14" height="18" rx="1" fill="white"/>
                <path d="M18 6V10H22L18 6Z" fill="#e5e7eb"/>
                <rect x="10" y="12" width="10" height="1.5" fill="#6b7280"/>
                <rect x="10" y="15" width="10" height="1.5" fill="#6b7280"/>
                <rect x="10" y="18" width="8" height="1.5" fill="#6b7280"/>
                <rect x="10" y="21" width="9" height="1.5" fill="#6b7280"/>
                <path d="M5 16L8 19L14 13" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round"/>
              </svg>
              MLA Format Checker
            </h1>
            <p className="text-lg text-muted-foreground">
              Upload your document to check MLA formatting compliance
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Upload Section */}
            <Card>
              <CardHeader>
                <CardTitle>Upload Document</CardTitle>
                <CardDescription>
                  Select a DOCX file to analyze for MLA format compliance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DocumentUpload 
                  onFileUpload={handleFileUpload}
                  uploadedFile={uploadedFile}
                />
                
                {/* Analysis Controls */}
                {uploadedFile && !isAnalyzing && (
                  <div className="mt-4 pt-4 border-t">
                    <Button 
                      onClick={() => performAnalysis()}
                      className="w-full"
                      disabled={isAnalyzing}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Re-analyze Document
                    </Button>
                  </div>
                )}

                {/* Analysis Error */}
                {analysisError && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <span className="text-sm font-medium text-red-800">Analysis Failed</span>
                    </div>
                    <p className="text-sm text-red-700 mt-1">{analysisError}</p>
                    <Button 
                      onClick={() => performAnalysis()}
                      variant="outline"
                      size="sm"
                      className="mt-2"
                    >
                      Try Again
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Document Viewer */}
            {uploadedFile && (
              <Card>
                <CardHeader>
                  <CardTitle>Document Preview</CardTitle>
                  <CardDescription>
                    Your document with highlighted formatting issues
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DocumentViewer 
                    file={uploadedFile} 
                    analysisResult={analysisResult}
                  />
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Analysis Report */}
            <Card>
              <CardHeader>
                <CardTitle>Analysis Report</CardTitle>
                <CardDescription>
                  Detailed MLA format compliance results
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ReportPanel 
                  analysisResult={analysisResult}
                  hasFile={!!uploadedFile}
                  isAnalyzing={isAnalyzing}
                />
              </CardContent>
            </Card>

            {/* MLA Guidelines Reference */}
            <Card>
              <CardHeader>
                <CardTitle>MLA Guidelines</CardTitle>
                <CardDescription>
                  Key formatting requirements
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm space-y-3">
                  <div className="space-y-2">
                    <h4 className="font-medium text-foreground">Font & Spacing</h4>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>12pt Times New Roman font</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>Double-spaced throughout</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium text-foreground">Page Setup</h4>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>1-inch margins on all sides</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>Header with last name and page number</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium text-foreground">Formatting</h4>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>First line indent of 0.5 inches</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>Left-aligned body paragraphs</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>Centered title with no extra formatting</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t mt-12">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center text-sm text-muted-foreground">
            <p>© 2025 MLA Format Checker. All documents are processed locally for privacy.</p>
            <p className="mt-1">
              Supports DOCX files • Built with Next.js • 
              <a href="https://github.com" className="underline hover:no-underline ml-1">
                View Source
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
