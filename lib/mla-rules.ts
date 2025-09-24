import { DocxParseResult, DocxParagraph, DocxParser, DocxStyle, DocxPageSettings, DocxHeader } from './docx-parser';

export interface MLARule {
  id: string;
  name: string;
  description: string;
  severity: 'error' | 'warning' | 'info';
  category: 'formatting' | 'structure' | 'citations' | 'page-setup';
}

export interface MLACheckResult {
  rule: MLARule;
  status: 'passed' | 'failed' | 'unable_to_verify';
  details: string;
  suggestions?: string[];
  affectedElements?: string[];
}

export interface MLAAnalysisResult {
  overallScore: number;
  totalRules: number;
  passedRules: number;
  failedRules: number;
  unverifiableRules: number;
  results: MLACheckResult[];
  summary: {
    critical: number;
    errors: number;
    warnings: number;
    passed: number;
    unverifiable: number;
  };
}

export class MLARulesEngine {
  private static readonly MLA_RULES: MLARule[] = [
    // Page Setup Rules
    {
      id: 'font-family',
      name: 'Font Family',
      description: 'Document should use Times New Roman font',
      severity: 'error',
      category: 'formatting'
    },
    {
      id: 'font-size',
      name: 'Font Size',
      description: 'Document should use 12-point font size',
      severity: 'error',
      category: 'formatting'
    },
    {
      id: 'line-spacing',
      name: 'Line Spacing',
      description: 'Document should be double-spaced throughout',
      severity: 'error',
      category: 'formatting'
    },
    {
      id: 'margins',
      name: 'Page Margins',
      description: 'All margins should be 1 inch',
      severity: 'error',
      category: 'page-setup'
    },
    {
      id: 'first-line-indent',
      name: 'First Line Indent',
      description: 'Each paragraph should have a 0.5-inch first-line indent',
      severity: 'error',
      category: 'formatting'
    },
    
    // Header Rules
    {
      id: 'header-format',
      name: 'Header Format',
      description: 'Header should contain last name and page number',
      severity: 'warning',
      category: 'page-setup'
    },
    
    // Structure Rules
    {
      id: 'title-formatting',
      name: 'Title Formatting',
      description: 'Title should be centered with no additional formatting',
      severity: 'warning',
      category: 'structure'
    },
    {
      id: 'works-cited',
      name: 'Works Cited',
      description: 'Should include a properly formatted Works Cited page',
      severity: 'warning',
      category: 'structure'
    },
    
    // Text Formatting Rules
    {
      id: 'paragraph-alignment',
      name: 'Paragraph Alignment',
      description: 'Body paragraphs should be left-aligned',
      severity: 'error',
      category: 'formatting'
    },
    {
      id: 'excessive-formatting',
      name: 'Excessive Formatting',
      description: 'Avoid excessive bold, italic, or underline formatting',
      severity: 'warning',
      category: 'formatting'
    },
    
    // Missing MLA Requirements
    {
      id: 'heading-format',
      name: 'MLA Heading Format',
      description: 'First page should have proper MLA heading (name, instructor, course, date)',
      severity: 'error',
      category: 'structure'
    },
    {
      id: 'paper-size',
      name: 'Paper Size',
      description: 'Document should be formatted for standard 8.5" x 11" paper',
      severity: 'warning',
      category: 'page-setup'
    },
    {
      id: 'hanging-indent-works-cited',
      name: 'Works Cited Hanging Indent',
      description: 'Works Cited entries should have hanging indent (0.5 inch)',
      severity: 'error',
      category: 'structure'
    },
    {
      id: 'in-text-citations',
      name: 'In-Text Citations',
      description: 'Document should contain proper MLA in-text citations',
      severity: 'warning',
      category: 'citations'
    },
    {
      id: 'works-cited-alphabetical',
      name: 'Works Cited Alphabetical Order',
      description: 'Works Cited entries should be in alphabetical order',
      severity: 'error',
      category: 'structure'
    }
  ];

