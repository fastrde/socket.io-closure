// This script licensed under the MIT.
// http://orgachem.mit-license.org

/**
 * @fileoverview A wrapper class for Socket.IO.
 * @author orga.chem.job@gmail.com (OrgaChem)
 */


goog.provide('socketIo.Socket');

goog.require('goog.Uri');
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
 * SocketNamespace object from Socket.IO.
 * @type {SocketNamespace}
 * @private
 */
socketIo.Socket.prototype.socket_ = null;


/**
 * Asserts whether this socket is opened.
 * @private
 */
socketIo.Socket.prototype.assertSocketExists_ = function() {
  goog.asserts.assert(goog.isDef(this.socket_), 'This socket is not opened.');
};


/**
 * Adds an event listener to the event target.
 * The mechanism to listen customize events by Socket.IO, so methods from
 * {@link goog.events.EventTarget} do not work well when your listener was
 * attached by the method.
 *
 * @param {string} type The type of the event to listen for.
 * @param {Function|Object} handler The function to handle the event. The
 *     handler can also be an object that implements the handleEvent method
 *     which takes the event object as argument.
 */
socketIo.Socket.prototype.addCustomEventListener = function(type, handler) {
  this.socket_['on'](type, goog.bind(handler, this));
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
 *
 * @param {goog.dom.DomHelper=} opt_domHelper Optional DOM helper.
 */
socketIo.Socket.prototype.importSocketIo = function(opt_domHelper) {
  if (socketIo.Socket.imported_) {
    this.handleScriptLoad();
    return;
  }

  var dom = opt_domHelper || goog.dom.getDomHelper();
  var uriObj = goog.Uri.parse(this.serverAddr_);
  uriObj.setPath(socketIo.Socket.SCRIPT_PATH);

  var script = goog.dom.createDom('script', { 'src': uriObj.toString(),
      'type': 'text/javascript' });

  this.handler_.listen(script, goog.events.EventType.LOAD,
      this.handleScriptLoad);

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
 * Handles Socket.IO connect event.
 * @private
 */
socketIo.Socket.prototype.handleConnect_ = function() {
  this.dispatchEvent({ type: socketIo.Socket.EventType.CONNECT });
};


/**
 * Handles Socket.IO connect_failed event.
 * @private
 */
socketIo.Socket.prototype.handleConnectFailed_ = function(reason) {
  this.dispatchEvent({ type: socketIo.Socket.EventType.CONNECT_FAILED,
      reason: reason });
};


/**
 * Handles Socket.IO disconnect event.
 * @private
 */
socketIo.Socket.prototype.handleDisConnect_ = function(reason) {
  this.dispatchEvent({ type: socketIo.Socket.EventType.DISCONNECT,
      reason: reason });
};


/**
 * Handles Socket.IO error event.
 * @private
 */
socketIo.Socket.prototype.handleError_ = function(reason) {
  this.dispatchEvent({ type: socketIo.Socket.EventType.ERROR,
      reason: reason });
};


/**
 * Handles Socket.IO message event.
 * @private
 */
socketIo.Socket.prototype.handleMessage_ = function(msg) {
  this.dispatchEvent({ type: socketIo.Socket.EventType.MESSAGE,
      message: msg });
};


/**
 * Handles the event when fired client-side Socket.IO script was loaded.
 */
socketIo.Socket.prototype.handleScriptLoad = function() {
  var io = goog.global['io'];

  if (!goog.isDefAndNotNull(io)) {
    throw Error('Cannot find io: ' + io);
  }

  this.socket_ = io['connect'](this.serverAddr_);

  this.addCustomEventListener('connect', this.handleConnect_);
  this.addCustomEventListener('disconnect', this.handleDisConnect_);
  this.addCustomEventListener('connect_failed', this.handleConnectFailed_);
  this.addCustomEventListener('error', this.handleError_);
  this.addCustomEventListener('message', this.handleMessage_);
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
