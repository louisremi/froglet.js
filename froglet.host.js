(function(window,document,Math,parseFloat,undefined) {

var defaults = {
		width: "100%",
		height: 200,
		bottom: 0,
		left: 0,
		top: undefined,
		right: undefined,
		border: "none"
	},
	_addEventListener = "addEventListener",
	_message = "message",
	_popup = "popup",
	listen, msgEvent;

// feature detection
if ( _addEventListener in window ) {
	listen = _addEventListener;
	msgEvent = _message;
} else {
	listen = "attachEvent";
	msgEvent = "on" + _message;
}

function Froglet( url, options ) {
	options = extend( {}, defaults, options );
	options.top != undefined && options.bottom === 0 && ( options.bottom = undefined );
	options.right != undefined && options.left === 0 && ( options.left = undefined );

	var self = this,
		frameDomain;

	// give this guest a unique identifier to allow multiple guests
	this.id = "fl" + Math.round( Math.random() * 1E6 );

	this.url = url
	this.options = options;
	this.routes = {};
	
	// setup message router
	window[ listen ](msgEvent, function( e ) {

		// search for the domain of the frame (only once)
		if ( !frameDomain && self.guestWindow.location ) {
			frameDomain = self.guestWindow.location.href;
			frameDomain = frameDomain.replace( /^(\w*:\/\/.*?)(?:\/.*|$)/, "$1" );
		}

		var message = JSON.parse( e.data ),
			type = message.type,
			bcr, listeners,
			i;
		// filter the messages according to their origin and id
		if ( e.origin !== frameDomain || message.flId !== self.id ) {	return;	}

		if ( message.internal ) {
			type == "pos" ?
				// reply with current position of the widget
				self.emit( type, ( bcr = self[0].getBoundingClientRect() ) && [ bcr.left, bcr.top ], true ) :
				// toggleSize, close, etc.
				self[ type ]( e, message.payload );

		// dispatch payload
		} else if ( ( listeners = self.routes[ type ] ) ) {
			i = listeners.length;
			while ( i-- ) {
				listeners[i]( message.payload );
			}
		}
	}, false);

	this.open();
}

// API available to host window
Froglet.prototype = {
	toggleSize: function( noEmit ) {
		var frameStyle = this[0].style;

		if ( this.state == "min" ) {
			frameStyle.width = this.fullWidth;
			frameStyle.height = this.fullHeight;
			this.state = "open";

		} else if ( this.state == "open" ) {
			frameStyle.height = frameStyle.width = "20px";
			this.state = "min"
		}

		!noEmit && this.emit( "toggleSize", undefined, true );
	},

	togglePosition: function( noEmit ) {
		var frameStyle = this[0].style;

		if ( parseFloat( frameStyle.top ) == 0 ) {
			frameStyle.top = "auto";
			frameStyle.bottom = 0;
		} else if ( parseFloat( frameStyle.bottom ) == 0 ) {
			frameStyle.bottom = "auto";
			frameStyle.top = 0;
		}

		if ( parseFloat( frameStyle.left ) == 0 ) {
			frameStyle.left = "auto";
			frameStyle.right = 0;
		} else if ( parseFloat( frameStyle.right ) == 0 ) {
			frameStyle.right = "auto";
			frameStyle.left = 0;
		}

		!noEmit && this.emit( "togglePosition", undefined, true );
	},

	togglePop: function( noEmit ) {
		// the dimensions of the open iframe need to be sent to the guest
		// since they will be 0,0 once hidden
		var dim = [ this[0].offsetWidth, this[0].offsetHeight ];

		if ( this.state == _popup ) {
			this.state = "open";
			this[0].style.display = "block";

		} else {
			this.state = _popup;
			this[0].style.display = "none";
		}

		!noEmit && this.emit( "togglePop", dim, true );
	},

	emit: function( type, payload, internal ) {
		var message = { type: type };

		internal && ( message.internal = internal );
		payload != undefined && ( message.payload = payload );

		this.guestWindow.postMessage( JSON.stringify( message ), "*" );
	},

	on: function( type, listener ) {
		// create a new route if necessary
		!this.routes[ type ] && ( this.routes[ type ] = [] );

		this.routes[ type ].push( listener );
	},

	off: function( type, listener ) {
		if ( listener && this.routes[ type ] ) {
			// remove a single listener
			this.routes[ type ].splice( this.routes[ type ].indexOf( listener ), 1 );

		// remove a complete route
		} else {
			delete this.routes[ type ];
		}
	},

	close: function( noEmit ) {
		document.body.removeChild( this[0] );
		this.state = false;

		!noEmit && this.state == _popup && this.emit( "close", undefined, true );
	},

	open: function() {
		var frame = document.createElement( "iframe" ),
			frameStyle = frame.style,
			options = this.options,
			self = this,
			frameDomain;

		frame.id = this.id;

		// Set frame style
		this.fullWidth = frameStyle.width = dim( options.width );
		this.fullHeight = frameStyle.height = dim( options.height );
		frame.frameBorder = 0;
		frameStyle.position = "fixed";
		frameStyle.zIndex = 1001;
		options.bottom != undefined && ( frameStyle.bottom = dim( options.bottom ) );
		options.top != undefined && ( frameStyle.top = dim( options.top ) );
		options.left != undefined && ( frameStyle.left = dim( options.left ) );
		options.right != undefined && ( frameStyle.right = dim( options.right ) );

		document.body.appendChild( frame );

		// insert the identifier & the position in the url
		frame.src = this.url.replace(/(\?|#|$)/, function( chr ) {
			return "?flId=" + self.id + (
				chr == "?" ? "&":
				chr == "#" ? "#":
				""
			);
		});

		this[0] = frame;
		this.guestWindow = frame.contentWindow;
		this.state = "open";
	}
};

// public API
window.froglet = function( url, options ) {
	return new Froglet( url, options );
};
froglet.fn = Froglet.prototype;

// add "px" to a unitless dimension
function dim(v){return +v==v?v+"px":v}

// extend an object
function extend(c){for(var e=arguments.length,d=0,a,b;d++<e;)if(a=arguments[d],null!=a&&a!=c)for(b in a)void 0!==a[b]&&(c[b]=a[b]);return c};

// return top and left position relative to the window
function getPos(e,b) {b=e.getBoundingClientRect();return[b.left,b.top]}

})(window,document,Math,parseFloat);
