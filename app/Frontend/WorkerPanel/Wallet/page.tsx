"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  AlertCircle,
  X,
  Send,
  Mail,
  ShieldCheck
} from "lucide-react";
import WNavbar from "../../Components/WNavbar";
import WDownbar from "../../Components/WDownbar";

export default function WalletPage() {
  const [points, setPoints] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const loadWallet = async () => {
      try {
        const { fetchWalletHistory } = await import('../../../../utils/api');
        const res = await fetchWalletHistory();
        if (res?.success) {
          setPoints(res.total_points || 0);
          // Reverse history: newest first
          const sortedHistory = (res.history || []).sort((a: any, b: any) => 
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
          );
          setTransactions(sortedHistory);
        }
      } catch (err) {
        console.error('Failed to load wallet', err);
      }
    };
    loadWallet();
  }, []);

  const showToast = (type: 'success' | 'error', text: string) => {
    setStatusMsg({ type, text });
    setTimeout(() => {
      setStatusMsg(null);
    }, 3000);
  };

  const handleRedeemNeuCoins = async () => {
    if (!agreeTerms) {
      showToast('error', 'Please agree to the terms and conditions.');
      return;
    }
    
    setIsProcessing(true);
    try {
      const { redeemWalletPoints, fetchWalletHistory } = await import('../../../../utils/api');
      // Redeeming all available points for Neu Coins
      const res = await redeemWalletPoints("Neu Coins Transfer", points);
      if (res.success) {
         setPoints(0);
         const hist = await fetchWalletHistory();
         if (hist?.success) {
            const sortedHistory = (hist.history || []).sort((a: any, b: any) => 
                new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
            );
            setTransactions(sortedHistory);
         }
         setShowRedeemModal(false);
         setAgreeTerms(false);
         showToast('success', "Transfer to mail initiated successfully!");
      } else {
         showToast('error', res.message || 'Failed to initiate transfer.');
      }
    } catch (err) {
      showToast('error', 'Network error during transfer.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col space-y-6 pt-6 pb-24 relative min-h-screen bg-[#f8fafc]">
      <WNavbar />
      
      {/* Toast Notification */}
      <AnimatePresence>
        {statusMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={`fixed top-4 left-4 right-4 z-[100] p-4 rounded-xl shadow-lg flex items-center space-x-3 ${
              statusMsg.type === 'success' ? 'bg-[#f4fbfa] border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'
            }`}
          >
            {statusMsg.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <AlertCircle className="w-5 h-5 text-red-500" />}
            <span className="font-medium text-sm flex-1">{statusMsg.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Balance Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-[#1e6cb3] to-[#124b82] rounded-3xl shadow-xl p-8 text-white relative overflow-hidden mx-4"
      >
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <ShieldCheck size={140} />
        </div>
        
        <p className="text-blue-100 text-sm font-medium mb-1 relative z-10">Total Available Balance</p>
        <h2 className="text-6xl font-bold mb-8 relative z-10 tracking-tight">
          {points.toLocaleString()}
          <span className="text-xl font-medium text-[#fcc12d] ml-2">pts</span>
        </h2>
        
        <button 
          onClick={() => setShowRedeemModal(true)}
          className="w-full bg-[#fcc12d] text-gray-900 font-bold py-4 rounded-2xl shadow-lg hover:bg-[#eab308] transition-all transform active:scale-95 flex items-center justify-center space-x-3 relative z-10"
        >
          <Send className="w-5 h-5" />
          <span>Redeem Points</span>
        </button>
      </motion.div>

      {/* Transactions History */}
      <div className="flex-1 px-4">
        <div className="flex items-center justify-between mb-4 px-1">
          <h3 className="font-bold text-gray-800 text-lg">Points History</h3>
          <span className="text-xs font-bold text-[#1e6cb3] bg-blue-50 px-3 py-1 rounded-full uppercase tracking-wider">Newest First</span>
        </div>
        
        <div className="space-y-3">
          {transactions.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 border border-dashed border-gray-200 text-center">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-gray-400 font-medium">No transactions found</p>
            </div>
          ) : (
            transactions.map((tx, index) => (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                key={tx.id || index} 
                className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center"
              >
                <div className="flex items-center space-x-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.points > 0 ? 'bg-green-50' : 'bg-orange-50'}`}>
                    <CheckCircle2 className={`w-5 h-5 ${tx.points > 0 ? 'text-green-500' : 'text-orange-500'}`} />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-gray-800 text-sm">{tx.session_name}</span>
                    <span className="text-xs text-gray-400 font-medium">{new Date(tx.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                </div>
                <span className={`font-black text-lg ${tx.points > 0 ? 'text-[#1e6cb3]' : 'text-gray-400'}`}>
                  {tx.points > 0 ? '+' : ''}{tx.points}
                </span>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Redeem Modal */}
      <AnimatePresence>
        {showRedeemModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-md"
              onClick={() => setShowRedeemModal(false)}
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md relative z-10 overflow-hidden"
            >
              <button 
                onClick={() => setShowRedeemModal(false)}
                className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mb-6 rotate-3">
                  <Mail className="w-10 h-10 text-[#1e6cb3]" />
                </div>
                
                <h2 className="text-2xl font-black text-gray-800 mb-2">Redeem Neu Coins</h2>
                <p className="text-gray-500 text-sm leading-relaxed mb-8">
                  Your points will be converted and transferred to your registered <span className="font-bold text-[#1e6cb3]">Official Mail ID</span> as Neu Coins.
                </p>

                <div className="w-full bg-gray-50 rounded-2xl p-5 border border-gray-100 flex flex-col space-y-3 mb-8">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500 font-medium">Transfer Amount:</span>
                        <span className="font-black text-gray-800">{points.toLocaleString()} pts</span>
                    </div>
                    <div className="h-px bg-gray-200 w-full" />
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500 font-medium">Neu Coins Value:</span>
                        <span className="font-black text-[#1e6cb3]">{points.toLocaleString()} Coins</span>
                    </div>
                </div>

                <label className="flex items-start space-x-3 mb-8 text-left group cursor-pointer">
                  <div className="relative flex items-center">
                    <input 
                      type="checkbox" 
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                      className="peer h-6 w-6 rounded-lg border-2 border-gray-200 text-[#1e6cb3] focus:ring-transparent transition-all cursor-pointer"
                    />
                    <CheckCircle2 className="absolute w-6 h-6 text-[#1e6cb3] opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" />
                  </div>
                  <span className="text-xs text-gray-500 font-medium leading-tight group-hover:text-gray-700 transition-colors">
                    I agree to the Terms and Conditions for Neu Coins redemption and point transfer to my official mail.
                  </span>
                </label>

                <button 
                  onClick={handleRedeemNeuCoins}
                  disabled={!agreeTerms || points <= 0 || isProcessing}
                  className="w-full py-4 bg-[#1e6cb3] text-white font-bold rounded-2xl shadow-xl hover:bg-[#15538e] disabled:bg-gray-200 disabled:shadow-none transition-all flex items-center justify-center space-x-2"
                >
                  {isProcessing ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                  <span>{isProcessing ? "Processing..." : `Transfer ${points.toLocaleString()} Points`}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <WDownbar />
    </div>
  );
}