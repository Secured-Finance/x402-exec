# @sf-x402 TypeScript SDK

TypeScript SDK for the x402x settlement framework - a programmable payment settlement extension for the x402 protocol.

## Packages

This repository contains the following packages:

- **[@sf-x402/core](./packages/core)**: Core utilities, types, and helper functions
- **[@sf-x402/fetch](./packages/fetch)**: Fetch wrapper for automatic 402 handling with settlement support
- **[@sf-x402/express](./packages/express)**: Express middleware for creating 402 payment gates
- **[@sf-x402/hono](./packages/hono)**: Hono middleware for creating 402 payment gates
- **[@sf-x402/react](./packages/react)**: React hooks for payment integration

## Quick Start

### For Resource Servers

#### With Express

```bash
npm install @sf-x402/express @sf-x402/core
```

```typescript
import express from 'express';
import { x402Middleware } from '@sf-x402/express';

const app = express();

app.post('/api/premium',
  x402Middleware({
    network: 'base-sepolia',
    amount: '100000', // 0.1 USDC
    resource: '/api/premium',
    facilitatorFee: '10000',
  }),
  (req, res) => {
    res.json({ content: 'Premium content!' });
  }
);

app.listen(3000);
```

#### With Hono

```bash
npm install @sf-x402/hono @sf-x402/core
```

```typescript
import { Hono } from 'hono';
import { x402Middleware } from '@sf-x402/hono';

const app = new Hono();

app.post('/api/premium',
  x402Middleware({
    network: 'base-sepolia',
    amount: '100000',
    resource: '/api/premium',
  }),
  (c) => c.json({ content: 'Premium content!' })
);

export default app;
```

### For Client Applications

#### With React Hooks

```bash
npm install @sf-x402/react
```

```typescript
import { useX402Payment } from '@sf-x402/react';

function PaymentButton() {
  const { pay, status, error } = useX402Payment();
  
  const handlePay = async () => {
    try {
      const data = await pay('/api/premium');
      console.log('Success:', data);
    } catch (err) {
      console.error('Failed:', err);
    }
  };
  
  return (
    <button onClick={handlePay} disabled={status === 'paying'}>
      {status === 'paying' ? 'Processing...' : 'Pay & Fetch'}
    </button>
  );
}
```

#### With Fetch Wrapper

```bash
npm install @sf-x402/fetch @sf-x402/core
```

```typescript
import { x402xFetch } from '@sf-x402/fetch';
import { createWalletClient } from 'viem';

const walletClient = createWalletClient({...});
const fetchWithPay = x402xFetch(fetch, walletClient);

// Automatically handles 402 responses
const response = await fetchWithPay('/api/premium');
const data = await response.json();
```

### For Facilitators

```bash
npm install @sf-x402/core
```

```typescript
import { isSettlementMode, settleWithRouter } from '@sf-x402/core';

// Detect settlement mode
if (isSettlementMode(paymentRequirements)) {
  // Execute settlement via SettlementRouter
  const result = await settleWithRouter(client, paymentPayload);
  console.log('Settlement hash:', result.hash);
}
```

## Features

### ✨ Core Features (@sf-x402/core)

- 🔐 **Commitment Calculation**: Cryptographically bind settlement parameters
- 🌐 **Network Support**: Pre-configured for Base Sepolia and X-Layer Testnet
- 🪝 **Built-in Hooks**: TransferHook for basic payment splits
- 🛠️ **Utility Functions**: Helper functions for common tasks
- 📝 **Full TypeScript**: Complete type definitions

### 🔄 Fetch Wrapper (@sf-x402/fetch)

- 🔄 **Automatic 402 Handling**: Transparent payment injection
- 🎯 **Settlement Mode Detection**: Uses commitment-based nonce when needed
- 🔙 **Fallback Support**: Works with standard x402 for non-settlement payments
- 💰 **Configurable Limits**: Set maximum payment amounts
- 🚀 **Zero Configuration**: Works out of the box

