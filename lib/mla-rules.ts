import { DocxParseResult, DocxParagraph, DocxParser, DocxStyle, DocxPageSettings } from './docx-parser';

export interface MLARule {
  id: string;
  name: string;
  description: string;
  severity: 'error' | 'warning' | 'info';
  category: 'formatting' | 'structure' | 'citations' | 'page-setup';
}

export interface MLACheckResult {
  rule: MLARule;
  passed: boolean;
  details: string;
  suggestions?: string[];
  affectedElements?: string[];
}

export interface MLAAnalysisResult {
  overallScore: number;
  totalRules: number;
  passedRules: number;
  failedRules: number;
  results: MLACheckResult[];
  summary: {
    critical: number;
    errors: number;
    warnings: number;
    passed: number;
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
    results.push(...this.checkTitleFormatting(paragraphs));
    results.push(...this.checkExcessiveFormatting(paragraphs));
    results.push(...this.checkWorksCited(paragraphs));

    // Calculate scores
    const totalRules = results.length;
    const passedRules = results.filter(r => r.passed).length;
    const failedRules = totalRules - passedRules;
    const overallScore = totalRules > 0 ? Math.round((passedRules / totalRules) * 100) : 0;

    // Categorize results
    const summary = {
      critical: results.filter(r => !r.passed && r.rule.severity === 'error').length,
      errors: results.filter(r => !r.passed && r.rule.severity === 'error').length,
      warnings: results.filter(r => !r.passed && r.rule.severity === 'warning').length,
      passed: passedRules
    };

    return {
      overallScore,
      totalRules,
      passedRules,
      failedRules,
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
                        { fontFamily: undefined, fontSize: 12 }; // Default to 12pt if not found

    // Assume default font size is 12pt if not explicitly set
    const defaultFontSize = defaultStyle.fontSize || 12;
    
    let hasExplicitFontInfo = false;
    let totalFontChecks = 0;

    paragraphs.forEach((paragraph, index) => {
      paragraph.runs.forEach(run => {
        totalFontChecks++;
        
        // Check font family
        const effectiveFontFamily = run.formatting.fontFamily || defaultStyle.fontFamily;
        
        if (effectiveFontFamily) {
          hasExplicitFontInfo = true;
          if (!this.isTimesNewRomanFont(effectiveFontFamily)) {
            nonTimesNewRomanCount++;
            if (!affectedElements.includes(`Paragraph ${index + 1}`)) {
              affectedElements.push(`Paragraph ${index + 1}`);
            }
          }
        }
        
        // Check font size - use effective font size (explicit or default)
        const effectiveFontSize = run.formatting.fontSize || defaultFontSize;
        
        if (run.formatting.fontSize !== undefined) {
          hasExplicitFontInfo = true;
        }
        
        if (Math.abs(effectiveFontSize - 12) > 0.1) { // Allow small rounding differences
          wrongFontSizeCount++;
          if (!affectedElements.includes(`Paragraph ${index + 1}`)) {
            affectedElements.push(`Paragraph ${index + 1}`);
          }
        }
      });
    });

    // Font family result
    const fontFamilyPassed = nonTimesNewRomanCount === 0;
    results.push({
      rule: fontFamilyRule,
      passed: fontFamilyPassed,
      details: !hasExplicitFontInfo && defaultStyle.fontFamily === undefined
        ? 'No font family information found - unable to verify Times New Roman requirement'
        : fontFamilyPassed 
          ? 'All text uses Times New Roman font family (or default is acceptable)'
          : `Found ${nonTimesNewRomanCount} instances of non-Times New Roman fonts`,
      suggestions: !hasExplicitFontInfo && defaultStyle.fontFamily === undefined ? [
        'Ensure document specifies Times New Roman as font family',
        'Set Times New Roman as the default font in your document'
      ] : fontFamilyPassed ? [] : [
        'Change all fonts to Times New Roman',
        'Use Format > Font to set Times New Roman as default'
      ],
      affectedElements: fontFamilyPassed ? [] : affectedElements
    });

    // Font size result - assume default 12pt is correct if no explicit sizes found
    const fontSizePassed = wrongFontSizeCount === 0;
    results.push({
      rule: fontSizeRule,
      passed: fontSizePassed,
      details: fontSizePassed 
        ? `All text uses 12-point font size (checked ${totalFontChecks} text runs)`
        : `Found ${wrongFontSizeCount} instances of incorrect font sizes (expected 12pt)`,
      suggestions: fontSizePassed ? [] : [
        'Set all text to 12-point font size',
        'Use Format > Font to set 12pt as default font size'
      ],
      affectedElements: fontSizePassed ? [] : affectedElements.slice() // Copy array to avoid shared reference
    });

    return results;
  }

  private static checkLineSpacing(paragraphs: DocxParagraph[]): MLACheckResult[] {
    const rule = this.MLA_RULES.find(r => r.id === 'line-spacing')!;
    
    let incorrectSpacingCount = 0;
    const affectedElements: string[] = [];

    paragraphs.forEach((paragraph, index) => {
      // Skip empty paragraphs
      if (paragraph.text.trim().length === 0) {
        return;
      }

      const hasDoubleSpacing = this.isDoubleSpaced(paragraph);
      
      if (!hasDoubleSpacing) {
        incorrectSpacingCount++;
        affectedElements.push(`Paragraph ${index + 1}`);
      }
    });

    const passed = incorrectSpacingCount === 0;
    
    return [{
      rule,
      passed,
      details: passed 
        ? 'Document uses double-spacing throughout'
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
        passed: false,
        details: 'Could not determine page margin settings',
        suggestions: ['Set all margins to 1 inch in Page Setup']
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
      passed: marginsCorrect,
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
    const affectedElements: string[] = [];

    paragraphs.forEach((paragraph, index) => {
      // Skip empty paragraphs and potential titles (centered text)
      if (paragraph.text.trim().length === 0 || paragraph.alignment === 'center') {
        return;
      }

      const hasCorrectIndent = paragraph.indentation?.firstLine && 
                               Math.abs(paragraph.indentation.firstLine - halfInch) <= tolerance;
      
      if (!hasCorrectIndent) {
        incorrectIndentCount++;
        affectedElements.push(`Paragraph ${index + 1}`);
      }
    });

    const passed = incorrectIndentCount === 0;
    
    return [{
      rule,
      passed,
      details: passed 
        ? 'All paragraphs have correct 0.5-inch first-line indent'
        : `Found ${incorrectIndentCount} paragraphs without proper first-line indent`,
      suggestions: passed ? [] : [
        'Set first-line indent to 0.5 inches for all body paragraphs',
        'Use Format > Paragraph > Indentation: First line: 0.5"'
      ],
      affectedElements: passed ? [] : affectedElements
    }];
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
      passed,
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
        passed: false,
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
      passed,
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
      passed,
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
      passed: hasWorksCited,
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