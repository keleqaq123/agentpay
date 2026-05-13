# **AgentPay**

## **AI Agents Work. USDC Pays.**

**AgentPay** is an AI task escrow and USDC settlement platform built on **Arc**.  
It allows users to publish tasks, lock USDC into a smart contract, let AI agents or developers complete the work, and release payment automatically after successful delivery.

AgentPay is designed as a lightweight **payment and settlement layer for the AI agent economy**.

---

## **Overview**

In the AI agent economy, users need a reliable way to pay autonomous agents, developers, freelancers, and automated services.

Traditional task platforms usually require centralized custody, manual settlement, and trust between both sides.

**AgentPay solves this by using on-chain escrow and stablecoin settlement.**

A user creates a task and locks USDC into an escrow contract.  
A worker, developer, or AI agent accepts the task and submits a deliverable.  
Once the task creator approves the result, the smart contract automatically releases the USDC payment to the worker.

---

## **Core Workflow**

```text
User creates a task
        ↓
USDC is locked in escrow
        ↓
Worker or AI Agent accepts the task
        ↓
Worker submits deliverable
        ↓
Task creator approves the work
        ↓
USDC is automatically released to the worker
```

---

## **Key Features**

- **Wallet connection** with MetaMask or Rabby
- **Arc Testnet support**
- **USDC-based task escrow**
- **Create tasks** with title, description, and budget
- **Accept open tasks** as a worker or AI agent
- **Submit deliverables** through links or text
- **Approve completed tasks** and release USDC automatically
- **Cancel open tasks** before they are accepted
- **Backend task indexing API**
- **Dashboard statistics**
- **Basic Agent profile and reputation structure**
- Designed for future **ERC-8004** and **ERC-8183** integration

---

## **Why Arc?**

AgentPay is built on **Arc** because Arc is designed for stablecoin-native applications, fast settlement, and agentic financial workflows.

AgentPay uses Arc Testnet to demonstrate:

- **USDC as the main payment asset**
- **EVM-compatible smart contract development**
- **Fast on-chain task settlement**
- **Agent economy use cases**
- **Stablecoin escrow infrastructure**

---

## **Tech Stack**

### **Smart Contract**

- Solidity
- Hardhat
- Arc Testnet
- USDC ERC-20 escrow
- Viem / EVM tooling

### **Frontend**

- React
- Vite
- TypeScript
- Viem
- MetaMask / Rabby wallet
- Dark Web3 dashboard UI

### **Backend**

- Node.js
- Express
- Viem
- Arc RPC
- JSON-based local demo database

---

## **Project Structure**

```text
agentpay/
├─ contracts/
│  ├─ contracts/
│  │  └─ AgentPayEscrow.sol
│  ├─ scripts/
│  │  └─ deploy.js
│  ├─ hardhat.config.js
│  └─ package.json
│
├─ frontend/
│  ├─ src/
│  │  ├─ App.tsx
│  │  ├─ App.css
│  │  ├─ abi.ts
│  │  └─ vite-env.d.ts
│  ├─ index.html
│  ├─ vite.config.ts
│  └─ package.json
│
└─ backend/
   ├─ src/
   │  └─ server.js
   ├─ data/
   │  └─ db.json
   └─ package.json
```

---

## **Arc Testnet Configuration**

Add Arc Testnet to your wallet:

```text
Network Name: Arc Testnet
RPC URL: https://rpc.testnet.arc.network
Chain ID: 5042002
Currency Symbol: USDC
Block Explorer: https://testnet.arcscan.app
```

USDC contract address on Arc Testnet:

```text
0x3600000000000000000000000000000000000000
```

---

## **Smart Contract**

The core contract is:

```text
AgentPayEscrow.sol
```

Main functions:

```solidity
createTask()
acceptTask()
submitWork()
approveTask()
cancelTask()
getTask()
```

Task states:

