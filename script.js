// Memory Allocation Simulator
// This script implements First Fit, Best Fit, and Worst Fit allocation logic
// for variable-sized memory blocks and process sizes, with validation and UI rendering.

const memoryBlocksInput = document.getElementById("memoryBlocksInput");
const processSizesInput = document.getElementById("processSizesInput");
const algorithmSelect = document.getElementById("algorithmSelect");
const allocateBtn = document.getElementById("allocateBtn");
const compareBtn = document.getElementById("compareBtn");
const resetBtn = document.getElementById("resetBtn");
const messageBox = document.getElementById("messageBox");
const memoryMap = document.getElementById("memoryMap");
const resultsTableBody = document.querySelector("#resultsTable tbody");
const comparisonTableBody = document.querySelector("#comparisonTable tbody");

const utilizationStat = document.getElementById("utilizationStat");
const allocatedCountStat = document.getElementById("allocatedCountStat");
const unallocatedCountStat = document.getElementById("unallocatedCountStat");
const remainingFreeStat = document.getElementById("remainingFreeStat");

const algorithms = ["first-fit", "best-fit", "worst-fit"];

function showMessage(message, type = "error") {
  messageBox.textContent = message;
  messageBox.className = `message-box ${type}`;
}

function clearMessage() {
  messageBox.textContent = "";
  messageBox.className = "message-box";
}

function parseIntegerList(rawValue, label) {
  if (typeof rawValue !== "string") {
    throw new Error(`${label} must be a comma-separated list of positive integers.`);
  }

  const trimmed = rawValue.trim();
  if (!trimmed) {
    throw new Error(`${label} cannot be empty.`);
  }

  const items = trimmed
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part !== "");

  if (items.length === 0) {
    throw new Error(`${label} cannot be empty.`);
  }

  const result = items.map((part) => {
    if (!/^\d+$/.test(part)) {
      throw new Error(
        `Invalid value "${part}" in ${label}. Use only positive integers separated by commas.`
      );
    }

    const number = Number(part);

    if (!Number.isInteger(number) || number <= 0) {
      throw new Error(
        `Invalid value "${part}" in ${label}. Sizes must be positive integers greater than zero.`
      );
    }

    return number;
  });

  return result;
}

function createBlockState(size, index) {
  return {
    id: `B${index + 1}`,
    originalSize: size,
    remainingFree: size,
    allocated: [],
  };
}

function cloneBlocks(blocks) {
  return blocks.map((block) => ({
    id: block.id,
    originalSize: block.originalSize,
    remainingFree: block.remainingFree,
    allocated: block.allocated.map((process) => ({ ...process })),
  }));
}

function sumValues(values) {
  return values.reduce((total, value) => total + value, 0);
}

function chooseBlockIndex(blocks, processSize, algorithm) {
  const eligible = blocks
    .map((block, index) => ({ block, index }))
    .filter(({ block }) => block.remainingFree >= processSize);

  if (eligible.length === 0) {
    return -1;
  }

  if (algorithm === "first-fit") {
    return eligible[0].index;
  }

  if (algorithm === "best-fit") {
    // Choose the block with the smallest remaining space after allocation.
    eligible.sort((a, b) => {
      const aRemaining = a.block.remainingFree - processSize;
      const bRemaining = b.block.remainingFree - processSize;
      if (aRemaining !== bRemaining) return aRemaining - bRemaining;
      return a.index - b.index;
    });
    return eligible[0].index;
  }

  if (algorithm === "worst-fit") {
    // Choose the block with the largest remaining space after allocation.
    eligible.sort((a, b) => {
      const aRemaining = a.block.remainingFree - processSize;
      const bRemaining = b.block.remainingFree - processSize;
      if (aRemaining !== bRemaining) return bRemaining - aRemaining;
      return a.index - b.index;
    });
    return eligible[0].index;
  }

  return -1;
}

