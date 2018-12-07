const amqp = require('amqplib');

const workerId = process.argv[2];
const delay = 0;
const wait = new Promise(resolve => {
    setTimeout(resolve, 10000);
});

(async () => {
    console.log(`Worker ${workerId} waiting to connect to rabbit`);

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
    await channel.assertExchange('topic-exchange', 'topic');
    await channel.assertExchange('fanout-exchange', 'fanout');
    await channel.bindExchange('topic-exchange', 'fanout-exchange');
    await channel.assertQueue('worker-queue');
    await channel.bindQueue('worker-queue', 'topic-exchange', 'job.*');

    console.log(`Worker ${workerId} consuming from queue`);

    channel.consume('worker-queue', msg => {
        const routingKey = msg.fields.routingKey;


        const jobId = routingKey.replace('job.', '');

        setTimeout(() => {
            console.log(`Worker ${workerId} consumed message ${routingKey}`);

            channel.publish('fanout-exchange', 'job-status.' + jobId, Buffer.from('C'));
        }, delay);
    }, { noAck: true });
})();