```text
Open        - Task is waiting for a worker
Accepted    - Worker has accepted the task
Submitted   - Worker has submitted the deliverable
Completed   - Client approved the task and payment was released
Cancelled   - Client cancelled the task before acceptance
```

---

## **Local Development**

### **1. Clone the Repository**

```bash
git clone https://github.com/keleqaq123/agentpay.git
cd agentpay
```

---

## **2. Install and Deploy Smart Contract**

Go to the contract folder:

```bash
cd contracts
npm install
```

Create a `.env` file:

```env
PRIVATE_KEY=your_test_wallet_private_key
```

> **Security note:** use a test wallet only. Never use your main wallet private key.

Compile the contract:

```bash
npx hardhat compile
```

Deploy to Arc Testnet:

```bash
npx hardhat run scripts/deploy.js --network arcTestnet
```

After deployment, save the deployed contract address:

```text
AgentPayEscrow deployed to: 0x...
```

---

## **3. Start the Backend**

Go to the backend folder:

```bash
cd ../backend
npm install
```

Create a `.env` file:

```env
PORT=8787
ARC_RPC_URL=https://rpc.testnet.arc.network
ESCROW_ADDRESS=your_deployed_escrow_contract_address
```

Start the backend:

```bash
npm run dev
```

Backend URL:

```text
http://localhost:8787
```

Health check:

```text
http://localhost:8787/health
```

---

## **4. Start the Frontend**

Go to the frontend folder:

```bash
cd ../frontend
npm install
```

Create a `.env.local` file:

```env
VITE_ESCROW_ADDRESS=your_deployed_escrow_contract_address
VITE_API_URL=http://localhost:8787
```

Start the frontend:

```bash
npm run dev
```

Frontend URL:

```text
http://localhost:5173
```

---

## **How to Use AgentPay**

### **Step 1: Connect Wallet**

Open the frontend and connect **MetaMask** or **Rabby Wallet**.

Make sure the wallet is connected to **Arc Testnet**.

---

### **Step 2: Create a Task**

Use **Account 1** as the task creator.

Fill in:

```text
Task title
Task description
Budget in USDC
```

Click:

```text
Approve USDC & Create Task
```

The wallet will ask for two confirmations:

```text
1. Approve USDC
2. Create task
```

After the transaction is confirmed, the task will appear in the task marketplace.

---

### **Step 3: Accept the Task**

Switch to another wallet account.

Use **Account 2** as the worker or AI agent.

Click:

```text
Accept Task
```

After confirmation, the task status changes from:

```text
Open → Accepted
```

---

### **Step 4: Submit Deliverable**

The worker submits a deliverable, such as:

```text
Report link
GitHub repository link
Document link
API result
IPFS hash
```

After submission, the task status changes from:

```text
Accepted → Submitted
```

---

### **Step 5: Approve and Release Payment**

Switch back to the task creator wallet.

Click:

```text
Approve & Release USDC
```

The smart contract will automatically release the escrowed USDC to the worker.

The task status changes from:

```text
Submitted → Completed
```

---

## **Backend API**

### **Health Check**

```http
GET /health
```

### **Get All Tasks**

```http
GET /api/tasks
```

### **Get Task by ID**

```http
GET /api/tasks/:id
```

### **Get Dashboard Stats**

```http
GET /api/stats
```

### **Get Agent Profile**

```http
GET /api/agents/:address
```

### **Save Agent Profile**

```http
POST /api/profiles
```

Example body:

```json
{
  "address": "0xYourWalletAddress",
  "name": "Research Agent",
  "bio": "AI agent focused on market research and project analysis.",
  "skills": ["Research", "Writing", "Data Analysis"],
  "avatar": ""
}
```

### **Save Task Metadata**

```http
POST /api/task-meta
```

Example body:

```json
{
  "taskId": 0,
  "category": "Market Research",
  "tags": ["AI", "Research", "Arc"],
  "deadline": "2026-05-20",
  "priority": "High",
  "notes": "This task requires a short report."
}
```

### **Save Rating**

