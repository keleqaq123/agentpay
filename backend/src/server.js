import "dotenv/config";
import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import {
  createPublicClient,
  defineChain,
  formatUnits,
  getAddress,
  http,
  isAddress,
} from "viem";

const PORT = Number(process.env.PORT || 8787);
const ARC_RPC_URL =
  process.env.ARC_RPC_URL || "https://rpc.testnet.arc.network";
const ESCROW_ADDRESS = process.env.ESCROW_ADDRESS;

const DATA_DIR = path.resolve("data");
const DB_PATH = path.join(DATA_DIR, "db.json");

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const statusNames = ["Open", "Accepted", "Submitted", "Completed", "Cancelled"];

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
      http: [ARC_RPC_URL],
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
  transport: http(ARC_RPC_URL),
});

const escrowAbi = [
  {
    inputs: [],
    name: "nextTaskId",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_taskId", type: "uint256" }],
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
];

function ensureDatabase() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DB_PATH)) {
    const initialDb = {
      profiles: {},
      ratings: [],
      taskMeta: {},
      createdAt: new Date().toISOString(),
    };

    fs.writeFileSync(DB_PATH, JSON.stringify(initialDb, null, 2));
  }
}

function readDb() {
  ensureDatabase();
  return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
}

function writeDb(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function normalizeAddress(address) {
  if (!address || !isAddress(address)) {
    throw new Error("Invalid address");
  }

  return getAddress(address).toLowerCase();
}

function sameAddress(a, b) {
  if (!a || !b) return false;
  return a.toLowerCase() === b.toLowerCase();
}

function inferCategory(title, description) {
  const text = `${title} ${description}`.toLowerCase();

  if (text.includes("code") || text.includes("github") || text.includes("bot")) {
    return "Code Development";
  }

  if (text.includes("contract") || text.includes("audit")) {
    return "Smart Contract Review";
  }

  if (text.includes("research") || text.includes("market")) {
    return "Market Research";
  }

  if (text.includes("data") || text.includes("analysis")) {
    return "Data Analysis";
  }

  if (text.includes("twitter") || text.includes("social") || text.includes("content")) {
    return "Social Media Content";
  }

  if (text.includes("translate") || text.includes("translation")) {
    return "Translation";
  }

  return "General AI Task";
}

function formatTask(rawTask) {
  const task = Array.isArray(rawTask)
    ? {
        id: rawTask[0],
        client: rawTask[1],
        worker: rawTask[2],
        amount: rawTask[3],
        title: rawTask[4],
        description: rawTask[5],
        deliverable: rawTask[6],
        status: rawTask[7],
        createdAt: rawTask[8],
      }
    : rawTask;

  const status = Number(task.status);
  const id = Number(task.id);
  const amountRaw = task.amount.toString();

  return {
    id,
    client: task.client,
    worker: task.worker,
    amountRaw,
    amount: formatUnits(task.amount, 6),
    title: task.title,
    description: task.description,
    deliverable: task.deliverable,
    status,
    statusName: statusNames[status] || "Unknown",
    createdAt: Number(task.createdAt),
    createdAtISO: Number(task.createdAt)
      ? new Date(Number(task.createdAt) * 1000).toISOString()
      : null,
  };
}

async function getOnchainTasks() {
  if (!ESCROW_ADDRESS || !isAddress(ESCROW_ADDRESS)) {
    throw new Error("Missing or invalid ESCROW_ADDRESS in backend .env");
  }

  const count = await publicClient.readContract({
    address: ESCROW_ADDRESS,
    abi: escrowAbi,
    functionName: "nextTaskId",
  });

  const ids = Array.from({ length: Number(count) }, (_, index) => BigInt(index));

  const tasks = await Promise.all(
    ids.map(async (id) => {
      const rawTask = await publicClient.readContract({
        address: ESCROW_ADDRESS,
        abi: escrowAbi,
        functionName: "getTask",
        args: [id],
      });

      return formatTask(rawTask);
    })
  );

  return tasks.reverse();
}

async function getEnrichedTasks() {
  const db = readDb();
  const tasks = await getOnchainTasks();

  return tasks.map((task) => {
    const meta = db.taskMeta[String(task.id)] || {};
    const ratings = db.ratings.filter((rating) => Number(rating.taskId) === task.id);

    return {
      ...task,
      category:
        meta.category || inferCategory(task.title, task.description),
      tags: meta.tags || [],
      deadline: meta.deadline || null,
      priority: meta.priority || "Normal",
      notes: meta.notes || "",
      ratings,
    };
  });
}

function buildStats(tasks) {
  const activeTasks = tasks.filter(
    (task) => task.status !== 3 && task.status !== 4
  );

  const completedTasks = tasks.filter((task) => task.status === 3);

  const totalEscrowedRaw = activeTasks.reduce(
    (sum, task) => sum + BigInt(task.amountRaw),
    0n
  );

  const totalSettledRaw = completedTasks.reduce(
    (sum, task) => sum + BigInt(task.amountRaw),
    0n
  );

  return {
    totalTasks: tasks.length,
    openTasks: tasks.filter((task) => task.status === 0).length,
    acceptedTasks: tasks.filter((task) => task.status === 1).length,
    submittedTasks: tasks.filter((task) => task.status === 2).length,
    completedTasks: completedTasks.length,
    cancelledTasks: tasks.filter((task) => task.status === 4).length,
    totalEscrowed: formatUnits(totalEscrowedRaw, 6),
    totalSettled: formatUnits(totalSettledRaw, 6),
  };
}

function buildAgentStats(address, tasks) {
  const db = readDb();
  const normalized = normalizeAddress(address);

  const createdTasks = tasks.filter((task) =>
    sameAddress(task.client, normalized)
  );

  const acceptedTasks = tasks.filter((task) =>
    sameAddress(task.worker, normalized)
  );

  const completedTasks = acceptedTasks.filter((task) => task.status === 3);

  const activeTasks = acceptedTasks.filter(
    (task) => task.status === 1 || task.status === 2
  );

  const earnedRaw = completedTasks.reduce(
    (sum, task) => sum + BigInt(task.amountRaw),
    0n
  );

  const ratings = db.ratings.filter((rating) =>
    sameAddress(rating.worker, normalized)
  );

  const averageRating =
    ratings.length === 0
      ? 0
      : ratings.reduce((sum, rating) => sum + Number(rating.rating), 0) /
        ratings.length;

  const reputationScore =
    completedTasks.length === 0
      ? 0
      : Math.min(100, Math.round(70 + completedTasks.length * 5 + averageRating * 2));

  return {
    address: normalized,
    profile: db.profiles[normalized] || null,
    createdTasks: createdTasks.length,
    acceptedTasks: acceptedTasks.length,
    completedTasks: completedTasks.length,
    activeTasks: activeTasks.length,
    totalEarned: formatUnits(earnedRaw, 6),
    ratingsCount: ratings.length,
    averageRating: Number(averageRating.toFixed(2)),
    reputationScore,
    recentTasks: acceptedTasks.slice(0, 10),
    ratings: ratings.slice(-10).reverse(),
  };
}

const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://localhost:4173",
      "http://127.0.0.1:4173",
    ],
  })
);

