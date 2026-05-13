import { useEffect, useMemo, useState } from "react";
import {
  createPublicClient,
  createWalletClient,
  custom,
  defineChain,
  formatUnits,
  http,
  parseUnits,
} from "viem";
import type { Address } from "viem";
import { escrowAbi, erc20Abi } from "./abi";
import "./App.css";

const USDC_ADDRESS = "0x3600000000000000000000000000000000000000" as Address;
const ESCROW_ADDRESS = import.meta.env.VITE_ESCROW_ADDRESS as Address;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const arcTestnet = defineChain({
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: {
    name: "USDC",
    symbol: "USDC",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.testnet.arc.network"],
    },
  },
  blockExplorers: {
    default: {
      name: "ArcScan",
      url: "https://testnet.arcscan.app",
    },
  },
  testnet: true,
});

const publicClient = createPublicClient({
  chain: arcTestnet,
  transport: http(),
});

const statusNames = ["Open", "Accepted", "Submitted", "Completed", "Cancelled"];

type ViewType = "market" | "create" | "dashboard" | "agent" | "protocol";
type FilterType = "all" | "open" | "accepted" | "submitted" | "completed" | "mine";

type Task = {
  id: bigint;
  client: Address;
  worker: Address;
  amount: bigint;
  title: string;
  description: string;
  deliverable: string;
  status: number;
  createdAt: bigint;
};

