// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(address from, address to, uint256 value) external returns (bool);
    function transfer(address to, uint256 value) external returns (bool);
}

contract AgentPayEscrow {
    IERC20 public immutable usdc;
    uint256 public nextTaskId;

    enum TaskStatus {
        Open,
        Accepted,
        Submitted,
        Completed,
        Cancelled
    }

    struct Task {
        uint256 id;
        address client;
        address worker;
        uint256 amount;
        string title;
        string description;
        string deliverable;
        TaskStatus status;
        uint256 createdAt;
    }

    mapping(uint256 => Task) public tasks;

    event TaskCreated(
        uint256 indexed taskId,
        address indexed client,
        uint256 amount,
        string title
    );

    event TaskAccepted(
        uint256 indexed taskId,
        address indexed worker
    );

    event WorkSubmitted(
        uint256 indexed taskId,
        string deliverable
    );

    event TaskApproved(
        uint256 indexed taskId,
        address indexed worker,
        uint256 amount
    );

    event TaskCancelled(
        uint256 indexed taskId
    );

    constructor(address _usdc) {
        usdc = IERC20(_usdc);
    }

    function createTask(
        string calldata _title,
        string calldata _description,
        uint256 _amount
    ) external returns (uint256) {
        require(_amount > 0, "Amount must be greater than 0");

        bool ok = usdc.transferFrom(msg.sender, address(this), _amount);
        require(ok, "USDC transfer failed");

        uint256 taskId = nextTaskId;

        tasks[taskId] = Task({
            id: taskId,
            client: msg.sender,
            worker: address(0),
            amount: _amount,
            title: _title,
            description: _description,
            deliverable: "",
            status: TaskStatus.Open,
            createdAt: block.timestamp
        });

        nextTaskId++;

        emit TaskCreated(taskId, msg.sender, _amount, _title);

        return taskId;
    }

    function acceptTask(uint256 _taskId) external {
        Task storage task = tasks[_taskId];

        require(task.status == TaskStatus.Open, "Task is not open");
        require(task.client != msg.sender, "Client cannot accept own task");

        task.worker = msg.sender;
        task.status = TaskStatus.Accepted;

        emit TaskAccepted(_taskId, msg.sender);
    }

    function submitWork(
        uint256 _taskId,
        string calldata _deliverable
    ) external {
        Task storage task = tasks[_taskId];

        require(task.status == TaskStatus.Accepted, "Task not accepted");
        require(task.worker == msg.sender, "Only worker can submit");

        task.deliverable = _deliverable;
        task.status = TaskStatus.Submitted;

        emit WorkSubmitted(_taskId, _deliverable);
    }

    function approveTask(uint256 _taskId) external {
        Task storage task = tasks[_taskId];

        require(task.client == msg.sender, "Only client can approve");
        require(task.status == TaskStatus.Submitted, "Task not submitted");

        task.status = TaskStatus.Completed;

        bool ok = usdc.transfer(task.worker, task.amount);
        require(ok, "USDC payment failed");

        emit TaskApproved(_taskId, task.worker, task.amount);
    }

    function cancelTask(uint256 _taskId) external {
        Task storage task = tasks[_taskId];

        require(task.client == msg.sender, "Only client can cancel");
        require(task.status == TaskStatus.Open, "Only open task can cancel");

        task.status = TaskStatus.Cancelled;

        bool ok = usdc.transfer(task.client, task.amount);
        require(ok, "Refund failed");

        emit TaskCancelled(_taskId);
    }

    function getTask(uint256 _taskId) external view returns (Task memory) {
        return tasks[_taskId];
    }
}