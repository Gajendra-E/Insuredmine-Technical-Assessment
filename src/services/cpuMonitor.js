
const os = require("os");

const CPU_THRESHOLD = 70;
const CHECK_INTERVAL = 5000;

let previousCpuUsage = process.cpuUsage();
let previousTime = process.hrtime.bigint();

const getProcessCpuUsage = () => {
  const currentCpuUsage = process.cpuUsage(previousCpuUsage);
  const currentTime = process.hrtime.bigint();

  const elapsedMicroseconds =
    Number(currentTime - previousTime) / 1000;

  previousCpuUsage = process.cpuUsage();
  previousTime = currentTime;

  if (elapsedMicroseconds <= 0) {
    return 0;
  }

  const cpuMicroseconds =
    currentCpuUsage.user + currentCpuUsage.system;

  const cpuCount = os.cpus().length;

  const usage =
    (cpuMicroseconds / (elapsedMicroseconds * cpuCount)) * 100;

  return Number(Math.min(usage, 100).toFixed(2));
};

const startCpuMonitor = () => {
  console.log(
    `CPU monitor started. Threshold: ${CPU_THRESHOLD}%`
  );

  setInterval(() => {
    const cpuUsage = getProcessCpuUsage();

    console.log(`Node process CPU usage: ${cpuUsage}%`);

    if (cpuUsage >= CPU_THRESHOLD) {
      console.warn(
        `CPU usage exceeded ${CPU_THRESHOLD}%`
      );

      console.warn(
        "Stopping Node.js process. PM2 will restart it."
      );

      /*
       * PM2 will automatically restart the
       * process after it exits.
      */

      process.exit(1);
    }
  }, CHECK_INTERVAL);
};

module.exports = {
  startCpuMonitor
};