app.use(express.json({ limit: "1mb" }));

app.get("/", (req, res) => {
  res.json({
    name: "AgentPay Backend",
    status: "running",
    chain: "Arc Testnet",
    chainId: 5042002,
    escrowAddress: ESCROW_ADDRESS,
  });
});

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/config", (req, res) => {
  res.json({
    chain: {
      id: 5042002,
      name: "Arc Testnet",
      rpcUrl: ARC_RPC_URL,
      explorer: "https://testnet.arcscan.app",
    },
    contracts: {
      escrow: ESCROW_ADDRESS,
      usdc: "0x3600000000000000000000000000000000000000",
    },
  });
});

app.get("/api/tasks", async (req, res) => {
  try {
    const tasks = await getEnrichedTasks();

    const { status, category, address } = req.query;

    let filtered = tasks;

    if (status !== undefined) {
      filtered = filtered.filter((task) => String(task.status) === String(status));
    }

    if (category) {
      filtered = filtered.filter(
        (task) => task.category.toLowerCase() === String(category).toLowerCase()
      );
    }

    if (address) {
      const normalized = normalizeAddress(String(address));
      filtered = filtered.filter(
        (task) =>
          sameAddress(task.client, normalized) ||
          sameAddress(task.worker, normalized)
      );
    }

    res.json({
      tasks: filtered,
      stats: buildStats(tasks),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: error.message || "Failed to fetch tasks",
    });
  }
});

app.get("/api/tasks/:id", async (req, res) => {
  try {
    const tasks = await getEnrichedTasks();
    const id = Number(req.params.id);

    const task = tasks.find((item) => item.id === id);

    if (!task) {
      return res.status(404).json({
        error: "Task not found",
      });
    }

    res.json({ task });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: error.message || "Failed to fetch task",
    });
  }
});

app.get("/api/stats", async (req, res) => {
  try {
    const tasks = await getEnrichedTasks();
    res.json(buildStats(tasks));
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: error.message || "Failed to fetch stats",
    });
  }
});

