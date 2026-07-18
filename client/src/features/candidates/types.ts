export interface Candidate {
  id: string;
  electionId: string;
  positionId: string;
  name: string;
  bio: string | null;
  photoUrl: string | null;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
  position?: { id: string; title: string };
}

export interface CandidateFormValues {
  positionId: string;
  name: string;
  bio?: string;
}
