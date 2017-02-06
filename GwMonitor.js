'use strict';

const EventEmitter = require('events').EventEmitter;

class GwMonitor extends EventEmitter {

  constructor(gateway, prefix) {
    super();
    
    // Monitor topics prefix
    this.prefix = prefix;
    if(this.prefix == null) this.prefix = 'gw';

    this.gateway = gateway;

    this.gateway.client.subscribe(this.prefix + '/devices/get');
    this.gateway.client.subscribe(this.prefix + '/subscriptions/get');
    this.gateway.client.subscribe(this.prefix + '/topics/get');
    this.gateway.client.subscribe(this.prefix + '/forwarder/enterpair');
    this.gateway.client.subscribe(this.prefix + '/forwarder/exitpair');
    this.gateway.client.subscribe(this.prefix + '/forwarder/mode/get');

    this._onMessage = (topic, message, packet) => this.onMessage(topic, message, packet);
    this._onDeviceConnected = (device) => this.onDeviceConnected(device);
    this._onDeviceDisconnected = (device) => this.onDeviceDisconnected(device);
    this._onDevicePaired = (device) => this.onDevicePaired(device);

    this.gateway.client.on('message', this._onMessage);
    this.gateway.on('deviceConnected', this._onDeviceConnected);
    this.gateway.on('deviceDisconnected', this._onDeviceDisconnected);
    this.gateway.forwarder.on('devicePaired', this._onDevicePaired);

  }

  destructor() {
    this.gateway.client.unsubscribe(this.prefix + '/devices/get');
    this.gateway.client.unsubscribe(this.prefix + '/subscriptions/get');
    this.gateway.client.unsubscribe(this.prefix + '/topics/get');
    this.gateway.client.unsubscribe(this.prefix + '/forwarder/enterpair');
    this.gateway.client.unsubscribe(this.prefix + '/forwarder/exitpair');
    this.gateway.client.unsubscribe(this.prefix + '/forwarder/mode/get');

    this.gateway.client.removeListener('message', this._onMessage);
    this.gateway.removeListener('deviceConnected', this._onDeviceConnected);
    this.gateway.removeListener('deviceDisconnected', this._onDeviceDisconnected);
    this.gateway.forwarder.removeListener('devicePaired', this._onDevicePaired);
  }

  onMessage(topic, message, packet) {
    if(topic === this.prefix + '/devices/get') {
      let devices = JSON.parse(JSON.stringify(this.gateway.db.getAllDevices()));  // make copy, fixes crash with lokijs
      // Cleanup
      for(let i in devices) {
        delete devices[i].meta;
        delete devices[i].$loki;
      }
      this.gateway.client.publish(this.prefix + '/devices/res', JSON.stringify(devices));
    }

    if(topic === this.prefix + '/subscriptions/get') {
      let subscriptions = JSON.parse(JSON.stringify(this.gateway.db.getAllSubscriptions()));  // make copy, fixes crash with lokijs
      // Cleanup
      for(let i in subscriptions) {
        delete subscriptions[i].meta;
        delete subscriptions[i].$loki;
      }
      this.gateway.client.publish(this.prefix + '/subscriptions/res', JSON.stringify(subscriptions));
    }

    if(topic === this.prefix + '/topics/get') {
      let topics = JSON.parse(JSON.stringify(this.gateway.db.getAllTopics()));  // make copy, fixes crash with lokijs
      // Cleanup
      for(let i in topics) {
        delete topics[i].meta;
        delete topics[i].$loki;
      }
      this.gateway.client.publish(this.prefix + '/topics/res', JSON.stringify(topics));
    }

    if(topic === this.prefix + '/forwarder/enterpair') {
      this.gateway.forwarder.enterPairMode();
    }

    if(topic === this.prefix + '/forwarder/exitpair') {
      this.gateway.forwarder.exitPairMode();
    }

    if(topic === this.prefix + '/forwarder/mode/get') {
      let mode = this.gateway.forwarder.getMode();
      this.gateway.client.publish(this.prefix + '/forwarder/mode/res', JSON.stringify({ mode: mode }));
    }
  }

  onDeviceConnected(device) {
    let dev = JSON.parse(JSON.stringify(device));
    delete dev.meta;
    delete dev.$loki;
    this.gateway.client.publish(this.prefix + '/devices/connected', JSON.stringify(dev));
  }

  onDeviceDisconnected(device) {
    let dev = JSON.parse(JSON.stringify(device));
    delete dev.meta;
    delete dev.$loki;
    this.gateway.client.publish(this.prefix + '/devices/disconnected', JSON.stringify(dev));
  }

  onDevicePaired(device) {
    let dev = JSON.parse(JSON.stringify(device));
    delete dev.meta;
    delete dev.$loki;
    this.gateway.client.publish(this.prefix + '/devices/paired', JSON.stringify(dev));
  }

}

module.exports = GwMonitor;