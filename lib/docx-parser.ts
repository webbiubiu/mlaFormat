// eslint-disable-next-line @typescript-eslint/no-explicit-any
type XMLNode = any;

import JSZip from 'jszip';
import { parseString as parseXML } from 'xml2js';

export interface DocxParseResult {
  content: string;
  styles: XMLNode | null;
  settings: XMLNode | null;
  wordXML: XMLNode;
  numbering?: XMLNode | null;
  footnotes?: XMLNode | null;
  headers?: XMLNode | null;
  footers?: XMLNode | null;
  relationships?: XMLNode | null;
}

export interface DocxStyle {
  name: string;
  type: string;
  fontFamily?: string;
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  lineSpacing?: number;
  firstLineIndent?: number;
  leftIndent?: number;
  rightIndent?: number;
  spaceAfter?: number;
  spaceBefore?: number;
  alignment?: string;
}

export interface DocxParagraph {
  text: string;
  style?: string;
  runs: DocxRun[];
  alignment?: string;
  indentation?: {
    left?: number;
    right?: number;
    firstLine?: number;
    hanging?: number;
  };
  spacing?: {
    before?: number;
    after?: number;
    line?: number;
    lineRule?: string;
  };
}

export interface DocxRun {
  text: string;
  formatting: {
    fontFamily?: string;
    fontSize?: number;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    color?: string;
  };
}

export interface DocxPageSettings {
  margins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  pageSize: {
    width: number;
    height: number;
  };
  orientation: string;
}