  static async analyzeDocument(parseResult: DocxParseResult): Promise<MLAAnalysisResult> {
    const results: MLACheckResult[] = [];
    
    // Extract document data
    const paragraphs = DocxParser.extractParagraphs(parseResult.wordXML);
    const styles = parseResult.styles ? DocxParser.extractStyles(parseResult.styles) : [];
    const pageSettings = parseResult.settings ? DocxParser.extractPageSettings(parseResult.settings) : null;

    // Run all checks
    results.push(...this.checkFontFormatting(paragraphs, styles));
    results.push(...this.checkLineSpacing(paragraphs));
    results.push(...this.checkPageMargins(pageSettings));
    results.push(...this.checkFirstLineIndent(paragraphs));
    results.push(...this.checkParagraphAlignment(paragraphs));
    results.push(...this.checkHeaderFormat(parseResult.headers));
    results.push(...this.checkMLAHeadingFormat(paragraphs));
    results.push(...this.checkPaperSize(pageSettings));
    results.push(...this.checkTitleFormatting(paragraphs));
    results.push(...this.checkExcessiveFormatting(paragraphs));
    results.push(...this.checkWorksCited(paragraphs));
    results.push(...this.checkWorksCitedFormatting(paragraphs));
    results.push(...this.checkInTextCitations(paragraphs));

    // Calculate scores
    const totalRules = results.length;
    const passedRules = results.filter(r => r.status === 'passed').length;
    const failedRules = results.filter(r => r.status === 'failed').length;
    const unverifiableRules = results.filter(r => r.status === 'unable_to_verify').length;
    
    // Only calculate score based on rules that could be verified
    const verifiableRules = passedRules + failedRules;
    const overallScore = verifiableRules > 0 ? Math.round((passedRules / verifiableRules) * 100) : 0;

    // Categorize results
    const summary = {
      critical: results.filter(r => r.status === 'failed' && r.rule.severity === 'error').length,
      errors: results.filter(r => r.status === 'failed' && r.rule.severity === 'error').length,
      warnings: results.filter(r => r.status === 'failed' && r.rule.severity === 'warning').length,
      passed: passedRules,
      unverifiable: unverifiableRules
    };

    return {
      overallScore,
      totalRules,
      passedRules,
      failedRules,
      unverifiableRules,
      results,
      summary
    };
  }

  private static checkFontFormatting(paragraphs: DocxParagraph[], styles: DocxStyle[]): MLACheckResult[] {
    const results: MLACheckResult[] = [];
    
    // Check font family
    const fontFamilyRule = this.MLA_RULES.find(r => r.id === 'font-family')!;
    const fontSizeRule = this.MLA_RULES.find(r => r.id === 'font-size')!;
    
    let nonTimesNewRomanCount = 0;
    let wrongFontSizeCount = 0;
    const affectedElements: string[] = [];

    // Get document default font from styles
    const defaultStyle = styles.find(s => s.type === 'paragraph' && s.name === 'Normal') || 
                        styles.find(s => s.type === 'paragraph') ||
                        { fontFamily: undefined, fontSize: undefined };

    let totalFontChecks = 0;
    let explicitFontSizeCount = 0;
    let explicitFontFamilyCount = 0;

    paragraphs.forEach((paragraph, index) => {
      paragraph.runs.forEach(run => {
        totalFontChecks++;
        
        // Check font family
        const effectiveFontFamily = run.formatting.fontFamily || defaultStyle.fontFamily;
        
        if (run.formatting.fontFamily) {
          explicitFontFamilyCount++;
        }
        
        if (effectiveFontFamily) {
          if (!this.isTimesNewRomanFont(effectiveFontFamily)) {
            nonTimesNewRomanCount++;
            if (!affectedElements.includes(`Paragraph ${index + 1}`)) {
              affectedElements.push(`Paragraph ${index + 1}`);
            }
          }
        }
        
        // Check font size - be more strict about detection
        const effectiveFontSize = run.formatting.fontSize || defaultStyle.fontSize;
        
        if (run.formatting.fontSize !== undefined) {
          explicitFontSizeCount++;
        }
        
        if (effectiveFontSize !== undefined && Math.abs(effectiveFontSize - 12) > 0.1) {
          wrongFontSizeCount++;
          if (!affectedElements.includes(`Paragraph ${index + 1}`)) {
            affectedElements.push(`Paragraph ${index + 1}`);
          }
        }
      });
    });

    // Font family result
    const hasAnyFontFamilyInfo = explicitFontFamilyCount > 0 || defaultStyle.fontFamily !== undefined;
    
    if (!hasAnyFontFamilyInfo) {
      results.push({
        rule: fontFamilyRule,
        status: 'unable_to_verify',
        details: `No font family information found in ${totalFontChecks} text runs - unable to verify Times New Roman requirement`,
        suggestions: [
          'Explicitly set Times New Roman as font family for all text',
          'Use Format > Font to set Times New Roman as default font',
          'Ensure font family information is properly saved in the document'
        ],
        affectedElements: []
      });
    } else {
      const fontFamilyPassed = nonTimesNewRomanCount === 0;
      results.push({
        rule: fontFamilyRule,
        status: fontFamilyPassed ? 'passed' : 'failed',
        details: fontFamilyPassed 
          ? `All text uses Times New Roman font family (checked ${explicitFontFamilyCount} explicit + ${defaultStyle.fontFamily ? '1 default' : '0 default'} font definitions)`
          : `Found ${nonTimesNewRomanCount} instances of non-Times New Roman fonts`,
        suggestions: fontFamilyPassed ? [] : [
          'Change all fonts to Times New Roman',
          'Use Format > Font to set Times New Roman as default'
        ],
        affectedElements: fontFamilyPassed ? [] : affectedElements.slice()
      });
    }

    // Font size result
    const hasAnyFontSizeInfo = explicitFontSizeCount > 0 || defaultStyle.fontSize !== undefined;
    
    if (!hasAnyFontSizeInfo) {
      results.push({
        rule: fontSizeRule,
        status: 'unable_to_verify',
        details: `No font size information found in ${totalFontChecks} text runs - unable to verify 12pt requirement`,
        suggestions: [
          'Explicitly set 12pt font size for all text',
          'Use Format > Font to set 12pt as default font size',
          'Ensure font size information is properly saved in the document'
        ],
        affectedElements: []
      });
    } else {
      const fontSizePassed = wrongFontSizeCount === 0;
      results.push({
        rule: fontSizeRule,
        status: fontSizePassed ? 'passed' : 'failed',
        details: fontSizePassed 
          ? `All text uses 12-point font size (checked ${explicitFontSizeCount} explicit + ${defaultStyle.fontSize ? '1 default' : '0 default'} font size definitions)`
          : `Found ${wrongFontSizeCount} instances of incorrect font sizes (expected 12pt)`,
        suggestions: fontSizePassed ? [] : [
          'Set all text to 12-point font size',
          'Use Format > Font to set 12pt as default font size'
        ],
        affectedElements: fontSizePassed ? [] : affectedElements.slice()
      });
    }

    return results;
  }

