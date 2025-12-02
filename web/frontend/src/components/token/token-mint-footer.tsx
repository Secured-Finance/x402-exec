import { X402X_MINT_CONFIG, X402X_TOKEN_CONFIG } from "@/lib/token-mint-config";
import { ArrowDown } from "lucide-react";

type TokenMintFooterProps = {
    onLearnMore?: () => void;
};

export const TokenMintFooter = ({ onLearnMore }: TokenMintFooterProps) => {
    return (
        <div className="border-t border-slate-100 bg-slate-50 px-8 lg:px-12 py-6">
            <div className=" flex flex-row justify-between items-start">
                <div className="flex flex-row gap-4 text-sm font-mono">
                    <div className="break-all">
                        <span className="text-slate-500">Mint contract: </span>
                        <span className="text-slate-900">{X402X_MINT_CONFIG.address}</span>
                    </div>
                    <div className="break-all">
                        <span className="text-slate-500">Token contract: </span>
                        <span className="text-slate-900">{X402X_TOKEN_CONFIG.address}</span>
                    </div>
                </div>
                {onLearnMore && (
                    <button
                        type="button"
                        onClick={onLearnMore}
                        className="inline-flex items-center gap-1 text-sm font-medium text-yellow-600 hover:text-yellow-700"
                    >
                        Learn more
                        <ArrowDown size="12" />
                    </button>
                )}
            </div>
        </div>
    );
};