function runAllocation(memoryBlocks, processSizes, algorithm) {
  const blocks = cloneBlocks(memoryBlocks);
  const results = [];
  let allocatedCount = 0;

  processSizes.forEach((processSize, index) => {
    const processId = `P${index + 1}`;
    const blockIndex = chooseBlockIndex(blocks, processSize, algorithm);

    if (blockIndex === -1) {
      results.push({
        processId,
        size: processSize,
        blockId: "Not Allocated",
        allocatedSize: 0,
        remainingSpace: 0,
        status: "Not Allocated",
      });
      return;
    }

    const chosenBlock = blocks[blockIndex];
    chosenBlock.remainingFree -= processSize;
    chosenBlock.allocated.push({
      processId,
      size: processSize,
    });

    results.push({
      processId,
      size: processSize,
      blockId: chosenBlock.id,
      allocatedSize: processSize,
      remainingSpace: chosenBlock.remainingFree,
      status: "Allocated",
    });

    allocatedCount += 1;
  });

  const initialTotal = sumValues(memoryBlocks.map((block) => block.originalSize));
  const totalAllocated = sumValues(
    results
      .filter((result) => result.status === "Allocated")
      .map((result) => result.allocatedSize)
  );
  const totalFree = sumValues(blocks.map((block) => block.remainingFree));
  const utilization = initialTotal > 0 ? (totalAllocated / initialTotal) * 100 : 0;

  return {
    blocks,
    results,
    allocatedCount,
    notAllocatedCount: processSizes.length - allocatedCount,
    initialTotal,
    totalAllocated,
    totalFree,
    utilization,
  };
}

function renderMessageAndStats(data) {
  if (!data) {
    utilizationStat.textContent = "0%";
    allocatedCountStat.textContent = "0";
    unallocatedCountStat.textContent = "0";
    remainingFreeStat.textContent = "0 KB";
    return;
  }

  utilizationStat.textContent = `${data.utilization.toFixed(2)}%`;
  allocatedCountStat.textContent = String(data.allocatedCount);
  unallocatedCountStat.textContent = String(data.notAllocatedCount);
  remainingFreeStat.textContent = `${data.totalFree} KB`;
}

function renderMemoryMap(blocks) {
  if (!blocks || blocks.length === 0) {
    memoryMap.innerHTML =
      '<div class="empty-state">No memory blocks available. Enter valid memory sizes first.</div>';
    return;
  }

  const maxBlockSize = Math.max(...blocks.map((block) => block.originalSize), 1);

  memoryMap.innerHTML = "";

  blocks.forEach((block) => {
    const card = document.createElement("div");
    card.className = "memory-block-card";

    const header = document.createElement("div");
    header.className = "block-header";
    header.innerHTML = `
      <strong>${block.id}</strong>
      <span>${block.originalSize} KB</span>
    `;

    const visual = document.createElement("div");
    visual.className = "block-visual";

    if (block.allocated.length === 0 && block.remainingFree === block.originalSize) {
      const freeSegment = document.createElement("div");
      freeSegment.className = "memory-segment free";
      const ratio = block.originalSize / maxBlockSize;
      freeSegment.style.flex = `${ratio} 0 0`;
      freeSegment.title = `Free: ${block.remainingFree} KB`;
      freeSegment.textContent = "Free";
      visual.appendChild(freeSegment);
    } else {
      block.allocated.forEach((process) => {
        const segment = document.createElement("div");
        const ratio = process.size / block.originalSize;
        segment.className = "memory-segment allocated";
        segment.style.flex = `${ratio} 0 0`;
        segment.title = `${process.processId}: ${process.size} KB`;
        segment.textContent = process.processId;
        visual.appendChild(segment);
      });

      if (block.remainingFree > 0) {
        const freeSegment = document.createElement("div");
        const ratio = block.remainingFree / block.originalSize;
        freeSegment.className = "memory-segment free";
        freeSegment.style.flex = `${ratio} 0 0`;
        freeSegment.title = `Free: ${block.remainingFree} KB`;
        freeSegment.textContent = "Free";
        visual.appendChild(freeSegment);
      }
    }

    const meta = document.createElement("div");
    meta.className = "block-meta";

    const allocationString =
      block.allocated.length > 0
        ? block.allocated
            .map((process) => `${process.processId} (${process.size} KB)`)
            .join(", ")
        : "None";

    meta.innerHTML = `
      <div>Allocated processes: ${allocationString}</div>
      <div>Remaining free space: ${block.remainingFree} KB</div>
    `;

    card.appendChild(header);
    card.appendChild(visual);
    card.appendChild(meta);
    memoryMap.appendChild(card);
  });
}