  private static checkLineSpacing(paragraphs: DocxParagraph[]): MLACheckResult[] {
    const rule = this.MLA_RULES.find(r => r.id === 'line-spacing')!;
    
    let incorrectSpacingCount = 0;
    let noSpacingInfoCount = 0;
    const affectedElements: string[] = [];
    let totalParagraphs = 0;

    paragraphs.forEach((paragraph, index) => {
      // Skip empty paragraphs
      if (paragraph.text.trim().length === 0) {
        return;
      }

      totalParagraphs++;

      // Check if we have spacing information
      if (!paragraph.spacing) {
        noSpacingInfoCount++;
        return;
      }

      const hasDoubleSpacing = this.isDoubleSpaced(paragraph);
      
      if (!hasDoubleSpacing) {
        incorrectSpacingCount++;
        affectedElements.push(`Paragraph ${index + 1}`);
      }
    });

    // If we have no spacing information for most paragraphs, unable to verify
    if (noSpacingInfoCount > totalParagraphs / 2) {
      return [{
        rule,
        status: 'unable_to_verify',
        details: `No line spacing information found in ${noSpacingInfoCount}/${totalParagraphs} paragraphs - unable to verify double-spacing requirement`,
        suggestions: [
          'Explicitly set double-spacing (2.0) for all paragraphs',
          'Use Format > Paragraph > Line spacing: Double',
          'Ensure spacing information is properly saved in document'
        ],
        affectedElements: []
      }];
    }

    const passed = incorrectSpacingCount === 0;
    
    return [{
      rule,
      status: passed ? 'passed' : 'failed',
      details: passed 
        ? `Document uses double-spacing throughout (verified ${totalParagraphs - noSpacingInfoCount}/${totalParagraphs} paragraphs)`
        : `Found ${incorrectSpacingCount} paragraphs with incorrect line spacing`,
      suggestions: passed ? [] : [
        'Set line spacing to "Double" for all paragraphs',
        'Use Format > Paragraph > Line spacing: Double'
      ],
      affectedElements: passed ? [] : affectedElements
    }];
  }

  private static checkPageMargins(pageSettings: DocxPageSettings | null): MLACheckResult[] {
    const rule = this.MLA_RULES.find(r => r.id === 'margins')!;
    
    if (!pageSettings) {
      return [{
        rule,
        status: 'unable_to_verify',
        details: 'Could not determine page margin settings from document',
        suggestions: [
          'Set all margins to 1 inch in Page Setup',
          'Ensure margin information is properly saved in document'
        ]
      }];
    }

    // 1 inch = 1440 twips
    const oneInch = 1440;
    const tolerance = 72; // Allow small variance (0.05 inch)
    
    const marginsCorrect = 
      Math.abs(pageSettings.margins.top - oneInch) <= tolerance &&
      Math.abs(pageSettings.margins.bottom - oneInch) <= tolerance &&
      Math.abs(pageSettings.margins.left - oneInch) <= tolerance &&
      Math.abs(pageSettings.margins.right - oneInch) <= tolerance;

    return [{
      rule,
      status: marginsCorrect ? 'passed' : 'failed',
      details: marginsCorrect 
        ? 'All page margins are set to 1 inch'
        : `Page margins are not set to 1 inch (Current: T:${DocxParser.twipsToInches(pageSettings.margins.top).toFixed(2)}", B:${DocxParser.twipsToInches(pageSettings.margins.bottom).toFixed(2)}", L:${DocxParser.twipsToInches(pageSettings.margins.left).toFixed(2)}", R:${DocxParser.twipsToInches(pageSettings.margins.right).toFixed(2)}")`,
      suggestions: marginsCorrect ? [] : [
        'Set all margins to 1 inch in Page Layout > Margins',
        'Use Page Setup to manually set 1" margins for all sides'
      ]
    }];
  }

