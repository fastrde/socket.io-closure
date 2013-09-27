// This script licensed under the MIT.
// http://orgachem.mit-license.org

/**
 * @fileoverview A wrapper class for Socket.IO.
 * @author orga.chem.job@gmail.com (OrgaChem)
 */


goog.provide('socketIo.Socket');

goog.require('goog.Uri');
goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.dom');
goog.require('goog.events.EventHandler');
goog.require('goog.events.EventTarget');



/**
 * A wrapper class for Socket.IO.
 * @constructor
 * @extends {goog.events.EventTarget}
 */
socketIo.Socket = function() {
  goog.base(this);

  this.handler_ = new goog.events.EventHandler(this);
};
goog.inherits(socketIo.Socket, goog.events.EventTarget);


/**
 * Client-side script path of Socket.IO.
 * @type {string}
 * @const
 */
socketIo.Socket.SCRIPT_PATH = '/socket.io/socket.io.js';


/**
 * Event type fot the Socket.IO.
 * See: https://github.com/LearnBoost/socket.io/wiki/Exposed-events#client
 * @enum {string}
 */
socketIo.Socket.EventType = {
  /** "connect" is emitted when the socket connected successfully. */
  CONNECT: 'connect',

  /** "disconnect" is emitted when the socket disconnected. */
  DISCONNECT: 'disconnect',

  /**
   * "connect_failed" is emitted when socket.io fails to establish a connection
   * to the server and has no more transports to fallback to.
   */
  CONNECT_FAILED: 'connect_failed',

  /**
   * "error" is emitted when an error occurs and it cannot be handled by the
   * other event types.
   */
  ERROR: 'error',

  /**
   * "message" is emitted when a message sent with socket.send is received.
   *  message is the sent message, and callback is an optional acknowledgement
   *  function.
   */
  MESSAGE: 'message'
};


/**
 * Whether the client-side Socket.IO script was imported.
 * @type {boolean}
 * @private
 */
socketIo.Socket.imported_ = false;


/**
 * @type {Object.<function>}
 * @private
 */
socketIo.Socket.wrapperMap_ = {};


/**
 * SocketNamespace object from Socket.IO.
 * @type {SocketNamespace}
 * @private
 */
socketIo.Socket.prototype.socket_ = null;


/** @override */
socketIo.Socket.prototype.addEventListener = function(type, handler,
    opt_capture, opt_handlerScope) {

  var wrapperMap = socketIo.Socket.wrapperMap_;
  var wrapper;

  if (!(type in wrapperMap)) {
    wrapper = wrapperMap[type] = this.createWrapper(type)
    this.addCustomEventListener(type, wrapper)
  }

  goog.base(this, 'addEventListener', type, handler, opt_capture,
      opt_handlerScope);
};


/**
 * Asserts whether this socket is opened.
 * @private
 */
socketIo.Socket.prototype.assertSocketExists_ = function() {
  goog.asserts.assert(goog.isDef(this.socket_), 'This socket is not opened.');
};


/**
 * Adds a listener to the end of the listeners array for the specified event.
 * @param {string} type The type of the event to listen for.
 * @param {Function|Object} handler The function to handle the event.
 * @private
 */
socketIo.Socket.prototype.addCustomEventListener_ = function(type, handler) {
  this.assertSocketExists_();
  this.socket_['on'](type, handler);
};


/**
 * Remove a listener from the listener array for the specified event.
 * Caution: changes array indices in the listener array behind the listener.
 * @param {string} type The type of the event to listen for.
 * @param {Function|Object} handler The function to handle the event.
 * @private
 */
socketIo.Socket.prototype.removeCustomEventListener_ = function(type, handler) {
  var wrapperMap = socketIo.Socket.wrapperMap_;

  this.assertSocketExists_();
  this.socket_['removeListener'](type, handler);
};


/**
 * Returns created listener wrapper for Socket.IO.
 * @param {string} type The event type of wrapper.
 * @return {Function} Created wrapper function.
 * @protected
 */
socketIo.Socket.prototype.createWrapper = function(type) {
  var wrapper;
  var that = this;

  switch (type) {
    case socketIo.Socket.EventType.MESSAGE:
      return function(msg) {
        that.dispatchEvent({ type: type, message: msg });
      };
    case socketIo.Socket.EventType.CONNECT:
      return function() {
        that.dispatchEvent({ type: type });
      };
    case socketIo.Socket.EventType.DISCONNECT:
    case socketIo.Socket.EventType.CONNECT_FAILED:
    case socketIo.Socket.EventType.ERROR:
      return function(reason) {
        that.dispatchEvent({ type: type, data: reason });
      };
    default:
      return function() {
        var args = goog.array.toArray(arguments);
        that.dispatchEvent({ type: type, data: args });
      };
  }
};


/**
 * Checks to see if the web socket is open or not.
 *
 * @return {boolean} True if the web socket is open, false otherwise.
 */
socketIo.Socket.prototype.isOpen = function() {
  return socketIo.Socket.imported_ && this.socket_ &&
      this.socket_['socket']['open'];
};


/**
 * Creates and opens the Socket.IO.
 *
 * @param {string} url The URL to which to connect.
 */
socketIo.Socket.prototype.open = function(url) {
  this.serverAddr_ = url;
  this.importSocketIo();
};


/**
 * Imports client-side Socket.IO script.
 */
socketIo.Socket.prototype.importSocketIo = function() {
  if (socketIo.Socket.imported_) {
    this.handleScriptLoad_();
    return;
  }

  var dom = goog.dom.getDomHelper();
  var uriObj = goog.Uri.parse(this.serverAddr_);
  uriObj.setPath(socketIo.Socket.SCRIPT_PATH);

  var script = goog.dom.createDom('script', { 'src': uriObj.toString(),
      'type': 'text/javascript' });

  this.handler_.listen(script, goog.events.EventType.LOAD,
      this.handleScriptLoad_);

  dom.getDocument().body.appendChild(script)
  socketIo.Socket.imported_ = true;
};


/**
 * Closes the web socket connection.
 */

socketIo.Socket.prototype.close = function() {
  this.assertSocketExists_();
  this.socket_['disconnect']();
};


/**
 * Sends the message over the web socket.
 *
 * @param {string} message The message to send.
 */
socketIo.Socket.prototype.send = function(message) {
  this.assertSocketExists_();
  this.socket_['send'](message);
};


/**
 * Dispatechs event on the connected server.
 * @param {{type: string, data: *}} e The event to dispatch.
 */
socketIo.Socket.prototype.dispatchEventOnServer = function(e) {
  this.assertSocketExists_();
  this.socket_['emit'](e.type, e.data);
};


/**
 * Handles Socket.IO message event.
 * @private
 */
socketIo.Socket.prototype.onmessage_ = function(msg) {
  this.dispatchEvent({ type: socketIo.Socket.EventType.MESSAGE,
      message: msg });
};


/**
 * Handles the event when fired client-side Socket.IO script was loaded.
 * @private
 */
socketIo.Socket.prototype.handleScriptLoad_ = function() {
  var io = goog.global['io'];

  if (!goog.isDefAndNotNull(io)) {
    throw Error('Cannot find io: ' + io);
  }
};


/** @override */
socketIo.Socket.prototype.disposeInternal = function() {
  goog.base(this, 'disposeInternal');

  if (this.isOpen()) {
    this.close();
  }

  this.handler_.dispose();

  delete this.socket_;
};
