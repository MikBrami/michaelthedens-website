const models = {
  "R2350-G": {
    formFactor: "1U",
    sockets: 1,
    maxCoresPerCpu: 32,
    maxDimms: 16,
    maxRamGB: 1024,
    maxDrives: 10,
    supportedDriveTypes: ["SAS", "SATA", "NVMe"],
    maxGpus: 1,
    minPsuWatt: 800,
    nicMaxGbE: 25,
  },
  "R2850-G": {
    formFactor: "2U",
    sockets: 2,
    maxCoresPerCpu: 40,
    maxDimms: 32,
    maxRamGB: 4096,
    maxDrives: 24,
    supportedDriveTypes: ["SAS", "SATA", "NVMe"],
    maxGpus: 3,
    minPsuWatt: 1200,
    nicMaxGbE: 100,
  },
  "R5300-G4": {
    formFactor: "4U",
    sockets: 2,
    maxCoresPerCpu: 56,
    maxDimms: 32,
    maxRamGB: 8192,
    maxDrives: 28,
    supportedDriveTypes: ["SAS", "SATA", "NVMe"],
    maxGpus: 8,
    minPsuWatt: 1600,
    nicMaxGbE: 100,
  },
  "R5300-G4X": {
    formFactor: "4U",
    sockets: 2,
    maxCoresPerCpu: 56,
    maxDimms: 32,
    maxRamGB: 8192,
    maxDrives: 28,
    supportedDriveTypes: ["SAS", "SATA", "NVMe"],
    maxGpus: 10,
    minPsuWatt: 1600,
    nicMaxGbE: 100,
  },
  "R5500-G4X": {
    formFactor: "4U",
    sockets: 2,
    maxCoresPerCpu: 56,
    maxDimms: 32,
    maxRamGB: 8192,
    maxDrives: 28,
    supportedDriveTypes: ["SAS", "SATA", "NVMe"],
    maxGpus: 10,
    minPsuWatt: 1600,
    nicMaxGbE: 100,
  },
  "R5200-G5": {
    formFactor: "1U",
    sockets: 2,
    maxCoresPerCpu: 64,
    maxDimms: 32,
    maxRamGB: 8192,
    maxDrives: 26,
    supportedDriveTypes: ["SAS", "SATA", "NVMe"],
    maxGpus: 10,
    minPsuWatt: 2000,
    nicMaxGbE: 100,
  },
  "R5250-G5": {
    formFactor: "4U",
    sockets: 2,
    maxCoresPerCpu: 64,
    maxDimms: 32,
    maxRamGB: 12288,
    maxDrives: 24,
    supportedDriveTypes: ["SAS", "SATA", "NVMe"],
    maxGpus: 8,
    minPsuWatt: 2000,
    nicMaxGbE: 100,
  },
  "R5300-G5": {
    formFactor: "4U",
    sockets: 2,
    maxCoresPerCpu: 64,
    maxDimms: 32,
    maxRamGB: 8192,
    maxDrives: 26,
    supportedDriveTypes: ["SAS", "SATA", "NVMe"],
    maxGpus: 8,
    minPsuWatt: 2000,
    nicMaxGbE: 100,
  },
  "R5500-G5": {
    formFactor: "4U",
    sockets: 2,
    maxCoresPerCpu: 64,
    maxDimms: 32,
    maxRamGB: 12288,
    maxDrives: 24,
    supportedDriveTypes: ["SAS", "SATA", "NVMe"],
    maxGpus: 10,
    minPsuWatt: 2000,
    nicMaxGbE: 100,
  },
  "R6500-G5": {
    formFactor: "8U",
    sockets: 2,
    maxCoresPerCpu: 64,
    maxDimms: 32,
    maxRamGB: 12288,
    maxDrives: 32,
    supportedDriveTypes: ["SAS", "SATA", "NVMe"],
    maxGpus: 16,
    minPsuWatt: 2000,
    nicMaxGbE: 100,
  },
  "R8500-G5": {
    formFactor: "8U",
    sockets: 2,
    maxCoresPerCpu: 64,
    maxDimms: 32,
    maxRamGB: 12288,
    maxDrives: 32,
    supportedDriveTypes: ["SAS", "SATA", "NVMe"],
    maxGpus: 16,
    minPsuWatt: 2000,
    nicMaxGbE: 100,
  },
  "R2250-G6": {
    formFactor: "1U",
    sockets: 1,
    maxCoresPerCpu: 192,
    maxDimms: 16,
    maxRamGB: 2048,
    maxDrives: 12,
    supportedDriveTypes: ["SAS", "SATA", "NVMe"],
    maxGpus: 1,
    minPsuWatt: 1200,
    nicMaxGbE: 100,
  },
  "R2350-G6": {
    formFactor: "1U",
    sockets: 2,
    maxCoresPerCpu: 192,
    maxDimms: 32,
    maxRamGB: 4096,
    maxDrives: 12,
    supportedDriveTypes: ["SAS", "SATA", "NVMe"],
    maxGpus: 2,
    minPsuWatt: 1200,
    nicMaxGbE: 100,
  },
  "R5200-G6": {
    formFactor: "2U",
    sockets: 2,
    maxCoresPerCpu: 192,
    maxDimms: 32,
    maxRamGB: 8192,
    maxDrives: 26,
    supportedDriveTypes: ["SAS", "SATA", "NVMe"],
    maxGpus: 8,
    minPsuWatt: 2000,
    nicMaxGbE: 100,
  },
  "R5300-G6": {
    formFactor: "2U",
    sockets: 2,
    maxCoresPerCpu: 192,
    maxDimms: 32,
    maxRamGB: 8192,
    maxDrives: 28,
    supportedDriveTypes: ["SAS", "SATA", "NVMe"],
    maxGpus: 4,
    minPsuWatt: 1600,
    nicMaxGbE: 100,
  },
  "R5350-G6": {
    formFactor: "2U",
    sockets: 2,
    maxCoresPerCpu: 192,
    maxDimms: 32,
    maxRamGB: 8192,
    maxDrives: 28,
    supportedDriveTypes: ["SAS", "SATA", "NVMe"],
    maxGpus: 4,
    minPsuWatt: 1600,
    nicMaxGbE: 100,
  },
  "R6500-G6": {
    formFactor: "4U",
    sockets: 2,
    maxCoresPerCpu: 192,
    maxDimms: 32,
    maxRamGB: 12288,
    maxDrives: 32,
    supportedDriveTypes: ["SAS", "SATA", "NVMe"],
    maxGpus: 12,
    minPsuWatt: 2000,
    nicMaxGbE: 100,
  },
  "R6501-G6": {
    formFactor: "4U",
    sockets: 2,
    maxCoresPerCpu: 192,
    maxDimms: 32,
    maxRamGB: 12288,
    maxDrives: 32,
    supportedDriveTypes: ["SAS", "SATA", "NVMe"],
    maxGpus: 12,
    minPsuWatt: 2000,
    nicMaxGbE: 100,
  },
};

