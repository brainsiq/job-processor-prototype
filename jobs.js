const amqp = require('amqplib');

const wait = new Promise(resolve => {
    setTimeout(resolve, 10000);
});

const jobs = [];
const jobStatus = {};

(async () => {
    console.log(`Jobs waiting to connect to rabbit`);

    await wait;

    const connection = await amqp.connect('amqp://rabbitmq');

    connection.on('error', err => {
        console.error('Connection error', err);
    });

    const channel = await connection.createChannel();

    channel.on('error', err => {
        console.error('Channel error', err);
    });

    await channel.prefetch(1);
    await channel.assertExchange('fanout-exchange', 'fanout');
    await channel.assertQueue('jobs-queue');
    await channel.bindQueue('jobs-queue', 'fanout-exchange');

    channel.consume('jobs-queue', async(msg) => {
        const routingKey = msg.fields.routingKey;

        console.log(`Received ${routingKey}`, jobStatus);

        if (routingKey.startsWith('job-status.')) {
            const jobId = routingKey.replace('job-status.', '');

            if (jobStatus[jobId]) {
                // Job finished
                jobStatus[jobId] = msg.content.toString();

                console.log(`Job ${jobId} complete`);

                if (Object.values(jobStatus).every(status => status !== 'P')) {
                    console.log('ALL JOBS COMPLETE');
                }

                await channel.ack(msg);
            } else {
                // Wait for the job start message before processing any statuses
                await channel.nack(msg);
            }
        } else {
            // Job started
            const jobId = routingKey.replace('job.', '');

            jobStatus[jobId] = 'P';

            await channel.ack(msg);
        }
    }, { noAck: false });
})();
