(function(window,document){

var hostWindow = ( window.opener || window ).parent,
	isPopup = !!window.opener,
	id,
	_addEventListener = "addEventListener",
	_message = "message",
	routes = {},
	container,
	listen, msgEvent, ready;

// You're wasting my time!
if ( !hostWindow ) { return; }

// find the id of this widget in the url
location.search.replace(/(?:\?|&)fjId=(\w*?)(?:&|#|$)/, function(a,b) {
	id = b;
});

// feature detection
if ( _addEventListener in window ) {
	listen = _addEventListener;
	msgEvent = _message;
	document[ listen ]("DOMContentLoaded", insertControls, false);
} else {
	listen = "attachEvent";
	msgEvent = "on" + _message;
	document[ listen ]("onreadystatechange", function() {
		if ( document.readyState == "complete" ) {
			insertControls();
		}
	});
}

function insertControls() {
	// simple way to make sure that frameJet is only initialized once
	if ( ready ) { return; }

	var divs = "",
		btns = { close: [ "Close", "\u2297" ]	},
		body = document.body,
		style, btn;

	if ( !isPopup ) {
		btns.toggleSize = [ "Minimize", "\u2296" ],
		btns.togglePosition = [ "Alternate Position", "\u2298" ]
	}
	btns.togglePop = isPopup ? [ "Pop-In", "\u2299" ] : [ "Pop-Out", "\u229A" ];

	style =
		"#fj_controls { position: fixed; top: 0; left: 0; padding: 5px; background: #ccc; height: 18px; width: 100%; cursor: default; border-bottom: 1px solid #666 }\n" + 
		".fjBtn { display: inline-block; font-family: monospace; line-height: 18px; font-size: 30px; cursor: pointer }\n"+
		"#fj_controls.fjMin { padding: 1px; } .fjMin .fjBtn { display: none; } .fjMin #fj_toggleSize { display: block } .fjMin #fj_toggleSize:after { content: '\u2295' }";

	for ( btn in btns ) {
		style += "#fj_" + btn + ":after { content: '" + btns[ btn ][1] + "' }\n";
		divs += "<div id='fj_" + btn + "' class='fjBtn' title='" + btns[ btn ][0] + "'></div>\n";
	}

	style += "#fj_togglePosition:hover:after { content: '\u229b' }";

	container = document.createElement( "div" );
	container.id = "fj_controls";
	container.innerHTML = "<style id='fj_style'>" + style + "</style>" + divs;

	container.onclick = function( e, internal ) {
		var target = e ? e.target : window.event.srcElement,
			type = target.id.replace( /^fj_(\w*?)$/, "$1" );

		if ( type == "toggleSize" ) {
			if ( target.title == "Minimize" ) {
				target.title = "Maximize";
				body.style.overflow = "hidden";
				container.className = "fjMin";
			} else {
				target.title = "Minimize";
				body.style.overflow = "";
				container.className = "";
			}
		} else if ( type == "togglePop" && !isPopup ) {
			open( location, "", "width=" + innerWidth + ",height=" + innerHeight );
			internal = true;
		} else if ( type == "close" && isPopup ) {
			return close();
		}

		!internal && frameJet.emit( type, null, true );
	}

	body.appendChild( container );

	ready = true;
}

// setup message router
window[ listen ](msgEvent, function( e ) {
	var message = JSON.parse( e.data ),
		type = message.type,
		listeners,
		i;

	// toggleSize, close, etc.
	if ( message.internal ) {
		container.onclick( { target: document.getElementById( "fj_" + type ) }, true );

	// dispatch payload
	} else if ( ( listeners = routes[ type ] ) ) {
		i = listeners.length;
		while ( i-- ) {
			listeners[i]( message.payload );
		}
	}
}, false);

// API availble to guest window
window.frameJet = {
	emit: function( type, payload, internal ) {
		var message = { 
			fjId: id,
			type: type
		};

		internal && ( message.internal = internal );
		payload && ( message.payload = payload );

		hostWindow.postMessage( JSON.stringify( message ), "*" );
	},

	on: function( type, listener ) {
		// create a new route if necessary
		!routes[ type ] && ( routes[ type ] = [] );

		routes[ type ].push( listener );
	},

	off: function( type, listener ) {
		if ( listener && routes[ type ] ) {
			// remove a single listener
			routes[ type ].splice( routes[ type ].indexOf( listener ), 1 );

		// remove a complete route
		} else {
			delete routes[ type ];
		}
	}
}

// The host need a new reference to the guest if it was opened in a popup
if ( isPopup ) {
	frameJet.emit( "togglePop", "popout", true );
}

})(window,document);