const modelCpuRules = {
  "R5300-G4": { vendors: ["Intel"], families: ["intel-4th"] },
  "R5300-G4X": { vendors: ["Intel"], families: ["intel-4th"] },
  "R5500-G4X": { vendors: ["Intel"], families: ["intel-4th"] },
  "R5200-G5": { vendors: ["Intel"], families: ["intel-4th", "intel-5th"] },
  "R5250-G5": { vendors: ["Intel"], families: ["intel-4th", "intel-5th"] },
  "R5300-G5": { vendors: ["Intel"], families: ["intel-4th", "intel-5th"] },
  "R5500-G5": { vendors: ["Intel"], families: ["intel-4th", "intel-5th"] },
  "R6500-G5": { vendors: ["Intel"], families: ["intel-4th", "intel-5th"] },
  "R8500-G5": { vendors: ["Intel"], families: ["intel-4th", "intel-5th"] },
  "R5300-G6": { vendors: ["Intel"], families: ["intel-5th", "intel-6th"] },
  "R5350-G6": { vendors: ["AMD"], families: ["amd-9004", "amd-9005"] },
};

const modelDefaultProfiles = {
  "R2350-G6": { cpuVendor: "AMD", cpuCount: 2, coresPerCpu: 24, ramDimms: 16, ramPerDimm: 32, driveCount: 8, driveType: "NVMe", raid: "10", gpuCount: 0, psuWatt: 1600, psuCount: 2, nicSpeed: 25, preferredCpuContains: ["9255", "9224"] },
  "R5300-G5": { cpuVendor: "Intel", cpuCount: 2, coresPerCpu: 32, ramDimms: 24, ramPerDimm: 32, driveCount: 12, driveType: "SAS", raid: "10", gpuCount: 0, psuWatt: 2000, psuCount: 2, nicSpeed: 25, preferredCpuContains: ["6530", "6430"] },
  "R5300-G6": { cpuVendor: "Intel", cpuCount: 2, coresPerCpu: 32, ramDimms: 24, ramPerDimm: 32, driveCount: 12, driveType: "NVMe", raid: "10", gpuCount: 0, psuWatt: 1600, psuCount: 2, nicSpeed: 25, preferredCpuContains: ["6530", "6731P"] },
  "R5350-G6": { cpuVendor: "AMD", cpuCount: 2, coresPerCpu: 24, ramDimms: 24, ramPerDimm: 32, driveCount: 12, driveType: "NVMe", raid: "10", gpuCount: 0, psuWatt: 1600, psuCount: 2, nicSpeed: 25, preferredCpuContains: ["9255", "9254"] },
};

