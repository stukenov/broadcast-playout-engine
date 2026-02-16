const NodeMediaServer = require('node-media-server');

const config = {
  logType: 3, 
  rtmp: {
    port: 1935,
    chunk_size: 60000,
    gop_cache: true,
    ping: 30,
    ping_timeout: 60
  },
  http: {
    port: 8008,
    allow_origin: '*'
  }
};

const nms = new NodeMediaServer(config);

nms.on('prePublish', (id, StreamPath, args) => {
  console.log(`[${id}] CONNECTION TO STREAM: ${StreamPath}`);
});

nms.on('postPublish', (id, StreamPath, args) => {
  console.log(`[${id}] STREAM STARTED: ${StreamPath}`);
  
});

nms.on('donePublish', (id, StreamPath, args) => {
  console.log(`[${id}] STREAM FINISHED: ${StreamPath}`);
});

nms.run();