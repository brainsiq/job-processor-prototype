const amqp = require('amqplib');

const wait = new Promise(resolve => {
    setTimeout(resolve, 10000);
});

(async () => {
    console.log(`Publisher waiting to connect to rabbit`);

    await wait;

    const connection = await amqp.connect('amqp://rabbitmq');

    connection.on('error', err => {
        console.error('Connection error', err);
    });

    const channel = await connection.createChannel();

    channel.on('error', err => {
        console.error('Channel error', err);
    });

    await channel.assertExchange('fanout-exchange', 'fanout');

    console.log(`Publishing to exchange`);

    for (let i = 0; i < 50; i++) {
        channel.publish('fanout-exchange', 'job.' + (i + 1), Buffer.from('do the job'));
    }
})();