function cpuId(family, name) {
  return `${family}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

function toCpu([name, vendor, family, microArch, cores, tdp, maxSockets = 2]) {
  return { id: cpuId(family, name), name, vendor, family, microArch, cores, tdp, maxSockets };
}

const cpuCatalog = [
  // AMD EPYC 9004 (Genoa/Bergamo)
  ["AMD EPYC 9124", "AMD", "amd-9004", "Genoa", 16, 200],
  ["AMD EPYC 9174F", "AMD", "amd-9004", "Genoa", 16, 320],
  ["AMD EPYC 9184X", "AMD", "amd-9004", "Genoa-X", 16, 320],
  ["AMD EPYC 9224", "AMD", "amd-9004", "Genoa", 24, 200],
  ["AMD EPYC 9254", "AMD", "amd-9004", "Genoa", 24, 200],
  ["AMD EPYC 9274F", "AMD", "amd-9004", "Genoa", 24, 320],
  ["AMD EPYC 9334", "AMD", "amd-9004", "Genoa", 32, 210],
  ["AMD EPYC 9354", "AMD", "amd-9004", "Genoa", 32, 280],
  ["AMD EPYC 9374F", "AMD", "amd-9004", "Genoa", 32, 320],
  ["AMD EPYC 9384X", "AMD", "amd-9004", "Genoa-X", 32, 320],
  ["AMD EPYC 9454", "AMD", "amd-9004", "Genoa", 48, 290],
  ["AMD EPYC 9474F", "AMD", "amd-9004", "Genoa", 48, 360],
  ["AMD EPYC 9534", "AMD", "amd-9004", "Genoa", 64, 280],
  ["AMD EPYC 9554", "AMD", "amd-9004", "Genoa", 64, 360],
  ["AMD EPYC 9634", "AMD", "amd-9004", "Genoa", 84, 290],
  ["AMD EPYC 9654", "AMD", "amd-9004", "Genoa", 96, 360],
  ["AMD EPYC 9684X", "AMD", "amd-9004", "Genoa-X", 96, 400],
  ["AMD EPYC 9734", "AMD", "amd-9004", "Bergamo", 112, 340],
  ["AMD EPYC 9754", "AMD", "amd-9004", "Bergamo", 128, 360],
  // 1P-only variants (same generation, single-socket constraint)
  ["AMD EPYC 9124P", "AMD", "amd-9004", "Genoa", 16, 200, 1],
  ["AMD EPYC 9254P", "AMD", "amd-9004", "Genoa", 24, 200, 1],
  ["AMD EPYC 9354P", "AMD", "amd-9004", "Genoa", 32, 280, 1],
  ["AMD EPYC 9454P", "AMD", "amd-9004", "Genoa", 48, 290, 1],
  ["AMD EPYC 9554P", "AMD", "amd-9004", "Genoa", 64, 360, 1],
  ["AMD EPYC 9654P", "AMD", "amd-9004", "Genoa", 96, 360, 1],

  // AMD EPYC 9005 (Turin)
  ["AMD EPYC 9125", "AMD", "amd-9005", "Turin", 8, 125],
  ["AMD EPYC 9135", "AMD", "amd-9005", "Turin", 16, 200],
  ["AMD EPYC 9175F", "AMD", "amd-9005", "Turin", 16, 320],
  ["AMD EPYC 9255", "AMD", "amd-9005", "Turin", 24, 200],
  ["AMD EPYC 9275F", "AMD", "amd-9005", "Turin", 24, 320],
  ["AMD EPYC 9335", "AMD", "amd-9005", "Turin", 32, 210],
  ["AMD EPYC 9355", "AMD", "amd-9005", "Turin", 32, 280],
  ["AMD EPYC 9455", "AMD", "amd-9005", "Turin", 48, 300],
  ["AMD EPYC 9475F", "AMD", "amd-9005", "Turin", 48, 360],
  ["AMD EPYC 9535", "AMD", "amd-9005", "Turin", 64, 300],
  ["AMD EPYC 9555", "AMD", "amd-9005", "Turin", 64, 360],
  ["AMD EPYC 9565", "AMD", "amd-9005", "Turin", 72, 400],
  ["AMD EPYC 9575F", "AMD", "amd-9005", "Turin", 64, 400],
  ["AMD EPYC 9655", "AMD", "amd-9005", "Turin", 96, 400],
  ["AMD EPYC 9745", "AMD", "amd-9005", "Turin", 128, 400],
  ["AMD EPYC 9755", "AMD", "amd-9005", "Turin", 128, 500],
  ["AMD EPYC 9825", "AMD", "amd-9005", "Turin", 144, 390],
  ["AMD EPYC 9845", "AMD", "amd-9005", "Turin", 160, 390],
  ["AMD EPYC 9965", "AMD", "amd-9005", "Turin", 192, 500],
  ["AMD EPYC 9755S", "AMD", "amd-9005", "Turin", 128, 500],
  ["AMD EPYC 9845X", "AMD", "amd-9005", "Turin-X", 160, 390],
  ["AMD EPYC 9965X", "AMD", "amd-9005", "Turin-X", 192, 500],
  ["AMD EPYC 9135P", "AMD", "amd-9005", "Turin", 16, 200, 1],
  ["AMD EPYC 9255P", "AMD", "amd-9005", "Turin", 24, 200, 1],
  ["AMD EPYC 9355P", "AMD", "amd-9005", "Turin", 32, 280, 1],
  ["AMD EPYC 9455P", "AMD", "amd-9005", "Turin", 48, 300, 1],
  ["AMD EPYC 9555P", "AMD", "amd-9005", "Turin", 64, 360, 1],
  ["AMD EPYC 9655P", "AMD", "amd-9005", "Turin", 96, 400, 1],
  ["AMD EPYC 9745P", "AMD", "amd-9005", "Turin", 128, 400, 1],
  ["AMD EPYC 9845P", "AMD", "amd-9005", "Turin", 160, 390, 1],
  ["AMD EPYC 9965P", "AMD", "amd-9005", "Turin", 192, 500, 1],

  // Intel Xeon 4th Gen (Sapphire Rapids)
  ["Intel Xeon Bronze 3408U", "Intel", "intel-4th", "Sapphire Rapids", 8, 125],
  ["Intel Xeon Silver 4410Y", "Intel", "intel-4th", "Sapphire Rapids", 12, 150],
  ["Intel Xeon Silver 4410T", "Intel", "intel-4th", "Sapphire Rapids", 10, 150],
  ["Intel Xeon Silver 4509Y", "Intel", "intel-4th", "Sapphire Rapids", 8, 125],
  ["Intel Xeon Silver 4509Y+", "Intel", "intel-4th", "Sapphire Rapids", 8, 125],
  ["Intel Xeon Silver 4510", "Intel", "intel-4th", "Sapphire Rapids", 12, 150],
  ["Intel Xeon Silver 4514Y", "Intel", "intel-4th", "Sapphire Rapids", 16, 150],
  ["Intel Xeon Gold 5415+", "Intel", "intel-4th", "Sapphire Rapids", 8, 150],
  ["Intel Xeon Gold 5416S", "Intel", "intel-4th", "Sapphire Rapids", 16, 150],
  ["Intel Xeon Gold 5411N", "Intel", "intel-4th", "Sapphire Rapids", 24, 165],
  ["Intel Xeon Gold 5418N", "Intel", "intel-4th", "Sapphire Rapids", 24, 165],
  ["Intel Xeon Gold 5418Y", "Intel", "intel-4th", "Sapphire Rapids", 24, 185],
  ["Intel Xeon Gold 5420+", "Intel", "intel-4th", "Sapphire Rapids", 28, 205],
  ["Intel Xeon Gold 5423N", "Intel", "intel-4th", "Sapphire Rapids", 20, 165],
  ["Intel Xeon Gold 5430", "Intel", "intel-4th", "Sapphire Rapids", 32, 210],
  ["Intel Xeon Gold 6414U", "Intel", "intel-4th", "Sapphire Rapids", 32, 250],
  ["Intel Xeon Gold 6416H", "Intel", "intel-4th", "Sapphire Rapids", 18, 165],
  ["Intel Xeon Gold 6418U", "Intel", "intel-4th", "Sapphire Rapids", 32, 185],
  ["Intel Xeon Gold 6421N", "Intel", "intel-4th", "Sapphire Rapids", 32, 185],
  ["Intel Xeon Gold 6430", "Intel", "intel-4th", "Sapphire Rapids", 32, 270],
  ["Intel Xeon Gold 6430N", "Intel", "intel-4th", "Sapphire Rapids", 32, 205],
  ["Intel Xeon Gold 6430L", "Intel", "intel-4th", "Sapphire Rapids", 32, 250],
  ["Intel Xeon Gold 6434", "Intel", "intel-4th", "Sapphire Rapids", 8, 195],
  ["Intel Xeon Gold 6438M", "Intel", "intel-4th", "Sapphire Rapids", 32, 205],
  ["Intel Xeon Gold 6438N", "Intel", "intel-4th", "Sapphire Rapids", 32, 205],
  ["Intel Xeon Gold 6438Y+", "Intel", "intel-4th", "Sapphire Rapids", 32, 205],
  ["Intel Xeon Gold 6442Y", "Intel", "intel-4th", "Sapphire Rapids", 24, 225],
  ["Intel Xeon Gold 6444Y", "Intel", "intel-4th", "Sapphire Rapids", 16, 270],
  ["Intel Xeon Gold 6448H", "Intel", "intel-4th", "Sapphire Rapids", 32, 250],
  ["Intel Xeon Gold 6448Y", "Intel", "intel-4th", "Sapphire Rapids", 32, 225],
  ["Intel Xeon Gold 6454S", "Intel", "intel-4th", "Sapphire Rapids", 32, 270],
  ["Intel Xeon Gold 6458Q", "Intel", "intel-4th", "Sapphire Rapids", 32, 300],
  ["Intel Xeon Gold 6458QN", "Intel", "intel-4th", "Sapphire Rapids", 32, 300],
  ["Intel Xeon Gold 6458P", "Intel", "intel-4th", "Sapphire Rapids", 44, 350],
  ["Intel Xeon Platinum 8461V", "Intel", "intel-4th", "Sapphire Rapids", 32, 300],
  ["Intel Xeon Platinum 8462Y+", "Intel", "intel-4th", "Sapphire Rapids", 32, 300],
  ["Intel Xeon Platinum 8468", "Intel", "intel-4th", "Sapphire Rapids", 48, 350],
  ["Intel Xeon Platinum 8468H", "Intel", "intel-4th", "Sapphire Rapids", 48, 330],
  ["Intel Xeon Platinum 8470", "Intel", "intel-4th", "Sapphire Rapids", 52, 350],
  ["Intel Xeon Platinum 8480+", "Intel", "intel-4th", "Sapphire Rapids", 56, 350],
  ["Intel Xeon Platinum 8481C", "Intel", "intel-4th", "Sapphire Rapids", 56, 350],
  ["Intel Xeon Platinum 8490H", "Intel", "intel-4th", "Sapphire Rapids", 60, 350],
  ["Intel Xeon Max 9462", "Intel", "intel-4th", "Sapphire Rapids", 32, 350],
  ["Intel Xeon Max 9468", "Intel", "intel-4th", "Sapphire Rapids", 48, 350],
  ["Intel Xeon Max 9470", "Intel", "intel-4th", "Sapphire Rapids", 52, 350],
  ["Intel Xeon Max 9480", "Intel", "intel-4th", "Sapphire Rapids", 56, 350],
  ["Intel Xeon Max 9480+", "Intel", "intel-4th", "Sapphire Rapids", 56, 350],
  ["Intel Xeon Max 9480N", "Intel", "intel-4th", "Sapphire Rapids", 56, 350],
  ["Intel Xeon Max 9490", "Intel", "intel-4th", "Sapphire Rapids", 60, 350],
  ["Intel Xeon Max 9490H", "Intel", "intel-4th", "Sapphire Rapids", 60, 350],
  ["Intel Xeon Max 9490N", "Intel", "intel-4th", "Sapphire Rapids", 60, 350],

  // Intel Xeon 5th Gen (Emerald Rapids)
  ["Intel Xeon 4510", "Intel", "intel-5th", "Emerald Rapids", 12, 150],
  ["Intel Xeon Gold 5512U", "Intel", "intel-5th", "Emerald Rapids", 28, 185],
  ["Intel Xeon Gold 5515+", "Intel", "intel-5th", "Emerald Rapids", 8, 165],
  ["Intel Xeon Gold 6511", "Intel", "intel-5th", "Emerald Rapids", 10, 165],
  ["Intel Xeon Gold 6515+", "Intel", "intel-5th", "Emerald Rapids", 8, 150],
  ["Intel Xeon Gold 6526Y", "Intel", "intel-5th", "Emerald Rapids", 16, 195],
  ["Intel Xeon Gold 6530", "Intel", "intel-5th", "Emerald Rapids", 32, 270],
  ["Intel Xeon Gold 6538N", "Intel", "intel-5th", "Emerald Rapids", 32, 205],
  ["Intel Xeon Gold 6542Y", "Intel", "intel-5th", "Emerald Rapids", 24, 250],
  ["Intel Xeon Gold 6544Y", "Intel", "intel-5th", "Emerald Rapids", 16, 270],
  ["Intel Xeon Gold 6548Y+", "Intel", "intel-5th", "Emerald Rapids", 32, 250],
  ["Intel Xeon Gold 6554S", "Intel", "intel-5th", "Emerald Rapids", 36, 270],
  ["Intel Xeon Gold 6558N", "Intel", "intel-5th", "Emerald Rapids", 32, 300],
  ["Intel Xeon Gold 6558P", "Intel", "intel-5th", "Emerald Rapids", 44, 350],
  ["Intel Xeon Gold 6558Q", "Intel", "intel-5th", "Emerald Rapids", 32, 300],
  ["Intel Xeon Gold 6560Y+", "Intel", "intel-5th", "Emerald Rapids", 48, 300],
  ["Intel Xeon Gold 6564H", "Intel", "intel-5th", "Emerald Rapids", 16, 195],
  ["Intel Xeon Gold 6568Y+", "Intel", "intel-5th", "Emerald Rapids", 48, 300],
  ["Intel Xeon Platinum 6570", "Intel", "intel-5th", "Emerald Rapids", 56, 350],
  ["Intel Xeon Platinum 6572", "Intel", "intel-5th", "Emerald Rapids", 56, 350],
  ["Intel Xeon Platinum 8538", "Intel", "intel-5th", "Emerald Rapids", 32, 250],
  ["Intel Xeon Platinum 8558U", "Intel", "intel-5th", "Emerald Rapids", 48, 330],
  ["Intel Xeon Platinum 8562Y+", "Intel", "intel-5th", "Emerald Rapids", 32, 300],
  ["Intel Xeon Platinum 8592+", "Intel", "intel-5th", "Emerald Rapids", 64, 350],
  ["Intel Xeon Platinum 8592CL", "Intel", "intel-5th", "Emerald Rapids", 64, 350],
  ["Intel Xeon Platinum 8592H", "Intel", "intel-5th", "Emerald Rapids", 64, 385],
  ["Intel Xeon Platinum 8592L", "Intel", "intel-5th", "Emerald Rapids", 64, 350],
  ["Intel Xeon Platinum 8592N", "Intel", "intel-5th", "Emerald Rapids", 64, 350],
  ["Intel Xeon Platinum 8592V", "Intel", "intel-5th", "Emerald Rapids", 64, 350],
  ["Intel Xeon Platinum 8593Q", "Intel", "intel-5th", "Emerald Rapids", 64, 385],
  ["Intel Xeon Platinum 8593Q+", "Intel", "intel-5th", "Emerald Rapids", 64, 385],
  ["Intel Xeon Platinum 8593QN", "Intel", "intel-5th", "Emerald Rapids", 64, 385],

  // Intel Xeon 6 (P-cores + E-cores)
  ["Intel Xeon 6 6315P", "Intel", "intel-6th", "Xeon 6 P-core", 8, 95],
  ["Intel Xeon 6 6333P", "Intel", "intel-6th", "Xeon 6 P-core", 6, 70],
  ["Intel Xeon 6 6345P", "Intel", "intel-6th", "Xeon 6 P-core", 16, 120],
  ["Intel Xeon 6 6349P", "Intel", "intel-6th", "Xeon 6 P-core", 24, 205],
  ["Intel Xeon 6 6353P", "Intel", "intel-6th", "Xeon 6 P-core", 8, 95],
  ["Intel Xeon 6 6362P", "Intel", "intel-6th", "Xeon 6 P-core", 14, 115],
  ["Intel Xeon 6 6368P", "Intel", "intel-6th", "Xeon 6 P-core", 24, 170],
  ["Intel Xeon 6 6369P", "Intel", "intel-6th", "Xeon 6 P-core", 32, 205],
  ["Intel Xeon 6 6700P 6710P", "Intel", "intel-6th", "Xeon 6 P-core", 8, 95],
  ["Intel Xeon 6 6700P 6711P", "Intel", "intel-6th", "Xeon 6 P-core", 10, 95],
  ["Intel Xeon 6 6700P 6716P", "Intel", "intel-6th", "Xeon 6 P-core", 16, 150],
  ["Intel Xeon 6 6700P 6718P", "Intel", "intel-6th", "Xeon 6 P-core", 8, 95],
  ["Intel Xeon 6 6700P 6722P", "Intel", "intel-6th", "Xeon 6 P-core", 16, 140],
  ["Intel Xeon 6 6700P 6725P", "Intel", "intel-6th", "Xeon 6 P-core", 16, 170],
  ["Intel Xeon 6 6700P 6726P", "Intel", "intel-6th", "Xeon 6 P-core", 24, 170],
  ["Intel Xeon 6 6700P 6727P", "Intel", "intel-6th", "Xeon 6 P-core", 16, 170],
  ["Intel Xeon 6 6700P 6728P-B", "Intel", "intel-6th", "Xeon 6 P-core", 24, 170],
  ["Intel Xeon 6 6700P 6729P", "Intel", "intel-6th", "Xeon 6 P-core", 16, 170],
  ["Intel Xeon 6 6700P 6730P-B", "Intel", "intel-6th", "Xeon 6 P-core", 32, 205],
  ["Intel Xeon 6 6700P 6731P", "Intel", "intel-6th", "Xeon 6 P-core", 32, 205],
  ["Intel Xeon 6 6700P 6733P", "Intel", "intel-6th", "Xeon 6 P-core", 24, 205],
  ["Intel Xeon 6 6700P 6735P", "Intel", "intel-6th", "Xeon 6 P-core", 24, 205],
  ["Intel Xeon 6 6700P 6736P", "Intel", "intel-6th", "Xeon 6 P-core", 36, 250],
  ["Intel Xeon 6 6700P 6737P", "Intel", "intel-6th", "Xeon 6 P-core", 24, 205],
  ["Intel Xeon 6 6700P 6738P", "Intel", "intel-6th", "Xeon 6 P-core", 32, 250],
  ["Intel Xeon 6 6700P 6740P", "Intel", "intel-6th", "Xeon 6 P-core", 40, 270],
  ["Intel Xeon 6 6700P 6741P", "Intel", "intel-6th", "Xeon 6 P-core", 32, 250],
  ["Intel Xeon 6 6700P 6745P", "Intel", "intel-6th", "Xeon 6 P-core", 32, 250],
  ["Intel Xeon 6 6700P 6746P", "Intel", "intel-6th", "Xeon 6 P-core", 40, 270],
  ["Intel Xeon 6 6700P 6747P", "Intel", "intel-6th", "Xeon 6 P-core", 32, 250],
  ["Intel Xeon 6 6700P 6755P", "Intel", "intel-6th", "Xeon 6 P-core", 52, 330],
  ["Intel Xeon 6 6700P 6756P", "Intel", "intel-6th", "Xeon 6 P-core", 48, 330],
  ["Intel Xeon 6 6700P 6756P-B", "Intel", "intel-6th", "Xeon 6 P-core", 48, 330],
  ["Intel Xeon 6 6700P 6760P", "Intel", "intel-6th", "Xeon 6 P-core", 48, 330],
  ["Intel Xeon 6 6700P 6761P", "Intel", "intel-6th", "Xeon 6 P-core", 48, 330],
  ["Intel Xeon 6 6700P 6765P", "Intel", "intel-6th", "Xeon 6 P-core", 64, 350],
  ["Intel Xeon 6 6700P 6766P", "Intel", "intel-6th", "Xeon 6 P-core", 64, 350],
  ["Intel Xeon 6 6700P 6767P", "Intel", "intel-6th", "Xeon 6 P-core", 64, 350],
  ["Intel Xeon 6 6700P 6767P-B", "Intel", "intel-6th", "Xeon 6 P-core", 64, 350],
  ["Intel Xeon 6 6700P 6768P", "Intel", "intel-6th", "Xeon 6 P-core", 72, 330],
  ["Intel Xeon 6 6700P 6780P", "Intel", "intel-6th", "Xeon 6 P-core", 86, 350],
  ["Intel Xeon 6 6700P 6781P", "Intel", "intel-6th", "Xeon 6 P-core", 80, 350],
  ["Intel Xeon 6 6700P 6786P", "Intel", "intel-6th", "Xeon 6 P-core", 86, 350],
  ["Intel Xeon 6 6700P 6787P", "Intel", "intel-6th", "Xeon 6 P-core", 86, 350],
  ["Intel Xeon 6 6700P 6788P-B", "Intel", "intel-6th", "Xeon 6 P-core", 86, 350],
  ["Intel Xeon 6 6700E 6705E", "Intel", "intel-6th", "Xeon 6 E-core", 8, 65],
  ["Intel Xeon 6 6700E 6706E", "Intel", "intel-6th", "Xeon 6 E-core", 8, 65],
  ["Intel Xeon 6 6700E 6707E", "Intel", "intel-6th", "Xeon 6 E-core", 8, 65],
  ["Intel Xeon 6 6700E 6710E", "Intel", "intel-6th", "Xeon 6 E-core", 16, 150],
  ["Intel Xeon 6 6700E 6711E", "Intel", "intel-6th", "Xeon 6 E-core", 16, 100],
  ["Intel Xeon 6 6700E 6712E", "Intel", "intel-6th", "Xeon 6 E-core", 16, 100],
  ["Intel Xeon 6 6700E 6717E", "Intel", "intel-6th", "Xeon 6 E-core", 24, 120],
  ["Intel Xeon 6 6700E 6720E", "Intel", "intel-6th", "Xeon 6 E-core", 32, 160],
  ["Intel Xeon 6 6700E 6726E", "Intel", "intel-6th", "Xeon 6 E-core", 32, 150],
  ["Intel Xeon 6 6700E 6727E", "Intel", "intel-6th", "Xeon 6 E-core", 40, 160],
  ["Intel Xeon 6 6700E 6730E", "Intel", "intel-6th", "Xeon 6 E-core", 48, 200],
  ["Intel Xeon 6 6700E 6731E", "Intel", "intel-6th", "Xeon 6 E-core", 40, 170],
  ["Intel Xeon 6 6700E 6732E", "Intel", "intel-6th", "Xeon 6 E-core", 40, 170],
  ["Intel Xeon 6 6700E 6736E", "Intel", "intel-6th", "Xeon 6 E-core", 48, 200],
  ["Intel Xeon 6 6700E 6737E", "Intel", "intel-6th", "Xeon 6 E-core", 56, 200],
  ["Intel Xeon 6 6700E 6740E", "Intel", "intel-6th", "Xeon 6 E-core", 64, 250],
  ["Intel Xeon 6 6700E 6741E", "Intel", "intel-6th", "Xeon 6 E-core", 52, 200],
  ["Intel Xeon 6 6700E 6742E", "Intel", "intel-6th", "Xeon 6 E-core", 56, 200],
  ["Intel Xeon 6 6700E 6746E", "Intel", "intel-6th", "Xeon 6 E-core", 64, 250],
  ["Intel Xeon 6 6700E 6747E", "Intel", "intel-6th", "Xeon 6 E-core", 72, 250],
  ["Intel Xeon 6 6700E 6748E", "Intel", "intel-6th", "Xeon 6 E-core", 86, 250],
  ["Intel Xeon 6 6700E 6760E", "Intel", "intel-6th", "Xeon 6 E-core", 96, 300],
  ["Intel Xeon 6 6700E 6761E", "Intel", "intel-6th", "Xeon 6 E-core", 96, 250],
  ["Intel Xeon 6 6700E 6762E", "Intel", "intel-6th", "Xeon 6 E-core", 88, 250],
  ["Intel Xeon 6 6700E 6765E", "Intel", "intel-6th", "Xeon 6 E-core", 96, 250],
  ["Intel Xeon 6 6700E 6766E", "Intel", "intel-6th", "Xeon 6 E-core", 120, 300],
  ["Intel Xeon 6 6700E 6767E", "Intel", "intel-6th", "Xeon 6 E-core", 104, 250],
  ["Intel Xeon 6 6700E 6768E", "Intel", "intel-6th", "Xeon 6 E-core", 112, 300],
  ["Intel Xeon 6 6700E 6780E", "Intel", "intel-6th", "Xeon 6 E-core", 144, 330],
  ["Intel Xeon 6 6700E 6781E", "Intel", "intel-6th", "Xeon 6 E-core", 128, 330],
  ["Intel Xeon 6 6700E 6786E", "Intel", "intel-6th", "Xeon 6 E-core", 96, 330],
  ["Intel Xeon 6 6700E 6787E", "Intel", "intel-6th", "Xeon 6 E-core", 136, 330],
  ["Intel Xeon 6 6900P 6912P", "Intel", "intel-6th", "Xeon 6 P-core", 72, 350],
  ["Intel Xeon 6 6900P 6952P", "Intel", "intel-6th", "Xeon 6 P-core", 96, 400],
  ["Intel Xeon 6 6900P 6954P", "Intel", "intel-6th", "Xeon 6 P-core", 86, 500],
  ["Intel Xeon 6 6900P 6957P", "Intel", "intel-6th", "Xeon 6 P-core", 128, 500],
  ["Intel Xeon 6 6900P 6958P", "Intel", "intel-6th", "Xeon 6 P-core", 128, 500],
  ["Intel Xeon 6 6900P 6972P", "Intel", "intel-6th", "Xeon 6 P-core", 96, 500],
  ["Intel Xeon 6 6900P 6979P", "Intel", "intel-6th", "Xeon 6 P-core", 144, 500],
  ["Intel Xeon 6 6900P 6980P", "Intel", "intel-6th", "Xeon 6 P-core", 128, 500],
].map(toCpu);

const defaultConfig = {
  cpuVendor: "AMD",
  cpuCount: 2,
  cpuModel: "",
  coresPerCpu: 24,
  cpuTdp: 200,
  ramDimms: 16,
  ramPerDimm: 32,
  driveCount: 8,
  driveType: "SAS",
  raid: "10",
  gpuCount: 0,
  psuWatt: 1200,
  psuCount: 2,
  nicSpeed: 25,
};

const workloadHints = {
  general: "Ausgewogen fuer Virtualisierung und klassische Enterprise-Workloads.",
  database: "Fokus auf hohe RAM-Kapazitaet, CPU-Performance und IOPS.",
  storage: "Fokus auf Laufwerksdichte, Datensicherheit und Durchsatz.",
  ai: "Fokus auf GPU-Dichte, PCIe-Bandbreite und schnelles Netzwerk.",
  edge: "Fokus auf kompakte, energieeffiziente und robuste Deployments.",
};

const el = {
  model: document.getElementById("model"),
  workload: document.getElementById("workload"),
  cpuVendor: document.getElementById("cpuVendor"),
  cpuModel: document.getElementById("cpuModel"),
  cpuCount: document.getElementById("cpuCount"),
  coresPerCpu: document.getElementById("coresPerCpu"),
  cpuTdp: document.getElementById("cpuTdp"),
  ramDimms: document.getElementById("ramDimms"),
  ramPerDimm: document.getElementById("ramPerDimm"),
  driveCount: document.getElementById("driveCount"),
  driveType: document.getElementById("driveType"),
  raid: document.getElementById("raid"),
  gpuCount: document.getElementById("gpuCount"),
  psuWatt: document.getElementById("psuWatt"),
  psuCount: document.getElementById("psuCount"),
  nicSpeed: document.getElementById("nicSpeed"),
  summary: document.getElementById("summary"),
  checks: document.getElementById("checks"),
  modelBadge: document.getElementById("modelBadge"),
  applyDefaultBtn: document.getElementById("applyDefaultBtn"),
};

function getModelGeneration(modelName) {
  const match = /-G(\d+)/.exec(modelName);
  return match ? Number(match[1]) : 0;
}

function allowedCpuFamiliesForModel(modelName) {
  if (modelCpuRules[modelName]?.families) return modelCpuRules[modelName].families;
  const gen = getModelGeneration(modelName);
  if (gen >= 6) return ["amd-9004", "amd-9005", "intel-4th", "intel-5th", "intel-6th"];
  if (gen === 5) return ["amd-9004", "intel-4th", "intel-5th"];
  if (gen === 4) return ["intel-4th"];
  return ["intel-4th", "amd-9004"];
}

function allowedCpuVendorsForModel(modelName) {
  if (modelCpuRules[modelName]?.vendors) return modelCpuRules[modelName].vendors;
  const families = allowedCpuFamiliesForModel(modelName);
  const vendors = [];
  if (families.some((family) => family.startsWith("amd-"))) vendors.push("AMD");
  if (families.some((family) => family.startsWith("intel-"))) vendors.push("Intel");
  return vendors;
}

function syncCpuVendorForModel() {
  const modelName = el.model.value;
  const allowedVendors = allowedCpuVendorsForModel(modelName);
  const currentVendor = el.cpuVendor.value;

  [...el.cpuVendor.options].forEach((option) => {
    option.disabled = !allowedVendors.includes(option.value);
  });

  if (!allowedVendors.includes(currentVendor)) {
    el.cpuVendor.value = allowedVendors[0] || "AMD";
  }
}

function getRecommendedProfile(modelName) {
  if (modelDefaultProfiles[modelName]) return modelDefaultProfiles[modelName];
  const model = models[modelName];
  if (!model) return defaultConfig;
  return {
    cpuVendor: allowedCpuVendorsForModel(modelName)[0] || "AMD",
    cpuCount: Math.min(2, model.sockets),
    coresPerCpu: Math.min(24, model.maxCoresPerCpu),
    ramDimms: Math.min(16, model.maxDimms),
    ramPerDimm: 32,
    driveCount: Math.min(8, model.maxDrives),
    driveType: "SAS",
    raid: "10",
    gpuCount: 0,
    psuWatt: Math.max(1200, model.minPsuWatt),
    psuCount: model.sockets > 1 ? 2 : 1,
    nicSpeed: Math.min(25, model.nicMaxGbE),
    preferredCpuContains: [],
  };
}

function choosePreferredCpu(profile) {
  const candidates = getCpuCandidates(getConfig());
  if (!candidates.length) return;
  const hit = candidates.find((cpu) =>
    profile.preferredCpuContains?.some((needle) => cpu.name.includes(needle)),
  );
  el.cpuModel.value = hit ? hit.id : candidates[0].id;
}

function applyRecommendedConfig() {
  const modelName = el.model.value;
  const model = models[modelName];
  if (!model) return;
  const profile = getRecommendedProfile(modelName);

  setValues({
    ...defaultConfig,
    ...profile,
    cpuCount: Math.max(1, Math.min(profile.cpuCount, model.sockets)),
    coresPerCpu: Math.max(8, Math.min(profile.coresPerCpu, model.maxCoresPerCpu)),
    ramDimms: Math.max(2, Math.min(profile.ramDimms, model.maxDimms)),
    driveCount: Math.max(0, Math.min(profile.driveCount, model.maxDrives)),
    gpuCount: Math.max(0, Math.min(profile.gpuCount, model.maxGpus)),
    nicSpeed: Math.min(profile.nicSpeed, model.nicMaxGbE),
    psuWatt: Math.max(profile.psuWatt, model.minPsuWatt),
  });

  syncCpuVendorForModel();
  refillCpuModels(false);
  choosePreferredCpu(profile);
  syncCpuDetailsFromModel();
  render();
}

function fillModelOptions() {
  Object.keys(models).forEach((name) => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    el.model.appendChild(opt);
  });
}

function setValues(config) {
  Object.entries(config).forEach(([key, val]) => {
    if (!el[key]) return;
    el[key].value = String(val);
  });
}

function getConfig() {
  return {
    modelName: el.model.value,
    workload: el.workload.value,
    cpuVendor: el.cpuVendor.value,
    cpuModel: el.cpuModel.value,
    cpuCount: Number(el.cpuCount.value),
    coresPerCpu: Number(el.coresPerCpu.value),
    cpuTdp: Number(el.cpuTdp.value),
    ramDimms: Number(el.ramDimms.value),
    ramPerDimm: Number(el.ramPerDimm.value),
    driveCount: Number(el.driveCount.value),
    driveType: el.driveType.value,
    raid: el.raid.value,
    gpuCount: Number(el.gpuCount.value),
    psuWatt: Number(el.psuWatt.value),
    psuCount: Number(el.psuCount.value),
    nicSpeed: Number(el.nicSpeed.value),
  };
}

function getCpuById(id) {
  return cpuCatalog.find((cpu) => cpu.id === id) || null;
}

function getCpuCandidates(config) {
  const allowedFamilies = allowedCpuFamiliesForModel(config.modelName);
  const allowedVendors = allowedCpuVendorsForModel(config.modelName);
  return cpuCatalog
    .filter((cpu) => allowedVendors.includes(cpu.vendor))
    .filter((cpu) => cpu.vendor === config.cpuVendor)
    .filter((cpu) => allowedFamilies.includes(cpu.family))
    .filter((cpu) => config.cpuCount <= cpu.maxSockets)
    .filter((cpu) => cpu.cores === config.coresPerCpu)
    .sort((a, b) => a.tdp - b.tdp || a.name.localeCompare(b.name));
}

function refillCpuModels(preserve = true) {
  const c = getConfig();
  const candidates = getCpuCandidates(c);
  const previous = el.cpuModel.value;

  el.cpuModel.innerHTML = "";

  if (!candidates.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Keine kompatible CPU fuer diese Auswahl";
    el.cpuModel.appendChild(option);
    el.cpuModel.value = "";
    return;
  }

  candidates.forEach((cpu) => {
    const option = document.createElement("option");
    option.value = cpu.id;
    option.textContent = `${cpu.name} (${cpu.cores}C, ${cpu.tdp}W, ${cpu.microArch})`;
    el.cpuModel.appendChild(option);
  });

  if (preserve && candidates.some((cpu) => cpu.id === previous)) {
    el.cpuModel.value = previous;
  } else {
    el.cpuModel.value = candidates[0].id;
  }
}

function syncCpuDetailsFromModel() {
  const cpu = getCpuById(el.cpuModel.value);
  if (!cpu) return;
  el.coresPerCpu.value = String(cpu.cores);
  el.cpuTdp.value = String(cpu.tdp);
}

function estimatePower(c) {
  const cpuPower = c.cpuCount * c.cpuTdp;
  const ramPower = c.ramDimms * 8;
  const drivesPower = c.driveCount * (c.driveType === "NVMe" ? 14 : 10);
  const gpuPower = c.gpuCount * 300;
  const boardOverhead = 180;
  return cpuPower + ramPower + drivesPower + gpuPower + boardOverhead;
}

function validate(c, m) {
  const checks = [];
  const modelGen = getModelGeneration(c.modelName);
  const cpu = getCpuById(c.cpuModel);

  if (!cpu) {
    checks.push({ type: "err", text: "Keine kompatible CPU gefunden. Vendor/Kerne/Modell pruefen." });
  } else {
    checks.push({ type: "ok", text: `CPU-Modell gesetzt: ${cpu.name}.` });
    if (c.cpuCount > cpu.maxSockets) {
      checks.push({ type: "err", text: `${cpu.name} unterstuetzt maximal ${cpu.maxSockets} Sockel.` });
    } else {
      checks.push({ type: "ok", text: "CPU-Sockelanzahl passt zum gewaehlten Prozessor." });
    }

    if (modelGen === 5 && cpu.family === "amd-9005") {
      checks.push({ type: "err", text: "AMD Turin (EPYC 9005) ist fuer G5 gesperrt. Nutze EPYC 9004." });
    } else {
      checks.push({ type: "ok", text: "CPU-Generation passt zur Plattformgeneration." });
    }
  }

  if (c.cpuCount < 1 || c.cpuCount > m.sockets) {
    checks.push({ type: "err", text: `CPU-Anzahl ungueltig: ${m.sockets} Sockel verfuegbar.` });
  } else {
    checks.push({ type: "ok", text: "CPU-Anzahl passt zum Modell." });
  }

  if (c.coresPerCpu > m.maxCoresPerCpu) {
    checks.push({ type: "err", text: `Zu viele Kerne pro CPU fuer ${c.modelName}. Maximal ${m.maxCoresPerCpu}.` });
  } else {
    checks.push({ type: "ok", text: "Kernanzahl pro CPU ist plausibel." });
  }

  const ramTotal = c.ramDimms * c.ramPerDimm;
  if (c.ramDimms > m.maxDimms || ramTotal > m.maxRamGB) {
    checks.push({ type: "err", text: `RAM-Limit ueberschritten (max ${m.maxDimms} DIMMs / ${m.maxRamGB} GB).` });
  } else if (c.ramDimms % c.cpuCount !== 0) {
    checks.push({ type: "warn", text: "RAM-DIMMs sind nicht gleichmaessig auf CPUs verteilbar." });
  } else {
    checks.push({ type: "ok", text: "RAM-Ausbau ist innerhalb der Grenzen." });
  }

  if (c.driveCount > m.maxDrives) {
    checks.push({ type: "err", text: `Zu viele Laufwerke. Maximal ${m.maxDrives} fuer ${c.modelName}.` });
  } else if (!m.supportedDriveTypes.includes(c.driveType)) {
    checks.push({ type: "err", text: `${c.driveType} wird von ${c.modelName} nicht unterstuetzt.` });
  } else {
    checks.push({ type: "ok", text: "Drive-Typ und Anzahl sind modelkonform." });
  }

  if (c.raid !== "none") {
    const raidNeeds = { "1": 2, "5": 3, "6": 4, "10": 4 };
    if (c.driveCount < raidNeeds[c.raid]) {
      checks.push({ type: "err", text: `RAID ${c.raid} benoetigt mindestens ${raidNeeds[c.raid]} Laufwerke.` });
    } else if (c.raid === "10" && c.driveCount % 2 !== 0) {
      checks.push({ type: "err", text: "RAID 10 benoetigt eine gerade Anzahl Laufwerke." });
    } else {
      checks.push({ type: "ok", text: `RAID ${c.raid} ist technisch moeglich.` });
    }
  } else {
    checks.push({ type: "warn", text: "Kein RAID gewaehlt. Verfuegbarkeit ist reduziert." });
  }

  if (c.gpuCount > m.maxGpus) {
    checks.push({ type: "err", text: `GPU-Limit ueberschritten (max ${m.maxGpus}).` });
  } else if (c.gpuCount > 0 && c.nicSpeed < 25) {
    checks.push({ type: "warn", text: "GPU-Workload mit 10 GbE ist meist Flaschenhals." });
  } else {
    checks.push({ type: "ok", text: "GPU-Ausbau ist plausibel." });
  }

  if (c.nicSpeed > m.nicMaxGbE) {
    checks.push({ type: "err", text: `Netzwerk zu schnell fuer Modell (max ${m.nicMaxGbE} GbE).` });
  } else {
    checks.push({ type: "ok", text: "Netzwerkprofil ist kompatibel." });
  }

  const requiredPower = estimatePower(c);
  const usablePsuPower = c.psuCount === 2 ? c.psuWatt : c.psuWatt * 0.9;

  if (c.psuWatt < m.minPsuWatt && c.gpuCount > 0) {
    checks.push({ type: "err", text: `Netzteil fuer GPU-Konfiguration zu klein. Mindestens ${m.minPsuWatt}W.` });
  }

  if (requiredPower > usablePsuPower) {
    checks.push({ type: "err", text: `Leistungsbedarf ${requiredPower}W > verfuegbare Leistung ${usablePsuPower}W.` });
  } else {
    checks.push({ type: "ok", text: "Stromversorgung ist plausibel dimensioniert." });
  }

  if (c.workload === "ai" && c.gpuCount === 0) {
    checks.push({ type: "warn", text: "KI-Profil ohne GPU ausgewaehlt." });
  }

  if (c.workload === "storage" && c.driveCount < 12) {
    checks.push({ type: "warn", text: "Storage-Profil mit sehr wenigen Laufwerken." });
  }

  return checks;
}

function render() {
  const c = getConfig();
  const m = models[c.modelName];
  if (!m) return;

  const selectedCpu = getCpuById(c.cpuModel);
  const compatibleCpus = getCpuCandidates(c);
  const alternatives = compatibleCpus.filter((cpu) => cpu.id !== c.cpuModel).slice(0, 2);
  const allowedVendors = allowedCpuVendorsForModel(c.modelName);

  el.modelBadge.textContent = `${c.modelName} • ${m.formFactor} • ${m.sockets} Sockel`;

  const ramTotal = c.ramDimms * c.ramPerDimm;
  const power = estimatePower(c);

  const summaryItems = [
    `Einsatzzweck: ${workloadHints[c.workload]}`,
    `Rack-Hoehe: ${m.formFactor} (${m.formFactor.replace("U", "")} Hoeheneinheit${m.formFactor === "1U" ? "" : "en"})`,
    `Unterstuetzte CPU-Hersteller im Modell: ${allowedVendors.join(" / ")}`,
    `Kompatible CPU-Modelle fuer diese Filter: ${compatibleCpus.length}`,
    `CPU-Setup: ${c.cpuCount}x ${selectedCpu ? selectedCpu.name : "nicht gesetzt"}`,
    `CPU-Daten: ${c.coresPerCpu} Kerne pro CPU, ${c.cpuTdp}W TDP`,
    alternatives.length
      ? `Alternative kompatible CPUs: ${alternatives.map((cpu) => cpu.name).join(" | ")}`
      : "Alternative kompatible CPUs: keine weitere fuer diese Kernauswahl",
    `Gesamt-CPU-Cores: ${c.cpuCount * c.coresPerCpu}`,
    `Gesamt-RAM: ${ramTotal.toLocaleString("de-DE")} GB`,
    `Storage: ${c.driveCount}x ${c.driveType}`,
    `Geschaetzter Strombedarf: ${power} W`,
  ];

  el.summary.innerHTML = "";
  summaryItems.forEach((txt) => {
    const li = document.createElement("li");
    li.textContent = txt;
    el.summary.appendChild(li);
  });

  const checks = validate(c, m);
  el.checks.innerHTML = "";
  checks.forEach((item) => {
    const li = document.createElement("li");
    li.className = `check-${item.type}`;
    li.textContent = item.text;
    el.checks.appendChild(li);
  });
}

function onCpuFilterChanged() {
  refillCpuModels(true);
  syncCpuDetailsFromModel();
  render();
}

function onCpuModelChanged() {
  syncCpuDetailsFromModel();
  render();
}

function onModelChanged() {
  applyRecommendedConfig();
}

function bindEvents() {
  Object.values(el).forEach((node) => {
    if (!(node instanceof HTMLElement) || node.tagName === "UL" || node.id === "modelBadge") return;
    node.addEventListener("input", render);
    node.addEventListener("change", render);
  });

  el.model.addEventListener("change", onModelChanged);
  el.cpuVendor.addEventListener("change", onCpuFilterChanged);
  el.cpuCount.addEventListener("input", onCpuFilterChanged);
  el.cpuCount.addEventListener("change", onCpuFilterChanged);
  el.coresPerCpu.addEventListener("input", onCpuFilterChanged);
  el.coresPerCpu.addEventListener("change", onCpuFilterChanged);
  el.cpuModel.addEventListener("change", onCpuModelChanged);
  el.applyDefaultBtn.addEventListener("click", applyRecommendedConfig);
}

function init() {
  fillModelOptions();
  el.model.value = "R2350-G6";
  el.workload.value = "general";
  setValues(defaultConfig);
  applyRecommendedConfig();
  bindEvents();
}

init();