### 🌐 Server Middleware (@sf-x402/express, @sf-x402/hono)

- 🚀 **Drop-in Middleware**: Easy integration with existing apps
- 💰 **Facilitator Fees**: Built-in support for facilitator incentives
- 🔌 **Hook Support**: Works with builtin or custom hooks
- 🎯 **Zero Configuration**: Sensible defaults for common use cases
- ⚡ **Edge Runtime**: @sf-x402/hono supports edge deployments

### ⚛️ React Integration (@sf-x402/react)

- 🪝 **React Hooks**: `useX402Payment` for easy integration
- 🔄 **State Management**: Automatic status and error tracking
- 🎯 **Wagmi Integration**: Works seamlessly with Wagmi
- 💡 **TypeScript**: Full type safety
- 🚀 **Simple API**: Clean and intuitive interface

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Client                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ @sf-x402/react │  │ @sf-x402/fetch │  │   Native     │      │
│  │    Hooks     │─▶│    Wrapper   │─▶│    Fetch     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                           │                                  │
│                           │ Uses                             │
│                           ▼                                  │
│                    ┌──────────────┐                          │
│                    │ @sf-x402/core  │                          │
│                    │  Utilities   │                          │
│                    └──────────────┘                          │
└─────────────────────────────────────────────────────────────┘
                             │ X-PAYMENT header
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                    Resource Server                           │
│  ┌────────────────────┐         ┌────────────────────┐      │
│  │  @sf-x402/express    │   OR    │   @sf-x402/hono      │      │
│  │    Middleware      │         │    Middleware      │      │
│  └────────────────────┘         └────────────────────┘      │
│           │                              │                   │
│           │ Uses                         │ Uses              │
│           ▼                              ▼                   │
│                    ┌──────────────┐                          │
│                    │ @sf-x402/core  │                          │
│                    │  Utilities   │                          │
│                    └──────────────┘                          │
└─────────────────────────────────────────────────────────────┘
                             │ Payment request
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                       Facilitator                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              @sf-x402/core Utilities                   │   │
│  │  • isSettlementMode                                  │   │
│  │  • settleWithRouter                                  │   │
│  │  • validateSettlementRouter                          │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                             │
                             ▼
                      ┌──────────────┐
                      │  Blockchain  │
                      │ (Contracts)  │
                      └──────────────┘
```

## Package Split Rationale

Following the official x402 library design, we split functionality into separate packages:

1. **Separation of Concerns**: Server middleware, client fetch, and React hooks have different dependencies
2. **Bundle Size**: Users only install what they need (e.g., React apps don't need Express)
3. **Peer Dependencies**: Express and Hono are optional peer dependencies
4. **Flexible Deployment**: Edge runtimes can use @sf-x402/hono without Node.js dependencies
5. **Maintainability**: Clear boundaries make the codebase easier to maintain

## Development

### Install Dependencies

From the **project root**:

```bash
pnpm install
```

### Build All Packages

From the **project root**:

```bash
# Build all packages (including x402 and SDK)
pnpm run build

# Or build SDK only
pnpm run build:sdk
```

### Build Individual Package

```bash
# From project root
pnpm --filter @sf-x402/core run build
pnpm --filter @sf-x402/fetch run build

# Or from package directory
cd typescript/packages/core
pnpm run build
```

## Documentation

- **Core**: [packages/core/README.md](./packages/core/README.md)
- **Fetch**: [packages/fetch/README.md](./packages/fetch/README.md)
- **Express**: [packages/express/README.md](./packages/express/README.md)
- **Hono**: [packages/hono/README.md](./packages/hono/README.md)
- **React**: [packages/react/README.md](./packages/react/README.md)

## Examples

See the main repository examples:
- **Facilitator**: `../../examples/facilitator/`
- **Showcase**: `../../examples/showcase/`

## Contributing

Please read [CONTRIBUTING.md](../../CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

Apache-2.0