  private static checkFirstLineIndent(paragraphs: DocxParagraph[]): MLACheckResult[] {
    const rule = this.MLA_RULES.find(r => r.id === 'first-line-indent')!;
    
    // 0.5 inch = 720 twips
    const halfInch = 720;
    const tolerance = 72; // Small tolerance
    
    let incorrectIndentCount = 0;
    let noIndentInfoCount = 0;
    const affectedElements: string[] = [];
    let totalBodyParagraphs = 0;

    paragraphs.forEach((paragraph, index) => {
      // Skip empty paragraphs and potential titles (centered text)
      if (paragraph.text.trim().length === 0 || paragraph.alignment === 'center') {
        return;
      }

      totalBodyParagraphs++;

      // Check if we have indentation information
      if (!paragraph.indentation || paragraph.indentation.firstLine === undefined) {
        noIndentInfoCount++;
        return;
      }

      const hasCorrectIndent = Math.abs(paragraph.indentation.firstLine - halfInch) <= tolerance;
      
      if (!hasCorrectIndent) {
        incorrectIndentCount++;
        affectedElements.push(`Paragraph ${index + 1}`);
      }
    });

    // If we have no indentation information for most paragraphs, unable to verify
    if (noIndentInfoCount > totalBodyParagraphs / 2) {
      return [{
        rule,
        status: 'unable_to_verify',
        details: `No indentation information found in ${noIndentInfoCount}/${totalBodyParagraphs} body paragraphs - unable to verify 0.5" first-line indent requirement`,
        suggestions: [
          'Explicitly set first-line indent to 0.5 inches for all body paragraphs',
          'Use Format > Paragraph > Indentation: First line: 0.5"',
          'Ensure indentation information is properly saved in document'
        ],
        affectedElements: []
      }];
    }

    const passed = incorrectIndentCount === 0;
    
    return [{
      rule,
      status: passed ? 'passed' : 'failed',
      details: passed 
        ? `All paragraphs have correct 0.5-inch first-line indent (verified ${totalBodyParagraphs - noIndentInfoCount}/${totalBodyParagraphs} paragraphs)`
        : `Found ${incorrectIndentCount} paragraphs without proper first-line indent`,
      suggestions: passed ? [] : [
        'Set first-line indent to 0.5 inches for all body paragraphs',
        'Use Format > Paragraph > Indentation: First line: 0.5"'
      ],
      affectedElements: passed ? [] : affectedElements
    }];
  }

  private static checkHeaderFormat(headers: DocxHeader[] | null | undefined): MLACheckResult[] {
    const rule = this.MLA_RULES.find(r => r.id === 'header-format')!;
    
    if (!headers || headers.length === 0) {
      return [{
        rule,
        status: 'unable_to_verify',
        details: 'No header information found in document - unable to verify header format requirement',
        suggestions: [
          'Add a header to your document with last name and page number',
          'Use Insert > Header & Footer to add header',
          'Format header as: "Last Name [space] [page number]" aligned to the right'
        ]
      }];
    }

    // Check each header
    let hasCorrectFormat = false;
    const headerIssues: string[] = [];
    
    headers.forEach((header, index) => {
      const headerContent = header.content.trim();
      
      // MLA header should contain last name and page number
      // Common patterns: "Smith 1", "Johnson 2", etc.
      // Should be right-aligned
      const mlaHeaderPattern = /^[A-Za-z]+\s+\d+$/;
      const hasNameAndNumber = mlaHeaderPattern.test(headerContent);
      
      if (hasNameAndNumber) {
        // Check alignment - look for right alignment in paragraphs
        const isRightAligned = header.paragraphs.some(p => 
          p.alignment === 'right' || p.alignment === 'end'
        );
        
        if (isRightAligned) {
          hasCorrectFormat = true;
        } else {
          headerIssues.push(`Header ${index + 1}: Contains name and page number but not right-aligned`);
        }
      } else {
        // Check if it at least contains a page number
        const hasPageNumber = /\d+/.test(headerContent);
        const hasText = headerContent.length > 0;
        
        if (!hasText) {
          headerIssues.push(`Header ${index + 1}: Empty header`);
        } else if (!hasPageNumber) {
          headerIssues.push(`Header ${index + 1}: Missing page number`);
        } else {
          headerIssues.push(`Header ${index + 1}: Should follow format "Last Name [page number]"`);
        }
      }
    });

    if (hasCorrectFormat) {
      return [{
        rule,
        status: 'passed',
        details: 'Header contains last name and page number, right-aligned',
        suggestions: []
      }];
    } else {
      return [{
        rule,
        status: 'failed',
        details: headerIssues.length > 0 
          ? `Header format issues: ${headerIssues.join('; ')}`
          : 'Header does not follow MLA format requirements',
        suggestions: [
          'Format header as "Last Name [space] [page number]"',
          'Right-align the header text',
          'Use Insert > Page Number to add automatic page numbering',
          'Example: "Smith 1" aligned to the right margin'
        ],
        affectedElements: ['Document header']
      }];
    }
  }