app.get("/api/agents/:address", async (req, res) => {
  try {
    const tasks = await getEnrichedTasks();
    const stats = buildAgentStats(req.params.address, tasks);

    res.json(stats);
  } catch (error) {
    console.error(error);
    res.status(400).json({
      error: error.message || "Failed to fetch agent profile",
    });
  }
});

app.post("/api/profiles", (req, res) => {
  try {
    const { address, name, bio, skills, avatar } = req.body;

    const normalized = normalizeAddress(address);
    const db = readDb();

    db.profiles[normalized] = {
      address: normalized,
      name: String(name || "Unnamed Agent").slice(0, 80),
      bio: String(bio || "").slice(0, 500),
      skills: Array.isArray(skills)
        ? skills.map((skill) => String(skill).slice(0, 40)).slice(0, 12)
        : [],
      avatar: String(avatar || "").slice(0, 500),
      updatedAt: new Date().toISOString(),
    };

    writeDb(db);

    res.json({
      ok: true,
      profile: db.profiles[normalized],
    });
  } catch (error) {
    console.error(error);
    res.status(400).json({
      error: error.message || "Failed to save profile",
    });
  }
});

app.post("/api/task-meta", (req, res) => {
  try {
    const { taskId, category, tags, deadline, priority, notes } = req.body;

    if (taskId === undefined || taskId === null) {
      return res.status(400).json({
        error: "taskId is required",
      });
    }

    const db = readDb();
    const id = String(Number(taskId));

    db.taskMeta[id] = {
      category: String(category || "General AI Task").slice(0, 80),
      tags: Array.isArray(tags)
        ? tags.map((tag) => String(tag).slice(0, 30)).slice(0, 10)
        : [],
      deadline: deadline ? String(deadline).slice(0, 80) : null,
      priority: String(priority || "Normal").slice(0, 30),
      notes: String(notes || "").slice(0, 500),
      updatedAt: new Date().toISOString(),
    };

    writeDb(db);

    res.json({
      ok: true,
      meta: db.taskMeta[id],
    });
  } catch (error) {
    console.error(error);
    res.status(400).json({
      error: error.message || "Failed to save task metadata",
    });
  }
});

app.post("/api/ratings", async (req, res) => {
  try {
    const { taskId, rater, worker, rating, comment } = req.body;

    const id = Number(taskId);
    const normalizedRater = normalizeAddress(rater);
    const normalizedWorker = normalizeAddress(worker);
    const ratingValue = Number(rating);

    if (!Number.isInteger(id) || id < 0) {
      return res.status(400).json({
        error: "Invalid taskId",
      });
    }

    if (!Number.isInteger(ratingValue) || ratingValue < 1 || ratingValue > 5) {
      return res.status(400).json({
        error: "Rating must be an integer from 1 to 5",
      });
    }

    const tasks = await getEnrichedTasks();
    const task = tasks.find((item) => item.id === id);

    if (!task) {
      return res.status(404).json({
        error: "Task not found",
      });
    }

    if (task.status !== 3) {
      return res.status(400).json({
        error: "Only completed tasks can be rated",
      });
    }

    if (!sameAddress(task.client, normalizedRater)) {
      return res.status(400).json({
        error: "Only the task creator can rate this task",
      });
    }

    if (!sameAddress(task.worker, normalizedWorker)) {
      return res.status(400).json({
        error: "Worker address does not match this task",
      });
    }

    const db = readDb();

    const existingIndex = db.ratings.findIndex(
      (item) =>
        Number(item.taskId) === id &&
        sameAddress(item.rater, normalizedRater)
    );

    const ratingRecord = {
      taskId: id,
      rater: normalizedRater,
      worker: normalizedWorker,
      rating: ratingValue,
      comment: String(comment || "").slice(0, 500),
      createdAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      db.ratings[existingIndex] = ratingRecord;
    } else {
      db.ratings.push(ratingRecord);
    }

    writeDb(db);

    res.json({
      ok: true,
      rating: ratingRecord,
    });
  } catch (error) {
    console.error(error);
    res.status(400).json({
      error: error.message || "Failed to save rating",
    });
  }
});

app.listen(PORT, () => {
  ensureDatabase();

  console.log("");
  console.log("==========================================");
  console.log(" AgentPay Backend is running");
  console.log("==========================================");
  console.log(` Local:          http://localhost:${PORT}`);
  console.log(` Health:         http://localhost:${PORT}/health`);
  console.log(` Tasks API:      http://localhost:${PORT}/api/tasks`);
  console.log(` Stats API:      http://localhost:${PORT}/api/stats`);
  console.log(` Escrow:         ${ESCROW_ADDRESS}`);
  console.log("==========================================");
  console.log("");
});