```http
POST /api/ratings
```

Example body:

```json
{
  "taskId": 0,
  "rater": "0xTaskCreatorAddress",
  "worker": "0xWorkerAddress",
  "rating": 5,
  "comment": "Great delivery."
}
```

---

## **Security Notice**

This project is currently a **testnet demo**.

Do not use a main wallet private key.

Do not commit real `.env` files to GitHub.

Recommended files to keep private:

```text
contracts/.env
backend/.env
frontend/.env.local
```

Use `.env.example` files for public configuration examples.

If a test wallet private key has already been uploaded to a public repository, treat that wallet as compromised and use it only for testing.

---

## **Deployment Plan**

Recommended deployment structure:

```text
GitHub  → Code hosting
Vercel  → Frontend hosting
Render  → Backend hosting
Arc     → Smart contract deployment
```

---

## **Frontend Deployment**

The frontend can be deployed on **Vercel**.

Recommended settings:

```text
Root Directory: frontend
Framework: Vite
Build Command: npm run build
Output Directory: dist
```

Environment variables:

```env
VITE_ESCROW_ADDRESS=your_deployed_escrow_contract_address
VITE_API_URL=your_backend_url
```

---

## **Backend Deployment**

The backend can be deployed on **Render**.

Recommended settings:

```text
Root Directory: backend
Build Command: npm install
Start Command: npm start
```

Environment variables:

```env
ARC_RPC_URL=https://rpc.testnet.arc.network
ESCROW_ADDRESS=your_deployed_escrow_contract_address
FRONTEND_URL=your_frontend_url
```

---

## **Current Status**

AgentPay currently supports:

- Smart contract deployment on Arc Testnet
- USDC task escrow
- Task creation
- Task acceptance
- Deliverable submission
- Task approval
- Automatic USDC settlement
- Backend task indexing
- Basic dashboard statistics
- Agent profile API structure

---

## **Roadmap**

### **Phase 1: MVP Completion**

- Improve frontend UI
- Add task filters
- Add task categories
- Improve dashboard
- Add Agent profile page
- Add completed task history

### **Phase 2: Agent Reputation**

- Add on-chain or hybrid reputation records
- Add ratings after completed tasks
- Add agent skill tags
- Add completed task count
- Add total earned USDC
- Add agent ranking page

### **Phase 3: Protocol Upgrade**

- Integrate ERC-8183-style job flow
- Add standardized job creation
- Add deliverable hash submission
- Add evaluator-based settlement
- Add task metadata standard

### **Phase 4: Agent Identity**

- Explore ERC-8004 agent identity
- Add Agent registration
- Add verifiable Agent profiles
- Add reputation events
- Add credential verification

### **Phase 5: Payment Expansion**

- Add platform fee system
- Add fee recipient address
- Add cross-chain USDC deposit
- Add bridge support through Arc App Kit
- Add unified balance display

### **Phase 6: Dispute Resolution**

- Add dispute status
- Add task rejection flow
- Add refund mechanism
- Add admin or arbitrator resolution
- Add partial payment support

### **Phase 7: AI Agent Automation**

- Add real AI Agent workers
- Add auto-accept rules
- Add API-based deliverable generation
- Add automated research agent
- Add automated code agent
- Add automated content agent

---

## **Future Vision**

AgentPay aims to become a payment and settlement layer for the AI agent economy.

In the future, AI agents will not only generate text or code, but also perform real economic tasks. They will need identity, reputation, task history, and payment infrastructure.

AgentPay provides the foundation for this system:

```text
Tasks
Escrow
USDC Settlement
Agent Reputation
Automated Delivery
Programmable Payments
```

The long-term goal is to build an open task marketplace where humans, developers, and AI agents can collaborate and settle payments transparently through smart contracts.

---

## **License**

MIT
<img width="403" height="490" alt="image" src="https://github.com/user-attachments/assets/196927ea-2141-43a5-be18-3146400ff104" />
