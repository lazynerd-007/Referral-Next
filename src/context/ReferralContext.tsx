'use client';

import { createContext, useContext, useState, ReactNode, useCallback, useMemo, useEffect } from 'react';
import { getDashboardAnalytics, AnalyticsMetric } from '@/services/api';

interface Referral {
  id: string;
  userName: string;
  registrationDate: Date;
  status: 'registered' | 'completed';
  pointsEarned?: number;
}

interface Transaction {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  date: Date;
  status: 'completed' | 'pending';
  pointsEarned: number;
}

interface ReferralStats {
  totalReferrals: number;
  totalPoints: number;
  conversionRate: number;
  growthRateReferrals: number;
  growthRatePoints: number;
  growthRateConversion: number;
  totalAmount: number;
}

interface ReferralContextType {
  referrals: Referral[];
  transactions: Transaction[];
  stats: ReferralStats;
  isLoading: boolean;
  copyReferralLink: () => void;
  generateReferralLink: (userId: string) => string;
  fetchStats: () => Promise<void>;
}

const ReferralContext = createContext<ReferralContextType | undefined>(undefined);

export const useReferral = (): ReferralContextType => {
  const context = useContext(ReferralContext);
  if (!context) {
    throw new Error('useReferral must be used within a ReferralProvider');
  }
  return context;
};

interface ReferralProviderProps {
  children: ReactNode;
}

export const ReferralProvider = ({ children }: ReferralProviderProps) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  // Default stats
  const [stats, setStats] = useState<ReferralStats>({
    totalReferrals: 0,
    totalPoints: 0,
    conversionRate: 0,
    growthRateReferrals: 0,
    growthRatePoints: 0,
    growthRateConversion: 0,
    totalAmount: 0,
  });
  
  // Mock data for the demo - using useMemo to avoid recreating on rerenders
  const referrals = useMemo<Referral[]>(() => [
    {
      id: '1',
      userName: 'John D.',
      registrationDate: new Date(new Date().getTime() - 2 * 60 * 1000),
      status: 'registered',
      pointsEarned: 0, // No points for just registration
    },
    {
      id: '2',
      userName: 'Sarah M.',
      registrationDate: new Date(new Date().getTime() - 5 * 60 * 1000),
      status: 'completed',
      pointsEarned: 50, // Points earned because user subscribed
    },
    {
      id: '3',
      userName: 'Alex K.',
      registrationDate: new Date(new Date().getTime() - 12 * 60 * 1000),
      status: 'registered',
      pointsEarned: 0, // No points for just registration
    },
  ], []);

  const transactions = useMemo<Transaction[]>(() => [
    {
      id: '1',
      userId: '2',
      userName: 'Sarah M.',
      amount: 200,
      date: new Date(new Date().getTime() - 5 * 60 * 1000),
      status: 'completed',
      pointsEarned: 50,
    },
  ], []);

  const fetchStats = useCallback(async (): Promise<void> => {
    // Only fetch if we're in a browser environment
    if (typeof window === 'undefined') return;
    
    try {
      setIsLoading(true);
      const response = await getDashboardAnalytics();
      
      if (response.status === 200 && response.data) {
        // Map API response to our stats structure
        const newStats: ReferralStats = {
          totalReferrals: 0,
          totalPoints: 0,
          conversionRate: 0,
          growthRateReferrals: 0,
          growthRatePoints: 0,
          growthRateConversion: 0,
          totalAmount: 0
        };
        
        // Map each metric from the API to our stats object
        response.data.forEach((metric: AnalyticsMetric) => {
          switch (metric.metric) {
            case 'total referrals':
              newStats.totalReferrals = metric.value;
              newStats.growthRateReferrals = metric.month_growth;
              break;
            case 'total points':
              newStats.totalPoints = metric.value;
              newStats.growthRatePoints = metric.month_growth;
              break;
            case 'conversion rate':
              newStats.conversionRate = metric.value;
              newStats.growthRateConversion = metric.month_growth;
              break;
            case 'total amount':
              newStats.totalAmount = metric.value;
              // We also use this growth rate for the total amount
              newStats.growthRatePoints = metric.month_growth;
              break;
          }
        });
        
        setStats(newStats);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard analytics:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // Load stats when component mounts
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const copyReferralLink = useCallback((): void => {
    const link = generateReferralLink('123456');
    // Safe clipboard access
    if (typeof window !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(link)
        .then(() => console.log('Referral link copied to clipboard'))
        .catch((err) => console.error('Could not copy referral link: ', err));
    }
  }, []);

  const generateReferralLink = useCallback((userId: string): string => {
    return `https://optisage.com/ref/${userId}`;
  }, []);

  // Using useMemo for the context value to prevent unnecessary rerenders
  const value = useMemo(() => ({
    referrals,
    transactions,
    stats,
    isLoading,
    copyReferralLink,
    generateReferralLink,
    fetchStats,
  }), [referrals, transactions, stats, isLoading, copyReferralLink, generateReferralLink, fetchStats]);

  return <ReferralContext.Provider value={value}>{children}</ReferralContext.Provider>;
}; 