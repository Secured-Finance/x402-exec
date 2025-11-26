import { CheckCircle2, Cpu, Hammer, Loader2, Wallet, Zap } from 'lucide-react';
import { useState } from 'react';

export const TokenMint = () => {
    const [status, setStatus] = useState<'idle' | 'connecting' | 'executing' | 'success'>('idle');

    // Simulated minting logic
    const handleMintAction = () => {
        if (status !== 'idle') return;

        setStatus('connecting');
        setTimeout(() => {
            setStatus('executing');
            setTimeout(() => {
                setStatus('success');
                // Reset after success message
                setTimeout(() => setStatus('idle'), 3000);
            }, 2500);
        }, 1500);
    };

    // Mock data for progress
    const totalAllocation = 300000000;
    const mintedAmount = 142567890;
    const percentage = (mintedAmount / totalAllocation) * 100;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 border border-green-200 text-green-700 text-xs font-semibold uppercase tracking-wide mb-4">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                    </span>
                    Minting Live
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">$X402X Initial Launch Mint</h2>
                <p className="text-slate-500 max-w-2xl mx-auto">
                    Scrolldown to see more details about $X402X.
                </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="grid grid-cols-1 lg:grid-cols-2">

                    {/* Left Panel: Progress Stats */}
                    <div className="p-8 lg:p-12 border-b lg:border-b-0 lg:border-r border-slate-100">
                        <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                            <Cpu size={20} className="text-slate-400" />
                            Minting Progress
                        </h3>

                        <div className="space-y-8">
                            <div>
                                <div className="flex justify-between text-sm font-medium mb-2">
                                    <span className="text-slate-500">Total Minted</span>
                                    <span className="text-slate-900">{mintedAmount.toLocaleString()} / {totalAllocation.toLocaleString()} $X402X</span>
                                </div>
                                <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-yellow-500 rounded-full transition-all duration-1000 ease-out relative overflow-hidden"
                                        style={{ width: `${percentage}%` }}
                                    >
                                        <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite] transform -skew-x-12" />
                                    </div>
                                </div>
                                <div className="flex justify-between text-xs mt-2">
                                    <span className="text-slate-400">Progress: {percentage.toFixed(2)}%</span>
                                    <span className="text-yellow-600 font-semibold">Fair Mint Allocation</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                    <p className="text-xs text-slate-400 uppercase font-semibold">Current Block Reward</p>
                                    <p className="text-xl font-bold text-slate-900 mt-1">12.5 X402X</p>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                    <p className="text-xs text-slate-400 uppercase font-semibold">Active Executors</p>
                                    <p className="text-xl font-bold text-slate-900 mt-1">8,421</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Panel: Action Interface */}
                    <div className="p-8 lg:p-12 bg-slate-50/50">
                        <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                            <Zap size={20} className="text-yellow-500" />
                            Mint Dashboard
                        </h3>

                        <div className="space-y-6">
                            {/* Instruction Steps */}
                            <div className="space-y-4">
                                {[
                                    { step: 1, text: "Connect your Web3 Wallet" },
                                    { step: 2, text: "Execute a Smart Contract or Cross-chain Call" },
                                    { step: 3, text: "Receive X402X Execution Rewards automatically" }
                                ].map((item) => (
                                    <div key={item.step} className="flex items-center gap-4">
                                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-500 font-bold flex items-center justify-center text-sm shadow-sm">
                                            {item.step}
                                        </div>
                                        <p className="text-sm text-slate-600 font-medium">{item.text}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Action Button */}
                            <div className="pt-4">
                                <button
                                    type="button"
                                    onClick={handleMintAction}
                                    disabled={status !== 'idle'}
                                    className={`
                    w-full py-4 px-6 rounded-xl font-bold text-lg shadow-sm transition-all transform active:scale-[0.98]
                    flex items-center justify-center gap-3
                    ${status === 'idle'
                                            ? 'bg-yellow-500 hover:bg-yellow-400 text-white hover:shadow-yellow-200'
                                            : status === 'success'
                                                ? 'bg-green-500 text-white'
                                                : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                                        }
                  `}
                                >
                                    {status === 'idle' && (
                                        <>
                                            <Wallet size={20} /> Connect & Execute Mint
                                        </>
                                    )}
                                    {status === 'connecting' && (
                                        <>
                                            <Loader2 size={20} className="animate-spin" /> Connecting Wallet...
                                        </>
                                    )}
                                    {status === 'executing' && (
                                        <>
                                            <Hammer size={20} className="animate-bounce" /> Executing Logic...
                                        </>
                                    )}
                                    {status === 'success' && (
                                        <>
                                            <CheckCircle2 size={20} /> Execution Verified!
                                        </>
                                    )}
                                </button>
                                {status === 'success' && (
                                    <p className="text-center text-green-600 text-sm mt-3 font-medium animate-in fade-in slide-in-from-bottom-2">
                                        Success! You have simulated an execution mint event.
                                    </p>
                                )}
                            </div>

                            <p className="text-xs text-center text-slate-400 mt-4">
                                * This is a simulation interface for demonstration purposes.
                            </p>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};