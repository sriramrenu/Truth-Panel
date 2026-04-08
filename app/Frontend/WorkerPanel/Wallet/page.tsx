"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Gift,
  Coffee,
  Umbrella,
  PlusCircle,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  X,
  Send,
} from "lucide-react";
import WNavbar from "../../Components/WNavbar";
import WDownbar from "../../Components/WDownbar";
import { useRouter } from "next/navigation";


const REWARDS_CATALOG = [
  { id: 1, title: "Amazon Gift Card", value: "$20", cost: 2000, icon: Gift },
  { id: 2, title: "Starbucks Coffee", value: "$5", cost: 500, icon: Coffee },
  { id: 3, title: "Company Swag", value: "T-Shirt", cost: 1500, icon: Umbrella },
  { id: 4, title: "Extra PTO Hour", value: "+1 hr", cost: 5000, icon: PlusCircle },
];

export default function WalletPage() {
  const router = useRouter();
  const [points, setPoints] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [selectedReward, setSelectedReward] = useState<typeof REWARDS_CATALOG[0] | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [showAllTransactions, setShowAllTransactions] = useState(false);
  
  // Transfer state
  const [showTransferSheet, setShowTransferSheet] = useState(false);
  const [transferAmount, setTransferAmount] = useState("");
  const [transferRecipient, setTransferRecipient] = useState("");

  useEffect(() => {
    const loadWallet = async () => {
      try {
        const { fetchWalletHistory } = await import('../../../../utils/api');
        const res = await fetchWalletHistory();
        if (res?.success) {
          setPoints(res.total_points || 0);
          setTransactions(res.history || []);
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

  const handleRedeem = async (reward: typeof REWARDS_CATALOG[0]) => {
    setSelectedReward(null);
    if (points >= reward.cost) {
      try {
        const { redeemWalletPoints, fetchWalletHistory } = await import('../../../../utils/api');
        const res = await redeemWalletPoints(reward.title, reward.cost);
        if (res.success) {
           setPoints(prev => prev - reward.cost);
           const hist = await fetchWalletHistory();
           if (hist?.success) setTransactions(hist.history || []);
           showToast('success', res.message);
        } else {
           showToast('error', res.message || 'Failed to redeem reward.');
        }
      } catch (err) {
        showToast('error', 'Network error redeeming reward.');
      }
    } else {
      showToast('error', `Not enough points for ${reward.title}.`);
    }
  };

  const handleTransfer = async () => {
    const amount = parseInt(transferAmount);
    if (isNaN(amount) || amount <= 0) {
      showToast('error', 'Please enter a valid amount.');
      return;
    }
    if (amount > points) {
      showToast('error', 'Insufficient points for transfer.');
      return;
    }
    
    try {
        const { transferWalletPoints, fetchWalletHistory } = await import('../../../../utils/api');
        const res = await transferWalletPoints(transferRecipient, amount);
        if (res.success) {
           setPoints(prev => prev - amount);
           const hist = await fetchWalletHistory();
           if (hist?.success) setTransactions(hist.history || []);
           setShowTransferSheet(false);
           setTransferAmount("");
           showToast('success', res.message);
        } else {
           showToast('error', res.message || 'Failed to transfer points.');
        }
    } catch (err) {
        showToast('error', 'Network error transferring points.');
    }
  };

  return (
    <div className="flex flex-col space-y-6 pt-6 pb-24 relative">
      <WNavbar />
      
      {/* Toast Notification */}
      <AnimatePresence>
        {statusMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={`absolute top-0 left-4 right-4 z-50 p-4 rounded-xl shadow-lg flex items-center space-x-3 ${
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
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="bg-gradient-to-br from-[#1e6cb3] to-[#124b82] rounded-2xl shadow-lg p-6 text-white relative overflow-hidden mx-4"
      >
        <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
          <svg width="120" height="120" viewBox="0 0 24 24" fill="currentColor">
            <path d="M21,18V19A2,2 0 0,1 19,21H5A2,2 0 0,1 3,19V5A2,2 0 0,1 5,3H19A2,2 0 0,1 21,5V6H12C10.89,6 10,6.9 10,8V16A2,2 0 0,0 12,18M12,16H22V8H12M16,13.5A1.5,1.5 0 0,1 14.5,12A1.5,1.5 0 0,1 16,10.5A1.5,1.5 0 0,1 17.5,12A1.5,1.5 0 0,1 16,13.5Z" />
          </svg>
        </div>
        
        <p className="text-sm font-medium text-blue-100 mb-1 relative z-10">Total Available Points</p>
        <h2 className="text-5xl font-bold mb-6 relative z-10 tracking-tight">
          {points.toLocaleString()}
          <span className="text-lg font-medium text-[#fcc12d] ml-1">pts</span>
        </h2>
        
        <div className="flex space-x-3 relative z-10">
          <button 
            onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
            className="flex-1 bg-[#fcc12d] text-gray-900 font-semibold py-2.5 rounded-lg shadow-sm hover:bg-[#eab308] transition-colors flex items-center justify-center space-x-2"
          >
            <Gift className="w-4 h-4" />
            <span>Redeem</span>
          </button>
          <button 
            onClick={() => setShowTransferSheet(true)}
            className="flex-1 bg-white/20 text-white font-semibold py-2.5 rounded-lg shadow-sm hover:bg-white/30 transition-colors flex items-center justify-center space-x-2 backdrop-blur-sm"
          >
            <ArrowRight className="w-4 h-4" />
            <span>Transfer</span>
          </button>
        </div>
      </motion.div>

      {/* Reward Options */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="px-4"
      >
        <h3 className="font-bold text-gray-800 mb-4 px-1">Rewards Catalog</h3>
        
        <div className="grid grid-cols-2 gap-4">
          {REWARDS_CATALOG.map((item) => {
            const Icon = item.icon;
            const canAfford = points >= item.cost;
            return (
              <div 
                key={item.id} 
                onClick={() => setSelectedReward(item)}
                className={`bg-white rounded-xl shadow-sm border p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                  canAfford ? 'border-[#1e6cb3]/20 hover:border-[#1e6cb3] hover:shadow-md' : 'border-gray-100 opacity-50 grayscale hover:opacity-100 hover:grayscale-0'
                }`}
              >
                <div className="w-12 h-12 bg-[#ecf8f8] rounded-full flex items-center justify-center mb-3">
                  <Icon className="w-6 h-6 text-[#1e6cb3]" />
                </div>
                <h4 className="font-semibold text-gray-800 text-sm mb-1">{item.title}</h4>
                <span className={`text-xs font-bold ${canAfford ? 'text-[#1e6cb3]' : 'text-gray-400'}`}>
                  {item.cost.toLocaleString()} pts
                </span>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Recent Transactions Preview */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mx-4"
      >
        <div className="p-4 border-b border-gray-50 flex justify-between items-center">
          <h3 className="font-bold text-gray-800">Recent Earned</h3>
          <button 
            onClick={() => setShowAllTransactions(!showAllTransactions)}
            className="text-xs text-[#1e6cb3] font-bold tracking-wider hover:underline uppercase transition-all"
          >
            {showAllTransactions ? "View Less" : "View All"}
          </button>
        </div>
        
        <motion.div layout className="divide-y divide-gray-50">
          {transactions.length === 0 ? (
            <div className="p-6 text-center text-gray-500 font-medium text-sm">No transactions yet</div>
          ) : (
            (showAllTransactions ? transactions : transactions.slice(0, 3)).map((tx, index) => (
              <motion.div 
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                key={tx.id || index} 
                className="p-4 flex justify-between items-center bg-[#f4fbfa]/30"
              >
                <div className="flex flex-col space-y-1">
                  <span className="font-semibold text-sm text-gray-800">{tx.task_name}</span>
                  <span className="text-xs text-gray-400">{new Date(tx.created_at).toLocaleDateString()}</span>
                </div>
                <span className={`font-bold ${tx.transaction_type === 'earn' ? 'text-[#fcc12d]' : 'text-gray-500'}`}>
                  {tx.transaction_type === 'earn' ? '+' : '-'}{tx.amount}
                </span>
              </motion.div>
            ))
          )}
        </motion.div>
      </motion.div>

      {/* Transfer Points Sheet Overlay */}
      <AnimatePresence>
        {showTransferSheet && (
          <div className="fixed inset-y-0 inset-x-0 mx-auto w-full max-w-[400px] z-50 flex items-end sm:items-center justify-center sm:p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#2b333e]/60 backdrop-blur-sm"
              onClick={() => setShowTransferSheet(false)}
            />
            
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl p-6 w-full relative z-10 flex flex-col"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Transfer Points</h2>
                  <p className="text-sm text-gray-500 mt-1">Send your points to a colleague</p>
                </div>
                <button 
                  onClick={() => setShowTransferSheet(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 mb-8">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Recipient</label>
                  <select 
                    value={transferRecipient}
                    onChange={(e) => setTransferRecipient(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl focus:ring-[#1e6cb3] focus:border-[#1e6cb3] block p-3 outline-none"
                  >
                      <option value="Colleague Example">Colleague Example</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Amount</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      placeholder="Enter points logic"
                      value={transferAmount}
                      onChange={(e) => setTransferAmount(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl focus:ring-[#1e6cb3] focus:border-[#1e6cb3] block p-3 outline-none pl-4"
                    />
                    <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                      <span className="text-sm text-gray-400 font-bold">pts</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 flex justify-between">
                    <span>Available:</span> 
                    <span className="font-bold text-[#1e6cb3]">{points.toLocaleString()} pts</span>
                  </p>
                </div>
              </div>

              <button 
                onClick={handleTransfer}
                className="w-full py-4 text-sm font-bold bg-[#1e6cb3] hover:bg-[#15538e] text-white rounded-xl shadow-md transition-colors flex items-center justify-center space-x-2"
              >
                <Send className="w-4 h-4" />
                <span>Send {transferAmount || 0} pts</span>
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* View All Transactions inline handled above */}

      {/* Redemption Confirmation Modal */}
      <AnimatePresence>
        {selectedReward && (
          <div className="fixed inset-y-0 inset-x-0 mx-auto w-full max-w-[400px] z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#2b333e]/60 backdrop-blur-sm"
              onClick={() => setSelectedReward(null)}
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-[320px] relative z-10 flex flex-col items-center"
            >
              <button 
                onClick={() => setSelectedReward(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="w-16 h-16 bg-[#ecf8f8] rounded-full flex items-center justify-center mb-4 mt-2">
                <selectedReward.icon className="w-8 h-8 text-[#1e6cb3]" />
              </div>
              
              <h2 className="text-xl font-bold text-gray-800 mb-1 text-center">Redeem Reward</h2>
              <p className="text-gray-500 text-sm text-center mb-6">
                Are you sure you want to redeem your points for <span className="font-bold text-gray-700">{selectedReward.title} ({selectedReward.value})</span>?
              </p>

              <div className="w-full bg-gray-50 rounded-xl p-4 flex justify-between items-center mb-6 border border-gray-100">
                <span className="text-sm text-gray-500 font-medium">Cost:</span>
                <span className="font-bold text-[#1e6cb3]">{selectedReward.cost.toLocaleString()} pts</span>
              </div>

              <div className="flex space-x-3 w-full">
                <button 
                  onClick={() => setSelectedReward(null)}
                  className="flex-1 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => handleRedeem(selectedReward)}
                  className="flex-1 py-3 text-sm font-semibold bg-[#1e6cb3] hover:bg-[#15538e] text-white rounded-xl shadow-md transition-colors"
                >
                  Confirm
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