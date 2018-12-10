const async = require('async')
const knx = require('knx')

const connect = cb => {
  const connection = new knx.Connection({
    // ip address and port of the KNX router or interface
    ipAddr: '192.168.0.89', ipPort: 3671,
    // in case you need to specify the multicast interface (say if you have more than one)
    //interface: 'eth0',
    // the KNX physical address we'd like to use
    physAddr: '1.0.250',
    // set the log level for messsages printed on the console. This can be 'error', 'warn', 'info' (default), 'debug', or 'trace'.
    loglevel: 'info',
    // do not automatically connect, but use connection.Connect() to establish connection
    manualConnect: true,
    // use tunneling with multicast (router) - this is NOT supported by all routers! See README-resilience.md
    forceTunneling: true,
    // wait at least 10 millisec between each datagram
    minimumDelay: 10,
    // enable this option to suppress the acknowledge flag with outgoing L_Data.req requests. LoxOne needs this
    suppress_ack_ldatareq: false,
    manualConnect: false,
     //define your event handlers here:
    handlers: {
      // wait for connection establishment before sending anything!
      connected: () => {
        cb(null, connection)
      },
      // get notified for all KNX events:
      event: (evt, src, dest, value) => {
        console.log("event: %s, src: %j, dest: %j, value: %j", evt, src, dest, value)
      },
      // get notified on connection errors
      err: connStatus => {
        console.log("**** ERROR: %j", connStatus)
        cb(err)
      }
    }
  })
}

let conn

async.series([
    cb1 => connect((err, connection) => {
      conn = connection
      cb1(err)
    }),
    cb1 => {
      console.log('==> 1')
      conn.write("3/1/3", 100, 'DOT5.001', 1)
      cb1()
    },
    cb1 => setTimeout(cb1, 3000),
    cb1 => {
      console.log('==> 2')
      conn.write("3/1/3", 0, 'DOT5.001', 1)
      cb1()
    },
    cb1 => setTimeout(cb1, 3000),
    cb1 => {
      console.log('==> 3')
      conn.write("3/1/3", 100, 'DOT5.001', 1)
      cb1()
    },
    cb1 => setTimeout(cb1, 3000),
    cb1 => {
      console.log('==> 4')
      conn.write("3/1/3", 20, 'DOT5.001', 1)
      cb1()
    },
  ],
  err => {
    console.log('durch!', err)
  })
