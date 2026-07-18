export interface Position {
  id: string;
  electionId: string;
  title: string;
  description: string | null;
  maxSelections: number;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
  _count?: { candidates: number };
}

export interface PositionFormValues {
  title: string;
  description?: string;
  maxSelections: number;
  displayOrder?: number;
}