export class DocxParser {
  private static parseXmlAsync(xmlContent: string): Promise<XMLNode> {
    return new Promise((resolve, reject) => {
      parseXML(xmlContent, { mergeAttrs: true, explicitArray: false }, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  }

  static async parseDocx(file: File): Promise<DocxParseResult> {
    try {
      const zip = await JSZip.loadAsync(file);
      
      // Extract main document content
      const documentXml = await zip.file('word/document.xml')?.async('text');
      if (!documentXml) {
        throw new Error('Invalid DOCX file: document.xml not found');
      }

      // Extract styles
      const stylesXml = await zip.file('word/styles.xml')?.async('text');
      
      // Extract settings
      const settingsXml = await zip.file('word/settings.xml')?.async('text');
      
      // Extract numbering (for lists)
      const numberingXml = await zip.file('word/numbering.xml')?.async('text');
      
      // Extract footnotes
      const footnotesXml = await zip.file('word/footnotes.xml')?.async('text');
      
      // Extract relationships
      const relsXml = await zip.file('word/_rels/document.xml.rels')?.async('text');

      // Parse XML content
      const [wordXML, styles, settings, numbering, footnotes, relationships] = await Promise.all([
        this.parseXmlAsync(documentXml),
        stylesXml ? this.parseXmlAsync(stylesXml) : null,
        settingsXml ? this.parseXmlAsync(settingsXml) : null,
        numberingXml ? this.parseXmlAsync(numberingXml) : null,
        footnotesXml ? this.parseXmlAsync(footnotesXml) : null,
        relsXml ? this.parseXmlAsync(relsXml) : null,
      ]);

      // Extract plain text content
      const content = this.extractTextContent(wordXML);

      return {
        content,
        styles,
        settings,
        wordXML,
        numbering,
        footnotes,
        relationships
      };
    } catch (error) {
      console.error('Error parsing DOCX:', error);
      throw new Error(`Failed to parse DOCX file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static extractTextContent(wordXML: XMLNode): string {
    if (!wordXML?.document?.body?.p) {
      return '';
    }

    const paragraphs = Array.isArray(wordXML.document.body.p) 
      ? wordXML.document.body.p 
      : [wordXML.document.body.p];

    return paragraphs
      .map((paragraph: XMLNode) => this.extractParagraphText(paragraph))
      .filter((text: string) => text.trim().length > 0)
      .join('\n\n');
  }

  static extractParagraphText(paragraph: XMLNode): string {
    if (!paragraph?.r) {
      return '';
    }

    const runs = Array.isArray(paragraph.r) ? paragraph.r : [paragraph.r];
    
    return runs
      .map((run: XMLNode) => {
        if (run.t) {
          return Array.isArray(run.t) ? run.t.join('') : run.t;
        }
        return '';
      })
      .join('');
  }

  static extractParagraphs(wordXML: XMLNode): DocxParagraph[] {
    if (!wordXML?.document?.body?.p) {
      return [];
    }

    const paragraphs = Array.isArray(wordXML.document.body.p) 
      ? wordXML.document.body.p 
      : [wordXML.document.body.p];

    return paragraphs.map((p: XMLNode) => this.parseParagraph(p));
  }

  static parseParagraph(paragraph: XMLNode): DocxParagraph {
    const text = this.extractParagraphText(paragraph);
    const runs = this.parseRuns(paragraph);
    
    // Extract paragraph properties
    const pPr = paragraph.pPr || {};
    
    // Extract alignment
    const alignment = pPr.jc?.val || 'left';
    
    // Extract indentation
    const indentation = pPr.ind ? {
      left: pPr.ind.left ? parseInt(pPr.ind.left) : undefined,
      right: pPr.ind.right ? parseInt(pPr.ind.right) : undefined,
      firstLine: pPr.ind.firstLine ? parseInt(pPr.ind.firstLine) : undefined,
      hanging: pPr.ind.hanging ? parseInt(pPr.ind.hanging) : undefined,
    } : undefined;

    // Extract spacing
    const spacing = pPr.spacing ? {
      before: pPr.spacing.before ? parseInt(pPr.spacing.before) : undefined,
      after: pPr.spacing.after ? parseInt(pPr.spacing.after) : undefined,
      line: pPr.spacing.line ? parseInt(pPr.spacing.line) : undefined,
      lineRule: pPr.spacing.lineRule || 'auto',
    } : undefined;

    return {
      text,
      style: pPr.pStyle?.val,
      runs,
      alignment,
      indentation,
      spacing
    };
  }

  static parseRuns(paragraph: XMLNode): DocxRun[] {
    if (!paragraph?.r) {
      return [];
    }

    const runs = Array.isArray(paragraph.r) ? paragraph.r : [paragraph.r];
    
    return runs.map((run: XMLNode) => {
      const text = run.t ? (Array.isArray(run.t) ? run.t.join('') : run.t) : '';
      
      // Extract run properties
      const rPr = run.rPr || {};
      
      const formatting = {
        fontFamily: rPr.rFonts?.ascii || rPr.rFonts?.hAnsi,
        fontSize: this.parseFontSize(rPr.sz?.val),
        bold: !!rPr.b,
        italic: !!rPr.i,
        underline: !!rPr.u,
        color: rPr.color?.val,
      };

      return { text, formatting };
    });
  }

  static extractStyles(stylesXML: XMLNode | null): DocxStyle[] {
    if (!stylesXML?.styles?.style) {
      return [];
    }

    const styles = Array.isArray(stylesXML.styles.style) 
      ? stylesXML.styles.style 
      : [stylesXML.styles.style];

    return styles.map((style: XMLNode) => this.parseStyle(style));
  }

  static parseStyle(style: XMLNode): DocxStyle {
    const name = style.name?.val || style.styleId;
    const type = style.type || 'paragraph';
    
    // Extract character properties
    const rPr = style.rPr || {};
    const pPr = style.pPr || {};
    
    return {
      name,
      type,
      fontFamily: rPr.rFonts?.ascii || rPr.rFonts?.hAnsi,
      fontSize: this.parseFontSize(rPr.sz?.val),
      bold: !!rPr.b,
      italic: !!rPr.i,
      underline: !!rPr.u,
      lineSpacing: pPr.spacing?.line ? parseInt(pPr.spacing.line) : undefined,
      firstLineIndent: pPr.ind?.firstLine ? parseInt(pPr.ind.firstLine) : undefined,
      leftIndent: pPr.ind?.left ? parseInt(pPr.ind.left) : undefined,
      rightIndent: pPr.ind?.right ? parseInt(pPr.ind.right) : undefined,
      spaceAfter: pPr.spacing?.after ? parseInt(pPr.spacing.after) : undefined,
      spaceBefore: pPr.spacing?.before ? parseInt(pPr.spacing.before) : undefined,
      alignment: pPr.jc?.val || 'left',
    };
  }

  static extractPageSettings(settingsXML: XMLNode | null): DocxPageSettings | null {
    if (!settingsXML?.settings) {
      return null;
    }

    // Default page settings (Letter size, 1 inch margins)
    const pageSettings: DocxPageSettings = {
      margins: {
        top: 1440,    // 1 inch in twips (1440 twips = 1 inch)
        bottom: 1440,
        left: 1440,
        right: 1440,
      },
      pageSize: {
        width: 12240,  // 8.5 inches in twips
        height: 15840, // 11 inches in twips
      },
      orientation: 'portrait'
    };

    // Extract page margins from document defaults if available
    try {
      if (settingsXML.settings.defaultTabStop) {
        // This indicates the document has custom settings
      }
      
      // Try to find section properties which contain page setup
      // This is a simplified version - real implementation would need to
      // parse the document.xml to find sectPr elements
      
      return pageSettings;
    } catch (error) {
      console.warn('Error parsing page settings:', error);
      return pageSettings;
    }
  }

  // Convert twips to inches (1 inch = 1440 twips)
  static twipsToInches(twips: number): number {
    return twips / 1440;
  }

  // Convert half-points to points (font sizes in DOCX are in half-points)
  static halfPointsToPoints(halfPoints: number): number {
    return halfPoints / 2;
  }

  // Parse font size with better error handling and validation
  static parseFontSize(sizeValue: string | number | undefined): number | undefined {
    if (!sizeValue) return undefined;
    
    // Convert to number if string
    const numValue = typeof sizeValue === 'string' ? parseInt(sizeValue) : sizeValue;
    
    // Validate the number
    if (isNaN(numValue) || numValue <= 0) return undefined;
    
    // Convert from half-points to points
    const points = numValue / 2;
    
    // Ensure reasonable font size range (4pt to 72pt)
    if (points < 4 || points > 72) return undefined;
    
    return points;
  }
}