  private static checkMLAHeadingFormat(paragraphs: DocxParagraph[]): MLACheckResult[] {
    const rule = this.MLA_RULES.find(r => r.id === 'heading-format')!;
    
    // Look for MLA heading in first few paragraphs (name, instructor, course, date)
    const firstFewParagraphs = paragraphs.slice(0, 8).filter(p => p.text.trim().length > 0);
    
    if (firstFewParagraphs.length < 4) {
      return [{
        rule,
        status: 'failed',
        details: 'MLA heading format not found - document should start with name, instructor, course, and date on separate lines',
        suggestions: [
          'Add MLA heading at the beginning of your document',
          'Format: Student Name (line 1), Instructor Name (line 2), Course (line 3), Date (line 4)',
          'All heading lines should be left-aligned and double-spaced'
        ],
        affectedElements: ['Document beginning']
      }];
    }

    // Check for typical MLA heading pattern
    const headingText = firstFewParagraphs.slice(0, 4).map(p => p.text.trim());
    
    // Check if first lines contain name-like patterns
    const hasNamePattern = headingText[0] && /^[A-Z][a-z]+ [A-Z][a-z]+/.test(headingText[0]);
    const hasInstructorPattern = headingText[1] && /^(Dr\.|Mr\.|Ms\.|Mrs\.|Professor)\s+[A-Z]/.test(headingText[1]);
    const hasDatePattern = headingText.some(text => /\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2} \w+ \d{4}|\w+ \d{1,2}, \d{4}/.test(text));
    
    // Check alignment (should be left-aligned)
    const hasCorrectAlignment = firstFewParagraphs.slice(0, 4).every(p => 
      !p.alignment || p.alignment === 'left' || p.alignment === 'start'
    );

    const score = (hasNamePattern ? 1 : 0) + (hasInstructorPattern ? 1 : 0) + (hasDatePattern ? 1 : 0) + (hasCorrectAlignment ? 1 : 0);

