export const TokenMintHeader = () => {
    return (
        <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 border border-green-200 text-green-700 text-xs font-semibold uppercase tracking-wide mb-4">
                <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                </span>
                Minting Live
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                <span className="text-yellow-500">$X402X</span> Initial Token Mint
            </h2>
        </div>
    );
};

