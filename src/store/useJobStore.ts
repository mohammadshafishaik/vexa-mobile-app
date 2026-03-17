import { create } from 'zustand';
import { ServiceRequest, Bid, JobModification, JobStatus } from '../types';

interface JobState {
  // State
  jobs: ServiceRequest[];
  selectedJob: ServiceRequest | null;
  bids: Bid[];
  modifications: JobModification[];
  isLoading: boolean;
  error: string | null;

  // Actions
  setJobs: (jobs: ServiceRequest[]) => void;
  addJob: (job: ServiceRequest) => void;
  updateJob: (jobId: string, updates: Partial<ServiceRequest>) => void;
  removeJob: (jobId: string) => void;
  setSelectedJob: (job: ServiceRequest | null) => void;

  setBids: (bids: Bid[]) => void;
  addBid: (bid: Bid) => void;
  updateBid: (bidId: string, updates: Partial<Bid>) => void;

  setModifications: (modifications: JobModification[]) => void;
  addModification: (modification: JobModification) => void;
  updateModification: (modId: string, updates: Partial<JobModification>) => void;

  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearJobState: () => void;
}

export const useJobStore = create<JobState>((set) => ({
  // Initial state
  jobs: [],
  selectedJob: null,
  bids: [],
  modifications: [],
  isLoading: false,
  error: null,

  // Job actions
  setJobs: (jobs) => set({ jobs }),

  addJob: (job) =>
    set((state) => ({ jobs: [job, ...state.jobs] })),

  updateJob: (jobId, updates) =>
    set((state) => ({
      jobs: state.jobs.map((j) =>
        j.id === jobId ? { ...j, ...updates } : j,
      ),
      selectedJob:
        state.selectedJob?.id === jobId
          ? { ...state.selectedJob, ...updates }
          : state.selectedJob,
    })),

  removeJob: (jobId) =>
    set((state) => ({
      jobs: state.jobs.filter((j) => j.id !== jobId),
    })),

  setSelectedJob: (job) => set({ selectedJob: job }),

  // Bid actions
  setBids: (bids) => set({ bids }),

  addBid: (bid) =>
    set((state) => ({ bids: [...state.bids, bid] })),

  updateBid: (bidId, updates) =>
    set((state) => ({
      bids: state.bids.map((b) =>
        b.id === bidId ? { ...b, ...updates } : b,
      ),
    })),

  // Modification actions
  setModifications: (modifications) => set({ modifications }),

  addModification: (modification) =>
    set((state) => ({
      modifications: [...state.modifications, modification],
    })),

  updateModification: (modId, updates) =>
    set((state) => ({
      modifications: state.modifications.map((m) =>
        m.id === modId ? { ...m, ...updates } : m,
      ),
    })),

  // General
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  clearJobState: () =>
    set({
      jobs: [],
      selectedJob: null,
      bids: [],
      modifications: [],
      isLoading: false,
      error: null,
    }),
}));