    if (score >= 3) {
      return [{
        rule,
        status: 'passed',
        details: 'Document contains proper MLA heading format',
        suggestions: []
      }];
    } else {
      const issues = [];
      if (!hasNamePattern) issues.push('Student name not found or improperly formatted');
      if (!hasInstructorPattern) issues.push('Instructor name not found (should include title like "Dr." or "Professor")');
      if (!hasDatePattern) issues.push('Date not found or improperly formatted');
      if (!hasCorrectAlignment) issues.push('Heading should be left-aligned');

      return [{
        rule,
        status: 'failed',
        details: `MLA heading issues: ${issues.join('; ')}`,
        suggestions: [
          'Format heading as: Student Name, Instructor Name (with title), Course Name, Date',
          'Each item should be on a separate line, left-aligned',
          'Example: John Smith, Dr. Johnson, English 101, 15 March 2024'
        ],
        affectedElements: firstFewParagraphs.slice(0, 4).map((_, i) => `Paragraph ${i + 1}`)
      }];
    }
  }

  private static checkPaperSize(pageSettings: DocxPageSettings | null): MLACheckResult[] {
    const rule = this.MLA_RULES.find(r => r.id === 'paper-size')!;
    
    if (!pageSettings) {
      return [{
        rule,
        status: 'unable_to_verify',
        details: 'Could not determine paper size settings from document',
        suggestions: [
          'Set paper size to 8.5" x 11" (Letter size)',
          'Check Page Layout > Size > Letter'
        ]
      }];
    }

    // Check for standard Letter size (8.5" x 11") in twips
    // 8.5" = 12240 twips, 11" = 15840 twips
    const letterWidth = 12240;
    const letterHeight = 15840;
    const tolerance = 144; // 0.1 inch tolerance

    const isCorrectSize = 
      Math.abs(pageSettings.pageSize.width - letterWidth) <= tolerance &&
      Math.abs(pageSettings.pageSize.height - letterHeight) <= tolerance;

    if (isCorrectSize) {
      return [{
        rule,
        status: 'passed',
        details: 'Document is formatted for standard 8.5" x 11" paper size',
        suggestions: []
      }];
    } else {
      const actualWidth = DocxParser.twipsToInches(pageSettings.pageSize.width);
      const actualHeight = DocxParser.twipsToInches(pageSettings.pageSize.height);
      
      return [{
        rule,
        status: 'failed',
        details: `Paper size is ${actualWidth.toFixed(1)}" x ${actualHeight.toFixed(1)}" instead of standard 8.5" x 11"`,
        suggestions: [
          'Change paper size to Letter (8.5" x 11")',
          'Use Page Layout > Size > Letter',
          'Ensure printer settings match document size'
        ]
      }];
    }
  }

  private static checkWorksCitedFormatting(paragraphs: DocxParagraph[]): MLACheckResult[] {
    const rule = this.MLA_RULES.find(r => r.id === 'hanging-indent-works-cited')!;
    
    // Find Works Cited section
    const worksCitedStart = paragraphs.findIndex(p => 
      p.text.toLowerCase().includes('works cited') ||
      p.text.toLowerCase().includes('bibliography')
    );

    if (worksCitedStart === -1) {
      return [{
        rule,
        status: 'unable_to_verify',
        details: 'No Works Cited section found - unable to verify hanging indent formatting',
        suggestions: [
          'Add a Works Cited page to your document',
          'Format Works Cited entries with hanging indent (0.5 inch)'
        ]
      }];
    }

    // Check paragraphs after Works Cited title for hanging indent
    const citationParagraphs = paragraphs.slice(worksCitedStart + 1)
      .filter(p => p.text.trim().length > 0);

    if (citationParagraphs.length === 0) {
      return [{
        rule,
        status: 'failed',
        details: 'Works Cited page found but contains no citations',
        suggestions: [
          'Add citations to your Works Cited page',
          'Format each citation with hanging indent (0.5 inch)'
        ],
        affectedElements: [`Paragraph ${worksCitedStart + 1}`]
      }];
    }

    // Check for hanging indent (0.5 inch = 720 twips)
    const hangingIndent = 720;
    const tolerance = 72;
    
    const correctlyFormattedCount = citationParagraphs.filter(p => 
      p.indentation?.hanging && 
      Math.abs(p.indentation.hanging - hangingIndent) <= tolerance
    ).length;

    const hasCorrectFormatting = correctlyFormattedCount > 0;
    const allHaveCorrectFormatting = correctlyFormattedCount === citationParagraphs.length;

    if (allHaveCorrectFormatting) {
      return [{
        rule,
        status: 'passed',
        details: `All ${citationParagraphs.length} Works Cited entries have proper hanging indent`,
        suggestions: []
      }];
    } else if (hasCorrectFormatting) {
      return [{
        rule,
        status: 'failed',
        details: `Only ${correctlyFormattedCount} of ${citationParagraphs.length} Works Cited entries have hanging indent`,
        suggestions: [
          'Apply hanging indent (0.5 inch) to all Works Cited entries',
          'Select citations and use Format > Paragraph > Indentation: Hanging'
        ],
        affectedElements: [`Works Cited entries`]
      }];
    } else {
      return [{
        rule,
        status: 'failed',
        details: `Works Cited entries do not have hanging indent formatting`,
        suggestions: [
          'Format all Works Cited entries with 0.5-inch hanging indent',
          'Select citations and use Format > Paragraph > Indentation: Hanging: 0.5"',
          'First line should be flush left, subsequent lines indented'
        ],
        affectedElements: [`Works Cited entries`]
      }];
    }
  }

  private static checkInTextCitations(paragraphs: DocxParagraph[]): MLACheckResult[] {
    const rule = this.MLA_RULES.find(r => r.id === 'in-text-citations')!;
    
    // Look for common MLA in-text citation patterns
    // (Author Page), (Author), ("Title"), etc.
    const citationPatterns = [
      /\([A-Za-z]+\s+\d+\)/,  // (Smith 123)
      /\([A-Za-z]+\)/,        // (Smith)
      /\(".*?"\)/,            // ("Title")
      /\([A-Za-z]+\s+et\s+al\.\s*\d*\)/  // (Smith et al. 123)
    ];

    const bodyParagraphs = paragraphs.filter(p => 
      p.text.trim().length > 0 && 
      !p.text.toLowerCase().includes('works cited') &&
      p.alignment !== 'center' // Skip title
    );

    const paragraphsWithCitations = bodyParagraphs.filter(p =>
      citationPatterns.some(pattern => pattern.test(p.text))
    );

    const citationCount = bodyParagraphs.reduce((count, p) => {
      return count + citationPatterns.reduce((pCount, pattern) => {
        const matches = p.text.match(new RegExp(pattern.source, 'g'));
        return pCount + (matches ? matches.length : 0);
      }, 0);
    }, 0);

    if (citationCount === 0) {
      return [{
        rule,
        status: 'failed',
        details: 'No in-text citations found in document',
        suggestions: [
          'Add proper MLA in-text citations for all sources used',
          'Format as (Author Page) or (Author) for sources without page numbers',
          'Place citations before punctuation marks'
        ],
        affectedElements: ['Document body']
      }];
    } else if (citationCount < 3) {
      return [{
        rule,
        status: 'failed',
        details: `Only ${citationCount} in-text citations found - may be insufficient for academic paper`,
        suggestions: [
          'Ensure all borrowed ideas, quotes, and paraphrases are cited',
          'Add more citations to support your arguments',
          'Check that citation format follows MLA guidelines'
        ],
        affectedElements: [`${paragraphsWithCitations.length} paragraphs with citations`]
      }];
    } else {
      return [{
        rule,
        status: 'passed',
        details: `Found ${citationCount} in-text citations in ${paragraphsWithCitations.length} paragraphs`,
        suggestions: []
      }];
    }
  }

  private static checkParagraphAlignment(paragraphs: DocxParagraph[]): MLACheckResult[] {
    const rule = this.MLA_RULES.find(r => r.id === 'paragraph-alignment')!;
    
    let incorrectAlignmentCount = 0;
    const affectedElements: string[] = [];

    paragraphs.forEach((paragraph, index) => {
      // Skip empty paragraphs and potential titles
      if (paragraph.text.trim().length === 0) {
        return;
      }

      // Body paragraphs should be left-aligned (or default alignment)
      // Exception: titles can be centered
      const isTitle = this.isPotentialTitle(paragraph, index, paragraphs);
      
      if (!isTitle && paragraph.alignment && paragraph.alignment !== 'left' && paragraph.alignment !== 'start') {
        incorrectAlignmentCount++;
        affectedElements.push(`Paragraph ${index + 1}`);
      }
    });

    const passed = incorrectAlignmentCount === 0;
    
    return [{
      rule,
      status: passed ? 'passed' : 'failed',
      details: passed 
        ? 'All body paragraphs are properly left-aligned'
        : `Found ${incorrectAlignmentCount} paragraphs with incorrect alignment`,
      suggestions: passed ? [] : [
        'Set paragraph alignment to left for all body text',
        'Use Ctrl+L or Format > Paragraph > Alignment: Left'
      ],
      affectedElements: passed ? [] : affectedElements
    }];
  }

  private static checkTitleFormatting(paragraphs: DocxParagraph[]): MLACheckResult[] {
    const rule = this.MLA_RULES.find(r => r.id === 'title-formatting')!;
    
    // Look for potential title (usually first few non-empty paragraphs)
    const title = this.findTitle(paragraphs);
    
    if (!title) {
      return [{
        rule,
        status: 'failed',
        details: 'No clear title found in document',
        suggestions: [
          'Add a centered title to your document',
          'Title should be in the same font as body text, centered'
        ]
      }];
    }

    // Check if title is properly formatted
    const isCentered = title.paragraph.alignment === 'center';
    const hasExcessiveFormatting = title.paragraph.runs.some(run => 
      run.formatting.bold || run.formatting.italic || run.formatting.underline
    );

    const passed = isCentered && !hasExcessiveFormatting;
    
    return [{
      rule,
      status: passed ? 'passed' : 'failed',
      details: passed 
        ? 'Title is properly centered with no excessive formatting'
        : `Title formatting issues: ${!isCentered ? 'not centered' : ''} ${hasExcessiveFormatting ? 'has excessive formatting' : ''}`.trim(),
      suggestions: passed ? [] : [
        'Center the title using Ctrl+E or Format > Paragraph > Center',
        'Remove bold, italic, or underline formatting from title',
        'Title should use same font and size as body text'
      ],
      affectedElements: [`Paragraph ${title.index + 1}`]
    }];
  }

  private static checkExcessiveFormatting(paragraphs: DocxParagraph[]): MLACheckResult[] {
    const rule = this.MLA_RULES.find(r => r.id === 'excessive-formatting')!;
    
    let formattingCount = 0;
    const affectedElements: string[] = [];

    paragraphs.forEach((paragraph, index) => {
      // Skip title
      if (this.isPotentialTitle(paragraph, index, paragraphs)) {
        return;
      }

      paragraph.runs.forEach(run => {
        if (run.formatting.bold || run.formatting.italic || run.formatting.underline) {
          formattingCount++;
          if (!affectedElements.includes(`Paragraph ${index + 1}`)) {
            affectedElements.push(`Paragraph ${index + 1}`);
          }
        }
      });
    });

    // Allow some formatting for emphasis, but warn if excessive
    const passed = formattingCount <= 5; // Arbitrary threshold
    
    return [{
      rule,
      status: passed ? 'passed' : 'failed',
      details: passed 
        ? 'Appropriate use of text formatting'
        : `Found ${formattingCount} instances of bold/italic/underline formatting`,
      suggestions: passed ? [] : [
        'Minimize use of bold, italic, and underline formatting',
        'MLA style prefers minimal text formatting',
        'Consider removing unnecessary formatting'
      ],
      affectedElements: passed ? [] : affectedElements
    }];
  }

  private static checkWorksCited(paragraphs: DocxParagraph[]): MLACheckResult[] {
    const rule = this.MLA_RULES.find(r => r.id === 'works-cited')!;
    
    // Look for "Works Cited" page
    const hasWorksCited = paragraphs.some(paragraph => 
      paragraph.text.toLowerCase().includes('works cited') ||
      paragraph.text.toLowerCase().includes('bibliography')
    );

    return [{
      rule,
      status: hasWorksCited ? 'passed' : 'failed',
      details: hasWorksCited 
        ? 'Document includes a Works Cited section'
        : 'No Works Cited section found',
      suggestions: hasWorksCited ? [] : [
        'Add a Works Cited page at the end of your document',
        'List all sources used in your paper',
        'Format citations according to MLA guidelines'
      ]
    }];
  }

  private static isPotentialTitle(paragraph: DocxParagraph, index: number, allParagraphs: DocxParagraph[]): boolean {
    // Consider first few non-empty paragraphs as potential titles
    const nonEmptyIndex = allParagraphs.slice(0, index + 1).filter(p => p.text.trim().length > 0).length;
    return nonEmptyIndex <= 3 && 
           (paragraph.alignment === 'center' || 
            paragraph.text.length < 100); // Short text might be title
  }

  private static findTitle(paragraphs: DocxParagraph[]): { paragraph: DocxParagraph; index: number } | null {
    // Look for centered text in first few paragraphs
    for (let i = 0; i < Math.min(5, paragraphs.length); i++) {
      const paragraph = paragraphs[i];
      if (paragraph.text.trim().length > 0 && paragraph.alignment === 'center') {
        return { paragraph, index: i };
      }
    }
    
    // If no centered text, assume first non-empty paragraph is title
    for (let i = 0; i < Math.min(3, paragraphs.length); i++) {
      const paragraph = paragraphs[i];
      if (paragraph.text.trim().length > 0) {
        return { paragraph, index: i };
      }
    }
    
    return null;
  }

  static getRuleById(ruleId: string): MLARule | undefined {
    return this.MLA_RULES.find(rule => rule.id === ruleId);
  }

  static getAllRules(): MLARule[] {
    return [...this.MLA_RULES];
  }

  static getRulesByCategory(category: string): MLARule[] {
    return this.MLA_RULES.filter(rule => rule.category === category);
  }

  private static isTimesNewRomanFont(fontFamily: string): boolean {
    if (!fontFamily) return false;
    
    const normalized = fontFamily.toLowerCase().trim();
    const timesVariants = [
      'times new roman',
      'times',
      'tnr',
      'times nr',
      'times new roman mt',
      'times new roman ps'
    ];
    
    return timesVariants.some(variant => normalized.includes(variant));
  }

  private static isDoubleSpaced(paragraph: DocxParagraph): boolean {
    if (!paragraph.spacing) {
      // No spacing info means single spacing by default
      return false;
    }

    const { line, lineRule } = paragraph.spacing;
    
    // Different ways to represent double spacing in DOCX:
    // 1. lineRule="auto" with line=480 (exactly double)
    // 2. lineRule="auto" with line in range 450-520 (approximately double) 
    // 3. lineRule="exact" with line=480 (fixed double spacing)
    // 4. No lineRule but line >= 450 (legacy format)
    
    if (lineRule === 'auto') {
      return line !== undefined && line >= 450 && line <= 520;
    } else if (lineRule === 'exact') {
      return line !== undefined && Math.abs(line - 480) <= 50;
    } else if (line !== undefined) {
      // Default case or legacy format
      return line >= 450 && line <= 520;
    }
    
    return false;
  }
}