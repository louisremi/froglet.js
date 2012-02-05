(function(window,document,parseFloat) {

var defaults = {
		width: "100%",
		height: 200,
		bottom: 0,
		left: 0,
		top: null,
		right: null,
		border: "none",
		background: "white"
	},
	_addEventListener = "addEventListener",
	_message = "message",
	listen, msgEvent;

// feature detection
if ( _addEventListener in window ) {
	listen = _addEventListener;
	msgEvent = _message;
} else {
	listen = "attachEvent";
	msgEvent = "on" + _message;
}

function Guest( url, options ) {
	options = extend( {}, defaults, options );
	options.top != null && options.bottom === 0 && ( options.bottom = null );
	options.right != null && options.left === 0 && ( options.left = null );

	var self = this,
		frameDomain;

	// give this guest a unique identifier to allow multiple guests
	this.id = "fj" + Math.round( Math.random() * 1E6 );
	// insert the identifier in the url
	this.url = url.replace(/(\?|#|$)/, function( chr ) {
		return "?fjId=" + self.id + (
			chr == "?" ? "&":
			chr == "#" ? "#":
			""
		);
	});
	this.options = options;
	this.routes = {};
	
	// setup message router
	window[ listen ](msgEvent, function( e ) {

		// search for the domain of the frame (only once)
		!frameDomain && ( frameDomain = self.guestWindow.location.href.replace( /^(\w*:\/\/.*?)(?:\/.*|$)/, "$1" ) );

		var message = JSON.parse( e.data ),
			type = message.type,
			listeners,
			i;

		// filter the messages according to their origin and id
		if ( e.origin !== frameDomain || message.fjId !== self.id ) {	return;	}

		// toggleSize, close, etc.
		if ( message.internal ) {
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
Guest.prototype = {
	toggleSize: function( noEmit ) {
		var frameStyle = this[0].style;

		if ( this.isMinimized ) {
			frameStyle.width = this.fullWidth;
			frameStyle.height = this.fullHeight;
		} else {
			frameStyle.height = frameStyle.width = "20px";
		}

		this.isMinimized = !this.isMinimized;

		!noEmit && this.emit( "minimize", null, true );
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

		!noEmit && this.emit( "minimize", null, true );
	},

	togglePop: function( e, popout ) {
		popout = popout === "popout";

		this.guestWindow = e.source;

		if ( popout ) {
			// Set popup position
			e.source.moveTo( this[0].offsetLeft, this[0].offsetTop );

			// In chrome, the size of the popup includes the browser chrome.
			// Use a dirty hack to resize the *window* if needed
			var height = this[0].offsetHeight;
			setTimeout(function() {
				var diff = height - e.source.innerHeight;
				diff && e.source.resizeBy( 0, diff );
			}, 250);
		}

		// Close popup of iframe
		this.close();

		// Create a new iframe
		!popout && this.open();
	},

	emit: function( type, payload, internal ) {
		var message = { type: type };

		internal && ( message.internal = internal );
		payload && ( message.payload = payload );

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
	
	close: function() {
		if ( this[0] ) {
			document.body.removeChild( this[0] );
			this[0] = null;
		} else {
			this.guestWindow.close();
		}
	},

	open: function() {
		var frame = document.createElement( "iframe" ),
			frameStyle = frame.style,
			options = this.options,
			frameDomain;

		// Set frame style
		this.fullWidth = frameStyle.width = dim( options.width );
		this.fullHeight = frameStyle.height = dim( options.height );
		frameStyle.border = options.border;
		frameStyle.background = options.background;
		frameStyle.position = "fixed";
		frameStyle.zIndex = 1001;
		options.bottom != null && ( frameStyle.bottom = dim( options.bottom ) );
		options.top != null && ( frameStyle.top = dim( options.top ) );
		options.left != null && ( frameStyle.left = dim( options.left ) );
		options.right != null && ( frameStyle.right = dim( options.right ) );

		frame.src = this.url;
		document.body.appendChild( frame );

		this[0] = frame;
		this.guestWindow = frame.contentWindow;
	}
};

window.frameJet = Guest;

// add "px" to a unitless dimension
function dim(v){return +v==v?v+"px":v}

// extend an object
function extend(c){for(var e=arguments.length,d=0,a,b;d++<e;)if(a=arguments[d],null!=a&&a!=c)for(b in a)void 0!==a[b]&&(c[b]=a[b]);return c};

})(window,document,parseFloat,Math);