function renderResults(results) {
  if (!results || results.length === 0) {
    resultsTableBody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-row">
          No results yet. Run the simulator to see allocation details.
        </td>
      </tr>
    `;
    return;
  }

  resultsTableBody.innerHTML = results
    .map((result) => {
      const statusClass =
        result.status === "Allocated" ? "allocated" : "not-allocated";

      const allocatedValue =
        result.status === "Allocated" ? `${result.allocatedSize} KB` : "—";

      const remainingValue =
        result.status === "Allocated" ? `${result.remainingSpace} KB` : "—";

      const blockValue =
        result.status === "Allocated" ? result.blockId : "Not Allocated";

      return `
        <tr>
          <td>${result.processId}</td>
          <td>${result.size} KB</td>
          <td>${blockValue}</td>
          <td>${allocatedValue}</td>
          <td>${remainingValue}</td>
          <td>
            <span class="status-badge ${statusClass}">${result.status}</span>
          </td>
        </tr>
      `;
    })
    .join("");
}

function renderComparisonTable(resultsByAlgorithm) {
  if (!resultsByAlgorithm || resultsByAlgorithm.length === 0) {
    comparisonTableBody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-row">
          Compare algorithms after entering the inputs.
        </td>
      </tr>
    `;
    return;
  }

  comparisonTableBody.innerHTML = resultsByAlgorithm
    .map((entry) => {
      const algoLabel = entry.algorithmLabel;
      return `
        <tr>
          <td>${algoLabel}</td>
          <td>${entry.allocatedCount}</td>
          <td>${entry.notAllocatedCount}</td>
          <td>${entry.initialTotal} KB</td>
          <td>${entry.totalAllocated} KB</td>
          <td>${entry.totalFree} KB</td>
          <td>${entry.utilization.toFixed(2)}%</td>
        </tr>
      `;
    })
    .join("");
}

function defaultEmptyState() {
  memoryMap.innerHTML =
    '<div class="empty-state">No simulation has been run yet. Enter memory sizes and processes to begin.</div>';

  resultsTableBody.innerHTML = `
    <tr>
      <td colspan="6" class="empty-row">
        No results yet. Run the simulator to see allocation details.
      </td>
    </tr>
  `;

  comparisonTableBody.innerHTML = `
    <tr>
      <td colspan="7" class="empty-row">
        Compare algorithms after entering the inputs.
      </td>
    </tr>
  `;

  renderMessageAndStats(null);
}

function resetSimulation() {
  memoryBlocksInput.value = "";
  processSizesInput.value = "";
  algorithmSelect.value = "first-fit";
  clearMessage();
  defaultEmptyState();
}

function handleAllocate() {
  try {
    const memoryBlocks = parseIntegerList(
      memoryBlocksInput.value,
      "Memory block sizes"
    ).map((size, index) => createBlockState(size, index));

    const processSizes = parseIntegerList(
      processSizesInput.value,
      "Process sizes"
    );

    const selectedAlgorithm = algorithmSelect.value;

    if (!algorithms.includes(selectedAlgorithm)) {
      throw new Error("Please select a valid allocation algorithm.");
    }

    const result = runAllocation(memoryBlocks, processSizes, selectedAlgorithm);

    renderMemoryMap(result.blocks);
    renderResults(result.results);
    renderMessageAndStats(result);
    showMessage(
      `Simulation complete using ${selectedAlgorithm.replace("-", " ")}.`,
      "success"
    );
  } catch (error) {
    clearMessage();
    showMessage(error.message, "error");
    defaultEmptyState();
  }
}

function runComparison() {
  try {
    const memoryBlocks = parseIntegerList(
      memoryBlocksInput.value,
      "Memory block sizes"
    ).map((size, index) => createBlockState(size, index));

    const processSizes = parseIntegerList(
      processSizesInput.value,
      "Process sizes"
    );

    const comparisonData = algorithms.map((algorithm) => {
      const data = runAllocation(memoryBlocks, processSizes, algorithm);
      const labelMap = {
        "first-fit": "First Fit",
        "best-fit": "Best Fit",
        "worst-fit": "Worst Fit",
      };

      return {
        algorithm,
        algorithmLabel: labelMap[algorithm],
        allocatedCount: data.allocatedCount,
        notAllocatedCount: data.notAllocatedCount,
        initialTotal: data.initialTotal,
        totalAllocated: data.totalAllocated,
        totalFree: data.totalFree,
        utilization: data.utilization,
      };
    });

    renderComparisonTable(comparisonData);

    const selectedAlgorithm = algorithmSelect.value;
    const selectedOutput = runAllocation(memoryBlocks, processSizes, selectedAlgorithm);

    renderMemoryMap(selectedOutput.blocks);
    renderResults(selectedOutput.results);
    renderMessageAndStats(selectedOutput);

    showMessage("Comparison completed for all three algorithms.", "success");
  } catch (error) {
    clearMessage();
    showMessage(error.message, "error");
    defaultEmptyState();
  }
}

allocateBtn.addEventListener("click", handleAllocate);
compareBtn.addEventListener("click", runComparison);
resetBtn.addEventListener("click", resetSimulation);

memoryBlocksInput.value = "100, 500, 200, 300, 600";
processSizesInput.value = "212, 417, 112, 426";
algorithmSelect.value = "first-fit";

defaultEmptyState();
