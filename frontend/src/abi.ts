export const escrowAbi = [
  {
    inputs: [
      { internalType: "address", name: "_usdc", type: "address" },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [],
    name: "nextTaskId",
    outputs: [
      { internalType: "uint256", name: "", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "string", name: "_title", type: "string" },
      { internalType: "string", name: "_description", type: "string" },
      { internalType: "uint256", name: "_amount", type: "uint256" },
    ],
    name: "createTask",
    outputs: [
      { internalType: "uint256", name: "", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "_taskId", type: "uint256" },
    ],
    name: "acceptTask",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "_taskId", type: "uint256" },
      { internalType: "string", name: "_deliverable", type: "string" },
    ],
    name: "submitWork",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "_taskId", type: "uint256" },
    ],
    name: "approveTask",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "_taskId", type: "uint256" },
    ],
    name: "cancelTask",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "_taskId", type: "uint256" },
    ],
    name: "getTask",
    outputs: [
      {
        components: [
          { internalType: "uint256", name: "id", type: "uint256" },
          { internalType: "address", name: "client", type: "address" },
          { internalType: "address", name: "worker", type: "address" },
          { internalType: "uint256", name: "amount", type: "uint256" },
          { internalType: "string", name: "title", type: "string" },
          { internalType: "string", name: "description", type: "string" },
          { internalType: "string", name: "deliverable", type: "string" },
          { internalType: "uint8", name: "status", type: "uint8" },
          { internalType: "uint256", name: "createdAt", type: "uint256" },
        ],
        internalType: "struct AgentPayEscrow.Task",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const erc20Abi = [
  {
    inputs: [
      { internalType: "address", name: "spender", type: "address" },
      { internalType: "uint256", name: "value", type: "uint256" },
    ],
    name: "approve",
    outputs: [
      { internalType: "bool", name: "", type: "bool" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;