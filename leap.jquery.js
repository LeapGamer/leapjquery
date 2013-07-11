 //custom LeapGamer.com copyright James Blaha
 //This software is copyrighted under an MIT license
 //https://github.com/jquery/jquery/blob/master/MIT-LICENSE.txt
 (function($) {       
    var leapData = [];
    //var returnLeapData = [];
    var ws;     
    var funcs = [];
    var deltaTime;
    var frameCount = 0;
    var fps;
    var lastFrameTime;
    var lastFrameHands = 0;
    var blankFunc = function() { }; 
    var isInit = false;
    var lastFramePointers = 0;
    var timeBegan = 0;
    var timeElapsed = 0;
    
    var xEdge = 200;
    var zEdge = 250;
    var yEdge = 470;
    
    var tapBegan = false;
    var pushing = false;
    var swiping = false;
    var tapping = [];
    var pushing = [];
    var wiggling = [];
    var winding = [];
    var poking = [];
    var swiping = [];
    var grabbing = [];
    
    var tapTimer = 20;
    var pushingTimer = 50;
    var swipingTimer = 50;  
    var grabbingTimer = 10;
    var pokeTimer = 20;
    
    var events = {
        onHandEnter : blankFunc,
        onHandExit : blankFunc,
        onHandChange : blankFunc,
        onPointerChange : blankFunc,
        onFrame : blankFunc,
        onConnect : blankFunc,
        onDisconnect : blankFunc,
        onSecondChange : blankFunc,
        onTap : blankFunc,
        onPush : blankFunc,
        onWind : blankFunc, 
        onPoke : blankFunc, 
        onSwipe : blankFunc, 
        onGrab : blankFunc,
        onWiggle : blankFunc 
    }
    
    //define our functions
    var methods = {
        initLeap : function() {
          console.log("Loaded plugin!!");
 
		  if(typeof(window.Leap) == "undefined") { 
			  // Support both the WebSocket and MozWebSocket objects
			  if ((typeof(WebSocket) == 'undefined') && (typeof(MozWebSocket) != 'undefined')) {
				 WebSocket = MozWebSocket;
			  }
			  
			  //Create and open the socket
			  ws = new WebSocket("ws://localhost:6437/");
			  
			  // On successful connection
			  ws.onopen = function(event) {
				console.log("Connected to Leap device."); 
				events.onConnect();  
			  };
			  
			  // On message received
			  ws.onmessage = function(event) {
				window.leapData = $.parseJSON(event.data);
				$.fn.leap("leapFrame");
			  };
			  
			  // On socket close
			  ws.onclose = function(event) {
				ws = null;
				events.onDisconnect();  
				console.log("Disconnected from Leap device.");  
			  }
			  
			  //On socket error
			  ws.onerror = function(event) {
				console.log("Error connecting to Leap device.");
			  };
		  } else {
			events.onConnect();
		  
			// Store frame for motion functions
			//var previousFrame;
			//var paused = false;
			//var pauseOnGesture = false;

			// Setup Leap loop with frame callback function
			var controllerOptions = {enableGestures: false};
			
			window.Leap.loop(controllerOptions, function(frame) {
			  window.leapData = frame;
			  $.fn.leap("leapFrame");
			  
			  // Store frame for motion functions
			  //previousFrame = frame;
			});
		  }
        },
        leapFrame : function() {
            //keep track of the frames and time
            frameCount++;
            deltaTime = window.leapData.timestamp - lastFrameTime;
            fps = 1/(deltaTime/1000000); 
            
            //since we use these so much add them as a var to the object
            if(window.leapData.pointables != null) window.leapData.numPointables = window.leapData.pointables.length; 
            if(window.leapData.hands != null) window.leapData.numHands = window.leapData.hands.length;  
                                 
            //check for state changes and execute functions for them 
            if(lastFrameHands > 0 && window.leapData.numHands == 0) events.onHandExit(); 
            if(lastFrameHands == 0 && window.leapData.numHands > 0) events.onHandEnter();
            if(lastFrameHands !== window.leapData.numHands) events.onHandChange();
            if(lastFramePointers !== window.leapData.numPointables) events.onPointerChange();  
            if(Math.round(lastFrameTime/1000000) < Math.round(window.leapData.timestamp/1000000)) events.onSecondChange();            
            
            //initialization stuff
            //for some reason there isnt a timestamp until the 3rd frame
            if(frameCount == 3) {
               timeBegan = window.leapData.timestamp; 
               //for each pointable
               for(var i = 0; i<20; i++) {
                    tapping[i] = false;   
               }
               //for each hand
               for(var i=0; i<5; i++) {
                    pushing[i] = [];
                    pushing[i].isPushing = false; 
                    pushing[i].lastPalm = -600;  
                    
                    swiping[i] = [];
                    swiping[i].isSwiping = false; 
                    swiping[i].lastPalm = -600;  
                    
                    grabbing[i] = [];  
                    grabbing.history = [];
                    grabbing.frames = 0;
               }
            } 
            
            //set some useful vars 
            window.leapData.fps = fps;  
            window.leapData.timeBegan = timeBegan;
            window.leapData.deltaTime = deltaTime;
            window.leapData.frameCount = frameCount;
            window.leapData.timeElapsed = window.leapData.timestamp - timeBegan;
            
            //detect tapping motion
            if(window.leapData.numPointables > 0 && funcs.onTap != blankFunc) {
                $.each(window.leapData.pointables, function(key, pointable) {
                     if(pointable.tipVelocity[1] < -1000 && tapping[key] == false) tapping[key] = frameCount;           
                     if(tapping[key] != false && (frameCount - tapping[key]) > tapTimer) tapping[key] = false;   
                     
                     if(pointable.tipVelocity[1] > 100 && tapping[key] != false) {
                         tapping[key] = false;
                         events.onTap(pointable);
                     }
                });            
            }
                           
            //detect pushing motion
            if(window.leapData.numHands > 0 && funcs.onPush != blankFunc) {
                $.each(window.leapData.hands, function(key, hand) {
                    var palmForward = hand.palmVelocity[2];
                    var palmZ = hand.palmPosition[2]
                            
                    if(palmForward < -1200 && pushing[key].isPushing == false && pushing[key].lastPalm < palmZ) {
                           pushing[key].frameStarted = frameCount;
                           pushing[key].isPushing = true;
                    }
					
                    if(typeof pushing[key] != "undefined") {
						if(pushing[key].isPushing && (frameCount - pushing[key].frameStarted) > pushingTimer) pushing[key].isPushing = false;
					
                    
						if(pushing[key].isPushing != false) {  
							if(palmForward > -10) {
							   pushing[key].isPushing = false; 
							   events.onPush(hand);
							}
						}
						pushing[key].lastPalm = palmZ; 
					}
                });
            }
            
            //detect winding motion
            if(window.leapData.numPointables > 0 && events.onWind != blankFunc) { 
                 $.each(window.leapData.pointables, function(key, pointable) {    
                     
                 });
            }
            
            //detect grabbing
            if(window.leapData.numHands == 0) {
                for(var i=0; i<5; i++) { 
                    grabbing[i] = [];  
                    grabbing.history = [];
                    grabbing.frames = 0;
               }
            }
            
            if(window.leapData.numHands > 0 && events.onGrab != blankFunc) {  
                 $.each(window.leapData.hands, function(key, hand) { 
					if(typeof grabbing[key] != "undefined") {
						 if(window.leapData.numPointables == 0) grabbing[key].palmOpen = false; 
						 if(window.leapData.numPointables > 1) grabbing[key].grabbing = false; 
						 if(window.leapData.numPointables > 2) grabbing[key].palmOpen = true;

						 var grabbed = false;
						 for(var i=0;i<grabbingTimer;i++) {
							if(typeof grabbing.history != "undefined") { 
								if(grabbing.history[i]) grabbed = true; 
							}
						 }
						 
						
						 if(!grabbing[key].palmOpen && (grabbed || grabbing[key].grabbing) && (Math.abs(hand.palmPosition[0]) < xEdge && hand.palmPosition[2] < zEdge && hand.palmPosition[1] < yEdge)) {
							 grabbing[key].grabbing = true; 
							 events.onGrab(hand);
						 }
						 
						 
						 grabbing.history[grabbing.frames] = grabbing[key].palmOpen;
						 grabbing.frames++;
						 if(grabbing.frames == grabbingTimer) grabbing.frames = 0;
					 }
                 });
            }
            
            //detect swiping
            if(window.leapData.numHands > 0 && events.onSwipe != blankFunc) { 
                 $.each(window.leapData.hands, function(key, hand) { 
                    var palmSideways = hand.palmVelocity[0];
                    var palmX = hand.palmPosition[0]

                    if(palmSideways < 0) {
                        if(palmSideways < -1000 && swiping[key].isSwiping == false && swiping[key].lastPalm > palmX) {
                               swiping[key].frameStarted = frameCount;
                               swiping[key].isSwiping = true;
                               swiping[key].direction = "left";
                        }
                    } else {
                        if(palmSideways > 1000 && swiping[key].isSwiping == false && swiping[key].lastPalm < palmX) {
                               swiping[key].frameStarted = frameCount;
                               swiping[key].isSwiping = true;
                               swiping[key].direction = "right";  
                        }
                    }
                    
                    if(swiping[key].isSwiping && (frameCount - swiping[key].frameStarted) > swipingTimer) swiping[key].isSwiping = false;
                    
                    if(swiping[key].isSwiping != false) {  
                        if(palmSideways < 0) {
                           swiping[key].isSwiping = false;  
                           hand.direction = swiping[key].direction; 
                           events.onSwipe(hand);
                        }
                    }
                    swiping[key].lastPalm = palmX; 
                });
            }
            
            //detect poking
            if(window.leapData.numPointables > 0 && events.onPoke != blankFunc) { 
                  $.each(window.leapData.pointables, function(key, pointable) {
                     if(pointable.tipVelocity[2] < -1000 && poking[key] == false) poking[key] = frameCount;           
                     if(poking[key] != false && (frameCount - poking[key]) > pokeTimer) poking[key] = false;   
                     
                     if(pointable.tipVelocity[2] > 100 && poking[key] != false) {
                         poking[key] = false;
                         events.onPoke(pointable);
                     }
                });     
            }
            
            //detect wiggling
            if(window.leapData.numPointables > 0 && events.onWiggle != blankFunc) { 
                 $.each(window.leapData.pointables, function(key, pointable) {    
                     
                 });
            }
            
            //call the onFrame function
            events.onFrame();   
            
            //set stuff the last frame vars for use on the next frame
            window.leapData.lastFrameHands = window.leapData.numHands;
            lastFrameHands = window.leapData.numHands
            window.leapData.lastFrameTime = window.leapData.timestamp;
            lastFrameTime = window.leapData.timestamp;
            lastFramePointers = window.leapData.numPointables;
        },
        setEvent : function(name, event) {
            events[name] = event;
        },
        setEvents : function(e, options) {
            $.each(e, function(key, func) {
                events[key] = func;    
            });
			if(typeof options != "undefined") {
				if(typeof options.Leap != "undefined") {
					window.Leap = options.Leap;
					console.log("options leap is set");
					if(typeof options.controllerOptions === "undefined") {
						window.controllerOptions = {enableGestures: false};
					} else {
						window.controllerOptions = options.controllerOptions;
					}
				}
			}
        },
        data : function() {
            return window.leapData;
        },
        setData : function(data) {
            window.leapData = data;
        }
    }
    
    $.fn.leap = function(method) {
        if(!isInit) {
            isInit = true;
            $.fn.leap("initLeap");   
        }
        if(method == undefined) method = 'data';
        // Method calling logic
        if (methods[method]) {
            return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
        } else if (typeof method === 'object' || !method) {
            return methods.init.apply(this, arguments);
        } else {
            $.error('Method ' + method + ' does not exist on jQuery.leap');
        }
    };
   
})(jQuery);     