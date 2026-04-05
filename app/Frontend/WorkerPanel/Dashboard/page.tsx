"use client";
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Navbar from "../../Components/Navbar";
import { useRouter } from 'next/navigation';

export default function Dashboard() {
  const router = useRouter();
  const [points, setPoints] = useState(0);
  const [surveys, setSurveys] = useState<any[]>([]);
  const [pendingFormsCount, setPendingFormsCount] = useState(0);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const { fetchWalletHistory, fetchAllSurveys, fetchActiveSession, checkUserSubmission } = await import('../../../../utils/api');
        const walletRes = await fetchWalletHistory();
        if (walletRes?.success) setPoints(walletRes.total_points || 0);
        
        const surveysRes = await fetchAllSurveys();
        if (surveysRes?.success) {
          const allSurveys = surveysRes.data || [];
          setSurveys(allSurveys);

          // Count surveys the worker hasn't yet submitted
          let pending = 0;
          for (const s of allSurveys) {
            try {
              const sessionRes = await fetchActiveSession(s.id);
              if (sessionRes?.success && sessionRes.session?.id) {
                const checkRes = await checkUserSubmission(sessionRes.session.id);
                if (!checkRes?.already_submitted) pending++;
              } else {
                pending++; // No active session yet — counts as pending
              }
            } catch { pending++; }
          }
          setPendingFormsCount(pending);
        }
      } catch (err) {
        console.error('Failed to load dashboard', err);
      }
    };
    loadDashboard();
  }, []);

  return (
    <div className="flex flex-col space-y-6 pt-4">
      <Navbar />

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
          className="bg-white rounded-xl shadow-sm p-4 border border-gray-50 flex flex-col items-center justify-center"
        >
          <span className="text-xs text-[#1e6cb3] font-semibold">Pending Forms</span>
          <span className="text-3xl font-bold text-gray-800 mt-2">{pendingFormsCount}</span>
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
          <h2 className="font-semibold text-gray-800">Monthly Target</h2>
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
                strokeDashoffset="75.36"
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
                strokeDashoffset="175.84"
                stroke="currentColor"
                fill="transparent"
                r="40"
                cx="50"
                cy="50"
                style={{ transform: "rotate(252deg)", transformOrigin: "center" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[10px] text-gray-500 font-medium">Completion</span>
              <span className="text-4xl font-bold text-gray-800">0%</span>
              <span className="text-[9px] text-gray-400 mt-1">Success rate</span>
            </div>
          </div>
        </div>

        <div className="flex justify-center items-center space-x-6 text-sm">
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-[#1e6cb3]"></span>
            <span className="text-gray-600 font-medium">Completed 0%</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-[#fcc12d]"></span>
            <span className="text-gray-600 font-medium">Pending 100%</span>
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
          {surveys.length === 0 ? (
            <div className="p-4 text-center text-gray-500 font-medium text-sm">No pending surveys.</div>
          ) : (
            surveys.map((survey: any) => (
              <div key={survey.id} className="flex justify-between items-center p-3 border border-gray-100 rounded-lg hover:shadow-md transition-shadow cursor-pointer bg-[#f4fbfa]/30">
                <div className="flex flex-col">
                  <span className="font-semibold text-gray-800">{survey.title}</span>
                  <span className="text-xs text-gray-500 mt-1">{"Live Event"}</span>
                </div>
                <Link href={`/Frontend/WorkerPanel/Forms/Attend?id=${survey.id}`} className="px-4 py-1.5 border border-[#1e6cb3] text-[#1e6cb3] rounded-md text-sm font-medium hover:bg-[#1e6cb3] hover:text-white transition-colors block text-center">
                  Start
                </Link>
              </div>
            ))
          )}
        </div>
      </motion.div>

      			
            
      <nav className="fixed inset-x-0 bottom-0 z-20 flex justify-center">
				<div className="relative w-full max-w-[390px]">
					<div className="flex h-20 items-end justify-between rounded-t-[24px] bg-[var(--PBlue)] px-8 pb-3 pt-4 shadow-[0_-4px_18px_rgba(13,22,11,0.15)]">
						<button
							type="button"
							onClick={() => router.push('/Frontend/WorkerPanel/Dashboard')}
							className="flex flex-col items-center gap-1"
							aria-label="Dashboard"
						>
							<img src="/DashboardIcon_rounded.svg" alt="Dashboard" className="h-6 w-6 opacity-80" />
							<span className="font-[var(--font-inter)] text-[11px] text-[color:rgba(237,247,246,0.7)]">Dashboard</span>
						</button>

						<div className="w-20" />

						<button type="button" className="flex flex-col items-center gap-1" aria-label="Forms">
							<img src="/FormsIcon.svg" alt="Forms" className="h-6 w-6" />
							<span className="font-[var(--font-inter)] text-[11px] text-[var(--OffWhite)]">Forms</span>
						</button>
					</div>

					<button
						type="button"
						onClick={() => router.push('/Frontend/WorkerPanel/Wallet')}
						className="absolute left-1/2 top-[5px] flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--SYellow)] shadow-[0_10px_22px_rgba(13,22,11,0.18)]"
						aria-label="Wallet"
					>
						<span className="font-[var(--font-poppins)] text-2xl text-white">₹</span>
					</button>
				</div>
			</nav>

    </div>
  );
}