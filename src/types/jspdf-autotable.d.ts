declare module 'jspdf-autotable' {
  import { jsPDF } from 'jspdf';

  export interface CellDef {
    content?: string | number;
    colSpan?: number;
    rowSpan?: number;
    styles?: Partial<Styles>;
  }

  export interface RowInput {
    [key: string]: string | number | CellDef;
  }

  export interface Styles {
    font?: string;
    fontStyle?: string;
    overflow?: 'linebreak' | 'ellipsize' | 'visible' | 'hidden';
    fillColor?: number | [number, number, number] | false;
    textColor?: number | [number, number, number];
    cellWidth?: 'auto' | 'wrap' | number;
    minCellHeight?: number;
    minCellWidth?: number;
    halign?: 'left' | 'center' | 'right';
    valign?: 'top' | 'middle' | 'bottom';
    fontSize?: number;
    cellPadding?: number | { top?: number; right?: number; bottom?: number; left?: number };
    lineColor?: number | [number, number, number];
    lineWidth?: number;
  }

  export interface CellHookData {
    cell: {
      raw: string | number | CellDef;
      content: string;
      styles: Styles;
      section: 'head' | 'body' | 'foot';
      x: number;
      y: number;
      width: number;
      height: number;
    };
    row: {
      index: number;
      raw: RowInput | string[];
      cells: Record<string, unknown>;
    };
    column: {
      index: number;
      dataKey: string | number;
    };
    section: 'head' | 'body' | 'foot';
  }

  export interface UserOptions {
    head?: (string | CellDef)[][];
    body?: (string | number | CellDef)[][];
    foot?: (string | CellDef)[][];
    startY?: number;
    margin?: number | { top?: number; right?: number; bottom?: number; left?: number };
    pageBreak?: 'auto' | 'avoid' | 'always';
    rowPageBreak?: 'auto' | 'avoid';
    tableWidth?: 'auto' | 'wrap' | number;
    showHead?: 'everyPage' | 'firstPage' | 'never';
    showFoot?: 'everyPage' | 'lastPage' | 'never';
    tableLineColor?: number | [number, number, number];
    tableLineWidth?: number;
    theme?: 'striped' | 'grid' | 'plain';
    styles?: Partial<Styles>;
    headStyles?: Partial<Styles>;
    bodyStyles?: Partial<Styles>;
    footStyles?: Partial<Styles>;
    alternateRowStyles?: Partial<Styles>;
    columnStyles?: Record<string | number, Partial<Styles>>;
    didParseCell?: (data: CellHookData) => void;
    willDrawCell?: (data: CellHookData) => void;
    didDrawCell?: (data: CellHookData) => void;
    didDrawPage?: (data: { pageNumber: number; pageCount: number; settings: unknown; cursor: { x: number; y: number } }) => void;
  }

  export default function autoTable(doc: jsPDF, options: UserOptions): void;
}
