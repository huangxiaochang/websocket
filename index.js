/*
	Encapsulating WebSocket
	created by huangxiaochang 2020-5-15
 */
import config from './config.js'
import { getType } from './utils.js'

const EVENT = {
	open: '_onOpenCbs',
	close: '_onCloseCbs',
	error: '_onErrorCbs',
	message: '_onMessageCbs'
}

class WebSocketManger {
	constructor (namespace='', options={}) {
		this._namespace = namespace;
		this._options = options;
		this._onOpenCbs = getType(options.onopen) === 'function' ? [options.onopen] : [];
		this._onCloseCbs = getType(options.onclose) === 'function' ? [options.onclose] : [];
		this._onErrorCbs = getType(options.onerror) === 'function' ? [options.onerror] : [];
		this._onMessageCbs = getType(options.onmessage) === 'function' ? [options.onmessage] : [];
		this._binaryType  = options.binaryType;
		this._socket = null;

		// whether it need to open heart check
		this._needHeartCheck = options.needHeartCheck || false;
		this._heartCheckTimeout = options.heartCheckTimeout || 8000;
		this._serverTimeout = options.serverTimeout || 60000;
		this._heartCheck = this._createHeartCheck();

		// is auto reconnect
		this._isReconnect = options.isReconnect || true;
		// time to reconnect
		this._reconnectTime = options.reconnectTime || 10000;
		this._reconnectTimer = null;
	}

	connect (namespace) {
		namespace = namespace || this._namespace;
		if (this._socket && (this._socket.readyState === WebSocket.OPEN || this._socket.readyState === WebSocket.CONNECTING)) {
			return this._socket;
		}
		let reg = /^(http|https)/;
		let url = config.baseURL.replace(reg, (m) => {
			return m === 'http' ? 'ws' : 'wss';
		})
		url += namespace;
		this._socket = new WebSocket(url);
		this._binaryType && (this._socket.binaryType = this._binaryType);
		this._handleEventHander();
		return this._socket;
	}

	// manual closing websocket 
	disconnect () {
		this._clearReconnectTimer();
		this._socket && this._socket.close();
		this._socket = null;
	}

	// reconnecting websocket after offline
	reconnect () {
		if (!this._socket) {
			console.log("已手动关闭，请刷新页面");
			this._clearReconnectTimer();
			return false;
		}
		return this.connect();
	}

	send (data) {
		// can send USVString , Blob, ArrayBuffer, ArrayBufferView 's data.
		// if you want to send a object to server, please stringify it.
		this._socket && this._socket.send(data);
	}

	close () {
		// close the websocket
		this.disconnect();
	}

	get socket () {
		return this._socket;
	}

	_handleEventHander () {
		if (!this._socket) {
			return false;
		}

		// support defining event callback by websocket.onopen = function syntax
		this.onopen(this._socket.onopen);
		this.onclose(this._socket.onclose);
		this.onerror(this._socket.onerror);
		this.onmessage(this._socket.onmessage);

		// support defining event callback by websocket.addEventListener() syntax
		this._socket.addEventListener = (name, cb) => {
			this.addEventListener(name, cb);
		}

		// handle websocket event
		this._socket.onmessage = (ev) => {
			let data;
			try {
				data = JSON.parse(ev.data);
			} catch (e) {
				data = ev.data;
			}
			if (data === 'pong') {
				// stop reconnect
				this._needHeartCheck && this._heartCheck.reset();
			} else {
				this._onMessageCbs.forEach(cb => cb(data));
			}
		}
		this._socket.onopen = (ev) => {
			this._onOpenCbs.forEach(cb => cb(ev));
			this._clearReconnectTimer();
			this._needHeartCheck && this._heartCheck.start();
		}
		this._socket.onerror = (ev) => {
			this._onErrorCbs.forEach(cb => cb(ev));
			this._isReconnect && this._autoReconnect();
		}
		this._socket.onclose = (ev) => {
			this._onCloseCbs.forEach(cb => cb(ev));
			this._isReconnect && this._autoReconnect();
		}
	}

	_createHeartCheck () {
		if (this._needHeartCheck) {
			const heart =  {
				timeout: this._heartCheckTimeout,
				timer: null,
				serverTimeout: this._serverTimeout,
				serverTimer: null,
				reset: () => {
					heart.timer && clearTimeout(heart.timer);
					// if receiving `pong` data, stoping reconnect
					heart.serverTimer && clearTimeout(heart.serverTimer);
					// retime
					heart.start();
				},
				start: () => {
					heart.timer = setTimeout(() => {
						// send `ping` to server and require server to return back `pong`
						this._socket && this._socket.send('ping');
						heart.serverTimer = setTimeout(() => {
							console.log('心跳检测重连。。。')
							// if the server does not send back `pong` within the specified time, reconnecting
							this._socket.close(); // will reconnecting in close event handler
							this._options.heartCheckCb && this._options.heartCheckCb();
						}, this._serverTimeout);
					}, this._heartCheckTimeout);
				}
			}
			return heart;
		}
	}

	_autoReconnect () {
		if (this._isReconnect && !this._reconnectTimer) {
			this._reconnectTimer = setInterval(() => {
				this.reconnect();
			}, this._reconnectTime);
		}
	}

	_clearReconnectTimer () {
		// clear reconnect timer after reconnect
		this._reconnectTimer && clearInterval(this._reconnectTimer);
		this._reconnectTimer = null;
	}

	// support defining event callback by wsm.addEventListener syntax
	addEventListener (name, cb) {
		if (!getType(cb) !== 'function') {
			return false;
		}
		const cbs = EVENT[name];
		cbs && cbs.push(cb);
	}

	// support defining event callback by wsm.onopen(cb) syntax. (wsm is instance of WebSocketManger)
	onopen (cb) {
		if (getType(cb) !== 'function') {
			return false;
		}
		this._onOpenCbs.push(cb);
		return this;
	}

	onclose (cb) {
		if (getType(cb) !== 'function') {
			return false;
		}
		this._onCloseCbs.push(cb);
		return this;
	}

	// network disconnection will not trigger this event
	onerror (cb) {
		if (getType(cb) !== 'function') {
			return false;
		}
		this._onErrorCbs.push(cb);
		return this;
	}

	onmessage (cb) {
		if (getType(cb) !== 'function') {
			return false;
		}
		this._onMessageCbs.push(cb);
		return this;
	}

}

export default WebSocketManger;