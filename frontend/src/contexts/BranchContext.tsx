import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { api } from './AuthContext';
import { useAuth } from './AuthContext';
import type { BranchDetail } from './AuthContext';

interface BranchContextType {
  assignedBranches: BranchDetail[];
  selectedBranch: string | null;
  setSelectedBranch: (id: string) => void;
  loading: boolean;
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

export const BranchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAdmin } = useAuth();
  const [allBranches, setAllBranches] = useState<BranchDetail[]>([]);
  const [selectedBranch, setSelectedBranchState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    api.get('inventory/branches/').then((res) => {
      if (!cancelled) setAllBranches(res.data);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [user, isAdmin]);

  const assignedBranches = useMemo<BranchDetail[]>(() => {
    if (!user) return [];
    return isAdmin ? allBranches : user.branch_details;
  }, [isAdmin, allBranches, user]);

  useEffect(() => {
    if (selectedBranch && assignedBranches.some(b => b.id === selectedBranch)) return;
    if (assignedBranches.length > 0) setSelectedBranchState(assignedBranches[0].id);
  }, [assignedBranches, selectedBranch]);

  return (
    <BranchContext.Provider value={{ assignedBranches, selectedBranch, setSelectedBranch: setSelectedBranchState, loading }}>
      {children}
    </BranchContext.Provider>
  );
};

export const useBranch = () => {
  const context = useContext(BranchContext);
  if (!context) throw new Error('useBranch must be used within a BranchProvider');
  return context;
};
