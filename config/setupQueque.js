// setupQueque.js
async function setupQueue() {
    const PQueue = (await import('p-queue')).default;
    const queue = new PQueue({ concurrency: 1, interval: 500, intervalCap: 1 });
    return queue;
}

module.exports = setupQueue;