function shortAddress(addr?: string | null) {
  if (!addr || addr === ZERO_ADDRESS) return "None";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function sameAddress(a?: string | null, b?: string | null) {
  if (!a || !b) return false;
  return a.toLowerCase() === b.toLowerCase();
}

function formatDate(timestamp: bigint) {
  const value = Number(timestamp);
  if (!value) return "Unknown";
  return new Date(value * 1000).toLocaleString();
}

function formatUsdc(amount: bigint) {
  return formatUnits(amount, 6);
}

function App() {
  const [account, setAccount] = useState<Address | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeView, setActiveView] = useState<ViewType>("market");
  const [filter, setFilter] = useState<FilterType>("all");

  const [title, setTitle] = useState("Write an AI market research report");
  const [description, setDescription] = useState(
    "Analyze one AI agent project and submit a short research report link."
  );
  const [amount, setAmount] = useState("1");

  const [deliverables, setDeliverables] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const openTasks = useMemo(() => {
    return tasks.filter((task) => Number(task.status) === 0);
  }, [tasks]);

  const acceptedTasks = useMemo(() => {
    return tasks.filter((task) => Number(task.status) === 1);
  }, [tasks]);

  const submittedTasks = useMemo(() => {
    return tasks.filter((task) => Number(task.status) === 2);
  }, [tasks]);

  const completedTasks = useMemo(() => {
    return tasks.filter((task) => Number(task.status) === 3);
  }, [tasks]);

  const myCreatedTasks = useMemo(() => {
    return tasks.filter((task) => sameAddress(task.client, account));
  }, [tasks, account]);

  const myAcceptedTasks = useMemo(() => {
    return tasks.filter((task) => sameAddress(task.worker, account));
  }, [tasks, account]);

  const pendingApprovalTasks = useMemo(() => {
    return tasks.filter(
      (task) => sameAddress(task.client, account) && Number(task.status) === 2
    );
  }, [tasks, account]);

  const myCompletedTasks = useMemo(() => {
    return tasks.filter(
      (task) => sameAddress(task.worker, account) && Number(task.status) === 3
    );
  }, [tasks, account]);

  const totalEscrowed = useMemo(() => {
    return tasks
      .filter((task) => Number(task.status) !== 3 && Number(task.status) !== 4)
      .reduce((sum, task) => sum + task.amount, 0n);
  }, [tasks]);

  const totalSettled = useMemo(() => {
    return completedTasks.reduce((sum, task) => sum + task.amount, 0n);
  }, [completedTasks]);

  const myEarned = useMemo(() => {
    return myCompletedTasks.reduce((sum, task) => sum + task.amount, 0n);
  }, [myCompletedTasks]);

  const agentScore = useMemo(() => {
    const completed = myCompletedTasks.length;
    if (completed === 0) return 0;
    return Math.min(100, 70 + completed * 5);
  }, [myCompletedTasks]);

  const filteredTasks = useMemo(() => {
    if (filter === "open") return openTasks;
    if (filter === "accepted") return acceptedTasks;
    if (filter === "submitted") return submittedTasks;
    if (filter === "completed") return completedTasks;
    if (filter === "mine") {
      return tasks.filter(
        (task) => sameAddress(task.client, account) || sameAddress(task.worker, account)
      );
    }
    return tasks;
  }, [
    filter,
    tasks,
    account,
    openTasks,
    acceptedTasks,
    submittedTasks,
    completedTasks,
  ]);

  async function switchToArc() {
    if (!window.ethereum) {
      alert("Please install MetaMask or Rabby wallet first.");
      return;
    }

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x4cef52" }],
      });
    } catch (error: any) {
      if (error.code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: "0x4cef52",
              chainName: "Arc Testnet",
              nativeCurrency: {
                name: "USDC",
                symbol: "USDC",
                decimals: 18,
              },
              rpcUrls: ["https://rpc.testnet.arc.network"],
              blockExplorerUrls: ["https://testnet.arcscan.app"],
            },
          ],
        });
      } else {
        throw error;
      }
    }
  }

  async function connectWallet() {
    if (!window.ethereum) {
      alert("Please install MetaMask or Rabby wallet first.");
      return;
    }

    await switchToArc();

    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });

    setAccount(accounts[0]);
    setMessage("Wallet connected.");
  }

  function getWalletClient() {
    if (!window.ethereum || !account) {
      throw new Error("Wallet not connected.");
    }

    return createWalletClient({
      account,
      chain: arcTestnet,
      transport: custom(window.ethereum),
    });
  }

  async function fetchTasks() {
    if (!ESCROW_ADDRESS) {
      setMessage("Missing VITE_ESCROW_ADDRESS in .env.local");
      return;
    }

    try {
      const count = await publicClient.readContract({
        address: ESCROW_ADDRESS,
        abi: escrowAbi,
        functionName: "nextTaskId",
      });

      const ids = Array.from({ length: Number(count) }, (_, index) => BigInt(index));

      const result = await Promise.all(
        ids.map(async (id) => {
          const task = await publicClient.readContract({
            address: ESCROW_ADDRESS,
            abi: escrowAbi,
            functionName: "getTask",
            args: [id],
          });

          return task as Task;
        })
      );

      setTasks(result.reverse());
    } catch (err: any) {
      console.error(err);
      setMessage(err?.shortMessage || err?.message || "Failed to fetch tasks.");
    }
  }

  async function createTask() {
    if (!account) {
      alert("Please connect wallet first.");
      return;
    }

    if (!title || !description || !amount) {
      alert("Please fill task title, description and budget.");
      return;
    }

    try {
      setLoading(true);
      setMessage("Approving USDC...");

      const walletClient = getWalletClient();
      const amountUnits = parseUnits(amount, 6);

      const approveHash = await walletClient.writeContract({
        address: USDC_ADDRESS,
        abi: erc20Abi,
        functionName: "approve",
        args: [ESCROW_ADDRESS, amountUnits],
      });

      await publicClient.waitForTransactionReceipt({ hash: approveHash });

      setMessage("USDC approved. Creating task...");

      const createHash = await walletClient.writeContract({
        address: ESCROW_ADDRESS,
        abi: escrowAbi,
        functionName: "createTask",
        args: [title, description, amountUnits],
      });

      await publicClient.waitForTransactionReceipt({ hash: createHash });

      setMessage("Task created successfully.");
      setActiveView("market");
      await fetchTasks();
    } catch (err: any) {
      console.error(err);
      setMessage(err?.shortMessage || err?.message || "Failed to create task.");
    } finally {
      setLoading(false);
    }
  }

  async function acceptTask(taskId: bigint) {
    if (!account) {
      alert("Please connect wallet first.");
      return;
    }

    try {
      setLoading(true);
      setMessage("Accepting task...");

      const walletClient = getWalletClient();

      const hash = await walletClient.writeContract({
        address: ESCROW_ADDRESS,
        abi: escrowAbi,
        functionName: "acceptTask",
        args: [taskId],
      });

      await publicClient.waitForTransactionReceipt({ hash });

      setMessage("Task accepted.");
      await fetchTasks();
    } catch (err: any) {
      console.error(err);
      setMessage(err?.shortMessage || err?.message || "Failed to accept task.");
    } finally {
      setLoading(false);
    }
  }

  async function submitWork(taskId: bigint) {
    if (!account) {
      alert("Please connect wallet first.");
      return;
    }

    const deliverable = deliverables[taskId.toString()];

    if (!deliverable) {
      alert("Please enter deliverable link or result.");
      return;
    }

    try {
      setLoading(true);
      setMessage("Submitting deliverable...");

      const walletClient = getWalletClient();

      const hash = await walletClient.writeContract({
        address: ESCROW_ADDRESS,
        abi: escrowAbi,
        functionName: "submitWork",
        args: [taskId, deliverable],
      });

      await publicClient.waitForTransactionReceipt({ hash });

      setMessage("Deliverable submitted.");
      await fetchTasks();
    } catch (err: any) {
      console.error(err);
      setMessage(err?.shortMessage || err?.message || "Failed to submit work.");
    } finally {
      setLoading(false);
    }
  }

  async function approveTask(taskId: bigint) {
    if (!account) {
      alert("Please connect wallet first.");
      return;
    }

    try {
      setLoading(true);
      setMessage("Approving task and releasing payment...");

      const walletClient = getWalletClient();

      const hash = await walletClient.writeContract({
        address: ESCROW_ADDRESS,
        abi: escrowAbi,
        functionName: "approveTask",
        args: [taskId],
      });

      await publicClient.waitForTransactionReceipt({ hash });

      setMessage("Task completed. USDC released to worker.");
      await fetchTasks();
    } catch (err: any) {
      console.error(err);
      setMessage(err?.shortMessage || err?.message || "Failed to approve task.");
    } finally {
      setLoading(false);
    }
  }

  async function cancelTask(taskId: bigint) {
    if (!account) {
      alert("Please connect wallet first.");
      return;
    }

    try {
      setLoading(true);
      setMessage("Cancelling task...");

      const walletClient = getWalletClient();

      const hash = await walletClient.writeContract({
        address: ESCROW_ADDRESS,
        abi: escrowAbi,
        functionName: "cancelTask",
        args: [taskId],
      });

      await publicClient.waitForTransactionReceipt({ hash });

      setMessage("Task cancelled. USDC refunded.");
      await fetchTasks();
    } catch (err: any) {
      console.error(err);
      setMessage(err?.shortMessage || err?.message || "Failed to cancel task.");
    } finally {
      setLoading(false);
    }
  }

  function renderTaskCard(task: Task) {
    const taskId = task.id.toString();
    const status = Number(task.status);
    const isClient = sameAddress(account, task.client);
    const isWorker = sameAddress(account, task.worker);

    return (
      <article className="task-card" key={taskId}>
        <div className="task-top">
          <div>
            <p className="task-id">TASK #{taskId}</p>
            <h3>{task.title}</h3>
          </div>
          <span className={`status status-${status}`}>
            {statusNames[status] || "Unknown"}
          </span>
        </div>

        <p className="task-desc">{task.description}</p>

        <div className="task-meta-grid">
          <div>
            <span>Budget</span>
            <strong>{formatUsdc(task.amount)} USDC</strong>
          </div>
          <div>
            <span>Client</span>
            <strong>{shortAddress(task.client)}</strong>
          </div>
          <div>
            <span>Worker</span>
            <strong>{shortAddress(task.worker)}</strong>
          </div>
          <div>
            <span>Created</span>
            <strong>{formatDate(task.createdAt)}</strong>
          </div>
        </div>

        {task.deliverable && (
          <div className="deliverable-box">
            <span>Deliverable</span>
            <p>{task.deliverable}</p>
          </div>
        )}

        <div className="task-actions">
          {status === 0 && !isClient && (
            <button disabled={loading} onClick={() => acceptTask(task.id)}>
              Accept Task
            </button>
          )}

          {status === 0 && isClient && (
            <button disabled={loading} className="danger-btn" onClick={() => cancelTask(task.id)}>
              Cancel Task
            </button>
          )}

          {status === 1 && isWorker && (
            <>
              <input
                placeholder="Deliverable URL, GitHub link, report link..."
                value={deliverables[taskId] || ""}
                onChange={(e) =>
                  setDeliverables({
                    ...deliverables,
                    [taskId]: e.target.value,
                  })
                }
              />
              <button disabled={loading} onClick={() => submitWork(task.id)}>
                Submit Deliverable
              </button>
            </>
          )}

          {status === 2 && isClient && (
            <button disabled={loading} onClick={() => approveTask(task.id)}>
              Approve & Release USDC
            </button>
          )}

          {status === 3 && <button className="ghost-action" disabled>Settlement Completed</button>}

          {status === 4 && <button className="ghost-action" disabled>Task Cancelled</button>}
        </div>
      </article>
    );
  }

  useEffect(() => {
    fetchTasks();

    if (window.ethereum) {
      window.ethereum
        .request({ method: "eth_accounts" })
        .then((accounts: string[]) => {
          if (accounts.length > 0) {
            setAccount(accounts[0] as Address);
          }
        });

      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length > 0) {
          setAccount(accounts[0] as Address);
          setMessage("Wallet account changed.");
        } else {
          setAccount(null);
        }
      };

      const handleChainChanged = () => {
        window.location.reload();
      };

      window.ethereum.on("accountsChanged", handleAccountsChanged);
      window.ethereum.on("chainChanged", handleChainChanged);

      return () => {
        if (window.ethereum?.removeListener) {
          window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
          window.ethereum.removeListener("chainChanged", handleChainChanged);
        }
      };
    }
  }, []);

  return (
    <main className="app-shell">
      <nav className="top-nav">
        <div className="brand">
          <div className="brand-orb">A</div>
          <div>
            <strong>AgentPay</strong>
            <span>Arc AI Task Escrow</span>
          </div>
        </div>

        <div className="nav-tabs">
          <button className={activeView === "market" ? "active" : ""} onClick={() => setActiveView("market")}>
            Market
          </button>
          <button className={activeView === "create" ? "active" : ""} onClick={() => setActiveView("create")}>
            Create
          </button>
          <button className={activeView === "dashboard" ? "active" : ""} onClick={() => setActiveView("dashboard")}>
            Dashboard
          </button>
          <button className={activeView === "agent" ? "active" : ""} onClick={() => setActiveView("agent")}>
            Agent
          </button>
          <button className={activeView === "protocol" ? "active" : ""} onClick={() => setActiveView("protocol")}>
            Protocol
          </button>
        </div>

        <button className="connect-btn" onClick={connectWallet}>
          {account ? shortAddress(account) : "Connect Wallet"}
        </button>
      </nav>

      <section className="hero-section">
        <div className="hero-copy">
          <p className="eyebrow">Built on Arc Testnet</p>
          <h1>AI Agents Work. USDC Pays.</h1>
          <p>
            AgentPay is a USDC-powered task escrow and settlement platform for AI agents,
            developers, freelancers, and autonomous services.
          </p>

          <div className="hero-actions">
            <button onClick={() => setActiveView("create")}>Create Task</button>
            <button className="secondary-btn" onClick={() => setActiveView("market")}>
              Explore Market
            </button>
          </div>
        </div>

        <div className="hero-panel">
          <div className="signal-line">
            <span>Escrow Status</span>
            <strong>Live</strong>
          </div>
          <div className="big-number">{formatUsdc(totalEscrowed)} USDC</div>
          <p>Currently secured in task escrow</p>

          <div className="mini-grid">
            <div>
              <span>Total Tasks</span>
              <strong>{tasks.length}</strong>
            </div>
            <div>
              <span>Open</span>
              <strong>{openTasks.length}</strong>
            </div>
            <div>
              <span>Submitted</span>
              <strong>{submittedTasks.length}</strong>
            </div>
            <div>
              <span>Settled</span>
              <strong>{formatUsdc(totalSettled)}</strong>
            </div>
          </div>
        </div>
      </section>

      {message && (
        <div className="message-bar">
          <span>{loading ? "Processing" : "Status"}</span>
          <p>{message}</p>
        </div>
      )}

      {activeView === "market" && (
        <section className="view-section">
          <div className="section-head">
            <div>
              <p className="section-kicker">Task Marketplace</p>
              <h2>Find AI work, accept tasks, and get paid in USDC.</h2>
            </div>
            <button className="secondary-btn" onClick={fetchTasks}>
              Refresh
            </button>
          </div>

          <div className="filter-row">
            {[
              ["all", "All"],
              ["open", "Open"],
              ["accepted", "Accepted"],
              ["submitted", "Submitted"],
              ["completed", "Completed"],
              ["mine", "Mine"],
            ].map(([key, label]) => (
              <button
                key={key}
                className={filter === key ? "active-filter" : ""}
                onClick={() => setFilter(key as FilterType)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="task-grid">
            {filteredTasks.length === 0 ? (
              <div className="empty-state">
                <h3>No tasks found</h3>
                <p>Create a new task or switch filters.</p>
              </div>
            ) : (
              filteredTasks.map(renderTaskCard)
            )}
          </div>
        </section>
      )}

      {activeView === "create" && (
        <section className="view-section two-column">
          <div className="create-card">
            <p className="section-kicker">Create Job</p>
            <h2>Publish a task and lock USDC into escrow.</h2>

            <label>Task Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} />

            <label>Task Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} />

            <label>Budget in USDC</label>
            <input value={amount} onChange={(e) => setAmount(e.target.value)} />

            <button disabled={loading} onClick={createTask}>
              Approve USDC & Create Task
            </button>
          </div>

          <div className="info-stack">
            <div className="info-card">
              <span>Step 01</span>
              <h3>Approve USDC</h3>
              <p>The user authorizes AgentPay to transfer the task budget into escrow.</p>
            </div>
            <div className="info-card">
              <span>Step 02</span>
              <h3>Lock Funds</h3>
              <p>USDC is locked in the smart contract before any worker accepts the task.</p>
            </div>
            <div className="info-card">
              <span>Step 03</span>
              <h3>Auto Settlement</h3>
              <p>After approval, the contract automatically releases USDC to the worker.</p>
            </div>
          </div>
        </section>
      )}

      {activeView === "dashboard" && (
        <section className="view-section">
          <div className="section-head">
            <div>
              <p className="section-kicker">Dashboard</p>
              <h2>Your task command center.</h2>
            </div>
            <button className="secondary-btn" onClick={fetchTasks}>
              Sync
            </button>
          </div>

          <div className="dashboard-grid">
            <div className="metric-card">
              <span>Created by Me</span>
              <strong>{myCreatedTasks.length}</strong>
            </div>
            <div className="metric-card">
              <span>Accepted by Me</span>
              <strong>{myAcceptedTasks.length}</strong>
            </div>
            <div className="metric-card">
              <span>Pending Approval</span>
              <strong>{pendingApprovalTasks.length}</strong>
            </div>
            <div className="metric-card">
              <span>My Earnings</span>
              <strong>{formatUsdc(myEarned)} USDC</strong>
            </div>
          </div>

          <div className="split-list">
            <div>
              <h3>My Created Tasks</h3>
              <div className="compact-list">
                {myCreatedTasks.length === 0 ? (
                  <p className="muted">No created tasks yet.</p>
                ) : (
                  myCreatedTasks.map((task) => (
                    <div className="compact-row" key={task.id.toString()}>
                      <span>#{task.id.toString()} {task.title}</span>
                      <strong>{statusNames[Number(task.status)]}</strong>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <h3>My Accepted Tasks</h3>
              <div className="compact-list">
                {myAcceptedTasks.length === 0 ? (
                  <p className="muted">No accepted tasks yet.</p>
                ) : (
                  myAcceptedTasks.map((task) => (
                    <div className="compact-row" key={task.id.toString()}>
                      <span>#{task.id.toString()} {task.title}</span>
                      <strong>{formatUsdc(task.amount)} USDC</strong>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {activeView === "agent" && (
        <section className="view-section two-column">
          <div className="agent-card">
            <div className="agent-avatar">
              {account ? account.slice(2, 4).toUpperCase() : "AI"}
            </div>
            <p className="section-kicker">Agent Profile</p>
            <h2>{account ? shortAddress(account) : "Connect Wallet"}</h2>
            <p>
              This profile summarizes your on-chain AgentPay activity, including accepted tasks,
              completed work, and USDC earnings.
            </p>

            <div className="score-ring">
              <strong>{agentScore}</strong>
              <span>Reputation Score</span>
            </div>
          </div>

          <div className="info-stack">
            <div className="info-card">
              <span>Completed Jobs</span>
              <h3>{myCompletedTasks.length}</h3>
              <p>Tasks completed and settled to this wallet.</p>
            </div>
            <div className="info-card">
              <span>Total Earned</span>
              <h3>{formatUsdc(myEarned)} USDC</h3>
              <p>Estimated total USDC received from completed work.</p>
            </div>
            <div className="info-card">
              <span>Active Jobs</span>
              <h3>{myAcceptedTasks.filter((task) => Number(task.status) === 1 || Number(task.status) === 2).length}</h3>
              <p>Accepted or submitted tasks currently in progress.</p>
            </div>
          </div>
        </section>
      )}

      {activeView === "protocol" && (
        <section className="view-section">
          <div className="section-head">
            <div>
              <p className="section-kicker">Protocol Vision</p>
              <h2>Payment infrastructure for the AI agent economy.</h2>
            </div>
          </div>

          <div className="protocol-grid">
            <div className="protocol-card">
              <span>01</span>
              <h3>Task Escrow</h3>
              <p>Users lock USDC before the task begins, reducing trust risk for workers and agents.</p>
            </div>
            <div className="protocol-card">
              <span>02</span>
              <h3>Agent Settlement</h3>
              <p>AI agents or developers submit deliverables and receive automatic settlement after approval.</p>
            </div>
            <div className="protocol-card">
              <span>03</span>
              <h3>On-chain Reputation</h3>
              <p>Every completed task can become a public reputation event for future agent identity.</p>
            </div>
            <div className="protocol-card">
              <span>04</span>
              <h3>Future Upgrade</h3>
              <p>AgentPay can later integrate ERC-8004 identity, ERC-8183 jobs, bridge deposits, and platform fees.</p>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}

export default App;