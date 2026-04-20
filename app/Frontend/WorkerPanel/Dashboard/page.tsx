"use client";
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import WNavbar from "../../Components/WNavbar";
import WDownbar from "../../Components/WDownbar";
import { useRouter } from 'next/navigation';

export default function Dashboard() {
  const router = useRouter();
  const [points, setPoints] = useState(0);
  const [surveys, setSurveys] = useState<any[]>([]);
  const [pendingSurveys, setPendingSurveys] = useState<any[]>([]);
  const [pendingFormsCount, setPendingFormsCount] = useState(0);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const { fetchWalletHistory, fetchAllSurveys, fetchActiveSession, checkUserSubmission } = await import('../../../../utils/api');
        const [walletRes, surveysRes] = await Promise.all([
          fetchWalletHistory(),
          fetchAllSurveys()
        ]);

        if (walletRes?.success) setPoints(walletRes.total_points || 0);
        
        if (surveysRes?.success) {
          const allSurveys = surveysRes.data || [];
          
          // Filter to only non-deleted, non-expired surveys
          const activeAndCompleted = allSurveys.filter((s: any) => {
              // Always show completed surveys in the list
              if (s.is_completed) return true;
              // Otherwise only show if it's not expired
              if (!s.end_time) return true;
              return new Date() < new Date(s.end_time);
          });
 
          const processedSurveys = activeAndCompleted.map((s: any) => ({
            ...s,
            status: s.is_completed ? 'completed' : 'active'
          }));
          
          const pendingArray = processedSurveys.filter((s: any) => s.status === 'active');
          
          setSurveys(processedSurveys);
          setPendingFormsCount(pendingArray.length);
          setPendingSurveys(processedSurveys);
        }
      } catch (err) {
        console.error('Failed to load dashboard', err);
      }
    };
    loadDashboard();
  }, []);

  return (
    <div className="flex flex-col space-y-6 pt-4 pb-24">
      <WNavbar />
      {/* Top Value Cards */}
      <div className="grid grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-xl shadow-sm p-4 border border-gray-50 flex flex-col items-center justify-center"
        >
          <span className="text-xs text-[#1e6cb3] font-semibold">Wallet Points</span>
          <span className="text-3xl font-bold text-gray-800 mt-2">{points.toLocaleString()}</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className={`bg-white rounded-xl shadow-sm p-4 border border-gray-50 flex flex-col items-center justify-center transition-all ${pendingFormsCount > 0 ? 'ring-2 ring-[#fcc12d]/30' : ''}`}
        >
          <span className="text-xs text-[#1e6cb3] font-semibold">Active Pending</span>
          <span className={`text-3xl font-bold mt-2 ${pendingFormsCount > 0 ? 'text-[#fcc12d]' : 'text-gray-800'}`}>
            {pendingFormsCount}
          </span>
        </motion.div>
      </div>

      {/* Progress Chart Placeholder */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="bg-white rounded-xl shadow-sm p-5 border border-gray-50 relative"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-semibold text-gray-800">Forms Status</h2>
        </div>

        <div className="flex justify-center mb-6 relative">
          {/* SVG Ring */}
          <div className="relative w-48 h-48">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                className="text-gray-100"
                strokeWidth="12"
                stroke="currentColor"
                fill="transparent"
                r="40"
                cx="50"
                cy="50"
              />
              <circle
                className="text-[#1e6cb3]"
                strokeWidth="12"
                strokeDasharray="251.2"
                strokeDashoffset={251.2 - (251.2 * (surveys.length > 0 ? (surveys.length - pendingFormsCount) / surveys.length : 0))}
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
                r="40"
                cx="50"
                cy="50"
              />
              <circle
                className="text-[#fcc12d]"
                strokeWidth="12"
                strokeDasharray="251.2"
                strokeDashoffset={251.2 - (251.2 * (surveys.length > 0 ? pendingFormsCount / surveys.length : 1))}
                stroke="currentColor"
                fill="transparent"
                r="40"
                cx="50"
                cy="50"
                style={{ transform: `rotate(${(surveys.length > 0 ? (surveys.length - pendingFormsCount) / surveys.length : 0) * 360}deg)`, transformOrigin: "center" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[10px] text-gray-500 font-medium">Status</span>
              <span className={`text-4xl font-bold ${pendingFormsCount > 0 ? 'text-[#fcc12d]' : 'text-[#1e6cb3]'}`}>
                  {surveys.length > 0 ? Math.round(((surveys.length - pendingFormsCount) / surveys.length) * 100) : 0}%
              </span>
              <span className="text-[9px] text-gray-400 mt-1">{pendingFormsCount > 0 ? 'Action required' : 'All caught up'}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-center items-center space-x-6 text-sm">
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-[#1e6cb3]"></span>
            <span className="text-gray-600 font-medium">
                Completed {surveys.length > 0 ? Math.round(((surveys.length - pendingFormsCount) / surveys.length) * 100) : 0}%
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-[#fcc12d]"></span>
            <span className="text-gray-600 font-medium">
                Pending {surveys.length > 0 ? Math.round((pendingFormsCount / surveys.length) * 100) : 0}%
            </span>
          </div>
        </div>
      </motion.div>

      {/* Available Surveys Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
        className="bg-white rounded-xl shadow-sm p-5 border border-gray-50"
      >
        <h2 className="font-semibold text-gray-800 mb-4">Available Surveys</h2>

        <div className="space-y-3">
          {pendingSurveys.filter(s => s.status === 'active').length === 0 ? (
            <div className="p-4 text-center text-gray-500 font-medium text-sm">No new surveys available.</div>
          ) : (
            pendingSurveys.filter(s => s.status === 'active').map((survey: any) => (
              <div key={survey.id} className="flex justify-between items-center p-3 border border-gray-100 rounded-lg bg-white shadow-sm">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-800">{survey.title}</span>
                    {survey.status === 'completed' ? (
                      <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full font-bold">Completed</span>
                    ) : survey.status === 'active' ? (
                      <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full font-bold">Available</span>
                    ) : (
                      <span className="bg-gray-100 text-gray-500 text-[10px] px-2 py-0.5 rounded-full font-bold">Ended</span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 mt-1">Live Event</span>
                </div>
                
                {survey.status === 'active' ? (
                  <Link href={`/Frontend/WorkerPanel/Forms/Attend?id=${survey.id}`} className="px-4 py-1.5 border border-[#1e6cb3] text-[#1e6cb3] rounded-md text-sm font-medium hover:bg-[#1e6cb3] hover:text-white transition-colors block text-center">
                    Start
                  </Link>
                ) : (
                  <button disabled className="px-4 py-1.5 border border-gray-200 text-gray-400 rounded-md text-sm font-medium cursor-not-allowed">
                    {survey.status === 'completed' ? 'Finished' : 'Closed'}
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </motion.div>
      <WDownbar />

      			
            


    </div>
  );
}